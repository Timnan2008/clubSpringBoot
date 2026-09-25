import React, { useEffect, useState, useRef } from "react";
import { Bell } from "@phosphor-icons/react";
import Avatar from "./Avatar";
import { postName } from "./person-names.mjs";
import { tx, en, tr } from "./language";
import "./SocialAdditions.css";
function approvalAction(tool) {
  switch (tool) {
    case "update_club_profile":
      return tx("修改社团资料", "change a club profile");
    case "write_document":
      return tx("保存文档", "save a document");
    case "add_personal_event":
      return tx("添加个人日程", "add a personal event");
    case "add_club_event":
      return tx("添加社团活动", "add a club event");
    case "publish_post":
      return tx("发布校园帖", "publish a post");
    case "review_join_request":
      return tx("处理入社申请", "review a join request");
    case "remember":
      return tx("记住一件事", "remember something");
    case "forget":
      return tx("忘掉一件事", "forget something");
    case "give_file":
      return tx("准备一个文件", "prepare a file");
    default:
      return tx("一项修改", "a change");
  }
}
function noticeText(item) {
  switch (item.type) {
    case "mention":
      return tx("提及了你", "mentioned you");
    case "reply":
      return tx("回复了你的帖子", "replied to your post");
    case "message":
      return tx("发来一条私信", "sent you a message");
    case "join_request":
      return tx("提交了入社申请", "applied to join") + (item.clubName ? " · " + item.clubName : "");
    case "join_approved":
      return tx("你的入社申请已通过", "Your club application was approved");
    case "join_declined":
      return tx("你的入社申请未通过", "Your club application was declined");
    case "openclaw_approval":
      return (
        tx("助手正在等你批准：", "The assistant is waiting for you to approve: ") +
        approvalAction(item.clubName)
      );
    default:
      return item.type;
  }
}
function noticeTitle(item) {
  if (item.type === "openclaw_approval") return "Agent Ollie";
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
