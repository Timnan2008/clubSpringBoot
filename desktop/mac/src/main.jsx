import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarBlank,
  MagnifyingGlass,
  Buildings,
  ArrowUpRight,
  Minus,
  Square,
  Copy,
  X,
} from "@phosphor-icons/react";
import { AppearanceProvider } from "./Appearance";
import { useCampus, categories } from "./data";
import { Action, Sidebar, WorkspaceHeader, Empty, AnnouncementList, Modal } from "./components";
import { UI } from "./ui";
import Auth from "./Auth";
import Home from "./Home";
import { setCryptoScope } from "./lib/message-crypto";
import { ClubList, ClubDetail, Workspace } from "./ClubPages";
import { Wall, Messages } from "./SocialPages";
import { Calendar, Profile, Settings, Booking } from "./PersonalPages";
import { AdminPages } from "./AdminPages";
import "./styles.css";
import "./theme.css";
import "./workbench.css";
import "./campus-services.css";
function App() {
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    window.clubDesktop.windowAction("state").then(setMaximized);
    return window.clubDesktop.onWindowState(setMaximized);
  }, []);
  const data = useCampus(),
    [page, setPage] = useState("home"),
    [club, setClub] = useState(null),
    [auth, setAuth] = useState(false),
    [modal, setModal] = useState(null),
    [search, setSearch] = useState(null),
    [toast, setToast] = useState("");
  const [compact, setCompact] = useState(localStorage.getItem("club-compact") === "true"),
    [reduced, setReduced] = useState(localStorage.getItem("club-reduced") === "true");
  const recommended = [...data.clubs]
    .sort((a, b) => Number(b.greatClub) - Number(a.greatClub))
    .slice(0, 5);
  useEffect(() => {
    if (data.info.readOnly) setPage("wall");
  }, [data.info.readOnly]);
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
  return (
    <UI.Provider value={ui}>
      <div
        className={`app platform-${data.info.platform || "darwin"} ${compact ? "compact" : ""} ${reduced ? "reduced" : ""}`}
      >
        <div className="app-background" aria-hidden="true" />
        <div
          className="titlebar"
          onDoubleClick={() => window.clubDesktop.windowAction("maximize")}
        >
          <span>上海青浦世外高级中学 · 社团管理平台</span>

          {data.info.platform === "win32" && (
            <div className="window-controls">
              <button
                aria-label="最小化窗口"
                onClick={() => window.clubDesktop.windowAction("minimize")}
              >
                <Minus size={16} />
              </button>
              <button
                aria-label={maximized ? "还原窗口" : "最大化窗口"}
                onClick={() => window.clubDesktop.windowAction("maximize")}
              >
                {maximized ? <Copy size={14} /> : <Square size={14} />}
              </button>
              <button
                aria-label="关闭窗口"
                className="window-close"
                onClick={() => window.clubDesktop.windowAction("close")}
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
        <div className="app-layout">
          <Sidebar page={page} navigate={navigate} data={data} />
          <div className="workspace">
            <WorkspaceHeader
              page={page}
              data={data}
              onSearch={() => setSearch("")}
              navigate={navigate}
            />
            <main
              className={`content page-${page}`}
              key={`${data.info.server || "production"}:${page}`}
            >
              {data.info.readOnly && (
                <div className="preview-banner" role="status">
                  <strong>
                    只读预览 ·{" "}
                    {
                      { student: "学生", teacher: "教师", admin: "管理员" }[
                        data.info.previewRole
                      ]
                    }
                  </strong>
                  <span>本地示例数据 · 不连接校园服务 · 所有提交均被拦截</span>
                </div>
              )}
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
                <Home
                  reduced={reduced}
                  onNotice={(value) => setModal({ type: "notice", value })}
                  onNotices={() => setModal({ type: "notices" })}
                  onEvent={(value) => setModal({ type: "event", value })}
                />
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
              {page === "profile" && <Profile />}
              {["accounts", "moderation", "suggestions", "addClub"].includes(page) && (
                <AdminPages key={page} kind={page} />
              )}
              {page === "settings" && (
                <Settings
                  compact={compact}
                  setCompact={setCompact}
                  reduced={reduced}
                  setReduced={setReduced}
                />
              )}
            </main>
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
createRoot(document.getElementById("root")).render(
  <AppearanceProvider>
    <App />
  </AppearanceProvider>,
);
