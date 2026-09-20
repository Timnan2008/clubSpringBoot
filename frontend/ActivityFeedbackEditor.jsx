import { useEffect, useId, useRef, useState } from "react";
import RubberSegment from "./RubberSegment";
import StatusMark from "./StatusMark";
import { tx } from "./language";
import "./ActivityFeedbackEditor.css";

const signature = ({ title, content, feedback, improvements, document, notHeld }) =>
  JSON.stringify({ title, content, feedback, improvements, document, notHeld });
const readableDate = (value) => (value ? value.replace("T", " · ").slice(0, 18) : "—");

export default function ActivityFeedbackEditor({
  form,
  setForm,
  activity,
  deadline,
  termName,
  attachments,
  busy,
  error,
  onSave,
  onBack,
}) {
  const uid = useId();
  const baseline = useRef(signature(form));
  const fields = useRef({});
  const submitRef = useRef(null);
  const [attempted, setAttempted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [intent, setIntent] = useState("");
  const dirty = signature(form) !== baseline.current;
  const sections = [
    {
      key: "content",
      title: tx("活动过程与实际开展情况", "What happened"),
      short: tx("活动过程", "Activity"),
      hint: tx(
        "按实际发生的顺序，记录做了什么、如何开展，以及达成的成果。",
        "Describe what happened, how the session ran, and what was achieved.",
      ),
      placeholder: tx(
        "例如：先介绍活动目标，再分组完成实践，最后展示作品并交流。",
        "For example: introduce the goal, work in small groups, then share the results.",
      ),
      limit: 10000,
    },
    {
      key: "feedback",
      title: tx("社员反应与反馈", "Member feedback"),
      short: tx("社员反馈", "Feedback"),
      hint: tx(
        "记录参与情况、社员的具体感受，以及值得保留的建议。",
        "Record participation, specific reactions, and suggestions worth keeping.",
      ),
      placeholder: tx(
        "哪些环节参与度高？社员遇到了什么困难，提出了哪些建议？",
        "Which parts engaged members? What difficulties or suggestions did they share?",
      ),
      limit: 5000,
    },
    {
      key: "improvements",
      title: tx("问题、改进与下次安排", "Improvements and next steps"),
      short: tx("后续改进", "Next steps"),
      hint: tx(
        "把发现的问题转化为可执行的下一步。若无问题，也请写下后续安排。",
        "Turn observations into practical next steps. If there were no issues, outline the next session.",
      ),
      placeholder: tx(
        "下次准备调整什么？需要提前准备哪些材料，如何分工？",
        "What will change next time? What needs preparing, and who will do it?",
      ),
      limit: 5000,
    },
  ];
  const completed = sections.filter((s) => form[s.key]?.trim()).length;
  const missing = ["title", ...sections.map((s) => s.key)].filter((key) => !form[key]?.trim());
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(key, value) {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function save(status, leave = false) {
    if (busy) return;
    if (status === "submitted" && missing.length) {
      setAttempted(true);
      fields.current[missing[0]]?.focus();
      return;
    }
    setIntent(status);
    const snapshot = signature(form);
    const ok = await onSave(status);
    if (ok === false) {
      setIntent("");
      return;
    }
    baseline.current = snapshot;
    setSaved(true);
    setIntent("");
    if (leave) onBack();
  }
  const wasSubmitted = ["submitted", "not_held"].includes(form.status);
  return (
    <section className="feedback-editor" aria-labelledby={`${uid}-heading`}>
      <header className="feedback-header">
        <div>
          <p className="feedback-eyebrow">{tx("活动复盘", "ACTIVITY REFLECTION")}</p>
          <h3 id={`${uid}-heading`}>{tx("活动反馈记录", "Activity feedback")}</h3>
          <p>
            {tx(
              "留下真实过程，也为下一次活动积累经验。",
              "Capture the session and make the next one better.",
            )}
          </p>
        </div>
        <button type="button" disabled={busy} onClick={() => (dirty ? setLeaving(true) : onBack())}>
          {tx("返回列表", "Back to list")}
        </button>
      </header>
      {leaving && (
        <div className="feedback-leave" role="alert">
          <strong>{tx("还有未保存的修改", "You have unsaved changes")}</strong>
          <p>
            {tx(
              "可以继续填写，或保存草稿后返回。",
              "Keep editing, or save a draft before leaving.",
            )}
          </p>
          <div>
            <button type="button" disabled={busy} onClick={() => setLeaving(false)}>
              {tx("继续填写", "Keep editing")}
            </button>
            {!wasSubmitted && !form.notHeld && (
              <button type="button" disabled={busy} onClick={() => save("draft", true)}>
                {tx("保存草稿并返回", "Save draft and leave")}
              </button>
            )}
            <button type="button" disabled={busy} onClick={onBack}>
              {tx("放弃修改", "Discard changes")}
            </button>
          </div>
        </div>
      )}
      <div className="feedback-context">
        <div>
          <span>{tx("关联活动", "Activity")}</span>
          <strong>{activity?.title || form.title}</strong>
        </div>
        <div>
          <span>{tx("活动时间 · 北京时间", "Time · Beijing")}</span>
          <strong>{readableDate(activity?.start)}</strong>
        </div>
        <div>
          <span>{tx("建议提交前", "Suggested deadline")}</span>
          <strong>{readableDate(deadline)}</strong>
        </div>
        <small>
          {termName}
          {activity?.location ? ` · ${activity.location}` : ""}
        </small>
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save(e.nativeEvent.submitter?.value || (form.notHeld ? "not_held" : "submitted"));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) {
            e.preventDefault();
            e.currentTarget.requestSubmit(submitRef.current);
          }
        }}
      >
        <fieldset disabled={busy} className="feedback-fields">
          <div className="feedback-mode">
            <div>
              <h4>{tx("这次活动举行了吗？", "Did the activity take place?")}</h4>
              <p>
                {tx(
                  "选择“未举行”后，无需填写下方内容。",
                  "If it did not take place, no written reflection is required.",
                )}
              </p>
            </div>
            <RubberSegment
              aria-label={tx("活动举行情况", "Activity status")}
              value={form.notHeld ? "not-held" : "held"}
              onChange={(value) => change("notHeld", value === "not-held")}
              items={[
                { value: "held", label: tx("已举行", "Held") },
                { value: "not-held", label: tx("未举行", "Not held") },
              ]}
              disabled={busy}
              trackColor="#eeebf4"
              thumbColor="#fff"
              textColor="#6b6178"
              activeTextColor="#49305f"
            />
          </div>
          {form.notHeld ? (
            <div className="feedback-not-held" role="status">
              <StatusMark status="pending" size={24} />
              <div>
                <h4>{tx("将记录为“未举行”", "This session will be marked as not held")}</h4>
                <p>
                  {tx(
                    "提交后才会更新记录。切回“已举行”，本次填写的内容仍会保留。",
                    "The record changes only when you submit. Switching back to Held keeps your current writing.",
                  )}
                </p>
              </div>
            </div>
          ) : (
            <>
              <label className="feedback-title" htmlFor={`${uid}-title`}>
                {tx("记录标题", "Record title")} <span>{tx("必填", "Required")}</span>
              </label>
              <input
                id={`${uid}-title`}
                ref={(el) => (fields.current.title = el)}
                value={form.title || ""}
                maxLength={160}
                onChange={(e) => change("title", e.target.value)}
                aria-invalid={attempted && !form.title?.trim()}
                aria-describedby={
                  attempted && !form.title?.trim() ? `${uid}-title-error` : undefined
                }
              />
              {attempted && !form.title?.trim() && (
                <p className="feedback-field-error" id={`${uid}-title-error`}>
                  {tx("请填写记录标题", "Enter a record title")}
                </p>
              )}
              <nav className="feedback-progress" aria-label={tx("填写进度", "Writing progress")}>
                {sections.map((s, i) => (
                  <button key={s.key} type="button" onClick={() => fields.current[s.key]?.focus()}>
                    <span data-complete={form[s.key]?.trim() ? "" : undefined}>
                      {form[s.key]?.trim() ? "✓" : `0${i + 1}`}
                    </span>
                    {s.short}
                  </button>
                ))}
                <small>
                  {completed} / 3 {tx("已填写", "filled")}
                </small>
              </nav>
              <div className="feedback-sections">
                {sections.map((s, i) => {
                  const invalid = attempted && !form[s.key]?.trim();
                  return (
                    <section key={s.key} className="feedback-section">
                      <div className="feedback-section-heading">
                        <span className="feedback-number">0{i + 1}</span>
                        <div>
                          <label htmlFor={`${uid}-${s.key}`}>
                            {s.title}
                            <span>{tx("必填", "Required")}</span>
                          </label>
                          <p id={`${uid}-${s.key}-hint`}>{s.hint}</p>
                        </div>
                      </div>
                      <textarea
                        id={`${uid}-${s.key}`}
                        ref={(el) => (fields.current[s.key] = el)}
                        rows={i === 0 ? 6 : 5}
                        value={form[s.key] || ""}
                        maxLength={s.limit}
                        placeholder={s.placeholder}
                        onChange={(e) => change(s.key, e.target.value)}
                        aria-invalid={invalid}
                        aria-describedby={`${uid}-${s.key}-hint${invalid ? ` ${uid}-${s.key}-error` : ""}`}
                      />
                      <div className="feedback-field-meta">
                        {invalid ? (
                          <span className="feedback-field-error" id={`${uid}-${s.key}-error`}>
                            {tx("请填写这一项后再提交", "Complete this field before submitting")}
                          </span>
                        ) : (
                          <span>{tx("按实际情况填写即可", "Describe the actual session")}</span>
                        )}
                        <span>
                          {(form[s.key] || "").length.toLocaleString()} / {s.limit.toLocaleString()}
                        </span>
                      </div>
                    </section>
                  );
                })}
              </div>
              <section className="feedback-attachments">
                <h4>
                  {tx("补充材料", "Supporting materials")}
                  <span>{tx("选填", "Optional")}</span>
                </h4>
                <p>
                  {tx(
                    "在线填写即可提交；已有活动照片或学校统一表格时，可以附在这里。单个文件不超过 20 MB。",
                    "The written record is sufficient. You may attach activity photos or a school form, up to 20 MB per file.",
                  )}
                </p>
                {attachments}
              </section>
            </>
          )}
        </fieldset>
        {error && (
          <p className="feedback-server-error" role="alert">
            {error}
          </p>
        )}
        <footer className="feedback-actions">
          <div aria-live="polite">
            {busy ? (
              <StatusMark
                status="running"
                strike={false}
                label={
                  intent === "draft"
                    ? tx("正在保存草稿…", "Saving draft…")
                    : intent
                      ? tx("正在提交…", "Submitting…")
                      : tx("正在处理附件…", "Processing attachment…")
                }
              />
            ) : (
              <>
                <strong>
                  {saved && !dirty
                    ? tx("草稿已保存", "Draft saved")
                    : dirty
                      ? tx("有未保存的修改", "Unsaved changes")
                      : wasSubmitted
                        ? tx("已提交记录", "Submitted record")
                        : tx("可先保存草稿", "Save a draft anytime")}
                </strong>
                <small>
                  {tx("提交前请确认内容真实、完整。", "Check the record before submitting.")}
                </small>
              </>
            )}
          </div>
          <div className="feedback-action-buttons">
            {!wasSubmitted && !form.notHeld && (
              <button name="intent" value="draft" disabled={busy}>
                {tx("保存草稿", "Save draft")}
              </button>
            )}
            <button
              ref={submitRef}
              name="intent"
              value={form.notHeld ? "not_held" : "submitted"}
              className="ws-primary"
              disabled={busy}
            >
              {form.notHeld
                ? tx("确认未举行", "Confirm not held")
                : wasSubmitted
                  ? tx("更新记录", "Update record")
                  : tx("提交记录", "Submit record")}
              <span aria-hidden="true"> ↗</span>
            </button>
          </div>
        </footer>
      </form>
    </section>
  );
}
