import React from "react";
import DarkVeil from "./site/DarkVeil";
import { ArrowUpRight, CaretRight, Megaphone } from "@phosphor-icons/react";
import { useUI } from "./ui";
import { Action, ClubCard, AnnouncementList, Timeline, Empty } from "./components";

export default function Home({ onNotice, onNotices, onEvent, reduced }) {
  const { data, navigate, showClub } = useUI();
  const featured = data.clubs.filter((c) => c.greatClub).slice(0, 6);
  const recommended = featured.length ? featured : data.clubs.slice(0, 6);
  return (
    <div className="site-home">
      <section className="site-home-hero">
        <div className="site-home-backdrop" aria-hidden="true">
          {!reduced && <DarkVeil speed={0.4} resolutionScale={0.5} verticalOffset={0.6} />}
        </div>
        <small>QPWFLHS CLUBS</small>
        <h1>让热爱，成为校园日常</h1>
        <p>加入喜欢的社团，遇见同频的伙伴，一起创造课堂之外的精彩。</p>
        <Action onClick={() => navigate("discover")}>
          浏览全部社团
          <ArrowUpRight size={18} />
        </Action>
      </section>
      {!!data.notices.length && (
        <section className="site-home-notices">
          <div className="section-heading">
            <h2>
              <Megaphone size={21} />
              公告栏
            </h2>
            <button className="text-button" onClick={onNotices}>
              全部公告
              <CaretRight size={14} />
            </button>
          </div>
          <AnnouncementList items={data.notices} onOpen={onNotice} loading={data.loading} />
        </section>
      )}
      <section className="site-home-clubs">
        <div className="section-heading">
          <h2>优秀社团展示</h2>
          <button className="text-button" onClick={() => navigate("discover")}>
            全部社团
            <ArrowUpRight size={16} />
          </button>
        </div>
        {recommended.length ? (
          <div className="home-club-grid">
            {recommended.map((c) => (
              <ClubCard key={c.id} club={c} base={data.info.baseURL} onOpen={showClub} />
            ))}
          </div>
        ) : (
          <Empty title={data.loading ? "正在加载社团…" : "暂无社团"} />
        )}
      </section>
      {data.user && data.events.length > 0 && (
        <section className="site-home-events">
          <div className="section-heading">
            <h2>近期日程</h2>
            <button className="text-button" onClick={() => navigate("calendar")}>
              我的日历
              <CaretRight size={14} />
            </button>
          </div>
          <Timeline events={data.events} user={data.user} onOpen={onEvent} />
        </section>
      )}
    </div>
  );
}
