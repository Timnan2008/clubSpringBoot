import React, { useEffect, useState } from "react";
import { tx } from "./language";
import PulseHeart from "./PulseHeart";
export default function ClubLikes({ club, account }) {
  const [count, setCount] = useState(club.videoLike || 0),
    [liked, setLiked] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [token, setToken] = useState("");
  useEffect(() => {
    if (account)
      fetch("/api/club/like-state/" + club.id)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) {
            setLiked(d.liked);
            setToken(d.token);
            setCount(d.count);
          }
        })
        .catch(() => {});
  }, [account, club.id]);
  async function toggle() {
    if (!account) {
      location.assign("/page/user/login?next=" + encodeURIComponent(location.pathname));
      return;
    }
    if (busy || !token) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        "/api/club/" + (liked ? "dislike/" : "like/") + encodeURIComponent(club.clubNameEn),
        {
          method: "PUT",
          headers: { "Device-Id": "account", "X-Device-Id": "account", "X-Workspace-Token": token },
        },
      );
      const d = await r.json();
      if (!r.ok || d.code !== 200) throw Error(tx("操作未成功，请重试。", "Please try again."));
      setCount(d.data.videoLike);
      setLiked(!liked);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="club-like-row">
      <PulseHeart
        liked={liked}
        count={count}
        label={liked ? tx("取消喜欢", "Unlike club") : tx("喜欢这个社团", "Like this club")}
        disabled={busy || (!!account && !token)}
        onChange={toggle}
      />
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
