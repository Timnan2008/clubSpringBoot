import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from "motion/react";
import { tx } from "./language";
import "./StatusMark.css";
const clamp = (value) => Math.min(1, Math.max(0, value));
export default function StatusMark({
  status = "pending",
  progress,
  label,
  color = "currentColor",
  doneColor = "#22c55e",
  errorColor = "#ef4444",
  size = 20,
  strokeWidth = 2,
  dashes = 8,
  fontSize = 14,
  spinDuration = 1100,
  arcLength = 0.68,
  drawDuration = 240,
  fillOpacity = 0.06,
  strike = true,
  strikeDelay = 60,
  className = "",
  style,
}) {
  const reduce = useReducedMotion();
  const r = 10 - strokeWidth / 2,
    C = 2 * Math.PI * r,
    P = C / Math.max(1, dashes);
  const determinate = status === "running" && Number.isFinite(progress);
  const indeterminate = status === "running" && !determinate;
  const solid = ["running", "done", "failed"].includes(status);
  const target = indeterminate ? arcLength : determinate ? clamp(progress) : 1;
  const mode = useMotionValue(solid ? 1 : 0),
    arc = useMotionValue(target),
    travel = useMotionValue(0);
  const ring = useRef(null);
  const write = () => {
    const m = mode.get(),
      a = arc.get();
    ring.current?.setAttribute(
      "stroke-dasharray",
      `${Math.max(0, 0.3 * P + (a * C - 0.3 * P) * m)} ${Math.max(0, 0.7 * P + ((1 - a) * C - 0.7 * P) * m)}`,
    );
    ring.current?.setAttribute("stroke-dashoffset", String(travel.get()));
  };
  useMotionValueEvent(mode, "change", write);
  useMotionValueEvent(arc, "change", write);
  useMotionValueEvent(travel, "change", write);
  useLayoutEffect(write, [C, P]);
  useEffect(() => {
    if (reduce) {
      mode.jump(solid ? 1 : 0);
      arc.jump(target);
      travel.jump(0);
      return;
    }
    const animations = [
      animate(mode, solid ? 1 : 0, { duration: 0.3, ease: [0.77, 0, 0.175, 1] }),
      animate(arc, target, { type: "spring", duration: 0.3, bounce: 0 }),
    ];
    const current = travel.get();
    animations.push(
      indeterminate
        ? animate(travel, [current, current - C], {
            duration: spinDuration / 1000,
            ease: "linear",
            repeat: Infinity,
          })
        : animate(travel, Math.floor(current / (determinate ? C : P)) * (determinate ? C : P), {
            duration: 0.3,
          }),
    );
    return () => animations.forEach((animation) => animation.stop());
  }, [
    status,
    target,
    solid,
    reduce,
    indeterminate,
    determinate,
    C,
    P,
    spinDuration,
    mode,
    arc,
    travel,
  ]);
  const spoken = {
    pending: tx("等待中", "Pending"),
    running: tx("进行中", "In progress"),
    done: tx("已完成", "Completed"),
    failed: tx("失败", "Failed"),
    cancelled: tx("已取消", "Cancelled"),
  }[status];
  return (
    <span
      className={`status-mark ${className}`}
      data-status={status}
      data-indeterminate={indeterminate || undefined}
      data-strike={strike || undefined}
      style={{
        "--sm-size": `${size}px`,
        "--sm-stroke": strokeWidth,
        "--sm-color": color,
        "--sm-done": doneColor,
        "--sm-error": errorColor,
        "--sm-font": `${fontSize}px`,
        "--sm-draw": `${drawDuration}ms`,
        "--sm-strike-delay": `${120 + strikeDelay}ms`,
        "--sm-fill": fillOpacity,
        ...style,
      }}
    >
      <svg
        className="status-mark__glyph"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        aria-hidden="true"
      >
        <circle
          className="status-mark__track"
          cx="12"
          cy="12"
          r={r}
          transform="rotate(-90 12 12)"
        />
        <circle
          ref={ring}
          className="status-mark__ring"
          cx="12"
          cy="12"
          r={r}
          transform="rotate(-90 12 12)"
        />
        <path className="status-mark__check" d="M7.5 12.25 10.5 15.25 16.75 8.75" pathLength="1" />
        <path
          className="status-mark__cross"
          d="M8.5 8.5 15.5 15.5M15.5 8.5 8.5 15.5"
          pathLength="1"
        />
      </svg>
      <span className="status-mark__sr">
        {spoken}
        {determinate ? ` ${Math.round(clamp(progress) * 100)}%` : ""}
        {label ? ": " : ""}
      </span>
      {label != null && (
        <span className="status-mark__label">
          {label}
          <span className="status-mark__strike" aria-hidden="true" />
        </span>
      )}
    </span>
  );
}
