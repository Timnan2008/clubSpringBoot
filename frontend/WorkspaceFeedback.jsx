import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { tx } from "./language";
import "./WorkspaceFeedback.css";

// A shared viewport layer keeps feedback visible even at the end of a long form.
export default function WorkspaceFeedback({ children, kind = "success" }) {
  const [host, setHost] = useState(null);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    let layer = document.getElementById("workspace-feedback");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "workspace-feedback";
      document.body.appendChild(layer);
    }
    setHost(layer);
  }, []);
  useEffect(() => {
    if (kind !== "success") return;
    const timer = setTimeout(() => setClosed(true), 7000);
    return () => clearTimeout(timer);
  }, [kind]);
  if (!host || closed) return null;
  return createPortal(
    <div className={`workspace-feedback workspace-feedback--${kind}`} role={kind === "error" ? "alert" : "status"}>
      <div className="workspace-feedback__body">{children}</div>
      <button type="button" className="workspace-feedback__close" aria-label={tx("关闭提示", "Dismiss notification")} onClick={() => setClosed(true)}>×</button>
    </div>, host,
  );
}
