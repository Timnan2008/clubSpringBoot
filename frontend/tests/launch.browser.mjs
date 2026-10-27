// Launch film regression: playback, seeking, live club data, reduced motion, mobile fit and score levels.
// `node frontend/tests/launch.browser.mjs --serve` keeps the fixture server running for manual preview.
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { launchClubs } from "./launch-clubs.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const out = process.env.LAUNCH_SCREENSHOT_DIR || "/tmp/launch-film-qa";
const serveOnly = process.argv.includes("--serve");
await mkdir(out, { recursive: true });

const result = await build({
  entryPoints: [
    path.join(root, "frontend/launch.jsx"),
    path.join(import.meta.dirname, "launch-score.fixture.js"),
  ],
  outdir: "fixture",
  bundle: true,
  write: false,
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const files = Object.fromEntries(
  result.outputFiles.map((f) => [path.basename(f.path), f.contents]),
);
// The fixture is one bundle, so the production build's shared-chunk preloads don't apply.
const template = (
  await readFile(path.join(root, "src/main/resources/templates/page/launch.html"), "utf8")
).replace(/\s*<link rel="modulepreload"[^>]*>/g, "");
const staticDir = path.join(root, "src/main/resources/static");
const clubs = launchClubs();
const types = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  glb: "model/gltf-binary",
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const name = path.basename(url.pathname);
  if (url.pathname === "/page/launch") {
    res.setHeader("Content-Type", "text/html");
    return res.end(template);
  }
  if (url.pathname === "/score") {
    res.setHeader("Content-Type", "text/html");
    return res.end(
      '<!doctype html><link rel="icon" href="data:,"><script src="/launch-score.fixture.js"></script>',
    );
  }
  if (url.pathname === "/api/club/all") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ code: 200, data: clubs }));
  }
  if (files[name]) {
    res.setHeader("Content-Type", name.endsWith("css") ? "text/css" : "text/javascript");
    return res.end(files[name]);
  }
  if (url.pathname.startsWith("/other%20photo/") || url.pathname.startsWith("/models/")) {
    try {
      const body = await readFile(path.join(staticDir, decodeURIComponent(url.pathname)));
      res.setHeader("Content-Type", types[name.split(".").pop()] || "application/octet-stream");
      return res.end(body);
    } catch {}
  }
  res.statusCode = 404;
  res.end();
});
await new Promise((resolve) => server.listen(Number(process.env.PORT) || 0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
if (serveOnly) {
  console.log(`Launch film fixture: ${base}/page/launch`);
} else {
  await run();
}

async function run() {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const errors = [];
  const observe = (page) => {
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() !== "error" || m.location().url.endsWith("/media/logo/missing.png")) return;
      errors.push(`${m.text()} ${m.location().url}`);
    });
  };
  const position = (page) => page.locator(".lf-scrub").evaluate((el) => Number(el.value));
  const seek = async (page, t) => {
    await page.locator(".lf-scrub").evaluate((el, value) => {
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, t);
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );
  };
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    observe(page);
    await page.goto(`${base}/page/launch`);
    await page.locator(".lf-comp").waitFor();
    await page.locator(".lf-loading").waitFor({ state: "detached", timeout: 20000 });
    await page.waitForTimeout(900);
    assert((await position(page)) > 0.2, "Film autoplays once the 3D devices load");
    assert.equal(
      await page.locator(".lf-open").evaluate((el) => getComputedStyle(el).visibility),
      "visible",
    );
    assert.deepEqual(
      await page
        .locator(".lf-digit")
        .evaluateAll((els) => els.map((el) => el.style.getPropertyValue("--digit"))),
      ["4", "3"],
      "Odometer shows the live club count",
    );
    assert.equal(
      await page.locator(".lf-tile b").first().textContent(),
      "Codecraft",
      "Featured clubs with real logos come first",
    );
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page.waitForTimeout(100);
    const paused = await position(page);
    await page.waitForTimeout(400);
    assert.equal(await position(page), paused, "Pause holds the frame");

    const frames = [
      1.9, 3, 5.6, 7, 9.2, 11.5, 14.5, 15.7, 16.8, 18.3, 21.3, 23, 25.2, 26.8, 29.5, 31.6, 33, 34.6,
      36.8, 38.5, 39.5, 41.9, 43, 45.6, 47, 49.6,
    ];
    const chrome = await page.addStyleTag({
      content: ".lf-controls, .lf-home { visibility: hidden; }",
    });
    for (const t of frames) {
      await seek(page, t);
      await page.waitForTimeout(80);
      const name = `f${t.toFixed(1).padStart(4, "0")}.png`;
      await page.locator(".lf-comp").screenshot({ path: path.join(out, name) });
    }
    await chrome.evaluate((el) => el.remove());
    await seek(page, 12);
    const early = await page.locator(".lf-flash").evaluate((el) => getComputedStyle(el).opacity);
    assert(Number(early) < 0.05, "Seeking backwards clears flash frames");
    assert(
      await page.locator(".lf-screen-mac .lf-site-card").count(),
      "Laptop screen renders club cards",
    );
    assert.equal(await page.locator(".lf-gl-screens.is-flat").count(), 0, "WebGL devices loaded");
    assert.match(
      await page.locator(".lf-gl-screens .lf-screen-mac").evaluate((el) => el.style.transform),
      /matrix3d/,
      "The site is pinned onto the MacBook display",
    );
    const logo = await page
      .locator(".lf-tile img")
      .first()
      .evaluate((img) => img.getAttribute("src"));
    assert.match(logo, /WFL-crest\.svg$/, "Missing club logo falls back to the crest");

    await page.getByRole("button", { name: "Turn sound on" }).click();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.waitForTimeout(500);
    assert.equal(
      await page.getByRole("button", { name: "Mute" }).getAttribute("aria-pressed"),
      "true",
    );
    await seek(page, 49.6);
    await page.waitForTimeout(900);
    await page.getByRole("button", { name: "Replay" }).waitFor();
    assert.equal(
      await page.locator(".lf-end-title").evaluate((el) => getComputedStyle(el).opacity),
      "1",
    );

    const reduced = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    observe(reduced);
    await reduced.emulateMedia({ reducedMotion: "reduce" });
    await reduced.goto(`${base}/page/launch`);
    await reduced.getByRole("button", { name: "Play the film" }).waitFor();
    await reduced.waitForTimeout(300);
    assert.equal(await position(reduced), 50, "Reduced motion opens on the end card");
    await reduced.screenshot({ path: path.join(out, "reduced-motion.png") });

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    observe(mobile);
    await mobile.goto(`${base}/page/launch`);
    await mobile.waitForTimeout(600);
    assert(
      await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      "No horizontal overflow on phones",
    );
    await seek(mobile, 11.5);
    await mobile.screenshot({ path: path.join(out, "mobile.png") });

    const audio = await browser.newPage();
    observe(audio);
    await audio.goto(`${base}/score`);
    const score = await audio.evaluate(() => window.renderScore());
    await writeFile(path.join(out, "score.wav"), Buffer.from(score.wav, "base64"));
    const peak = Math.max(...score.seconds.map((s) => s.peak));
    const quiet = score.seconds.slice(4, 48).filter((s) => s.rms < 0.004);
    console.log(
      "Score levels per second (rms/peak):",
      score.seconds.map((s, i) => `${i}:${s.rms.toFixed(3)}/${s.peak.toFixed(2)}`).join(" "),
    );
    assert(peak < 0.99, `Score must not clip (peak ${peak.toFixed(3)})`);
    assert.equal(quiet.length, 0, "Score is audible from the crest to the end card");

    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(`Launch film passed. Frames and score.wav written to ${out}`);
  } finally {
    await browser.close();
    server.close();
  }
}
