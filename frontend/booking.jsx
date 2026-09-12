import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowClockwise, X, CalendarBlank, Clock, CheckCircle } from "@phosphor-icons/react";
import CardNav from "./CardNav";
import { en, tx } from "./language";
import AeroShards from "../booking/school/aero-shards/AeroShards.jsx";
import "./booking.css";

const messages = {
  INVALID_SLOT: ["请选择开放时段内的完整预约。", "Choose a complete slot within opening hours."],
  NEXT_WEEK_ONLY: ["只能预约下一周的开放日期。", "Only next week's available dates can be booked."],
  STUDENT_WINDOW_CLOSED: ["当前不在学生预约开放时间内。", "Student booking is currently closed."],
  WEEKLY_LIMIT: ["已达到本周预约次数上限。", "Your weekly booking limit has been reached."],
  DAILY_LIMIT: [
    "这一天已有预约或教师排队申请。",
    "You already have a booking or pending request on this date.",
  ],
  SLOT_TAKEN: [
    "这个时段刚刚被预约，请选择其他时段。",
    "This slot was just booked. Please choose another.",
  ],
  RULES_ACK_REQUIRED: [
    "预约须知已更新，请刷新后重新确认。",
    "Booking rules changed. Refresh and confirm them again.",
  ],
  COURT_UNAVAILABLE: ["该场地暂未开放。", "This court is unavailable."],
  NOTE_TOO_LONG: ["备注不能超过 500 字。", "Notes must be 500 characters or fewer."],
  REQUEST_KEY_REUSED: [
    "本次提交内容已改变，请关闭弹窗后重试。",
    "This submission changed. Close this dialog and try again.",
  ],
};
const statusName = (status) =>
  ({
    confirmed: tx("预约成功", "Confirmed"),
    pending: tx("教师挂起", "Teacher pending"),
    unavailable: tx("未获分配", "Not allocated"),
    cancelled: tx("已取消", "Cancelled"),
  })[status] || status;
