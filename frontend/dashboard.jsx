import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./dashboard.css";

const FALLBACK_IMAGE = "/other%20photo/WFL-crest.svg";
const GREETING = ["早上好", "上午好", "下午好", "晚上好"];
const ROLE_LABEL = {
  student: "学生",
  president: "社长",
  vice_president: "副社长",
  teacher: "教师",
  admin: "管理员",
};

const NOTICE_META = {
  mention: { label: "提及", tone: "info" },
  reply: { label: "回复", tone: "info" },
  message: { label: "私信", tone: "brand" },
  join_request: { label: "审批", tone: "warning" },
  join_approved: { label: "已通过", tone: "success" },
  join_declined: { label: "未通过", tone: "danger" },
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function ymd(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
  const date = parseDate(value);
  if (!date) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  return sameDay
    ? `今天 ${pad(date.getHours())}:${pad(date.getMinutes())}`
    : `${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateBlock(value) {
  const date = parseDate(value);
  if (!date) return { day: "--", month: "--", week: "" };
  return {
    day: pad(date.getDate()),
    month: `${date.getMonth() + 1}月`,
    week: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()],
  };
}

function formatTimeRange(start, end) {
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a) return "";
  const head = `${pad(a.getHours())}:${pad(a.getMinutes())}`;
  if (!b) return head;
  return `${head} - ${pad(b.getHours())}:${pad(b.getMinutes())}`;
}

// TODO: 当前后端没有独立活动报名实体，状态先按起止时间推导；
// 后端补充报名字段后，再增加“报名中”状态。
function eventStatus(event) {
  const now = Date.now();
  const start = parseDate(event.start)?.getTime();
  const end = parseDate(event.end)?.getTime();
  if (!start) return { label: "未开始", tone: "muted" };
  if (end && end < now) return { label: "已结束", tone: "muted" };
  if (start <= now && (!end || end >= now)) return { label: "进行中", tone: "success" };
  if (start - now <= 24 * 60 * 60 * 1000) return { label: "即将开始", tone: "warning" };
  return { label: "未开始", tone: "neutral" };
}

function actorName(item) {
  return item?.actor?.nickname || item?.actor?.name || "匿名同学";
}

function noticeTitle(item) {
  const club = item?.clubName ? `「${item.clubName}」` : "社团";
  switch (item?.type) {
    case "join_request":
      return `${actorName(item)} 申请加入${club}`;
    case "join_approved":
      return `入社申请已通过 · ${club}`;
    case "join_declined":
      return `入社申请未通过 · ${club}`;
    case "message":
      return `${actorName(item)} 发来一条私信`;
    case "mention":
      return `${actorName(item)} 在校园墙提及了你`;
    case "reply":
      return `${actorName(item)} 回复了你的帖子`;
    default:
      return "你有一条新的站内通知";
  }
}

function noticeDescription(item) {
  const club = item?.clubName ? `「${item.clubName}」` : "社团";
  switch (item?.type) {
    case "join_request":
      return `${actorName(item)} 提交了加入${club}的申请，正在等待负责人处理。`;
    case "join_approved":
      return `你加入${club}的申请已经通过，可以前往社团页面查看详情。`;
    case "join_declined":
      return `你加入${club}的申请未通过，可以稍后再次申请或联系社团负责人。`;
    case "message":
      return "对方发来了一条私信，前往消息页继续交流。";
    case "mention":
      return "校园墙的动态中提到了你，前往相关动态查看上下文。";
    case "reply":
      return "你的帖子收到了新的回复，前往相关动态查看。";
    default:
      return "这是一条站内通知，前往相关页面查看完整内容。";
  }
}

function clubImage(value) {
  if (!value) return FALLBACK_IMAGE;
  try {
    return new URL(value, window.location.origin).href;
  } catch {
    return FALLBACK_IMAGE;
  }
}

function memberCountLabel(club) {
  const count = Number(club?.memberCount);
  return Number.isFinite(count) ? `成员 ${count} 人` : "人数待接入";
}

async function readJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.message || `请求失败（${response.status}）`);
    error.status = response.status;
    throw error;
  }
  if (payload && typeof payload === "object" && "code" in payload && "data" in payload) {
    if (payload.code !== 200) {
      throw new Error(payload.message || "请求未成功");
    }
    return payload.data;
  }
  return payload;
}

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };
  switch (name) {
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2 21a7 7 0 0 1 14 0" />
          <path d="M16 5a3.5 3.5 0 0 1 0 7" />
          <path d="M18 15a6 6 0 0 1 4 6" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 11h18" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...common}>
          <path d="M4 4h16v16H4z" />
          <path d="M4 13h5l2 3h2l2-3h5" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9Z" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

function StatCard({ icon, label, value, suffix, onClick, loading }) {
  return (
    <button className="dash-stat" type="button" onClick={onClick} disabled={loading}>
      <span className="dash-stat-icon">
        <Icon name={icon} size={20} />
      </span>
      <span className="dash-stat-copy">
        <span className="dash-stat-label">{label}</span>
        <strong className="dash-stat-value">
          {loading ? <span className="dash-skeleton dash-skeleton-value" /> : value}
          {!loading && suffix ? <small>{suffix}</small> : null}
        </strong>
      </span>
      <span className="dash-stat-arrow">
        <Icon name="arrow" size={16} />
      </span>
    </button>
  );
}

function StatusPill({ label, tone = "neutral" }) {
  return <span className={`dash-pill dash-pill-${tone}`}>{label}</span>;
}

function EmptyState({ icon = "inbox", title, text, action }) {
  return (
    <div className="dash-empty">
      <span className="dash-empty-icon">
        <Icon name={icon} size={22} />
      </span>
      <strong>{title}</strong>
      {text ? <p>{text}</p> : null}
      {action || null}
    </div>
  );
}

function Drawer({ open, onClose, children, label }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="dash-drawer-layer" role="presentation" onMouseDown={onClose}>
      <aside
        className="dash-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="dash-drawer-close" type="button" onClick={onClose} aria-label="关闭详情">
          <Icon name="close" size={18} />
        </button>
        {children}
      </aside>
    </div>
  );
}

function NoticeDrawer({ item, token, onRead }) {
  if (!item) return null;
  const meta = NOTICE_META[item.type] || { label: "通知", tone: "neutral" };
  return (
    <Drawer open={Boolean(item)} onClose={() => onRead(null)} label="公告详情">
      <div className="dash-drawer-body">
        <StatusPill label={meta.label} tone={meta.tone} />
        <h2>{noticeTitle(item)}</h2>
        <div className="dash-drawer-meta">
          <span>{item.clubName || "站内通知"}</span>
          <span>{formatDateTime(item.createdAt)}</span>
        </div>
        <p className="dash-drawer-copy">{noticeDescription(item)}</p>
        {item.unread ? (
          <p className="dash-drawer-note">这条通知尚未标记为已读。</p>
        ) : (
          <p className="dash-drawer-note dash-drawer-note-ok">
            <Icon name="check" size={14} /> 已读
          </p>
        )}
        <div className="dash-drawer-actions">
          {item.unread && token ? (
            <button
              className="dash-button dash-button-secondary"
              type="button"
              onClick={() => onRead(item)}
            >
              标记已读
            </button>
          ) : null}
          {item.url ? (
            <button
              className="dash-button dash-button-primary"
              type="button"
              onClick={() => window.location.assign(item.url)}
            >
              打开相关页面
            </button>
          ) : null}
        </div>
      </div>
    </Drawer>
  );
}

function ClubDrawer({ club, me, onClose }) {
  const [state, setState] = useState({
    loading: true,
    status: "",
    token: "",
    note: "",
    busy: false,
    error: "",
  });

  useEffect(() => {
    if (!club) return undefined;
    let alive = true;
    setState({ loading: true, status: "", token: "", note: "", busy: false, error: "" });
    readJson(`/api/campus-social/clubs/${club.id}/join`)
      .then((data) => {
        if (alive) {
          setState((current) => ({
            ...current,
            loading: false,
            status: data?.status || "none",
            token: data?.token || "",
          }));
        }
      })
      .catch((error) => {
        if (alive) {
          setState((current) => ({
            ...current,
            loading: false,
            error: error.status === 401 ? "" : error.message,
            status: error.status === 401 ? "login" : "none",
          }));
        }
      });
    return () => {
      alive = false;
    };
  }, [club?.id]);

  if (!club) return null;
  const signedIn = Boolean(me?.account);
  const isManager =
    me?.account?.role === "teacher" ||
    me?.account?.role === "admin" ||
    (Array.isArray(me?.offices) && me.offices.length > 0);
  const isMember = state.status === "member" || state.status === "approved";
  const isPending = state.status === "pending";
  const canApply = signedIn && !isMember && !isPending && !isManager;

  async function apply() {
    if (!state.token || state.busy || !canApply) return;
    setState((current) => ({ ...current, busy: true, error: "" }));
    try {
      await readJson(`/api/campus-social/clubs/${club.id}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Token": state.token,
        },
        body: JSON.stringify({ note: state.note }),
      });
      setState((current) => ({ ...current, busy: false, status: "pending" }));
    } catch (error) {
      setState((current) => ({ ...current, busy: false, error: error.message }));
    }
  }

  return (
    <Drawer open={Boolean(club)} onClose={onClose} label="社团详情">
      <div className="dash-drawer-body">
        <div className="dash-drawer-club">
          <img
            src={clubImage(club.clubItem)}
            alt=""
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = FALLBACK_IMAGE;
            }}
          />
          <div>
            <div className="dash-drawer-tags">
              {club.greatClub ? (
                <StatusPill label="优秀社团" tone="brand" />
              ) : (
                <StatusPill label="社团" tone="neutral" />
              )}
              {club.clubClass ? <span className="dash-muted">{club.clubClass}</span> : null}
            </div>
            <h2>{club.clubName}</h2>
            <p className="dash-drawer-sub">{club.sortDescription || "暂无简介"}</p>
          </div>
        </div>
        <p className="dash-drawer-copy">
          {club.sortDescription || "该社团还没有填写简介。"}
        </p>
        <div className="dash-drawer-meta">
          <span>{memberCountLabel(club)}</span>
          <span>社团编号 {club.id}</span>
        </div>
        {state.error ? <p className="dash-inline-error">{state.error}</p> : null}
        {isManager ? (
          <a className="dash-button dash-button-primary" href="/page/club/workspace">
            进入社团工作台
          </a>
        ) : !signedIn || state.status === "login" ? (
          <a
            className="dash-button dash-button-primary"
            href={`/page/user/login?next=${encodeURIComponent("/page/dashboard")}`}
          >
            登录后申请加入
          </a>
        ) : state.loading ? (
          <button className="dash-button dash-button-primary" type="button" disabled>
            正在读取加入状态…
          </button>
        ) : isMember ? (
          <button className="dash-button dash-button-primary" type="button" disabled>
            已加入社团
          </button>
        ) : isPending ? (
          <button className="dash-button dash-button-primary" type="button" disabled>
            申请已提交 · 等待审核
          </button>
        ) : (
          <div className="dash-join-form">
            <label htmlFor="dash-join-note">申请说明（选填）</label>
            <textarea
              id="dash-join-note"
              rows={3}
              maxLength={1000}
              value={state.note}
              onChange={(event) =>
                setState((current) => ({ ...current, note: event.target.value }))
              }
              placeholder="说说你的兴趣或想做的事情"
            />
            <button
              className="dash-button dash-button-primary"
              type="button"
              disabled={state.busy || !state.token}
              onClick={apply}
            >
              {state.busy ? "正在提交…" : "提交加入申请"}
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dash-grid" aria-busy="true" aria-label="正在载入工作台">
      <div className="dash-welcome">
        <span className="dash-skeleton dash-skeleton-title" />
        <span className="dash-skeleton dash-skeleton-line" />
      </div>
      <div className="dash-summary">
        {[1, 2, 3].map((item) => (
          <div className="dash-stat" key={item}>
            <span className="dash-skeleton dash-skeleton-icon" />
            <span className="dash-stat-copy">
              <span className="dash-skeleton dash-skeleton-line" />
              <span className="dash-skeleton dash-skeleton-value" />
            </span>
          </div>
        ))}
      </div>
      <div className="dash-main">
        <section className="dash-card">
          <span className="dash-skeleton dash-skeleton-title" />
          {[1, 2, 3, 4].map((item) => (
            <span className="dash-skeleton dash-skeleton-row" key={item} />
          ))}
        </section>
        <section className="dash-card">
          <span className="dash-skeleton dash-skeleton-title" />
          {[1, 2, 3, 4].map((item) => (
            <span className="dash-skeleton dash-skeleton-row" key={item} />
          ))}
        </section>
      </div>
      <section className="dash-card">
        <span className="dash-skeleton dash-skeleton-title" />
        <div className="dash-club-grid">
          {[1, 2, 3, 4].map((item) => (
            <span className="dash-skeleton dash-skeleton-club" key={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function GuestState({ clubs, onOpenClub }) {
  return (
    <div className="dash-guest">
      <div className="dash-guest-card">
        <span className="dash-guest-mark">W</span>
        <h1>登录后查看你的社团工作台</h1>
        <p>加入社团、查看近期活动、处理入社申请和未读消息。</p>
        <a
          className="dash-button dash-button-primary"
          href={`/page/user/login?next=${encodeURIComponent("/page/dashboard")}`}
        >
          登录 / 注册
        </a>
      </div>
      {clubs.length ? (
        <section className="dash-card">
          <div className="dash-card-head">
            <h2>
              <Icon name="star" size={18} /> 推荐社团
            </h2>
            <a href="/page/clubs">浏览全部</a>
          </div>
          <div className="dash-club-grid">
            {clubs.map((club) => (
              <button
                className="dash-club-card"
                type="button"
                key={club.id}
                onClick={() => onOpenClub(club)}
              >
                <img
                  src={clubImage(club.clubItem)}
                  alt=""
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />
                <span className="dash-club-copy">
                  <strong>{club.clubName}</strong>
                  <span>{club.sortDescription || "暂无简介"}</span>
                  <span className="dash-club-meta">
                    {club.greatClub ? "优秀社团" : club.clubClass || "校园社团"}
                    <i>{memberCountLabel(club)}</i>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function App() {
  const [loading, setLoading] = useState(true);
  const [silentLoading, setSilentLoading] = useState(false);
  const [me, setMe] = useState(null);
  const [myClubs, setMyClubs] = useState([]);
  const [notifications, setNotifications] = useState({ items: [], unread: 0, token: "" });
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [error, setError] = useState("");
  const [sectionErrors, setSectionErrors] = useState({});
  const [drawerNotice, setDrawerNotice] = useState(null);
  const [drawerClub, setDrawerClub] = useState(null);

  async function load({ silent = false } = {}) {
    if (silent) setSilentLoading(true);
    else setLoading(true);
    setError("");
    setSectionErrors({});

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const rangeEnd = new Date(now);
    rangeEnd.setDate(rangeEnd.getDate() + 30);
    const calendarEnd = rangeEnd > monthEnd ? rangeEnd : monthEnd;

    try {
      const response = await fetch("/api/campus-social/me", {
        credentials: "same-origin",
      });
      if (response.status === 401) {
        setMe(null);
        const publicClubs = await fetch("/api/club/all")
          .then((r) => (r.ok ? r.json() : null))
          .then((payload) => (payload?.data || []).slice(0, 4))
          .catch(() => []);
        setClubs(publicClubs);
        setLoading(false);
        setSilentLoading(false);
        return;
      }
      if (!response.ok) throw new Error(`登录状态读取失败（${response.status}）`);
      const meData = await response.json();
      setMe(meData);

      const [mineResult, noticesResult, eventsResult, clubsResult] = await Promise.allSettled([
        readJson("/api/campus-social/me/clubs"),
        readJson("/api/campus-social/notifications"),
        readJson(
          `/api/campus-social/calendar?from=${ymd(monthStart)}&to=${ymd(calendarEnd)}`,
        ),
        readJson("/api/club/all"),
      ]);

      const nextErrors = {};
      if (mineResult.status === "fulfilled") setMyClubs(Array.isArray(mineResult.value) ? mineResult.value : []);
      else nextErrors.clubs = mineResult.reason?.message || "社团列表读取失败";

      if (noticesResult.status === "fulfilled") {
        const value = noticesResult.value || {};
        setNotifications({
          items: Array.isArray(value.items) ? value.items : [],
          unread: Number(value.unread) || 0,
          token: value.token || "",
        });
      } else {
        nextErrors.notices = noticesResult.reason?.message || "通知读取失败";
      }

      if (eventsResult.status === "fulfilled") {
        setEvents(Array.isArray(eventsResult.value?.events) ? eventsResult.value.events : []);
      } else {
        nextErrors.events = eventsResult.reason?.message || "日程读取失败";
      }

      if (clubsResult.status === "fulfilled") {
        const list = Array.isArray(clubsResult.value) ? clubsResult.value : [];
        const sorted = [...list].sort((a, b) => Number(b.greatClub) - Number(a.greatClub));
        setClubs(sorted.slice(0, 8));
      } else {
        nextErrors.recommended = clubsResult.reason?.message || "推荐社团读取失败";
      }

      setSectionErrors(nextErrors);
    } catch (loadError) {
      setError(loadError.message || "工作台载入失败");
    } finally {
      setLoading(false);
      setSilentLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (!document.hidden) load({ silent: true });
    }, 60000);
    const onVisible = () => {
      if (!document.hidden) load({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const account = me?.account || null;
  const displayName = account?.nickname || account?.name || "同学";
  const roleLabel = ROLE_LABEL[account?.role] || "学生";
  const canCreate =
    account?.role === "president" ||
    account?.role === "vice_president" ||
    account?.role === "teacher" ||
    account?.role === "admin" ||
    (Array.isArray(me?.offices) && me.offices.length > 0);

  const monthlyEvents = useMemo(() => {
    const now = new Date();
    return events.filter((event) => {
      const start = parseDate(event.start);
      return (
        start &&
        start.getFullYear() === now.getFullYear() &&
        start.getMonth() === now.getMonth() &&
        (event.clubId != null || event.kind === "club")
      );
    });
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return events
      .filter((event) => {
        const end = parseDate(event.end) || parseDate(event.start);
        return end && end.getTime() >= now;
      })
      .sort((a, b) => String(a.start).localeCompare(String(b.start)))
      .slice(0, 6);
  }, [events]);

  const announcements = useMemo(
    () =>
      [...notifications.items]
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
        .slice(0, 5),
    [notifications.items],
  );

  const pendingCount = notifications.items.filter((item) => item.type === "join_request").length;

  async function markNoticeRead(item) {
    if (!item) {
      setDrawerNotice(null);
      return;
    }
    if (!item.unread || !notifications.token) {
      setDrawerNotice(item);
      return;
    }
    try {
      await readJson("/api/campus-social/notifications/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Token": notifications.token,
        },
        body: JSON.stringify({ id: item.id }),
      });
      setNotifications((current) => ({
        ...current,
        unread: Math.max(0, current.unread - 1),
        items: current.items.map((entry) =>
          entry.id === item.id ? { ...entry, unread: false } : entry,
        ),
      }));
      setDrawerNotice({ ...item, unread: false });
    } catch (readError) {
      setDrawerNotice(item);
      setSectionErrors((current) => ({ ...current, notices: readError.message }));
    }
  }

  function openNotice(item) {
    markNoticeRead(item);
  }

  function statTarget(target) {
    if (target === "clubs") window.location.assign("/page/my-clubs");
    if (target === "events") window.location.assign("/page/calendar");
    if (target === "pending") {
      if (account?.role === "president" || account?.role === "vice_president" || account?.role === "teacher" || account?.role === "admin") {
        window.location.assign("/page/club/workspace?tab=recruitment");
      } else {
        window.location.assign("/page/messages");
      }
    }
  }

  if (loading) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className="dash-error-state">
        <h1>工作台暂时无法载入</h1>
        <p>{error}</p>
        <button className="dash-button dash-button-primary" type="button" onClick={() => load()}>
          重新加载
        </button>
      </div>
    );
  }
  if (!me) {
    return (
      <>
        <GuestState clubs={clubs.slice(0, 4)} onOpenClub={setDrawerClub} />
        <ClubDrawer club={drawerClub} me={null} onClose={() => setDrawerClub(null)} />
      </>
    );
  }

  return (
    <>
      <div className="dash-grid">
        <header className="dash-welcome">
          <div>
            <h1>
              {GREETING[Math.min(3, Math.floor(new Date().getHours() / 6))]}，{displayName}
            </h1>
            <p>
              上海青浦世外高级中学 · 社团管理平台
              <span className="dash-welcome-role">{roleLabel}</span>
              {silentLoading ? <span className="dash-syncing">同步中…</span> : null}
            </p>
          </div>
          {canCreate ? (
            <a className="dash-primary-action" href="/page/club/workspace?tab=calendar">
              <Icon name="plus" size={18} />
              创建活动
            </a>
          ) : (
            <a className="dash-primary-action" href="/page/clubs">
              <Icon name="plus" size={18} />
              浏览社团
            </a>
          )}
        </header>

        {Object.keys(sectionErrors).length ? (
          <div className="dash-banner" role="alert">
            <span>
              {Object.values(sectionErrors).filter(Boolean).slice(0, 2).join("；")}
            </span>
            <button type="button" onClick={() => load()}>
              重试
            </button>
          </div>
        ) : null}

        <section className="dash-summary" aria-label="工作台摘要">
          <StatCard
            icon="users"
            label="加入的社团"
            value={myClubs.length}
            suffix="个"
            onClick={() => statTarget("clubs")}
            loading={false}
          />
          <StatCard
            icon="calendar"
            label="本月活动"
            value={monthlyEvents.length}
            suffix="场"
            onClick={() => statTarget("events")}
            loading={false}
          />
          <StatCard
            icon="inbox"
            label="待处理事项"
            value={pendingCount}
            suffix="项"
            onClick={() => statTarget("pending")}
            loading={false}
          />
        </section>

        <div className="dash-main">
          <section className="dash-card" aria-labelledby="dash-notice-title">
            <div className="dash-card-head">
              <h2 id="dash-notice-title">
                <Icon name="inbox" size={18} /> 公告
              </h2>
              <a href="/page/messages">
                更多 <Icon name="arrow" size={14} />
              </a>
            </div>
            {sectionErrors.notices ? (
              <EmptyState
                icon="inbox"
                title="公告暂时无法读取"
                text={sectionErrors.notices}
                action={
                  <button className="dash-button dash-button-secondary" type="button" onClick={() => load()}>
                    重试
                  </button>
                }
              />
            ) : announcements.length ? (
              <ul className="dash-notice-list">
                {announcements.map((item) => {
                  const meta = NOTICE_META[item.type] || { label: "通知", tone: "neutral" };
                  return (
                    <li key={item.id}>
                      <button
                        className={`dash-notice-row${item.unread ? " is-unread" : ""}`}
                        type="button"
                        onClick={() => openNotice(item)}
                      >
                        <span className={`dash-notice-tag dash-notice-tag-${meta.tone}`}>
                          {meta.label}
                        </span>
                        <span className="dash-notice-copy">
                          <strong>{noticeTitle(item)}</strong>
                          <time>{formatDateTime(item.createdAt)}</time>
                        </span>
                        {item.unread ? <span className="dash-unread-dot" aria-label="未读" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon="inbox"
                title="暂时没有公告"
                text="新的站内通知会显示在这里。"
              />
            )}
          </section>

          <section className="dash-card" aria-labelledby="dash-activity-title">
            <div className="dash-card-head">
              <h2 id="dash-activity-title">
                <Icon name="clock" size={18} /> 近期活动
              </h2>
              <a href="/page/calendar">
                更多 <Icon name="arrow" size={14} />
              </a>
            </div>
            {sectionErrors.events ? (
              <EmptyState
                icon="calendar"
                title="活动暂时无法读取"
                text={sectionErrors.events}
                action={
                  <button className="dash-button dash-button-secondary" type="button" onClick={() => load()}>
                    重试
                  </button>
                }
              />
            ) : upcomingEvents.length ? (
              <ol className="dash-timeline">
                {upcomingEvents.map((event) => {
                  const date = formatDateBlock(event.start);
                  const status = eventStatus(event);
                  return (
                    <li key={event.id}>
                      <span className="dash-timeline-dot" aria-hidden="true" />
                      <div className="dash-timeline-date">
                        <strong>{date.day}</strong>
                        <span>{date.month}</span>
                      </div>
                      <div className="dash-timeline-copy">
                        <div className="dash-timeline-top">
                          <strong>{event.title}</strong>
                          <StatusPill label={status.label} tone={status.tone} />
                        </div>
                        <p>
                          {formatTimeRange(event.start, event.end)}
                          {event.clubName ? ` · ${event.clubName}` : " · 个人日程"}
                          {event.location ? ` · ${event.location}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState
                icon="calendar"
                title="近期没有活动"
                text="社团活动和个人日程会出现在这里。"
                action={
                  <a className="dash-button dash-button-secondary" href="/page/calendar">
                    打开日程
                  </a>
                }
              />
            )}
          </section>
        </div>

        <section className="dash-card" aria-labelledby="dash-club-title">
          <div className="dash-card-head">
            <h2 id="dash-club-title">
              <Icon name="star" size={18} /> 推荐社团
            </h2>
            <a href="/page/clubs">
              浏览全部 <Icon name="arrow" size={14} />
            </a>
          </div>
          {sectionErrors.recommended ? (
            <EmptyState
              icon="users"
              title="推荐社团暂时无法读取"
              text={sectionErrors.recommended}
              action={
                <button className="dash-button dash-button-secondary" type="button" onClick={() => load()}>
                  重试
                </button>
              }
            />
          ) : clubs.length ? (
            <div className="dash-club-grid">
              {clubs.slice(0, 4).map((club) => (
                <article className="dash-club-card" key={club.id}>
                  <button type="button" className="dash-club-main" onClick={() => setDrawerClub(club)}>
                    <img
                      src={clubImage(club.clubItem)}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />
                    <span className="dash-club-copy">
                      <strong>{club.clubName}</strong>
                      <span>{club.sortDescription || "暂无简介"}</span>
                      <span className="dash-club-meta">
                        {club.greatClub ? "优秀社团" : club.clubClass || "校园社团"}
                        <i>{memberCountLabel(club)}</i>
                      </span>
                    </span>
                  </button>
                  <button
                    className="dash-button dash-button-secondary dash-club-join"
                    type="button"
                    onClick={() => setDrawerClub(club)}
                  >
                    查看 / 加入
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="users"
              title="暂时没有推荐社团"
              text="社团目录更新后会显示在这里。"
              action={
                <a className="dash-button dash-button-secondary" href="/page/clubs">
                  打开社团目录
                </a>
              }
            />
          )}
        </section>
      </div>

      <NoticeDrawer
        item={drawerNotice}
        token={notifications.token}
        onRead={(item) => {
          if (item) markNoticeRead(item);
          else setDrawerNotice(null);
        }}
      />
      <ClubDrawer club={drawerClub} me={me} onClose={() => setDrawerClub(null)} />
    </>
  );
}

createRoot(document.getElementById("dashboard-root")).render(<App />);
