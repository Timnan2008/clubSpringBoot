import { build } from "esbuild";
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import path from "node:path";
import assert from "node:assert/strict";
const built = await build({
  stdin: {
    contents:
      'import {createRoot} from "react-dom/client"; import PublicProfile from "./frontend/PublicProfile"; createRoot(document.getElementById("root")).render(<PublicProfile id="fixture"/>);',
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
const server = createServer((req, res) => {
  const u = new URL(req.url, "http://localhost");
  const account = {
    id: "fixture",
    name: "封面测试",
    role: "teacher",
    appearance: { banner: "/cover.svg" },
  };
  if (u.pathname === "/cover.svg") {
    const [w, h] = aspect === "wide" ? [1600, 400] : [600, 1400];
    res.setHeader("Content-Type", "image/svg+xml");
    res.end(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#a78bfa"/><rect x="4" y="4" width="${w - 8}" height="${h - 8}" fill="none" stroke="white" stroke-width="8"/></svg>`,
    );
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
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1440, 390])
    for (const ratio of ["wide", "portrait"]) {
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
          bottom: b.bottom,
          avatarTop: avatar.top,
          width: b.width,
          height: b.height,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.equal(bounds.fit, "contain");
      assert.ok(bounds.avatarTop >= bounds.bottom, "Avatar must not obscure cover");
      assert.ok(bounds.height <= 420);
      assert.equal(bounds.overflow, false);
      await page.screenshot({ path: `/tmp/club-stagger-release/cover-${width}-${ratio}.png` });
    }
  assert.deepEqual(errors, []);
  console.log("Wide and portrait covers passed at desktop and mobile widths.");
} finally {
  await browser.close();
  server.close();
}
