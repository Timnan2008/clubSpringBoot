import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import "./BlurHighlight.css";

// Local implementation of the paragraph reveal/highlight interaction.
export default function BlurHighlight({ children, highlightedBits = [], className = "" }) {
  const ref = useRef(null);
  const visible = useInView(ref, { once: true, amount: 0.2 });
  const reduce = useReducedMotion();
  const text = String(children ?? "");
  const phrases = [...new Set(highlightedBits.filter(Boolean))].sort((a, b) => b.length - a.length);
  const pattern = phrases.length
    ? new RegExp(
        `(${phrases.map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
        "gi",
      )
    : null;
  const parts = pattern ? text.split(pattern) : [text];
  let highlight = 0;
  return (
    <motion.p
      ref={ref}
      className={`blur-highlight ${className}`}
      data-visible={visible || reduce || undefined}
      initial={false}
      animate={
        visible || reduce
          ? { opacity: 1, filter: "blur(0px)", y: 0 }
          : { opacity: 0.45, filter: "blur(7px)", y: 8 }
      }
      transition={{ duration: reduce ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] }}
    >
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark
            className="blur-highlight__mark"
            key={index}
            style={{ "--highlight-delay": `${0.4 + highlight++ * 0.18}s` }}
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </motion.p>
  );
}
