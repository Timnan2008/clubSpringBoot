import React, { useEffect, useLayoutEffect, useId, useRef, useState } from "react";
import {
  ChatCircleDots,
  Plus,
  Heart,
  ShieldCheck,
  MagnifyingGlass,
  PaperPlaneTilt,
  Bell,
  ArrowClockwise,
  Chalkboard,
} from "@phosphor-icons/react";
import { Action, Panel, Empty, Modal } from "./components";
import {
  Heading,
  Field,
  Form,
  Feedback,
  ResourceState,
  useResource,
  useUI,
  read,
  write,
  dateText,
} from "./ui";
import { Gate } from "./ClubPages";
import AuthorIdentity from "./AuthorIdentity";
import {
  ensureIdentity,
  encryptMessage,
  decryptMessage,
  setCryptoScope,
} from "./lib/message-crypto";
const cryptoRead = (route) =>
  route === "/keys/recovery" ? read("recovery") : read("key", { id: route.slice(6) });
const cryptoWrite = (route, method, body) =>
  write(route === "/keys/provision" ? "keyProvision" : "keyRecovery", { body });
export function Wall() {
  const ui = useUI();
  return ui.data.user ? (
    <WallInside />
  ) : (
    <>
      <Heading title="校园墙" detail="查看校园动态和同学分享。" />
      <Gate />
    </>
  );
}
function WallInside() {
  const ui = useUI();
  const [keyword, setKeyword] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [compose, setCompose] = useState(false),
    [reply, setReply] = useState(null),
    [manage, setManage] = useState(null);
  const posts = useResource("posts", { keyword: query, page }),
    social = useResource("social");
  return (
    <section className="wall-page" aria-label="校园墙动态">
      <Heading title="校园墙">
        <div className="service-actions">
          {["teacher", "admin"].includes(ui.data.user?.role) && (
            <Action secondary onClick={() => ui.navigate("moderation")}>
              <ShieldCheck size={18} />
              内容审核
            </Action>
          )}
          <Action
            secondary
            disabled={posts.loading}
            onClick={posts.reload}
            aria-label="刷新校园墙"
          >
            <ArrowClockwise size={18} />
            刷新
          </Action>
          <Action disabled={!social.data?.canPost} onClick={() => setCompose(true)}>
            <Plus size={18} />
            发布动态
          </Action>
        </div>
      </Heading>
      <Feedback error={social.error} />
      <div className="wall-layout">
        <section>
          <form
            className="wall-search"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(keyword.trim());
              setPage(1);
            }}
          >
            <MagnifyingGlass size={19} />
            <input
              aria-label="搜索校园墙"
              placeholder="搜索校园里的故事"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button className="text-button accent">搜索</button>
          </form>
          {query && (
            <div className="wall-search-summary" role="status">
              <span>“{query}” 的搜索结果</span>
              <button
                className="text-button accent"
                onClick={() => {
                  setKeyword("");
                  setQuery("");
                  setPage(1);
                }}
              >
                清除搜索
              </button>
            </div>
          )}
          <ResourceState resource={posts}>
            {posts.data?.items?.length ? (
              <div className="wall-posts">
                {posts.data.items.map((p) => (
                  <article className="post-card" key={p.id}>
                    <span className="avatar post-avatar" aria-hidden="true">
                      {(p.anonymous || p.author?.role === "anonymous"
                        ? "匿"
                        : p.author?.name || "同"
                      ).slice(0, 1)}
                    </span>
                    <div className="post-body">
                      <div className="post-author">
                        <AuthorIdentity person={p.author} anonymous={p.anonymous} />
                        <time dateTime={p.createdAt}>
                          {dateText(p.createdAt)}
                          {p.clubName ? " · " + p.clubName : ""}
                        </time>
                      </div>
                      {p.wallPinned && <span className="wall-pin-label">校园墙置顶</span>}
                      <PostText text={p.text} preview />
                      {p.attachments?.length > 0 && (
                        <p className="muted">
                          此动态含 {p.attachments.length} 个附件，附件预览暂未接入。
                        </p>
                      )}
                      <div className="post-actions">
                        <Like post={p} reload={posts.reload} />
                        <button className="text-button" onClick={() => setReply(p)}>
                          <ChatCircleDots size={19} />
                          {p.replies || 0} 条回复
                        </button>
                        {social.data?.admin && (
                          <button
                            className="text-button"
                            onClick={() => setManage({ post: p, kind: "pin" })}
                          >
                            {p.wallPinned ? "取消置顶" : "置顶"}
                          </button>
                        )}
                        {(p.own || social.data?.admin) && (
                          <button
                            className="text-button service-danger"
                            onClick={() => setManage({ post: p, kind: "delete" })}
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                icon={Chalkboard}
                title={query ? "没有找到动态" : "校园墙还很安静"}
                detail={
                  query
                    ? "换个关键词试试，或清除搜索查看全部动态。"
                    : social.data?.canPost
                      ? "点击“发布动态”，分享你的校园日常。"
                      : undefined
                }
              />
            )}
          </ResourceState>
          {(page > 1 || posts.data?.next) && (
            <div className="pagination">
              <Action
                secondary
                disabled={page <= 1 || posts.loading}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Action>
              <span>第 {page} 页</span>
              <Action
                secondary
                disabled={posts.loading || !posts.data?.next}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Action>
            </div>
          )}
        </section>
      </div>
      {manage && (
        <Modal
          title={
            manage.kind === "delete"
              ? "删除动态"
              : manage.post.wallPinned
                ? "取消校园墙置顶"
                : "置顶到校园墙"
          }
          onClose={() => setManage(null)}
        >
          <p className="detail-text">
            {manage.kind === "delete"
              ? "删除后动态及相关回复将无法恢复，请核对内容。"
              : "此操作将调整所有用户看到的校园墙置顶状态。"}
          </p>
          <blockquote className="service-excerpt">{manage.post.text}</blockquote>
          <Form
            label={manage.kind === "delete" ? "确认删除" : "确认调整"}
            onSubmit={async () => {
              await write(manage.kind === "delete" ? "postDelete" : "postPin", {
                id: manage.post.id,
                body: { pinned: !manage.post.wallPinned },
              });
              setManage(null);
              posts.reload();
              ui.toast("动态已更新");
            }}
          />
        </Modal>
      )}
      {compose && (
        <Modal title="分享校园日常" onClose={() => setCompose(false)}>
          <Form
            label="发布动态"
            onSubmit={async (f) => {
              await write("post", {
                body: {
                  text: f.get("text"),
                  category: "general",
                  anonymous: false,
                  club: 0,
                  mentions: [],
                },
              });
              setCompose(false);
              setPage(1);
              posts.reload();
              ui.toast("动态已发布");
            }}
          >
            <Field label="这一刻，想分享什么？">
              <textarea
                autoFocus
                name="text"
                required
                rows={7}
                maxLength={5000}
                placeholder="说说你的发现…"
              />
            </Field>
          </Form>
        </Modal>
      )}
      {reply && (
        <Replies post={reply} onClose={() => setReply(null)} onChanged={posts.reload} />
      )}
    </section>
  );
}
// Keep the stored text intact; repeated blank lines become paragraph spacing for reading.
function PostText({ text: source, preview = false }) {
  const text = typeof source === "string" ? source : "";
  const [expanded, setExpanded] = useState(false),
    [overflows, setOverflows] = useState(false),
    [previewHeight, setPreviewHeight] = useState(null),
    body = useRef(),
    id = useId();
  useLayoutEffect(() => {
    if (!preview || !body.current) return;
    const measure = () => {
      const element = body.current;
      const limit = parseFloat(getComputedStyle(element).lineHeight) * 10;
      const overflows = element.scrollHeight > limit + 1;
      setOverflows(overflows);
      if (!overflows) {
        setPreviewHeight(null);
        return;
      }
      // End the preview at a complete text line, including paragraph margins.
      const top = element.getBoundingClientRect().top,
        range = document.createRange();
      let bottom = 0;
      for (const paragraph of element.children) {
        range.selectNodeContents(paragraph);
        for (const rect of range.getClientRects()) {
          if (rect.bottom - top <= limit) bottom = Math.max(bottom, rect.bottom - top);
        }
      }
      setPreviewHeight(Math.ceil(bottom || limit) + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(body.current);
    measure();
    return () => observer.disconnect();
  }, [text, preview]);
  if (!text.trim()) return null;
  return (
    <div className="post-text">
      <div
        id={id}
        className={`post-copy ${preview && !expanded ? "post-preview" : ""}`}
        style={previewHeight ? { "--post-preview-height": `${previewHeight}px` } : undefined}
      >
        <div className="post-paragraphs" ref={body}>
          {text
            .trim()
            .replace(/\r\n?/g, "\n")
            .split(/\n[\t ]*\n+/)
            .map((paragraph, i) => (
              <p key={i}>{paragraph.trim()}</p>
            ))}
        </div>
      </div>
      {preview && overflows && (
        <button
          className="text-button accent post-expand"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "收起全文" : "展开全文"}
        </button>
      )}
    </div>
  );
}
function Like({ post, reload }) {
  const ui = useUI(),
    [busy, set] = useState(false);
  return (
    <button
      className={`text-button ${post.liked ? "accent" : ""}`}
      disabled={busy}
      onClick={async () => {
        set(true);
        try {
          await write("like", { id: post.id, body: { liked: !post.liked } });
          reload();
        } catch (e) {
          ui.toast(e.message);
        } finally {
          set(false);
        }
      }}
    >
      <Heart size={19} weight={post.liked ? "fill" : "regular"} />
      {post.likes || 0}
    </button>
  );
}
function Replies({ post, onClose, onChanged }) {
  const r = useResource("replies", { id: post.id });
  return (
    <Modal title="动态与回复" onClose={onClose}>
      <div className="post-author">
        <AuthorIdentity person={post.author} anonymous={post.anonymous} />
        <time dateTime={post.createdAt}>{dateText(post.createdAt)}</time>
      </div>
      <PostText text={post.text} />
      <div className="replies">
        <ResourceState resource={r}>
          {r.data?.length ? (
            r.data.map((m) => (
              <div className="reply" key={m.id}>
                <AuthorIdentity person={m.author} anonymousLabel="匿名楼主" />
                <p>{m.text}</p>
                <small>{dateText(m.createdAt)}</small>
              </div>
            ))
          ) : (
            <Empty title="还没有回复" />
          )}
        </ResourceState>
      </div>
      <Form
        label="发送回复"
        onSubmit={async (f) => {
          await write("reply", {
            id: post.id,
            body: { text: f.get("text"), parentReply: "", mentions: [] },
          });
          r.reload();
          onChanged();
        }}
      >
        <Field label="写下你的回复">
          <textarea name="text" rows={3} maxLength={2000} required />
        </Field>
      </Form>
    </Modal>
  );
}
export function Messages() {
  const ui = useUI();
  return ui.data.user ? (
    <MessagesInside />
  ) : (
    <>
      <Heading title="站内私信" detail="和同学、老师与社团伙伴保持联系。" />
      <Gate />
    </>
  );
}
function MessagesInside() {
  const ui = useUI(),
    [tab, setTab] = useState("chat"),
    [peer, setPeer] = useState(null),
    [finding, setFinding] = useState(false);
  return (
    <>
      <Heading title="站内私信">
        <Action secondary onClick={() => setFinding(true)}>
          <Plus size={18} />
          发起会话
        </Action>
      </Heading>
      <div className="tabs section-tabs">
        <button className={tab === "chat" ? "active" : ""} onClick={() => setTab("chat")}>
          私信
        </button>
        <button
          className={tab === "notifications" ? "active" : ""}
          onClick={() => setTab("notifications")}
        >
          通知{ui.data.unread > 0 ? ` · ${ui.data.unread}` : ""}
        </button>
      </div>
      {tab === "notifications" ? (
        <Notifications />
      ) : (
        <div className="chat-layout">
          <aside className="conversation-list">
            <div className="conversation-label">
              最近联系 <span>{ui.data.inbox.length}</span>
            </div>
            {ui.data.inbox.length ? (
              ui.data.inbox.map((item) => (
                <button
                  key={item.account.id}
                  className={`conversation ${peer?.id === item.account.id ? "selected" : ""}`}
                  onClick={() => setPeer(item.account)}
                >
                  <span className="avatar">{(item.account.name || "同").slice(0, 1)}</span>
                  <div>
                    <strong>{item.account.name}</strong>
                    {item.preview && !/端到端|加密消息/.test(item.preview) && (
                      <p>{item.preview}</p>
                    )}
                  </div>
                  {item.unread > 0 && <span className="badge">{item.unread}</span>}
                </button>
              ))
            ) : (
              <Empty title="暂无私信" />
            )}
          </aside>
          {peer ? (
            <Conversation key={ui.data.info.server + ":" + peer.id} peer={peer} />
          ) : (
            <div className="chat-idle">
              <Empty icon={ChatCircleDots} title="选择一个会话" />
            </div>
          )}
        </div>
      )}
      {finding && (
        <People
          onClose={() => setFinding(false)}
          onSelect={(p) => {
            setPeer(p);
            setTab("chat");
            setFinding(false);
          }}
        />
      )}
    </>
  );
}
function People({ onClose, onSelect }) {
  const [search, set] = useState(""),
    [query, go] = useState("");
  const r = useResource("users", { keyword: query }, query.length > 0);
  return (
    <Modal title="找到校园伙伴" onClose={onClose}>
      <form
        className="wall-search"
        onSubmit={(e) => {
          e.preventDefault();
          go(search.trim());
        }}
      >
        <input
          autoFocus
          placeholder="输入姓名"
          value={search}
          onChange={(e) => set(e.target.value)}
          required
        />
        <button className="text-button accent">搜索</button>
      </form>
      <ResourceState resource={r}>
        {query ? (
          (Array.isArray(r.data) ? r.data : r.data?.items || []).map((p) => (
            <button className="search-result" key={p.id} onClick={() => onSelect(p)}>
              <span className="avatar">{(p.name || "同").slice(0, 1)}</span>
              <strong>{p.name}</strong>
              <small>{p.nameEn}</small>
            </button>
          ))
        ) : (
          <Empty title="输入名字，开始寻找" />
        )}
        {query && Array.isArray(r.data) && !r.data.length && <Empty title="没有找到这个名字" />}
      </ResourceState>
    </Modal>
  );
}
function Conversation({ peer }) {
  const ui = useUI(),
    r = useResource("conversation", { peer: peer.id });
  const [keys, setKeys] = useState(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  const end = useRef();
  useEffect(() => {
    let active = true;
    setError("");
    setKeys(null);
    setCryptoScope(ui.data.info.server || "production");
    Promise.all([
      ensureIdentity(ui.data.user.id, cryptoRead, cryptoWrite),
      read("key", { id: peer.id }),
    ])
      .then(([own, other]) => {
        if (!other.ready) throw Error("对方尚未准备好加密私信，请稍后再试");
        if (active) setKeys({ own, peer: other });
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [peer.id, ui.data.user.id, ui.data.info.server, attempt]);
  useEffect(() => {
    const timer = setInterval(r.reload, 12000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (r.data?.messages?.some((m) => m.recipient === ui.data.user.id && !m.read)) {
      write("messageRead", { peer: peer.id, body: {} })
        .then(() => ui.data.refresh())
        .catch((e) => setError(e.message));
    }
    end.current?.scrollIntoView({ block: "nearest" });
  }, [r.data]);
  return (
    <section className="chat-main">
      <div className="chat-heading">
        <span className="avatar">{(peer.name || "同").slice(0, 1)}</span>
        <div>
          <strong>{peer.name}</strong>
        </div>
        <button
          className="icon-button"
          aria-label="刷新会话"
          onClick={() => {
            setAttempt((n) => n + 1);
            r.reload();
          }}
        >
          <ArrowClockwise size={19} />
        </button>
      </div>
      <div className="chat-history">
        <ResourceState resource={r}>
          {!keys && !error && r.data?.messages?.some((m) => m.text?.startsWith("e2ee:v1:")) && (
            <p className="muted center">正在读取消息…</p>
          )}
          {r.data?.older && (
            <p className="muted center">当前显示最近消息；更早记录暂未加载。</p>
          )}
          {r.data?.messages?.length ? (
            r.data.messages
              .filter((m) => keys || !m.text?.startsWith("e2ee:v1:"))
              .map((m) => (
                <div
                  className={`message-line ${m.sender === ui.data.user.id ? "own" : ""}`}
                  key={m.id}
                >
                  <div className="message-bubble">
                    <MessageContent
                      message={{
                        ...m,
                        recalled: m.recalled || r.data.recalledIds?.includes(m.id),
                      }}
                      keys={keys}
                      me={ui.data.user.id}
                    />
                    <small>
                      {dateText(m.createdAt)}
                      {m.sender === ui.data.user.id ? (m.read ? " · 已读" : " · 已发送") : ""}
                    </small>
                  </div>
                </div>
              ))
          ) : (
            <Empty title="从一句问候开始" />
          )}
          {r.data?.invitations?.length > 0 && (
            <p className="muted center">
              有 {r.data.invitations.length} 条任职邀请，桌面端邀请处理暂未开放。
            </p>
          )}
        </ResourceState>
        <div ref={end} />
      </div>
      <div className="chat-compose">
        <Feedback error={error} />
        {r.data?.messagingAllowed === false && <Feedback error="当前会话暂不能发送消息" />}
        <Form
          label="发送消息"
          disabled={!keys || r.data?.messagingAllowed === false || r.loading || !!r.error}
          onSubmit={async (f) => {
            const plainText = f.get("message").trim();
            if (!plainText) throw Error("先写一点想说的话");
            const text = await encryptMessage(
              keys.own,
              keys.peer,
              ui.data.user.id,
              peer.id,
              plainText,
            );
            await write("message", { peer: peer.id, body: { text, plainText } });
            document.querySelector(".chat-compose textarea").value = "";
            r.reload();
            ui.data.refresh();
          }}
        >
          <Field label="消息">
            <textarea
              name="message"
              maxLength={2000}
              rows={3}
              placeholder={keys ? "说点什么…" : error ? "会话暂不可用" : "正在连接…"}
              required
            />
          </Field>
        </Form>
      </div>
    </section>
  );
}
function MessageContent({ message, keys, me }) {
  const [text, setText] = useState("正在读取…");
  useEffect(() => {
    let active = true;
    if (message.text?.startsWith("e2ee:v1:") && keys)
      decryptMessage(keys.own, keys.peer, me, message)
        .then((t) => active && setText(t))
        .catch(() => active && setText("这条消息暂时无法解密"));
    return () => {
      active = false;
    };
  }, [message.text, keys, me]);
  if (message.recalled) return <p className="muted">消息已撤回</p>;
  const value = message.text?.startsWith("e2ee:v1:") ? text : message.text || "";
  return (
    <p>
      {value.startsWith("chat-files:") || value.includes('"qpwfl-chat-files"')
        ? "附件消息 · 桌面预览暂未开放"
        : value}
    </p>
  );
}
function Notifications() {
  const ui = useUI();
  return (
    <Panel
      title="校园通知"
      icon={Bell}
      action="全部已读"
      onAction={async () => {
        try {
          await write("notificationRead", { body: { all: true } });
          ui.data.refresh();
        } catch (e) {
          ui.toast(e.message);
        }
      }}
    >
      {ui.data.notifications.length ? (
        ui.data.notifications.map((n) => (
          <div className="native-row notification-row" key={n.id}>
            <span className={`notice-dot ${n.unread ? "" : "read"}`} />
            <div>
              <strong>
                {{
                  message: "收到新私信",
                  mention: "有人提到了你",
                  reply: "你的动态有了新回复",
                  join_request: "收到新的入社申请",
                  join_approved: "入社申请已通过",
                  join_declined: "入社申请未通过",
                }[n.type] ||
                  n.title ||
                  "校园通知"}
              </strong>
              <p>
                {n.actor?.name || ""}
                {n.clubName ? " · " + n.clubName : ""}
              </p>
              <small>{dateText(n.createdAt)}</small>
            </div>
            {n.unread && (
              <Action
                secondary
                onClick={async () => {
                  try {
                    await write("notificationRead", { body: { id: n.id, all: false } });
                    ui.data.refresh();
                  } catch (e) {
                    ui.toast(e.message);
                  }
                }}
              >
                标为已读
              </Action>
            )}
          </div>
        ))
      ) : (
        <Empty icon={Bell} title="暂时没有新通知" detail="入社进度和校园消息会显示在这里。" />
      )}
    </Panel>
  );
}
