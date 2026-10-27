// Frame-accurate MP4 of the launch film: seeks the GSAP timeline, then muxes the score.
// `npm run render:launch` writes /tmp/launch-film-qa/launch.mp4
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { DURATION } from "../launch-cues.mjs";
import { launchClubs, loadLiveClubs } from "../tests/launch-clubs.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const outDir = process.env.LAUNCH_SCREENSHOT_DIR || "/tmp/launch-film-qa";
const videoPath = process.env.LAUNCH_VIDEO || path.join(outDir, "launch.mp4");
const wavPath = path.join(outDir, "score.wav");
const fps = Number(process.env.LAUNCH_FPS) || 30;
const length = Number(process.env.LAUNCH_SECONDS) || DURATION;
await mkdir(outDir, { recursive: true });

const result = await build({
  entryPoints: [
    path.join(root, "frontend/launch.jsx"),
    path.join(root, "frontend/tests/launch-score.fixture.js"),
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
const template = (
  await readFile(path.join(root, "src/main/resources/templates/page/launch.html"), "utf8")
).replace(/\s*<link rel="modulepreload"[^>]*>/g, "");
const staticDir = path.join(root, "src/main/resources/static");
const clubs = await loadLiveClubs().catch((error) => {
  console.warn("Live club list unavailable, using the 43-club fixture:", error.message);
  return launchClubs();
});
console.log(`Rendering with ${clubs.length} clubs`);
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
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});

try {
  const audio = await browser.newPage();
  await audio.goto(`${base}/score`);
  const score = await audio.evaluate(() => window.renderScore());
  await writeFile(wavPath, Buffer.from(score.wav, "base64"));
  await audio.close();

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  await page.goto(`${base}/page/launch`);
  await page.locator(".lf-comp").waitFor();
  await page.locator(".lf-loading").waitFor({ state: "detached", timeout: 20000 });
  await page
    .getByRole("button", { name: "Pause", exact: true })
    .click()
    .catch(() => {});
  await page.addStyleTag({
    content: ".lf-controls, .lf-home, .lf-credits, .lf-loading { visibility: hidden !important; }",
  });
  await page.evaluate(() => {
    document.querySelector(".lf-viewport")?.style.setProperty("--lf-scale", "1");
  });

  const frames = Math.round(length * fps);
  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-y",
      "-f",
      "image2pipe",
      "-framerate",
      String(fps),
      "-i",
      "pipe:0",
      "-i",
      wavPath,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "18",
      "-preset",
      "medium",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      "-shortest",
      videoPath,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const failed = new Promise((_, reject) =>
    ffmpeg.on("error", reject).on("exit", (code) => {
      if (code) reject(new Error(`ffmpeg exited ${code}`));
    }),
  );

  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    const t = i / fps;
    await Promise.race([
      failed,
      page.evaluate(async (value) => {
        const el = document.querySelector(".lf-scrub");
        el.value = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }, t),
    ]);
    const jpeg = await page.locator(".lf-comp").screenshot({ type: "jpeg", quality: 92 });
    if (!ffmpeg.stdin.write(jpeg)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
    if (i % fps === 0) {
      const elapsed = (Date.now() - started) / 1000;
      const rate = i / Math.max(elapsed, 0.001);
      console.log(
        `Rendered ${i}/${frames} (${t.toFixed(1)}s) · ${rate.toFixed(1)} fps · ${path.basename(videoPath)}`,
      );
    }
  }
  ffmpeg.stdin.end();
  await new Promise((resolve, reject) => {
    ffmpeg.on("close", (code) => (code ? reject(new Error(`ffmpeg exited ${code}`)) : resolve()));
  });
  console.log(`Launch film written to ${videoPath}`);
} finally {
  await browser.close();
  server.close();
}
