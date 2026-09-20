import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import "./SpringCheck.css";
export default function SpringCheck({
  label,
  checked,
  defaultChecked = false,
  onChange,
  disabled = false,
  color = "var(--control-ink, #302b38)",
  fillColor = "var(--control-accent, #7660af)",
  checkColor = "#fff",
  boxSize = 24,
  boxRadius = 8,
  fontSize = 14,
  bounce = 0.2,
  strikeLag = 0.12,
  doneOpacity = 0.5,
  strike = "left",
  ariaLabel,
  className = "",
}) {
  const [inner, setInner] = useState(defaultChecked),
    reduced = useReducedMotion();
  const on = checked !== undefined ? checked : inner;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`spring-check ${className}`}
      style={{
        "--sc-ink": color,
        "--sc-fill": fillColor,
        "--sc-check": checkColor,
        "--sc-box": `${boxSize}px`,
        "--sc-radius": `${boxRadius}px`,
        "--sc-font": `${fontSize}px`,
      }}
      onClick={() => {
        if (checked === undefined) setInner(!on);
        onChange?.(!on);
      }}
    >
      <span className="spring-check__box">
        <motion.span
          className="spring-check__fill"
          initial={false}
          animate={{ scale: on ? 1 : 0 }}
          transition={reduced ? { duration: 0 } : { type: "spring", visualDuration: 0.22, bounce }}
        />
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <motion.path
            d={String(Tick02Icon[0][1].d)}
            initial={false}
            animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
          />
        </svg>
      </span>
      {label && (
        <span className="spring-check__label">
          <motion.span initial={false} animate={{ opacity: on ? doneOpacity : 1 }}>
            {label}
          </motion.span>
          {strike !== "none" && (
            <motion.span
              className="spring-check__rule"
              initial={false}
              animate={{ scaleX: on ? 1 : 0 }}
              style={{ transformOrigin: strike === "center" ? "center" : `${strike} center` }}
              transition={{ duration: reduced ? 0 : 0.2, delay: on && !reduced ? strikeLag : 0 }}
            />
          )}
        </span>
      )}
    </button>
  );
}
