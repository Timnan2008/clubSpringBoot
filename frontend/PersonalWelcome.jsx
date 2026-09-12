import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { X, ArrowRight } from "@phosphor-icons/react";
import { tx } from "./language";
import "./PersonalWelcome.css";

export default function PersonalWelcome({ enabled = true, accountId }) {
  const [gift, setGift] = useState(null),
    [closing, setClosing] = useState(false);
  const dialog = useRef(null),
    closeLock = useRef(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch("/api/campus-social/personal-welcome", { cache: "no-store", signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then(async (d) => {
        if (!d?.show || controller.signal.aborted) return;
        const opened = await fetch("/api/campus-social/personal-welcome/open", {
          method: "POST",
          headers: { "X-Workspace-Token": d.token },
          signal: controller.signal,
        });
        if (opened.ok && (await opened.json()).show) setGift(d);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [enabled, accountId]);
  useEffect(() => {
    if (!gift) return;
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [gift]);
  const close = () => {
    if (closeLock.current) return;
    closeLock.current = true;
    setClosing(true);
  };
  if (!gift) return null;
  return createPortal(
    <dialog
      ref={dialog}
      className="personal-welcome"
      aria-labelledby="personal-welcome-title"
      aria-describedby="personal-welcome-message"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <motion.div
        className="personal-welcome-scene"
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={{ duration: reduced ? 0 : closing ? 0.2 : 0.45 }}
        onAnimationComplete={() => {
          if (closing) {
            dialog.current?.close();
            setGift(null);
            setClosing(false);
            closeLock.current = false;
          }
        }}
      >
        <button
          type="button"
          className="personal-welcome-close"
          onClick={close}
          aria-label={tx("关闭欢迎页", "Close welcome")}
        >
          <X size={24} />
        </button>
        <motion.div
          className="personal-welcome-copy"
          initial={{ opacity: 0, y: reduced ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.65, delay: reduced ? 0 : 0.12 }}
        >
          <span className="personal-welcome-eyebrow">
            {tx("给你的一份特别欢迎", "A special welcome for you")}
          </span>
          <h1 id="personal-welcome-title">{gift.welcome.title}</h1>
          <p id="personal-welcome-message">{gift.welcome.message}</p>
          <button type="button" className="personal-welcome-enter" onClick={close}>
            {tx("进入校园", "Enter campus")}
            <ArrowRight size={20} />
          </button>
        </motion.div>
        <motion.figure
          className="personal-welcome-photo"
          initial={{ opacity: 0, y: reduced ? 0 : 32, rotate: reduced ? 0 : 2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : 0.2 }}
        >
          <img
            src={gift.imageUrl}
            alt={gift.welcome.imageAlt || tx("专属欢迎图片", "Your welcome image")}
          />
        </motion.figure>
      </motion.div>
    </dialog>,
    document.body,
  );
}
