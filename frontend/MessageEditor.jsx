import { useLayoutEffect, useRef } from "react";
import { tx } from "./language";

export default function MessageEditor({ value, attachments, onChange, onCancel, onSubmit }) {
  const input = useRef(null);
  useLayoutEffect(() => {
    const area = input.current;
    const resize = () => {
      const scroll = area.scrollTop;
      area.style.height = "0px";
      area.style.height = `${Math.min(Math.min(160, window.innerHeight * 0.3), Math.max(24, area.scrollHeight))}px`;
      area.scrollTop = scroll;
    };
    resize();
    let width = area.clientWidth;
    const observer = new ResizeObserver(() => {
      if (width === area.clientWidth) return;
      width = area.clientWidth;
      resize();
    });
    observer.observe(area);
    return () => observer.disconnect();
  }, [value]);
  return (
    <div className="openclaw-edit-card">
      {attachments.length > 0 && (
        <div className="openclaw-user-files">
          {attachments.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      )}
      <textarea
        data-autosize-managed
        ref={input}
        value={value}
        rows={1}
        autoFocus
        aria-label={tx("重新编辑", "Edit message")}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && value.trim()) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
      <div className="openclaw-edit-actions">
        <button type="button" onClick={onCancel}>
          {tx("取消", "Cancel")}
        </button>
        <button type="button" disabled={!value.trim()} onClick={onSubmit}>
          {tx("发送", "Send")}
        </button>
      </div>
    </div>
  );
}
