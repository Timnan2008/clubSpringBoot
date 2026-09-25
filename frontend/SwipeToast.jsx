import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { tx } from "./language";
import "./SwipeToast.css";

export default function SwipeToast({
  title,
  description,
  onClose,
  duration = 4500,
  actionLabel,
  onAction,
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(true),
    [hover, setHover] = useState(false),
    [focus, setFocus] = useState(false),
    [dragging, setDragging] = useState(false),
    [hidden, setHidden] = useState(document.hidden);
  const fraction = useMotionValue(1),
    remaining = useRef(duration),
    reason = useRef("timeout"),
    latest = useRef(onClose);
  latest.current = onClose;
  const close = (why) => {
    reason.current = why;
    setOpen(false);
  };
  useEffect(() => {
    const changed = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", changed);
    return () => document.removeEventListener("visibilitychange", changed);
  }, []);
  useEffect(() => {
    if (!open || hover || focus || dragging || hidden || duration <= 0) return;
    const started = performance.now();
    const controls = animate(fraction, 0, { duration: remaining.current / 1000, ease: "linear" });
    const timer = setTimeout(() => close("timeout"), remaining.current);
    return () => {
      clearTimeout(timer);
      controls.stop();
      remaining.current = Math.max(0, remaining.current - (performance.now() - started));
    };
  }, [open, hover, focus, dragging, hidden, duration, fraction]);
  return (
    <AnimatePresence onExitComplete={() => latest.current?.(reason.current)}>
      {open && (
        <motion.div
          className="swipe-toast"
          initial={{ opacity: 0, y: reduced ? 0 : 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : 24 }}
          transition={{ duration: reduced ? 0.1 : 0.22, ease: [0.23, 1, 0.32, 1] }}
        >
          <motion.div
            className="swipe-toast__card"
            role="status"
            aria-live="polite"
            tabIndex={0}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.7 }}
            onDragStart={() => setDragging(true)}
            onDragEnd={(_, info) => {
              setDragging(false);
              if (info.offset.y > 40 || info.velocity.y > 450) close("swipe");
            }}
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") setHover(true);
            }}
            onPointerLeave={() => setHover(false)}
            onFocus={() => setFocus(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setFocus(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                close("escape");
              }
            }}
          >
            <div className="swipe-toast__body">
              <strong>{title}</strong>
              {description && <span>{description}</span>}
            </div>
            {actionLabel && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  onAction?.();
                  close("action");
                }}
              >
                {actionLabel}
              </button>
            )}
            <button
              className="swipe-toast__close"
              type="button"
              aria-label={tx("关闭通知", "Close notification")}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => close("close")}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} />
            </button>
            {duration > 0 && (
              <motion.i
                className="swipe-toast__fuse"
                style={{ scaleX: fraction }}
                aria-hidden="true"
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
