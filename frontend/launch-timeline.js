import { gsap } from "gsap";
import { DURATION, cues } from "./launch-cues.mjs";
import { createParticles, drawParticles } from "./launch-particles.mjs";

const ORB = { x: 960, y: 440 };

/**
 * Builds the whole film as one paused timeline over the 1920×1080 composition.
 * Every tween is a pure function of time, so the player can seek anywhere.
 * `rig` drives the three.js devices; `screens` are the DOM displays pinned onto them.
 */
export function buildTimeline(root, canvas, { rig, screens }) {
  const q = gsap.utils.selector(root);
  const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out", duration: 1 } });

  const shot = (name, from, to) =>
    tl.set(q(`.lf-${name}`), { autoAlpha: 1 }, from).set(q(`.lf-${name}`), { autoAlpha: 0 }, to);
  const flash = (at, strength) =>
    tl
      .set(q(".lf-flash"), { opacity: strength }, at)
      .to(q(".lf-flash"), { opacity: 0, duration: 0.8, ease: "power2.out" }, at);
  const rise = (targets, at, vars = {}) =>
    tl.fromTo(
      targets,
      { yPercent: 118 },
      { yPercent: 0, duration: 1.1, stagger: 0.08, ...vars },
      at,
    );
  const sink = (targets, at, vars = {}) =>
    tl.to(
      targets,
      { yPercent: -118, duration: 0.5, stagger: 0.03, ease: "power3.in", ...vars },
      at,
    );
  const sheen = (targets, at, duration = 1.5) =>
    tl.fromTo(
      targets,
      { backgroundPosition: "150% 0" },
      { backgroundPosition: "-50% 0", duration, ease: "power2.inOut" },
      at,
    );
  const fadeOut = (targets, at, duration = 0.55) =>
    tl.to(targets, { opacity: 0, filter: "blur(12px)", duration, ease: "power2.in" }, at);
  const devices = (from, to) =>
    tl
      .set(q(".lf-gl"), { autoAlpha: 1 }, from)
      .set(rig, { active: 1 }, from)
      .set(q(".lf-gl"), { autoAlpha: 0 }, to)
      .set(rig, { active: 0 }, to);

  // 1 · Cold open: a point of light becomes a horizon, the headline tracks in.
  shot("open", 0, cues.crest);
  tl.fromTo(
    q(".lf-horizon-dot"),
    { scale: 0, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.8, ease: "power2.out" },
    0.3,
  );
  tl.fromTo(q(".lf-horizon"), { scaleX: 0 }, { scaleX: 1, duration: 1.8, ease: "expo.inOut" }, 0.7);
  tl.to(q(".lf-horizon-dot"), { opacity: 0, scale: 0.4, duration: 0.8, ease: "power2.in" }, 1.4);
  tl.fromTo(
    q(".lf-open-title"),
    { opacity: 0, letterSpacing: "0.45em", filter: "blur(18px)" },
    { opacity: 1, letterSpacing: "-0.03em", filter: "blur(0px)", duration: 2.2 },
    1.1,
  );
  rise(q(".lf-open-sub .lf-piece"), 2.2);
  fadeOut(q(".lf-open-title, .lf-open-sub"), 3.35);
  tl.to(q(".lf-horizon"), { scaleX: 0, opacity: 0, duration: 0.5, ease: "power3.in" }, 3.4);

  // 2 · Crest: impact, shockwave ring, wordmark with a light sweep, then push through.
  const c = cues.crest;
  shot("crest", c, cues.device);
  flash(c, 0.85);
  tl.fromTo(
    q(".lf-crest-img"),
    { scale: 1.8, opacity: 0, rotationY: -55, filter: "blur(26px) brightness(2.2)" },
    { scale: 1, opacity: 1, rotationY: 0, filter: "blur(0px) brightness(1)", duration: 1.5 },
    c,
  );
  tl.fromTo(
    q(".lf-ring"),
    { scale: 0.2, opacity: 1 },
    { scale: 4.2, opacity: 0, duration: 1.8 },
    c,
  );
  tl.fromTo(
    q(".lf-crest-glow"),
    { opacity: 0, scale: 0.5 },
    { opacity: 1, scale: 1, duration: 2.2, ease: "power2.out" },
    c,
  );
  tl.to(q(".lf-crest-3d"), { y: -86, scale: 0.72, duration: 1.3, ease: "expo.inOut" }, c + 0.8);
  rise(q(".lf-wordmark .lf-piece"), c + 1.2, { duration: 1.3, stagger: 0.1 });
  sheen(q(".lf-wordmark .lf-sheen"), c + 2);
  tl.fromTo(
    q(".lf-school"),
    { opacity: 0, letterSpacing: "0.7em" },
    { opacity: 1, letterSpacing: "0.32em", duration: 1.8 },
    c + 1.6,
  );
  tl.to(
    q(".lf-crest-inner"),
    { scale: 1.4, opacity: 0, filter: "blur(16px)", duration: 0.7, ease: "power3.in" },
    cues.device - 0.7,
  );

  // 3 · Device: the MacBook turns out of the dark, opens, powers on, and the camera dives in.
  const d = cues.device;
  const p = cues.powerOn;
  const hero = rig.hero;
  const onMac = (selector) => screens.mac.querySelector(selector);
  shot("device", d, cues.dive + 0.3);
  devices(d, cues.dive + 0.3);
  tl.set(rig, { shot: 0 }, d);
  tl.set(hero.mac, { visible: 1, y: -2.4, yaw: -40, pitch: 30, lid: 0 }, d);
  tl.fromTo(hero, { light: 0 }, { light: 1, duration: 1.8, ease: "power2.out" }, d);
  tl.to(hero.mac, { lid: 1, duration: 1.9, ease: "power3.inOut" }, d + 0.4);
  tl.to(hero.mac, { yaw: -18, pitch: 20, duration: 2.1, ease: "power2.inOut" }, d);
  tl.fromTo(
    onMac(".lf-site"),
    { opacity: 0, filter: "brightness(2.4) saturate(0)" },
    { opacity: 1, filter: "brightness(1) saturate(1)", duration: 1.3, ease: "power2.out" },
    p,
  );
  tl.fromTo(
    q(".lf-device-light"),
    { opacity: 0, scale: 0.5 },
    { opacity: 0.5, scale: 0.8, duration: 1.8, ease: "power2.out" },
    d,
  );
  tl.to(q(".lf-device-light"), { opacity: 1, scale: 1, duration: 2, ease: "power2.out" }, p);
  tl.to(hero.mac, { yaw: 0, pitch: 9, y: -3.3, duration: 4.4, ease: "sine.inOut" }, p + 0.1);
  rise(q(".lf-device-title .lf-piece"), p + 0.5, { stagger: 0.12 });
  sheen(onMac(".lf-glare"), p + 0.8, 2.4);
  tl.to(onMac(".lf-site-scroll"), { y: -300, duration: 2.2, ease: "power3.inOut" }, p + 3.1);
  tl.to(
    q(".lf-device-title"),
    { opacity: 0, y: -70, filter: "blur(10px)", duration: 0.6, ease: "power3.in" },
    cues.dive - 1.2,
  );
  tl.to(q(".lf-device-light, .lf-floor"), { opacity: 0, duration: 0.6 }, cues.dive - 1);
  tl.to(hero.camera, { dive: 1, duration: 1.2, ease: "expo.in" }, cues.dive - 1.2);

  // 4 · Layers: the interface explodes into a stack; each word peels one layer away.
  const s = cues.dive;
  const tilt = q(".lf-stack-tilt");
  const stack = q(".lf-stack");
  const layers = q(".lf-layer");
  const words = q(".lf-word");
  shot("layers", s, cues.count + 0.1);
  flash(s, 0.75);
  tl.fromTo(
    tilt,
    { rotationX: 0, scale: 1.75, x: 0, y: 0 },
    { rotationX: 56, scale: 0.76, x: 260, y: 125, duration: 1.6, ease: "expo.inOut" },
    s,
  );
  tl.fromTo(stack, { rotationZ: 0 }, { rotationZ: -36, duration: 1.6, ease: "expo.inOut" }, s);
  tl.to(stack, { rotationZ: -24, duration: cues.count - s - 1.6, ease: "none" }, s + 1.6);
  layers.forEach((layer, i) =>
    tl.fromTo(layer, { z: 0 }, { z: i * 150, duration: 1.6, ease: "expo.inOut" }, s),
  );
  cues.words.forEach((at, i) => {
    const pieces = words[i].querySelectorAll(".lf-piece");
    const line = words[i].querySelector("p");
    const layer = layers[layers.length - 1 - i];
    rise(pieces, at, { duration: 0.9 });
    tl.fromTo(line, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 }, at + 0.15);
    tl.to(
      layer,
      {
        borderColor: "rgba(196,181,253,0.9)",
        boxShadow: "0 0 0 1px rgba(167,139,250,0.6), 0 0 90px rgba(124,58,237,0.55)",
        duration: 0.6,
      },
      at,
    );
    const next = cues.words[i + 1] ?? cues.count;
    sink(pieces, next - 0.35);
    tl.to(line, { opacity: 0, duration: 0.3, ease: "power2.in" }, next - 0.35);
    if (i < cues.words.length - 1)
      tl.to(layer, { z: "+=900", opacity: 0, duration: 0.8, ease: "power3.in" }, next - 0.45);
  });
  tl.to(tilt, { scale: 0.04, opacity: 0, duration: 0.7, ease: "power3.in" }, cues.count - 0.7);

  // 5 · Count: a live odometer of clubs.
  const k = cues.count;
  shot("count", k, cues.build);
  flash(k, 0.5);
  tl.fromTo(q(".lf-odometer"), { "--roll": 0 }, { "--roll": 1, duration: 1.9 }, k);
  tl.fromTo(
    q(".lf-count-row"),
    { scale: 1.3, opacity: 0, filter: "blur(18px)" },
    { scale: 1, opacity: 1, filter: "blur(0px)", duration: 1.2 },
    k,
  );
  tl.fromTo(
    q(".lf-count-unit"),
    { x: -50, opacity: 0 },
    { x: 0, opacity: 1, duration: 1 },
    k + 0.5,
  );
  rise(q(".lf-count-sub .lf-piece"), k + 1.4, { stagger: 0.06 });
  tl.fromTo(
    q(".lf-count-glow"),
    { opacity: 0, scale: 0.7 },
    { opacity: 1, scale: 1.1, duration: 3.2, ease: "sine.out" },
    k,
  );
  fadeOut(q(".lf-count-row, .lf-count-sub, .lf-count-glow"), cues.build - 0.6);

  // 6 · Agent Ollie: particles spiral into an orb, the name lands, then the orb becomes the avatar.
  const b = cues.build;
  const o = cues.ollie;
  const ch = cues.chat;
  shot("ollie", b, cues.privacy);
  const particles = createParticles();
  const paint = canvas.getContext("2d");
  const swarm = { p: 0 };
  tl.fromTo(
    swarm,
    { p: 0 },
    {
      p: 1,
      duration: o - b + 0.1,
      ease: "none",
      onUpdate: () => drawParticles(paint, particles, swarm.p, 1920, 1080, ORB.x, ORB.y),
    },
    b,
  );
  tl.to(q(".lf-particles"), { opacity: 0, duration: 0.3 }, o + 0.05);
  flash(o, 0.9);
  tl.fromTo(
    q(".lf-orb"),
    { scale: 0, opacity: 0 },
    { scale: 1, opacity: 1, duration: 1.3 },
    o - 0.3,
  );
  tl.fromTo(
    q(".lf-orb"),
    { "--spin": "0deg" },
    { "--spin": "900deg", duration: 9.5, ease: "none" },
    o - 0.3,
  );
  tl.set(q(".lf-orb-ring"), { scale: 0.3, opacity: 1 }, o);
  tl.to(q(".lf-orb-ring"), { scale: 5, opacity: 0, duration: 1.9 }, o);
  rise(q(".lf-ollie-meet .lf-piece"), o + 0.3);
  rise(q(".lf-ollie-name .lf-piece"), o + 0.5, { duration: 1.3, stagger: 0.12 });
  sheen(q(".lf-ollie-name .lf-sheen"), o + 1.5);
  tl.fromTo(q(".lf-ollie-sub"), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1 }, o + 1.2);
  tl.to(
    q(".lf-ollie-title"),
    { opacity: 0, y: -40, filter: "blur(10px)", duration: 0.6, ease: "power3.in" },
    ch - 0.6,
  );
  tl.to(
    q(".lf-orb"),
    { x: -196, y: -92, scale: 0.14, duration: 1.1, ease: "power3.inOut" },
    ch - 0.35,
  );
  tl.to(q(".lf-orb"), { opacity: 0, duration: 0.25 }, ch + 0.8);

  const chat = q(".lf-chat");
  tl.fromTo(
    chat,
    { opacity: 0, rotationX: 22, rotationY: -18, z: -600, y: 90 },
    { opacity: 1, rotationX: 7, rotationY: -8, z: 0, y: 0, duration: 1.5 },
    ch,
  );
  tl.to(chat, { rotationX: 2, rotationY: -2, duration: 4.4, ease: "sine.inOut" }, ch + 1.5);
  const captionTimes = [ch + 0.4, ch + 1.1, cues.chips[0], cues.approval];
  q(".lf-captions p").forEach((el, i) => {
    tl.fromTo(el, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.7 }, captionTimes[i]);
    if (i < captionTimes.length - 1)
      tl.to(el, { opacity: 0.28, duration: 0.5, ease: "power2.out" }, captionTimes[i + 1]);
  });
  tl.fromTo(
    q(".lf-msg-user"),
    { opacity: 0, y: 30, scale: 0.96 },
    { opacity: 1, y: 0, scale: 1, duration: 0.8 },
    ch + 0.35,
  );
  tl.fromTo(
    q(".lf-ollie-row"),
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: 0.5 },
    ch + 0.9,
  );
  tl.fromTo(
    q(".lf-lattice i"),
    { opacity: 0.18 },
    {
      opacity: 1,
      duration: 0.22,
      ease: "sine.inOut",
      stagger: { each: 0.06, grid: [3, 3], from: "center", repeat: 3, yoyo: true },
    },
    ch + 0.95,
  );
  tl.to(q(".lf-think-label"), { opacity: 0, duration: 0.2 }, ch + 1.95);
  tl.fromTo(q(".lf-think-done"), { opacity: 0 }, { opacity: 1, duration: 0.3 }, ch + 2);
  tl.to(
    q(".lf-lattice i"),
    { opacity: 1, backgroundColor: "#34d399", duration: 0.3, ease: "power2.out" },
    ch + 2,
  );
  q(".lf-chip").forEach((el, i) => {
    tl.fromTo(el, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.5 }, cues.chips[i]);
    tl.fromTo(
      el.querySelector("em"),
      { opacity: 0 },
      { opacity: 1, duration: 0.3 },
      cues.chips[i] + 0.3,
    );
  });
  tl.fromTo(
    q(".lf-approval"),
    { opacity: 0, y: 24, scale: 0.97 },
    { opacity: 1, y: 0, scale: 1, duration: 0.6 },
    cues.approval,
  );
  tl.to(q(".lf-approve"), { scale: 0.9, duration: 0.12, ease: "power2.in" }, cues.approve - 0.12);
  tl.to(
    q(".lf-approve"),
    { scale: 1, backgroundColor: "#16a34a", duration: 0.5, ease: "back.out(3)" },
    cues.approve,
  );
  tl.to(q(".lf-approve-label"), { yPercent: -120, opacity: 0, duration: 0.3 }, cues.approve);
  tl.fromTo(
    q(".lf-approved-label"),
    { yPercent: 120, opacity: 0 },
    { yPercent: 0, opacity: 1, duration: 0.35 },
    cues.approve,
  );
  tl.to(q(".lf-deny"), { opacity: 0.3, duration: 0.3 }, cues.approve);
  tl.fromTo(
    q(".lf-answer span"),
    { opacity: 0 },
    { opacity: 1, duration: 0.18, stagger: 0.034, ease: "none" },
    cues.approve + 0.25,
  );
  tl.fromTo(
    q(".lf-file"),
    { opacity: 0, y: 20, scale: 0.9 },
    { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(2)" },
    cues.file,
  );
  tl.to(
    q(".lf-chat-stage, .lf-captions"),
    { opacity: 0, scale: 0.94, filter: "blur(12px)", duration: 0.5, ease: "power2.in" },
    cues.privacy - 0.5,
  );

  // 7 · Privacy: the lock draws itself on, then the shackle snaps shut.
  const v = cues.privacy;
  shot("privacy", v, cues.finale);
  tl.fromTo(
    q(".lf-lock-shackle, .lf-lock-body"),
    { strokeDashoffset: 1 },
    { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", stagger: 0.15 },
    v + 0.15,
  );
  tl.fromTo(q(".lf-lock-body"), { fillOpacity: 0 }, { fillOpacity: 1, duration: 0.6 }, v + 1);
  tl.fromTo(
    q(".lf-lock-shackle"),
    { y: -34 },
    { y: 0, duration: 0.25, ease: "power4.in" },
    cues.lock - 0.25,
  );
  tl.to(
    q(".lf-lock"),
    { scale: 1.07, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out" },
    cues.lock,
  );
  tl.fromTo(q(".lf-lock-hole"), { opacity: 0 }, { opacity: 1, duration: 0.3 }, cues.lock);
  tl.fromTo(
    q(".lf-lock-glow"),
    { opacity: 0, scale: 0.6 },
    { opacity: 1, scale: 1, duration: 1.4 },
    cues.lock,
  );
  rise(q(".lf-privacy-title .lf-piece"), cues.lock + 0.2, { stagger: 0.08 });
  sheen(q(".lf-privacy-title .lf-sheen"), cues.lock + 1);
  tl.fromTo(
    q(".lf-privacy-sub"),
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.9 },
    cues.lock + 0.8,
  );
  fadeOut(q(".lf-lock, .lf-lock-glow, .lf-privacy-title, .lf-privacy-sub"), cues.finale - 0.55);

  // 8 · Finale: MacBook and iPhone together, the tagline, then the end card.
  const f = cues.finale;
  const e = cues.endCard;
  const finale = rig.finale;
  shot("finale", f, DURATION + 1);
  devices(f, e);
  tl.set(rig, { shot: 1 }, f);
  tl.set(onMac(".lf-site-scroll"), { y: 0 }, f);
  flash(f, 0.6);
  tl.fromTo(finale, { light: 0 }, { light: 1, duration: 1.6, ease: "power2.out" }, f);
  tl.fromTo(
    finale.mac,
    { visible: 1, lid: 1, x: -2, y: -5.8, yaw: 30, pitch: 14, scale: 0.88 },
    { y: -3.2, yaw: 16, pitch: 10, duration: 1.7 },
    f,
  );
  tl.fromTo(
    finale.phone,
    { visible: 1, x: 4.1, y: -4.1, z: 2, yaw: -40, pitch: 4, roll: 0, scale: 1.12 },
    { y: -1, yaw: -20, duration: 1.8 },
    f + 0.15,
  );
  tl.fromTo(finale.camera, { z: 20 }, { z: 18.6, duration: e - f, ease: "sine.inOut" }, f);
  tl.fromTo(
    q(".lf-finale-light"),
    { opacity: 0, scale: 0.6 },
    { opacity: 1, scale: 1, duration: 2, ease: "power2.out" },
    f,
  );
  rise(q(".lf-tagline .lf-piece"), f + 0.6, { stagger: 0.07 });
  sheen(q(".lf-tagline .lf-sheen"), f + 1.6);
  sheen([onMac(".lf-glare"), screens.phone.querySelector(".lf-glare")], f + 1.2, 2.2);
  fadeOut(q(".lf-tagline, .lf-gl, .lf-finale-light"), e - 0.6, 0.6);
  flash(e, 0.45);
  tl.fromTo(
    q(".lf-end-crest"),
    { scale: 1.5, opacity: 0, filter: "blur(16px)" },
    { scale: 1, opacity: 1, filter: "blur(0px)", duration: 1.3 },
    e,
  );
  tl.fromTo(
    q(".lf-end-title"),
    { letterSpacing: "0.3em", opacity: 0 },
    { letterSpacing: "-0.02em", opacity: 1, duration: 1.7 },
    e + 0.15,
  );
  sheen(q(".lf-end-title .lf-sheen"), e + 1.1);
  tl.fromTo(
    q(".lf-end-url, .lf-end-note"),
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: 0.9, stagger: 0.2 },
    e + 0.7,
  );

  tl.set({}, {}, DURATION);
  return tl;
}
