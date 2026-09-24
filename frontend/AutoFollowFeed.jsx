import { useLayoutEffect, useRef } from "react";

export default function AutoFollowFeed({ children, className = "", rows, maxHeight = 240 }) {
  const viewport = useRef(null),
    content = useRef(null);
  useLayoutEffect(() => {
    const follow = () => {
      const box = viewport.current,
        inner = content.current;
      if (!box || !inner) return;
      if (rows) {
        const items = [...inner.children].slice(-rows);
        const gap = parseFloat(getComputedStyle(inner).rowGap) || 0;
        box.style.maxHeight = `${items.reduce((sum, item) => sum + item.getBoundingClientRect().height, 0) + Math.max(0, items.length - 1) * gap}px`;
      }
      box.scrollTop = box.scrollHeight;
    };
    follow();
    const observer = new ResizeObserver(follow);
    observer.observe(content.current);
    return () => observer.disconnect();
  }, [children, rows]);
  return (
    <div ref={viewport} className={`auto-follow-feed ${className}`} style={{ maxHeight }}>
      <div ref={content} className="auto-follow-feed__content">
        {children}
      </div>
    </div>
  );
}