const dateText = (seconds) =>
  new Intl.DateTimeFormat(en ? "en-GB" : "zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(seconds * 1000));
const timeText = (seconds) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(seconds * 1000));
async function api(path = "", options = {}) {
  const response = await fetch("/api/booking" + path, { cache: "no-store", ...options });
  if (response.status === 401) {
    location.assign("/page/user/login?next=%2Fpage%2Fbooking");
    throw Error(tx("请先登录", "Please sign in"));
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Error(
      messages[data.code]
        ? tx(...messages[data.code])
        : data.message ||
            tx("预约服务暂时不可用，请重试。", "Booking service is unavailable. Please retry."),
    );
  return data;
}
function BookingDialog({ cell, data, onClose, onSaved }) {
  const dialog = useRef(null);
  const requestKey = useRef(crypto.randomUUID());
  const [note, setNote] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current.showModal();
  }, []);
  const policy = data.calendar.policy.settings;
  const submit = async (event) => {
    event.preventDefault();
    if (busy || !acknowledged) return;
    setBusy(true);
    setError("");
    try {
      const response = await api("/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Workspace-Token": data.token },
        body: JSON.stringify({
          courtId: cell.courtId,
          start: cell.start,
          end: cell.end,
          note,
          rulesVersion: policy.rulesVersion,
          requestKey: requestKey.current,
        }),
      });
      setResult(response);
      onSaved();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="booking-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current && !busy) onClose();
      }}
    >
      <div className="booking-dialog-inner">
        <button
          type="button"
          className="booking-close"
          aria-label={tx("关闭", "Close")}
          disabled={busy}
          onClick={onClose}
        >
          <X size={22} />
        </button>
        {result ? (
          <div className="booking-result">
            <CheckCircle size={40} />
            <h2>{statusName(result.status)}</h2>
            <p>
              {result.status === "pending"
                ? tx(
                    "学生优先时段结束后，系统会自动按申请顺序分配空位。无需保持网页在线，可在“我的预约”查看结果。",
                    "After the student priority window, available slots are allocated in request order. You can leave this page and check My bookings later.",
                  )
                : result.status === "unavailable"
                  ? tx(
                      "该时段已被占用，本次申请未获分配。",
                      "This slot was occupied and your request was not allocated.",
                    )
                  : tx(
                      "已为你保留该时段。请准时到场。",
                      "Your slot is reserved. Please arrive on time.",
                    )}
            </p>
            <button className="booking-primary" onClick={onClose}>
              {tx("完成", "Done")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="booking-eyebrow">{tx("确认预约", "CONFIRM BOOKING")}</p>
            <h2>{dateText(cell.start)}</h2>
            <p className="booking-selected-time">
              <Clock size={19} />
              {timeText(cell.start)} – {timeText(cell.end)}
            </p>
            <p>
              {tx("预约人", "Booked by")}：
              {en ? data.account.nameEn || data.account.name : data.account.name}
            </p>
            <label className="booking-field">
              {tx("备注（选填）", "Note (optional)")}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
                disabled={busy}
              />
            </label>
            <div className="booking-rules">
              <h3>{tx("预约须知", "Court-use rules")}</h3>
              <p>
                {tx(
                  "请按时使用场地，不得恶意占场或预约后无故缺席。违规将被禁止预约三楼场地。普通预约提交后不能自行修改或删除，请确认日期和时间。",
                  "Use the court on time. Deliberately holding slots or failing to attend may result in a booking ban. Submitted bookings cannot be edited or deleted by the requester. Check your date and time.",
                )}
              </p>
              {data.calendar.teacher && (
                <p>
                  {tx(
                    "教师申请先进入队列，周日学生开放时段结束后自动分配。",
                    "Teacher requests enter a queue and are allocated after the student window closes on Sunday.",
                  )}
                </p>
              )}
              <label className="booking-ack">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  disabled={busy}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                />
                {tx("我已阅读并确认以上须知", "I have read and accept these rules")}
              </label>
            </div>
            {error && (
              <p className="booking-error" role="alert">
                {error}
              </p>
            )}
            <button className="booking-primary" disabled={!acknowledged || busy}>
              {busy
                ? tx("正在提交…", "Submitting…")
                : data.calendar.teacher
                  ? tx("提交教师申请", "Submit teacher request")
                  : tx("确认预约", "Confirm booking")}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}
function Booking() {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [cell, setCell] = useState(null),
    [mine, setMine] = useState(null),
    [tab, setTab] = useState("week"),
    [refreshing, setRefreshing] = useState(false);
  const active = useRef(true),
    calendarRequest = useRef(0);
  const load = async () => {
    const sequence = ++calendarRequest.current;
    setRefreshing(true);
    try {
      const next = await api();
      if (active.current && sequence === calendarRequest.current) {
        setData(next);
        setError("");
      }
    } catch (failure) {
      if (active.current && sequence === calendarRequest.current) setError(failure.message);
    } finally {
      if (active.current && sequence === calendarRequest.current) setRefreshing(false);
    }
  };
  const loadMine = () =>
    api("/mine")
      .then((items) => {
        if (active.current) setMine(items);
      })
      .catch((failure) => {
        if (active.current) setError(failure.message);
      });
  useEffect(() => {
    active.current = true;
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, 15000);
    return () => {
      active.current = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (tab !== "mine") return;
    loadMine();
    const timer = setInterval(() => {
      if (!document.hidden) loadMine();
    }, 15000);
    return () => clearInterval(timer);
  }, [tab]);
  const calendar = data?.calendar,
    policy = calendar?.policy.settings;
  return (
    <>
      <div className="booking-background" aria-hidden="true">
        <AeroShards
          backgroundColor="#120F17"
          shardColor="#896ABD"
          accentColor="#A855F7"
          placement="full"
          flow="stream"
          material="pearl"
          detail="balanced"
          effect="none"
          speed={0.45}
          density={1.5}
          shardSize={1.1}
          glow={0}
          edgeSoftness={2}
          bloom={0}
          grain={0}
          chromaticAberration={0}
          interaction="repel"
          interactionRadius={1.5}
          interactionStrength={0.5}
          rippleIntensity={1}
          holdToGather
        />
      </div>
      <CardNav account={data?.account} accountLoading={!data} />
      <main className="booking-main">
        <header className="booking-heading">
          <div>
            <p className="booking-eyebrow">{tx("校园运动 · 试运行", "CAMPUS SPORTS · TRIAL")}</p>
            <h1>{tx("羽毛球场预约", "Book a badminton court")}</h1>
            <p>
              {policy && tx("试运行阶段仅开放午休和晚间休息时段：", "Trial opening hours: ")}
              {policy?.periods
                .map((period) => `${period.start.slice(0, 5)}–${period.end.slice(0, 5)}`)
                .join(" / ")}
            </p>
          </div>
          <button
            className="booking-refresh"
            disabled={refreshing}
            onClick={() => {
              load();
              if (tab === "mine") loadMine();
            }}
            aria-label={tx("刷新预约", "Refresh bookings")}
          >
            <ArrowClockwise size={23} />
          </button>
        </header>
        {error && (
          <p role="alert" className="booking-error">
            {error}
          </p>
        )}
        {!data ? (
          <p className="booking-loading">
            {tx("正在读取场地和预约…", "Loading courts and bookings…")}
          </p>
        ) : (
          <>
            <div className="booking-toolbar">
              <div className="booking-tabs">
                <button aria-pressed={tab === "week"} onClick={() => setTab("week")}>
                  {tx("下周时段", "Next week")}
                </button>
                <button aria-pressed={tab === "mine"} onClick={() => setTab("mine")}>
                  {tx("我的预约", "My bookings")}
                </button>
              </div>
              <span>
                {policy.slotMinutes}
                {tx(" 分钟 / 次", " min / slot")} ·{" "}
                {tx(
                  `每周最多 ${policy.weeklyLimit} 次，每天 ${policy.dailyLimit} 次`,
                  `Up to ${policy.weeklyLimit} per week, ${policy.dailyLimit} per day`,
                )}
              </span>
            </div>
            <p className="booking-window">
              {calendar.teacher
                ? tx("教师申请进入挂起队列，周日 ", "Teacher requests wait until Sunday ") +
                  policy.teacherDeadline.slice(0, 5) +
                  tx(" 后自动分配空位。", " for automatic allocation.")
                : tx("学生预约开放：", "Student booking opens ") +
                  policy.studentOpenDays
                    .map(
                      (day) =>
                        (en
                          ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
                          : ["周一", "周二", "周三", "周四", "周五", "周六", "周日"])[day - 1],
                    )
                    .join(en ? ", " : "、") +
                  " " +
                  policy.studentOpen.slice(0, 5) +
                  "–" +
                  policy.studentClose.slice(0, 5) +
                  (calendar.studentOpen
                    ? tx(" · 现在可以预约", " · Open now")
                    : tx(" · 当前未开放", " · Currently closed"))}
            </p>
            {tab === "week" ? (
              calendar.courts.map((court) => (
                <section key={court.id} className="booking-court">
                  <h2>
                    <CalendarBlank size={21} />
                    {en ? court.nameEn : court.name}
                  </h2>
                  <div
                    className="booking-table-scroll"
                    tabIndex={0}
                    aria-label={tx(
                      "预约时间表，可左右滚动",
                      "Booking timetable, scroll horizontally",
                    )}
                  >
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">{tx("时间", "Time")}</th>
                          {calendar.dates.map((date) => (
                            <th scope="col" key={date}>
                              {dateText(Date.parse(date + "T00:00:00+08:00") / 1000)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {calendar.times.map((time) => (
                          <tr key={time}>
                            <th scope="row">
                              {time}
                              <small>
                                {policy.slotMinutes}
                                {tx(" 分钟", " min")}
                              </small>
                            </th>
                            {calendar.dates.map((date) => {
                              const start = Date.parse(date + "T" + time + ":00+08:00") / 1000;
                              const slot = calendar.cells.find(
                                (item) => item.courtId === court.id && item.start === start,
                              );
                              return (
                                <td
                                  key={date}
                                  className={
                                    slot?.mine
                                      ? "is-mine"
                                      : slot?.status === "confirmed"
                                        ? "is-taken"
                                        : ""
                                  }
                                >
                                  {slot && (
                                    <>
                                      <button
                                        disabled={!slot.canBook}
                                        onClick={() => setCell(slot)}
                                        aria-label={`${date} ${time} ${tx("预约", "Book")}`}
                                      >
                                        {slot.mine
                                          ? tx("我的预约", "My booking")
                                          : slot.status === "confirmed"
                                            ? tx("已预约", "Booked")
                                            : tx("预约", "Book")}
                                      </button>
                                      {slot.pending > 0 && (
                                        <small className="booking-pending">
                                          {tx("教师挂起", "Teacher pending")} · {slot.pending}
                                        </small>
                                      )}
                                    </>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))
            ) : (
              <section className="booking-history">
                <h2>{tx("我的预约记录", "My booking history")}</h2>
                {mine === null ? (
                  <p>{tx("正在载入…", "Loading…")}</p>
                ) : mine.length === 0 ? (
                  <p>{tx("还没有预约记录。", "No bookings yet.")}</p>
                ) : (
                  mine.map((item) => (
                    <article key={item.id}>
                      <div>
                        <h3>
                          {dateText(item.start)} · {timeText(item.start)}–{timeText(item.end)}
                        </h3>
                        <p>{en ? item.courtNameEn : item.courtName}</p>
                        {item.note && <p>{item.note}</p>}
                      </div>
                      <span className={`booking-status ${item.status}`}>
                        {statusName(item.status)}
                      </span>
                    </article>
                  ))
                )}
              </section>
            )}
          </>
        )}
      </main>
      {cell && data && (
        <BookingDialog
          key={`${cell.courtId}-${cell.start}`}
          cell={cell}
          data={data}
          onClose={() => setCell(null)}
          onSaved={() => {
            load();
            loadMine();
          }}
        />
      )}
    </>
  );
}
createRoot(document.getElementById("campus-booking")).render(<Booking />);
