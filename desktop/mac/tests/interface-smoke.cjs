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
  const heroThemes = [];
  let renderedWebGL = false;
  const checkHero = async (theme, name, staticOnly = false) => {
    await page.waitForFunction((theme) => document.documentElement.dataset.theme === theme, theme);
    await page.waitForTimeout(850);
    const hero = page.locator(".site-home-hero");
    const renderer = await page.locator(".site-home-backdrop").getAttribute("data-renderer");
    if (renderedWebGL && !staticOnly) assert.equal(renderer, "webgl", `${name}: animation survives theme change`);
    renderedWebGL ||= renderer === "webgl";
    const colors = await hero.evaluate((e) => {
      const style = (selector, property) => getComputedStyle(e.querySelector(selector))[property];
      return { title: style("h1", "color"), copy: style("p", "color"), button: style(".button", "color"), buttonBackground: style(".button", "backgroundColor") };
    });
    const png = await hero.screenshot();
    // Sample the image, including the WebGL layer. CSS-only checks missed the black panel.
    const pixels = await app.evaluate(({ nativeImage }, base64) => {
      const image = nativeImage.createFromBuffer(Buffer.from(base64, "base64"));
      const { width, height } = image.getSize(), bitmap = image.toBitmap();
      const values = [];
      for (let y = 0.12; y < 0.9; y += 0.12) for (let x = 0.8; x < 0.97; x += 0.04) {
        const i = (Math.floor(y * height) * width + Math.floor(x * width)) * 4;
        values.push([bitmap[i + 2], bitmap[i + 1], bitmap[i]]);
      }
      return values;
    }, png.toString("base64"));
    const luminance = (rgb) => rgb.map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
    const rgb = (value) => value.match(/[\d.]+/g).slice(0, 3).map((n) => Number(n) * (value.startsWith("color(srgb") ? 255 : 1));
    const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const levels = pixels.map(luminance);
    assert.ok(theme === "light" ? Math.min(...levels) > 0.65 : Math.max(...levels) < 0.2, `${name}: background ${JSON.stringify(levels)}`);
    for (const key of ["title", "copy"]) {
      assert.ok(Math.min(...levels.map((l) => contrast(luminance(rgb(colors[key])), l))) >= 4.5, `${name}: ${key} contrast`);
    }
    assert.ok(contrast(luminance(rgb(colors.button)), luminance(rgb(colors.buttonBackground))) >= 4.5, `${name}: button contrast`);
    fs.writeFileSync(path.join(qa, name + ".png"), await page.screenshot({ scale: "css" }));
    heroThemes.push({ name, theme, renderer: renderer || "static", minLuminance: Math.min(...levels), maxLuminance: Math.max(...levels) });
  };
  try {
    await page.locator(".club-card").first().waitFor({ timeout: 60000 });
    await page.evaluate(() => window.clubDesktop.resetAppearance());
    await page.evaluate(() => localStorage.setItem("club-reduced", "false"));
    await page.reload();
    await page.locator(".club-card").first().waitFor();
    await app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0];
      w.setSize(1440, 940);
      w.show();
      w.focus();
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await checkHero("light", "home-light");
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
    await nav("首页").click();
    await checkHero("dark", "home-dark");
    await nav("设置").click();
    await button("松石绿").click();
    await button("山林背景").click();
    await nav("首页").click();
    await checkHero("dark", "home-dark-green");
    await nav("设置").click();
    await button("跟随系统外观").click();
    await nav("首页").click();
    await page.emulateMedia({ colorScheme: "light" });
    await checkHero("light", "home-system-light");
    await page.emulateMedia({ colorScheme: "dark" });
    await checkHero("dark", "home-system-dark");
    await nav("设置").click();
    await button("深色外观").click();
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
    await nav("首页").click();
    // Missing GPU and reduced-motion fallbacks must use the same theme too.
    await page.locator(".darkveil-canvas").evaluate((e) => {
      const gl = e.getContext("webgl2") || e.getContext("webgl");
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    });
    await checkHero("light", "home-light-fallback", true);
    await nav("设置").click();
    await page.getByRole("switch", { name: "减少动态效果" }).click();
    await nav("首页").click();
    assert.equal(await page.locator(".darkveil-canvas").count(), 0);
    await checkHero("light", "home-light-reduced", true);
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
          heroThemes,
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
