import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import "./RubberSegment.css";

export default function RubberSegment({
  items = [],
  value,
  defaultValue,
  onChange,
  trackColor = "var(--control-highlight, #eeebf2)",
  thumbColor = "var(--control-surface, #fff)",
  textColor = "var(--control-muted, #746f80)",
  activeTextColor = "var(--control-ink, #292432)",
  size = "md",
  radius = 12,
  inset = 3,
  equalSlots = true,
  stretch = 100,
  squash = 3,
  speed = 1,
  glide = 75,
  draggable = true,
  disabled = false,
  className = "",
  "aria-label": ariaLabel = "Segmented control",
}) {
  const list = items.map((i) => (typeof i === "string" ? { value: i, label: i } : i));
  const [inner, setInner] = useState(defaultValue ?? list[0]?.value);
  const current = value !== undefined ? value : inner,
    index = Math.max(
      0,
      list.findIndex((i) => i.value === current),
    );
  const root = useRef(null),
    buttons = useRef([]),
    slots = useRef([]),
    drag = useRef(null),
    committed = useRef(index),
    timer = useRef(0),
    generation = useRef(0);
  const reduced = useReducedMotion(),
    left = useMotionValue(0),
    right = useMotionValue(0),
    width = useMotionValue(0);
  const clip = useTransform(
    () =>
      `inset(0 ${Math.max(0, width.get() - right.get())}px 0 ${Math.max(0, left.get())}px round ${Math.max(0, radius - inset)}px)`,
  );
  const stop = () => {
    clearTimeout(timer.current);
    generation.current++;
    left.stop();
    right.stop();
  };
  const jump = (i) => {
    const s = slots.current[i];
    if (s) {
      stop();
      left.jump(s.l);
      right.jump(s.r);
    }
  };
  const measure = () => {
    if (!root.current) return;
    const r = root.current.getBoundingClientRect();
    slots.current = list.map((_, i) => {
      const b = buttons.current[i].getBoundingClientRect();
      return { l: b.left - r.left - inset, r: b.right - r.left - inset };
    });
    width.set(r.width - 2 * inset);
    jump(committed.current);
  };
  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root.current);
    return () => ro.disconnect();
  }, [list.map((i) => i.value).join("|"), size, inset, equalSlots]);
  useEffect(() => {
    if (index !== committed.current && !drag.current) {
      committed.current = index;
      jump(index);
    }
  });
  useEffect(() => () => stop(), []);
  const land = (i) => {
    const s = slots.current[i];
    if (!s) return;
    const transition = {
      type: "spring",
      duration: 0.36 / Math.max(0.25, speed),
      bounce: Math.min(0.3, squash / 20),
    };
    animate(left, s.l, transition);
    animate(right, s.r, transition);
  };
  const choose = (i, instant = false) => {
    if (disabled || !list[i]) return;
    const previous = committed.current;
    committed.current = i;
    if (value === undefined) setInner(list[i].value);
    if (i !== index) onChange?.(list[i].value, i);
    stop();
    if (reduced || instant) {
      jump(i);
      return;
    }
    const a = slots.current[previous],
      b = slots.current[i];
    if (!a || !b) return;
    const u = Math.max(0, Math.min(1, stretch / 100));
    animate(left, b.l + (Math.min(a.l, b.l) - b.l) * u, { duration: 0.18 / Math.max(0.25, speed) });
    animate(right, b.r + (Math.max(a.r, b.r) - b.r) * u, {
      duration: 0.18 / Math.max(0.25, speed),
    });
    timer.current = setTimeout(() => land(i), 140 / Math.max(0.25, speed));
  };
  const cancel = () => {
    if (drag.current) {
      drag.current = null;
      delete root.current.dataset.held;
      reduced ? jump(committed.current) : land(committed.current);
    }
  };
  useEffect(() => {
    if (disabled) cancel();
  }, [disabled]);
  return (
    <div
      ref={root}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={`rubber-segment ${className}`}
      data-equal={equalSlots || undefined}
      style={{
        "--rs-track": trackColor,
        "--rs-thumb": thumbColor,
        "--rs-ink": textColor,
        "--rs-active": activeTextColor,
        "--rs-radius": `${radius}px`,
        "--rs-inset": `${inset}px`,
        "--rs-height": `${{ sm: 32, md: 40, lg: 48 }[size] || 40}px`,
      }}
    >
      {list.map((item, i) => (
        <button
          key={item.value}
          ref={(el) => {
            buttons.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={index === i}
          tabIndex={index === i ? 0 : -1}
          disabled={disabled}
          className="rubber-segment__item"
          onClick={(e) => {
            if (e.detail === 0) choose(i);
          }}
          onPointerDown={(e) => {
            if (e.button !== 0 || !e.isPrimary || drag.current) return;
            e.currentTarget.focus();
            const r = root.current.getBoundingClientRect(),
              x = e.clientX - r.left - inset;
            stop();
            drag.current = {
              id: e.pointerId,
              slot: i,
              start: x,
              x,
              t: e.timeStamp,
              v: 0,
              y: e.clientY,
              live: false,
              grab: draggable && x >= left.get() && x <= right.get(),
              l: left.get(),
              w: right.get() - left.get(),
              rect: r,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId || !d.grab) return;
            const x = e.clientX - d.rect.left - inset;
            const dx = x - d.start;
            if (!d.live && Math.abs(e.clientY - d.y) > 12 && Math.abs(dx) < 6) {
              cancel();
              return;
            }
            if (Math.abs(dx) < 4 && !d.live) return;
            d.live = true;
            root.current.dataset.held = "";
            d.v = (x - d.x) / Math.max(1, e.timeStamp - d.t);
            d.x = x;
            d.t = e.timeStamp;
            const l = Math.max(0, Math.min(width.get() - d.w, d.l + dx));
            left.set(l);
            right.set(l + d.w);
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            if (!d || e.pointerId !== d.id) return;
            drag.current = null;
            delete root.current.dataset.held;
            if (!d.live) {
              const r = e.currentTarget.getBoundingClientRect();
              if (
                e.clientX >= r.left - 10 &&
                e.clientX <= r.right + 10 &&
                e.clientY >= r.top - 10 &&
                e.clientY <= r.bottom + 10
              )
                choose(i);
              else land(committed.current);
              return;
            }
            const v = e.timeStamp - d.t > 100 ? 0 : Math.max(-2, Math.min(2, d.v));
            const target = (left.get() + right.get()) / 2 + v * glide;
            let to = 0;
            slots.current.forEach((s, j) => {
              const a = slots.current[to];
              if (Math.abs((s.l + s.r) / 2 - target) < Math.abs((a.l + a.r) / 2 - target)) to = j;
            });
            committed.current = to;
            if (value === undefined) setInner(list[to].value);
            if (to !== index) onChange?.(list[to].value, to);
            reduced ? jump(to) : land(to);
          }}
          onPointerCancel={cancel}
          onLostPointerCapture={cancel}
          onKeyDown={(e) => {
            let next = null;
            if (["ArrowRight", "ArrowDown"].includes(e.key))
              next = Math.min(list.length - 1, index + 1);
            if (["ArrowLeft", "ArrowUp"].includes(e.key)) next = Math.max(0, index - 1);
            if (e.key === "Home") next = 0;
            if (e.key === "End") next = list.length - 1;
            if (next !== null) {
              e.preventDefault();
              choose(next, true);
              buttons.current[next]?.focus();
            }
          }}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
      <motion.div className="rubber-segment__thumb" aria-hidden="true" style={{ clipPath: clip }}>
        {list.map((item) => (
          <span key={item.value} className="rubber-segment__item rubber-segment__copy">
            {item.icon}
            {item.label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
