import ActivityFeedbackEditor from "./ActivityFeedbackEditor";
import CallChip from "./CallChip";
import GlideSelect from "./GlideSelect";
import StatusMark from "./StatusMark";
import HoldButton from "./HoldButton";
import PersonIdentity, { realNames, postName } from "./PersonIdentity";
import { localizeTerm } from "./activity-language.mjs";
import { tr, en, tx } from "./language";
import { useEffect, useRef, useState } from "react";
import "./ClubOperations.css";
import Pagination from "./Pagination";
const names = {
    proposal: tr("学期初提案"),
    review: tr("学期末总结与回顾"),
    feedback: tr("活动反馈记录"),
  },
  states = {
    present: tr("已到"),
    leave: tr("请假"),
    absent: tr("缺勤"),
  },
  attendanceOptions = [
    ["absent", states.absent],
    ["present", states.present],
    ["leave", states.leave],
  ];
const defaultProposalWeeks = () => [
  { week: tx("第1–6周（9/7–10/17）", "Week 1–6 / 7 Sep–17 Oct"), plan: "" },
  {
    week: tx("第7周（10/18–10/24，义卖）", "Week 7 / 18–24 Oct (Charity Bazaar)"),
    plan: "",
  },
  {
    week: tx("第8–9周（10/25–11/7，期中）", "Week 8–9 / 25 Oct–7 Nov (Mid-term)"),
    plan: "",
  },
  {
    week: tx("第10–11周（11/8–11/21，AP 考试）", "Week 10–11 / 8–21 Nov (AP Exam)"),
    plan: "",
  },
  {
    week: tx("第12–13周（11/22–12/5，PBL 外出）", "Week 12–13 / 22 Nov–5 Dec (PBL outing)"),
    plan: "",
  },
  { week: tx("第14周（12/6–12/12）", "Week 14 / 6–12 Dec"), plan: "" },
  {
    week: tx("第15–16周（12/13–12/26，期末）", "Week 15–16 / 13–26 Dec (Final exam)"),
    plan: "",
  },
];
function parseWeeks(raw) {
  try {
    const rows = JSON.parse(raw || "[]");
    if (Array.isArray(rows) && rows.length)
      return rows.map((row) => ({
        week: row?.week || "",
        plan: row?.plan || "",
      }));
  } catch {
    return defaultProposalWeeks();
  }
  return defaultProposalWeeks();
}
function AttendancePicks({ name, value, disabled, onChange }) {
  return (
    <div className="ops-attendance-picks" role="radiogroup" aria-label={tr("签到状态：") + name}>
      {attendanceOptions.map(([key, label]) => (
        <button
          key={key}
          type="button"
          data-status={key}
          aria-pressed={value === key}
          disabled={disabled}
          onClick={() => onChange(value === key ? "" : key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
const timestamp = () =>
  new Date()
    .toLocaleString("sv-SE", {
      timeZone: "Asia/Shanghai",
    })
    .replace(" ", "T");
const dateText = (s) => s?.slice(0, 16).replace("T", " ") || "—";
export default function ClubOperations({
  club,
  token,
  section,
  activities,
  members,
  documents,
  onChanged,
}) {
  const [data, setData] = useState(null),
    [term, setTerm] = useState(""),
    [newTerm, setNewTerm] = useState(false),
    [editor, setEditor] = useState(null),
    [form, setForm] = useState({}),
    [activity, setActivity] = useState(""),
    [marks, setMarks] = useState({}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [uploadState, setUploadState] = useState(null),
    [query, setQuery] = useState(""),
    [results, setResults] = useState(null),
    [candidateNote, setCandidateNote] = useState(""),
    [confirm, setConfirm] = useState(null),
    [attendanceConfirm, setAttendanceConfirm] = useState(false),
    [deleteAttachment, setDeleteAttachment] = useState(false);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const lock = useRef(false);
  const base = `/api/club-workspace/${club}`,
    api = async (path, method = "GET", body) => {
      const file = body instanceof FormData;
      const r = await fetch(base + path, {
        method,
        headers: {
          "X-Workspace-Token": token,
          ...(body && !file
            ? {
                "Content-Type": "application/json",
              }
            : {}),
        },
        body: body ? (file ? body : JSON.stringify(body)) : undefined,
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.message || tr("操作未成功"));
      return d;
    };
  async function reload() {
    const d = await api("/operations");
    setData(d);
    setTerm((previous) =>
      d.terms.some((t) => t.id === previous)
        ? previous
        : (
            d.terms.find(
              (t) => t.start <= timestamp().slice(0, 10) && t.end >= timestamp().slice(0, 10),
            ) || d.terms[0]
          )?.id || "",
    );
    return d;
  }
  useEffect(() => {
    let alive = true;
    api("/operations")
      .then((d) => {
        if (!alive) return;
        setData(d);
        setTerm(
          (
            d.terms.find(
              (t) => t.start <= timestamp().slice(0, 10) && t.end >= timestamp().slice(0, 10),
            ) || d.terms[0]
          )?.id || "",
        );
      })
      .catch((e) => {
        if (alive) setError(tr(e.message));
      });
    return () => {
      alive = false;
    };
  }, [club]);
  async function run(fn) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      return true;
    } catch (e) {
      setError(tr(e.message));
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const current = data?.terms.find((t) => t.id === term),
    events = activities
      .filter(
        (a) =>
          a.kind === "event" &&
          a.status === "scheduled" &&
          current &&
          a.start.slice(0, 10) >= current.start &&
          a.start.slice(0, 10) <= current.end,
      )
      .sort((a, b) => a.start.localeCompare(b.start));
  useEffect(() => {
    setEditor(null);
    setFeedbackPage(1);
    setResults(null);
    setConfirm(null);
    setAttendanceConfirm(false);
    setDeleteAttachment(false);
    setActivity("");
  }, [term, section]);
  useEffect(() => {
    if (events.length && !events.some((a) => a.id === activity))
      setActivity((events.at(-1) || events[0]).id);
  }, [term, activities, activity, data?.terms]);
  useEffect(() => {
    setAttendanceConfirm(false);
  }, [activity]);
  const feedbackPages = Math.max(1, Math.ceil(events.length / 6)),
    visibleFeedbackPage = Math.min(feedbackPage, feedbackPages);
  const selected = events.find((a) => a.id === activity),
    attendance = data?.attendance.find((a) => a.activity === activity);
  useEffect(() => {
    setMarks(Object.fromEntries((attendance?.marks || []).map((m) => [m.member, m.status])));
  }, [activity, attendance]);
  const report = (kind, id = "") =>
    data?.reports.find((r) => r.term === term && r.kind === kind && r.activity === id);
  const due = (a) => events.find((next) => next.start > a.start)?.start || current?.end + "T23:59";
  const reportStatus = (r, deadline) =>
    r?.status === "not_held"
      ? tr("未举行")
      : r?.status === "submitted"
        ? tr("已提交")
        : r?.status === "draft"
          ? tr("草稿")
          : deadline < timestamp()
            ? tr("待补交")
            : tr("待提交");
  function edit(kind, a) {
    const r = report(kind, a?.id || "");
    setEditor({
      kind,
      activity: a?.id || "",
    });
    setForm(
      r
        ? {
            ...r,
            recruitment: r.recruitment || "",
            project: r.project || "",
            outcomes: r.outcomes || "",
            resources: r.resources || "",
            weeklyRows: parseWeeks(r.weeklyPlan),
            notHeld: r.status === "not_held",
          }
        : {
            title:
              kind === "feedback"
                ? a.title + tr(" · 活动记录")
                : localizeTerm(current.name, en) + " · " + names[kind],
            content: "",
            feedback: "",
            improvements: "",
            recruitment: "",
            project: "",
            outcomes: "",
            resources: "",
            weeklyRows: defaultProposalWeeks(),
            document: "",
            notHeld: false,
          },
    );
    setDeleteAttachment(false);
    setError("");
    setNotice("");
  }
  const saveReport = (e) => {
    e.preventDefault();
    const { notHeld } = form;
    const status =
      e.nativeEvent.submitter?.value === "draft"
        ? "draft"
        : notHeld
          ? "not_held"
          : e.nativeEvent.submitter?.value || "submitted";
    return submitReport(status);
  };
  const submitReport = (status) => {
    const { notHeld, weeklyRows, ...fields } = form;
    return run(async () => {
      await api("/operations/reports", "PUT", {
        ...fields,
        weeklyPlan: editor.kind === "proposal" ? JSON.stringify(weeklyRows || []) : "",
        term,
        kind: editor.kind,
        activity: editor.activity,
        status,
      });
      await reload();
      if (status === "draft" && editor.kind === "feedback")
        setForm((value) => ({ ...value, status: "draft" }));
      else setEditor(null);
      setNotice(
        status === "draft"
          ? tr("草稿已保存")
          : status === "not_held"
            ? tr("已标记未举行")
            : tr("记录已提交"),
      );
    });
  };
  const rows = new Map(
    members.map((m) => [
      m.type + ":" + m.id,
      {
        member: m.type + ":" + m.id,
        name: m.name,
        nameEn: m.nameEn,
      },
    ]),
  );
  for (const m of attendance?.marks || [])
    if (!rows.has(m.member))
      rows.set(m.member, {
        ...m,
        former: true,
      });
  const attachmentFields = editor && (
    <div className="ops-attachment">
      <label>
        {editor.kind === "proposal" ? tr("招新海报 / Logo（选填）") : tr("附件（选填）")}
        <select
          aria-label={tr("选择记录附件")}
          value={form.document}
          onChange={(e) => {
            setDeleteAttachment(false);
            setForm({
              ...form,
              document: e.target.value,
            });
          }}
        >
          <option value="">{tr("无附件")}</option>
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="ops-upload">
        {tr("上传附件")}
        <input
          type="file"
          disabled={busy}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.zip"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 20 * 1024 * 1024) {
              setError(tr("附件不能超过 20 MB"));
              e.target.value = "";
              return;
            }
            const body = new FormData();
            body.append("file", file);
            body.append("note", names[editor.kind]);
            run(async () => {
              setUploadState({ name: file.name, status: "running" });
              let d;
              try {
                d = await api("/documents", "POST", body);
              } catch (error) {
                setUploadState({ name: file.name, status: "error" });
                throw error;
              }
              setUploadState({ name: file.name, status: "done" });
              await onChanged();
              setForm((f) => ({
                ...f,
                document: d.id,
              }));
              setDeleteAttachment(false);
              setNotice(tr("附件已上传，请保存或提交记录"));
            });
          }}
        />
      </label>
      {form.document && (
        <div className="ops-attachment-actions">
          <a href={`${base}/documents/${form.document}`} download>
            {tx("下载所选附件", "Download selected attachment")}
          </a>
          <button type="button" disabled={busy} onClick={() => setDeleteAttachment(true)}>
            {tr("删除附件")}
          </button>
        </div>
      )}
      {deleteAttachment && form.document && (
        <div className="ops-confirm" role="group" aria-label={tr("确认删除附件")}>
          <p>{tr("确认删除该附件？删除后无法恢复，相关活动记录会去掉这份附件。")}</p>
          <button type="button" disabled={busy} onClick={() => setDeleteAttachment(false)}>
            {tr("取消")}
          </button>
          <HoldButton
            disabled={busy}
            onHold={() =>
              run(async () => {
                const id = form.document;
                await api("/documents/" + id, "DELETE");
                await onChanged();
                setForm((f) => ({
                  ...f,
                  document: "",
                }));
                setDeleteAttachment(false);
                setNotice(tr("附件已删除"));
              })
            }
          >
            {tx("长按删除", "Hold to delete")}
          </HoldButton>
        </div>
      )}
    </div>
  );
  const badge = (r, deadline) => (
    <span
      className={
        "ops-status " +
        (r?.status === "not_held"
          ? "not-held"
          : r?.status === "submitted"
            ? "submitted"
            : deadline < timestamp()
              ? "late"
              : "")
      }
    >
      {reportStatus(r, deadline)}
    </span>
  );
  return (
    <div className="ops-root">
      {error && editor?.kind !== "feedback" && (
        <p className="ws-error" role="alert">
          {error}
        </p>
      )}
      {busy && editor?.kind !== "feedback" && (
        <div className="ops-working">
          <StatusMark status="running" label={tx("正在保存，请稍候…", "Saving, please wait…")} />
        </div>
      )}
      {uploadState && (
        <CallChip
          icon="file"
          name={tx("上传附件", "Attachment")}
          argument={uploadState.name}
          status={uploadState.status}
          surfaceColor="#efebf4"
          color="#514663"
        />
      )}
      {notice && editor?.kind !== "feedback" && (
        <p className="ws-notice" role="status">
          {notice}
        </p>
      )}
      {!data ? (
        <p className="ws-help">
          <StatusMark status="running" label={tr("正在载入学期记录…")} />
          {error && <button onClick={() => run(reload)}>{tr("重试")}</button>}
        </p>
      ) : (
        <>
          <div className="ops-term-bar">
            <label>
              {tr("学期")}
              <GlideSelect
                ariaLabel={tr("选择学期")}
                value={term}
                disabled={busy || !!editor}
                onChange={setTerm}
                menuWidth={300}
                placeholder={tr("尚未设置学期")}
                options={data.terms.map((t) => ({ value: t.id, label: localizeTerm(t.name, en) }))}
              />
            </label>
            <span>
              {current
                ? current.start + tr(" 至 ") + current.end
                : tr("先设置学期起止日期，再填写材料和招新名单。")}
            </span>
            <button disabled={busy || !!editor} onClick={() => setNewTerm((v) => !v)}>
              {newTerm ? tr("收起") : tr("＋ 新建学期")}
            </button>
          </div>
          {newTerm && (
            <form
              className="ws-panel ops-new-term"
              onSubmit={(e) => {
                e.preventDefault();
                const input = Object.fromEntries(new FormData(e.currentTarget));
                run(async () => {
                  const t = await api("/operations/terms", "POST", input);
                  await reload();
                  setTerm(t.id);
                  setNewTerm(false);
                  setNotice(tr("学期已创建"));
                });
              }}
            >
              <h3>{tr("设置学期")}</h3>
              <label>
                {tr("学期名称")}
                <input
                  name="name"
                  required
                  maxLength={80}
                  placeholder={tr("例如：2026—2027 学年第一学期")}
                />
              </label>
              <div className="ws-form-grid">
                <label>
                  {tr("开始日期")}
                  <input name="start" type="date" required />
                </label>
                <label>
                  {tr("结束日期")}
                  <input name="end" type="date" required />
                </label>
              </div>
              <button disabled={busy} className="ws-primary">
                {tr("保存学期")}
              </button>
            </form>
          )}
          {current &&
            (editor ? (
              <section className={"ws-panel ops-report-editor kind-" + editor.kind}>
                {editor.kind === "feedback" ? (
                  <ActivityFeedbackEditor
                    key={editor.activity}
                    form={form}
                    setForm={setForm}
                    activity={events.find((a) => a.id === editor.activity)}
                    deadline={due(events.find((a) => a.id === editor.activity) || {})}
                    termName={localizeTerm(current.name, en)}
                    attachments={attachmentFields}
                    busy={busy}
                    error={error}
                    onSave={submitReport}
                    onBack={() => setEditor(null)}
                  />
                ) : (
                  <>
                    <div className="ws-section-head">
                      <h3>{names[editor.kind]}</h3>
                      <button disabled={busy} onClick={() => setEditor(null)}>
                        {tr("返回列表")}
                      </button>
                    </div>
                    <form onSubmit={saveReport}>
                      {editor.kind === "feedback" && (
                        <label className="ops-not-held">
                          <input
                            type="checkbox"
                            checked={!!form.notHeld}
                            disabled={busy}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                notHeld: e.target.checked,
                              })
                            }
                          />
                          <span>
                            {tr("本次活动未举行")}
                            <small>{tr("勾选后不必填写内容，提交即记为未举行。")}</small>
                          </span>
                        </label>
                      )}
                      {!form.notHeld && (
                        <label>
                          {tr("标题")}
                          <input
                            aria-label={tr("记录标题")}
                            value={form.title}
                            required
                            maxLength={160}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                title: e.target.value,
                              })
                            }
                          />
                        </label>
                      )}
                      {!form.notHeld && editor.kind === "proposal" && (
                        <p className="ws-help">
                          {tr(
                            "社团中英文名、负责人、指导教师和成员人数以社团资料为准，不必在此重复填写。请按 CAS 社团提案表填写以下栏目。",
                          )}
                        </p>
                      )}
                      {!form.notHeld && (
                        <label>
                          {editor.kind === "proposal"
                            ? tr("社团简介与目标")
                            : editor.kind === "review"
                              ? tr("本学期开展情况、成果与目标完成情况")
                              : tr("活动过程与实际开展情况")}
                          <textarea
                            value={form.content}
                            required
                            maxLength={10000}
                            rows={editor.kind === "proposal" ? 5 : 7}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                content: e.target.value,
                              })
                            }
                          />
                        </label>
                      )}
                      {!form.notHeld && editor.kind === "proposal" && (
                        <>
                          <label>
                            {tr("招新计划")}
                            <textarea
                              value={form.recruitment || ""}
                              required
                              maxLength={5000}
                              rows={4}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  recruitment: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            {tr("项目提案")}
                            <textarea
                              value={form.project || ""}
                              required
                              maxLength={10000}
                              rows={5}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  project: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            {tr("学习成果（LOs）")}
                            <textarea
                              value={form.outcomes || ""}
                              required
                              maxLength={8000}
                              rows={5}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  outcomes: e.target.value,
                                })
                              }
                            />
                            <small className="ops-lo-help">
                              {tx(
                                "说明本学期活动对应哪些 CAS 学习成果：1. 认识自身优势并发展成长空间；2. 迎接挑战并在过程中发展新技能；3. 发起并规划 CAS 体验；4. 持续投入并坚持；5. 协作并认识其益处；6. 关注具有全球意义的议题；7. 认识并思考选择与行动的伦理。",
                                "Say which CAS learning outcomes this term addresses: 1. Identify strengths and areas for growth; 2. Undertake challenges and develop new skills; 3. Initiate and plan a CAS experience; 4. Show commitment and perseverance; 5. Work collaboratively; 6. Engage with issues of global significance; 7. Recognize the ethics of choices and actions.",
                              )}
                            </small>
                          </label>
                          <label>
                            {tr("资源支持")}
                            <textarea
                              value={form.resources || ""}
                              required
                              maxLength={5000}
                              rows={3}
                              placeholder={tx(
                                "场地、器材、经费、指导教师或其他支持",
                                "Room, equipment, funding, supervisor or other support",
                              )}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  resources: e.target.value,
                                })
                              }
                            />
                          </label>
                          <div className="ops-week-plan">
                            <span>{tr("每周活动计划")}</span>
                            <div className="ws-table-scroll">
                              <table>
                                <thead>
                                  <tr>
                                    <th>{tr("周次")}</th>
                                    <th>{tr("计划")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(form.weeklyRows || []).map((row, index) => (
                                    <tr key={index}>
                                      <td>
                                        <input
                                          aria-label={tr("周次")}
                                          value={row.week}
                                          required
                                          maxLength={80}
                                          onChange={(e) =>
                                            setForm({
                                              ...form,
                                              weeklyRows: form.weeklyRows.map((item, i) =>
                                                i === index
                                                  ? {
                                                      ...item,
                                                      week: e.target.value,
                                                    }
                                                  : item,
                                              ),
                                            })
                                          }
                                        />
                                      </td>
                                      <td>
                                        <textarea
                                          aria-label={tr("计划")}
                                          value={row.plan}
                                          required
                                          maxLength={2000}
                                          rows={2}
                                          onChange={(e) =>
                                            setForm({
                                              ...form,
                                              weeklyRows: form.weeklyRows.map((item, i) =>
                                                i === index
                                                  ? {
                                                      ...item,
                                                      plan: e.target.value,
                                                    }
                                                  : item,
                                              ),
                                            })
                                          }
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <button
                              type="button"
                              disabled={busy || (form.weeklyRows || []).length >= 24}
                              onClick={() =>
                                setForm({
                                  ...form,
                                  weeklyRows: [
                                    ...(form.weeklyRows || []),
                                    {
                                      week: "",
                                      plan: "",
                                    },
                                  ],
                                })
                              }
                            >
                              {tr("＋ 添加周次")}
                            </button>
                          </div>
                        </>
                      )}
                      {!form.notHeld && editor.kind !== "proposal" && (
                        <>
                          <label>
                            {tr("社员反应与反馈")}
                            <textarea
                              value={form.feedback}
                              required={editor.kind === "feedback"}
                              maxLength={5000}
                              rows={4}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  feedback: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            {tr("问题、改进与下次安排")}
                            <textarea
                              value={form.improvements}
                              required={editor.kind !== "proposal"}
                              maxLength={5000}
                              rows={4}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  improvements: e.target.value,
                                })
                              }
                            />
                          </label>
                        </>
                      )}
                      {!form.notHeld && <>{attachmentFields}</>}
                      {!form.notHeld && (
                        <p className="ws-help">
                          {editor.kind === "proposal"
                            ? tr("Logo 也可在社团资料中上传。招新海报或提案附件不超过 20 MB。")
                            : tr(
                                "在线填写即可提交；如有学校统一表格，可在这里附上。附件不超过 20 MB。",
                              )}
                        </p>
                      )}
                      <div className="ops-actions">
                        {form.status !== "submitted" &&
                          form.status !== "not_held" &&
                          !form.notHeld && (
                            <button name="intent" value="draft" formNoValidate disabled={busy}>
                              {tr("保存草稿")}
                            </button>
                          )}
                        <button
                          name="intent"
                          value={form.notHeld ? "not_held" : "submitted"}
                          className="ws-primary"
                          disabled={busy}
                        >
                          {busy
                            ? tr("保存中…")
                            : form.notHeld
                              ? form.status === "not_held"
                                ? tr("更新提交")
                                : tr("标记未举行")
                              : form.status === "submitted" || form.status === "not_held"
                                ? tr("更新提交")
                                : tr("提交记录")}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </section>
            ) : (
              <>
                {section === "term" && (
                  <>
                    <header className="ops-materials-heading">
                      <div>
                        <span>{tx("学期工作", "TERM WORK")}</span>
                        <h3>{tx("学期材料", "Semester materials")}</h3>
                        <p>
                          {tx(
                            "按阶段准备，随时保存草稿。",
                            "Prepare each stage and save your draft at any time.",
                          )}
                        </p>
                      </div>
                      <StatusMark
                        status={
                          ["proposal", "review"].every(
                            (kind) => report(kind)?.status === "submitted",
                          )
                            ? "done"
                            : "pending"
                        }
                        label={
                          tx("已提交", "Submitted") +
                          " " +
                          ["proposal", "review"].filter(
                            (kind) => report(kind)?.status === "submitted",
                          ).length +
                          " / 2"
                        }
                      />
                    </header>
                    <div className="ops-report-grid">
                      {["proposal", "review"].map((kind) => {
                        const r = report(kind),
                          deadline = (kind === "proposal" ? current.start : current.end) + "T23:59";
                        return (
                          <section className="ws-panel ops-report-card" key={kind}>
                            <div className="ws-section-head">
                              <h3>{names[kind]}</h3>
                              {badge(r, deadline)}
                            </div>
                            <div className="ops-card-number" aria-hidden="true">
                              {kind === "proposal" ? "01" : "02"}
                            </div>
                            <p>
                              {kind === "proposal"
                                ? tr(
                                    "按 CAS 社团提案表填写简介与目标、招新计划、项目提案、学习成果、资源支持和每周活动计划。",
                                  )
                                : tr("回顾活动成果、社员反馈，记录问题与后续改进。")}
                            </p>
                            <small>
                              {tr("建议提交日期：")}
                              {deadline.slice(0, 10)}
                            </small>
                            {r && (
                              <small>
                                {tr("最近保存：")}
                                {dateText(r.updatedAt)}
                                {r.submittedAt && tr(" · 提交：") + dateText(r.submittedAt)}
                              </small>
                            )}
                            <button
                              className="ws-primary"
                              disabled={busy}
                              onClick={() => edit(kind)}
                            >
                              {r ? tr("查看 / 编辑") : tr("开始填写")}
                            </button>
                          </section>
                        );
                      })}
                    </div>
                    <section className="ws-panel ops-weekly">
                      <div className="ws-section-head">
                        <div>
                          <h3>{tr("活动反馈记录")}</h3>
                          <p>
                            {tr(
                              "每场活动结束后填写，一般在下一次活动前提交。若未举行，可直接标记，不必填写内容。",
                            )}
                          </p>
                        </div>
                      </div>
                      {events.length ? (
                        <div className="ws-table-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>{tr("活动")}</th>
                                <th>{tr("建议提交前")}</th>
                                <th>{tr("状态")}</th>
                                <th>{tr("操作")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {events
                                .slice((visibleFeedbackPage - 1) * 6, visibleFeedbackPage * 6)
                                .map((a) => (
                                  <tr key={a.id}>
                                    <td>
                                      <strong>{a.title}</strong>
                                      <small>{dateText(a.start)}</small>
                                    </td>
                                    <td>{dateText(due(a))}</td>
                                    <td>{badge(report("feedback", a.id), due(a))}</td>
                                    <td>
                                      <button disabled={busy} onClick={() => edit("feedback", a)}>
                                        {tr("填写 / 查看")}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                          <Pagination
                            page={visibleFeedbackPage}
                            pages={feedbackPages}
                            onChange={setFeedbackPage}
                          />
                        </div>
                      ) : (
                        <p className="ws-help">
                          {tr("这个学期还没有活动。先在活动日历中安排活动，再填写对应记录。")}
                        </p>
                      )}
                    </section>
                  </>
                )}
                {section === "sessions" && (
                  <section className="ws-panel">
                    <div className="ws-section-head">
                      <div>
                        <h3>{tr("活动签到")}</h3>
                        <p>
                          {tr(
                            "选择活动后即可登记。未登记的成员不会自动记为缺勤。点完状态后需确认提交。",
                          )}
                        </p>
                      </div>
                    </div>
                    <label className="ops-activity-select">
                      {tr("选择活动")}
                      <select
                        aria-label={tr("选择签到活动")}
                        value={activity}
                        disabled={busy}
                        onChange={(e) => setActivity(e.target.value)}
                      >
                        {!events.length && <option value="">{tr("本学期暂无活动")}</option>}
                        {events.map((a) => (
                          <option value={a.id} key={a.id}>
                            {a.start.slice(0, 10)} · {a.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selected && (
                      <>
                        <div className="ops-session-meta">
                          <span>
                            {dateText(selected.start)} — {selected.end.slice(11, 16)} ·{" "}
                            {selected.location}
                          </span>
                          <button disabled={busy} onClick={() => edit("feedback", selected)}>
                            {tr("填写活动反馈 ↗")}
                          </button>
                        </div>
                        <div className="ops-attendance-counts">
                          {Object.entries(states).map(([k, v]) => (
                            <span key={k}>
                              {v} <b>{Object.values(marks).filter((s) => s === k).length}</b>
                            </span>
                          ))}
                          <span>
                            {tr("未登记")}
                            <b>{[...rows.keys()].filter((k) => !marks[k]).length}</b>
                          </span>
                        </div>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!rows.size) return;
                            setAttendanceConfirm(true);
                          }}
                        >
                          <div className="ws-table-scroll">
                            <table>
                              <thead>
                                <tr>
                                  <th>{tr("社员")}</th>
                                  <th>{tr("英文名")}</th>
                                  <th>{tr("签到状态")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...rows.values()].map((m) => (
                                  <tr key={m.member}>
                                    <td>
                                      {m.name}
                                      {m.former && <small>{tr("已离开社团 · 历史记录")}</small>}
                                    </td>
                                    <td>{m.nameEn}</td>
                                    <td>
                                      <AttendancePicks
                                        name={m.name + " " + m.member}
                                        value={marks[m.member] || ""}
                                        disabled={busy}
                                        onChange={(status) =>
                                          setMarks({
                                            ...marks,
                                            [m.member]: status,
                                          })
                                        }
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {!rows.size && (
                            <p className="ws-help">{tr("暂无社员，请先在招新确认中添加成员。")}</p>
                          )}
                          <div className="ops-actions">
                            <span className="ws-help">
                              {attendance
                                ? tr("最近保存：") + dateText(attendance.updatedAt)
                                : tr("还没有保存签到记录")}
                            </span>
                            <button
                              className="ws-primary"
                              disabled={busy || !rows.size || attendanceConfirm}
                            >
                              {tr("确认提交签到")}
                            </button>
                          </div>
                          {attendanceConfirm && (
                            <div
                              className="ops-confirm"
                              role="group"
                              aria-label={tr("确认提交签到")}
                            >
                              <p>
                                {tx(
                                  "确认提交「" +
                                    selected.title +
                                    "」的签到？已到 " +
                                    Object.values(marks).filter((s) => s === "present").length +
                                    "，请假 " +
                                    Object.values(marks).filter((s) => s === "leave").length +
                                    "，缺勤 " +
                                    Object.values(marks).filter((s) => s === "absent").length +
                                    "，未登记 " +
                                    [...rows.keys()].filter((k) => !marks[k]).length +
                                    "。",
                                  "Submit attendance for “" +
                                    selected.title +
                                    "”? Present " +
                                    Object.values(marks).filter((s) => s === "present").length +
                                    ", leave " +
                                    Object.values(marks).filter((s) => s === "leave").length +
                                    ", absent " +
                                    Object.values(marks).filter((s) => s === "absent").length +
                                    ", unmarked " +
                                    [...rows.keys()].filter((k) => !marks[k]).length +
                                    ".",
                                )}
                              </p>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setAttendanceConfirm(false)}
                              >
                                {tr("取消提交")}
                              </button>
                              <button
                                type="button"
                                className="ws-primary"
                                disabled={busy}
                                onClick={() =>
                                  run(async () => {
                                    await api("/operations/attendance/" + activity, "PUT", {
                                      marks: Object.entries(marks)
                                        .filter(([, status]) => status)
                                        .map(([member, status]) => ({
                                          member,
                                          status,
                                        })),
                                    });
                                    await reload();
                                    setAttendanceConfirm(false);
                                    setNotice(tr("签到已保存"));
                                  })
                                }
                              >
                                {tr("确认提交")}
                              </button>
                            </div>
                          )}
                        </form>
                      </>
                    )}
                  </section>
                )}
                {section === "recruitment" && (
                  <section className="ws-panel">
                    <div className="ws-section-head">
                      <div>
                        <h3>{tr("招新人员确认")}</h3>
                        <p>{tr("查找已注册的学生，加入待确认名单；确认录取后才成为社员。")}</p>
                      </div>
                    </div>
                    <form
                      className="ws-member-search"
                      onSubmit={(e) => {
                        e.preventDefault();
                        run(async () => {
                          setResults(
                            await api(
                              "/students?" +
                                new URLSearchParams({
                                  keyword: query.trim(),
                                }),
                            ),
                          );
                        });
                      }}
                    >
                      <input
                        aria-label={tr("搜索招新学生")}
                        maxLength={80}
                        placeholder={tx(
                          "中文名、英文名或昵称",
                          "Chinese name, English name or nickname",
                        )}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <button disabled={busy || !query.trim()} className="ws-primary">
                        {tr("查找学生")}
                      </button>
                    </form>
                    {results && (
                      <div className="ops-candidate-search">
                        <label>
                          {tr("名单备注（选填）")}
                          <input
                            value={candidateNote}
                            maxLength={500}
                            onChange={(e) => setCandidateNote(e.target.value)}
                            placeholder={tr("例如：已完成面谈")}
                          />
                        </label>
                        {results.map((s) => (
                          <div className="ops-search-person" key={s.id}>
                            <PersonIdentity person={s} query={query} />
                            <button
                              disabled={
                                busy ||
                                data.candidates.some((c) => c.term === term && c.student === s.id)
                              }
                              onClick={() =>
                                run(async () => {
                                  await api("/operations/candidates", "POST", {
                                    term,
                                    student: s.id,
                                    note: candidateNote,
                                  });
                                  await reload();
                                  setNotice(tr("已加入待确认名单，尚未加入社团"));
                                })
                              }
                            >
                              {tr("加入待确认")}
                            </button>
                          </div>
                        ))}
                        {!results.length && (
                          <p className="ws-help">{tr("没有找到可添加的学生。")}</p>
                        )}
                      </div>
                    )}
                    <div className="ops-candidate-list">
                      {data.candidates
                        .filter((c) => c.term === term)
                        .map((c) => (
                          <article key={c.id}>
                            <div>
                              <strong>{en ? c.nameEn || c.name : c.name || c.nameEn}</strong>
                              <small>
                                {c.nameEn}
                                {tr("· 学生账号 #")}
                                {c.student}
                              </small>
                              {c.note && <p>{c.note}</p>}
                            </div>
                            <span
                              className={
                                "ops-status " + (c.status === "confirmed" ? "submitted" : "")
                              }
                            >
                              {
                                {
                                  pending: tr("待确认"),
                                  confirmed: tr("已加入社团"),
                                  declined: tr("未录取"),
                                }[c.status]
                              }
                            </span>
                            {c.status === "pending" && (
                              <div className="ops-actions">
                                <button
                                  disabled={busy}
                                  onClick={() =>
                                    setConfirm({
                                      id: c.id,
                                      name: c.name,
                                      action: "decline",
                                    })
                                  }
                                >
                                  {tr("不录取")}
                                </button>
                                <button
                                  className="ws-primary"
                                  disabled={busy}
                                  onClick={() =>
                                    setConfirm({
                                      id: c.id,
                                      name: c.name,
                                      action: "confirm",
                                    })
                                  }
                                >
                                  {tr("确认录取")}
                                </button>
                              </div>
                            )}
                            {confirm?.id === c.id && (
                              <div
                                className="ops-confirm"
                                role="group"
                                aria-label={tr("确认招新决定")}
                              >
                                <p>
                                  {confirm.action === "confirm"
                                    ? tr("确认将 ") + c.name + tr(" 加入本社团？")
                                    : tr("确认本次不录取 ") + c.name + "？"}
                                </p>
                                <button disabled={busy} onClick={() => setConfirm(null)}>
                                  {tr("取消")}
                                </button>
                                <button
                                  disabled={busy}
                                  className="ws-primary"
                                  onClick={() =>
                                    run(async () => {
                                      await api(
                                        "/operations/candidates/" + c.id + "/" + confirm.action,
                                        "POST",
                                      );
                                      await reload();
                                      await onChanged();
                                      setConfirm(null);
                                      setResults(null);
                                      setNotice(
                                        confirm.action === "confirm"
                                          ? tr("已录取，成员已加入社团")
                                          : tr("招新决定已保存"),
                                      );
                                    })
                                  }
                                >
                                  {tr("确定")}
                                </button>
                              </div>
                            )}
                          </article>
                        ))}
                    </div>
                    {!data.candidates.some((c) => c.term === term) && (
                      <p className="ws-help">{tr("本学期还没有招新名单。")}</p>
                    )}
                  </section>
                )}
              </>
            ))}
        </>
      )}
    </div>
  );
}
