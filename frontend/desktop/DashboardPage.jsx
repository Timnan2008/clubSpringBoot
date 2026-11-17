import React, { useEffect, useId, useRef, useState } from "react";
import {
  CalendarDots,
  CaretRight,
  CheckSquare,
  MapPin,
  Megaphone,
  Plus,
  Star,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import ClubJoin from "../ClubJoin";
import { postName } from "../person-names.mjs";
import "./dashboard.css";

const CALENDAR = "/page/calendar";
const CREATE_EVENT = "/page/club/workspace?tab=calendar&action=create-event";
const LOGIN = "/page/user/login";
const FALLBACK_IMAGE = "/other%20photo/WFL-crest.svg";
const ANNOUNCEMENT_READ_KEY = "club.desktop.announcements.read";
const SHANGHAI = "Asia/Shanghai";
const text = (en, zh, english) => (en ? english : zh);

export function WelcomeHeader({ account, en }) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: SHANGHAI,
    }).format(new Date()),
  );
  let greeting = text(en, "晚上好", "Good evening");
  if (hour < 12) greeting = text(en, "上午好", "Good morning");
  else if (hour < 18) greeting = text(en, "下午好", "Good afternoon");
  const name = postName(account?.data, en);

  return (
    <div className="desk-welcome">
      <h1 title={name ? `${greeting}${en ? ", " : "，"}${name}` : undefined}>
        {greeting}
        {name && (
          <span>
            {en ? ", " : "，"}
            {name}
          </span>
        )}
      </h1>
      <p>{text(en, "上海青浦世外高级中学 · 社团管理平台", "QPWFLHS · Club Management")}</p>
    </div>
  );
}

function MoreLink({ href, children }) {
  return (
    <a className="desk-dash-more" href={href}>
      {children} <CaretRight size={14} aria-hidden="true" />
    </a>
  );
}

