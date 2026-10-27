import test from "node:test";
import assert from "node:assert/strict";
import { waitForStreamStep } from "../stream-deadline.mjs";
test("stalled reads abort and reject instead of leaving thinking active", async () => {
  const controller = new AbortController();
  await assert.rejects(
    waitForStreamStep(new Promise(() => {}), {
      signal: controller.signal,
      timeoutMs: 20,
      onTimeout: (e) => controller.abort(e),
    }),
    /stream-timeout/,
  );
  assert.equal(controller.signal.aborted, true);
});
test("approval wait cancels on stop without sending a decision", async () => {
  const controller = new AbortController();
  const waiting = waitForStreamStep(new Promise(() => {}), {
    signal: controller.signal,
    timeoutMs: 1000,
  });
  controller.abort();
  await assert.rejects(waiting, { name: "AbortError" });
});
test("completed step clears its timeout", async () => {
  let aborted = false;
  assert.equal(
    await waitForStreamStep(Promise.resolve("done"), {
      timeoutMs: 10,
      onTimeout: () => (aborted = true),
    }),
    "done",
  );
  await new Promise((r) => setTimeout(r, 25));
  assert.equal(aborted, false);
});
