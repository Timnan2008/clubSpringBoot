import { useCallback, useEffect, useRef, useState } from "react";
export const bridge = window.clubDesktop;
export const categories = {
  study: "学术探索",
  creativity: "艺术创意",
  activity: "运动活力",
  service: "公益服务",
};
export function calendarRange() {
  const now = new Date();
  const shanghai = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const from = shanghai.slice(0, 7) + "-01";
  const end = new Date(from + "T12:00:00Z");
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { from, to: end.toISOString().slice(0, 10) };
}
export function useCampus() {
  const [state, setState] = useState({
    loading: true,
    clubs: [],
    notices: [],
    mine: [],
    events: [],
    inbox: [],
    notifications: [],
    unread: 0,
    user: null,
    connected: false,
    info: {},
  });
  const seq = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true }));
    try {
      if (!bridge) throw Error("请通过 Electron 打开客户端");
      const [info, clubs, notices, me] = await Promise.all([
        bridge.info(),
        bridge.read("clubs"),
        bridge.read("announcements"),
        bridge.read("me"),
      ]);
      let mine, events, inbox, notifications;
      if (me.ok)
        [mine, events, inbox, notifications] = await Promise.all([
          bridge.read("mine"),
          bridge.read("calendar", calendarRange()),
          bridge.read("inbox"),
          bridge.read("notifications"),
        ]);
      if (id !== seq.current) return;
      setState({
        loading: false,
        info,
        clubs: clubs.ok && Array.isArray(clubs.data) ? clubs.data : [],
        notices: notices.ok ? notices.data : [],
        user: me.ok ? me.data.account : null,
        mine: mine?.ok ? mine.data : [],
        events: events?.ok ? events.data.events : [],
        inbox: inbox?.ok ? inbox.data : [],
        notifications: notifications?.ok ? notifications.data.items : [],
        unread: notifications?.ok ? Number(notifications.data.unread || 0) : 0,
        connected: clubs.ok,
        error: clubs.ok ? "" : clubs.message,
        privateError: me.ok
          ? [mine, events, inbox, notifications].find((r) => r && !r.ok)?.message
          : !me.auth
            ? me.message
            : "",
        lastSync: new Date(),
      });
    } catch (e) {
      if (id === seq.current)
        setState((s) => ({ ...s, loading: false, connected: false, error: e.message }));
    }
  }, []);
  useEffect(() => {
    refresh();
    let timer;
    const unsubscribe = bridge?.onSessionChanged(() => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 800);
    });
    const interval = setInterval(refresh, 60000);
    return () => {
      ++seq.current;
      unsubscribe?.();
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [refresh]);
  return { ...state, refresh };
}
export function imageURL(path, base) {
  try {
    const u = new URL(path, base);
    return u.origin === base && !/\.svg$/i.test(u.pathname) ? u.href : "";
  } catch {
    return "";
  }
}
export const eventStatus = (e) => {
  const start = Date.parse(e.start + (/[Z+]/.test(e.start) ? "" : "+08:00"));
  const end = Date.parse(e.end + (/[Z+]/.test(e.end) ? "" : "+08:00"));
  return end < Date.now()
    ? "已结束"
    : start < Date.now()
      ? "进行中"
      : start - Date.now() < 86400000
        ? "即将开始"
        : "未开始";
};
