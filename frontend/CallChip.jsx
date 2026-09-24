import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CommandLineIcon,
  File02Icon,
  PencilEdit01Icon,
  RefreshIcon,
  Search01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import "./CallChip.css";

const HOLD_AT = 0.9;
const SHAKE = [0, -1, 1, -0.66, 0.66, -0.33, 0];
const ICONS = {
  terminal: CommandLineIcon,
  file: File02Icon,
  search: Search01Icon,
  edit: PencilEdit01Icon,
};
const WORDS = { running: "running", done: "done", error: "failed", idle: "queued" };
const fmt = (ms) => (ms < 10000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);
const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const glyphOf = (s) => (s === "done" ? "check" : s === "error" ? "retry" : "tool");

export default function CallChip({
  icon = "terminal",
  name = "bash",
  argument = "",
  status = "running",
  expectedMs = 2500,
  size = 34,
  radius = 10,
  color = "currentColor",
  surfaceColor = "#27272a",
  progressColor = "currentColor",
  progressOpacity = 0.08,
  doneColor = "#22c55e",
  errorColor = "#ef4444",
  washOpacity = 0.14,
  shake = 6,
  showTimer = true,
  elapsedMs = 0,
  startedAt = 0,
  paused = false,
  onRetry,
  className = "",
  style,
}) {
  const rootRef = useRef(null);
  const fillRef = useRef(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(false);
  const fraction = useRef(0);
  const clock = useRef({ ms: 0 });
  const shakeAnim = useRef(null);
  const statusRef = useRef(status);
  statusRef.current = status;
  const [mounted, setMounted] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [announce, setAnnounce] = useState("");
  const roll = useRef({ cur: glyphOf(status), prev: null });
  if (glyphOf(status) !== roll.current.cur)
    roll.current = { cur: glyphOf(status), prev: roll.current.cur };

  const setFraction = (f, instant) => {
    const fill = fillRef.current;
    if (!fill) return;
    fraction.current = f;
    if (instant) fill.style.transition = "none";
    fill.style.transform = `scaleX(${f})`;
    if (instant) {
      void fill.getBoundingClientRect();
      fill.style.transition = "";
    }
  };
  const apply = (s, animate) => {
    if (s === "running") {
      shakeAnim.current?.cancel();
      setFraction(0, true);
      if (animate) setFraction(HOLD_AT, false);
    } else if (s === "done") {
      setFraction(1, !animate);
    } else if (s === "error") {
      const fill = fillRef.current;
      const live = fill ? new DOMMatrix(getComputedStyle(fill).transform).a : fraction.current;
      setFraction(Math.min(1, Math.max(0, live)), true);
      if (animate && shake > 0 && !reduceMotion() && rootRef.current) {
        shakeAnim.current = rootRef.current.animate(
          SHAKE.map((k) => ({
            transform: `translateX(${k * shake}px)`,
            easing: "cubic-bezier(0.77, 0, 0.175, 1)",
          })),
          { duration: 450, composite: "add" },
        );
      }
    } else setFraction(0, true);
  };

  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    apply(statusRef.current, statusRef.current === "running");
    return () => {
      mountedRef.current = false;
      shakeAnim.current?.cancel();
    };
  }, []);
  useLayoutEffect(() => {
    if (mountedRef.current) apply(status, true);
  }, [status]);

  useEffect(() => {
    const write = (ms) => {
      const shown = Math.max(0, ms);
      clock.current.ms = shown;
      if (timerRef.current) timerRef.current.textContent = shown ? fmt(shown) : "—";
    };
    if (paused || status !== "running") {
      write(elapsedMs || 0);
      return undefined;
    }
    const origin = startedAt || Date.now();
    write(Date.now() - origin);
    if (reduceMotion()) {
      const id = setInterval(() => write(Date.now() - origin), 100);
      return () => {
        clearInterval(id);
        write(Date.now() - origin);
      };
    }
    let raf = 0;
    const tick = () => {
      write(Date.now() - origin);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      write(Date.now() - origin);
    };
  }, [status, elapsedMs, startedAt, paused]);
  useEffect(() => {
    const ms = showTimer && clock.current.ms ? Math.round(clock.current.ms) : 0;
    const when =
      status === "done" && ms ? ` in ${ms} ms` : status === "error" && ms ? ` after ${ms} ms` : "";
    setAnnounce(`${name} ${argument}, ${WORDS[status] ?? status}${when}`);
  }, [status]);

  const font = Math.max(11, Math.round(size * 0.38));
  const glyphState = (g) =>
    g === roll.current.cur ? "in" : g === roll.current.prev ? "out" : undefined;
  const toolIcon = typeof icon === "string" ? (ICONS[icon] ?? ICONS.terminal) : null;
  const iconSize = font + 2;

  return (
    <span
      ref={rootRef}
      role="status"
      aria-busy={status === "running" || undefined}
      data-status={status}
      data-mounted={mounted ? "" : undefined}
      data-pressed={pressed ? "" : undefined}
      className={`call-chip${className ? ` ${className}` : ""}`}
      style={{
        "--cc-size": `${size}px`,
        "--cc-font": `${font}px`,
        "--cc-pad": `${Math.round(size * 0.35)}px`,
        "--cc-gap": `${Math.round(font * 0.55)}px`,
        "--cc-radius": `${radius}px`,
        "--cc-color": color,
        "--cc-surface": surfaceColor,
        "--cc-progress": progressColor,
        "--cc-progress-pct": `${progressOpacity * 100}%`,
        "--cc-done": doneColor,
        "--cc-error": errorColor,
        "--cc-wash-pct": `${washOpacity * 100}%`,
        "--cc-expected": `${expectedMs}ms`,
        ...style,
      }}
    >
      <span ref={fillRef} className="call-chip__fill" aria-hidden="true" />
      <span className="call-chip__slot" aria-hidden="true">
        <span className="call-chip__glyph" data-state={glyphState("tool")}>
          {toolIcon ? <HugeiconsIcon icon={toolIcon} size={iconSize} strokeWidth={1.8} /> : icon}
        </span>
        <span className="call-chip__glyph" data-state={glyphState("check")}>
          <HugeiconsIcon icon={Tick02Icon} size={iconSize} strokeWidth={2.2} />
        </span>
        <span className="call-chip__glyph" data-state={glyphState("retry")}>
          <HugeiconsIcon icon={RefreshIcon} size={iconSize} strokeWidth={2} />
        </span>
      </span>
      <span className="call-chip__name" aria-hidden="true">
        {name}
      </span>
      <span className="call-chip__arg" aria-hidden="true">
        {argument}
      </span>
      {showTimer ? (
        <span ref={timerRef} className="call-chip__timer" aria-hidden="true">
          {elapsedMs ? fmt(elapsedMs) : status === "running" ? "0 ms" : "—"}
        </span>
      ) : null}
      {status === "error" && onRetry ? (
        <button
          type="button"
          className="call-chip__retry"
          aria-label={`Retry ${name} ${argument}`}
          onClick={() => onRetry()}
          onPointerDown={() => setPressed(true)}
          onPointerUp={() => setPressed(false)}
          onPointerCancel={() => setPressed(false)}
        />
      ) : null}
      <span className="call-chip__sr">{announce}</span>
    </span>
  );
}
