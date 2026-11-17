import React, { useCallback, useMemo, useState } from "react";
import {
  Bell,
  Buildings,
  CalendarBlank,
  CaretDown,
  ChatCircleDots,
  Compass,
  Gear,
  House,
  SignOut,
  Stack,
  UserCircle,
} from "@phosphor-icons/react";
import Avatar from "../Avatar";
import Notifications from "../Notifications";
import PersonalWelcome from "../PersonalWelcome";
import Search from "../Search";
import { changeLanguage, en, tx } from "../language";
import DashboardPage, {
  AnnouncementDetails,
  saveAnnouncementRead,
  WelcomeHeader,
} from "./DashboardPage";
import { useDashboardData } from "./useDashboardData";

const crest = "/other%20photo/WFL-crest.svg";
const home = "/page/desktop";
const accountPage = "/page/user/profile";
const signIn = "/page/user/login";
const calendar = "/page/calendar";
const messages = "/page/messages";
const management = "/page/club/workspace";
const school = tx("上海青浦世外高级中学", "Shanghai Qingpu WFLHS");
const product = tx("社团管理平台", "Club Management");
const desktop = window.clubDesktop;

export function DesktopTitleBar() {
  if (!desktop) return null;
  return (
    <div className="desk-titlebar" data-platform={desktop.platform}>
      <img src={crest} alt="" draggable="false" width="22" height="24" />
      <span>
        {school} · {product}
      </span>
    </div>
  );
}

function Badge({ count, message }) {
  if (!count) return null;
  return (
    <span className={message ? "desk-badge desk-badge-message" : "desk-badge"} aria-hidden="true">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function SidebarNavigation({ dashboard, counts, manager }) {
  const path = location.pathname;
  const entries = [
    [tx("首页", "Home"), home, House, dashboard],
    [
      tx("发现社团", "Discover clubs"),
      "/page/clubs",
      Compass,
      /^\/page\/(clubs(?:\/|$)|club-(type|watch)\/|search$)/.test(path),
    ],
    [tx("我的社团", "My clubs"), "/page/my-clubs", Stack, path === "/page/my-clubs"],
    [tx("活动日程", "Calendar"), calendar, CalendarBlank, path === calendar, counts.tasks],
    [tx("消息", "Messages"), messages, ChatCircleDots, path === messages, counts.messages],
    [tx("设置", "Settings"), accountPage, Gear, path === accountPage || path === "/page/user/home"],
  ];
  if (manager || path === management) {
    entries.push([tx("社团管理", "Manage clubs"), management, Buildings, path === management]);
  }
  return (
    <aside className="desk-sidebar">
      <a className="desk-brand" href={home} aria-label={tx("工作台首页", "Workspace home")}>
        <img src={crest} alt="" width="40" height="46" draggable="false" />
        <span className="desk-nav-copy">
          <strong>{school}</strong>
          <small>SHANGHAI QINGPU WFLHS</small>
        </span>
      </a>
      <nav aria-label={tx("工作台导航", "Workspace navigation")}>
        {entries.map(([label, href, Icon, active, count]) => (
          <a
            className="desk-nav-link"
            href={href}
            key={href}
            aria-current={active ? "page" : undefined}
            aria-label={count ? tx(`${label}，${count} 项`, `${label}, ${count} items`) : label}
            title={label}
          >
            <Icon size={21} aria-hidden="true" />
            <span className="desk-nav-copy">{label}</span>
            <Badge count={count} message={href === messages} />
          </a>
        ))}
      </nav>
    </aside>
  );
}

function UserMenu({ account, manager }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const next = signIn + "?next=" + encodeURIComponent(home);
  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const response = await fetch("/api/user/logout");
      if (!response.ok) throw new Error();
      location.assign(home);
    } catch {
      setBusy(false);
      setError(true);
    }
  }
  return (
    <details
      className="desk-user"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !event.currentTarget.open) return;
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary").focus();
      }}
    >
      <summary aria-label={tx("账户菜单", "Account menu")} title={tx("账户菜单", "Account menu")}>
        {account ? <Avatar person={account} /> : <UserCircle size={27} aria-hidden="true" />}
        <CaretDown size={13} aria-hidden="true" />
      </summary>
      <div className="desk-user-panel">
        {account ? (
          <>
            <strong>{(en && account.nameEn) || account.name}</strong>
            <a href="/page/user/home">{tx("个人主页", "My profile")}</a>
            <a href={accountPage}>{tx("个人资料与设置", "Profile and settings")}</a>
            {manager && <a href={management}>{tx("社团管理", "Manage clubs")}</a>}
            {account.role === "admin" && (
              <a href="/page/user-edit">{tx("账号管理", "Account administration")}</a>
            )}
          </>
        ) : (
          <a href={next}>{tx("登录 / 注册", "Sign in / Register")}</a>
        )}
        <a href="/page/wall">{tx("校园墙", "Campus wall")}</a>
        <a href="/page/booking">{tx("羽毛球场预约", "Badminton booking")}</a>
        <a href="/page/suggestion">{tx("青源智造", "Qingyuan Ideas")}</a>
        <a href="/">{tx("社团官网", "Club website")}</a>
        <button type="button" onClick={changeLanguage}>
          {en ? "简体中文" : "English"}
        </button>
        {account && (
          <button type="button" disabled={busy} onClick={signOut}>
            <SignOut size={16} />
            {busy ? tx("正在退出…", "Signing out…") : tx("退出登录", "Sign out")}
          </button>
        )}
        {error && <p role="alert">{tx("退出失败，请重试", "Sign-out failed. Try again.")}</p>}
      </div>
    </details>
  );
}

