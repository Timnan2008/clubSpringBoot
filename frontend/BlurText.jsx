import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export default function BlurText({
  text = "",
  animateBy = "words",
  delay = 150,
  direction = "top",
  stepDuration = 0.35,
  className = "",
  onAnimationComplete,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const parts = animateBy === "words" ? text.split(" ") : Array.from(text);
  return (
    <span ref={ref} className={`blur-text ${className}`} aria-label={text}>
      {parts.map((part, index) => (
        <motion.span
          key={`${text}-${index}`}
          aria-hidden="true"
          style={{ display: "inline-block" }}
          initial={
            reduce ? false : { filter: "blur(10px)", opacity: 0, y: direction === "top" ? -22 : 22 }
          }
          animate={
            visible || reduce
              ? {
                  filter: reduce ? "blur(0px)" : ["blur(10px)", "blur(5px)", "blur(0px)"],
                  opacity: reduce ? 1 : [0, 0.5, 1],
                  y: reduce ? 0 : [direction === "top" ? -22 : 22, direction === "top" ? 3 : -3, 0],
                }
              : undefined
          }
          transition={{
            duration: reduce ? 0 : stepDuration * 2,
            delay: reduce ? 0 : (index * delay) / 1000,
            times: [0, 0.5, 1],
            ease: "easeOut",
          }}
          onAnimationComplete={index === parts.length - 1 ? onAnimationComplete : undefined}
        >
          {part === " " ? "\u00a0" : part}
          {animateBy === "words" && index < parts.length - 1 ? "\u00a0" : ""}
        </motion.span>
      ))}
    </span>
  );
}
