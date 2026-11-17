import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarBlank,
  Stack,
  CheckSquare,
  Plus,
  Megaphone,
  Star,
  CaretRight,
  MagnifyingGlass,
  Buildings,
  ArrowUpRight,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useCampus, categories } from "./data";
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
} from "./components";
import { UI, Heading } from "./ui";
import Auth from "./Auth";
import { setCryptoScope } from "./lib/message-crypto";
import { ClubList, ClubDetail, Makers, Workspace } from "./ClubPages";
import { Wall, Messages } from "./SocialPages";
import { Calendar, Profile, Settings, Booking } from "./PersonalPages";
import "./styles.css";
function App() {
  const data = useCampus(),
    [page, setPage] = useState("home"),
    [club, setClub] = useState(null),
    [auth, setAuth] = useState(false),
    [modal, setModal] = useState(null),
    [search, setSearch] = useState(null),
    [toast, setToast] = useState("");
  const [compact, setCompact] = useState(localStorage.getItem("club-compact") === "true"),
    [reduced, setReduced] = useState(localStorage.getItem("club-reduced") === "true");
  useEffect(() => setCryptoScope(data.info.server || "production"), [data.info.server]);
  const navigate = (p) => {
    setPage(p);
    setModal(null);
    document.querySelector(".content")?.scrollTo(0, 0);
  };
  const showClub = (c) => {
    setClub(c);
    navigate("club");
  };
  const login = () => setAuth(true);
  const ui = { data, navigate, showClub, login, toast: setToast };
  useEffect(() => {
    const f = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch("");
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    localStorage.setItem("club-compact", compact);
    localStorage.setItem("club-reduced", reduced);
  }, [compact, reduced]);
  const recommended = [...data.clubs]
    .sort((a, b) => Number(b.greatClub) - Number(a.greatClub))
    .slice(0, 4);
  return (
    <UI.Provider value={ui}>
      <div className={`app ${compact ? "compact" : ""} ${reduced ? "reduced" : ""}`}>
        <div className="titlebar">
          <span>上海青浦世外高级中学 · 社团管理平台</span>
          <span className="titlebar-tag">CAMPUS DESKTOP</span>
        </div>
        <div className="app-layout">
          <Sidebar page={page} navigate={navigate} data={data} />
          <div className="workspace">
            <WorkspaceHeader data={data} onSearch={() => setSearch("")} navigate={navigate} />
            <main className={`content page-${page}`} key={data.info.server || "production"}>
              {data.error && (
                <div className="error-banner" role="alert">
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
                        {new Date().getHours() < 12
                          ? "上午好"
                          : new Date().getHours() < 18
                            ? "下午好"
                            : "晚上好"}
                        {data.user ? "，" + data.user.name : ""}
                        <span className="wave">✦</span>
                      </h1>
                      <p>在这里，找到热爱，也找到同频的人。</p>
                    </div>
                    <div className="today">
                      <span>
                        {new Intl.DateTimeFormat("zh-CN", {
                          month: "long",
                          day: "numeric",
                          weekday: "long",
                        }).format(new Date())}
                      </span>
                      <small>每一份热爱，都值得被看见</small>
                    </div>
                  </div>
                  <div className="summary-row">
                    {[
                      [Stack, "加入的社团", data.mine.length, "个", "mine"],
                      [CalendarBlank, "本月日程", data.events.length, "项", "calendar"],
                      [CheckSquare, "未读通知", data.unread, "条", "messages"],
                    ].map(([Icon, title, count, unit, target]) => (
                      <button className="summary-card" key={title} onClick={() => navigate(target)}>
                        <span className="summary-icon">
                          <Icon size={25} />
                        </span>
                        <div>
                          <span>{title}</span>
                          <strong>
                            {data.user ? count : "—"}
                            <small>{unit}</small>
                          </strong>
                        </div>
                        <CaretRight size={17} />
                      </button>
                    ))}
                    <Action
                      className="create-button"
                      onClick={() => (data.user ? navigate("workspace") : login())}
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
                        onOpen={(n) => setModal({ type: "notice", value: n })}
                      />
                    </Panel>
                    <Panel
                      title="近期日程"
                      icon={CalendarBlank}
                      action="查看日历"
                      onAction={() => navigate("calendar")}
                    >
                      <Timeline
                        events={data.events}
                        user={data.user}
                        onOpen={(e) => setModal({ type: "event", value: e })}
                      />
                    </Panel>
                  </div>
                  <Panel
                    title="推荐社团"
                    icon={Star}
                    action="浏览全部"
                    onAction={() => navigate("discover")}
                    className="recommended"
                  >
                    {recommended.length ? (
                      <div className="club-grid">
                        {recommended.map((c) => (
                          <ClubCard
                            key={c.id}
                            club={c}
                            base={data.info.baseURL}
                            onOpen={showClub}
                          />
                        ))}
                      </div>
                    ) : (
                      <Empty title={data.loading ? "正在同步校园社团" : "暂无可显示的社团"} />
                    )}
                  </Panel>
                  <div className="home-shortcuts">
                    {[
                      ["creativity", "创造 · 让想法发光"],
                      ["activity", "活动 · 让校园生动"],
                      ["service", "服务 · 让善意发生"],
                      ["study", "学术 · 让好奇延续"],
                    ].map(([p, title]) => (
                      <button key={p} onClick={() => navigate(p)}>
                        <span>{title}</span>
                        <ArrowUpRight size={17} />
                      </button>
                    ))}
                  </div>
                </>
              )}
              {(page === "discover" || page === "mine" || categories[page]) && (
                <ClubList
                  key={page}
                  category={categories[page] ? page : "all"}
                  mine={page === "mine"}
                />
              )}
              {page === "club" && club && <ClubDetail key={club.id} club={club} />}{" "}
              {page === "calendar" && <Calendar />}
              {page === "wall" && <Wall />}
              {page === "messages" && <Messages />}
              {page === "workspace" && <Workspace />}
              {page === "booking" && <Booking />}
              {page === "makers" && <Makers />}
              {page === "profile" && <Profile />}
              {page === "settings" && (
                <Settings
                  compact={compact}
                  setCompact={setCompact}
                  reduced={reduced}
                  setReduced={setReduced}
                />
              )}
            </main>
            <StatusFooter data={data} />
          </div>
        </div>
        {auth && <Auth onClose={() => setAuth(false)} />}{" "}
        {search !== null && (
          <Modal title="搜索校园" onClose={() => setSearch(null)} wide>
            <label className="command-input">
              <MagnifyingGlass size={22} />
              <input
                autoFocus
                placeholder="搜索社团、你的日程或公告…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                    <small>{categories[c.clubClass]}</small>
                  </div>
                  <ArrowUpRight size={17} />
                </button>
              ))}
              {search &&
                [
                  ...data.events.map((e) => ({ ...e, type: "event" })),
                  ...data.notices.map((e) => ({ ...e, type: "notice" })),
                ]
                  .filter((e) => e.title.includes(search))
                  .slice(0, 5)
                  .map((e, i) => (
                    <button
                      className="search-result"
                      key={"e" + i}
                      onClick={() => {
                        setSearch(null);
                        setModal({ type: e.type, value: e });
                      }}
                    >
                      <CalendarBlank size={19} />
                      {e.title}
                    </button>
                  ))}
              {search &&
                !data.clubs.some((c) =>
                  `${c.clubName} ${c.clubNameEn} ${c.sortDescription}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                ) &&
                ![...data.events, ...data.notices].some((e) => e.title.includes(search)) && (
                  <Empty title="没有找到结果" detail="换个关键词再试试" />
                )}
            </div>
            <p className="search-hint">搜索已同步的内容 · Esc 关闭</p>
          </Modal>
        )}
        {modal && (
          <Modal
            title={modal.type === "event" ? "日程详情" : "校园公告"}
            onClose={() => setModal(null)}
          >
            {modal.type === "notices" ? (
              <AnnouncementList
                items={data.notices}
                onOpen={(n) => setModal({ type: "notice", value: n })}
              />
            ) : (
              <>
                <h3 className="detail-title">{modal.value.title}</h3>
                {modal.type === "event" && (
                  <>
                    <p className="detail-text">
                      {modal.value.start?.replace("T", " ")} — {modal.value.end?.slice(11, 16)}
                    </p>
                    <p className="detail-text">{modal.value.description || "暂无补充说明"}</p>
                    <Action secondary onClick={() => navigate("calendar")}>
                      打开软件日历
                    </Action>
                  </>
                )}
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
    </UI.Provider>
  );
}
createRoot(document.getElementById("root")).render(<App />);
