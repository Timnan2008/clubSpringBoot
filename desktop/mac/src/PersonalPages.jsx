import React, { useState } from "react";
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Plus,
  ShieldCheck,
  GearSix,
  Racquet,
  UserCircle,
} from "@phosphor-icons/react";
import { Action, Empty, Modal, Panel } from "./components";
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
import { bridge, eventStatus } from "./data";
import { Gate, ActivityForm } from "./ClubPages";
import { AppearanceSettings } from "./Appearance";
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function Calendar() {
  const ui = useUI();
  return ui.data.user ? (
    <CalendarInside />
  ) : (
    <>
      <Heading title="活动日程" detail="社团活动与自己的安排，都在一个地方。" />
      <Gate />
    </>
  );
}
function CalendarInside() {
  const ui = useUI(),
    [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
    [selected, setSelected] = useState(""),
    [modal, setModal] = useState(null);
  const from = iso(month),
    to = iso(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  const r = useResource("calendar", { from, to });
  const events = r.data?.events || [];
  const offset = (month.getDay() + 6) % 7,
    days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    today = iso(new Date());
  const items = selected
    ? events.filter((e) => e.start.slice(0, 10) <= selected && e.end.slice(0, 10) >= selected)
    : events;
  const done = () => {
    setModal(null);
    r.reload();
    ui.data.refresh();
    ui.toast("日程已保存");
  };
  return (
    <>
      <Heading title="活动日程" detail="查看社团活动，添加个人日程。">
        <Action onClick={() => setModal({ type: "new" })}>
          <Plus size={18} />
          添加个人日程
        </Action>
      </Heading>
      <div className="calendar-toolbar">
        <div className="button-row">
          <button
            className="icon-button"
            aria-label="上个月"
            onClick={() => {
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
              setSelected("");
            }}
          >
            <CaretLeft size={19} />
          </button>
          <h2>
            {month.getFullYear()} 年 {month.getMonth() + 1} 月
          </h2>
          <button
            className="icon-button"
            aria-label="下个月"
            onClick={() => {
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
              setSelected("");
            }}
          >
            <CaretRight size={19} />
          </button>
        </div>
        <button
          className="text-button accent"
          onClick={() => {
            setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
            setSelected(today);
          }}
        >
          今天
        </button>
      </div>
      <ResourceState resource={r}>
        <div className="native-calendar">
          <div className="weekdays">
            {"一二三四五六日".split("").map((x) => (
              <span key={x}>周{x}</span>
            ))}
          </div>
          <div className="month-grid">
            {Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => {
              const day = i - offset + 1;
              if (day < 1 || day > days) return <div key={i} className="calendar-day blank" />;
              const date = iso(new Date(month.getFullYear(), month.getMonth(), day)),
                eventsOnDay = events.filter(
                  (e) => e.start.slice(0, 10) <= date && e.end.slice(0, 10) >= date,
                );
              return (
                <button
                  key={i}
                  className={`calendar-day ${date === today ? "today" : ""} ${selected === date ? "selected" : ""}`}
                  onClick={() => setSelected(selected === date ? "" : date)}
                >
                  <b>{day}</b>
                  {eventsOnDay.slice(0, 2).map((e) => (
                    <span
                      className={`calendar-event ${e.kind === "club" ? "club" : ""}`}
                      key={e.id}
                    >
                      {e.title}
                    </span>
                  ))}
                  {eventsOnDay.length > 2 && <small>+{eventsOnDay.length - 2} 项</small>}
                </button>
              );
            })}
          </div>
        </div>
        <Panel
          title={selected ? selected + " 的日程" : "本月安排"}
          icon={CalendarBlank}
          action={selected ? "显示本月全部" : undefined}
          onAction={() => setSelected("")}
        >
          {items.length ? (
            items.map((e) => (
              <button
                key={e.id}
                className="native-row event-list-row"
                onClick={() => setModal({ type: "detail", event: e })}
              >
                <span className="date-tile">
                  <b>{e.start.slice(8, 10)}</b>
                  <small>{e.start.slice(5, 7)} 月</small>
                </span>
                <div>
                  <strong>{e.title}</strong>
                  <p>
                    {dateText(e.start)} — {e.end.slice(11, 16)}
                    {e.location ? " · " + e.location : ""}
                  </p>
                </div>
                <span className="status">{eventStatus(e)}</span>
              </button>
            ))
          ) : (
            <Empty title="这段时间没有日程" detail="点击“添加日程”安排活动。" />
          )}
        </Panel>
      </ResourceState>
      {modal && (
        <Modal
          title={
            modal.type === "detail"
              ? "日程详情"
              : modal.type === "edit"
                ? "修改日程"
                : "添加个人日程"
          }
          onClose={() => setModal(null)}
        >
          {modal.type === "detail" ? (
            <>
              <h3 className="detail-title">{modal.event.title}</h3>
              <p className="detail-text">
                {dateText(modal.event.start)} — {dateText(modal.event.end)}
              </p>
              <p className="detail-text">
                {modal.event.location || "未填写地点"}
                {modal.event.clubName ? " · " + modal.event.clubName : ""}
              </p>
              <p className="long-copy">{modal.event.description || "没有补充说明"}</p>
              {modal.event.kind !== "club" && (
                <div className="modal-actions">
                  <Action secondary onClick={() => setModal({ ...modal, type: "edit" })}>
                    修改日程
                  </Action>
                  <Action secondary onClick={() => setModal({ ...modal, type: "delete" })}>
                    删除日程
                  </Action>
                </div>
              )}
            </>
          ) : modal.type === "delete" ? (
            <>
              <p className="detail-text">确定删除“{modal.event.title}”吗？</p>
              <Form
                label="确认删除"
                onSubmit={async () => {
                  await write("calendarDelete", { id: modal.event.id });
                  done();
                }}
              />
            </>
          ) : (
            <ActivityForm
              action={modal.type === "edit" ? "calendarEdit" : "calendarAdd"}
              initial={modal.event}
              extra={modal.type === "edit" ? { id: modal.event.id } : {}}
              onDone={done}
            />
          )}
        </Modal>
      )}
    </>
  );
}
export function Profile() {
  const ui = useUI();
  if (!ui.data.user) return <Gate />;
  return (
    <>
      <Heading title="个人资料" detail="查看和修改个人资料。" />
      <div className="profile-layout">
        <Panel title="我的校园账号" icon={UserCircle}>
          <div className="profile-avatar">
            <span className="avatar">{ui.data.user.name?.slice(0, 1) || "我"}</span>
            <h2>{ui.data.user.name}</h2>
            <p>{ui.data.user.nameEn || ""}</p>
            <span className="status">
              {{ user: "学生", teacher: "教师", president: "社长", admin: "管理员" }[
                ui.data.user.role
              ] || "校园成员"}
            </span>
          </div>
        </Panel>
        <Panel title="基本资料" icon={ShieldCheck}>
          <Form
            label="保存资料"
            onSubmit={async (f) => {
              await write("profile", { body: { name: f.get("name"), nameEn: f.get("nameEn") } });
              await ui.data.refresh();
              ui.toast("资料已保存");
            }}
          >
            <Field
              label="中文姓名"
              name="name"
              defaultValue={ui.data.user.name || ""}
              maxLength={50}
              required
            />
            <Field
              label="英文姓名"
              name="nameEn"
              defaultValue={ui.data.user.nameEn || ""}
              maxLength={100}
              required
            />
            <p className="muted">修改后会同步到校园账号，请填写真实姓名。</p>
          </Form>
        </Panel>
      </div>
    </>
  );
}
export function Settings({ compact, setCompact, reduced, setReduced }) {
  const ui = useUI(),
    { data } = ui;
  const [logout, setLogout] = useState(false);
  return (
    <>
      <Heading title="设置" detail="管理账号、外观和显示设置。" />
      <AppearanceSettings />
      <div className="settings-layout">
        <Panel title="账号与连接" icon={ShieldCheck}>
          <Setting
            title={data.user?.name || "尚未登录"}
            detail="原有校园账号，所有操作在软件内完成。"
          >
            <Action secondary onClick={() => (data.user ? ui.navigate("profile") : ui.login())}>
              {data.user ? "个人资料" : "登录账号"}
            </Action>
          </Setting>
          <Setting title="服务地址" detail={data.info.baseURL}>
            <select
              aria-label="选择校园服务器"
              value={data.info.server || "production"}
              onChange={async (e) => {
                try {
                  await bridge.setServer(e.target.value);
                  await data.refresh();
                } catch (e) {
                  ui.toast(e.message);
                }
              }}
            >
              <option value="production">正式校园服务</option>
              <option value="local">本机开发服务</option>
            </select>
          </Setting>
          {data.user && (
            <Setting title="退出账号" detail="退出此软件的校园账号。">
              <Action secondary onClick={() => setLogout(true)}>
                退出账号
              </Action>
            </Setting>
          )}
        </Panel>
        <Panel title="显示与体验" icon={GearSix}>
          <Setting title="紧凑模式" detail="缩小间距，显示更多内容。">
            <Toggle label="紧凑模式" value={compact} onChange={setCompact} />
          </Setting>
          <Setting title="减少动态效果" detail="关闭装饰动画。">
            <Toggle label="减少动态效果" value={reduced} onChange={setReduced} />
          </Setting>
          <Setting
            title="青浦世外社团"
            detail={`${data.info.platform === "win32" ? "Windows" : "Mac"} 客户端 · v${data.info.version || "1.2.1"}`}
          >
            <span className="version-chip">预览版</span>
          </Setting>
        </Panel>
      </div>
      {logout && (
        <Modal title="退出账号" onClose={() => setLogout(false)}>
          <p className="detail-text">确定退出当前校园账号吗？</p>
          <Form
            label="确认退出"
            onSubmit={async () => {
              await bridge.logout();
              setLogout(false);
              await data.refresh();
              ui.navigate("home");
            }}
          />
        </Modal>
      )}
    </>
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
export function Booking() {
  const ui = useUI();
  return ui.data.user ? (
    <BookingInside />
  ) : (
    <>
      <Heading title="羽毛球场预约" detail="查看场地空闲时间和预约记录。" />
      <Gate />
    </>
  );
}
const time = (s) =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(s * 1000));
const bookingStatus = (s) =>
  ({
    pending: "等待分配",
    confirmed: "预约成功",
    cancelled: "已取消",
    unavailable: "未获分配",
    expired: "已过期",
    available: "可预约",
    closed: "暂未开放",
  })[s] || "暂不可约";
function BookingInside() {
  const ui = useUI(),
    r = useResource("booking"),
    mine = useResource("bookings");
  const [tab, setTab] = useState("slots"),
    [court, setCourt] = useState(""),
    [slot, setSlot] = useState(null),
    [cancel, setCancel] = useState(null),
    [ack, setAck] = useState(false);
  const [requestKey, setRequestKey] = useState("");
  const calendar = r.data?.calendar;
  const policy = calendar?.policy?.settings;
  const selectedCourt = court || String(calendar?.courts?.[0]?.id || "");
  return (
    <>
      <Heading title="羽毛球场预约" detail="选择日期和时段，预约羽毛球场。" />
      <div className="tabs section-tabs">
        <button className={tab === "slots" ? "active" : ""} onClick={() => setTab("slots")}>
          预约场地
        </button>
        <button className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}>
          我的预约
        </button>
      </div>
      {tab === "mine" ? (
        <ResourceState resource={mine}>
          {mine.data?.length ? (
            mine.data.map((b) => (
              <div className="native-row booking-row" key={b.id}>
                <Racquet size={25} />
                <div>
                  <strong>{b.courtName}</strong>
                  <p>
                    {time(b.start)} — {time(b.end)}
                  </p>
                </div>
                <span className="status">{bookingStatus(b.status)}</span>
                {["pending", "confirmed"].includes(b.status) && b.start * 1000 > Date.now() && (
                  <Action secondary onClick={() => setCancel(b)}>
                    取消预约
                  </Action>
                )}
              </div>
            ))
          ) : (
            <Empty title="还没有预约记录" />
          )}
        </ResourceState>
      ) : (
        <ResourceState resource={r}>
          {calendar && policy ? (
            <>
              <div className="booking-banner">
                <Racquet size={30} />
                <div>
                  <strong>选一个时间，把自己交给球场</strong>
                  <p>
                    每次 {policy.slotMinutes} 分钟 · 每周最多 {policy.weeklyLimit} 次 ·{" "}
                    {calendar.teacher
                      ? "教师预约"
                      : calendar.studentOpen
                        ? "学生预约已开放"
                        : "学生预约暂未开放"}
                  </p>
                </div>
              </div>
              <div className="filter-tabs">
                {calendar.courts.map((c) => (
                  <button
                    key={c.id}
                    className={selectedCourt === String(c.id) ? "active" : ""}
                    onClick={() => setCourt(String(c.id))}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="booking-table-wrap">
                <table className="booking-table">
                  <thead>
                    <tr>
                      <th>时间</th>
                      {calendar.dates.map((d) => (
                        <th key={d}>{d.slice(5)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calendar.times.map((t) => (
                      <tr key={t}>
                        <th>{t}</th>
                        {calendar.dates.map((d) => {
                          const start = Date.parse(d + "T" + t + ":00+08:00") / 1000;
                          const cell = calendar.cells.find(
                            (c) => String(c.courtId) === selectedCourt && c.start === start,
                          );
                          return (
                            <td key={d}>
                              <button
                                disabled={!cell?.canBook}
                                className={`slot ${cell?.mine ? "mine" : ""}`}
                                onClick={() => {
                                  setAck(false);
                                  setRequestKey(crypto.randomUUID());
                                  setSlot(cell);
                                }}
                              >
                                {cell?.mine
                                  ? "我的预约"
                                  : cell?.canBook
                                    ? "预约"
                                    : cell?.status === "confirmed"
                                      ? "已占用"
                                      : "—"}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <Empty
              icon={Racquet}
              title="预约服务暂未接入"
              detail="页面已搬进软件，服务开放后可在这里预约。"
            />
          )}
        </ResourceState>
      )}
      {slot && (
        <Modal title="确认场地预约" onClose={() => setSlot(null)}>
          <h3 className="detail-title">
            {calendar.courts.find((c) => c.id === slot.courtId)?.name}
          </h3>
          <p className="detail-text">
            {time(slot.start)} — {time(slot.end)}
          </p>
          <Form
            label="提交预约"
            disabled={!ack}
            onSubmit={async (f) => {
              const result = await write("booking", {
                body: {
                  courtId: slot.courtId,
                  start: slot.start,
                  end: slot.end,
                  note: f.get("note"),
                  rulesVersion: policy.rulesVersion,
                  requestKey,
                },
              });
              setSlot(null);
              r.reload();
              mine.reload();
              ui.toast(bookingStatus(result.status));
            }}
          >
            <Field label="备注">
              <textarea name="note" rows={3} maxLength={500} />
            </Field>
            <div className="registration-notice">
              <p>
                每次使用 {policy.slotMinutes} 分钟，每周最多 {policy.weeklyLimit}{" "}
                次。请按时到场，不要恶意占用或无故缺席；开始前可以取消。违规会影响后续预约资格。待分配的申请，以最终分配结果为准。
              </p>
            </div>
            <label className="check-label">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              我已阅读并同意预约须知
            </label>
          </Form>
        </Modal>
      )}
      {cancel && (
        <Modal title="取消预约" onClose={() => setCancel(null)}>
          <p className="detail-text">确定取消 {time(cancel.start)} 的预约吗？</p>
          <Form
            label="确认取消"
            onSubmit={async () => {
              await write("bookingCancel", { id: cancel.id });
              setCancel(null);
              r.reload();
              mine.reload();
              ui.toast("预约已取消");
            }}
          />
        </Modal>
      )}
    </>
  );
}
