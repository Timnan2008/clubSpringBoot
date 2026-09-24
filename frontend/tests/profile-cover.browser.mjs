import { build } from "esbuild";
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const built = await build({
  stdin: {
    contents:
      'import {createRoot} from "react-dom/client"; import PublicProfile from "./frontend/PublicProfile"; import AppearanceEditor from "./frontend/AppearanceEditor"; createRoot(document.getElementById("root")).render(location.pathname === "/edit" ? <AppearanceEditor profile={{token:"fixture",account:{id:"fixture"},details:{tags:[]}}}/> : <PublicProfile id="fixture"/>);',
    resolveDir: process.cwd(),
    loader: "jsx",
  },
  bundle: true,
  write: false,
  outdir: "fixture",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const assets = Object.fromEntries(
  built.outputFiles.map((f) => [path.basename(f.path), f.contents]),
);
let aspect = "wide";
let settings = {
  frame: "none",
  holidayBadge: false,
  scale: 1,
  x: 0,
  y: 0,
  tags: [],
  customFrame: "",
  banner: "/cover.svg",
  frames: [],
  avatarScale: 1,
  avatarX: 0,
  avatarY: 0,
  bannerWidth: 0,
};
let writes = 0;
const server = createServer((req, res) => {
  const u = new URL(req.url, "http://localhost");
  const account = {
    id: "fixture",
    name: "封面测试",
    role: "teacher",
    appearance: settings,
  };
  if (u.pathname === "/cover.svg") {
    const [w, h] = aspect === "wide" ? [1600, 400] : [600, 1400];
    res.setHeader("Content-Type", "image/svg+xml");
    res.end(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#a78bfa"/><rect x="4" y="4" width="${w - 8}" height="${h - 8}" fill="none" stroke="white" stroke-width="8"/></svg>`,
    );
    return;
  }
  if (u.pathname === "/api/campus-social/me/appearance") {
    res.setHeader("Content-Type", "application/json");
    if (req.method === "PUT") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        settings = JSON.parse(body);
        writes++;
        res.end(JSON.stringify(settings));
      });
    } else res.end(JSON.stringify({ settings, frames: [], gifted: false, tags: [] }));
    return;
  }
  if (u.pathname.startsWith("/api/")) {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify(
        u.pathname.endsWith("/profile")
          ? { account, tags: [], offices: [], bio: "完整显示四边" }
          : u.pathname.endsWith("/me")
            ? { account, details: { tags: [], bio: "" } }
            : u.pathname.includes("/posts")
              ? { items: [], posts: [], total: 0, pages: 1 }
              : { token: "fixture", items: [], account },
      ),
    );
    return;
  }
  const a = assets[u.pathname.slice(1)];
  if (a) {
    res.setHeader("Content-Type", u.pathname.endsWith(".css") ? "text/css" : "text/javascript");
    res.end(a);
    return;
  }
  if (u.pathname.includes(".")) {
    res.writeHead(204);
    res.end();
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/stdin.css"><div id="root"></div><script src="/stdin.js"></script>',
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  await mkdir("/tmp/club-cover-width", { recursive: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1440, 390])
    for (const ratio of ["wide", "portrait"])
      for (const coverWidth of [0, 30, 65, 100]) {
        settings.bannerWidth = coverWidth;
        aspect = ratio;
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        await page.locator(".profile-cover img").waitFor();
        const bounds = await page.locator(".profile-cover img").evaluate((img) => {
          const b = img.getBoundingClientRect(),
            avatar = document
              .querySelector(".profile-home-avatar-row > .campus-avatar")
              .getBoundingClientRect();
          return {
            fit: getComputedStyle(img).objectFit,
            parentWidth: img.parentElement.getBoundingClientRect().width,
            naturalRatio: img.naturalWidth / img.naturalHeight,
            bottom: b.bottom,
            avatarTop: avatar.top,
            width: b.width,
            height: b.height,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        assert.equal(bounds.fit, "contain");
        assert.ok(bounds.avatarTop >= bounds.bottom, "Avatar must not obscure cover");
        if (coverWidth === 0) assert.ok(bounds.height <= (width > 600 ? 420 : 320));
        else {
          assert.ok(Math.abs(bounds.width - (bounds.parentWidth * coverWidth) / 100) < 1);
          assert.ok(Math.abs(bounds.width / bounds.height - bounds.naturalRatio) < 0.01);
        }
        assert.equal(bounds.overflow, false);
        await page.screenshot({
          path: `/tmp/club-cover-width/cover-${width}-${ratio}-${coverWidth}.png`,
        });
      }
  aspect = "wide";
  settings.bannerWidth = 0;
  await page.goto(`http://127.0.0.1:${server.address().port}/edit?lang=zh`);
  const slider = page.getByRole("slider", { name: "封面宽度" });
  await slider.waitFor();
  await slider.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(
    () => document.querySelector(".appearance-cover-sizing output").textContent === "31%",
  );
  assert.equal(writes, 0, "Preview should not save before confirmation");
  const preview = await page
    .locator(".appearance-banner img")
    .evaluate(
      (img) => img.getBoundingClientRect().width / img.parentElement.getBoundingClientRect().width,
    );
  assert.ok(Math.abs(preview - 0.31) < 0.01);
  await page.getByRole("button", { name: "保存装扮", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector(".appearance-editor").getAttribute("aria-busy") === "false",
  );
  assert.equal(writes, 1);
  assert.equal(settings.bannerWidth, 31);
  await page.reload();
  await slider.waitFor();
  assert.equal(await slider.inputValue(), "31");
  await page.getByRole("button", { name: "恢复自动适配" }).click();
  await page.getByRole("button", { name: "保存装扮", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector(".appearance-editor").getAttribute("aria-busy") === "false",
  );
  assert.equal(settings.bannerWidth, 0);
  assert.deepEqual(errors, []);
  console.log(
    "Cover auto/manual sizing, live preview, save, reload and reset passed on desktop/mobile.",
  );
} finally {
  await browser.close();
  server.close();
}
