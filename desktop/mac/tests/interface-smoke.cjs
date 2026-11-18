const { _electron: electron } = require("playwright-core");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const qa = path.resolve(__dirname, "../qa/site-alignment");
fs.mkdirSync(qa, { recursive: true });
(async () => {
  const app = await electron.launch({
    executablePath: require("electron"),
    args: [path.resolve(__dirname, "..")],
    env: {
      ...process.env,
      CLUB_QA: "1",
      CLUB_DESKTOP_USER_DATA: path.resolve(__dirname, "../.local/interface-qa-profile"),
    },
  });
  const page = await app.firstWindow(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const nav = (name) => page.locator("nav").getByRole("button", { name, exact: true }),
    button = (name) => page.getByRole("button", { name, exact: true });
  const shot = async (name) => {
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(qa, name + ".png"), scale: "css" });
  };
  try {
    await page.locator(".club-card").first().waitFor({ timeout: 60000 });
    await page.evaluate(() => window.clubDesktop.resetAppearance());
    await page.reload();
    await page.locator(".club-card").first().waitFor();
    await app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0];
      w.setSize(1440, 940);
      w.show();
      w.focus();
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await shot("home-light");
    assert.equal(await page.locator(".overview-strip,.status-footer,.wall-aside").count(), 0);
    await nav("服务类社团").click();
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".club-cover img")].every((i) => i.complete),
    );
    const catalog = await page.evaluate(() => window.clubDesktop.read("clubs"));
    assert.equal(
      await page.locator(".club-card").count(),
      catalog.data.filter((c) => c.clubClass === "service").length,
    );
    await page.mouse.move(1100, 90);
    await page.waitForTimeout(250);
    const card = page.locator(".club-card").first(),
      before = await card.boundingBox();
    await card.hover();
    await page.waitForTimeout(250);
    assert.ok(
      (await card.boundingBox()).y < before.y - 2,
      JSON.stringify({
        before,
        after: await card.boundingBox(),
        style: await card.evaluate((e) => ({
          hover: e.matches(":hover"),
          transform: getComputedStyle(e).transform,
          reduced: e.closest(".app").className,
          media: matchMedia("(prefers-reduced-motion:reduce)").matches,
        })),
      }),
    );
    const geometry = await card.evaluate((e) => {
      const a = e.querySelector(".club-cover").getBoundingClientRect(),
        b = e.querySelector(".club-card-body").getBoundingClientRect();
      return {
        ratio: a.width / a.height,
        below: b.top >= a.bottom - 1,
        fit: getComputedStyle(e.querySelector("img")).objectFit,
      };
    });
    await shot("service-light");
    assert.ok(geometry.below && Math.abs(geometry.ratio - 1.6) < 0.02, JSON.stringify(geometry));
    assert.equal(geometry.fit, "contain");
    await page
      .locator(".catalog-filters")
      .getByRole("button", { name: "全部社团", exact: true })
      .click();
    await page.getByRole("textbox", { name: "搜索社团", exact: true }).fill("编程");
    await page.locator(".club-card").focus();
    await page.keyboard.press("Enter");
    await page.locator(".club-hero").waitFor();
    await page.locator(".loading-state").waitFor({ state: "hidden" });
    const pixels = page.getByRole("button", { name: "切换社团卡片" });
    await pixels.hover();
    await page.waitForTimeout(600);
    assert.equal(await pixels.getAttribute("aria-pressed"), "true");
    assert.ok(await page.locator(".ascii-cursor-canvas").count());
    await shot("club-pixels");
    await page.mouse.move(210, 90);
    await page.waitForTimeout(650);
    assert.equal(await pixels.getAttribute("aria-pressed"), "false");
    await shot("club-detail");
    await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await nav("设置").click();
    await button("深色外观").click();
    await button("微光背景").click();
    await nav("服务类社团").click();
    await shot("service-dark");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator(".club-card").first().hover();
    assert.equal(
      await page
        .locator(".club-card")
        .first()
        .evaluate((e) => getComputedStyle(e).transform),
      "none",
    );
    assert.equal(
      await page.locator(".content").evaluate((e) => getComputedStyle(e).animationName),
      "none",
    );
    await nav("设置").click();
    await button("恢复默认外观").click();
    await nav("服务类社团").click();
    for (const width of [1280, 1000]) {
      await app.evaluate(
        ({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setSize(width, 820),
        width,
      );
      await page.waitForTimeout(200);
      assert.ok(await page.locator(".content").evaluate((e) => e.scrollWidth <= e.clientWidth));
      assert.ok(await nav("发现社团").isVisible());
      await shot("service-" + width);
    }
    await button("登录").click();
    await page.getByRole("dialog").waitFor();
    await shot("login");
    await button("注册").click();
    assert.equal(await page.getByRole("dialog").locator("input").count(), 0);
    assert.equal(await page.locator("iframe,webview").count(), 0);
    // Anonymous request: provenance passes to auth; no user, keys or messages are written.
    const { createCampusTransport } = require("../electron/transport.cjs");
    const fetchInElectron = (url, options) =>
      app.evaluate(
        async ({ session }, { url, options }) => {
          const response = await session.fromPartition("origin-smoke").fetch(url, options);
          const body = await response.json();
          return { status: response.status, code: body.code };
        },
        { url, options: { ...options, headers: Object.fromEntries(new Headers(options.headers)) } },
      );
    const base = "https://qpwflhsclub.com",
      route = "/api/campus-social/keys/provision";
    const options = { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } };
    const invalid = await fetchInElectron(base + route, options);
    const valid = await createCampusTransport(
      () => ({ fetch: fetchInElectron }),
      () => base,
    )(route, options);
    const provenance = {
      invalid: invalid.status,
      invalidCode: invalid.code,
      valid: valid.status,
      validCode: valid.code,
    };
    assert.ok(
      provenance.invalid === 403 || provenance.invalidCode === 403,
      JSON.stringify(provenance),
    );
    assert.ok(provenance.valid === 401 || provenance.validCode === 401, JSON.stringify(provenance));
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(qa, "result.json"),
      JSON.stringify(
        {
          passed: true,
          websiteStyle: true,
          pixelTransition: true,
          asciiCursor: true,
          keyboard: true,
          reducedMotion: true,
          widths: [1440, 1280, 1000],
          anonymousProvenance: provenance,
          rendererErrors: errors,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: site cards, pixel transition, ASCII cursor, keyboard, themes, three sizes; live provenance and auth enforced.",
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