function WorkspaceHeader({ dashboard, data, manager, searchItems, onNotice }) {
  const person = data.account.data;
  return (
    <header className="desk-workspace-header">
      {dashboard && <WelcomeHeader en={en} account={data.account} />}
      <div className="desk-tools">
        <Search en={en} desktopSearch localItems={searchItems} onSelectNotice={onNotice} />
        <div className="desk-header-actions">
          {person ? (
            <Notifications enabled desktop />
          ) : (
            <a
              className="desk-notifications-guest"
              href={signIn + "?next=" + encodeURIComponent(home)}
              aria-label={tx("登录后查看通知", "Sign in to view notifications")}
              title={tx("登录后查看通知", "Sign in to view notifications")}
            >
              <Bell size={22} aria-hidden="true" />
            </a>
          )}
          <UserMenu account={person} manager={manager} />
        </div>
      </div>
    </header>
  );
}

export default function AppShell({ dashboard, announcements }) {
  const data = useDashboardData(dashboard, en);
  const [selected, setSelected] = useState(null);
  const clearNotice = useCallback(() => setSelected(null), []);
  const openNotice = (notice) => {
    if (!dashboard) saveAnnouncementRead(notice.id);
    setSelected(notice);
  };
  const manager =
    !!data.workspace.data?.clubs?.length ||
    ["admin", "president", "teacher"].includes(data.account.data?.role) ||
    !!data.account.data?.offices?.length;
  const counts = {
    messages: data.inbox.data,
    tasks: data.calendar.data?.tasks?.length,
  };
  const events = data.calendar.data?.events;
  const searchItems = useMemo(
    () => [
      ...announcements.map((notice) => ({
        id: "notice-" + notice.id,
        name: notice.title,
        brief: notice.type,
        notice,
      })),
      ...(events || [])
        .filter((event) => event.kind === "club")
        .map((event) => ({
          id: "event-" + event.id,
          name: event.title,
          brief: event.clubName,
          keywords: [event.clubNameEn, event.description, event.location].filter(Boolean).join(" "),
          path: calendar,
        })),
    ],
    [announcements, events],
  );
  return (
    <div
      className={`desk-shell${desktop ? " desk-shell-native" : ""}${dashboard ? "" : " desk-shell-legacy"}`}
    >
      <DesktopTitleBar />
      <SidebarNavigation dashboard={dashboard} counts={counts} manager={manager} />
      <div className="desk-workspace">
        <WorkspaceHeader
          dashboard={dashboard}
          data={data}
          manager={manager}
          searchItems={searchItems}
          onNotice={openNotice}
        />
        {dashboard && (
          <main id="desk-content">
            <PersonalWelcome enabled={!!data.account.data} accountId={data.account.data?.id} />
            <DashboardPage
              en={en}
              {...data}
              announcements={announcements}
              selectedAnnouncement={selected}
              onCloseAnnouncement={clearNotice}
            />
          </main>
        )}
      </div>
      {!dashboard && selected && (
        <AnnouncementDetails en={en} announcement={selected} onClose={clearNotice} />
      )}
    </div>
  );
}
