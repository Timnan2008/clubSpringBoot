import { build } from "esbuild";
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import path from "node:path";
import assert from "node:assert/strict";
const root = path.resolve(import.meta.dirname, "../..");
const bundle = await build({
  entryPoints: [
    path.join(import.meta.dirname, "new-controls.fixture.jsx"),
    path.join(root, "frontend/workspace.jsx"),
  ],
  bundle: true,
  write: false,
  outdir: "fixture",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
});
const files = Object.fromEntries(
  bundle.outputFiles.map((f) => [path.basename(f.path), f.contents]),
);
const members = [
  { id: 1, type: "president", role: "president", name: "社长甲" },
  { id: 2, type: "president", role: "vice_president", name: "副社长乙" },
  { id: 3, type: "student", role: "member", name: "社员丙" },
];
let uploads = 0;
const server = createServer((req, res) => {
  const u = new URL(req.url, "http://localhost");
  if (u.pathname.startsWith("/api/")) {
    res.setHeader("Content-Type", "application/json");
    if (u.pathname.endsWith("/password-reset/verify")) {
      res.statusCode = 400;
      res.end(JSON.stringify({ code: 400, message: "验证码错误" }));
      return;
    }
    if (u.pathname.endsWith("/documents") && req.method === "POST") {
      uploads++;
      req.resume();
      setTimeout(() => {
        res.statusCode = 500;
        res.end(JSON.stringify({ message: "测试上传失败" }));
      }, 350);
      return;
    }
    const d =
      u.pathname === "/api/club-workspace"
        ? {
            name: "测试社长",
            token: "qa",
            admin: false,
            account: { id: "qa", name: "测试社长", role: "president" },
            clubs: [{ id: 28, name: "OpenSTEAM" }],
          }
        : u.pathname === "/api/club-workspace/28"
          ? { activities: [], documents: [] }
          : u.pathname.endsWith("/members")
            ? members
            : u.pathname.endsWith("/join-requests")
              ? []
              : u.pathname.endsWith("/leaders")
                ? { president: [], vice_president: [] }
                : u.pathname.endsWith("/me")
                  ? { account: { id: "qa", name: "测试社长", role: "president" } }
                  : { code: 200 };
    res.end(JSON.stringify(d));
    return;
  }
  const f = files[u.pathname.slice(1)];
  if (f) {
    res.setHeader("Content-Type", u.pathname.endsWith(".css") ? "text/css" : "text/javascript");
    res.end(f);
    return;
  }
  if (u.pathname.includes(".") && u.pathname !== "/") {
    res.statusCode = 404;
    res.end();
    return;
  }
  const workspace = u.pathname === "/workspace";
  const entry = workspace ? "workspace" : "new-controls.fixture";
  res.setHeader("Content-Type", "text/html");
  res.end(
    `<!doctype html><html lang="zh"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/${entry}.css"><body class="${workspace ? "workspace-page" : ""}"><div id="${workspace ? "club-workspace" : "fixture"}"></div><script src="/${entry}.js"></script></body></html>`,
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  await page.goto(base);
  const input = page.locator(".code-slots__input").first();
  await input.fill("123456");
  assert.equal(await page.locator("#code").textContent(), "123456");
  assert.equal(await page.locator("#count").textContent(), "1");
  await input.press("Backspace");
  assert.equal(await page.locator("#code").textContent(), "12345");
  await input.press("9");
  assert.equal(await page.locator("#count").textContent(), "2");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("#code").textContent === "");
  await input.fill("876543");
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  assert.equal(await input.getAttribute("readonly"), "");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await input.fill("112233");
  assert.equal(await page.locator("#code").textContent(), "112233");
  await page.getByRole("button", { name: "External selection" }).click();
  assert.equal(
    await page.locator(".line-sidebar__button").nth(2).getAttribute("aria-current"),
    "page",
  );
  await page.locator(".line-sidebar__button").nth(1).focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await page.locator(".line-sidebar__button").nth(1).getAttribute("aria-current"),
    "page",
  );
  await page.getByRole("button", { name: "负责人", exact: true }).click();
  assert.equal(await page.locator(".branched-menu__body").first().getAttribute("inert"), "");
  await page.getByRole("button", { name: "70%", exact: true }).click();
  assert.equal(
    await page.locator(".call-chip__fill").evaluate((e) => e.style.transform),
    "scaleX(0.7)",
  );
  await page.getByRole("button", { name: "Fail", exact: true }).click();
  await page.locator(".call-chip__retry").click();
  assert.equal(await page.locator("#retry").textContent(), "1");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  assert.equal(await page.locator(".call-chip").getAttribute("data-status"), "done");
  const resetCode = page.locator(".code-slots__input").nth(1);
  await resetCode.fill("123456");
  await page.getByRole("button", { name: "验证邮箱", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelectorAll(".code-slots__slot[data-filled]").length === 6,
  );
  assert.match(await page.locator("body").textContent(), /验证码错误/);
  await page.goto(base + "/workspace?tab=members");
  await page.locator("tbody tr").nth(2).waitFor();
  await page.locator(".branched-menu").getByRole("button", { name: "社长", exact: true }).click();
  assert.equal(await page.locator("tbody tr").count(), 1);
  assert.match(await page.locator("tbody").textContent(), /社长甲/);
  await page
    .locator(".branched-menu")
    .getByRole("button", { name: "社团成员", exact: true })
    .click();
  assert.match(await page.locator("tbody").textContent(), /社员丙/);
  await page.screenshot({ path: "/tmp/club-members-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/club-members-mobile.png", fullPage: true });
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "workspace mobile overflow",
  );
  await page.locator(".line-sidebar__button").filter({ hasText: "文件资料库" }).click();
  await page.getByRole("button", { name: /提交文件/ }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({ name: "qa.txt", mimeType: "text/plain", buffer: Buffer.from("fixture") });
  await page.locator(".ws-modal").getByRole("button", { name: "提交文件 →", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.call-chip[data-status="error"]'));
  assert.equal(uploads, 1);
  assert.equal(await page.locator('.call-chip[data-status="done"]').count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "New controls passed: code editing/rejection/success, reset API rejection, keyboard sidebar, collapsible tree, real upload progress/retry, role filtering, mobile layout, failed upload.",
  );
} finally {
  await browser.close();
  server.close();
}
