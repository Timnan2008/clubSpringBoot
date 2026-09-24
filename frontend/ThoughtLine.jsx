// Adapted from the React Bits source supplied for this task.
import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import "./ThoughtLine.css";
import AutoFollowFeed from "./AutoFollowFeed";
import AssistantText from "./AssistantText";

export default function ThoughtLine({
  working = true,
  steps = [],
  label = "Thinking…",
  doneLabel = "Thought for",
  fontSize = 16,
  breathPeriod = 1.6,
  breathDepth = 0.45,
  settleDuration = 350,
  settleBlur = 2,
  collapsible = true,
  collapseOnSettle = true,
  showTimer = true,
  color = "currentColor",
  glyphColor = "",
  glyph,
  onSettle,
  className = "",
}) {
  const reduce = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const [open, setOpen] = useState(true);
  const seconds = useRef(0),
    started = useRef(null),
    callback = useRef(onSettle);
  const traceId = useId();
  callback.current = onSettle;
  useEffect(() => {
    if (!working) {
      if (started.current !== null) {
        callback.current?.(seconds.current);
        started.current = null;
      }
      if (collapseOnSettle) setOpen(false);
      return;
    }
    started.current = performance.now();
    seconds.current = 0;
    setElapsed(0);
    setOpen(true);
    const clock = setInterval(() => {
      seconds.current = (performance.now() - started.current) / 1000;
      setElapsed(seconds.current);
    }, 100);
    return () => clearInterval(clock);
  }, [working, collapseOnSettle]);
  const toggle = collapsible && steps.length > 0;
  const Head = toggle ? "button" : "div";
  return (
    <div
      className={`thought-line ${className}`}
      data-working={working || undefined}
      data-open={open || undefined}
      style={{
        "--tl-font": `${fontSize}px`,
        "--tl-color": color,
        "--tl-glyph": glyphColor || color,
        "--tl-settle": `${settleDuration}ms`,
        "--tl-blur": `${reduce ? 0 : settleBlur}px`,
      }}
    >
      <Head
        className="thought-line__head"
        {...(toggle
          ? {
              type: "button",
              "aria-expanded": open,
              "aria-controls": traceId,
              onClick: () => setOpen((v) => !v),
            }
          : {})}
      >
        <motion.span
          className="thought-line__glyph"
          aria-hidden="true"
          animate={{
            opacity: glyph
              ? 1
              : working && !reduce
                ? [1 - breathDepth, 1, 1 - breathDepth]
                : working
                  ? 1
                  : 0.55,
          }}
          transition={
            working && !reduce && !glyph
              ? { duration: breathPeriod, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.2 }
          }
        >
          {glyph || <HugeiconsIcon icon={SparklesIcon} size={18} />}
        </motion.span>
        <span key={working ? "working" : "done"} className="thought-line__text">
          {working ? label : doneLabel}
        </span>
        {showTimer && (
          <span className="thought-line__timer" aria-hidden="true">
            {elapsed.toFixed(1)}s
          </span>
        )}
        {toggle && (
          <HugeiconsIcon className="thought-line__chevron" icon={ArrowDown01Icon} size={13} />
        )}
      </Head>
      <span className="thought-line__sr" role="status">
        {working ? label : `${doneLabel} ${elapsed.toFixed(1)}s`}
      </span>
      {steps.length > 0 && (
        <div
          id={traceId}
          className="thought-line__trace"
          data-open={open || undefined}
          aria-hidden={!open}
        >
          <div className="thought-line__fold">
            <AutoFollowFeed className="thought-line__steps" maxHeight={240}>
              <AssistantText text={steps.join("\n\n")} />
            </AutoFollowFeed>
          </div>
        </div>
      )}
    </div>
  );
}
