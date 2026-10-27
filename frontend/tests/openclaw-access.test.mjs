import test from "node:test";
import assert from "node:assert/strict";
import { canUseOpenClaw } from "../openclaw-access.mjs";

test("OpenClaw navigation is available only to administrators", () => {
  assert.equal(canUseOpenClaw({ role: "admin" }), true);
  for (const account of [
    { role: "president", position: "president" },
    { role: "president", position: "vice_president" },
    { role: "teacher" },
    null,
    undefined,
    {},
    { role: "student" },
    { role: "user" },
  ])
    assert.equal(canUseOpenClaw(account), false);
});
