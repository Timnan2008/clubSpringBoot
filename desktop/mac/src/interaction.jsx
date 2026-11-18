import { useEffect, useRef } from "react";

// A local pointer field: one paint per frame, no animation loop while idle.
// The site's pixel cards and profile highlight informed this smaller desktop treatment.
export function usePointerSurface() {
  const ref = useRef(null),
    frame = useRef(0),
    point = useRef(null);
  const reduced = useRef(matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)"));
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const onPointerMove = (event) => {
    if (
      reduced.current.matches ||
      event.pointerType === "touch" ||
      ref.current?.closest(".reduced")
    )
      return;
    point.current = { x: event.clientX, y: event.clientY };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const node = ref.current,
        p = point.current;
      if (!node || !p) return;
      const bounds = node.getBoundingClientRect();
      node.style.setProperty("--pointer-x", `${p.x - bounds.left}px`);
      node.style.setProperty("--pointer-y", `${p.y - bounds.top}px`);
    });
  };
  const onPointerLeave = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    point.current = null;
  };
  return { ref, onPointerMove, onPointerLeave };
}
