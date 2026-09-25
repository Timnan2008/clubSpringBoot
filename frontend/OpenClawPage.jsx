import { lazy, memo, Suspense, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Attachment01Icon,
  Calendar03Icon,
  Cancel01Icon,
  Copy01Icon,
  File02Icon,
  Menu01Icon,
  ArrowLeft01Icon,
  PencilEdit01Icon,
  PinIcon,
  PlusSignIcon,
  RefreshIcon,
  Share01Icon,
  Archive01Icon,
  Delete02Icon,
  MoreHorizontalIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import CardNav from "./CardNav";
import PromptBar from "./PromptBar";
import CallChip from "./CallChip";
import AssistantText from "./AssistantText";
import AutoFollowFeed from "./AutoFollowFeed";
import {
  mergeTasks,
  stopTasks,
  stopMessages,
  resolvedCalls,
  conversationFailed,
  isInterruptedConversation,
} from "./openclaw-progress.mjs";
import ThoughtLine from "./ThoughtLine";
import LatticeLoader from "./LatticeLoader";
import TextType from "./TextType";
import { motion } from "motion/react";
import useMotionPreference from "./useMotionPreference";
const Ballpit = lazy(() => import("./Ballpit"));
const WelcomeBalls = memo(function WelcomeBalls({ exiting, onExitComplete }) {
  const reduce = useMotionPreference();
  return reduce ? null : (
    <div className="openclaw-ballpit" data-exiting={exiting || undefined} aria-hidden="true">
      <Suspense fallback={null}>
        <Ballpit
          count={window.innerWidth < 600 ? 55 : 110}
          gravity={0.5}
          friction={0.9975}
          minSize={0.35}
          maxSize={0.7}
          size0={0.85}
          colors={[0x74638d, 0xb6a5cd, 0x45414d]}
          exiting={exiting}
          onExitComplete={onExitComplete}
          ambientIntensity={1.1}
          lightIntensity={100}
          followCursor
        />
      </Suspense>
    </div>
  );
});
import MessageEditor from "./MessageEditor";
import StatusMark from "./StatusMark";
import VoicePill from "./VoicePill";
import { canUseOpenClaw } from "./openclaw-access.mjs";
import { conversationContext } from "./openclaw-context.mjs";
import { en, tx } from "./language";
import "./openclaw.css";

const Icon = ({ icon = SparklesIcon, size = 18 }) => (
  <HugeiconsIcon icon={icon} size={size} strokeWidth={1.7} />
);
const example = {
  prompt: tx(
    "帮我策划一场新社员见面会，整理成可以执行的活动方案。",
    "Plan a welcome event for new club members, with an actionable checklist.",
  ),
};
const knownModel = (value) => (value === "v4" || value === "mimo" ? value : "flash");
const storeKey = (id) => "openclaw-chats:" + id;
const readLocal = (id) => {
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey(id)) || "null");
    return saved && Array.isArray(saved.history) ? saved : null;
  } catch {
    return null;
  }
};
const splitPlans = (text) => {
  const plans = [];
  const kept = [];
  for (const line of String(text || "").split("\n")) {
    if (!line) {
      kept.push("");
      continue;
    }
    const bits = line.split(/(?=(?:^|[.。!！?？])\s*(?:计划|待办|Plan)\s*[:：])/i);
    let residue = "";
    for (const bit of bits) {
      const match = bit.match(/^\s*([.。!！?？])?\s*(?:计划|待办|Plan)\s*[:：]\s*([\s\S]*)$/i);
      if (!match) {
        residue += bit;
        continue;
      }
      if (match[1] && residue.trim()) residue += match[1];
      const body = match[2]
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[.。]\s*$/, "");
      if (body) plans.push(body);
    }
    if (residue.trim()) kept.push(residue.trim());
  }
  return {
    text: kept
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    plans,
  };
};
const messagePlans = (message) => {
  if (!message || message.role !== "assistant") return [];
  const found = [
    ...(message.plans || []),
    ...splitPlans(message.thinking || "").plans,
    ...splitPlans(message.content || "").plans,
  ];
  const unique = [];
  for (const plan of found) {
    const clean = String(plan || "")
      .replace(/\s+/g, " ")
      .trim();
    if (clean && !unique.includes(clean)) unique.push(clean);
  }
  return unique.slice(-6);
};
const answerText = (item) =>
  item?.role === "assistant" ? splitPlans(item.content || "").text : String(item?.content || "");
const thoughtSteps = (thinking) => {
  const text = splitPlans(thinking).text;
  return text ? [text] : [];
};
const latestPlans = (items) => {
  const message = [...items].reverse().find((item) => item.role === "assistant");
  return messagePlans(message);
};
const officeName = (name) => /\.(pdf|docx|pptx|doc|ppt)$/i.test(name || "");
const readBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      const comma = value.indexOf(",");
      resolve(comma >= 0 ? value.slice(comma + 1) : "");
    };
    reader.onerror = () => reject(reader.error || new Error("read"));
    reader.readAsDataURL(file);
  });
const briefStep = (step) => {
  const text = String(step || "")
    .replace(/\s+/g, " ")
    .trim();
  const cut = (text.split(/[。！？!?；;.]/)[0] || text).trim();
  return cut.length > 18 ? `${cut.slice(0, 18)}…` : cut;
};
const stampCall = (chip, previous) => {
  if (chip.status === "pending") return { ...chip, startedAt: 0, elapsedMs: 0, paused: false };
  const startedAt = previous?.startedAt || (chip.status === "pending" ? 0 : Date.now());
  const running = chip.status === "running";
  const wasPaused = Boolean(previous?.paused);
  if (running && wasPaused && chip.paused !== false) {
    return { ...chip, startedAt, elapsedMs: previous.elapsedMs || 0, paused: true };
  }
  if (!running && wasPaused) {
    return { ...chip, startedAt, elapsedMs: previous.elapsedMs || 0, paused: false };
  }
  const elapsedMs =
    chip.status === "done" && Number.isFinite(chip.elapsedMs)
      ? chip.elapsedMs
      : running
        ? Math.max(0, Date.now() - startedAt)
        : previous?.elapsedMs && previous.status !== "running"
          ? previous.elapsedMs
          : Math.max(0, Date.now() - startedAt);
  return { ...chip, startedAt, elapsedMs, paused: false };
};
const effectOf = (call) =>
  call?.effectKind
    ? {
        kind: call.effectKind,
        id: call.effectId || "",
        club: call.effectClub || "",
        text: call.effectText || "",
      }
    : null;
const packHistory = (items) =>
  items.slice(0, 30).map((entry) => ({
    id: entry.id,
    draft: entry.draft || "",
    title: entry.title || "",
    stopped: Boolean(entry.stopped),
    pinned: Boolean(entry.pinned),
    archived: Boolean(entry.archived),
    unread: Boolean(entry.unread),
    failed: conversationFailed(entry),
    calls: (entry.calls || []).slice(-64).map((call) => ({
      ...call,
      ...(effectOf(call) || {}),
      effectKind: call.effectKind || "",
      effectId: call.effectId || "",
      effectClub: call.effectClub || "",
      effectText: call.effectText || "",
      startedAt: Number(call.startedAt) || 0,
      elapsedMs: Number(call.elapsedMs) || 0,
    })),
    messages: (entry.messages || []).slice(-40).map((message) => {
      const assistant = message.role === "assistant";
      const body = assistant ? splitPlans(message.content || "") : { text: message.content || "" };
      const thought = assistant
        ? splitPlans(message.thinking || "")
        : { text: message.thinking || "" };
      return {
        role: message.role,
        content: String(body.text || "").slice(0, 8000),
        thinking: String(thought.text || "").slice(0, 8000),
        tasks: assistant ? mergeTasks([], message.tasks) : [],
        outcome: message.outcome,
        delivered: Boolean(message.delivered),
        plans: assistant ? messagePlans(message).map((plan) => String(plan).slice(0, 200)) : [],
        sources: (message.sources || [])
          .filter((source) => /^https?:\/\/\S+$/i.test(source?.url || ""))
          .slice(0, 5)
          .map((source) => ({
            title: String(source.title || "").slice(0, 120),
            url: source.url,
          })),
        files: (message.files || [])
          .filter((file) => /^\/api\/openclaw\/files\/[0-9a-f-]{36}$/i.test(file?.href || ""))
          .slice(0, 4)
          .map((file) => ({
            name: String(file.name || "file.txt").slice(0, 80),
            href: file.href,
          })),
        attachments: (message.attachments || [])
          .slice(0, 4)
          .map((name) => String(name).slice(0, 80)),
        effects: (message.effects || []).slice(0, 8).map((effect) => ({
          kind: String(effect.kind || ""),
          id: String(effect.id || "").slice(0, 80),
          club: String(effect.club || "").slice(0, 12),
          text: String(effect.text || "").slice(0, 8000),
        })),
      };
    }),
  }));
