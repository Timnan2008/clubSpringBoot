import assert from "node:assert/strict";
import test from "node:test";
import { dashboardCalendarData, dashboardCalendarRange } from "../desktop/useDashboardData.js";

test("dashboard calendar queries roll over at midnight in Shanghai and stay within 93 days", () => {
  assert.deepEqual(dashboardCalendarRange(Date.parse("2026-12-31T15:59:00Z")), {
    from: "2026-12-01",
    monthEnd: "2027-01-01",
    to: "2027-03-01",
  });
  assert.deepEqual(dashboardCalendarRange(Date.parse("2026-12-31T16:00:00Z")), {
    from: "2027-01-01",
    monthEnd: "2027-02-01",
    to: "2027-04-01",
  });
  for (let month = 0; month < 12; month++) {
    const { from, to } = dashboardCalendarRange(Date.UTC(2028, month, 15));
    const day = 24 * 60 * 60 * 1000;
    assert.ok((Date.parse(to) - Date.parse(from)) / day <= 93);
  }
});

test("dashboard separates real club activities and unfinished homework across month boundaries", () => {
  const now = Date.parse("2026-11-17T08:00:00Z");
  const entry = (id, kind, start, end, completed = false) => ({
    id,
    kind,
    title: id,
    start,
    end,
    completed,
  });
  const events = [
    entry("next-month", "club", "2026-12-01T00:00", "2026-12-01T01:00"),
    entry("forthcoming", "club", "2026-11-17T16:05", "2026-11-17T17:00"),
    entry("ongoing", "club", "2026-11-17T15:00", "2026-11-17T17:00"),
    entry("recently-ended", "club", "2026-11-17T15:00", "2026-11-17T16:00"),
    entry("old", "club", "2026-11-01T06:00", "2026-11-01T07:00"),
    entry("boundary", "club", "2026-10-31T23:00", "2026-11-01T00:00"),
    entry("cross-month", "club", "2026-10-31T23:00", "2026-11-01T02:00"),
    entry("homework", "homework", "2026-11-10T16:00", "2026-11-10T17:00"),
    entry("finished", "homework", "2026-11-18T16:30", "2026-11-18T17:00", true),
    entry("later-homework", "homework", "2026-12-01T08:00", "2026-12-01T09:00"),
    entry("memo", "memo", "2026-11-18T16:30", "2026-11-18T17:00"),
    entry("invalid", "club", "invalid", "2026-11-17T17:00"),
  ];
  const result = dashboardCalendarData(
    { events, timezone: "Asia/Shanghai" },
    dashboardCalendarRange(now),
    now,
  );
  const ids = (items) => items.map(({ id }) => id);
  assert.deepEqual(ids(result.monthEvents), [
    "cross-month",
    "old",
    "ongoing",
    "recently-ended",
    "forthcoming",
  ]);
  assert.deepEqual(ids(result.upcomingEvents), ["ongoing", "forthcoming", "next-month"]);
  assert.deepEqual(ids(result.recentEvents), [
    "ongoing",
    "forthcoming",
    "next-month",
    "recently-ended",
  ]);
  assert.deepEqual(ids(result.tasks), ["homework"]);
});
