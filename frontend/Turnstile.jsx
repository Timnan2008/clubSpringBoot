import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { tx, en } from "./language";
import { embeddedBrowser as detectEmbedded } from "./embedded-browser.mjs";
let loading,
  loadSequence = 0;
export function embeddedBrowser(ua = navigator.userAgent || "") {
  return detectEmbedded(ua);
}
// Keep one SDK request for all widgets; only cache successful initialization.
export function loadTurnstile() {
  if (window.turnstile?.render) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  const pending = new Promise((resolve, reject) => {
    let settled = false;
    const script = document.createElement("script"),
      callbackName = "clubTurnstileReady" + ++loadSequence;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      delete window[callbackName];
      if (error) {
        script.remove();
        reject(error);
      } else resolve(window.turnstile);
    };
    const timer = setTimeout(() => finish(Error("script-timeout")), 30000);
    window[callbackName] = () =>
      window.turnstile?.render ? finish() : finish(Error("script-unavailable"));
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=" +
      callbackName;
    script.async = true;
    script.defer = true;
    // onload URL callback runs after SDK initialization; ready() is incompatible with async tags.
    script.onerror = () => finish(Error("script-network"));
    document.head.append(script);
  });
  loading = pending;
  pending.catch(() => {
    if (loading === pending) loading = null;
  });
  return pending;
}
async function configuration(signal) {
  const controller = new AbortController(),
    cancel = () => controller.abort();
  signal.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(cancel, 15000);
  try {
    const r = await fetch("/api/suggestion/verification", { signal: controller.signal });
    if (!r.ok) throw Error("configuration-network");
    const data = await r.json();
    if (!data.ready) throw Error("configuration-missing");
    return data;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
  }
}
function errorText(code) {
  if (embeddedBrowser())
    return tx(
      "当前浏览器无法完成验证。请点右上角 ···，选择在 Safari 或系统浏览器中打开。",
      "This in-app browser cannot finish verification. Open the page in Safari or Chrome from the menu.",
    );
  const value = String(code || "");
  if (value.startsWith("600") || value.startsWith("300") || value === "110600")
    return tx(
      "安全验证未通过。请关闭加速器后重试，或换用 Safari / Chrome。",
      "Verification did not complete. Turn off a VPN and retry in Safari or Chrome.",
    );
  if (value === "200500" || value === "script-network" || value === "script-timeout")
    return tx(
      "连不上验证服务。请检查网络后重试，校园网有时会拦截。",
      "Cannot reach verification. Check the network and retry.",
    );
  return (
    tx("验证未完成，请重试。", "Verification did not finish. Please retry.") +
    (value ? " (" + value + ")" : "")
  );
}
export default function Turnstile({ onToken, reset, action = "suggestion", theme = "light" }) {
  const slot = useRef(),
    host = useRef(),
    callback = useRef(onToken),
    failures = useRef(0),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [passed, setPassed] = useState(false),
    [loaded, setLoaded] = useState(false),
    [box, setBox] = useState(null);
  callback.current = onToken;
  useLayoutEffect(() => {
    const el = slot.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setBox({
        top: Math.round(r.top),
        left: Math.round(r.left),
        width: Math.max(Math.round(r.width), 280),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [attempt, reset]);
  useEffect(() => {
    let live = true,
      id,
      api,
      timer;
    const abort = new AbortController();
    failures.current = 0;
    callback.current("");
    setPassed(false);
    setError("");
    setLoaded(false);
    const clear = () => {
      if (live) {
        setPassed(false);
        callback.current("");
      }
    };
    const start = async () => {
      await new Promise((resolve) => {
        timer = setTimeout(resolve, 480);
      });
      if (!live) return;
      for (let n = 0; n < 3 && live; n++)
        try {
          const config = await configuration(abort.signal);
          if (!live) return;
          if (config.local) {
            setLoaded(true);
            setPassed(true);
            callback.current("local");
            return;
          }
          const ts = await loadTurnstile();
          if (!live) return;
          if (!host.current) await new Promise((resolve) => requestAnimationFrame(() => resolve()));
          if (!live || !host.current) return;
          api = ts;
          id = ts.render(host.current, {
            sitekey: config.siteKey,
            action,
            theme,
            size: "flexible",
            appearance: "always",
            language: en ? "en" : "zh-cn",
            retry: "auto",
            "retry-interval": 8000,
            "refresh-expired": "auto",
            "refresh-timeout": "auto",
            callback: (token) => {
              if (live) {
                setError("");
                setPassed(true);
                callback.current(token);
              }
            },
            "expired-callback": clear,
            "timeout-callback": clear,
            "error-callback": (code) => {
              clear();
              failures.current += 1;
              if (live) setError(errorText(code));
              return failures.current >= 2;
            },
          });
          setLoaded(true);
          return;
        } catch (e) {
          if (!live) return;
          if (e.message === "configuration-missing") {
            setError(
              tx(
                "验证服务暂不可用，请稍后重试。",
                "Verification is temporarily unavailable. Please retry later.",
              ),
            );
            return;
          }
          if (n === 2) {
            setError(errorText(e.message));
            return;
          }
          await new Promise((resolve) => {
            timer = setTimeout(resolve, 1000 * (n + 1));
          });
        }
    };
    start();
    const online = () => {
      if (live) setAttempt((n) => n + 1);
    };
    window.addEventListener("online", online);
    return () => {
      live = false;
      abort.abort();
      clearTimeout(timer);
      window.removeEventListener("online", online);
      if (api && id !== undefined) api.remove(id);
    };
  }, [attempt, reset, action, theme]);
  return (
    <div className="ideas-turnstile">
      <strong className="verification-label">
        {tx("安全验证 · Cloudflare", "Security check · Cloudflare")}
      </strong>
      {embeddedBrowser() && (
        <p className="ideas-turnstile-browser" role="status">
          {tx(
            "微信、QQ 里通常过不了这项验证。请点右上角 ···，选择在 Safari 或系统浏览器中打开。",
            "WeChat and QQ in-app browsers usually fail this check. Open the page in Safari or Chrome from the menu.",
          )}
        </p>
      )}
      {!loaded && !error && (
        <p role="status">{tx("正在连接验证服务…", "Connecting to verification…")}</p>
      )}
      <div ref={slot} className="ideas-turnstile-slot" />
      {createPortal(
        <div
          ref={host}
          className="ideas-turnstile-host"
          style={
            box
              ? {
                  position: "fixed",
                  top: box.top,
                  left: box.left,
                  width: box.width,
                  zIndex: 40,
                  transform: "none",
                  filter: "none",
                  perspective: "none",
                }
              : {
                  position: "fixed",
                  left: -9999,
                  top: 0,
                  width: 300,
                }
          }
        />,
        document.body,
      )}
      {passed && (
        <small className="ideas-verified" role="status">
          ✓ {tx("人机验证已通过", "Verification complete")}
        </small>
      )}
      {error && (
        <p role="alert">
          {error}{" "}
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            {tx("重试", "Retry")}
          </button>
        </p>
      )}
    </div>
  );
}