const toolLabel = (name) =>
  ({
    web_fetch: tx("读取网页正文", "Read page body"),
    update_plan: tx("更新待办", "Update tasks"),
    list_clubs: tx("查看可访问社团", "List accessible clubs"),
    list_documents: tx("查询社团文档目录", "Query club documents"),
    read_document: tx("读取文档正文", "Read document"),
    read_club: tx("查看社团资料", "Read club profile"),
    search_materials: tx("检索资料", "Search materials"),
    web_search: tx("检索公开网页", "Search the web"),
    list_members: tx("查看社员名单", "Read membership"),
    list_join_requests: tx("查看入社申请", "Read join requests"),
    list_calendar: tx("查看日历", "Read calendar"),
    update_club_profile: tx("修改社团资料", "Update club profile"),
    write_document: tx("保存文档", "Save document"),
    add_personal_event: tx("添加个人日程", "Add personal event"),
    add_club_event: tx("添加社团日程", "Add club event"),
    publish_post: tx("发布校园帖", "Publish a post"),
    review_join_request: tx("处理入社申请", "Review a join request"),
    remember: tx("记住一件事", "Remember a fact"),
    forget: tx("忘掉一件事", "Forget a fact"),
    give_file: tx("准备文件", "Prepare a file"),
  })[name] || name;
const markStatus = (status) =>
  status === "cancelled"
    ? "cancelled"
    : status === "error"
      ? "failed"
      : status === "done"
        ? "done"
        : status === "running"
          ? "running"
          : "pending";
const ideas = [
  {
    icon: Calendar03Icon,
    title: tx("策划一场活动", "Plan an activity"),
    detail: tx("把灵感变成清晰的行动方案", "Turn an idea into an actionable plan"),
    draft: example.prompt,
  },
  {
    icon: File02Icon,
    title: tx("整理学期材料", "Organize materials"),
    detail: tx("梳理记录，找出缺失的内容", "Review records and find missing details"),
    draft: tx(
      "帮我整理本学期社团材料，列出需要准备的内容。",
      "Help me organize this term’s club materials and list what is needed.",
    ),
  },
  {
    icon: Attachment01Icon,
    title: tx("起草一份通知", "Draft a notice"),
    detail: tx("让信息完整，也更容易阅读", "Make announcements clear and complete"),
    draft: tx(
      "帮我写一份社团活动通知，包含时间、地点和报名方式。",
      "Draft a club activity notice with the time, location and registration details.",
    ),
  },
];

