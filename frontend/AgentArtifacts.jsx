import { useEffect, useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { en, tx } from "./language";
import "./AgentArtifacts.css";

export function ApprovalCard({ title, detail, status = "pending", onDecision }) {
  const [submitting, setSubmitting] = useState(false);
  const pending = status === "pending";
  const [error, setError] = useState("");
  const decide = async (approved) => {
    if (!pending || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onDecision?.(approved);
    } catch (failure) {
      setError(failure.message || tx("提交失败，请重试。", "Could not submit. Try again."));
      setSubmitting(false);
    }
  };
  return (
    <div
      className="agent-approval-card"
      data-status={status}
      role={pending ? "dialog" : "group"}
      aria-label={tx("操作批准", "Action approval")}
      aria-busy={submitting && pending}
    >
      <div className="agent-approval-card__copy">
        <span className="agent-approval-card__eyebrow">
          {tx("需要你的批准", "NEEDS YOUR APPROVAL")}
        </span>
        <strong>{title}</strong>
        {detail && <p>{detail}</p>}
        {error && <p role="alert">{error}</p>}
      </div>
      <div className="agent-approval-card__actions">
        <button
          type="button"
          className="agent-approval-card__deny"
          disabled={!pending || submitting}
          onClick={() => decide(false)}
        >
          {status === "denied" ? tx("已拒绝", "Denied") : tx("拒绝", "Deny")}
        </button>
        <button
          type="button"
          className="agent-approval-card__approve"
          disabled={!pending || submitting}
          onClick={() => decide(true)}
        >
          {status === "approved"
            ? tx("已批准", "Approved")
            : submitting
              ? tx("提交中…", "Submitting…")
              : tx("批准", "Approve")}
        </button>
      </div>
    </div>
  );
}

function fileKind(name) {
  const ext = String(name || "")
    .split(".")
    .pop()
    .toLowerCase();
  if (["doc", "docx"].includes(ext)) return ["W", tx("Word 文档", "Word document"), "word"];
  if (["xls", "xlsx", "csv"].includes(ext)) return ["X", tx("电子表格", "Spreadsheet"), "sheet"];
  if (["ppt", "pptx"].includes(ext)) return ["P", tx("演示文稿", "Presentation"), "slides"];
  if (ext === "pdf") return ["PDF", tx("PDF 文档", "PDF document"), "pdf"];
  if (["md", "markdown"].includes(ext))
    return ["M↓", tx("Markdown 文档", "Markdown document"), "text"];
  if (
    [
      "js",
      "jsx",
      "ts",
      "tsx",
      "py",
      "java",
      "html",
      "css",
      "json",
      "sql",
      "xml",
      "yml",
      "yaml",
    ].includes(ext)
  )
    return ["</>", tx("源代码文件", "Source file"), "code"];
  return ["TXT", tx("文本文件", "Text file"), "text"];
}
function formatBytes(bytes) {
  if (bytes == null || !Number.isFinite(Number(bytes)) || Number(bytes) < 0) return "";
  const value = Number(bytes);
  if (value < 1024) return `${value} B`;
  const divisor = value < 1024 * 1024 ? 1024 : 1024 * 1024;
  return `${new Intl.NumberFormat(en ? "en" : "zh", { maximumFractionDigits: 1 }).format(value / divisor)} ${divisor === 1024 ? "KB" : "MB"}`;
}
export function AgentFileCard({ file, disabled, onDelete }) {
  const [size, setSize] = useState(file.size ?? null);
  const [icon, label, kind] = fileKind(file.name);
  useEffect(() => {
    setSize(file.size ?? null);
    if (file.size != null || !/^\/api\/openclaw\/files\/[0-9a-f-]{36}$/i.test(file.href || ""))
      return;
    const controller = new AbortController();
    // Authenticated metadata only: never download the file just to display its size.
    fetch(file.href, { method: "HEAD", credentials: "same-origin", signal: controller.signal })
      .then((response) => {
        const length = response.headers.get("Content-Length");
        if (response.ok && length !== null && /^\d+$/.test(length)) setSize(Number(length));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [file.href, file.size]);
  const formatted = formatBytes(size);
  return (
    <div className="agent-file-card" data-kind={kind}>
      <a href={file.href} download={file.name} className="agent-file-card__download">
        <span className="agent-file-card__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="agent-file-card__copy">
          <strong title={file.name}>{file.name}</strong>
          <small>
            {label}
            {formatted ? ` · ${formatted}` : ""}
          </small>
        </span>
      </a>
      {onDelete && (
        <button
          type="button"
          className="agent-file-card__delete"
          disabled={disabled}
          aria-label={tx(`删除文件 ${file.name}`, `Delete file ${file.name}`)}
          onClick={() => onDelete(file)}
        >
          <Trash size={16} />
        </button>
      )}
    </div>
  );
}
