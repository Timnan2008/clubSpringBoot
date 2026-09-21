// Adapted from React Bits; see REACT-BITS-LICENSE.md.
import { useEffect, useRef } from "react";
import "./PixelCard.css";

const VARIANTS = {
  default: { gap: 5, speed: 35, colors: "#f8fafc,#f1f5f9,#cbd5e1", activeColor: "#cbd5e1" },
  blue: { gap: 10, speed: 25, colors: "#e0f2fe,#7dd3fc,#0ea5e9", activeColor: "#7dd3fc" },
  yellow: { gap: 3, speed: 20, colors: "#fef08a,#fde047,#eab308", activeColor: "#fde047" },
  pink: { gap: 6, speed: 80, colors: "#fecdd3,#fda4af,#e11d48", activeColor: "#fda4af" },
};
const random = (min, max) => min + Math.random() * (max - min);
class Pixel {
  constructor(x, y, color, speed, width, height) {
    Object.assign(this, {
      x,
      y,
      color,
      speed: random(0.1, 0.9) * speed,
      size: 0,
      step: random(0.1, 0.4),
      max: random(0.5, 2),
      delay: Math.hypot(x - width / 2, y - height / 2),
      counter: 0,
      counterStep: random(0, 4) + (width + height) * 0.01,
      reverse: false,
      shimmer: false,
    });
  }
  draw(ctx, appear, delta) {
    if (appear) {
      if (this.counter < this.delay) {
        this.counter += this.counterStep * delta;
        return true;
      }
      if (this.size >= this.max) this.shimmer = true;
      if (this.shimmer) {
        if (this.size >= this.max) this.reverse = true;
        if (this.size <= 0.5) this.reverse = false;
        this.size = Math.max(0, this.size + (this.reverse ? -this.speed : this.speed) * delta);
      } else this.size = Math.min(this.max, this.size + this.step * delta);
    } else {
      this.shimmer = false;
      this.counter = 0;
      this.size = Math.max(0, this.size - 0.1 * delta);
    }
    if (this.size > 0) {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x + 1 - this.size / 2, this.y + 1 - this.size / 2, this.size, this.size);
    }
    return appear || this.size > 0;
  }
}
export default function PixelCard({
  variant = "default",
  gap,
  speed,
  colors,
  noFocus = false,
  className = "",
  style = {},
  children,
  ariaLabel,
}) {
  const root = useRef(null),
    canvas = useRef(null),
    control = useRef(null);
  const cfg = VARIANTS[variant] || VARIANTS.default;
  const spacing = Math.max(3, Number(gap ?? cfg.gap) || cfg.gap);
  const velocity = Math.max(0, Math.min(100, Number(speed ?? cfg.speed) || 0)) * 0.001;
  const palette = colors || cfg.colors;
  useEffect(() => {
    const element = root.current,
      surface = canvas.current,
      ctx = surface.getContext("2d");
    if (!ctx) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let pixels = [],
      frame = 0,
      previous = 0,
      visible = true,
      hovered = false,
      focused = false,
      touch = false,
      intro = true,
      timer = 0;
    let width = 0,
      height = 0;
    const active = () => hovered || focused || touch || intro;
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const staticFrame = () => {
      ctx.clearRect(0, 0, width, height);
      if (active())
        pixels.forEach((p) => {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, 1, 1);
        });
    };
    const draw = (now) => {
      frame = 0;
      if (document.hidden || !visible) return;
      if (media.matches) {
        staticFrame();
        return;
      }
      const elapsed = previous ? now - previous : 1000 / 60;
      if (elapsed < 1000 / 60 - 1) {
        frame = requestAnimationFrame(draw);
        return;
      }
      previous = now;
      ctx.clearRect(0, 0, width, height);
      let moving = false;
      for (const pixel of pixels)
        moving = pixel.draw(ctx, active(), Math.min(2, elapsed / (1000 / 60))) || moving;
      if (moving) frame = requestAnimationFrame(draw);
    };
    const start = () => {
      stop();
      previous = 0;
      element.dataset.active = String(active());
      if (visible && !document.hidden) {
        if (media.matches) staticFrame();
        else frame = requestAnimationFrame(draw);
      }
    };
    const resize = () => {
      const rect = element.getBoundingClientRect();
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);
      const dpr = Math.min(devicePixelRatio || 1, 2);
      surface.width = width * dpr;
      surface.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const list = palette
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      pixels = [];
      for (let x = 0; x < width; x += spacing)
        for (let y = 0; y < height; y += spacing)
          pixels.push(
            new Pixel(
              x,
              y,
              list[Math.floor(Math.random() * list.length)] || "#cbd5e1",
              velocity,
              width,
              height,
            ),
          );
      start();
    };
    control.current = (kind, on) => {
      if (kind === "hover") hovered = on;
      if (kind === "focus") focused = on;
      if (kind === "touch") touch = on;
      intro = false;
      start();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(element);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    intersection.observe(element);
    const visibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", start);
    resize();
    timer = setTimeout(() => {
      intro = false;
      start();
    }, 1500);
    return () => {
      stop();
      clearTimeout(timer);
      resizeObserver.disconnect();
      intersection.disconnect();
      media.removeEventListener("change", start);
      document.removeEventListener("visibilitychange", visibility);
      control.current = null;
    };
  }, [spacing, velocity, palette]);
  return (
    <div
      ref={root}
      className={`pixel-card ${className}`}
      style={{ "--pixel-card-active-color": cfg.activeColor, ...style }}
      tabIndex={noFocus ? undefined : 0}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch") control.current?.("hover", true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "touch") control.current?.("hover", false);
      }}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") control.current?.("touch", true);
      }}
      onPointerUp={(e) => {
        if (e.pointerType === "touch") control.current?.("touch", false);
      }}
      onPointerCancel={() => control.current?.("touch", false)}
      onFocus={noFocus ? undefined : () => control.current?.("focus", true)}
      onBlur={
        noFocus
          ? undefined
          : (e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) control.current?.("focus", false);
            }
      }
    >
      <canvas ref={canvas} className="pixel-canvas" aria-hidden="true" />
      {children}
    </div>
  );
}
