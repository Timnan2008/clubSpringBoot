import { useRef, useState, useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { FavouriteIcon, StarIcon, ThumbsUpIcon } from "@hugeicons/core-free-icons";
import { tx } from "./language";
import "./PulseHeart.css";

export default function PulseHeart({
  liked: likedProp,
  defaultLiked = false,
  count = 0,
  onChange,
  showCount = true,
  icon = "heart",
  idleOutline = true,
  size = 22,
  corner = 24,
  likedColor = "#f13f78",
  idleColor = "var(--control-muted, #89838e)",
  pillColor = "transparent",
  textColor = "currentColor",
  duration = 560,
  dotSize = 0.3,
  overshoot = 1.7,
  beat = 3,
  rollDuration = 350,
  disabled = false,
  label,
  className = "",
}) {
  const [inner, setInner] = useState(defaultLiked),
    [total, setTotal] = useState(count),
    [run, setRun] = useState(0);
  const reduced = useReducedMotion(),
    last = useRef(likedProp ?? defaultLiked),
    via = useRef(false),
    liked = likedProp !== undefined ? likedProp : inner;
  useEffect(() => setTotal(count), [count]);
  useEffect(() => {
    if (last.current !== liked && via.current) {
      setRun((v) => v + 1);
      via.current = false;
    }
    last.current = liked;
  }, [liked]);
  const paths =
    typeof icon === "string"
      ? { heart: FavouriteIcon, star: StarIcon, thumb: ThumbsUpIcon }[icon] || FavouriteIcon
      : null;
  const number = likedProp !== undefined ? count : total;
  return (
    <button
      type="button"
      className={`pulse-heart ${className}`}
      aria-label={`${label || (liked ? tx("取消点赞", "Unlike") : tx("点赞", "Like"))}${showCount ? `, ${Math.max(0, number).toLocaleString()}` : ""}`}
      aria-pressed={liked}
      disabled={disabled}
      data-liked={liked}
      style={{
        "--ph-size": `${size}px`,
        "--ph-corner": `${corner}px`,
        "--ph-pill": pillColor,
        "--ph-idle": idleColor,
        "--ph-liked": likedColor,
        "--ph-text": textColor,
      }}
      onClick={() => {
        via.current = true;
        const next = !liked;
        if (likedProp === undefined) {
          setInner(next);
          setTotal(Math.max(0, total + (next ? 1 : -1)));
        }
        onChange?.(next, Math.max(0, number + (next ? 1 : -1)));
      }}
    >
      <motion.span
        className="pulse-heart__pill"
        key={run}
        initial={false}
        animate={run && !reduced ? { scale: [1, 1 - beat / 100, 1] } : { scale: 1 }}
        transition={{ duration: duration / 1000 }}
      >
        <motion.span
          className="pulse-heart__heart"
          aria-hidden="true"
          animate={
            run && !reduced
              ? { scale: [1, dotSize, 1 + Math.min(0.3, overshoot / 10), 1] }
              : { scale: 1 }
          }
          transition={{ duration: duration / 1000, times: [0, 0.4, 0.72, 1], ease: "easeOut" }}
        >
          {paths ? (
            <svg viewBox="0 0 24 24" fill={liked || !idleOutline ? "currentColor" : "none"}>
              {paths.map(([, a]) => (
                <path key={String(a.key)} d={String(a.d)} />
              ))}
            </svg>
          ) : (
            icon
          )}
        </motion.span>
        {showCount && (
          <span className="pulse-heart__count" aria-hidden="true">
            <motion.span
              key={number}
              initial={reduced ? false : { y: "60%", opacity: 0.2 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: reduced ? 0 : rollDuration / 1000 }}
            >
              {Math.max(0, number).toLocaleString()}
            </motion.span>
          </span>
        )}
      </motion.span>
    </button>
  );
}
