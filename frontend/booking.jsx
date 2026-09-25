import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowClockwise,
  X,
  CalendarBlank,
  Clock,
  CheckCircle,
  DownloadSimple,
} from "@phosphor-icons/react";
import CardNav from "./CardNav";
import { en, tx } from "./language";
import "./booking.css";

const messages = {
  INVALID_SLOT: ["请选择开放时段内的完整预约。", "Choose a complete slot within opening hours."],
  NEXT_WEEK_ONLY: ["只能预约下一周的开放日期。", "Only next week's available dates can be booked."],
  STUDENT_WINDOW_CLOSED: ["当前不在学生预约开放时间内。", "Student booking is currently closed."],
  WEEKLY_LIMIT: [
    "已达到本周预约或挂起次数上限。",
    "Your weekly booking or pending limit has been reached.",
  ],
  DAILY_LIMIT: [
    "当天预约或挂起次数已达上限。",
    "Your daily booking or pending limit has been reached.",
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
  FORBIDDEN: ["没有权限进行此操作。", "You do not have permission for this action."],
  NOT_FOUND: ["预约不存在或已删除。", "This booking was not found."],
  TOO_LATE: ["已开始的预约不能取消。", "A booking that has started cannot be cancelled."],
  ALREADY_CLOSED: ["该预约无法取消。", "This booking cannot be cancelled."],
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
const shanghaiDate = (seconds) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(seconds * 1000));
const clockText = (time) => (!time ? "" : time.startsWith("23:59:59") ? "24:00" : time.slice(0, 5));
function studentWindowText(calendar, policy) {
  if (calendar.teacher)
    return (
      tx("教师申请进入挂起队列，周日 ", "Teacher requests wait until Sunday ") +
      policy.teacherDeadline.slice(0, 5) +
      tx(" 后自动分配空位。", " for automatic allocation.")
    );
  const openNow = calendar.studentOpen
    ? tx(" · 现在可以预约", " · Open now")
    : tx(" · 当前未开放", " · Currently closed");
  const forceStart = clockText(policy.studentForceOpen);
  const forceEnd = clockText(policy.studentForceClose);
  if (
    policy.studentForceOpenOn &&
    forceStart &&
    forceEnd &&
    shanghaiDate(calendar.serverTime) === policy.studentForceOpenOn
  ) {
    return (
      tx(
        `今日（仅此一天）学生预约开放 ${forceStart}–${forceEnd}`,
        `Today only: student booking ${forceStart}–${forceEnd}`,
      ) + openNow
    );
  }
  if (calendar.studentOpen)
    return tx(
      "学生预约现已开放，可预约下周开放时段。",
      "Student booking is open. You can reserve next week's slots.",
    );
  return (
    tx("学生预约开放：", "Student booking opens ") +
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
    openNow
  );
}
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
function BookingSlot({ slot, date, time, onSelect }) {
  const label = !slot
    ? tx("未开放", "Closed")
    : slot.mine
      ? slot.status === "pending"
        ? tx("我的挂起", "My pending request")
        : tx("我的预约", "My booking")
      : slot.status === "confirmed"
        ? slot.bookedBy || tx("已预约", "Booked")
        : tx("空闲", "Available");
  const detail =
    slot?.status === "confirmed"
      ? tx("已预约", "Booked")
      : slot?.pending > 0
        ? `${tx("教师挂起", "Teacher pending")} · ${slot.pending}${slot.bookedBy ? ` · ${slot.bookedBy}` : ""}`
        : slot && !slot.canBook && !slot.mine
          ? tx("预约暂未开放", "Booking currently closed")
          : "";
  const content = (
    <>
      <span className="booking-slot-label">{label}</span>
      <small title={detail}>{detail || "\u00a0"}</small>
    </>
  );
  return slot?.canBook ? (
    <button
      type="button"
      className="booking-slot is-available"
      onClick={() => onSelect(slot)}
      aria-label={`${date} ${time} ${tx("预约", "Book")}${detail ? ` · ${detail}` : ""}`}
    >
      {content}
    </button>
  ) : (
    <div className={`booking-slot${!slot ? " is-closed" : ""}`}>{content}</div>
  );
}
function BookingList({ items, empty, who, token, now, onChanged, onError }) {
  const [confirming, setConfirming] = useState(0);
  const [busy, setBusy] = useState(0);
  if (items === null) return <p>{tx("正在载入…", "Loading…")}</p>;
  if (items.length === 0) return <p>{empty}</p>;
  const cancel = async (id) => {
    if (busy) return;
    setBusy(id);
    try {
      await api("/reservations/" + id, {
        method: "DELETE",
        headers: { "X-Workspace-Token": token },
      });
      setConfirming(0);
      onChanged?.();
    } catch (failure) {
      setConfirming(0);
      onError?.(failure.message);
    } finally {
      setBusy(0);
    }
  };
  return items.map((item) => {
    const canCancel =
      token && (item.status === "confirmed" || item.status === "pending") && item.start > now;
    return (
      <article key={item.id}>
        <div>
          <h3>
            {dateText(item.start)} · {timeText(item.start)}–{timeText(item.end)}
          </h3>
          <p>{en ? item.courtNameEn : item.courtName}</p>
          {who && (
            <p>
              {item.displayName}
              {item.email ? ` · ${item.email}` : ""}
            </p>
          )}
          {item.note && <p>{item.note}</p>}
        </div>
        <div className="booking-history-side">
          {canCancel &&
            (confirming === item.id ? (
              <>
                <button type="button" disabled={busy === item.id} onClick={() => setConfirming(0)}>
                  {tx("再想想", "Keep it")}
                </button>
                <button
                  type="button"
                  className="booking-cancel-confirm"
                  disabled={busy === item.id}
                  onClick={() => cancel(item.id)}
                >
                  {busy === item.id
                    ? tx("取消中…", "Cancelling…")
                    : tx("确认取消", "Confirm cancel")}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="booking-cancel"
                disabled={busy === item.id}
                onClick={() => setConfirming(item.id)}
              >
                {tx("取消预约", "Cancel booking")}
              </button>
            ))}
          <span className={`booking-status ${item.status}`}>{statusName(item.status)}</span>
        </div>
      </article>
    );
  });
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
                  "每场使用 20 分钟。可预约时段：周一至周三 11:30–12:50、16:30–18:30；周四仅 16:30–18:30；周五仅 11:30–12:50。周四 11:30–13:00 为社团时间，三楼羽毛球馆不对外开放。学生预约开放时间：周六、周日 13:00–19:00，预约的是下周这些场地。教师每周最多挂起 3 次。请按时使用场地，不得恶意占场或预约后无故缺席。违规将被禁止预约三楼场地。开始前可在「我的预约」取消。",
                  "Each booking is 20 minutes. Bookable slots: Mon–Wed 11:30–12:50 and 16:30–18:30; Thursday 16:30–18:30 only; Friday 11:30–12:50 only. Thursday 11:30–13:00 is reserved for clubs; the third-floor hall is closed to public bookings. Student booking is open Saturday and Sunday 13:00–19:00 for next week's courts. Teachers may pending up to 3 times per week. Use the court on time. Deliberately holding slots or failing to attend may result in a booking ban. You can cancel from My bookings before the slot starts.",
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
    [roster, setRoster] = useState(null),
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
  const loadRoster = () =>
    api("/all")
      .then((items) => {
        if (active.current) setRoster(items);
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
  useEffect(() => {
    if (tab !== "all") return;
    loadRoster();
    const timer = setInterval(() => {
      if (!document.hidden) loadRoster();
    }, 15000);
    return () => clearInterval(timer);
  }, [tab]);
  const calendar = data?.calendar,
    policy = calendar?.policy.settings;
  return (
    <>
      <CardNav account={data?.account} accountLoading={!data} />
      <main className="booking-main">
        <header className="booking-heading">
          <div>
            <p className="booking-eyebrow">{tx("校园运动 · 试运行", "CAMPUS SPORTS · TRIAL")}</p>
            <h1>{tx("羽毛球场预约", "Book a badminton court")}</h1>
            <p>
              {tx(
                "可预约时段：周一至周三 11:30–12:50、16:30–18:30；周四仅 16:30–18:30；周五仅 11:30–12:50。周四 11:30–13:00 为社团时间，三楼羽毛球馆不对外开放。学生预约开放时间：周六、周日 13:00–19:00。教师每周最多挂起 3 次。",
                "Bookable slots: Mon–Wed 11:30–12:50 and 16:30–18:30; Thursday 16:30–18:30 only; Friday 11:30–12:50 only. Thursday 11:30–13:00 is reserved for clubs; the third-floor hall is closed to public bookings. Student booking opens Saturday and Sunday 13:00–19:00. Teachers may pending 3 times per week.",
              )}
            </p>
          </div>
          <button
            className="booking-refresh"
            disabled={refreshing}
            onClick={() => {
              load();
              if (tab === "mine") loadMine();
              if (tab === "all") loadRoster();
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
                {calendar.overseer && (
                  <button aria-pressed={tab === "all"} onClick={() => setTab("all")}>
                    {tx("全部预约", "All bookings")}
                  </button>
                )}
              </div>
              {calendar.overseer && (
                <a className="booking-export" href="/api/booking/export.xlsx">
                  <DownloadSimple size={18} />
                  {tx("导出 Excel", "Export Excel")}
                </a>
              )}
              <span>
                {policy.slotMinutes}
                {tx(" 分钟 / 次", " min / slot")} ·{" "}
                {calendar.teacher
                  ? tx(
                      `教师每周最多挂起 ${policy.weeklyLimit} 次`,
                      `Teachers may pending up to ${policy.weeklyLimit} times per week`,
                    )
                  : tx(`每周最多 ${policy.weeklyLimit} 次`, `Up to ${policy.weeklyLimit} per week`)}
              </span>
            </div>
            <p className="booking-window">{studentWindowText(calendar, policy)}</p>
            {tab === "week" ? (
              calendar.courts.map((court) => (
                <section key={court.id} className="booking-court">
                  <h2>
                    <CalendarBlank size={21} />
                    {en ? court.nameEn : court.name}
                  </h2>
                  <p className="booking-table-hint">
                    {tx(
                      "点击空闲时段预约 · 已有预约可在“我的预约”管理",
                      "Select an available slot to book · Manage existing reservations in My bookings",
                    )}
                  </p>
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
                                  <BookingSlot
                                    slot={slot}
                                    date={date}
                                    time={time}
                                    onSelect={setCell}
                                  />
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
            ) : tab === "mine" ? (
              <section className="booking-history">
                <h2>{tx("我的预约记录", "My booking history")}</h2>
                <BookingList
                  items={mine}
                  empty={tx("还没有预约记录。", "No bookings yet.")}
                  token={data.token}
                  now={calendar.serverTime}
                  onChanged={() => {
                    load();
                    loadMine();
                  }}
                  onError={setError}
                />
              </section>
            ) : (
              <section className="booking-history">
                <h2>{tx("全部预约记录", "All booking records")}</h2>
                <BookingList
                  items={roster}
                  empty={tx("还没有预约记录。", "No bookings yet.")}
                  who
                  token={data.token}
                  now={calendar.serverTime}
                  onChanged={() => {
                    load();
                    loadRoster();
                  }}
                  onError={setError}
                />
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
