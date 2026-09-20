import React, { useEffect, useState, useRef } from "react";
import { Bell } from "@phosphor-icons/react";
import Avatar from "./Avatar";
import { postName } from "./person-names.mjs";
import { tx, en, tr } from "./language";
import "./SocialAdditions.css";
function noticeText(item) {
  switch (item.type) {
    case "mention":
      return tx("提及了你", "mentioned you");
    case "reply":
      return tx("回复了你的帖子", "replied to your post");
    case "message":
      return tx("发来一条私信", "sent you a message");
    case "join_request":
      return (
        tx("提交了入社申请", "applied to join") + (item.clubName ? " · " + item.clubName : "")
      );
    case "join_approved":
      return tx("你的入社申请已通过", "Your club application was approved");
    case "join_declined":
      return tx("你的入社申请未通过", "Your club application was declined");
    default:
      return item.type;
  }
}
function noticeTitle(item) {
  if (item.type === "join_approved" || item.type === "join_declined") {
    return item.clubName || tx("社团", "Club");
  }
  return item.actor ? postName(item.actor, en) : tx("匿名同学", "Anonymous student");
}
export default function Notifications({ enabled }) {
  const [data, setData] = useState({ items: [], unread: 0 }),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const root = useRef(null),
    request = useRef(0);
  async function refresh() {
    const n = ++request.current;
    try {
      const r = await fetch("/api/campus-social/notifications");
      if (!r.ok) return;
      const next = await r.json();
      if (n === request.current) setData(next);
    } catch {}
  }
  useEffect(() => {
    if (!enabled) return;
    refresh();
    const tick = () => {
        if (!document.hidden) refresh();
      },
      timer = setInterval(tick, 10000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("campus-notifications-changed", tick);
    return () => {
      request.current++;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("campus-notifications-changed", tick);
    };
  }, [enabled]);
  useEffect(() => {
    if (!open) return;
    refresh();
    const outside = (e) => {
        if (!root.current?.contains(e.target)) setOpen(false);
      },
      key = (e) => {
        if (e.key === "Escape") {
          setOpen(false);
          root.current?.querySelector("button")?.focus();
        }
      };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  async function mark(item) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/campus-social/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Workspace-Token": data.token },
        body: JSON.stringify(item ? { id: item.id } : { all: true }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw Error(tr(d.message || tx("操作失败", "Could not update notifications")));
      }
      await refresh();
      if (item) location.assign(item.url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!enabled) return null;
  return (
    <div className="campus-notifications" ref={root}>
      <button
        className="notification-toggle"
        type="button"
        aria-label={
          tx("站内消息", "Notifications") +
          (data.unread ? tx("，有未读消息", ", unread notifications") : "")
        }
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={22} />
        {data.unread > 0 && <span className="notification-dot" />}
      </button>
      {open && (
        <section className="notification-panel" aria-label={tx("站内消息", "Notifications")}>
          <header>
            <strong>{tx("站内消息", "Notifications")}</strong>
            <button type="button" disabled={!data.unread || busy} onClick={() => mark()}>
              {tx("全部已读", "Mark all read")}
            </button>
          </header>
          {error && <p role="alert">{error}</p>}
          <div className="notification-items">
            {data.items.length ? (
              data.items.map((item) => (
                <button
                  className={"notification-item" + (item.unread ? " unread" : "")}
                  disabled={busy}
                  key={item.id}
                  onClick={() => (item.unread ? mark(item) : location.assign(item.url))}
                >
                  {item.actor ? (
                    <Avatar person={item.actor} />
                  ) : (
                    <span className="notification-anonymous">@</span>
                  )}
                  <span>
                    <b>{noticeTitle(item)}</b>
                    <span>{noticeText(item)}</span>
                    <time>{item.createdAt?.slice(0, 16).replace("T", " ")}</time>
                  </span>
                  {item.unread && <i />}
                </button>
              ))
            ) : (
              <p className="notification-empty">{tx("暂时没有新消息", "No notifications yet")}</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
