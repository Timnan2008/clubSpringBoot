const { _electron: electron } = require("playwright-core");
const assert = require("node:assert/strict");
const path = require("node:path"),
  fs = require("node:fs");
const qa = path.resolve(__dirname, "../qa/unslop/campus-services");
fs.mkdirSync(qa, { recursive: true });
(async () => {
  const results = [];
  for (const role of ["admin", "teacher", "student"]) {
    const app = await electron.launch({
      executablePath: require("electron"),
      args: [path.resolve(__dirname, ".."), "--club-preview=" + role],
      env: { ...process.env, CLUB_QA: "1" },
    });
    try {
      const page = await app.firstWindow(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.getByRole("heading", { name: "校园墙", exact: true }).waitFor();
      assert.ok(await page.locator(".preview-banner").isVisible());
      // Network guard must reject even a main-process fetch before contacting a server.
      const http = require("node:http");
      let hits = 0;
      const probe = http.createServer((_req, res) => {
        hits++;
        res.end("probe");
      });
      await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
      try {
        assert.equal(
          await app.evaluate(
            async ({ session }, url) => {
              try {
                await session.defaultSession.fetch(url);
                return false;
              } catch {
                return true;
              }
            },
            "http://127.0.0.1:" + probe.address().port + "/probe",
          ),
          true,
        );
        assert.equal(hits, 0, "offline preview must block traffic before reaching a server");
      } finally {
        await new Promise((resolve) => probe.close(resolve));
      }
      await page.locator(".post-card").first().waitFor();
      const count = await page.locator(".post-card").count();
      await page.getByRole("button", { name: "删除", exact: true }).first().click();
      await page.getByRole("button", { name: "确认删除", exact: true }).click();
      await page
        .getByText("只读预览：此操作不会提交，示例数据保持不变。", { exact: true })
        .waitFor();
      assert.equal(await page.locator(".post-card").count(), count);
      await page.keyboard.press("Escape");
      assert.equal(
        (await page.getByRole("button", { name: "置顶", exact: true }).count()) > 0,
        role === "admin",
      );
      await page
        .locator("nav")
        .getByRole("button", { name: "羽毛球场预约", exact: true })
        .click();
      await page.locator(".booking-table").waitFor();
      assert.equal(
        await page.getByRole("button", { name: "预约管理", exact: true }).count(),
        role === "admin" ? 1 : 0,
      );
      if (role === "admin") {
        await page.getByRole("button", { name: "预约管理", exact: true }).click();
        await page.locator(".booking-roster tbody tr").filter({ hasText: "示例队员" }).waitFor();
        await page.getByLabel("预约状态", { exact: true }).selectOption("pending");
        assert.equal(await page.locator(".booking-roster tbody tr").count(), 1);
        await page.getByRole("button", { name: "取消预约", exact: true }).click();
        await page.getByRole("button", { name: "确认取消", exact: true }).click();
        await page
          .getByText("只读预览：此操作不会提交，示例数据保持不变。", { exact: true })
          .waitFor();
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "清除筛选", exact: true }).click();
        assert.equal(await page.locator(".booking-roster tbody tr").count(), 2);
      }
      if (role === "teacher") {
        await page
          .locator("nav")
          .getByRole("button", { name: "内容审核", exact: true })
          .click();
        await page.getByText("示例词条", { exact: true }).waitFor();
        assert.equal(
          await page.getByRole("button", { name: "添加词条", exact: true }).count(),
          0,
        );
      }
      for (const width of [1440, 1000]) {
        await app.evaluate(
          ({ BrowserWindow }, w) => BrowserWindow.getAllWindows()[0].setSize(w, 900),
          width,
        );
        await page.waitForTimeout(120);
        assert.ok(
          await page.locator(".content").evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
          role + " fits " + width,
        );
      }
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].setSize(1440, 940),
      );
      await page.waitForTimeout(150);
      if (role === "student") {
        await page.locator("nav").getByRole("button", {name:"校园墙",exact:true}).click();
        await page.locator(".post-card").first().waitFor();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(qa, "student.png"), animations:"disabled" });
      }
      assert.deepEqual(errors, []);
      results.push({ role, passed: true });
    } finally {
      await app.close();
    }
  }
  fs.writeFileSync(path.join(qa, "results.json"), JSON.stringify(results, null, 2));
  console.log(
    "Offline campus preview: three roles, write blocking, permissions, filters and layout passed.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
