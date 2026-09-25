// Welcome physics stores velocity per 60 Hz tick. Keep every sphere's momentum
// when opening the floor; a slower simulation clock gives the exit time to read.
export function releaseBalls(velocities) {
  for (let i = 0; i < velocities.length; i++) velocities[i] *= 60;
  const count = velocities.length / 3;
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const delays = new Float32Array(count);
  order.forEach((index, rank) => {
    delays[index] = (rank / Math.max(1, count - 1)) * 0.85;
  });
  return delays;
}

export function stepFallingBalls(
  { positions: p, velocities: v, radii, count, maxX, maxZ, releaseDelays },
  delta,
) {
  for (let i = 0; i < count; i++) {
    const k = i * 3;
    const waiting = Math.max(0, releaseDelays?.[i] ?? 0);
    if (releaseDelays) releaseDelays[i] = Math.max(0, waiting - delta);
    const dt = Math.max(0, delta - waiting) * 0.26;
    v[k + 1] -= 45 * dt;
    for (let axis = 0; axis < 3; axis++) p[k + axis] += v[k + axis] * dt;
  }
  // Resolve contacts in 3D. Mass follows sphere volume; only approaching balls
  // exchange impulses, so existing overlaps never cause an artificial launch.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < count; i++) {
      const a = i * 3;
      for (let j = i + 1; j < count; j++) {
        const b = j * 3;
        const heldA = (releaseDelays?.[i] ?? 0) > 0,
          heldB = (releaseDelays?.[j] ?? 0) > 0;
        if (heldA && heldB) continue;
        let nx = p[b] - p[a],
          ny = p[b + 1] - p[a + 1],
          nz = p[b + 2] - p[a + 2];
        const distance = Math.hypot(nx, ny, nz);
        const overlap = radii[i] + radii[j] - distance;
        if (overlap <= 0) continue;
        if (distance < 1e-8) {
          nx = 1;
          ny = 0;
          nz = 0;
        } else {
          nx /= distance;
          ny /= distance;
          nz /= distance;
        }
        const invA = heldA ? 0 : 1 / Math.pow(radii[i], 3),
          invB = heldB ? 0 : 1 / Math.pow(radii[j], 3);
        const sum = invA + invB;
        const correction = overlap / sum;
        p[a] -= nx * correction * invA;
        p[a + 1] -= ny * correction * invA;
        p[a + 2] -= nz * correction * invA;
        p[b] += nx * correction * invB;
        p[b + 1] += ny * correction * invB;
        p[b + 2] += nz * correction * invB;
        const approach =
          ((heldB ? 0 : v[b]) - (heldA ? 0 : v[a])) * nx +
          ((heldB ? 0 : v[b + 1]) - (heldA ? 0 : v[a + 1])) * ny +
          ((heldB ? 0 : v[b + 2]) - (heldA ? 0 : v[a + 2])) * nz;
        if (approach >= 0) continue;
        const impulse = (-1.45 * approach) / sum;
        v[a] -= nx * impulse * invA;
        v[a + 1] -= ny * impulse * invA;
        v[a + 2] -= nz * impulse * invA;
        v[b] += nx * impulse * invB;
        v[b + 1] += ny * impulse * invB;
        v[b + 2] += nz * impulse * invB;
      }
    }
    for (let i = 0; i < count; i++) {
      if ((releaseDelays?.[i] ?? 0) > 0) continue;
      const k = i * 3;
      for (const axis of [0, 2]) {
        const limit = Math.max(0, (axis === 0 ? maxX : maxZ) - radii[i]);
        if (Math.abs(p[k + axis]) > limit) {
          const side = Math.sign(p[k + axis]);
          p[k + axis] = side * limit;
          if (v[k + axis] * side > 0) v[k + axis] *= -0.45;
        }
      }
    }
  }
}
