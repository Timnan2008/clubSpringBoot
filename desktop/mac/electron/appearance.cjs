const fs = require("node:fs");
const path = require("node:path");
const DEFAULTS = Object.freeze({
  mode: "light",
  accent: "#365d7b",
  background: "plain",
  strength: 35,
  blur: 0,
  fontSize: 14,
});
function normalize(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) value = {};
  return {
    mode: ["light", "dark", "system"].includes(value.mode) ? value.mode : DEFAULTS.mode,
    accent:
      typeof value.accent === "string" && /^#[\da-f]{6}$/i.test(value.accent)
        ? value.accent.toLowerCase()
        : DEFAULTS.accent,
    background: ["plain", "glow", "ocean", "forest", "custom"].includes(value.background)
      ? value.background
      : DEFAULTS.background,
    strength: Number.isFinite(value.strength)
      ? Math.max(0, Math.min(100, Math.round(value.strength)))
      : DEFAULTS.strength,
    blur: Number.isFinite(value.blur)
      ? Math.max(0, Math.min(24, Math.round(value.blur)))
      : DEFAULTS.blur,
    fontSize: [13, 14, 15, 16].includes(value.fontSize) ? value.fontSize : DEFAULTS.fontSize,
  };
}
function createAppearanceStore(directory) {
  const file = path.join(directory, "appearance.json");
  const image = path.join(directory, "appearance-background.png");
  function read() {
    let stored = {};
    try {
      stored = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {}
    const value = normalize(stored);
    let backgroundImage = "";
    try {
      if (fs.statSync(image).size <= 12 * 1024 * 1024)
        backgroundImage = "data:image/png;base64," + fs.readFileSync(image).toString("base64");
    } catch {}
    if (value.background === "custom" && !backgroundImage) value.background = "glow";
    return { ...value, backgroundImage };
  }
  function save(value) {
    const next = normalize(value);
    if (next.background === "custom" && !fs.existsSync(image)) next.background = "glow";
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(file + ".new", JSON.stringify(next));
    fs.renameSync(file + ".new", file);
    return read();
  }
  function saveImage(png) {
    if (!Buffer.isBuffer(png) || !png.length || png.length > 12 * 1024 * 1024)
      throw Error("图片太大，请换一张图片");
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(image + ".new", png);
    fs.renameSync(image + ".new", image);
    return save({ ...read(), background: "custom" });
  }
  function reset() {
    const result = save(DEFAULTS);
    try {
      fs.unlinkSync(image);
    } catch {}
    return { ...result, backgroundImage: "" };
  }
  return { read, save, saveImage, reset };
}
module.exports = { DEFAULTS, normalize, createAppearanceStore };
