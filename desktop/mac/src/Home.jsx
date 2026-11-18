import React from "react";
import {
  CalendarBlank,
  Stack,
  Bell,
  Plus,
  CaretRight,
  Megaphone,
  ArrowRight,
} from "@phosphor-icons/react";
import { useUI } from "./ui";
import { Action, ClubCard, AnnouncementList, Timeline, Empty, icons } from "./components";
import { categories } from "./data";

export default function Home({ onNotice, onNotices, onEvent }) {
  const { data, navigate, showClub, login } = useUI();
  const recommended = [...data.clubs]
    .sort((a, b) => Number(b.greatClub) - Number(a.greatClub))
    .slice(0, 4);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "上午好" : hour < 18 ? "下午好" : "晚上好";
  const canManage = ["president", "vice_president", "teacher", "admin"].includes(data.user?.role);
  return (
    <div className="home-workbench">
      <div className="home-heading">
        <div>
          <p className="home-date">
            {new Intl.DateTimeFormat("zh-CN", {
              month: "long",
              day: "numeric",
              weekday: "long",
            }).format(new Date())}
          </p>
          <h1>
            {greeting}
            {data.user ? `，${data.user.name}` : ""}
          </h1>
          <p>查看社团消息，安排接下来的校园活动。</p>
        </div>
        <Action
          secondary
          onClick={() =>
            canManage ? navigate("workspace") : data.user ? navigate("calendar") : login()
          }
        >
          <Plus size={16} />
          {canManage ? "创建活动" : "添加日程"}
        </Action>
      </div>
      <div className="overview-strip" aria-label="校园概览">
        {[
          [Stack, "加入的社团", data.mine.length, "个", "mine"],
          [CalendarBlank, "本月日程", data.events.length, "项", "calendar"],
          [Bell, "未读通知", data.unread, "条", "messages"],
        ].map(([Icon, title, count, unit, target]) => (
          <button key={title} onClick={() => navigate(target)}>
            <Icon size={17} />
            <span>{title}</span>
            <strong>
              {data.user ? count : "—"}
              <small>{unit}</small>
            </strong>
            <CaretRight size={13} />
          </button>
        ))}
      </div>
      <div className="home-columns">
        <div className="home-main">
          <section className="home-featured" aria-labelledby="featured-title">
            <div className="section-heading">
              <div>
                <h2 id="featured-title">社团精选</h2>
                <p>来自校园里的 {data.clubs.length || "—"} 个社团</p>
              </div>
              <button className="text-button" onClick={() => navigate("discover")}>
                全部社团
                <ArrowRight size={15} />
              </button>
            </div>
            {recommended.length ? (
              <div className="home-club-grid">
                {recommended.map((club) => (
                  <ClubCard key={club.id} club={club} base={data.info.baseURL} onOpen={showClub} />
                ))}
              </div>
            ) : (
              <Empty title={data.loading ? "正在加载社团" : "暂无社团"} />
            )}
          </section>
          <section className="home-notices" aria-labelledby="notices-title">
            <div className="section-heading">
              <h2 id="notices-title">
                <Megaphone size={18} />
                校园公告
              </h2>
              <button className="text-button" onClick={onNotices}>
                查看全部
                <CaretRight size={14} />
              </button>
            </div>
            <AnnouncementList items={data.notices} loading={data.loading} onOpen={onNotice} />
          </section>
        </div>
        <aside className="home-agenda" aria-label="日程与社团分类">
          <section className="agenda-section">
            <div className="section-heading">
              <h2>近期日程</h2>
              <button className="text-button" onClick={() => navigate("calendar")}>
                日历
                <CaretRight size={14} />
              </button>
            </div>
            <Timeline events={data.events} user={data.user} onOpen={onEvent} />
          </section>
          <section className="category-section">
            <div className="section-heading">
              <h2>按分类浏览</h2>
            </div>
            <div className="category-links">
              {Object.entries(categories).map(([key, title]) => {
                const Icon = icons[key],
                  count = data.clubs.filter((c) => c.clubClass === key).length;
                return (
                  <button key={key} onClick={() => navigate(key)}>
                    <Icon size={18} />
                    <span>{title}</span>
                    <small>{count}</small>
                    <CaretRight size={13} />
                  </button>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
