/*! Adapted from React Bits TextType. See REACT-BITS-LICENSE.md. */
import { createElement, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import useMotionPreference from "./useMotionPreference";
import "./TextType.css";

export default function TextType({
  text,
  as = "div",
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = true,
  className = "",
  showCursor = true,
  hideCursorWhileTyping = false,
  cursorCharacter = "|",
  cursorClassName = "",
  cursorBlinkDuration = 0.5,
  textColors = [],
  variableSpeed,
  onSentenceComplete,
  startOnVisible = false,
  reverseMode = false,
  ...props
}) {
  const container = useRef(null),
    cursor = useRef(null),
    callback = useRef(onSentenceComplete);
  callback.current = onSentenceComplete;
  const reduce = useMotionPreference();
  const [visible, setVisible] = useState(!startOnVisible);
  const [state, setState] = useState({ value: "", index: 0, typing: true });
  const contentKey = JSON.stringify(Array.isArray(text) ? text : [text || ""]);
  const speedMin = variableSpeed?.min,
    speedMax = variableSpeed?.max;
  useEffect(() => {
    if (!startOnVisible) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, [startOnVisible]);
  useEffect(() => {
    if (!visible) return;
    const sentences = JSON.parse(contentKey);
    if (reduce) {
      setState({ value: sentences[0], index: 0, typing: false });
      return;
    }
    let timer,
      index = 0,
      position = 0,
      deleting = false,
      cancelled = false;
    setState({ value: "", index: 0, typing: true });
    const schedule = (delay) => {
      timer = setTimeout(tick, Math.max(0, delay));
    };
    const tick = () => {
      if (cancelled) return;
      const chars = Array.from(sentences[index]);
      if (reverseMode) chars.reverse();
      position += deleting ? -1 : 1;
      position = Math.max(0, Math.min(chars.length, position));
      setState({
        value: chars.slice(0, position).join(""),
        index,
        typing: deleting || position < chars.length,
      });
      if (!deleting && position === chars.length) {
        callback.current?.(sentences[index], index);
        if (!loop && index === sentences.length - 1) return;
        deleting = true;
        schedule(pauseDuration);
      } else if (deleting && position === 0) {
        deleting = false;
        index = (index + 1) % sentences.length;
        schedule(typingSpeed);
      } else {
        const delay =
          Number.isFinite(speedMin) && Number.isFinite(speedMax)
            ? speedMin + Math.random() * (speedMax - speedMin)
            : typingSpeed;
        schedule(deleting ? deletingSpeed : delay);
      }
    };
    schedule(initialDelay + typingSpeed);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    contentKey,
    visible,
    reduce,
    initialDelay,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    loop,
    reverseMode,
    speedMin,
    speedMax,
  ]);
  useEffect(() => {
    if (!showCursor || !cursor.current || reduce) return;
    const tween = gsap.fromTo(
      cursor.current,
      { opacity: 1 },
      { opacity: 0, duration: cursorBlinkDuration, repeat: -1, yoyo: true, ease: "power2.inOut" },
    );
    return () => tween.kill();
  }, [showCursor, reduce, cursorBlinkDuration]);
  return createElement(
    as,
    { ...props, ref: container, className: `text-type ${className}` },
    <span className="text-type__sr">{JSON.parse(contentKey)[state.index]}</span>,
    <span
      className="text-type__content"
      aria-hidden="true"
      style={{ color: textColors[state.index % textColors.length] || "inherit" }}
    >
      {state.value}
    </span>,
    showCursor && (
      <span
        ref={cursor}
        aria-hidden="true"
        className={`text-type__cursor ${cursorClassName}${(hideCursorWhileTyping && state.typing) || reduce ? " text-type__cursor--hidden" : ""}`}
      >
        {cursorCharacter}
      </span>
    ),
  );
}
