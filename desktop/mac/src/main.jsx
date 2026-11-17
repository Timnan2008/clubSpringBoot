import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarBlank,
  Stack,
  CheckSquare,
  Plus,
  Megaphone,
  Star,
  ArrowUpRight,
  MagnifyingGlass,
  Buildings,
  ChatCircleDots,
  Bell,
  ShieldCheck,
  SignIn,
  WifiSlash,
  Compass,
  CaretRight,
  ArrowClockwise,
  GearSix,
} from "@phosphor-icons/react";
import { useCampus, bridge, categories } from "./data";
import {
  Action,
  Sidebar,
  WorkspaceHeader,
  Panel,
  Empty,
  ClubCard,
  AnnouncementList,
  Timeline,
  Modal,
  StatusFooter,
  labels,
} from "./components";
import "./styles.css";

function App() {
  const data = useCampus();
  const [page, setPage] = useState("home");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState(null);
  const [toast, setToast] = useState("");
  const [compact, setCompact] = useState(localStorage.getItem("club-compact") === "true");
  const [reduced, setReduced] = useState(localStorage.getItem("club-reduced") === "true");
  const searchRef = useRef();
  const navigate = (value) => {
    setPage(value);
    setQuery("");
    setFilter("all");
  };
  const openPage = async (path) => {
    try {
      await bridge.openPage(path);
    } catch {
      setToast("校园服务暂时无法打开，请稍后重试");
    }
  };
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (search !== null) searchRef.current?.focus();
  }, [search === null]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    localStorage.setItem("club-compact", String(compact));
    localStorage.setItem("club-reduced", String(reduced));
  }, [compact, reduced]);
  const login = () => openPage("/page/user/login");
  const showClub = (club) => setModal({ type: "club", value: club });
  const showEvent = (event) => setModal({ type: "event", value: event });
  const recommended = [...data.clubs]
    .sort((a, b) => Number(b.greatClub) - Number(a.greatClub))
    .slice(0, 4);
  const filtered = data.clubs.filter(
    (c) =>
      (filter === "all" || c.clubClass === filter) &&
      `${c.clubName} ${c.clubNameEn} ${c.sortDescription}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const now = new Date();
  const greeting = now.getHours() < 12 ? "上午好" : now.getHours() < 18 ? "下午好" : "晚上好";
  const date = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);
  const userGate = (children, title = "你的校园生活，从登录开始") =>
    data.user ? (
      children
    ) : (
      <div className="full-empty">
        <Empty
          icon={ShieldCheck}
          title={title}
          detail="使用原网站账号登录，社团、日程与消息会自动同步。"
          action="登录校园账号"
          onAction={login}
        />
      </div>
    );
  const memberClubs = data.mine.map((m) => ({
    ...data.clubs.find((c) => c.id === m.id),
    ...m,
    clubName: m.name,
    sortDescription: m.slogan,
  }));
  return (
    <div className={`app ${compact ? "compact" : ""} ${reduced ? "reduced" : ""}`}>
      <div className="titlebar">
        <span>上海青浦世外高级中学 · 社团管理平台</span>
        <span className="titlebar-tag">CAMPUS DESKTOP</span>
      </div>
      <div className="app-layout">
        <Sidebar page={page} navigate={navigate} data={data} />
        <div className="workspace">
          <WorkspaceHeader
            data={data}
            onSearch={() => setSearch("")}
            navigate={navigate}
            onAction={openPage}
          />
          <main className={`content page-${page}`}>
            {data.error && (
              <div className="error-banner" role="alert">
                <WifiSlash size={18} />
                {data.error}
                <button onClick={data.refresh}>重新连接</button>
              </div>
            )}
            {data.privateError && (
              <div className="error-banner" role="status">
                {data.privateError}
                <button onClick={data.refresh}>重试同步</button>
              </div>
            )}
            {page === "home" && (
              <>
                <div className="welcome">
                  <div>
                    <div className="eyebrow">YOUR CAMPUS, CONNECTED</div>
                    <h1>
                      {greeting}
                      {data.user ? `，${data.user.name}` : ""}
                      <span className="wave">✦</span>
                    </h1>
                    <p>在这里，找到热爱，也找到同频的人。</p>
                  </div>
                  <div className="today">
                    <span>{date}</span>
                    <small>每一份热爱，都值得被看见</small>
                  </div>
                </div>
                <div className="summary-row">
                  {[
                    [Stack, "加入的社团", data.user ? data.mine.length : "—", "个", "mine"],
                    [
                      CalendarBlank,
                      "本月日程",
                      data.user ? data.events.length : "—",
                      "项",
                      "calendar",
                    ],
                    [CheckSquare, "未读通知", data.user ? data.unread : "—", "条", "messages"],
                  ].map(([Icon, title, number, unit, target]) => (
                    <button className="summary-card" key={title} onClick={() => navigate(target)}>
                      <span className="summary-icon">
                        <Icon size={25} />
                      </span>
                      <div>
                        <span>{title}</span>
                        <strong>
                          {number}
                          <small>{unit}</small>
                        </strong>
                      </div>
                      <CaretRight size={17} />
                    </button>
                  ))}
                  <Action
                    className="create-button"
                    onClick={() => (data.user ? openPage("/page/club/workspace") : login())}
                  >
                    <Plus size={21} />
                    创建活动
                  </Action>
                </div>
                <div className="dashboard-middle">
                  <Panel
                    title="校园公告"
                    icon={Megaphone}
                    action="查看全部"
                    onAction={() => setModal({ type: "notices" })}
                  >
                    <AnnouncementList
                      items={data.notices}
                      loading={data.loading}
                      onOpen={(notice) => setModal({ type: "notice", value: notice })}
                    />
                  </Panel>
                  <Panel
                    title="近期日程"
                    icon={CalendarBlank}
                    action="我的日历"
                    onAction={() => navigate("calendar")}
                  >
                    <Timeline events={data.events} user={data.user} onOpen={showEvent} />
                  </Panel>
                </div>
                <Panel
                  title="发现你的热爱"
                  icon={Star}
                  action="浏览全部社团"
                  onAction={() => navigate("discover")}
                  className="recommended"
                >
                  <div className="section-note">从一次好奇开始，探索更多可能。</div>
                  <div className="club-grid">
                    {recommended.map((c) => (
                      <ClubCard key={c.id} club={c} base={data.info.baseURL} onOpen={showClub} />
                    ))}
                    {data.loading &&
                      !recommended.length &&
                      [1, 2, 3, 4].map((i) => <div className="skeleton-card" key={i} />)}
                  </div>
                  {!data.loading && !recommended.length && (
                    <Empty
                      title="社团目录暂时不可用"
                      detail="检查网络后重试"
                      action="重新加载"
                      onAction={data.refresh}
                    />
                  )}
                </Panel>
              </>
            )}
            {page === "discover" && (
              <>
                <PageHeading
                  eyebrow="FIND YOUR PEOPLE"
                  title="发现社团"
                  detail={`${data.clubs.length} 个社团，等待与你相遇。`}
                />
                <div className="catalog-toolbar">
                  <div className="tabs">
                    {[["all", "全部社团"], ...Object.entries(categories)].map(([key, title]) => (
                      <button
                        key={key}
                        className={key === filter ? "active" : ""}
                        onClick={() => setFilter(key)}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                  <label className="inline-search">
                    <MagnifyingGlass size={18} />
                    <input
                      placeholder="搜索社团名称、关键词"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                </div>
                <div className="catalog-grid">
                  {filtered.map((c) => (
                    <ClubCard key={c.id} club={c} base={data.info.baseURL} onOpen={showClub} />
                  ))}
                </div>
                {!filtered.length && (
                  <Empty
                    icon={Compass}
                    title={data.loading ? "正在读取社团目录" : "没有找到匹配的社团"}
                    detail="试试其他关键词，或切换分类。"
                  />
                )}
              </>
            )}
            {page === "mine" && (
              <>
                <PageHeading
                  eyebrow="BETTER TOGETHER"
                  title="我的社团"
                  detail="与你并肩的伙伴，你正在参与的校园故事。"
                  action="管理社团"
                  onAction={() => (data.user ? openPage("/page/my-clubs") : login())}
                />
                {userGate(
                  <>
                    <div className="catalog-grid">
                      {memberClubs.map((c) => (
                        <div key={c.id}>
                          <div className="membership-role">{c.role}</div>
                          <ClubCard club={c} base={data.info.baseURL} onOpen={showClub} />
                        </div>
                      ))}
                    </div>
                    {!memberClubs.length && (
                      <Empty
                        icon={Stack}
                        title="还没有加入社团"
                        detail="先去发现社团，看看有没有你的热爱。"
                        action="发现社团"
                        onAction={() => navigate("discover")}
                      />
                    )}
                  </>,
                )}
              </>
            )}
            {page === "calendar" && (
              <>
                <PageHeading
                  eyebrow="MAKE TIME FOR WHAT MATTERS"
                  title="活动日程"
                  detail="本月社团活动与个人安排，来自你的校园日历。"
                  action="打开完整日历"
                  onAction={() => (data.user ? openPage("/page/calendar") : login())}
                />
                {userGate(
                  <Panel title={`${now.getMonth() + 1}月 · 我的日程`} icon={CalendarBlank}>
                    <Timeline
                      events={data.events}
                      user={data.user}
                      limit={100}
                      onOpen={showEvent}
                    />
                  </Panel>,
                )}
              </>
            )}
            {page === "messages" && (
              <>
                <PageHeading
                  eyebrow="STAY IN THE LOOP"
                  title="消息与通知"
                  detail="不错过每一次邀请，也不错过伙伴的消息。"
                  action="打开聊天"
                  onAction={() => (data.user ? openPage("/page/messages") : login())}
                />
                {userGate(
                  <div className="message-columns">
                    <Panel title="站内通知" icon={Bell}>
                      {data.notifications.length ? (
                        data.notifications.map((n) => (
                          <button
                            className="message-row"
                            key={n.id}
                            onClick={() =>
                              openPage(n.url?.startsWith("/page/") ? n.url : "/page/wall")
                            }
                          >
                            <span className="notice-dot" />
                            <div>
                              <strong>{n.clubName || n.actor?.name || "校园通知"}</strong>
                              <p>
                                {{
                                  mention: "有人在校园墙提到了你",
                                  reply: "你的内容收到了新回复",
                                  message: "你收到了一条新消息",
                                  join_request: "有新的入社申请等待处理",
                                  join_approved: "你的入社申请已通过",
                                  join_declined: "你的入社申请未通过",
                                }[n.type] || "你有一条新的校园动态"}
                              </p>
                              <small>{n.createdAt?.slice(0, 16).replace("T", " ")}</small>
                            </div>
                            {n.unread && <span className="unread-pill">未读</span>}
                          </button>
                        ))
                      ) : (
                        <Empty title="暂无通知" detail="新的校园动态会显示在这里" />
                      )}
                    </Panel>
                    <Panel title="最近会话" icon={ChatCircleDots}>
                      {data.inbox.length ? (
                        data.inbox.map((chat, i) => (
                          <button
                            className="message-row"
                            key={chat.account?.id || i}
                            onClick={() => openPage("/page/messages")}
                          >
                            <span className="avatar">
                              {(chat.account?.name || "同").slice(0, 1)}
                            </span>
                            <div>
                              <strong>{chat.account?.name || "校园伙伴"}</strong>
                              <p>{chat.preview || "打开会话"}</p>
                            </div>
                            {chat.unread > 0 && <span className="badge">{chat.unread}</span>}
                          </button>
                        ))
                      ) : (
                        <Empty
                          icon={ChatCircleDots}
                          title="还没有会话"
                          detail="在完整聊天中与校园伙伴联系"
                          action="打开聊天"
                          onAction={() => openPage("/page/messages")}
                        />
                      )}
                      <div className="security-note">
                        <ShieldCheck size={15} />
                        加密聊天使用原站的安全会话流程。
                      </div>
                    </Panel>
                  </div>,
                )}
              </>
            )}
            {page === "settings" && (
              <>
                <PageHeading
                  eyebrow="MAKE IT YOURS"
                  title="设置"
                  detail="让校园工作台更适合你的使用习惯。"
                />
                <div className="settings-layout">
                  <Panel title="账号与连接" icon={ShieldCheck}>
                    <Setting
                      title={data.user?.name || "尚未登录"}
                      detail={
                        data.user ? "已连接原网站校园账号" : "使用已有账号即可同步社团、日程与消息"
                      }
                    >
                      <Action
                        secondary
                        onClick={() => (data.user ? openPage("/page/user/profile") : login())}
                      >
                        {data.user ? "个人资料" : "登录账号"}
                      </Action>
                    </Setting>
                    <Setting title="服务地址" detail={data.info.baseURL}>
                      <select
                        aria-label="选择校园服务器"
                        value={data.info.server || "production"}
                        onChange={async (e) => {
                          await bridge.setServer(e.target.value);
                          await data.refresh();
                        }}
                      >
                        <option value="production">正式校园服务</option>
                        <option value="local">本机开发服务</option>
                      </select>
                    </Setting>
                    {data.user && (
                      <Setting
                        title="退出此客户端账号"
                        detail="清除客户端登录状态，下次使用需要重新登录"
                      >
                        <Action secondary onClick={() => setModal({ type: "logout" })}>
                          退出账号
                        </Action>
                      </Setting>
                    )}
                  </Panel>
                  <Panel title="显示与体验" icon={GearSix}>
                    <Setting title="紧凑模式" detail="缩小卡片间距，显示更多内容">
                      <Toggle label="紧凑模式" value={compact} onChange={setCompact} />
                    </Setting>
                    <Setting title="减少动态效果" detail="关闭页面过渡与装饰动画">
                      <Toggle label="减少动态效果" value={reduced} onChange={setReduced} />
                    </Setting>
                    <Setting
                      title="青浦世外社团"
                      detail={`Mac 客户端 · v${data.info.version || "0.1.0"}`}
                    >
                      <span className="version-chip">预览版</span>
                    </Setting>
                  </Panel>
                </div>
              </>
            )}
          </main>
          <StatusFooter data={data} />
        </div>
      </div>
      {search !== null && (
        <Modal title="搜索校园" onClose={() => setSearch(null)} wide>
          <label className="command-input">
            <MagnifyingGlass size={22} />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索社团、你的日程或公告…"
            />
          </label>
          <div className="search-results">
            {(search
              ? data.clubs
                  .filter((c) =>
                    `${c.clubName} ${c.clubNameEn} ${c.sortDescription}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .slice(0, 8)
              : recommended
            ).map((c) => (
              <button
                className="search-result"
                key={c.id}
                onClick={() => {
                  setSearch(null);
                  showClub(c);
                }}
              >
                <Buildings size={21} />
                <div>
                  <strong>{c.clubName}</strong>
                  <small>{categories[c.clubClass] || "社团"}</small>
                </div>
                <ArrowUpRight size={16} />
              </button>
            ))}
            {search &&
              [
                ...data.events.map((e) => ({ ...e, kind: "event" })),
                ...data.notices.map((n) => ({ ...n, kind: "notice" })),
              ]
                .filter((r) => r.title.includes(search))
                .slice(0, 5)
                .map((r, i) => (
                  <button
                    className="search-result"
                    key={`other-${i}`}
                    onClick={() => {
                      setSearch(null);
                      setModal({ type: r.kind, value: r });
                    }}
                  >
                    <CalendarBlank size={20} />
                    <strong>{r.title}</strong>
                  </button>
                ))}
            {search &&
              !data.clubs.some((c) =>
                `${c.clubName} ${c.clubNameEn} ${c.sortDescription}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              ) &&
              ![...data.events, ...data.notices].some((r) => r.title.includes(search)) && (
                <Empty title="没有找到结果" detail="换一个关键词再试试" />
              )}
          </div>
          <p className="search-hint">搜索已同步的社团、个人日程与公告 · Esc 关闭</p>
        </Modal>
      )}
      {modal && (
        <Modal
          title={
            modal.type === "club"
              ? "社团详情"
              : modal.type === "event"
                ? "日程详情"
                : modal.type === "notices"
                  ? "校园公告"
                  : modal.type === "logout"
                    ? "退出账号"
                    : "公告详情"
          }
          onClose={() => setModal(null)}
        >
          {modal.type === "club" && (
            <>
              <div className="detail-label">{categories[modal.value.clubClass] || "校园社团"}</div>
              <h3 className="detail-title">{modal.value.clubName}</h3>
              <p className="detail-en">{modal.value.clubNameEn}</p>
              <p className="detail-text">
                {modal.value.sortDescription || "了解更多社团信息，发现你的校园伙伴。"}
              </p>
              <div className="modal-actions">
                <Action
                  secondary
                  onClick={() => {
                    setModal(null);
                    openPage(`/page/clubs/${modal.value.id}`);
                  }}
                >
                  完整资料
                  <ArrowUpRight size={16} />
                </Action>
                <Action
                  onClick={() => {
                    setModal(null);
                    openPage(`/page/clubs/${modal.value.id}`);
                  }}
                >
                  <Plus size={17} />
                  了解与加入
                </Action>
              </div>
              <p className="modal-note">加入申请与成员权限由原校园服务处理。</p>
            </>
          )}
          {modal.type === "event" && (
            <>
              <h3 className="detail-title">{modal.value.title}</h3>
              <p className="detail-text">
                {modal.value.start?.replace("T", " ")} — {modal.value.end?.slice(11, 16)}
              </p>
              <p className="detail-text">
                {modal.value.location || "未填写地点"}
                {modal.value.clubName && ` · ${modal.value.clubName}`}
              </p>
              <p className="detail-text">{modal.value.description || "暂无补充说明"}</p>
              <Action
                onClick={() => {
                  setModal(null);
                  openPage("/page/calendar");
                }}
              >
                在完整日历中查看
                <ArrowUpRight size={16} />
              </Action>
            </>
          )}
          {modal.type === "notice" && (
            <>
              <div className="detail-label">来自校园官网公告栏</div>
              <h3 className="detail-title">{modal.value.title}</h3>
              <p className="detail-text">以上为校园官网公告原文。</p>
              <Action secondary onClick={() => openPage("/page/index")}>
                打开校园官网
                <ArrowUpRight size={16} />
              </Action>
            </>
          )}
          {modal.type === "notices" && (
            <AnnouncementList
              items={data.notices}
              onOpen={(notice) => setModal({ type: "notice", value: notice })}
            />
          )}
          {modal.type === "logout" && (
            <>
              <p className="detail-text">
                退出后将清除此客户端的登录状态与缓存账号信息，网站账号本身会保留。
              </p>
              <div className="modal-actions">
                <Action secondary onClick={() => setModal(null)}>
                  取消
                </Action>
                <Action
                  onClick={async () => {
                    await bridge.logout();
                    setModal(null);
                    await data.refresh();
                  }}
                >
                  确认退出
                </Action>
              </div>
            </>
          )}
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
function PageHeading({ eyebrow, title, detail, action, onAction }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{detail}</p>
      </div>
      {action && (
        <Action onClick={onAction}>
          {action}
          <ArrowUpRight size={17} />
        </Action>
      )}
    </div>
  );
}
function Setting({ title, detail, children }) {
  return (
    <div className="setting">
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      {children}
    </div>
  );
}
function Toggle({ label, value, onChange }) {
  return (
    <button
      className={`toggle ${value ? "on" : ""}`}
      role="switch"
      aria-label={label}
      aria-checked={value}
      onClick={() => onChange(!value)}
    >
      <span />
    </button>
  );
}
createRoot(document.getElementById("root")).render(<App />);
