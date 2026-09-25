import { useEffect, useRef, useState } from "react";
import { effect, frame, init, surface, uniforms } from "vgpu";
import "./ShapeWaves.css";

const SHADER = `
struct Params { resolution: vec4f, field: vec4f, color: vec4f, hover: vec4f, background: vec4f }
@group(0) @binding(0) var<uniform> params: Params;

fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let resolution = params.resolution.xy;
  let cell = max(params.field.x, 4.0);
  let pixel = uv * resolution;
  let grid = floor(pixel / cell);
  let center = (grid + 0.5) * cell;
  let local = (pixel - center) / (cell * 0.5);
  let wave = sin(grid.x * 0.17 + grid.y * 0.11 + params.field.y) * 0.5 + 0.5;
  let band = i32(min(wave, 0.999) * 3.0);
  var shape = 2 - band;
  var size = params.field.z;
  let splash = params.field.w;
  let dist = length((pixel - params.hover.xy) / max(splash, 1.0));
  let charge = smoothstep(1.0, 0.0, dist);
  if (params.hover.z > 0.5) {
    shape = (shape + i32(charge * 2.0)) % 3;
  }
  var coverage = 0.0;
  if (shape == 0) { coverage = 1.0 - smoothstep(size - 0.08, size, max(abs(local.x), abs(local.y))); }
  else if (shape == 1) { coverage = 1.0 - smoothstep(size - 0.08, size, length(local)); }
  else {
    let tri = abs(local.x) * 0.85 + local.y * 0.5;
    coverage = 1.0 - smoothstep(size - 0.08, size, tri);
  }
  let fade = pow(length(uv * 2.0 - 1.0), 1.6);
  coverage *= 1.0 - smoothstep(0.2, 1.15, fade) * 0.85;
  let tint = mix(params.color.rgb, params.hover.rgb, charge * 0.85);
  return vec4f(mix(params.background.rgb, tint, coverage), 1.0);
}
`;

const parseColor = (value, fallback) => {
  const source = typeof value === "string" ? value.trim() : "";
  const match = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(source) || /^#?([\da-f]{6})$/i.exec(fallback);
  let hex = match[1];
  if (hex.length === 3) hex = hex.replace(/./g, (char) => char + char);
  return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
};

export default function ShapeWaves({
  text = "",
  cellSize = 10,
  dotSize = 0.75,
  color = "#929292",
  hoverColor = "#ffffff",
  backgroundColor = "#000000",
  speed = 1,
  interactive = true,
  splashRadius = 40,
  onError,
  className = "",
}) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const settings = useRef({});
  settings.current = {
    text,
    cellSize: Math.max(4, cellSize),
    dotSize,
    color,
    hoverColor,
    backgroundColor,
    speed,
    interactive,
    splashRadius,
  };
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return undefined;
    let disposed = false;
    let gpu;
    let frameId = 0;
    let time = 0;
    let last = 0;
    let presented = false;
    const cleanup = { run() {} };
    const pointer = { x: -9999, y: -9999, inside: false };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const fail = (error) => {
      if (disposed) return;
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      gpu?.dispose?.();
      setReady(false);
      onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
    };

    const onMove = (event) => {
      if (!settings.current.interactive) return;
      const bounds = root.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      pointer.inside = x >= 0 && y >= 0 && x <= bounds.width && y <= bounds.height;
      pointer.x = x;
      pointer.y = y;
    };

    void (async () => {
      try {
        gpu = await init({ powerPreference: "low-power" });
        if (disposed) {
          gpu.dispose();
          return;
        }
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const size = [
          Math.max(1, Math.round(canvas.clientWidth * dpr)),
          Math.max(1, Math.round(canvas.clientHeight * dpr)),
        ];
        const output = surface(gpu, canvas, { dpr, size, autoResize: false });
        const params = uniforms(gpu, {
          resolution: [size[0], size[1], 1, 1],
          field: [10, 0, 0.7, 40],
          color: [0.57, 0.57, 0.57, 1],
          hover: [-9999, -9999, 0, 0],
          background: [0, 0, 0, 1],
        });
        const scene = effect(gpu, SHADER, { label: "shape-waves", set: { params } });
        await scene.compile({ colors: [navigator.gpu.getPreferredCanvasFormat()] });
        if (disposed) return;
        const render = (now) => {
          if (disposed) return;
          const delta = last ? Math.min(0.05, (now - last) / 1000) : 0;
          last = now;
          if (!reduce.matches && settings.current.speed > 0) time += delta * settings.current.speed;
          const current = settings.current;
          params.set({
            field: [
              current.cellSize * dpr,
              time,
              Math.min(1, Math.max(0.2, current.dotSize)),
              current.splashRadius * dpr,
            ],
            color: [...parseColor(current.color, "#929292"), 1],
            hover: [
              pointer.x * dpr,
              pointer.y * dpr,
              pointer.inside && current.interactive ? 1 : 0,
              0,
            ],
            background: [...parseColor(current.backgroundColor, "#000000"), 1],
          });
          try {
            frame(gpu, (pass) => pass.pass(output, scene));
          } catch (error) {
            fail(error);
            return;
          }
          if (!presented) {
            presented = true;
            setReady(true);
          }
          frameId = requestAnimationFrame(render);
        };
        const resize = () => {
          const next = [
            Math.max(1, Math.round(canvas.clientWidth * dpr)),
            Math.max(1, Math.round(canvas.clientHeight * dpr)),
          ];
          if (next[0] !== output.size[0] || next[1] !== output.size[1]) output.resize(next);
          params.set({ resolution: [next[0], next[1], 1, 1] });
        };
        const observer = new ResizeObserver(resize);
        observer.observe(root);
        window.addEventListener("pointermove", onMove, { passive: true });
        resize();
        frameId = requestAnimationFrame(render);
        cleanup.run = () => {
          observer.disconnect();
          window.removeEventListener("pointermove", onMove);
          if (frameId) cancelAnimationFrame(frameId);
          gpu?.dispose?.();
        };
      } catch (error) {
        fail(error);
      }
    })();

    return () => {
      disposed = true;
      cleanup.run();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`shape-waves ${className}`}
      data-ready={ready}
      style={{ backgroundColor }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="shape-waves__canvas" />
      {text ? <span className="shape-waves__title">{text}</span> : null}
    </div>
  );
}
