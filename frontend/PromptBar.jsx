// Adapted from the supplied PromptBar. Drafts clear only after an accepted send.
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, File02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { tx } from "./language";
import AssistantOptions from "./AssistantOptions";
import BorderGlow from "./BorderGlow";
import "./PromptBar.css";

const ARROW = [12, 4.5, 18.5, 11, 14.25, 11, 14.25, 19.5, 9.75, 19.5, 9.75, 11, 5.5, 11];
const STOP = [12, 6, 18, 6, 18, 12, 18, 18, 6, 18, 6, 12, 6, 6];
const pathAt = (t) =>
  ARROW.reduce(
    (d, n, i) => d + (i % 2 ? " " : i ? "L" : "M") + (n + (STOP[i] - n) * t).toFixed(2),
    "",
  ) + "Z";
function SendGlyph({ busy }) {
  const reduced = useReducedMotion(),
    t = useMotionValue(0),
    path = useRef(),
    svg = useRef();
  useMotionValueEvent(t, "change", (v) => {
    path.current?.setAttribute("d", pathAt(v));
    const pinch = reduced ? 0 : Math.sin(v * Math.PI);
    if (svg.current)
      svg.current.style.transform = `rotate(${pinch * 8}deg) scale(${1 - pinch * 0.12},${1 + pinch * 0.12})`;
  });
  useEffect(() => {
    const controls = animate(
      t,
      busy ? 1 : 0,
      reduced ? { duration: 0 } : { duration: 0.24, ease: [0.77, 0, 0.175, 1] },
    );
    return () => controls.stop();
  }, [busy, reduced, t]);
  return (
    <svg
      ref={svg}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path ref={path} d={pathAt(t.get())} />
    </svg>
  );
}
export default function PromptBar({
  draft,
  onDraftChange,
  files = [],
  onFilesChange,
  busy = false,
  disabled = false,
  onSend,
  onStop,
  stopLabel,
  onNotice,
  inputRef: externalRef,
  models = [],
  model = "",
  onModelChange,
  reasoning = false,
  onReasoningChange,
  endSlot = null,
}) {
  const localRef = useRef(),
    inputRef = externalRef || localRef,
    picker = useRef(),
    root = useRef();
  const id = useId();
  const [menu, setMenu] = useState(null),
    [active, setActive] = useState(0);
  const commands = [
    {
      key: "/plan",
      name: tx("活动策划", "Plan an activity"),
      text: tx(
        "帮我规划一次社团活动，包含目标、时间安排和准备清单。",
        "Help me plan a club activity with goals, a schedule and a checklist.",
      ),
    },
    {
      key: "/summary",
      name: tx("材料整理", "Summarize materials"),
      text: tx(
        "帮我整理这学期的社团材料，列出待补充的内容。",
        "Help me organize this term’s club materials and identify missing details.",
      ),
    },
    {
      key: "/draft",
      name: tx("通知草稿", "Draft a notice"),
      text: tx("帮我起草一份给社员的活动通知。", "Draft an activity notice for club members."),
    },
  ];
  const token = /(?:^|\s)(\/\w*)$/.exec(draft);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const showCommands = menu !== "dismissed" && !optionsOpen && !!token;
  const suggestions = showCommands ? commands.filter((c) => c.key.startsWith(token[1])) : [];
  const choose = (c) => {
    onDraftChange(draft.slice(0, draft.length - token[1].length) + c.text);
    setMenu(null);
    inputRef.current?.focus();
  };
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const resize = () => {
      el.style.height = "0px";
      const line = parseFloat(getComputedStyle(el).lineHeight) || 24;
      const maxHeight = Math.min(line * 5, window.innerHeight * 0.25);
      el.style.height = `${Math.min(maxHeight, Math.max(line, el.scrollHeight))}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    };
    resize();
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      resize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [draft, inputRef]);
  useEffect(() => {
    if (!menu) return;
    const close = (e) => {
      if (!root.current?.contains(e.target)) setMenu(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menu]);
  useLayoutEffect(() => {
    const bar = root.current;
    if (!bar) return;
    const open = showCommands && suggestions.length > 0;
    if (!open) {
      delete bar.dataset.menuSide;
      return;
    }
    const rect = bar.getBoundingClientRect();
    const above = Math.max(0, rect.top - 72);
    const below = Math.max(0, window.innerHeight - rect.bottom - 16);
    const side = above >= below ? "up" : "down";
    const available = side === "up" ? above : below;
    const room = Math.min(480, Math.max(available, 96));
    bar.dataset.menuSide = side;
    bar.style.setProperty("--pb-menu-max", `${room}px`);
  }, [menu, showCommands, suggestions.length]);
  const send = () => {
    if (!disabled && !busy && (draft.trim() || files.length))
      onSend?.(draft.trim(), { attachments: files });
  };
  const textFile = (file) =>
    /\.(txt|md|csv|markdown|json|js|jsx|ts|tsx|py|java|html|css|sql|xml|yml|yaml)$/i.test(
      file.name || "",
    ) || (file.type || "").startsWith("text/");
  const officeFile = (file) => /\.(pdf|docx|pptx|doc|ppt)$/i.test(file.name || "");
  const receive = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    const accepted = [];
    let skippedType = false;
    let skippedSize = false;
    for (const file of picked) {
      const office = officeFile(file);
      if (!office && !textFile(file)) {
        skippedType = true;
        continue;
      }
      if (file.size > (office ? 8_000_000 : 200_000)) {
        skippedSize = true;
        continue;
      }
      accepted.push(file);
    }
    if (files.length + accepted.length > 4) {
      onNotice?.(tx("最多添加 4 个文件。", "Add up to 4 files."));
      return;
    }
    const total = [...files, ...accepted].reduce((sum, file) => sum + file.size, 0);
    if (total > 12_000_000) {
      onNotice?.(tx("附件一共太大。", "The attachments are too large together."));
      return;
    }
    if (skippedType) {
      onNotice?.(
        tx(
          "支持文本、代码、Word、PDF 和 PPT 文件。",
          "Text, source, Word, PDF, and PPT files are supported.",
        ),
      );
    }
    if (skippedSize) onNotice?.(tx("有个文件太大。", "One of the files is too large."));
    if (accepted.length) onFilesChange([...files, ...accepted]);
  };
  return (
    <div
      className="prompt-bar"
      ref={root}
      data-busy={busy || undefined}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setMenu("dismissed");
          inputRef.current?.focus();
        }
      }}
    >
      {showCommands && suggestions.length > 0 && (
        <div
          className="prompt-bar__menu"
          id={`${id}-commands`}
          role="listbox"
          aria-label={tx("快捷指令", "Commands")}
        >
          {suggestions.map((c, i) => (
            <button
              type="button"
              role="option"
              aria-selected={i === Math.min(active, suggestions.length - 1)}
              id={`${id}-${i}`}
              key={c.key}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(c)}
            >
              <span>{c.key}</span>
              <small>{c.name}</small>
            </button>
          ))}
        </div>
      )}
      <BorderGlow
        className="prompt-bar__glow"
        backgroundColor="#171717"
        borderRadius={28}
        glowColor="270 58 72"
        glowRadius={24}
        glowIntensity={0.7}
        minimumProximity={80}
        edgeSensitivity={38}
        coneSpread={23}
        colors={["#8368a5", "#5f6f9c", "#9872a7"]}
        fillOpacity={0.17}
      >
        <div className="prompt-bar__field">
          {files.length > 0 && (
            <div className="prompt-bar__chips">
              {files.map((f, i) => (
                <span className="prompt-bar__chip" key={`${f.name}-${i}`}>
                  <HugeiconsIcon icon={File02Icon} size={14} />
                  <span title={f.name}>{f.name}</span>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={tx("移除附件 ", "Remove attachment ") + f.name}
                    onClick={() => onFilesChange(files.filter((_, j) => j !== i))}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="prompt-bar__compose-row">
            <button
              type="button"
              className="prompt-bar__tool prompt-bar__attach"
              disabled={disabled || busy}
              aria-label={tx("上传文件", "Upload a file")}
              onClick={() => picker.current?.click()}
            >
              <HugeiconsIcon icon={PlusSignIcon} size={19} />
            </button>

            <textarea
              data-autosize-managed
              ref={inputRef}
              value={draft}
              disabled={disabled}
              rows={1}
              aria-label={tx("消息", "Message")}
              aria-describedby={`${id}-hint`}
              aria-controls={showCommands ? `${id}-commands` : undefined}
              aria-activedescendant={
                suggestions.length ? `${id}-${Math.min(active, suggestions.length - 1)}` : undefined
              }
              placeholder={tx("向 Agent Ollie 提问", "Ask Agent Ollie anything")}
              onChange={(e) => {
                onDraftChange(e.target.value);
                setMenu(null);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                if (e.key === "Escape") {
                  setMenu("dismissed");
                  return;
                }
                if (suggestions.length) {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive(
                      (active + (e.key === "ArrowDown" ? 1 : suggestions.length - 1)) %
                        suggestions.length,
                    );
                    return;
                  }
                  if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
                    e.preventDefault();
                    choose(suggestions[Math.min(active, suggestions.length - 1)]);
                    return;
                  }
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <input
              ref={picker}
              type="file"
              multiple
              hidden
              accept=".txt,.md,.csv,.markdown,.json,.js,.jsx,.ts,.tsx,.py,.java,.html,.css,.sql,.xml,.yml,.yaml,.pdf,.doc,.docx,.ppt,.pptx,text/plain,application/pdf"
              onChange={receive}
            />
            <div className="prompt-bar__bar">
              <AssistantOptions
                models={models}
                model={model}
                onModelChange={onModelChange}
                reasoning={reasoning}
                onReasoningChange={onReasoningChange}
                disabled={disabled || busy}
                onOpenChange={setOptionsOpen}
              />
              {endSlot}
              <button
                type="button"
                className="prompt-bar__send"
                data-stop={busy || undefined}
                disabled={disabled || (!busy && !draft.trim() && !files.length)}
                aria-label={
                  busy
                    ? stopLabel || tx("停止预览", "Stop preview")
                    : tx("发送消息", "Send message")
                }
                onClick={busy ? onStop : send}
              >
                <SendGlyph busy={busy} />
              </button>
            </div>
          </div>
        </div>
      </BorderGlow>
      <span id={`${id}-hint`} className="prompt-bar__hint">
        {tx("Enter 发送 · Shift + Enter 换行", "Enter to send · Shift + Enter for a new line")}
      </span>
    </div>
  );
}
