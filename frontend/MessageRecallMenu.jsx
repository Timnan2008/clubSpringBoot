import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUUpLeft, DotsThree } from "@phosphor-icons/react";
import { tx } from "./language";
import "./MessageRecallMenu.css";

export default function MessageRecallMenu({ children, className, canRecall, busy, onRecall }) {
  const [menu, setMenu] = useState(null);
  const host = useRef(null),
    popup = useRef(null);
  const open = (x, y) =>
    setMenu({
      x: Math.max(8, Math.min(x, innerWidth - 168)),
      y: Math.max(8, Math.min(y, innerHeight - 60)),
    });
  useEffect(() => {
    if (!canRecall) setMenu(null);
  }, [canRecall]);
  useEffect(() => {
    if (!menu) return;
    popup.current?.querySelector("button")?.focus();
    const close = (event) => {
      if (!popup.current?.contains(event.target)) setMenu(null);
    };
    const key = (event) => {
      if (event.key === "Escape") {
        setMenu(null);
        host.current?.focus({ preventScroll: true });
      } else if (event.key === "Tab") setMenu(null);
    };
    const dismiss = () => setMenu(null);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [menu]);
  return (
    <div
      ref={host}
      className={className}
      tabIndex={canRecall ? 0 : undefined}
      onContextMenu={(event) => {
        if (!canRecall) return;
        event.preventDefault();
        open(event.clientX, event.clientY);
      }}
      onKeyDown={(event) => {
        if (!canRecall || !(event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")))
          return;
        event.preventDefault();
        const rect = host.current.getBoundingClientRect();
        open(rect.right - 160, rect.top + 30);
      }}
    >
      {children}
      {canRecall && (
        <button
          type="button"
          className="message-recall-menu-trigger"
          aria-label={tx("消息操作", "Message actions")}
          aria-haspopup="menu"
          aria-expanded={!!menu}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            open(rect.right - 160, rect.bottom + 4);
          }}
        >
          <DotsThree size={20} />
        </button>
      )}
      {menu &&
        canRecall &&
        createPortal(
          <div
            ref={popup}
            className="message-recall-menu"
            role="menu"
            aria-label={tx("消息操作", "Message actions")}
            style={{ left: menu.x, top: menu.y }}
          >
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => {
                setMenu(null);
                onRecall();
              }}
            >
              <ArrowUUpLeft size={17} />
              {tx("撤回", "Recall")}
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
