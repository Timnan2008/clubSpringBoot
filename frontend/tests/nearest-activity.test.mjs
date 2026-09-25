import { test } from "node:test";
import assert from "node:assert/strict";
import { nearestActivity } from "../nearest-activity.mjs";
const now = Date.parse("2026-09-23T12:00:00+08:00");
test("selects closest event, preserving input order and school timezone", () => {
  const events = [
    { id: 1, start: "2026-09-22T12:00" },
    { id: 2, start: "2026-09-23T12:40" },
    { id: 3, start: "2026-12-08T12:00" },
  ];
  assert.equal(nearestActivity(events, now).id, 2);
  assert.equal(events[0].id, 1);
  assert.equal(nearestActivity([], now), undefined);
});
test("prefers ongoing events, then upcoming on equal distance", () => {
  assert.equal(
    nearestActivity(
      [
        { id: 1, start: "2026-09-23T11:00", end: "2026-09-23T12:40" },
        { id: 2, start: "2026-09-23T12:01" },
      ],
      now,
    ).id,
    1,
  );
  assert.equal(
    nearestActivity(
      [
        { id: 1, start: "2026-09-23T11:00" },
        { id: 2, start: "2026-09-23T13:00" },
      ],
      now,
    ).id,
    2,
  );
});
