// Adapted from React Bits StaggeredMenu: GSAP prelayers and staggered link reveals.
import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import "./StaggeredMenu.css";
export default function StaggeredMenu({
  position = "right",
  colors = ["#B497CF", "#5227FF"],
  items = [],
  socialItems = [],
  displaySocials = false,
  displayItemNumbering = true,
  menuButtonColor = "#17151c",
  openMenuButtonColor = "#17151c",
  accentColor = "#7543a3",
  logoUrl = "/other%20photo/WFL-crest.svg",
  closeOnClickAway = true,
  onMenuOpen,
  onMenuClose,
  language = "zh",
}) {
  const en = language === "en";
  const [open, setOpen] = useState(false);
  const layer = useRef(null),
    panel = useRef(null),
    toggle = useRef(null),
    timeline = useRef(null),
    overlay = useRef(null),
    close = useRef(null),
    initial = useRef(true);
  function shut() {
    setOpen(false);
    toggle.current?.focus();
  }
  useLayoutEffect(() => {
    const layers = [...layer.current.querySelectorAll(".sm-prelayer")];
    const offscreen = position === "left" ? -100 : 100;
    timeline.current?.kill();
    if (initial.current) {
      gsap.set([panel.current, ...layers], { xPercent: offscreen });
      initial.current = false;
      return;
    }
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const duration = reduced ? 0 : 0.55;
    const tl = gsap.timeline();
    timeline.current = tl;
    if (open) {
      gsap.set(overlay.current, { visibility: "visible" });
      tl.to(overlay.current, { opacity: 1, duration: reduced ? 0 : 0.2 }, 0);
      layers.forEach((el, i) =>
        tl.to(
          el,
          { xPercent: 0, duration: reduced ? 0 : 0.45, ease: "power4.out" },
          reduced ? 0 : i * 0.07,
        ),
      );
      tl.to(
        panel.current,
        { xPercent: 0, duration, ease: "power4.out" },
        reduced ? 0 : 0.14,
      );
      tl.fromTo(
        panel.current.querySelectorAll(".sm-panel-itemLabel"),
        { yPercent: 140, rotate: 8, opacity: 0 },
        {
          yPercent: 0,
          rotate: 0,
          opacity: 1,
          duration: reduced ? 0 : 0.7,
          ease: "power4.out",
          stagger: reduced ? 0 : 0.055,
        },
        reduced ? 0 : 0.22,
      );
      close.current?.focus({ preventScroll: true });
      onMenuOpen?.();
    } else {
      tl.to(
        [panel.current, ...layers],
        { xPercent: offscreen, duration: reduced ? 0 : 0.3, ease: "power3.in" },
        0,
      );
      tl.to(
        overlay.current,
        {
          opacity: 0,
          duration: reduced ? 0 : 0.3,
          onComplete: () => gsap.set(overlay.current, { visibility: "hidden" }),
        },
        0,
      );
      onMenuClose?.();
    }
    return () => tl.kill();
  }, [open, position]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Keep keyboard and assistive navigation inside the open drawer.
    const outside = [...document.body.children].filter(
      (e) =>
        e !== overlay.current &&
        !["SCRIPT", "STYLE", "LINK"].includes(e.tagName),
    );
    const states = outside.map((e) => e.inert);
    outside.forEach((e) => (e.inert = true));
    const key = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        shut();
      }
      if (e.key === "Tab") {
        const focusable = [
          ...panel.current.querySelectorAll("a[href],button:not(:disabled)"),
        ];
        const first = focusable[0],
          last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previous;
      outside.forEach((e, i) => (e.inert = states[i]));
      document.removeEventListener("keydown", key);
      requestAnimationFrame(() =>
        toggle.current?.focus({ preventScroll: true }),
      );
    };
  }, [open]);
  return (
    <>
      <button
        ref={toggle}
        className="sm-toggle"
        style={{ color: open ? openMenuButtonColor : menuButtonColor }}
        type="button"
        aria-expanded={open}
        aria-controls="staggered-menu-panel"
        aria-label={en ? "Open menu" : "打开菜单"}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{en ? "Menu" : "菜单"}</span>
        <span className="sm-toggle-plus" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 4v16M4 12h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </span>
      </button>
      {createPortal(
        <div
          ref={overlay}
          className="staggered-menu-wrapper"
          data-position={position}
          data-open={open || undefined}
          aria-hidden={!open}
          inert={!open}
          style={{ "--sm-accent": accentColor }}
        >
          <div
            className="sm-backdrop"
            onClick={() => closeOnClickAway && shut()}
          />
          <div className="sm-prelayers" ref={layer} aria-hidden="true">
            {colors.slice(0, 4).map((color, i) => (
              <div
                key={i}
                className="sm-prelayer"
                style={{ background: color }}
              />
            ))}
          </div>
          <aside
            id="staggered-menu-panel"
            ref={panel}
            className="staggered-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label={en ? "Site navigation" : "网站导航"}
          >
            <div className="sm-panel-top">
              <a
                href="/"
                className="sm-logo"
                aria-label={en ? "Home" : "返回首页"}
              >
                <img src={logoUrl} alt="" />
                <span>QPWFLHS CLUBS</span>
              </a>
              <button
                type="button"
                ref={close}
                className="sm-close"
                onClick={shut}
              >
                {en ? "Close" : "关闭"} <span aria-hidden="true">×</span>
              </button>
            </div>
            <p className="sm-caption">
              {en ? "EXPLORE YOUR CAMPUS" : "探索校园，发现热爱"}
            </p>
            <ul
              className="sm-panel-list"
              data-numbering={displayItemNumbering || undefined}
            >
              {items.map((it, i) => (
                <li key={i} className="sm-panel-itemWrap">
                  <a
                    className="sm-panel-item"
                    href={it.link}
                    aria-label={it.ariaLabel || it.label}
                    onClick={
                      it.action === "logout"
                        ? async (e) => {
                            e.preventDefault();
                            try {
                              await fetch("/api/user/logout");
                            } finally {
                              location.assign("/page/user/login");
                            }
                          }
                        : undefined
                    }
                  >
                    <span className="sm-panel-itemLabel">{it.label}</span>
                    <span className="sm-number" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            {displaySocials && (
              <div className="sm-socials">
                <span>{en ? "Language" : "语言"}</span>
                {socialItems.map((it) => (
                  <a key={it.label} href={it.link}>
                    {it.label}
                  </a>
                ))}
              </div>
            )}
          </aside>
        </div>,
        document.body,
      )}
    </>
  );
}
