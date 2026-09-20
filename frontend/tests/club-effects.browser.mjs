import { build } from "esbuild";
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "../..");
const out = process.env.EFFECTS_SCREENSHOT_DIR || "/tmp/club-effects-qa";
await mkdir(out, { recursive: true });
const result = await build({
  entryPoints: [
    path.join(root, "frontend/catalog.jsx"),
    path.join(import.meta.dirname, "club-effects.fixture.jsx"),
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
const club = {
  id: 28,
  clubName: "OpenSTEAM社团",
  clubNameEn: "OpenSTEAM CLUB",
  clubClass: "study",
  clubItem: "/qa-logo.svg",
  sortDescription: "一起设计、编程、创造。",
  clubDescription: "从灵感到作品，在动手实践中探索科技与创造的可能。",
  teacher: "指导教师",
  videoLike: 12,
};
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    res.setHeader("Content-Type", "application/json");
    const id = Number(url.pathname.split("/").at(-1));
    res.end(
      JSON.stringify(
        url.pathname === "/api/club/all"
          ? [club]
          : url.pathname.includes("/api/club/id/")
            ? { ...club, id, clubName: id === 1 ? "编程社" : club.clubName }
            : {},
      ),
    );
    return;
  }
  const name = url.pathname.slice(1);
  if (url.pathname === "/other%20photo/WFL-crest.svg") {
    res.setHeader("Content-Type", "image/svg+xml");
    res.end(await readFile(path.join(root, "src/main/resources/static/other photo/WFL-crest.svg")));
    return;
  }
  if (files[name]) {
    res.setHeader("Content-Type", name.endsWith("css") ? "text/css" : "text/javascript");
    res.end(files[name]);
    return;
  }
  if (url.pathname === "/qa-logo.svg") {
    if (process.env.CLUB_LOGO_FILE) {
      res.setHeader("Content-Type", "image/jpeg");
      res.end(await readFile(process.env.CLUB_LOGO_FILE));
    } else {
      res.setHeader("Content-Type", "image/svg+xml");
      res.end(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><circle cx="200" cy="180" r="110" fill="#167bc0"/><text x="200" y="340" text-anchor="middle" font-size="44">OpenSTEAM</text></svg>',
      );
    }
    return;
  }
  if (/\.(svg|png|jpg|ico)$/.test(url.pathname)) {
    res.statusCode = 204;
    res.end();
    return;
  }
  const badge = url.pathname === "/badge";
  const id = url.searchParams.get("id") || "28";
  const entry = badge ? "club-effects.fixture" : "catalog";
  res.setHeader("Content-Type", "text/html");
  res.end(
    `<!doctype html><html lang="zh"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/${entry}.css"><body class="${badge ? "" : "catalog-page"}">${badge ? '<div id="badge-preview"></div>' : `<div id="club-catalog" data-mode="${url.pathname === "/list" ? "list" : "detail"}" data-id="${id}" data-authenticated="false"></div>`}<script src="/${entry}.js"></script></body></html>`,
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const base = `http://127.0.0.1:${server.address().port}`;
const errors = [];
const observe = (page) => {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /shader|WebGLProgram/.test(m.text())) errors.push(m.text());
  });
};
const snowPixels = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => {
          const canvas = document.querySelector(".pixel-snow-container canvas"),
            gl = canvas.getContext("webgl2");
          const data = new Uint8Array(canvas.width * canvas.height * 4);
          gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
          let visible = 0,
            hash = 0;
          for (let i = 3; i < data.length; i += 4)
            if (data[i]) {
              visible++;
              hash = (hash + i * data[i]) % 2147483647;
            }
          resolve({ visible, hash, area: canvas.width * canvas.height });
        }),
      ),
  );
