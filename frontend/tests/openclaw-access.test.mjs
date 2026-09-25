import test from "node:test";
import assert from "node:assert/strict";
import { canUseOpenClaw } from "../openclaw-access.mjs";

test("OpenClaw navigation includes vice presidents and denies ordinary accounts", () => {
  for (const account of [
    { role: "president", position: "president" },
    { role: "president", position: "vice_president" },
    { role: "teacher" },
    { role: "admin" },
  ])
    assert.equal(canUseOpenClaw(account), true);
  for (const account of [null, undefined, {}, { role: "student" }, { role: "user" }])
    assert.equal(canUseOpenClaw(account), false);
});
