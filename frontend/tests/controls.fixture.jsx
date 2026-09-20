import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import GlideSelect from "../GlideSelect";
import HoldButton from "../HoldButton";
import RubberSegment from "../RubberSegment";
import SpringCheck from "../SpringCheck";
import PulseHeart from "../PulseHeart";
import StatusMark from "../StatusMark";
import ClubOperations from "../ClubOperations";
import Post from "../SocialPost";
import "../workspace.css";
import "../SocialTheme.css";
import "../SocialAdditions.css";
import "../ControlRefinements.css";

function PostFixture() {
  const [post, setPost] = useState({
    id: "preview",
    author: { id: "fixture", name: "校园生活", role: "student" },
    own: true,
    category: "general",
    text: "周五的社团活动见！记得带上你的想法。",
    likes: 12,
    liked: false,
    replies: 0,
    views: 36,
    mentions: [],
    attachments: [],
    createdAt: "2026-09-20T12:00:00",
  });
  const write = async (path, method) => {
    await new Promise((r) => setTimeout(r, 120));
    if (path.endsWith("/like") && window.failLike) throw Error("网络连接失败，请重试");
    return {};
  };
  return (
    <main
      className="social-shell"
      style={{ display: "block", maxWidth: 740, margin: "30px auto", padding: 16 }}
    >
      <Post
        post={post}
        profile={{ account: post.author, canPost: true }}
        write={write}
        onLike={() =>
          setPost((p) => ({ ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }))
        }
        onReply={() => {}}
        onRemove={() => setPost((p) => ({ ...p, text: "已删除测试帖子" }))}
      />
    </main>
  );
}
function App() {
  const [option, setOption] = useState("week"),
    [view, setView] = useState("week"),
    [checked, setChecked] = useState(false),
    [liked, setLiked] = useState(false),
    [likes, setLikes] = useState(4);
  const [failed, setFailed] = useState(true),
    [busy, setBusy] = useState(false);
  window.fixture = { option, view, checked, liked, likes };
  const items = [
    { value: "day", label: "日" },
    { value: "week", label: "周" },
    { value: "list", label: "列表" },
  ];
  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <h1>界面交互预览</h1>
      <section
        className="fixture-controls"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "start",
          gap: 24,
          padding: "24px 0 40px",
        }}
      >
        <GlideSelect
          ariaLabel="筛选"
          options={items}
          value={option}
          onChange={(v) => {
            window.picks = (window.picks || 0) + 1;
            setOption(v);
          }}
        />
        <RubberSegment aria-label="日历视图" items={items} value={view} onChange={setView} />
        <SpringCheck label="提交本周活动记录" checked={checked} onChange={setChecked} />
        <PulseHeart
          liked={liked}
          count={likes}
          disabled={busy}
          onChange={async (next, n) => {
            setBusy(true);
            await new Promise((r) => setTimeout(r, 100));
            if (!window.failLike) {
              setLiked(next);
              setLikes(n);
            }
            setBusy(false);
          }}
        />
        <HoldButton
          holdTime={500}
          resetAfter={400}
          onHold={async () => {
            window.holds = (window.holds || 0) + 1;
            await new Promise((r) => setTimeout(r, 250));
            if (failed) {
              setFailed(false);
              throw Error("网络连接失败，请重试");
            }
          }}
        >
          长按删除测试项
        </HoldButton>
        <StatusMark status="running" label="正在上传附件" />
        <StatusMark status="done" label="已保存" />
      </section>
      <div className="ws-shell" style={{ display: "block", minHeight: 0 }}>
        <ClubOperations
          club={1}
          token="fixture"
          section="term"
          activities={[]}
          members={[]}
          documents={[]}
          onChanged={async () => {}}
        />
      </div>
      <div style={{ height: 500 }} />
    </main>
  );
}
const postMode = new URLSearchParams(location.search).has("post");
if (postMode) document.body.classList.add("social-network-theme");
createRoot(document.getElementById("root")).render(postMode ? <PostFixture /> : <App />);