try {
  const page = await browser.newPage({ viewport: { width: 1360, height: 960 } });
  observe(page);
  await page.goto(base);
  await page.locator(".pixel-snow-container canvas").waitFor();
  const logo = page.locator(".opensteam-logo");
  await logo.waitFor();
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    "rgb(16, 14, 22)",
  );
  assert.equal(await page.locator(".club-logo-card").count(), 0);
  await logo.hover();
  await page.waitForTimeout(700);
  const first = await snowPixels(page);
  await page.waitForTimeout(300);
  const second = await snowPixels(page);
  assert(first.visible > 0, "Snow shader must draw visible pixels");
  assert.notEqual(first.hash, second.hash, "Snow must animate");
  assert.equal(
    first.area,
    await page
      .locator(".pixel-snow-container")
      .evaluate((el) => el.offsetWidth * el.offsetHeight * Math.min(devicePixelRatio, 2) ** 2),
    "Original renderer uses CSS dimensions and capped native DPR",
  );
  const pixels = await logo
    .locator("canvas")
    .evaluate((c) =>
      Array.from(c.getContext("2d").getImageData(0, 0, c.width, c.height).data).some(
        (v, i) => i % 4 === 3 && v > 0,
      ),
    );
  assert(pixels, "PixelCard must reveal pixels on hover");
  assert(await logo.locator("img").isVisible());
  assert.equal(await logo.evaluate((e) => getComputedStyle(e).borderTopWidth), "0px");
  assert.equal(
    await page
      .locator(".club-detail-background")
      .evaluate((e) => getComputedStyle(e).pointerEvents),
    "none",
  );
  assert(
    await page.locator(".club-hero h1").evaluate((e) => {
      const r = e.getBoundingClientRect();
      return e.contains(document.elementFromPoint(r.x + 5, r.y + 5));
    }),
    "Decoration must stay behind heading",
  );
  await page.screenshot({ path: path.join(out, "opensteam-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  assert.equal(
    await page.locator(".campus-language").evaluate((e) => getComputedStyle(e).boxShadow),
    "rgb(16, 14, 22) -8px 0px 10px 0px",
    "Language button shadow must follow the dark navigation background",
  );
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Mobile must not overflow",
  );
  await page.screenshot({ path: path.join(out, "opensteam-mobile.png"), fullPage: true });
  await page.goto(base + "/?id=1");
  await page.locator(".ascii-cursor-canvas").waitFor();
  assert.equal(await page.locator(".opensteam-logo").count(), 0);
  assert.equal(await page.locator(".club-logo-card").count(), 1);
  assert.equal(await page.locator(".pixel-snow-container").count(), 0);
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    "rgb(246, 245, 243)",
  );
  await page.mouse.move(100, 200);
  await page.mouse.move(240, 300, { steps: 8 });
  await page.waitForTimeout(80);
  assert(
    await page.locator(".ascii-cursor-canvas").evaluate((canvas) => {
      const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      return pixels.some((value, index) => index % 4 === 3 && value > 0);
    }),
    "Programming club's original pointer trail must draw",
  );
  await page.goto(base + "/?id=2");
  await page.locator(".club-hero").waitFor();
  assert.equal(await page.locator(".pixel-snow-container, .ascii-cursor-canvas").count(), 0);
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    "rgb(246, 245, 243)",
  );
  await page.goto(base + "/list");
  await page.locator(".catalog-heading").waitFor();
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    "rgb(246, 245, 243)",
  );
  assert.equal(await page.locator(".pixel-snow-container").count(), 0);
  await page.goto(base + "/badge");
  await page.locator(".admin-badge").first().waitFor();
  assert.equal(await page.locator("[data-student] .admin-badge").count(), 0);
  assert.equal(
    await page
      .locator(".admin-badge")
      .first()
      .evaluate((e) => getComputedStyle(e, "::before").animationName),
    "admin-gold-flow",
  );
  await page.setViewportSize({ width: 640, height: 300 });
  await page.screenshot({ path: path.join(out, "admin-gold.png") });
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".admin-badge")
      .first()
      .evaluate((e) => getComputedStyle(e, "::before").animationName),
    "none",
  );
  await page.goto(base);
  await page.locator(".pixel-snow-container canvas").waitFor();
  await page.waitForTimeout(1800);
  const stillA = await snowPixels(page);
  await page.waitForTimeout(350);
  const stillB = await snowPixels(page);
  assert.notEqual(stillA.hash, stillB.hash, "Original PixelSnow time flow is retained");
  const fallback = await browser.newPage();
  observe(fallback);
  await fallback.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return kind === "webgl2" ? null : get.call(this, kind, ...args);
    };
  });
  await fallback.goto(base);
  await fallback.locator(".opensteam-logo img").waitFor();
  assert.equal(await fallback.locator(".pixel-snow-container canvas").count(), 0);
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "Club effects passed: logo, live shader, layers, mobile, original cursor, badge, reduced motion, WebGL fallback.",
  );
} finally {
  await browser.close();
  server.close();
}
