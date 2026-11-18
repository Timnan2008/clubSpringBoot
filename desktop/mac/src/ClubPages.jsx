import React, { useState } from "react";
import {
  Buildings,
  ArrowLeft,
  ArrowUpRight,
  Plus,
  Users,
  Star,
  CalendarBlank,
  ShieldCheck,
} from "@phosphor-icons/react";
import { categories, imageURL } from "./data";
import { Action, Panel, Empty, ClubCard, Modal } from "./components";
import {
  Heading,
  Field,
  Form,
  Feedback,
  ResourceState,
  useResource,
  useUI,
  write,
  dateText,
} from "./ui";
const plain = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
export function ClubList({ category = "all", mine = false }) {
  const ui = useUI(),
    { data } = ui;
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState(category);
  const effective = category === "all" ? filter : category;
  const source = mine
    ? data.mine.map((m) => ({
        ...data.clubs.find((c) => String(c.id) === String(m.id)),
        ...m,
        clubName: m.name,
        sortDescription: m.slogan,
      }))
    : data.clubs;
  const list = source.filter(
    (c) =>
      (effective === "all" || c.clubClass === effective) &&
      `${c.clubName} ${c.clubNameEn} ${c.sortDescription}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <Heading
        title={mine ? "我的社团" : categories[effective] || "发现社团"}
        detail={mine ? "查看已加入的社团和最新活动。" : "按类别查找社团，查看介绍和活动。"}
      >
        {mine && (
          <Action secondary onClick={() => ui.navigate("workspace")}>
            <ShieldCheck size={17} />
            社团工作台
          </Action>
        )}
      </Heading>
      {mine && !data.user ? (
        <Gate />
      ) : (
        <>
          <div className="discovery-toolbar">
            <div className="filter-tabs">
              {category === "all" &&
                [["all", "全部"], ...Object.entries(categories)].map(([key, label]) => (
                  <button
                    key={key}
                    className={effective === key ? "active" : ""}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </button>
                ))}
            </div>
            <input
              className="native-search"
              aria-label="搜索社团"
              placeholder="搜索社团名称或简介"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <p className="result-count">{data.loading ? "正在同步社团…" : `${list.length} 个社团`}</p>
          {list.length ? (
            <div className="catalog-grid">
              {list.map((c) => (
                <ClubCard key={c.id} club={c} base={data.info.baseURL} onOpen={ui.showClub} />
              ))}
            </div>
          ) : (
            <Empty
              title={query ? "没有找到相符的社团" : mine ? "还没有加入社团" : "这一类暂时没有社团"}
              detail={query ? "换个关键词再试试" : "有新的社团时，会显示在这里"}
              action={mine ? "去发现社团" : undefined}
              onAction={() => ui.navigate("discover")}
            />
          )}
        </>
      )}
    </>
  );
}
export function Gate({ title = "登录后使用校园服务" }) {
  const ui = useUI();
  return (
    <div className="full-empty">
      <Empty
        icon={ShieldCheck}
        title={title}
        detail="使用原来的校园账号，就能在软件里继续。"
        action="登录校园账号"
        onAction={ui.login}
      />
    </div>
  );
}
export function ClubDetail({ club }) {
  const ui = useUI(),
    r = useResource("club", { id: club.id }),
    status = useResource("join", { id: club.id }, !!ui.data.user);
  const [applying, setApplying] = useState(false),
    [tab, setTab] = useState("intro");
  const c = { ...club, ...(r.data || {}) };
  const joined =
    status.data?.status === "member" || ui.data.mine.some((m) => String(m.id) === String(c.id));
  const pending = status.data?.status === "pending";
  const picture = imageURL(c.clubItem, ui.data.info.baseURL);
  return (
    <>
      <button className="text-button accent back-button" onClick={() => ui.navigate("discover")}>
        <ArrowLeft size={18} />
        返回社团
      </button>
      <section className="club-hero">
        <div className="club-emblem">
          {picture ? (
            <img src={picture} alt="" onError={(e) => (e.target.style.display = "none")} />
          ) : (
            <Buildings size={50} />
          )}
        </div>
        <div className="club-hero-copy">
          <span className="detail-label">
            {categories[c.clubClass] || "校园社团"}
            {c.greatClub ? " / 优秀社团" : ""}
          </span>
          <h1>{c.clubName}</h1>
          <p>{c.clubNameEn}</p>
          <p className="hero-slogan">{c.sortDescription || "查看社团介绍、成员与活动。"}</p>
        </div>
        <div className="club-hero-action">
          <Action
            disabled={joined || pending}
            onClick={() => (ui.data.user ? setApplying(true) : ui.login())}
          >
            {joined ? (
              "已加入"
            ) : pending ? (
              "申请已提交"
            ) : (
              <>
                <Plus size={18} />
                申请加入
              </>
            )}
          </Action>
          {joined && (
            <Action secondary onClick={() => ui.navigate("workspace")}>
              管理与活动
            </Action>
          )}
        </div>
      </section>
      <div className="tabs section-tabs">
        {[
          ["intro", "社团介绍"],
          ["people", "社团负责人"],
        ].map(([key, label]) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      <ResourceState resource={r}>
        {tab === "intro" ? (
          <div className="detail-columns">
            <Panel title="关于这个社团" icon={Buildings}>
              <p className="long-copy">
                {plain(c.clubDescription) || c.sortDescription || "社团还没有填写详细介绍。"}
              </p>
              {c.clubDescriptionEn && (
                <p className="long-copy muted">{plain(c.clubDescriptionEn)}</p>
              )}
              {c.video && imageURL(c.video, ui.data.info.baseURL) && (
                <video
                  className="club-video"
                  src={imageURL(c.video, ui.data.info.baseURL)}
                  controls
                  preload="none"
                />
              )}
            </Panel>
            <Panel title="社团信息" icon={Star}>
              <dl className="info-list">
                <dt>类别</dt>
                <dd>{categories[c.clubClass] || "未分类"}</dd>
                <dt>社长</dt>
                <dd>{c.president || "暂未公布"}</dd>
                <dt>副社长</dt>
                <dd>{c.vicePresident || "暂未公布"}</dd>
                <dt>指导老师</dt>
                <dd>{c.teacher || "暂未公布"}</dd>
                <dt>我的状态</dt>
                <dd>
                  {joined
                    ? "已加入"
                    : pending
                      ? "等待审核"
                      : ui.data.user
                        ? "尚未加入"
                        : "访客浏览"}
                </dd>
              </dl>
            </Panel>
          </div>
        ) : (
          <Panel title="一起把社团做好的人" icon={Users}>
            <div className="leader-grid">
              {[
                ["社长", c.president, c.presidentEn],
                ["副社长", c.vicePresident, c.vicePresidentEn],
                ["指导老师", c.teacher, c.teacherEn],
              ].map(([role, name, en]) => (
                <div className="leader-card" key={role}>
                  <span className="avatar">{(name || "—").slice(0, 1)}</span>
                  <small>{role}</small>
                  <h3>{name || "暂未公布"}</h3>
                  <p>{en || ""}</p>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </ResourceState>
      {applying && (
        <Modal title={`申请加入 · ${c.clubName}`} onClose={() => setApplying(false)}>
          <p className="detail-text">向社团介绍一下你自己，负责人审核后会通知你。</p>
          <Form
            label="提交申请"
            onSubmit={async (f) => {
              await write("join", { id: c.id, body: { note: f.get("note") } });
              setApplying(false);
              status.reload();
              ui.data.refresh();
              ui.toast("申请已提交，等待社团审核");
            }}
          >
            <Field label="想对社团说的话">
              <textarea
                name="note"
                maxLength={1000}
                rows={5}
                placeholder="你的兴趣、想加入的原因…"
              />
            </Field>
          </Form>
        </Modal>
      )}
    </>
  );
}
export function Makers() {
  return (
    <>
      <Heading title="青源智造" detail="查看学生项目和作品。" />
      <Panel title="项目与作品" icon={Buildings}>
        <Empty title="作品内容准备中" detail="这个页面已搬进软件，后续会在这里补充项目。" />
      </Panel>
    </>
  );
}
export function Workspace() {
  const ui = useUI();
  if (!ui.data.user) return <Gate />;
  return <WorkspaceInside />;
}
function WorkspaceInside() {
  const ui = useUI(),
    r = useResource("workspace");
  const [club, setClub] = useState(""),
    [tab, setTab] = useState("overview"),
    [create, setCreate] = useState(false);
  const clubs = r.data?.clubs || [];
  const id = club || String(clubs[0]?.id || "");
  const content = useResource(
    tab === "members" ? "members" : tab === "requests" ? "requests" : "clubWorkspace",
    { id },
    !!id,
  );
  return (
    <>
      <Heading title="社团工作台" detail="在这里管理社团成员、活动和加入申请。">
        {id && (
          <select value={id} aria-label="选择管理社团" onChange={(e) => setClub(e.target.value)}>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </Heading>
      <ResourceState resource={r}>
        {!id ? (
          <Empty title="暂无可以管理的社团" detail="社长、指导老师和获授权的成员可使用工作台。" />
        ) : (
          <>
            <div className="tabs section-tabs">
              {[
                ["overview", "活动与文档"],
                ["members", "成员"],
                ["requests", "入社申请"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={tab === key ? "active" : ""}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <ResourceState resource={content}>
              {tab === "overview" ? (
                <>
                  <Panel
                    title="社团活动"
                    icon={CalendarBlank}
                    action="创建活动"
                    onAction={() => setCreate(true)}
                  >
                    {content.data?.activities?.length ? (
                      content.data.activities.map((e) => (
                        <div className="native-row" key={e.id}>
                          <div>
                            <strong>{e.title}</strong>
                            <p>
                              {dateText(e.start)} · {e.location || "未填地点"}
                            </p>
                          </div>
                          <span className="status">{e.status || "已发布"}</span>
                        </div>
                      ))
                    ) : (
                      <Empty title="还没有活动" detail="点击“创建活动”安排社团活动。" />
                    )}
                  </Panel>
                  <Panel title="社团文档" icon={Buildings}>
                    {content.data?.documents?.length ? (
                      content.data.documents.map((d) => (
                        <div className="native-row" key={d.id}>
                          <strong>{d.title || d.name || "社团文档"}</strong>
                          <span className="muted">附件查看暂未接入</span>
                        </div>
                      ))
                    ) : (
                      <Empty title="暂无社团文档" />
                    )}
                  </Panel>
                </>
              ) : tab === "members" ? (
                <Panel title="社团成员" icon={Users}>
                  {(Array.isArray(content.data) ? content.data : content.data?.members || [])
                    .length ? (
                    (Array.isArray(content.data) ? content.data : content.data.members).map(
                      (m, i) => (
                        <div className="native-row" key={m.id || i}>
                          <span className="avatar">{(m.name || "同").slice(0, 1)}</span>
                          <div>
                            <strong>{m.name || m.username}</strong>
                            <p>{m.nameEn || m.usernameEn || ""}</p>
                          </div>
                          <span className="status">
                            {{ member: "成员", president: "社长", teacher: "老师" }[m.role] ||
                              m.role ||
                              "成员"}
                          </span>
                        </div>
                      ),
                    )
                  ) : (
                    <Empty title="没有可显示的成员" />
                  )}
                </Panel>
              ) : (
                <Panel title="入社申请" icon={ShieldCheck}>
                  {(Array.isArray(content.data) ? content.data : content.data?.requests || [])
                    .length ? (
                    (Array.isArray(content.data) ? content.data : content.data.requests).map(
                      (q) => <RequestRow key={q.id} q={q} club={id} reload={content.reload} />,
                    )
                  ) : (
                    <Empty title="暂时没有待处理申请" />
                  )}
                </Panel>
              )}
            </ResourceState>
          </>
        )}
      </ResourceState>
      {create && (
        <Modal title="创建社团活动" onClose={() => setCreate(false)}>
          <ActivityForm
            action="clubEvent"
            extra={{ club: id }}
            onDone={() => {
              setCreate(false);
              content.reload();
              ui.data.refresh();
              ui.toast("活动已创建");
            }}
          />
        </Modal>
      )}
    </>
  );
}
function RequestRow({ q, club, reload }) {
  const [busy, set] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="request-row">
      <div>
        <strong>{q.name || q.account?.name || q.applicantName || "入社申请"}</strong>
        <p>{q.note || "没有留言"}</p>
      </div>
      <div className="button-row">
        {q.status && q.status !== "pending" ? (
          <span className="status">{q.status === "approved" ? "已通过" : "未通过"}</span>
        ) : (
          [
            ["approved", "通过"],
            ["declined", "不通过"],
          ].map(([status, label]) => (
            <Action
              secondary
              disabled={busy}
              key={status}
              onClick={async () => {
                set(true);
                try {
                  await write("joinReview", { club, id: q.id, body: { status } });
                  reload();
                } catch (e) {
                  setError(e.message);
                } finally {
                  set(false);
                }
              }}
            >
              {label}
            </Action>
          ))
        )}
      </div>
      <Feedback error={error} />
    </div>
  );
}
export function ActivityForm({ action = "calendarAdd", extra = {}, initial = {}, onDone }) {
  return (
    <Form
      label={initial.id ? "保存日程" : "创建活动"}
      onSubmit={async (f) => {
        const start = f.get("start"),
          end = f.get("end");
        if (end <= start) throw Error("结束时间要在开始时间之后");
        await write(action, {
          ...extra,
          body: {
            title: f.get("title"),
            start,
            end,
            location: f.get("location"),
            description: f.get("description"),
            ...(action === "clubEvent"
              ? { participants: Number(f.get("participants")) }
              : {
                  kind: initial.kind || "event",
                  reminderMinutes: initial.reminderMinutes ?? 0,
                  completed: initial.completed ?? false,
                }),
          },
        });
        onDone();
      }}
    >
      <Field
        label="名称"
        name="title"
        required
        maxLength={100}
        defaultValue={initial.title || ""}
      />
      <div className="form-grid">
        <Field
          label="开始时间"
          name="start"
          type="datetime-local"
          required
          defaultValue={initial.start?.slice(0, 16) || ""}
        />
        <Field
          label="结束时间"
          name="end"
          type="datetime-local"
          required
          defaultValue={initial.end?.slice(0, 16) || ""}
        />
      </div>
      <Field label="地点" name="location" maxLength={150} defaultValue={initial.location || ""} />
      {action === "clubEvent" && (
        <Field
          label="预计参加人数"
          name="participants"
          type="number"
          min={0}
          max={5000}
          defaultValue={0}
        />
      )}
      <Field label="说明">
        <textarea
          name="description"
          rows={4}
          maxLength={3000}
          defaultValue={initial.description || ""}
        />
      </Field>
    </Form>
  );
}
