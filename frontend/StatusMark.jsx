import { tx } from "./language";
import "./StatusMark.css";
export default function StatusMark({
  status = "pending",
  progress,
  label,
  color = "currentColor",
  doneColor = "#22a06b",
  errorColor = "#d74b57",
  size = 20,
  strokeWidth = 2,
  dashes = 8,
  fontSize = 14,
  spinDuration = 1100,
  arcLength = 0.68,
  drawDuration = 240,
  fillOpacity = 0.06,
  strike = false,
  strikeDelay = 60,
  className = "",
  style,
}) {
  const running = status === "running",
    determinate = running && Number.isFinite(progress);
  const p = Math.min(1, Math.max(0, progress || 0));
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
      data-spin={(running && !determinate) || undefined}
      data-strike={strike || undefined}
      role="status"
      style={{
        "--sm-size": `${size}px`,
        "--sm-color": color,
        "--sm-done": doneColor,
        "--sm-error": errorColor,
        "--sm-font": `${fontSize}px`,
        "--sm-spin": `${spinDuration}ms`,
        "--sm-draw": `${drawDuration}ms`,
        "--sm-delay": `${strikeDelay}ms`,
        "--sm-fill": fillOpacity,
        ...style,
      }}
    >
      <svg
        className="status-mark__glyph"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        aria-hidden="true"
      >
        <circle className="status-mark__wash" cx="12" cy="12" r="9" />
        <circle
          className="status-mark__ring"
          cx="12"
          cy="12"
          r="9"
          pathLength="1"
          strokeDasharray={
            running
              ? `${determinate ? p : arcLength} 1`
              : status === "pending"
                ? `${0.3 / dashes} ${0.7 / dashes}`
                : "1 0"
          }
          transform="rotate(-90 12 12)"
        />
        <path className="status-mark__check" d="m7.5 12.25 3 3 6.25-6.5" pathLength="1" />
        <path className="status-mark__cross" d="m8.5 8.5 7 7m0-7-7 7" pathLength="1" />
      </svg>
      <span className="status-mark__sr">
        {spoken}
        {determinate ? ` ${Math.round(p * 100)}%` : ""}
        {label ? ": " : ""}
      </span>
      {label && <span className="status-mark__label">{label}</span>}
    </span>
  );
}