export default function OpenClawPage() {
  useEffect(() => {
    const left = Date.parse("2026-09-28T00:00:00+08:00") - Date.now();
    if (left <= 0) return;
    const timer = setTimeout(() => location.reload(), left);
    return () => clearTimeout(timer);
  }, []);
  const reduceMotion = useMotionPreference();
  const [welcomeExit, setWelcomeExit] = useState(false);
  const [enteringMessage, setEnteringMessage] = useState(null);
  const finishWelcomeExit = useRef(() => setWelcomeExit(false)).current;
  useEffect(() => {
    if (!welcomeExit) return;
    if (reduceMotion) {
      setWelcomeExit(false);
      return;
    }
    // Fallback when WebGL was unavailable or the document became hidden.
    const timer = setTimeout(finishWelcomeExit, 6500);
    return () => clearTimeout(timer);
  }, [welcomeExit, reduceMotion, finishWelcomeExit]);
  useEffect(() => {
    if (!enteringMessage) return;
    const timer = setTimeout(() => setEnteringMessage(null), 750);
    return () => clearTimeout(timer);
  }, [enteringMessage]);
  const [account, setAccount] = useState(null),
    [loadState, setLoadState] = useState("loading"),
    [reload, setReload] = useState(0);
  const [draft, setDraft] = useState(""),
    [files, setFiles] = useState([]),
    [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false),
    [stopped, setStopped] = useState(false);
  const [connected, setConnected] = useState(false);
  const [token, setToken] = useState("");
  const [model, setModel] = useState("flash");
  const [progressOpen, setProgressOpen] = useState(false);
  const progressSeen = useRef(null);
  const [models, setModels] = useState([
    { id: "flash", label: "DeepSeek V4.1 Flash" },
    { id: "v4", label: "DeepSeek V4 Pro" },
    { id: "mimo", label: "MiMo V2.6" },
  ]);
  const [mimoReady, setMimoReady] = useState(false);
  const [quotaText, setQuotaText] = useState("");
  const [reasoning, setReasoning] = useState(true);
  const modelSettings = useRef({ model, reasoning });
  modelSettings.current = { model, reasoning };
  const [enabled, setEnabled] = useState([
    "profile",
    "documents",
    "calendar",
    "post",
    "search",
    "mcp-school",
    "weather",
    "markdown-converter",
    "document-summary",
    "meeting-notes",
    "meeting-agenda-creator",
    "word-docx",
  ]);
  const [messages, setMessages] = useState([]);
  const [calls, setCalls] = useState([]);
  const [statusLine, setStatusLine] = useState("");
  const chatAbort = useRef(null);
  const [sidebar, setSidebar] = useState(false);
  const [historyMenu, setHistoryMenu] = useState(null);
  const [rename, setRename] = useState(null);
  const [editing, setEditing] = useState(null);
  const [rollback, setRollback] = useState(null);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [deletingFile, setDeletingFile] = useState(false);
  const [approval, setApproval] = useState(null);
  const approvalWait = useRef(null);
  const speech = useRef(null);
  const speechBase = useRef("");
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());
  const viewRef = useRef(conversationId);
  viewRef.current = conversationId;
  const liveRef = useRef({ id: "", messages: [], calls: [], working: false, approval: null });
  const runToken = useRef(0);
  const [history, setHistory] = useState([]);
  const persistReady = useRef(false);
  const serverSync = useRef(false);
  const lastSent = useRef("");
  const snapshotRef = useRef("");
  const historyReset = useRef(0);
  useEffect(() => {
    if (!account?.id) return;
    let cancel = false;
    persistReady.current = false;
    (async () => {
      let remote = null;
      let serverOk = false;
      try {
        const response = await fetch("/api/openclaw/history", { credentials: "same-origin" });
        if (response.ok) {
          serverOk = true;
          remote = await response.json();
        }
      } catch {
        remote = null;
      }
      if (cancel) return;
      let local = readLocal(account.id);
      historyReset.current = Number(remote?.resetAt) || 0;
      if (serverOk && historyReset.current !== (Number(local?.resetAt) || 0)) {
        local = null;
        localStorage.removeItem(storeKey(account.id));
      }
      const localAt = Number(local?.updatedAt) || 0;
      const remoteAt = Number(remote?.updatedAt) || 0;
      const source =
        remote?.saved && remoteAt >= localAt ? remote : local || (remote?.saved ? remote : null);
      const preferLocal = Boolean(local && (!remote?.saved || localAt > remoteAt));
      if (source) {
        if (source.model === "flash" || source.model === "v4" || source.model === "mimo")
          setModel(source.model);
        if (typeof source.reasoning === "boolean") setReasoning(source.reasoning);
        if (Array.isArray(source.enabled)) {
          const saved = source.enabled.filter((id) => id && id !== "sandbox");
          const legacy = [
            "profile",
            "documents",
            "calendar",
            "post",
            "search",
            "mcp-school",
            "weather",
            "markdown-converter",
            "document-summary",
          ];
          const officeSkills = [
            "weather",
            "markdown-converter",
            "document-summary",
            "meeting-notes",
            "meeting-agenda-creator",
            "word-docx",
          ];
          const untouched =
            saved.length === legacy.length && legacy.every((id) => saved.includes(id));
          const withSkills = untouched
            ? [...saved, "meeting-notes", "meeting-agenda-creator", "word-docx"]
            : saved.some((id) => officeSkills.includes(id))
              ? saved
              : [...saved, ...officeSkills];
          setEnabled(withSkills.slice(0, 12));
        }
        const packed = packHistory(source.history || []);
        setHistory(packed);
        const active = packed.find((item) => item.id === source.activeId);
        if (active) {
          setConversationId(active.id);
          setDraft(active.draft || "");
          setMessages(active.messages || []);
          setCalls(active.calls || []);
          setStopped(Boolean(active.stopped));
        }
      }
      lastSent.current = JSON.stringify({
        activeId: source?.activeId || "",
        model: knownModel(source?.model),
        reasoning: source?.reasoning !== false,
        enabled: Array.isArray(source?.enabled)
          ? source.enabled.filter((id) => id && id !== "sandbox").slice(0, 12)
          : [],
        history: packHistory(source?.history || []),
      });
      serverSync.current = serverOk;
      persistReady.current = true;
      if ((serverOk && remote && !remote.saved && local?.history?.length) || preferLocal)
        lastSent.current = "";
    })();
    return () => {
      cancel = true;
    };
  }, [account?.id]);
  useEffect(() => {
    if (!persistReady.current) return;
    if (!draft.trim() && !files.length && !messages.length) {
      setHistory((items) =>
        items.some((item) => item.id === conversationId)
          ? items.filter((item) => item.id !== conversationId)
          : items,
      );
      return;
    }
    const entry = {
      id: conversationId,
      draft,
      files,
      messages,
      calls,
      stopped: stopped || busy,
      title:
        messages.find((item) => item.role === "user")?.content.slice(0, 36) ||
        draft.trim().slice(0, 36) ||
        files[0]?.name,
    };
    setHistory((items) => {
      const index = items.findIndex((item) => item.id === conversationId);
      const next = {
        ...entry,
        pinned: false,
        archived: false,
        unread: false,
        working: busy && liveRef.current.id === conversationId,
      };
      if (index < 0) return [next, ...items];
      return items.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              ...entry,
              pinned: Boolean(item.pinned),
              archived: Boolean(item.archived),
              unread: false,
              working: busy && liveRef.current.id === conversationId,
            }
          : item,
      );
    });
  }, [conversationId, draft, files, messages, calls, stopped, busy]);
  useEffect(() => {
    if (!persistReady.current || !account?.id) return;
    const body = JSON.stringify({
      updatedAt: Date.now(),
      resetAt: historyReset.current,
      activeId: conversationId,
      model,
      reasoning,
      enabled: enabled.filter((id) => id !== "sandbox"),
      history: packHistory(history),
    });
    snapshotRef.current = body;
    try {
      localStorage.setItem(storeKey(account.id), body);
    } catch {
      /* The browser may refuse storage when the quota is full. */
    }
    if (!serverSync.current || body === lastSent.current) return;
    const save = setTimeout(() => {
      lastSent.current = body;
      fetch("/api/openclaw/history", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      })
        .then((response) => {
          if (response.status === 409) location.reload();
        })
        .catch(() => {
          lastSent.current = "";
        });
    }, 500);
    return () => clearTimeout(save);
  }, [account?.id, conversationId, model, reasoning, enabled, history]);
  useEffect(() => {
    const sendSnapshot = (body) =>
      fetch("/api/openclaw/history", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    const onLanguage = (event) => {
      const body = snapshotRef.current;
      if (!body) return;
      event.preventDefault();
      const href = event.detail?.href;
      const go = () => href && location.assign(href);
      if (!serverSync.current) {
        go();
        return;
      }
      lastSent.current = body;
      sendSnapshot(body).finally(go);
    };
    const onHide = () => {
      const body = snapshotRef.current;
      if (!body || !serverSync.current || body === lastSent.current) return;
      lastSent.current = body;
      sendSnapshot(body).catch(() => {
        lastSent.current = "";
      });
    };
    window.addEventListener("club-language-change", onLanguage);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("club-language-change", onLanguage);
      window.removeEventListener("pagehide", onHide);
    };
  }, [account?.id]);
  const input = useRef(),
    timer = useRef(),
    frame = useRef(),
    run = useRef(0),
    followOutput = useRef(true),
    transcript = useRef();
  const notice = (description) => setFeedback(description);
  useEffect(() => {
    if (!sidebar && !historyMenu) return;
    const dismiss = (event) => {
      if (event.key === "Escape") {
        setSidebar(false);
        setHistoryMenu(null);
      }
    };
    const away = (event) => {
      if (event.target.closest?.(".openclaw-history-menu")) return;
      setHistoryMenu(null);
    };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", away);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", away);
    };
  }, [sidebar, historyMenu]);
  useEffect(() => {
    const abort = new AbortController();
    setLoadState("loading");
    fetch("/api/openclaw/bootstrap", { signal: abort.signal, credentials: "same-origin" })
      .then(async (r) => {
        if (r.status === 401) {
          setLoadState("signed-out");
          return;
        }
        if (r.status === 403) {
          setLoadState("forbidden");
          return;
        }
        if (!r.ok) throw Error("unavailable");
        const data = await r.json();
        if (!canUseOpenClaw(data.account)) {
          setLoadState("forbidden");
          return;
        }
        setAccount(data.account);
        setConnected(data.connected === true);
        setMimoReady(data.mimo === true);
        setToken(data.token || "");
        if (Array.isArray(data.models) && data.models.length) setModels(data.models);
        if (typeof data.quota === "string") setQuotaText(data.quota);
        setLoadState("ready");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setLoadState("error");
      });
    return () => abort.abort();
  }, [reload]);
  useEffect(() => {
    if (loadState !== "ready") return;
    const available = models.find((item) => item.id === model && (item.id !== "mimo" || mimoReady));
    if (!available) {
      const fallback = models.find((item) => item.id !== "mimo" || mimoReady);
      if (fallback) setModel(fallback.id);
    }
  }, [loadState, models, model, mimoReady]);
  const cancel = () => {
    run.current += 1;
    clearTimeout(timer.current);
    cancelAnimationFrame(frame.current);
  };
  useEffect(
    () => () => {
      run.current += 1;
      clearTimeout(timer.current);
      cancelAnimationFrame(frame.current);
    },
    [],
  );
  useEffect(() => {
    if (!followOutput.current) return;
    const panel = transcript.current;
    if (panel) panel.scrollTop = panel.scrollHeight;
  }, [busy, messages, calls, statusLine]);
  const stop = () => {
    approvalWait.current?.(false);
    runToken.current += 1;
    const id = liveRef.current.id;
    if (id) {
      const stoppedMessages = stopMessages(liveRef.current.messages);
      const stoppedCalls = stopTasks(liveRef.current.calls);
      liveRef.current = {
        ...liveRef.current,
        messages: stoppedMessages,
        calls: stoppedCalls,
        working: false,
        approval: null,
      };
      if (viewRef.current === id) {
        setMessages(stoppedMessages);
        setCalls(stoppedCalls);
      }
      setHistory((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                working: false,
                awaiting: false,
                stopped: true,
                messages: stoppedMessages,
                calls: stoppedCalls,
                unread: viewRef.current !== id,
              }
            : item,
        ),
      );
    }
    if (chatAbort.current) {
      chatAbort.current.abort();
      chatAbort.current = null;
    }
    if (!id || viewRef.current === id) {
      setBusy(false);
      setStopped(true);
      setStatusLine("");
      setApproval(null);
    }
    notice(tx("已停止这次回复。", "Reply stopped."));
  };
  const patchConversation = (id, patch) => {
    setHistory((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };
  const shareConversation = async (entry) => {
    const lines = [entry.title || tx("对话", "Conversation")];
    for (const message of entry.messages || []) {
      lines.push(
        `${message.role === "user" ? tx("我", "Me") : "Agent Ollie"}: ${message.content || ""}`,
      );
    }
    await copyText(lines.join("\n"));
    setHistoryMenu(null);
  };
  const beginSpeech = () => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      notice(tx("这个浏览器不能语音输入。", "This browser cannot take voice input."));
      return;
    }
    speech.current?.stop();
    const recognition = new Ctor();
    recognition.lang = en ? "en-US" : "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    speechBase.current = draft;
    recognition.onresult = (event) => {
      let heard = "";
      for (let i = 0; i < event.results.length; i += 1) heard += event.results[i][0].transcript;
      const base = speechBase.current;
      setDraft(`${base}${base && heard ? " " : ""}${heard}`);
    };
    recognition.onerror = () =>
      notice(tx("没有听清，请再试一次。", "Could not hear that. Try again."));
    recognition.start();
    speech.current = recognition;
  };
  const endSpeech = (reason) => {
    speech.current?.stop();
    speech.current = null;
    if (reason === "cancel") setDraft(speechBase.current);
  };
  const flushLive = () => {
    const leaving = liveRef.current;
    if (!leaving.id || !leaving.working) return;
    setHistory((items) =>
      items.map((item) =>
        item.id === leaving.id
          ? {
              ...item,
              messages: leaving.messages?.length ? leaving.messages : item.messages,
              calls: leaving.calls || item.calls,
              working: true,
            }
          : item,
      ),
    );
  };
  const fresh = () => {
    setFeedback("");
    setWelcomeExit(false);
    setEnteringMessage(null);
    flushLive();
    const nextId = crypto.randomUUID();
    viewRef.current = nextId;
    cancel();
    setBusy(false);
    setStopped(false);
    setSidebar(false);
    setHistoryMenu(null);
    setApproval(null);
    setConversationId(nextId);
    setDraft("");
    setFiles([]);
    setMessages([]);
    setCalls([]);
    setProgressOpen(false);
    setStatusLine("");
    input.current?.focus();
  };
  const deleteConversation = (id) => {
    setHistoryMenu(null);
    if (liveRef.current.id === id) {
      approvalWait.current?.(false);
      runToken.current += 1;
      chatAbort.current?.abort();
      chatAbort.current = null;
      liveRef.current = { id: "", messages: [], calls: [], working: false, approval: null };
    }
    setHistory((items) => items.filter((item) => item.id !== id));
    if (id === conversationId) fresh();
  };
  const sendMessage = async (text, meta, priorMessages) => {
    setFeedback("");
    const chatId = conversationId;
    const requestSettings = { ...modelSettings.current };
    const ready = requestSettings.model === "mimo" ? mimoReady : connected;
    if (!ready) {
      notice(
        tx(
          "Agent Ollie 尚未连接。文字和附件已保留在当前页面，未发送。",
          "Agent Ollie is not connected. Your text and attachments remain in this page and have not been sent.",
        ),
        tx("尚未连接", "Not connected"),
      );
      return;
    }
    const uploads = [];
    for (const file of meta?.attachments || []) {
      if (officeName(file.name)) uploads.push({ name: file.name, data: await readBase64(file) });
      else {
        const raw = await file.text();
        uploads.push({ name: file.name, text: raw.slice(0, 20000) });
      }
    }
    const typed = (text || "").trim();
    const body =
      typed || (uploads.length ? tx("请根据我附上的文件处理。", "Use the attached files.") : "");
    if (!body) return;
    const previousId = liveRef.current.id;
    approvalWait.current?.(false);
    const generation = ++runToken.current;
    const alive = () => runToken.current === generation;
    const onScreen = () => alive() && viewRef.current === chatId;
    if (chatAbort.current) {
      chatAbort.current.abort();
      chatAbort.current = null;
    }
    if (isInterruptedConversation(liveRef.current, chatId)) {
      setHistory((items) =>
        items.map((item) =>
          item.id === previousId
            ? {
                ...item,
                working: false,
                stopped: true,
                failed: true,
                awaiting: false,
                unread: false,
              }
            : item,
        ),
      );
    }
    const keep = (patch) => {
      const live =
        liveRef.current.id === chatId
          ? liveRef.current
          : { id: chatId, messages: [], calls: [], approval: null };
      liveRef.current = { ...live, ...patch, id: chatId, working: true };
    };
    const publishMessages = (updater) => {
      if (!alive()) return;
      const prev = liveRef.current.id === chatId ? liveRef.current.messages || [] : [];
      const next = typeof updater === "function" ? updater(prev) : updater;
      keep({ messages: next });
      if (onScreen()) setMessages(next);
      else
        setHistory((items) =>
          items.map((item) =>
            item.id === chatId ? { ...item, messages: next, working: true } : item,
          ),
        );
    };
    const publishCalls = (updater) => {
      if (!alive()) return;
      const prev = liveRef.current.id === chatId ? liveRef.current.calls || [] : [];
      const next = typeof updater === "function" ? updater(prev) : updater;
      keep({ calls: next });
      if (onScreen()) setCalls(next);
      else
        setHistory((items) =>
          items.map((item) =>
            item.id === chatId ? { ...item, calls: next, working: true } : item,
          ),
        );
    };
    const finish = (failed) => {
      if (!alive()) return;
      const live = liveRef.current;
      const lastAnswer = live.messages?.[live.messages.length - 1];
      const delivered =
        lastAnswer?.role === "assistant" && (lastAnswer.delivered || lastAnswer.files?.length > 0);
      const effectiveFailed = Boolean(failed && !delivered);
      const completedMessages = (live.messages || []).map((message, index, list) =>
        index === list.length - 1 && message.role === "assistant"
          ? {
              ...message,
              outcome: effectiveFailed ? "failed" : "completed",
              tasks: stopTasks(message.tasks),
              delivered: Boolean(delivered),
            }
          : message,
      );
      live.messages = completedMessages;
      if (viewRef.current === chatId) setMessages(completedMessages);
      liveRef.current = { ...live, working: false, approval: null };
      setHistory((items) =>
        items.map((item) =>
          item.id === chatId
            ? {
                ...item,
                messages: live.messages?.length ? live.messages : item.messages,
                calls: live.calls || item.calls,
                working: false,
                awaiting: false,
                failed: effectiveFailed,
                unread: effectiveFailed ? false : viewRef.current !== chatId,
                stopped: effectiveFailed,
              }
            : item,
        ),
      );
      if (viewRef.current === chatId) {
        setBusy(false);
        setStopped(effectiveFailed);
        setStatusLine("");
        setApproval(null);
      }
    };
    cancel();
    const controller = new AbortController();
    chatAbort.current = controller;
    const prior =
      priorMessages || (liveRef.current.id === chatId ? liveRef.current.messages : messages);
    const seeded = [
      ...prior,
      {
        role: "user",
        content: typed || body,
        attachments: uploads.map((file) => file.name),
      },
      { role: "assistant", content: "", thinking: "", sources: [], files: [] },
    ];
    liveRef.current = { id: chatId, messages: seeded, calls: [], working: true, approval: null };
    if (viewRef.current === chatId) {
      setDraft("");
      setFiles([]);
      setBusy(true);
      setStopped(false);
      setStatusLine("");
      setCalls([]);
      if (!reduceMotion) {
        if (!messages.length && !prior.length) setWelcomeExit(true);
        setEnteringMessage({ chatId, index: prior.length });
      }
      setMessages(seeded);
      setApproval(null);
    } else {
      setHistory((items) =>
        items.map((item) =>
          item.id === chatId
            ? {
                ...item,
                messages: seeded,
                calls: [],
                working: true,
                unread: false,
                failed: false,
                awaiting: false,
              }
            : item,
        ),
      );
    }
    followOutput.current = true;
    try {
      const response = await fetch("/api/openclaw/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(token ? { "X-Workspace-Token": token } : {}),
        },
        body: JSON.stringify({
          conversationId: chatId,
          history: conversationContext(prior),
          resetAt: historyReset.current,
          text: body,
          model: requestSettings.model,
          reasoning: requestSettings.reasoning,
          language: en ? "en" : "zh",
          attachments: uploads,
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const status = response.status;
        throw Error(
          status === 404
            ? tx("404 网络错误", "404 Network Error")
            : status >= 500
              ? tx(`${status} 服务暂时不可用`, `${status} Service Unavailable`)
              : status
                ? tx(`${status} 网络错误`, `${status} Network Error`)
                : tx("网络错误", "Network Error"),
        );
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        if (!alive()) return;
        const chunk = await reader.read();
        if (!alive()) return;
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() || "";
        for (const line of parts) {
          if (!alive()) return;
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          const event = JSON.parse(data);
          if (typeof event.quota === "string") setQuotaText(event.quota);
          if (event.replace) {
            publishMessages((items) => {
              const next = items.slice();
              const last = next[next.length - 1];
              if (last?.role === "assistant")
                next[next.length - 1] = {
                  ...last,
                  content: event.content || "",
                  thinking: "thinking" in event ? event.thinking || "" : last.thinking,
                  sources: event.content ? last.sources : [],
                  files: event.content ? last.files : [],
                };
              return next;
            });
            continue;
          }
          if (event.error) {
            publishMessages((items) => {
              const next = items.slice();
              const last = next[next.length - 1];
              if (last?.role === "assistant" && !last.content)
                next[next.length - 1] = { ...last, content: event.error };
              return next;
            });
            throw Error(event.error);
          }
          if (event.approval?.id) {
            const pauseRunning = (paused) => {
              publishCalls((items) =>
                items.map((chip) => {
                  if (chip.status !== "running")
                    return chip.paused ? { ...chip, paused: false } : chip;
                  if (paused) {
                    return {
                      ...chip,
                      paused: true,
                      elapsedMs: Math.max(0, Date.now() - (chip.startedAt || Date.now())),
                    };
                  }
                  return { ...chip, paused: false, startedAt: Date.now() - (chip.elapsedMs || 0) };
                }),
              );
            };
            const markAwaiting = (waiting) => {
              setHistory((items) =>
                items.map((item) => (item.id === chatId ? { ...item, awaiting: waiting } : item)),
              );
            };
            markAwaiting(true);
            pauseRunning(true);
            const approved = await new Promise((resolve) => {
              approvalWait.current = resolve;
              liveRef.current = { ...liveRef.current, approval: event.approval };
              if (onScreen()) setApproval(event.approval);
            });
            if (!alive()) return;
            approvalWait.current = null;
            liveRef.current = { ...liveRef.current, approval: null };
            markAwaiting(false);
            pauseRunning(false);
            if (onScreen()) setApproval(null);
            await fetch("/api/openclaw/approve", {
              method: "POST",
              credentials: "same-origin",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { "X-Workspace-Token": token } : {}),
              },
              body: JSON.stringify({ id: event.approval.id, approved: Boolean(approved) }),
            }).catch(() => {});
            continue;
          }
          if (Array.isArray(event.tasks)) {
            publishMessages((items) =>
              items.map((message, index) =>
                index === items.length - 1 && message.role === "assistant"
                  ? { ...message, tasks: mergeTasks(message.tasks, event.tasks) }
                  : message,
              ),
            );
          }
          if (event.name) {
            let recorded = null;
            publishCalls((items) => {
              const next = items.slice();
              const index = next.findIndex((item) => item.id === event.id);
              const previous = index < 0 ? null : next[index];
              const chip = stampCall(
                {
                  id: event.id || crypto.randomUUID(),
                  name: event.name,
                  argument: event.argument || "",
                  status: event.status || "running",
                  elapsedMs: event.elapsedMs == null ? undefined : Number(event.elapsedMs),
                  icon: event.icon || "terminal",
                  link: event.link || previous?.link || "",
                  linkLabel: event.linkLabel || previous?.linkLabel || "",
                  effectKind: event.effectKind || previous?.effectKind || "",
                  effectId: event.effectId || previous?.effectId || "",
                  effectClub: event.effectClub || previous?.effectClub || "",
                  effectText: event.effectText || previous?.effectText || "",
                },
                previous,
              );
              recorded = event.effectKind ? effectOf(chip) : null;
              if (index < 0) next.push(chip);
              else next[index] = chip;
              return next;
            });
            if (recorded) {
              publishMessages((items) => {
                const next = items.slice();
                const last = next[next.length - 1];
                if (last?.role !== "assistant") return items;
                const effects = [...(last.effects || []), recorded].filter(Boolean).slice(-8);
                next[next.length - 1] = { ...last, effects };
                return next;
              });
            }
          } else if (event.status && onScreen()) setStatusLine(event.status);
          if (event.reasoning) {
            publishMessages((items) => {
              const next = items.slice();
              const last = next[next.length - 1];
              if (last?.role === "assistant")
                next[next.length - 1] = {
                  ...last,
                  thinking: (last.thinking || "") + event.reasoning,
                };
              return next;
            });
          }
          if (event.delta) {
            publishMessages((items) => {
              const next = items.slice();
              const last = next[next.length - 1];
              if (last?.role === "assistant")
                next[next.length - 1] = { ...last, content: last.content + event.delta };
              return next;
            });
          }
          if (Array.isArray(event.sources)) {
            const sources = event.sources.filter((source) =>
              /^https?:\/\/\S+$/i.test(source?.url || ""),
            );
            if (sources.length) {
              publishMessages((items) => {
                const next = items.slice();
                const last = next[next.length - 1];
                if (last?.role === "assistant")
                  next[next.length - 1] = {
                    ...last,
                    sources: [...(last.sources || []), ...sources].slice(0, 5),
                  };
                return next;
              });
            }
          }
          if (
            event.file &&
            /^\/api\/openclaw\/files\/[0-9a-f-]{36}$/i.test(event.file.href || "")
          ) {
            const file = {
              name: String(event.file.name || "file.txt").slice(0, 80),
              href: event.file.href,
            };
            publishMessages((items) => {
              const next = items.slice();
              const last = next[next.length - 1];
              if (last?.role === "assistant")
                next[next.length - 1] = {
                  ...last,
                  files: [...(last.files || []), file].slice(0, 4),
                };
              return next;
            });
          }
          if ((event.delta || event.reasoning) && onScreen()) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
          }
        }
      }
      finish(false);
    } catch (error) {
      if (!alive() || error.name === "AbortError") return;
      finish(true);
      if (viewRef.current !== chatId) return;
      notice(
        error instanceof TypeError
          ? tx("网络错误", "Network Error")
          : error.message && error.message !== "unavailable"
            ? error.message
            : tx("网络错误", "Network Error"),
        tx("无法连接", "Network Error"),
      );
    }
  };
  const copyText = async (text) => {
    const value = String(text || "");
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      notice(tx("已复制", "Copied"));
    } catch {
      notice(tx("没有复制成功", "Could not copy"));
    }
  };
  const editMessage = (index) => {
    const message = messages[index];
    if (busy || message?.role !== "user") return;
    setEditing({ index, text: message.content || "" });
  };
  const effectsAfter = (index) =>
    messages.slice(index + 1).flatMap((message) => message.effects || []);
  const confirmFileDelete = async () => {
    const target = fileToDelete;
    if (
      !target ||
      deletingFile ||
      busy ||
      !/^\/api\/openclaw\/files\/[0-9a-f-]{36}$/i.test(target.href)
    )
      return;
    setDeletingFile(true);
    try {
      const response = await fetch(target.href, {
        method: "DELETE",
        credentials: "same-origin",
        headers: token ? { "X-Workspace-Token": token } : {},
      });
      if (!response.ok) throw new Error(tx("删除失败，请稍后再试。", "Could not delete the file."));
      const removeFile = (items = []) =>
        items.map((message) => {
          if (!(message.files || []).some((file) => file.href === target.href)) return message;
          return {
            ...message,
            delivered: true,
            files: message.files.filter((file) => file.href !== target.href),
          };
        });
      setMessages((items) => removeFile(items));
      if (liveRef.current.id === conversationId) {
        liveRef.current = { ...liveRef.current, messages: removeFile(liveRef.current.messages) };
      }
      setHistory((items) =>
        items.map((entry) => ({
          ...entry,
          messages: removeFile(entry.messages),
        })),
      );
      setFileToDelete(null);
    } catch (error) {
      notice(error.message || tx("删除失败，请稍后再试。", "Could not delete the file."));
    } finally {
      setDeletingFile(false);
    }
  };
  const confirmRollback = async () => {
    if (!rollback) return;
    const { index, text } = rollback;
    const effects = effectsAfter(index);
    if (effects.length) {
      const response = await fetch("/api/openclaw/rollback", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-Workspace-Token": token } : {}),
        },
        body: JSON.stringify({ effects }),
      });
      const payload = response.ok ? await response.json() : { results: [] };
      const failed = (payload.results || []).filter((item) => item.ok !== "1");
      if (!response.ok || failed.length) {
        notice(
          failed
            .map((item) => item.message)
            .filter(Boolean)
            .join("；") ||
            tx(
              "有些操作没有撤回，这次没有重发。",
              "Some changes were not undone, so it was not sent again.",
            ),
        );
        return;
      }
    }
    setRollback(null);
    setEditing(null);
    setCalls([]);
    sendMessage(text, null, messages.slice(0, index));
  };
  const regenerate = (index) => {
    if (busy) return;
    let userIndex = index - 1;
    while (userIndex >= 0 && messages[userIndex]?.role !== "user") userIndex -= 1;
    if (userIndex < 0) return;
    const text = messages[userIndex].content || "";
    setCalls([]);
    sendMessage(text, null, messages.slice(0, userIndex));
  };
  const openConversation = (entry) => {
    setWelcomeExit(false);
    setEnteringMessage(null);
    if (entry.id === conversationId) {
      setSidebar(false);
      patchConversation(entry.id, { unread: false, failed: false });
      return;
    }
    flushLive();
    viewRef.current = entry.id;
    cancel();
    const live = liveRef.current.id === entry.id ? liveRef.current : null;
    const shownMessages = live?.messages?.length ? live.messages : entry.messages || [];
    setConversationId(entry.id);
    setDraft(entry.draft || "");
    setFiles(entry.files || []);
    setMessages(shownMessages);
    setCalls(live?.calls || entry.calls || []);
    setProgressOpen(
      Boolean((live?.calls || entry.calls || []).length || latestPlans(shownMessages).length),
    );
    setStopped(Boolean(entry.stopped));
    setBusy(Boolean(live?.working || entry.working));
    setApproval(live?.approval || null);
    setStatusLine("");
    setSidebar(false);
    patchConversation(entry.id, { unread: false, failed: false });
    followOutput.current = true;
  };
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const displayCalls = resolvedCalls(calls, !busy && lastAssistant?.outcome === "completed");
  const todos = lastAssistant?.tasks?.length
    ? mergeTasks([], lastAssistant.tasks).map((task) =>
        ["running", "pending"].includes(task.status) && !busy
          ? { ...task, status: "cancelled" }
          : task.status === "running" && approval
            ? { ...task, status: "pending" }
            : task,
      )
    : displayCalls.map((call) => ({
        id: call.id,
        label:
          toolLabel(call.name) +
          (call.argument && call.argument !== "{}" ? ` · ${call.argument}` : ""),
        status:
          call.recovered || call.unavailable
            ? "cancelled"
            : ["running", "pending"].includes(call.status) && !busy
              ? "cancelled"
              : markStatus(call.status),
      }));
  useEffect(() => {
    if (progressSeen.current === conversationId || (!todos.length && !calls.length)) return;
    progressSeen.current = conversationId;
    setProgressOpen(true);
  }, [conversationId, todos.length, calls.length]);
  const historyMark = (entry) => {
    const waiting =
      liveRef.current.id === entry.id &&
      liveRef.current.working &&
      Boolean(liveRef.current.approval?.id);
    if (waiting) {
      return (
        <i
          className="openclaw-history-mark"
          data-kind="approval"
          aria-label={tx("等待批准", "Waiting for approval")}
        />
      );
    }
    if (entry.working || (busy && entry.id === conversationId)) {
      return (
        <i
          className="openclaw-history-mark"
          data-kind="working"
          aria-label={tx("正在回复", "Working")}
        />
      );
    }
    if (conversationFailed(entry)) {
      return (
        <i
          className="openclaw-history-mark"
          data-kind="error"
          aria-label={tx("没有完成", "Did not finish")}
        />
      );
    }
    if (entry.unread && entry.id !== conversationId) {
      return (
        <i className="openclaw-history-mark" data-kind="unread" aria-label={tx("未读", "Unread")} />
      );
    }
    return null;
  };
  const openHistoryMenu = (id, anchor) => {
    const rect = anchor.getBoundingClientRect();
    const width = 188;
    const height = 232;
    let x = rect.right - width;
    if (x < 8) x = 8;
    if (x + width > window.innerWidth - 8) x = window.innerWidth - width - 8;
    let y = rect.bottom + 4;
    if (y + height > window.innerHeight - 8) y = Math.max(8, rect.top - height - 4);
    setHistoryMenu({ id, x, y });
  };
  const role = {
    admin: tx("管理员", "Administrator"),
    teacher: tx("老师", "Teacher"),
    president: tx("社长", "Club president"),
  }[account?.role];
  const roleLabel = account?.position === "vice_president" ? tx("副社长", "Vice president") : role;
  if (loadState !== "ready")
    return (
      <div className="openclaw-gate" role="status">
        <span className="openclaw-brand-mark">
          <Icon size={25} />
        </span>
        <h1>Agent Ollie</h1>
        <p>
          {loadState === "loading"
            ? tx("正在验证访问权限…", "Checking access…")
            : loadState === "forbidden"
              ? tx(
                  "此入口仅向社长、副社长、老师和管理员开放。",
                  "This workspace is available to club presidents, vice presidents, teachers and administrators.",
                )
              : loadState === "signed-out"
                ? tx("请先登录校园账号。", "Sign in with your school account.")
                : tx("暂时无法加载，请重试。", "Unable to load. Please try again.")}
        </p>
        {loadState === "signed-out" ? (
          <a href="/page/user/login?next=%2Fpage%2Fopenclaw">{tx("去登录", "Sign in")}</a>
        ) : loadState === "error" ? (
          <button onClick={() => setReload((n) => n + 1)}>{tx("重新加载", "Retry")}</button>
        ) : (
          loadState !== "loading" && <a href="/">{tx("返回首页", "Back home")}</a>
        )}
      </div>
    );
  return (
    <div className="openclaw-shell">
      <div className="openclaw-site-nav">
        <CardNav active="openclaw" account={account} />
      </div>
      <div className="openclaw-spark">
        <div className="openclaw-workspace" data-rail={progressOpen ? "open" : "closed"}>
          {sidebar && (
            <button
              className="openclaw-backdrop"
              aria-label={tx("关闭对话菜单背景", "Dismiss conversation backdrop")}
              onClick={() => setSidebar(false)}
            />
          )}
          <aside
            id="openclaw-sidebar"
            className="openclaw-sidebar"
            data-open={sidebar || undefined}
          >
            <div className="openclaw-drawer-heading">
              <strong>{tx("对话历史", "Conversations")}</strong>
              <button
                className="openclaw-sidebar-close"
                aria-label={tx("关闭对话菜单", "Close conversations")}
                onClick={() => setSidebar(false)}
              >
                <Icon icon={Cancel01Icon} />
              </button>
            </div>
            <button type="button" className="openclaw-new" onClick={fresh}>
              <Icon icon={PlusSignIcon} />
              {tx("新对话", "New conversation")}
            </button>
            <div className="openclaw-history">
              {quotaText ? <p className="openclaw-history-label">{quotaText}</p> : null}
              {[
                [
                  tx("已固定", "Pinned"),
                  history.filter((entry) => entry.pinned && !entry.archived),
                ],
                [
                  tx("最近", "Recents"),
                  history.filter((entry) => !entry.pinned && !entry.archived),
                ],
                [tx("已归档", "Archived"), history.filter((entry) => entry.archived)],
              ].map(([label, entries]) =>
                entries.length ? (
                  <div key={label} className="openclaw-history-group">
                    <p className="openclaw-history-label">{label}</p>
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="openclaw-sidebar-row"
                        data-current={entry.id === conversationId || undefined}
                      >
                        {rename?.id === entry.id ? (
                          <input
                            className="openclaw-rename"
                            value={rename.title}
                            aria-label={tx("对话名称", "Conversation name")}
                            autoFocus
                            onChange={(event) =>
                              setRename({ id: entry.id, title: event.target.value })
                            }
                            onBlur={() => {
                              const title = rename.title.trim();
                              if (title) patchConversation(entry.id, { title: title.slice(0, 80) });
                              setRename(null);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") event.currentTarget.blur();
                              if (event.key === "Escape") setRename(null);
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            className="openclaw-sidebar-item"
                            aria-current={entry.id === conversationId ? "page" : undefined}
                            title={entry.title}
                            onClick={() => openConversation(entry)}
                            onContextMenu={(event) => {
                              event.preventDefault();
                              const row = event.currentTarget.closest(".openclaw-sidebar-row");
                              openHistoryMenu(entry.id, row || event.currentTarget);
                            }}
                          >
                            <span>{entry.title}</span>
                            {historyMark(entry)}
                            {!entry.messages?.length && <small>{tx("草稿", "Draft")}</small>}
                          </button>
                        )}
                        <div className="openclaw-sidebar-actions">
                          <button
                            type="button"
                            aria-label={tx("对话菜单", "Conversation menu")}
                            onClick={(event) => {
                              const row = event.currentTarget.closest(".openclaw-sidebar-row");
                              openHistoryMenu(entry.id, row || event.currentTarget);
                            }}
                          >
                            <Icon icon={MoreHorizontalIcon} size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null,
              )}
              {!history.length && (
                <p className="openclaw-history-empty">{tx("还没有对话", "No conversations yet")}</p>
              )}
            </div>
            <div className="openclaw-sidebar-bottom">
              <a href="/page/club/workspace">
                <Icon icon={ArrowLeft01Icon} />
                {tx("返回社团管理", "Back to club management")}
              </a>
              <div className="openclaw-person">
                <strong>{en ? account.nameEn || account.name : account.name}</strong>
                <span>{roleLabel}</span>
              </div>
            </div>
          </aside>
          <main className="openclaw-main" data-empty={!messages.length || undefined}>
            {(!messages.length || welcomeExit) && (
              <WelcomeBalls exiting={welcomeExit} onExitComplete={finishWelcomeExit} />
            )}
            <header className="openclaw-header">
              <div className="openclaw-heading">
                <button
                  type="button"
                  className="openclaw-menu-toggle"
                  onClick={() => setSidebar(!sidebar)}
                  aria-label={tx("对话菜单", "Conversations")}
                  aria-expanded={sidebar}
                  aria-controls="openclaw-sidebar"
                >
                  <Icon icon={Menu01Icon} />
                </button>
                <h1>Agent Ollie</h1>
                <span
                  className={
                    (model === "mimo" ? mimoReady : connected)
                      ? "openclaw-online"
                      : "openclaw-offline"
                  }
                >
                  {(model === "mimo" ? mimoReady : connected)
                    ? tx("已接入", "Connected")
                    : tx("未接入", "Offline")}
                </span>
              </div>
            </header>

            <div
              className="openclaw-transcript"
              ref={transcript}
              onScroll={(event) => {
                const panel = event.currentTarget;
                followOutput.current =
                  panel.scrollHeight - panel.scrollTop - panel.clientHeight < 100;
              }}
            >
              {messages.length > 0 ? (
                <section className="openclaw-thread" aria-label={tx("对话", "Conversation")}>
                  {messages.map((item, index) =>
                    item.role === "user" ? (
                      <div
                        className="openclaw-user-message"
                        key={`${item.role}-${index}`}
                        data-enter={
                          enteringMessage?.chatId === conversationId &&
                          enteringMessage.index === index
                            ? ""
                            : undefined
                        }
                      >
                        <div
                          className="openclaw-user-wrap"
                          data-editing={editing?.index === index ? "" : undefined}
                        >
                          {editing?.index === index ? (
                            <MessageEditor
                              value={editing.text}
                              attachments={item.attachments || []}
                              onChange={(text) => setEditing({ index, text })}
                              onCancel={() => setEditing(null)}
                              onSubmit={() => setRollback({ index, text: editing.text.trim() })}
                            />
                          ) : (
                            <>
                              <p>{item.content}</p>
                              {(item.attachments || []).length > 0 && (
                                <div className="openclaw-user-files">
                                  {(item.attachments || []).map((name) => (
                                    <span key={name}>{name}</span>
                                  ))}
                                </div>
                              )}
                              {!busy && (
                                <div className="openclaw-user-actions">
                                  <button
                                    type="button"
                                    aria-label={tx("复制", "Copy")}
                                    onClick={() => copyText(item.content)}
                                  >
                                    <Icon icon={Copy01Icon} size={16} />
                                  </button>
                                  <button type="button" onClick={() => editMessage(index)}>
                                    <Icon icon={PencilEdit01Icon} size={16} />
                                    <span>{tx("重新编辑", "Edit message")}</span>
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="openclaw-response" key={`${item.role}-${index}`}>
                        {(splitPlans(item.thinking || "").text ||
                          (index === messages.length - 1 && (busy || calls.length > 0))) && (
                          <div className="openclaw-thought">
                            <ThoughtLine
                              working={busy && index === messages.length - 1}
                              glyph={
                                <LatticeLoader
                                  status={
                                    busy && index === messages.length - 1 ? "working" : "done"
                                  }
                                  label=""
                                  doneLabel=""
                                  pattern="orbit"
                                  grid={3}
                                  shape="round"
                                  cellSize={4}
                                  gap={2}
                                  step={90}
                                  color="#d8e5eb"
                                  doneColor="#22c55e"
                                  fillOnDone
                                  showTimer={false}
                                />
                              }
                              steps={
                                thoughtSteps(item.thinking).length
                                  ? thoughtSteps(item.thinking)
                                  : index === messages.length - 1
                                    ? calls
                                        .map(
                                          (call) =>
                                            `${toolLabel(call.name)} · ${call.status === "done" ? tx("已完成", "Completed") : call.status === "error" ? tx("未完成", "Failed") : call.status === "running" ? tx("执行中", "Running") : tx("等待中", "Queued")}`,
                                        )
                                        .slice(-6)
                                    : []
                              }
                              label={
                                item.thinking
                                  ? tx("正在思考", "Thinking")
                                  : tx("正在处理", "Working")
                              }
                              doneLabel={
                                stopped && index === messages.length - 1 && !answerText(item)
                                  ? tx("已停止", "Stopped")
                                  : item.thinking
                                    ? tx("思考了", "Thought for")
                                    : tx("处理用时", "Processed in")
                              }
                              fontSize={14}
                              showTimer
                              collapseOnSettle={false}
                            />
                          </div>
                        )}
                        {displayCalls.length > 0 && index === messages.length - 1 && (
                          <AutoFollowFeed className="openclaw-calls" rows={3}>
                            {displayCalls.map((call) => (
                              <div className="openclaw-call" key={call.id}>
                                <CallChip
                                  icon={call.icon}
                                  name={
                                    call.name +
                                    (call.recovered
                                      ? tx(" · 重试已成功", " · Retry succeeded")
                                      : call.unavailable
                                        ? tx(
                                            " · 此来源不可读，已使用其他来源",
                                            " · Unreadable; other sources used",
                                          )
                                        : "")
                                  }
                                  argument={call.argument}
                                  status={call.recovered || call.unavailable ? "idle" : call.status}
                                  startedAt={call.startedAt}
                                  elapsedMs={call.elapsedMs}
                                  paused={Boolean(call.paused)}
                                />
                                {approval &&
                                call.status === "running" &&
                                call.name === approval.name ? (
                                  <span className="openclaw-call-wait">
                                    {tx("等待批准", "Waiting for approval")}
                                  </span>
                                ) : null}
                                {call.status === "done" && call.link ? (
                                  <a className="openclaw-call-link" href={call.link}>
                                    {call.linkLabel || tx("查看帖子", "View post")}
                                  </a>
                                ) : null}
                              </div>
                            ))}
                          </AutoFollowFeed>
                        )}
                        {(answerText(item) ||
                          (busy &&
                            index === messages.length - 1 &&
                            !reasoning &&
                            model !== "mimo")) && (
                          <AssistantText
                            text={answerText(item)}
                            streaming={busy && index === messages.length - 1}
                          />
                        )}
                        {(item.sources || []).length > 0 && (
                          <div className="openclaw-sources">
                            <span className="openclaw-source-marks">
                              {item.sources.slice(0, 3).map((source) => (
                                <span key={source.url}>{(source.title || "?").slice(0, 1)}</span>
                              ))}
                            </span>
                            <span>{tx("来源", "Sources")}</span>
                            {item.sources.map((source) => (
                              <a
                                key={source.url}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {source.title || source.url}
                              </a>
                            ))}
                          </div>
                        )}
                        {(item.files || []).map((file) => (
                          <span className="openclaw-file" key={file.href}>
                            <a href={file.href}>{file.name}</a>
                            <button
                              type="button"
                              disabled={busy}
                              aria-label={tx(`删除文件 ${file.name}`, `Delete file ${file.name}`)}
                              onClick={() => setFileToDelete(file)}
                            >
                              <Icon icon={Delete02Icon} size={14} />
                            </button>
                          </span>
                        ))}
                        {answerText(item) && !(busy && index === messages.length - 1) && (
                          <div className="openclaw-message-actions">
                            <button
                              type="button"
                              aria-label={tx("重新回答", "Regenerate")}
                              onClick={() => regenerate(index)}
                            >
                              <Icon icon={RefreshIcon} size={16} />
                            </button>
                            <button
                              type="button"
                              aria-label={tx("复制", "Copy")}
                              onClick={() => copyText(answerText(item))}
                            >
                              <Icon icon={Copy01Icon} size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                  {statusLine && <p className="openclaw-status">{statusLine}</p>}
                </section>
              ) : (
                <section className="openclaw-welcome">
                  <TextType
                    as="h2"
                    text={tx("有什么想一起完成？", "What shall we work on?")}
                    typingSpeed={en ? 48 : 90}
                    initialDelay={160}
                    loop={false}
                  />
                </section>
              )}
            </div>
            <motion.footer
              className="openclaw-composer"
              layout={reduceMotion ? false : "position"}
              layoutDependency={!!messages.length}
              transition={{ layout: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }}
            >
              {approval && (
                <div
                  className="openclaw-approval"
                  role="dialog"
                  aria-label={tx("需要批准", "Approval needed")}
                >
                  <strong>{tx("需要你批准", "Approval needed")}</strong>
                  <p>
                    {toolLabel(approval.name)}
                    {approval.argument ? ` · ${approval.argument}` : ""}
                  </p>
                  <div>
                    <button type="button" onClick={() => approvalWait.current?.(false)}>
                      {tx("拒绝", "Decline")}
                    </button>
                    <button type="button" onClick={() => approvalWait.current?.(true)}>
                      {tx("批准", "Approve")}
                    </button>
                  </div>
                </div>
              )}
              <div className="openclaw-prompt-wrap">
                {feedback && (
                  <p className="openclaw-feedback" role="status">
                    {feedback}
                  </p>
                )}
                <PromptBar
                  draft={draft}
                  onDraftChange={(value) => {
                    setDraft(value);
                    setFeedback("");
                  }}
                  files={files}
                  onFilesChange={setFiles}
                  inputRef={input}
                  busy={busy}
                  onStop={stop}
                  stopLabel={
                    (model === "mimo" ? mimoReady : connected)
                      ? tx("停止回复", "Stop reply")
                      : undefined
                  }
                  onNotice={notice}
                  onSend={sendMessage}
                  models={models.map((item) =>
                    item.id === "mimo"
                      ? {
                          ...item,
                          label: "MiMo V2.6",
                          disabled: !mimoReady,
                          badge: mimoReady ? "" : tx("暂未开放", "Not yet open"),
                          detail: tx(
                            "由小米集团开发的强大开源模型",
                            "A powerful open model from Xiaomi Group",
                          ),
                        }
                      : item,
                  )}
                  model={model}
                  onModelChange={setModel}
                  reasoning={reasoning}
                  onReasoningChange={setReasoning}
                  endSlot={
                    <VoicePill
                      ariaLabel={tx("语音输入", "Voice input")}
                      size={32}
                      reactive="mic"
                      disabled={busy}
                      onStart={beginSpeech}
                      onStop={({ reason }) => endSpeech(reason)}
                    />
                  }
                />
              </div>
            </motion.footer>
            {messages.length === 0 && (
              <div className="openclaw-suggestions">
                <div className="openclaw-ideas">
                  {ideas.map((idea) => (
                    <button
                      key={idea.title}
                      type="button"
                      onClick={() => {
                        setDraft(idea.draft);
                        input.current?.focus();
                      }}
                    >
                      <Icon icon={idea.icon} size={16} />
                      {idea.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </main>
          {progressOpen && (
            <button
              type="button"
              className="openclaw-progress-backdrop"
              aria-label={tx("关闭任务进度", "Close progress")}
              onClick={() => setProgressOpen(false)}
            />
          )}
          <aside
            id="openclaw-progress"
            className="openclaw-rail"
            data-collapsed={progressOpen ? undefined : ""}
            aria-label={tx("助手进度", "Assistant progress")}
          >
            <div className="openclaw-progress-heading">
              <strong>{tx("任务进度", "Progress")}</strong>
              <button
                type="button"
                aria-label={tx("收起任务进度", "Collapse progress")}
                onClick={() => setProgressOpen(false)}
              >
                <Icon icon={Cancel01Icon} size={16} />
              </button>
            </div>
            <p>{tx("待办", "To-do")}</p>
            {todos.length ? (
              todos.map((step) => (
                <StatusMark
                  key={step.id}
                  status={step.status}
                  label={step.label}
                  size={16}
                  fontSize={13}
                  strike
                />
              ))
            ) : (
              <span className="openclaw-rail-empty">
                {calls.length
                  ? tx("本轮没有待执行项", "No pending actions this turn")
                  : tx("还没有待办", "Nothing queued")}
              </span>
            )}
            <p>{tx("执行记录", "Activity")}</p>
            {calls.length ? (
              displayCalls.map((call) => (
                <StatusMark
                  key={call.id}
                  status={
                    call.recovered ||
                    call.unavailable ||
                    (!busy && ["pending", "running"].includes(call.status))
                      ? "cancelled"
                      : markStatus(call.status)
                  }
                  label={
                    toolLabel(call.name) +
                    (call.recovered
                      ? tx(" · 重试已成功", " · Retry succeeded")
                      : call.unavailable
                        ? tx(" · 此来源不可读，已使用其他来源", " · Unreadable; other sources used")
                        : "")
                  }
                  strike={call.status === "done"}
                  size={16}
                  fontSize={13}
                />
              ))
            ) : (
              <span className="openclaw-rail-empty">{tx("还没有命令", "No commands yet")}</span>
            )}
          </aside>
        </div>
      </div>
      {historyMenu && (
        <div
          className="openclaw-history-menu"
          style={{ left: historyMenu.x, top: historyMenu.y }}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() =>
              shareConversation(
                history.find((entry) => entry.id === historyMenu.id) || { messages: [] },
              )
            }
          >
            <Icon icon={Share01Icon} size={16} />
            {tx("分享", "Share")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const entry = history.find((item) => item.id === historyMenu.id);
              setRename({ id: historyMenu.id, title: entry?.title || "" });
              setHistoryMenu(null);
            }}
          >
            <Icon icon={PencilEdit01Icon} size={16} />
            {tx("重命名", "Rename")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const entry = history.find((item) => item.id === historyMenu.id);
              patchConversation(historyMenu.id, { pinned: !entry?.pinned, archived: false });
              setHistoryMenu(null);
            }}
          >
            <Icon icon={PinIcon} size={16} />
            {history.find((item) => item.id === historyMenu.id)?.pinned
              ? tx("取消固定", "Unpin chat")
              : tx("固定对话", "Pin chat")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const entry = history.find((item) => item.id === historyMenu.id);
              patchConversation(historyMenu.id, { archived: !entry?.archived, pinned: false });
              setHistoryMenu(null);
            }}
          >
            <Icon icon={Archive01Icon} size={16} />
            {tx("归档", "Archive")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="openclaw-menu-delete"
            onClick={() => {
              if (!historyMenu.confirm) {
                setHistoryMenu({ ...historyMenu, confirm: true });
                return;
              }
              deleteConversation(historyMenu.id);
            }}
          >
            <Icon icon={Delete02Icon} size={16} />
            {historyMenu.confirm ? tx("确认删除", "Confirm delete") : tx("删除", "Delete")}
          </button>
        </div>
      )}
      {rollback && (
        <div
          className="openclaw-rollback"
          role="dialog"
          aria-modal="true"
          aria-labelledby="openclaw-rollback-title"
        >
          <div>
            <strong id="openclaw-rollback-title">
              {tx("确定回溯？", "Roll back and resend?")}
            </strong>
            <p>
              {tx(
                "重发后，这条消息之后助手做过的修改、添加和删除都会撤回。",
                "Resending undoes the changes, additions and deletions the assistant made after this message.",
              )}
            </p>
            <div>
              <button type="button" onClick={() => setRollback(null)}>
                {tx("取消", "Cancel")}
              </button>
              <button type="button" onClick={confirmRollback}>
                {tx("确定回溯", "Roll back")}
              </button>
            </div>
          </div>
        </div>
      )}
      {fileToDelete && (
        <div
          className="openclaw-rollback"
          role="dialog"
          aria-modal="true"
          aria-labelledby="openclaw-delete-file-title"
        >
          <div>
            <strong id="openclaw-delete-file-title">
              {tx("删除生成的文件？", "Delete generated file?")}
            </strong>
            <p>{fileToDelete.name}</p>
            <div>
              <button type="button" disabled={deletingFile} onClick={() => setFileToDelete(null)}>
                {tx("取消", "Cancel")}
              </button>
              <button type="button" disabled={deletingFile || busy} onClick={confirmFileDelete}>
                {tx("确认删除", "Delete file")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
