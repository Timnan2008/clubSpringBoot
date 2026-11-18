const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const { normalize, createAppearanceStore, DEFAULTS } = require("../electron/appearance.cjs");
test("appearance rejects executable URLs and clamps preferences", () => {
  assert.deepEqual(normalize(null), DEFAULTS);
  assert.deepEqual(
    normalize({
      mode: "oops",
      accent: "url(https://x)",
      background: "file:///etc/passwd",
      fontSize: 300,
      blur: 999,
      strength: -50,
    }),
    { ...DEFAULTS, blur: 24, strength: 0 },
  );
});
test("appearance and copied image persist independently of the original; reset removes only owned image", () => {
  const directory = path.join(__dirname, "../qa/appearance-unit");
  fs.mkdirSync(directory, { recursive: true });
  const s = createAppearanceStore(directory);
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5N1pQAAAAASUVORK5CYII=",
    "base64",
  );
  s.reset();
  s.saveImage(bytes);
  s.save({
    mode: "dark",
    accent: "#3478d4",
    background: "custom",
    strength: 68,
    blur: 12,
    fontSize: 16,
  });
  const reopened = createAppearanceStore(directory).read();
  assert.equal(reopened.background, "custom");
  assert.equal(reopened.mode, "dark");
  assert.equal(reopened.fontSize, 16);
  assert.ok(reopened.backgroundImage.startsWith("data:image/png;base64,"));
  assert.ok(!fs.readFileSync(path.join(directory, "appearance.json"), "utf8").includes("base64"));
  assert.throws(() => s.saveImage(Buffer.alloc(13 * 1024 * 1024)));
  s.reset();
  assert.equal(s.read().backgroundImage, "");
});
