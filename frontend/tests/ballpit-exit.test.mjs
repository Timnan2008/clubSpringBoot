import test from "node:test";
import assert from "node:assert/strict";
import { releaseBalls, stepFallingBalls } from "../ballpit-exit.mjs";
const state = (positions, velocities, radii) => ({
  positions,
  velocities,
  radii,
  count: radii.length,
  maxX: 100,
  maxZ: 100,
});
test("release preserves each velocity direction and magnitude conversion", () => {
  const v = [0.1, 0.05, -0.1, -0.1, -0.03, 0.02];
  releaseBalls(v);
  assert.deepEqual(v, [6, 3, -6, -6, -1.7999999999999998, 1.2]);
});
test("all sphere sizes accelerate equally; upward and sideways momentum is retained", () => {
  const s = state([-5, 0, 0, 5, 0, 0], [1, 2, 0, -1, 0, 0], [0.5, 1]);
  stepFallingBalls(s, 1 / 60);
  assert.ok(Math.abs(2 - s.velocities[1] - (0 - s.velocities[4])) < 1e-10);
  assert.ok(s.positions[0] > -5 && s.positions[3] < 5);
  assert.ok(s.positions[1] > 0 && s.positions[4] < 0);
});
test("approaching balls exchange momentum without gaining kinetic energy", () => {
  const s = state([-0.49, 0, 0, 0.49, 0, 0], [1, 0, 0, -1, 0, 0], [0.5, 0.5]);
  stepFallingBalls(s, 0);
  assert.ok(s.velocities[0] < 0 && s.velocities[3] > 0);
  assert.ok(Math.abs(s.velocities[0] + s.velocities[3]) < 1e-10);
  assert.ok(s.velocities[0] ** 2 + s.velocities[3] ** 2 <= 2);
  assert.ok(s.positions[3] - s.positions[0] >= 1);
});
test("separating balls are not launched again; no floor stops the fall", () => {
  const s = state([-0.49, 0, 0, 0.49, 0, 0], [-1, 0, 0, 1, 0, 0], [0.5, 0.5]);
  stepFallingBalls(s, 0);
  assert.deepEqual(s.velocities, [-1, 0, 0, 1, 0, 0]);
  for (let i = 0; i < 180; i++) stepFallingBalls(s, 1 / 60);
  assert.ok(s.positions[1] < -8 && s.positions[4] < -8);
});
test("release order is spread across a short window and held balls remain still", () => {
  const velocities = new Float32Array(90);
  const delays = releaseBalls(velocities);
  assert.equal(new Set(delays).size, 30);
  assert.ok(Math.max(...delays) > 0.8 && Math.min(...delays) === 0);
  const s = state([-5, 0, 0, 5, 0, 0], [0, 0, 0, 0, 0, 0], [0.5, 0.5]);
  s.releaseDelays = new Float32Array([0, 0.5]);
  stepFallingBalls(s, 0.1);
  assert.ok(s.positions[1] < 0);
  assert.equal(s.positions[4], 0);
  for (let i = 0; i < 6; i++) stepFallingBalls(s, 0.1);
  assert.ok(s.positions[4] < 0 && s.positions[1] < s.positions[4]);
});
