import React, { useEffect, useId, useRef, useState } from "react";
import { tx, en } from "./language";
async function request(url, options) {
  const r = await fetch(url, options);
  const d = await r.json().catch(() => ({}));
  if (!r.ok)
    throw Error(d.message || tx("操作未成功，请重试。", "Unable to complete this request."));
  return d;
}
export default function ClubJoin({ club, authenticated, account, compact = false }) {
  const [state, setState] = useState(null),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [attempt, setAttempt] = useState(0),
    [note, setNote] = useState("");
  const dialog = useRef(),
    lock = useRef(false);
  const dialogTitle = useId();
  const path = `/api/campus-social/clubs/${club.id}/join`;
  useEffect(() => {
    if (!authenticated || account?.role === "teacher") return;
    const c = new AbortController();
    setState(null);
    setError("");
    request(path, { signal: c.signal })
      .then((result) => {
        if (!c.signal.aborted) setState(result);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [path, authenticated, account?.role, attempt]);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  async function submit(e) {
    e.preventDefault();
    if (lock.current || !state?.token) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await request(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Workspace-Token": state.token },
        body: JSON.stringify({ note }),
      });
      setState((s) => ({ ...s, status: "pending" }));
      setOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (account?.role === "teacher")
    return (
      <a
        className="club-button"
        href="/page/club/workspace"
        title={tx("管理我的社团", "Manage my clubs")}
      >
        {compact ? tx("管理", "Manage") : tx("管理我的社团", "Manage my clubs")} ↗
      </a>
    );
  const member = state?.status === "member",
    pending = state?.status === "pending";
  const loading = authenticated && !state && !error;
  const retry = authenticated && !state && !!error;
  let label = tx("申请加入社团", "Apply to join");
  if (member) label = tx("已加入社团", "Already a member");
  else if (pending) label = tx("申请已提交 · 等待审核", "Application pending");
  else if (loading) label = tx("正在加载申请状态", "Checking application status");
  else if (retry) label = tx("重试加载申请状态", "Retry loading application status");
  let compactLabel = tx("加入", "Join");
  if (member) compactLabel = tx("已加入", "Joined");
  else if (pending) compactLabel = tx("待审核", "Pending");
  else if (loading) compactLabel = tx("加载中…", "Loading…");
  else if (retry) compactLabel = tx("重试", "Retry");
  return (
    <div className="club-join">
      <button
        className="club-button"
        type="button"
        disabled={busy || member || pending || loading}
        title={label}
        aria-busy={busy || loading}
        onClick={() => {
          if (!authenticated) {
            location.assign(
              "/page/user/login?next=" + encodeURIComponent(location.pathname + location.search),
            );
            return;
          }
          if (retry) {
            setAttempt((value) => value + 1);
            return;
          }
          setOpen(true);
        }}
      >
        {compact && !member && !pending && !loading && !retry && <span aria-hidden="true">+</span>}
        {compact ? compactLabel : label} {!compact && <span aria-hidden="true">↗</span>}
      </button>
      {error && !open && <p role="alert">{error}</p>}
      <dialog
        ref={dialog}
        className="club-join-dialog"
        aria-labelledby={dialogTitle}
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === dialog.current && !busy) setOpen(false);
        }}
      >
        <form onSubmit={submit}>
          <header>
            <h2 id={dialogTitle}>
              {tx("申请加入", "Apply to join")}{" "}
              {en && club.clubNameEn ? club.clubNameEn : club.clubName}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              aria-label={tx("关闭", "Close")}
            >
              ×
            </button>
          </header>
          <p>
            {tx(
              "负责人审核通过后，你会出现在社员名单中。",
              "Once approved by the club team, you will appear on its member list.",
            )}
          </p>
          <label>
            {tx("说说你的兴趣与想法（选填）", "Your interests or a short introduction (optional)")}
            <textarea
              rows={4}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button className="club-button" disabled={busy || !state?.token}>
            {busy ? tx("提交中…", "Submitting…") : tx("提交申请", "Send application")}
          </button>
        </form>
      </dialog>
    </div>
  );
}
