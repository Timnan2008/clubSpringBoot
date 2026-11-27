import { useCallback, useEffect, useMemo, useState } from "react";
import { localizeCalendar } from "../activity-language.mjs";

const calendarPath = "/api/campus-social/calendar";
const day = 24 * 60 * 60 * 1000;
const shanghaiDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function dashboardCalendarRange(now) {
  const [year, month] = shanghaiDate.format(now).split("-").map(Number);
  const first = (offset) =>
    new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
  return { from: first(0), monthEnd: first(1), to: first(3) };
}

// The calendar API uses Shanghai wall time for LocalDateTime fields.
const stamp = (value) => Date.parse(value + "+08:00");

export function dashboardCalendarData(calendar, range, now) {
  const monthStart = stamp(range.from + "T00:00");
  const monthEnd = stamp(range.monthEnd + "T00:00");
  const timed = calendar.events
    .map((event) => ({ event, start: stamp(event.start), end: stamp(event.end) }))
    .filter(({ start, end }) => end > start)
    .sort((a, b) => a.start - b.start);
  const clubEvents = timed.filter(({ event }) => event.kind === "club");
  const fallsInMonth = ({ start, end }) => start < monthEnd && end > monthStart;
  const event = (entry) => entry.event;
  const upcomingEvents = clubEvents.filter(({ end }) => end > now).map(event);
  const recentlyEnded = clubEvents
    .filter(({ end }) => end <= now && end >= now - 7 * day)
    .sort((a, b) => b.end - a.end)
    .map(event);
  return {
    ...calendar,
    monthEvents: clubEvents.filter(fallsInMonth).map(event),
    upcomingEvents,
    recentEvents: [...upcomingEvents, ...recentlyEnded],
    tasks: timed
      .filter(({ event }) => event.kind === "homework" && !event.completed)
      .filter(fallsInMonth)
      .map(event),
  };
}

function accountFrom(body) {
  if (!body?.account?.id) throw Error();
  return { ...body.account, offices: body.offices };
}

function catalogFrom(body) {
  if (body?.code !== 200 || !Array.isArray(body.data)) throw Error();
  return body.data;
}

function arrayFrom(body) {
  if (!Array.isArray(body)) throw Error();
  return body;
}

function inboxUnread(body) {
  return arrayFrom(body).reduce((total, item) => {
    const count = item?.unread;
    return total + (Number.isSafeInteger(count) && count > 0 ? count : 0);
  }, 0);
}

function calendarFrom(body) {
  arrayFrom(body?.events);
  arrayFrom(body?.clubs);
  return body;
}

function workspaceFrom(body) {
  arrayFrom(body?.clubs);
  return body;
}

function useResource(path, select, inactiveStatus = "idle") {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!path) {
      setResult(null);
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    const finish = (status, data = null, error = "") => {
      if (!signal.aborted) setResult({ path, attempt, status, data, error });
    };

    async function load() {
      try {
        const response = await fetch(path, {
          signal,
          credentials: "same-origin",
          cache: "no-store",
        });
        if (response.status === 401) return finish("guest");
        if (response.status === 403) return finish("forbidden");
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          return finish("error", null, typeof body?.message === "string" ? body.message : "");
        }
        finish("ready", select(await response.json()));
      } catch {
        if (!signal.aborted) finish("error");
      }
    }

    load();
    return () => controller.abort();
  }, [path, attempt, select]);

  if (path && result?.path === path && result.attempt === attempt) {
    return { status: result.status, data: result.data, error: result.error, retry };
  }
  return { status: path ? "loading" : inactiveStatus, data: null, error: "", retry };
}

export function useDashboardData(active = true, english = false) {
  const account = useResource("/api/campus-social/me", accountFrom);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const onVisible = () => {
      if (!document.hidden) update();
    };
    update();
    const timer = window.setInterval(onVisible, 60000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", update);
    };
  }, []);

  const signedIn = account.status === "ready";
  const gatedStatus = active ? account.status : "idle";
  const canManage =
    active &&
    signedIn &&
    (["president", "teacher", "admin"].includes(account.data.role) || account.data.offices?.length);
  const range = dashboardCalendarRange(now);
  const dateQuery = new URLSearchParams({ from: range.from, to: range.to });
  const clubs = useResource(active ? "/api/club/all" : null, catalogFrom);
  const memberships = useResource(
    active && signedIn ? "/api/campus-social/me/clubs" : null,
    arrayFrom,
    gatedStatus,
  );
  const calendar = useResource(
    signedIn ? calendarPath + "?" + dateQuery : null,
    calendarFrom,
    gatedStatus,
  );
  const inbox = useResource(
    signedIn ? "/api/campus-social/inbox" : null,
    inboxUnread,
    account.status,
  );
  const refreshInbox = inbox.retry;
  useEffect(() => {
    if (!signedIn) return;
    const refresh = () => {
      if (!document.hidden) refreshInbox();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("campus-notifications-changed", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("campus-notifications-changed", refresh);
    };
  }, [refreshInbox, signedIn]);
  const workspace = useResource(
    canManage ? "/api/club-workspace" : null,
    workspaceFrom,
    signedIn ? "forbidden" : gatedStatus,
  );
  const localized = useMemo(
    () => (calendar.data && english ? localizeCalendar(calendar.data, true) : calendar.data),
    [calendar.data, english],
  );

  // Retrying an authentication failure must retry the account request that gates these resources.
  const gated = (resource) =>
    gatedStatus === "error"
      ? { ...resource, error: account.error, retry: account.retry }
      : resource;

  return {
    account,
    memberships: gated(memberships),
    inbox,
    clubs,
    calendar: gated({
      ...calendar,
      data: localized && dashboardCalendarData(localized, range, now),
    }),
    workspace: gated(workspace),
  };
}

export default useDashboardData;
