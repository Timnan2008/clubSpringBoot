import React, { useEffect, useRef, useState } from "react";
import {
  House,
  Compass,
  Stack,
  CalendarBlank,
  ChatCircleDots,
  GearSix,
  ArrowUpRight,
  CaretRight,
  Users,
  MagnifyingGlass,
  Bell,
  ArrowClockwise,
  X,
  SignIn,
  Plus,
  WifiSlash,
  Sparkle,
  Megaphone,
  Star,
  CheckCircle,
  Buildings,
  ShieldCheck,
} from "@phosphor-icons/react";
import { bridge, categories, imageURL, eventStatus } from "./data";
export const icons = {
  home: House,
  discover: Compass,
  mine: Stack,
  calendar: CalendarBlank,
  messages: ChatCircleDots,
  settings: GearSix,
};
export const labels = {
  home: "首页",
  discover: "发现社团",
  mine: "我的社团",
  calendar: "活动日程",
  messages: "消息",
  settings: "设置",
};
export function Action({
  children,
  onClick,
  secondary = false,
  disabled = false,
  className = "",
  ...rest
}) {
  return (
    <button
      className={`${secondary ? "button secondary" : "button"} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
export function Sidebar({ page, navigate, data }) {
  return (
    <aside className="sidebar">
      <div className="school-brand">
        <img src="../assets/crest.svg" alt="学校校徽" />
        <div>
          <strong>青浦世外</strong>
          <small>QPWFL · CLUBS</small>
        </div>
      </div>
      <div className="sidebar-label">校园工作台</div>
      <nav>
        {Object.entries(labels).map(([key, label]) => {
          const Icon = icons[key];
          const count = key === "mine" ? data.mine.length : key === "messages" ? data.unread : 0;
          return (
            <button
              key={key}
              className={`nav-item ${page === key ? "selected" : ""}`}
              onClick={() => navigate(key)}
              aria-current={page === key ? "page" : undefined}
              title={label}
            >
              <Icon size={22} weight={page === key ? "fill" : "regular"} />
              <span>{label}</span>
              {count > 0 && <b className="badge">{count}</b>}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="term">
          <span className="live-dot" />
          校园生活，保持连接<small>SHANGHAI QINGPU WFLHS</small>
        </div>
        <button
          className="sidebar-user"
          onClick={() => (data.user ? navigate("settings") : bridge.openPage("/page/user/login"))}
        >
          <span className="avatar">{(data.user?.name || "访").slice(0, 1)}</span>
          <span>
            <strong>{data.user?.name || "访客浏览"}</strong>
            <small>{data.user ? "校园账号已连接" : "登录，开启你的校园日常"}</small>
          </span>
          <CaretRight size={14} />
        </button>
      </div>
    </aside>
  );
}
export function WorkspaceHeader({ data, onSearch, navigate, onAction }) {
  return (
    <header className="workspace-header">
      <div className="breadcrumb">
        校园工作台<span>/</span>
        <b>青浦世外</b>
      </div>
      <button className="search-trigger" onClick={onSearch}>
        <MagnifyingGlass size={18} />
        <span>搜索社团、日程或公告</span>
        <kbd>⌘ K</kbd>
      </button>
      <button
        className="icon-button"
        aria-label="刷新数据"
        title="刷新数据"
        disabled={data.loading}
        onClick={data.refresh}
      >
        <ArrowClockwise size={20} className={data.loading ? "spin" : ""} />
      </button>
      <button
        className="icon-button notification-trigger"
        aria-label="查看通知"
        onClick={() => {
          navigate("messages");
        }}
      >
        <Bell size={21} />
        {data.unread > 0 && <i />}
      </button>
      <button
        className="account-trigger"
        aria-label={data.user ? "打开个人资料" : "登录"}
        onClick={() => onAction(data.user ? "/page/user/profile" : "/page/user/login")}
      >
        <span className="avatar small">{(data.user?.name || "访").slice(0, 1)}</span>
        <span>{data.user?.name || "登录"}</span>
      </button>
    </header>
  );
}
export function Panel({ title, icon: Icon, action, onAction, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <h2>
          <Icon size={21} />
          {title}
        </h2>
        {action && (
          <button className="text-button" onClick={onAction}>
            {action}
            <CaretRight size={14} />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
export function Empty({ title, detail, icon: Icon = Sparkle, action, onAction }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={27} />
      </span>
      <strong>{title}</strong>
      {detail && <p>{detail}</p>}
      {action && (
        <button className="text-button accent" onClick={onAction}>
          {action}
          <ArrowUpRight size={14} />
        </button>
      )}
    </div>
  );
}
export function ClubCard({ club, base, onOpen }) {
  const [failed, setFailed] = useState(false);
  const source = imageURL(club.clubItem, base);
  return (
    <button className="club-card" onClick={() => onOpen(club)}>
      <div className="club-cover">
        {source && !failed ? (
          <img src={source} alt="" onError={() => setFailed(true)} />
        ) : (
          <Buildings size={40} weight="duotone" />
        )}
        <span className="cover-shade" />
        <span className="category-chip">{categories[club.clubClass] || "校园社团"}</span>
        {club.greatClub && (
          <span className="featured-star" title="优秀社团">
            <Star size={15} weight="fill" />
          </span>
        )}
      </div>
      <div className="club-card-body">
        <h3>{club.clubName || club.name}</h3>
        <p>{club.sortDescription || club.slogan || "在这里，找到与你同频的伙伴。"}</p>
        <div className="club-card-footer">
          <span>探索社团</span>
          <span className="arrow-square">
            <ArrowUpRight size={17} />
          </span>
        </div>
      </div>
    </button>
  );
}
export function AnnouncementList({ items, onOpen, loading }) {
  if (loading && !items.length)
    return (
      <div className="skeleton-lines">
        <i />
        <i />
        <i />
      </div>
    );
  if (!items.length)
    return (
      <Empty
        title="暂无可读取的公告"
        detail="可在校园服务中查看原站公告"
        action="打开公告页"
        onAction={() => bridge.openPage("/page/index")}
      />
    );
  return (
    <div className="announcement-list">
      {items.slice(0, 3).map((item, i) => (
        <button
          key={item.id}
          onClick={() => onOpen(item)}
          className={i === 0 ? "announcement featured-notice" : "announcement"}
        >
          <span className={`notice-dot dot-${i}`} />
          <div>
            <small>{i === 0 ? "校园公告" : "平台消息"}</small>
            <p>{item.title}</p>
          </div>
          <ArrowUpRight size={16} />
        </button>
      ))}
    </div>
  );
}
export function Timeline({ events, limit = 3, onOpen, user }) {
  if (!user)
    return (
      <Empty
        icon={CalendarBlank}
        title="你的日程，等你开启"
        detail="登录后同步本月社团活动与个人日历"
        action="登录校园账号"
        onAction={() => bridge.openPage("/page/user/login")}
      />
    );
  if (!events.length)
    return (
      <Empty
        icon={CalendarBlank}
        title="本月暂无日程"
        detail="已发布的社团活动和个人安排会出现在这里"
        action="管理我的日历"
        onAction={() => bridge.openPage("/page/calendar")}
      />
    );
  return (
    <div className="timeline">
      {events.slice(0, limit).map((event) => (
        <button key={event.id} className="timeline-row" onClick={() => onOpen(event)}>
          <span className="timeline-dot" />
          <div>
            <strong>
              {event.start?.slice(5, 10).replace("-", "月")}日{" "}
              <small>
                {event.start?.slice(11, 16)} — {event.end?.slice(11, 16)}
              </small>
            </strong>
            <p>
              {event.clubName ? `${event.clubName} · ` : ""}
              {event.title}
            </p>
          </div>
          <span className={`status ${eventStatus(event) === "进行中" ? "green" : ""}`}>
            {eventStatus(event)}
          </span>
        </button>
      ))}
    </div>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const node = ref.current;
    node.showModal();
    return () => node.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="关闭" onClick={onClose}>
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function StatusFooter({ data }) {
  return (
    <footer className="status-footer">
      <span>
        <i className={`live-dot ${!data.connected ? "offline" : ""}`} />
        {data.loading ? "正在同步校园数据" : data.connected ? "校园服务已连接" : "连接暂不可用"}
      </span>
      <span>
        {data.info.server === "local" ? "本机开发服务" : "QPWFL CAMPUS"}
        <i />
        {data.lastSync
          ? `同步于 ${data.lastSync.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
          : "等待同步"}
      </span>
    </footer>
  );
}
