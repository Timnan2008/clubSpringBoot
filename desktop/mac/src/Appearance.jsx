import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  Sun,
  Moon,
  Desktop,
  Check,
  UploadSimple,
  ArrowCounterClockwise,
  Palette,
  ImageSquare,
  X,
} from "@phosphor-icons/react";
import { bridge } from "./data";
import { Panel, Action } from "./components";
const defaults = {
  mode: "light",
  accent: "#7952d9",
  background: "glow",
  strength: 35,
  blur: 0,
  fontSize: 14,
  backgroundImage: "",
};
const Context = createContext(null);
export const useAppearance = () => useContext(Context);
function initial() {
  try {
    const cached = JSON.parse(localStorage.getItem("club-appearance") || "{}");
    return {
      ...defaults,
      ...cached,
      accent: /^#[\da-f]{6}$/i.test(cached?.accent || "") ? cached.accent : defaults.accent,
      backgroundImage: "",
    };
  } catch {
    return defaults;
  }
}
function palette(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255);
  const max = Math.max(...rgb),
    min = Math.min(...rgb),
    delta = max - min;
  let hue = !delta
    ? 0
    : max === rgb[0]
      ? ((rgb[1] - rgb[2]) / delta) % 6
      : max === rgb[1]
        ? (rgb[2] - rgb[0]) / delta + 2
        : (rgb[0] - rgb[1]) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  return { hue: Math.round(hue), saturation: Math.min(85, Math.max(45, Math.round(delta * 100))) };
}
export function AppearanceProvider({ children }) {
  const [value, setValue] = useState(initial);
  const [ready, setReady] = useState(false);
  const current = useRef(value),
    queue = useRef(Promise.resolve());
  const [systemDark, setSystemDark] = useState(matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    let active = true;
    bridge.appearance().then((v) => {
      if (active) {
        current.current = v;
        setValue(v);
        setReady(true);
      }
    });
    const query = matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(query.matches);
    query.addEventListener("change", update);
    return () => {
      active = false;
      query.removeEventListener("change", update);
    };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const mode = value.mode === "system" ? (systemDark ? "dark" : "light") : value.mode;
    root.dataset.theme = mode;
    root.dataset.background = value.background;
    const p = palette(value.accent);
    root.style.setProperty("--accent-h", p.hue);
    root.style.setProperty("--accent-s", `${p.saturation}%`);
    root.style.setProperty("--background-strength", value.strength / 100);
    root.style.setProperty("--background-blur", `${value.blur}px`);
    root.style.setProperty(
      "--custom-background",
      value.backgroundImage ? `url("${value.backgroundImage}")` : "none",
    );
    root.style.fontSize = `${value.fontSize}px`;
    root.style.setProperty("--font-scale", value.fontSize / 14);
    // The small cache prevents a theme flash. The image lives only in the app profile.
    const { backgroundImage, ...small } = value;
    localStorage.setItem("club-appearance", JSON.stringify(small));
  }, [value, systemDark]);
  async function update(patch) {
    const next = { ...current.current, ...patch };
    current.current = next;
    setValue(next);
    const { backgroundImage, ...settings } = next;
    const save = queue.current.catch(() => {}).then(() => bridge.saveAppearance(settings));
    queue.current = save;
    try {
      await save;
    } catch (e) {
      throw Error("外观没有保存成功，请重试");
    }
  }
  async function pick() {
    await queue.current.catch(() => {});
    const v = await bridge.pickBackground();
    if (v) {
      current.current = v;
      setValue(v);
    }
  }
  async function reset() {
    await queue.current.catch(() => {});
    const v = await bridge.resetAppearance();
    current.current = v;
    setValue(v);
  }
  return (
    <Context.Provider value={{ value, update, pick, reset, ready }}>{children}</Context.Provider>
  );
}
const accents = [
  ["鸢尾紫", "#7952d9"],
  ["晴空蓝", "#3478d4"],
  ["松石绿", "#19826d"],
  ["日落橙", "#bc6424"],
  ["玫瑰粉", "#bc4d78"],
  ["石墨灰", "#596579"],
];
const backdrops = [
  ["plain", "纯色"],
  ["glow", "微光"],
  ["ocean", "海岸"],
  ["forest", "山林"],
];
export function AppearanceSettings() {
  const { value, update, pick, reset, ready } = useAppearance();
  const [error, setError] = useState("");
  const act = async (fn) => {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message.replace(/^Error invoking remote method '[^']+': Error: /, ""));
    }
  };
  return (
    <section className="appearance-settings" aria-label="自定义界面">
      <Panel title="自定义界面" icon={Palette}>
        <div className="appearance-intro">
          <p>Windows 和 Mac 用同一套界面，选你喜欢的样子。</p>
          <span className="version-chip">{ready ? "修改后自动保存" : "正在读取外观"}</span>
        </div>
        <fieldset className="appearance-group">
          <legend>外观模式</legend>
          <div className="theme-options">
            {[
              [Sun, "light", "浅色", "明亮、清爽"],
              [Moon, "dark", "深色", "安静、专注"],
              [Desktop, "system", "跟随系统", "自动切换深浅"],
            ].map(([Icon, mode, title, detail]) => (
              <button
                key={mode}
                className={`theme-option ${value.mode === mode ? "active" : ""}`}
                aria-pressed={value.mode === mode}
                aria-label={`${title}外观`}
                disabled={!ready}
                onClick={() => act(() => update({ mode }))}
              >
                <div className={`theme-mini theme-mini-${mode}`}>
                  <i />
                  <div>
                    <b />
                    <span />
                    <span />
                  </div>
                  <em />
                </div>
                <span>
                  <Icon size={17} />
                  <strong>{title}</strong>
                  {value.mode === mode && (
                    <Check className="selected-check" size={17} weight="bold" />
                  )}
                </span>
                <small>{detail}</small>
              </button>
            ))}
          </div>
        </fieldset>
        <div className="appearance-columns">
          <fieldset className="appearance-group">
            <legend>主题颜色</legend>
            <p>按钮、选中项和图标一起换色。</p>
            <div className="accent-options">
              {accents.map(([name, color]) => (
                <button
                  key={color}
                  aria-label={name}
                  title={name}
                  aria-pressed={value.accent === color}
                  style={{ "--swatch": color }}
                  className={`accent-swatch ${value.accent === color ? "active" : ""}`}
                  disabled={!ready}
                  onClick={() => act(() => update({ accent: color }))}
                >
                  {value.accent === color && <Check size={18} weight="bold" />}
                </button>
              ))}
              <label className="custom-color" title="选择其他颜色">
                <Palette size={19} />
                <input
                  type="color"
                  aria-label="自定义主题色"
                  value={value.accent}
                  disabled={!ready}
                  onChange={(e) => act(() => update({ accent: e.target.value }))}
                />
              </label>
            </div>
          </fieldset>
          <fieldset className="appearance-group">
            <legend>文字大小</legend>
            <p>让阅读更舒适。</p>
            <div className="segmented size-options">
              {[13, 14, 15, 16].map((size) => (
                <button
                  key={size}
                  aria-label={`${size}号文字`}
                  aria-pressed={value.fontSize === size}
                  className={value.fontSize === size ? "active" : ""}
                  disabled={!ready}
                  onClick={() => act(() => update({ fontSize: size }))}
                >
                  {size === 14 ? "默认" : size === 13 ? "小" : size === 15 ? "大" : "更大"}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </Panel>
      <Panel title="工作台背景" icon={ImageSquare}>
        <p className="appearance-description">
          选一种氛围，或者放一张自己的图片。背景只保存在这台电脑。
        </p>
        <div className="background-options">
          {backdrops.map(([background, name]) => (
            <button
              key={background}
              className={`background-option ${value.background === background ? "active" : ""}`}
              aria-label={`${name}背景`}
              aria-pressed={value.background === background}
              disabled={!ready}
              onClick={() => act(() => update({ background }))}
            >
              <span className={`background-mini background-${background}`} />
              <strong>{name}</strong>
              {value.background === background && <Check size={15} />}
            </button>
          ))}
          <button
            className={`background-option upload-background ${value.background === "custom" ? "active" : ""}`}
            disabled={!ready}
            aria-label={value.backgroundImage ? "使用自定义背景" : "上传背景图片"}
            onClick={() =>
              act(() => (value.backgroundImage ? update({ background: "custom" }) : pick()))
            }
          >
            <span
              className="background-mini"
              style={
                value.backgroundImage
                  ? { backgroundImage: `url(${value.backgroundImage})`, backgroundSize: "cover" }
                  : {}
              }
            >
              {!value.backgroundImage && <UploadSimple size={22} />}
            </span>
            <strong>我的图片</strong>
            {value.background === "custom" && <Check size={15} />}
          </button>
        </div>
        <div className="background-tools">
          <span>支持 JPG、PNG、WebP，最大 20 MB</span>
          <button className="text-button accent" disabled={!ready} onClick={() => act(pick)}>
            <UploadSimple size={16} />
            {value.backgroundImage ? "更换图片" : "选择图片"}
          </button>
        </div>
        <div className="appearance-sliders">
          <label>
            <span>
              背景浓度 <b>{value.strength}%</b>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={value.strength}
              aria-label="背景浓度"
              disabled={!ready || value.background === "plain"}
              onChange={(e) => act(() => update({ strength: Number(e.target.value) }))}
            />
          </label>
          <label>
            <span>
              背景模糊 <b>{value.blur} px</b>
            </span>
            <input
              type="range"
              min="0"
              max="24"
              value={value.blur}
              aria-label="背景模糊"
              disabled={!ready || value.background === "plain"}
              onChange={(e) => act(() => update({ blur: Number(e.target.value) }))}
            />
          </label>
        </div>
        <div className="appearance-foot">
          <span>卡片保留清晰底色，文字更好读。</span>
          <Action secondary disabled={!ready} onClick={() => act(reset)}>
            <ArrowCounterClockwise size={16} />
            恢复默认外观
          </Action>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </Panel>
    </section>
  );
}