function Panel({ title, icon: Icon, action, children, className = "" }) {
  const heading = useId();
  return (
    <section className={`desk-dash-panel ${className}`} aria-labelledby={heading}>
      <div className="desk-dash-panel-top">
        <h2 id={heading}>
          <Icon aria-hidden="true" size={22} weight={Icon === Star ? "fill" : "regular"} />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function LoadingRows({ en, count = 3 }) {
  return (
    <div className="desk-dash-loading" role="status" aria-label={text(en, "正在加载", "Loading")}>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function ListState({ en, resource, empty, guest, loadingCount }) {
  if (resource.status === "loading") return <LoadingRows en={en} count={loadingCount} />;
  if (resource.status === "error") {
    return (
      <div className="desk-dash-empty" role="alert">
        <span>{text(en, "暂时无法加载，请重试。", "Could not load. Try again.")}</span>
        <button type="button" className="desk-dash-link-button" onClick={resource.retry}>
          {text(en, "重试", "Retry")}
        </button>
      </div>
    );
  }
  if (resource.status === "guest") {
    return (
      <div className="desk-dash-empty">
        <span>{guest}</span>
        <a className="desk-dash-link-button" href={LOGIN}>
          {text(en, "登录", "Sign in")}
        </a>
      </div>
    );
  }
  if (resource.status === "forbidden") {
    return (
      <p className="desk-dash-empty" role="status">
        {text(en, "当前账号无法访问此内容。", "This content is unavailable for your account.")}
      </p>
    );
  }
  return <p className="desk-dash-empty">{empty}</p>;
}

function SummaryTile({ en, label, icon: Icon, unit, href, resource, count, description }) {
  const state = resource.status;
  const hint = {
    loading: text(en, "正在加载", "Loading"),
    guest: text(en, "登录后查看", "Sign in to view"),
    error: text(en, "加载失败", "Unable to load"),
  }[state];
  return (
    <a
      className="desk-summary-tile"
      href={href}
      title={description || hint}
      aria-busy={state === "loading"}
    >
      <span className="desk-summary-icon">
        <Icon size={24} aria-hidden="true" />
      </span>
      <span className="desk-summary-copy">
        <span className="desk-summary-label">{label}</span>
        <span className="desk-summary-count">
          {state === "ready" ? (
            <>
              <strong>{count}</strong>
              {unit}
            </>
          ) : (
            <small>{hint || "—"}</small>
          )}
        </span>
      </span>
      <CaretRight className="desk-summary-arrow" size={16} aria-hidden="true" />
    </a>
  );
}

function CreateActivity({ en, workspace }) {
  const label = text(en, "创建活动", "Create activity");
  const canCreate = workspace.status === "ready" && workspace.data?.clubs?.length > 0;
  const contents = (
    <>
      <Plus size={20} aria-hidden="true" />
      {label}
    </>
  );
  if (canCreate || workspace.status === "guest") {
    return (
      <a
        className="desk-dash-primary"
        href={canCreate ? CREATE_EVENT : LOGIN + "?next=" + encodeURIComponent(CREATE_EVENT)}
      >
        {contents}
      </a>
    );
  }
  const hint =
    {
      loading: text(en, "正在检查活动管理权限", "Checking activity access"),
      error: text(en, "暂时无法检查活动管理权限。", "Could not check activity access."),
    }[workspace.status] ||
    text(en, "仅有社团管理权限的账号可以创建活动。", "Club management access is required.");
  return (
    <div className="desk-create-note">
      {workspace.status === "error" ? (
        <button type="button" className="desk-dash-primary" onClick={workspace.retry} title={hint}>
          {text(en, "重查活动权限", "Recheck access")}
        </button>
      ) : (
        <button
          type="button"
          className="desk-dash-primary"
          disabled
          aria-busy={workspace.status === "loading"}
        >
          {contents}
        </button>
      )}
      <small>{hint}</small>
    </div>
  );
}

function SummaryCards({ en, memberships, calendar, workspace }) {
  return (
    <section className="desk-summary" aria-label={text(en, "工作台概览", "Workspace summary")}>
      <SummaryTile
        en={en}
        icon={UsersThree}
        label={text(en, "加入的社团", "My clubs")}
        unit={text(en, "个", "clubs")}
        count={memberships.data?.length}
        resource={memberships}
        href="/page/my-clubs"
      />
      <SummaryTile
        en={en}
        icon={CalendarDots}
        label={text(en, "本月活动", "This month's activities")}
        unit={text(en, "场", "activities")}
        count={calendar.data?.monthEvents.length}
        resource={calendar}
        href={CALENDAR}
      />
      <SummaryTile
        en={en}
        icon={CheckSquare}
        label={text(en, "待处理事项", "Pending tasks")}
        unit={text(en, "项", "tasks")}
        count={calendar.data?.tasks.length}
        description={text(
          en,
          "本月日历中未完成的作业",
          "Incomplete homework in this month's calendar",
        )}
        resource={calendar}
        href={CALENDAR}
      />
      <CreateActivity en={en} workspace={workspace} />
    </section>
  );
}

function shanghaiDate(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value)
    ? value + "+08:00"
    : value;
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date : null;
}

function dateText(date, en, options) {
  return new Intl.DateTimeFormat(en ? "en-GB" : "zh-CN", {
    timeZone: SHANGHAI,
    ...options,
  }).format(date);
}

function AnnouncementTime({ publishedAt, en }) {
  const published = shanghaiDate(publishedAt);
  if (!published) return <span>{text(en, "时间未提供", "Undated")}</span>;
  return (
    <time dateTime={published.toISOString()}>
      {dateText(published, en, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </time>
  );
}

export function AnnouncementList({ en, announcements, read, onSelect, onSeeAll }) {
  return (
    <Panel
      title={text(en, "公告", "Announcements")}
      icon={Megaphone}
      action={
        announcements.length > 0 && (
          <button type="button" className="desk-dash-more" onClick={onSeeAll}>
            {text(en, "更多", "View all")} <CaretRight size={14} aria-hidden="true" />
          </button>
        )
      }
    >
      {!announcements.length ? (
        <p className="desk-dash-empty">{text(en, "暂无公告。", "No announcements yet.")}</p>
      ) : (
        <ul className="desk-announcement-list">
          {announcements.slice(0, 3).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="desk-announcement-row"
                data-unread={!read.has(item.id)}
                onClick={() => onSelect(item)}
              >
                <span className="desk-announcement-dot" aria-hidden="true" />
                <span className="desk-dash-visually-hidden">
                  {read.has(item.id) ? text(en, "已读", "Read") : text(en, "未读", "Unread")}
                </span>
                <span className="desk-announcement-type">{item.type}</span>
                <span className="desk-announcement-title" title={item.title}>
                  {item.title}
                </span>
                <span className="desk-announcement-time">
                  <AnnouncementTime en={en} publishedAt={item.publishedAt} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ActivityStatus({ en, entry }) {
  const now = Date.now();
  const start = shanghaiDate(entry.start);
  const end = shanghaiDate(entry.end);
  if (!start || !end) return null;
  let status = "scheduled";
  if (+end <= now) status = "ended";
  else if (+start <= now) status = "live";
  else if (+start - now <= 86400000) status = "soon";

  const label = {
    scheduled: text(en, "未开始", "Scheduled"),
    ended: text(en, "已结束", "Ended"),
    live: text(en, "进行中", "In progress"),
    soon: text(en, "即将开始", "Starting soon"),
  }[status];
  return <span className={`desk-dash-status is-${status}`}>{label}</span>;
}

function ActivityTime({ en, entry, long = false }) {
  const start = shanghaiDate(entry.start);
  const end = shanghaiDate(entry.end);
  if (!start || !end) return null;
  const clock = (date) =>
    dateText(date, en, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const day = (date) => dateText(date, en, { month: "short", day: "numeric", weekday: "short" });
  const differentDays = day(start) !== day(end);
  return (
    <span className="desk-activity-time">
      <time dateTime={start.toISOString()}>{day(start)}</time>
      <span>
        {clock(start)} – {differentDays && `${day(end)} `}
        {clock(end)}
        {long && " (UTC+8)"}
      </span>
    </span>
  );
}

export function ActivityTimeline({ en, calendar, onSelect }) {
  const events = calendar.data?.recentEvents.slice(0, 3) || [];
  return (
    <Panel
      title={text(en, "近期活动", "Recent activities")}
      icon={CalendarDots}
      action={<MoreLink href={CALENDAR}>{text(en, "更多", "View calendar")}</MoreLink>}
    >
      {calendar.status !== "ready" || !events.length ? (
        <ListState
          en={en}
          resource={calendar}
          guest={text(en, "登录后查看已加入社团的活动。", "Sign in to see your clubs’ events.")}
          empty={text(en, "这个日历范围内暂无社团活动。", "No club events in this date range.")}
        />
      ) : (
        <ol className="desk-activity-list">
          {events.map((entry) => {
            const title =
              entry.clubName && !entry.title.startsWith(entry.clubName + " · ")
                ? `${entry.clubName} · ${entry.title}`
                : entry.title;
            return (
              <li key={entry.id}>
                <button type="button" className="desk-activity-row" onClick={() => onSelect(entry)}>
                  <span className="desk-activity-copy">
                    <ActivityTime en={en} entry={entry} />
                    <span className="desk-activity-title" title={title}>
                      {title}
                    </span>
                  </span>
                  <ActivityStatus en={en} entry={entry} />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

function imageUrl(value) {
  if (!value) return FALLBACK_IMAGE;
  try {
    const url = new URL(value, location.origin);
    return ["https:", "http:"].includes(url.protocol) ? url.href : FALLBACK_IMAGE;
  } catch {
    return FALLBACK_IMAGE;
  }
}

function ClubPreview({ club, en, account }) {
  const name = (en && club.clubNameEn) || club.clubName;
  const image = imageUrl(club.clubItem);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image]);
  return (
    <article className="desk-club-card">
      <a className="desk-club-preview" href={`/page/clubs/${club.id}`}>
        <img
          src={failed ? FALLBACK_IMAGE : image}
          alt=""
          width="64"
          height="64"
          decoding="async"
          onError={() => setFailed(true)}
        />
        <span className="desk-club-card-copy">
          <strong title={name}>{name}</strong>
          <span title={club.sortDescription}>
            {club.sortDescription || text(en, "暂无简介", "No description yet")}
          </span>
        </span>
      </a>
      <div className="desk-club-card-meta">
        <span className="desk-club-members">
          <UsersThree size={16} aria-hidden="true" />
          {text(en, "人数暂未公开", "Count unavailable")}
        </span>
        {account.status === "loading" ? (
          <button className="club-button" type="button" disabled aria-busy="true">
            {text(en, "加载中…", "Loading…")}
          </button>
        ) : account.status === "error" ? (
          <button className="club-button" type="button" onClick={account.retry}>
            {text(en, "重试", "Retry")}
          </button>
        ) : (
          <ClubJoin
            club={club}
            authenticated={account.status === "ready"}
            account={account.data}
            compact
          />
        )}
      </div>
    </article>
  );
}

export function RecommendedClubs({ en, clubs, account }) {
  const all = clubs.data || [];
  const recommended = [
    ...all.filter((club) => club.greatClub),
    ...all.filter((club) => !club.greatClub),
  ].slice(0, 4);
  return (
    <Panel
      className="desk-clubs-panel"
      title={text(en, "推荐社团", "Recommended clubs")}
      icon={Star}
      action={<MoreLink href="/page/search">{text(en, "浏览全部", "Browse all")}</MoreLink>}
    >
      {clubs.status !== "ready" || !recommended.length ? (
        <ListState
          en={en}
          resource={clubs}
          empty={text(en, "暂无推荐社团。", "No recommended clubs yet.")}
          loadingCount={4}
        />
      ) : (
        <div className="desk-club-cards">
          {recommended.map((club) => (
            <ClubPreview key={club.id} club={club} en={en} account={account} />
          ))}
        </div>
      )}
    </Panel>
  );
}

export function DetailDrawer({ en, title, children, onClose }) {
  const drawer = useRef(null);
  const heading = useId();
  useEffect(() => {
    const node = drawer.current;
    node.showModal();
    return () => node.close();
  }, []);
  const dismiss = () => {
    drawer.current?.close();
    onClose();
  };
  return (
    <dialog
      ref={drawer}
      className="desk-detail-drawer"
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="desk-detail-inner">
        <header>
          <h2 id={heading}>{title}</h2>
          <button
            type="button"
            autoFocus
            onClick={dismiss}
            aria-label={text(en, "关闭详情", "Close details")}
          >
            <X size={21} aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

function initialRead() {
  try {
    const ids = JSON.parse(localStorage.getItem(ANNOUNCEMENT_READ_KEY) || "[]");
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

export function AnnouncementDetails({ en, announcement, onClose }) {
  return (
    <DetailDrawer en={en} title={text(en, "公告详情", "Announcement")} onClose={onClose}>
      <article className="desk-drawer-article">
        <span className="desk-drawer-meta">
          <span>{announcement.type}</span>
          <AnnouncementTime en={en} publishedAt={announcement.publishedAt} />
        </span>
        <h3>{announcement.title}</h3>
        {announcement.body && announcement.body !== announcement.title && (
          <p>{announcement.body}</p>
        )}
        <small>{text(en, "已在此设备上标为已读", "Marked as read on this device")}</small>
      </article>
    </DetailDrawer>
  );
}

export function saveAnnouncementRead(id, read = initialRead()) {
  const next = new Set([...read, id]);
  try {
    localStorage.setItem(ANNOUNCEMENT_READ_KEY, JSON.stringify([...next]));
  } catch {
    // The current page can still show the read state when storage is unavailable.
  }
  return next;
}

export default function DashboardPage({
  en,
  account,
  calendar,
  clubs,
  memberships,
  workspace,
  announcements = [],
  selectedAnnouncement,
  onCloseAnnouncement,
}) {
  const [opened, setOpened] = useState(null);
  const [read, setRead] = useState(initialRead);
  const announcement = selectedAnnouncement || opened?.announcement;
  const activity = opened?.activity;

  useEffect(() => {
    if (!announcement || read.has(announcement.id)) return;
    setRead(saveAnnouncementRead(announcement.id, read));
  }, [announcement, read]);

  const closeDrawer = () => {
    setOpened(null);
    if (selectedAnnouncement) onCloseAnnouncement?.();
  };

  return (
    <div className="desk-dashboard">
      <SummaryCards en={en} memberships={memberships} calendar={calendar} workspace={workspace} />
      <div className="desk-dashboard-feed">
        <AnnouncementList
          en={en}
          announcements={announcements}
          read={read}
          onSelect={(item) => setOpened({ announcement: item })}
          onSeeAll={() => setOpened({ allAnnouncements: true })}
        />
        <ActivityTimeline
          en={en}
          calendar={calendar}
          onSelect={(entry) => setOpened({ activity: entry })}
        />
      </div>
      <RecommendedClubs en={en} clubs={clubs} account={account} />
      {announcement ? (
        <AnnouncementDetails en={en} announcement={announcement} onClose={closeDrawer} />
      ) : activity ? (
        <DetailDrawer
          en={en}
          title={text(en, "活动详情", "Activity details")}
          onClose={closeDrawer}
        >
          <article className="desk-drawer-article">
            <span className="desk-drawer-meta">
              <span>{activity.clubName}</span>
              <ActivityStatus en={en} entry={activity} />
            </span>
            <h3>{activity.title}</h3>
            <ActivityTime en={en} entry={activity} long />
            {activity.location && (
              <p className="desk-drawer-location">
                <MapPin size={17} aria-hidden="true" /> {activity.location}
              </p>
            )}
            {activity.description && <p>{activity.description}</p>}
            <MoreLink href={CALENDAR}>{text(en, "打开活动日程", "Open calendar")}</MoreLink>
          </article>
        </DetailDrawer>
      ) : opened?.allAnnouncements ? (
        <DetailDrawer
          en={en}
          title={text(en, "全部公告", "All announcements")}
          onClose={closeDrawer}
        >
          <ul className="desk-drawer-notices">
            {announcements.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => setOpened({ announcement: item })}>
                  <strong>{item.title}</strong>
                  <small>
                    {item.type} · <AnnouncementTime en={en} publishedAt={item.publishedAt} />
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </DetailDrawer>
      ) : null}
    </div>
  );
}
