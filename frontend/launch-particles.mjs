// Seeded so that any moment of the Agent Ollie build can be redrawn exactly when seeking.
const HUES = [258, 268, 290, 222, 320];

export function createParticles(count = 900, seed = 11) {
  let state = seed;
  const rand = () => ((state = (state * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: count }, () => ({
    angle: rand() * Math.PI * 2,
    from: 420 + rand() * 1100,
    to: 18 + rand() * 70,
    spin: 1.1 + rand() * 1.8,
    size: 0.8 + rand() * 2.4,
    hue: HUES[Math.floor(rand() * HUES.length)],
    delay: rand() * 0.4,
  }));
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeIn = (v) => v * v * v;

function position(p, e, cx, cy) {
  const radius = p.from + (p.to - p.from) * e;
  const angle = p.angle + p.spin * e * Math.PI;
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius * 0.58];
}

/** Draws the swarm at `progress` (0 scattered → 1 collapsed into the orb) with motion trails. */
export function drawParticles(ctx, particles, progress, width, height, cx, cy) {
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (const p of particles) {
    const local = clamp01((progress - p.delay) / (1 - p.delay));
    if (local <= 0) continue;
    const e = easeIn(local);
    const [x, y] = position(p, e, cx, cy);
    const [tx, ty] = position(p, easeIn(Math.max(0, local - 0.05)), cx, cy);
    const alpha = Math.min(1, local * 4) * (0.3 + 0.7 * e);
    ctx.strokeStyle = `hsla(${p.hue}, 95%, ${62 + 22 * e}%, ${alpha})`;
    ctx.lineWidth = p.size * (1 + e * 0.5);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(x + 0.01, y);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
}
