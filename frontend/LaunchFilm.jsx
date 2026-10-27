import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import {
  ArrowCounterClockwise,
  Pause,
  Play,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";
import { DURATION } from "./launch-cues.mjs";
import { createDevices, createRig } from "./launch-devices.js";
import { createScore } from "./launch-score.js";
import { buildTimeline } from "./launch-timeline.js";
import useMotionPreference from "./useMotionPreference";
import {
  CREST,
  ChatWindow,
  ClubsLayer,
  CourtsLayer,
  Lock,
  MobileScreen,
  SiteScreen,
  Split,
  Title,
  WallLayer,
  WorkspaceLayer,
} from "./LaunchScreens";
import "./LaunchFilm.css";

const PHYSICS = "/other%20photo/physics-club-logo.jpg";
const BASKETBALL = "/other%20photo/basketball-club-logo.jpg";
const FALLBACK_COUNT = 43;
const FALLBACK_CLUBS = [
  ["Codecraft", CREST],
  ["QPWFLFC", CREST],
  ["ChemXplore", CREST],
  ["Phonology Choir", CREST],
  ["Physics club", PHYSICS],
  ["QPWFLBC", BASKETBALL],
  ["Wishers", CREST],
  ["R&J", CREST],
].map(([name, logo]) => ({ name, logo }));

const WORDS = [
  ["Discover.", "Find the club that fits you."],
  ["Share.", "Post, reply and @ friends on the Campus Wall."],
  ["Organize.", "Attendance, documents and meetings in one workspace."],
  ["Book.", "Reserve a badminton court in seconds."],
];
const CAPTIONS = ["Understands.", "Plans.", "Acts.", "With your approval."];
const REEL = Array.from({ length: 20 }, (_, i) => i % 10);

function safeUrl(url) {
  try {
    const parsed = new URL(url || CREST, location.origin);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : CREST;
  } catch {
    return CREST;
  }
}

/** Featured clubs with real logos first; the film always shows eight slots. */
function pickClubs(rows) {
  const generic = /WFL-(logo|crest)/;
  const rank = (club) => (club.greatClub ? 2 : 0) + (generic.test(club.clubItem || "") ? 0 : 1);
  const picked = rows
    .filter((club) => club.clubNameEn?.trim() && club.clubClass !== "hidden")
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, 8)
    .map((club) => ({ name: club.clubNameEn.trim(), logo: safeUrl(club.clubItem) }));
  return [...picked, ...FALLBACK_CLUBS].slice(0, 8);
}

/** Wall-clock transport; the timeline and the score both follow it. */
function createTransport() {
  let offset = 0;
  let startedAt = 0;
  let playing = false;
  const now = () => performance.now() / 1000;
  const time = () => Math.min(DURATION, playing ? offset + now() - startedAt : offset);
  return {
    time,
    get playing() {
      return playing;
    },
    play() {
      if (playing) return;
      startedAt = now();
      playing = true;
    },
    pause() {
      offset = time();
      playing = false;
    },
    seek(t) {
      offset = Math.max(0, Math.min(DURATION, t));
      startedAt = now();
    },
  };
}

const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

const screen = (className) => {
  const element = document.createElement("div");
  element.className = `lf-screen ${className}`;
  return element;
};

/** Without WebGL or the model, the screens still play as flat cards in the device shots. */
function flatDevices(layer, screens) {
  layer.classList.add("is-flat");
  layer.append(screens.mac);
  return {
    rig: createRig(),
    ready: Promise.resolve(),
    render() {},
    setResolution() {},
    dispose() {},
  };
}

export default function LaunchFilm() {
  const viewport = useRef(null);
  const comp = useRef(null);
  const canvas = useRef(null);
  const glCanvas = useRef(null);
  const glScreens = useRef(null);
  const compScale = useRef(1);
  const scrub = useRef(null);
  const elapsed = useRef(null);
  const player = useRef(null);
  const dragging = useRef(false);
  const reduceMotion = useMotionPreference();
  const [screens] = useState(() => ({
    mac: screen("lf-screen-mac"),
    phone: screen("lf-screen-phone"),
  }));
  const [clubs, setClubs] = useState(FALLBACK_CLUBS);
  const [count, setCount] = useState(FALLBACK_COUNT);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(!reduceMotion);
  const [sound, setSound] = useState(false);
  const [ended, setEnded] = useState(false);
  const [idle, setIdle] = useState(false);

  useLayoutEffect(() => {
    const fit = () => {
      compScale.current = Math.min(innerWidth / 1920, innerHeight / 1080);
      viewport.current.style.setProperty("--lf-scale", compScale.current);
      player.current?.devices.setResolution(compScale.current);
    };
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    fetch("/api/club/all", { signal: controller.signal, headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        const rows = Array.isArray(result) ? result : result?.data;
        if (!Array.isArray(rows) || !rows.length) return;
        setCount(rows.length);
        setClubs(pickClubs(rows));
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  useLayoutEffect(() => {
    let devices;
    try {
      devices = createDevices({ canvas: glCanvas.current, layer: glScreens.current, screens });
      devices.setResolution(compScale.current);
      devices.ready.catch(() => flatDevices(glScreens.current, screens));
    } catch {
      devices = flatDevices(glScreens.current, screens);
    }
    let timeline;
    const context = gsap.context(() => {
      timeline = buildTimeline(comp.current, canvas.current, { rig: devices.rig, screens });
    }, comp);
    const state = { timeline, devices, transport: createTransport(), score: null, sound: false };
    player.current = state;
    const tick = () => {
      const t = state.transport.time();
      timeline.time(t);
      devices.render();
      if (scrub.current && !dragging.current) scrub.current.value = t;
      if (elapsed.current) elapsed.current.textContent = `${clock(t)} / ${clock(DURATION)}`;
      if (state.transport.playing && t >= DURATION) {
        state.transport.pause();
        state.score?.stop();
        setPlaying(false);
        setEnded(true);
      }
    };
    gsap.ticker.lagSmoothing(0);
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      state.score?.dispose();
      context.revert();
      devices.dispose();
    };
  }, []);

  const play = useCallback(() => {
    const state = player.current;
    if (state.transport.time() >= DURATION - 0.05) state.transport.seek(0);
    state.transport.play();
    if (state.sound) state.score.start(state.transport.time());
    setPlaying(true);
    setEnded(false);
  }, []);

  const pause = useCallback(() => {
    const state = player.current;
    state.transport.pause();
    state.score?.stop();
    setPlaying(false);
  }, []);

  const toggle = useCallback(
    () => (player.current.transport.playing ? pause() : play()),
    [pause, play],
  );

  const toggleSound = useCallback(() => {
    const state = player.current;
    state.sound = !state.sound;
    if (state.sound) {
      state.score ??= createScore();
      if (state.transport.playing) state.score.start(state.transport.time());
    } else state.score?.stop();
    setSound(state.sound);
  }, []);

  const seek = useCallback((t) => {
    const state = player.current;
    state.transport.seek(t);
    state.score?.stop();
    if (t < DURATION) setEnded(false);
  }, []);

  const resumeScore = useCallback(() => {
    const state = player.current;
    if (state.sound && state.transport.playing) state.score.start(state.transport.time());
  }, []);

  useEffect(() => {
    // Decided once, on the preference present at load: reduced motion opens on the end card.
    if (reduceMotion) {
      player.current.transport.seek(DURATION);
      return;
    }
    let cancelled = false;
    const assets = Promise.all([document.fonts?.ready, player.current.devices.ready]);
    Promise.race([assets.catch(() => {}), new Promise((r) => setTimeout(r, 8000))]).then(() => {
      if (cancelled) return;
      setLoading(false);
      const { transport } = player.current;
      if (!transport.playing && transport.time() === 0) play();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const hide = () => document.hidden && pause();
    const keys = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const onScrubber = event.target === scrub.current;
      if (event.key === " " && event.target.closest?.("button, a")) return;
      if (event.key === " " || event.key === "k") {
        event.preventDefault();
        toggle();
      } else if (event.key === "m") toggleSound();
      else if (!onScrubber && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        seek(player.current.transport.time() + (event.key === "ArrowLeft" ? -5 : 5));
        resumeScore();
      }
    };
    const grab = () => (dragging.current = true);
    const release = () => {
      dragging.current = false;
      resumeScore();
    };
    const range = scrub.current;
    document.addEventListener("visibilitychange", hide);
    addEventListener("keydown", keys);
    range.addEventListener("pointerdown", grab);
    range.addEventListener("change", release);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      removeEventListener("keydown", keys);
      range.removeEventListener("pointerdown", grab);
      range.removeEventListener("change", release);
    };
  }, [pause, resumeScore, seek, toggle, toggleSound]);

  useEffect(() => {
    if (!playing) {
      setIdle(false);
      return;
    }
    let timer;
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 2600);
    };
    wake();
    addEventListener("pointermove", wake);
    addEventListener("keydown", wake);
    return () => {
      clearTimeout(timer);
      removeEventListener("pointermove", wake);
      removeEventListener("keydown", wake);
    };
  }, [playing]);

  const showCta = !playing && (ended || reduceMotion);

  return (
    <div className={`lf-viewport${idle ? " is-idle" : ""}`} ref={viewport}>
      <h1 className="lf-sr">QPWFLHS Clubs, the launch film</h1>
      <p className="lf-sr">
        A 50-second animated film introducing the QPWFLHS Clubs website: every club in one place,
        the Campus Wall, club workspaces, badminton court booking, the Agent Ollie assistant and
        encrypted messages.
      </p>
      <div className="lf-comp" ref={comp} aria-hidden="true" onClick={toggle}>
        <section className="lf-shot lf-open">
          <div className="lf-open-title">Something new</div>
          <div className="lf-horizon" />
          <span className="lf-horizon-dot" />
          <div className="lf-open-sub">
            <Split text="is coming to campus." />
          </div>
        </section>

        <section className="lf-shot lf-crest">
          <div className="lf-crest-inner">
            <div className="lf-crest-glow" />
            <div className="lf-ring" />
            <div className="lf-crest-3d">
              <img className="lf-crest-img" src={CREST} alt="" />
            </div>
            <Title className="lf-wordmark" text="QPWFLHS Clubs" />
            <p className="lf-school">Shanghai Qingpu World Foreign Language High School</p>
          </div>
        </section>

        <section className="lf-shot lf-device">
          <div className="lf-device-light" />
          <div className="lf-floor" />
          <h2 className="lf-title lf-device-title">
            <Split text="Every club." /> <Split className="lf-dim" text="One place." />
          </h2>
        </section>

        <section className="lf-shot lf-layers">
          <div className="lf-stack-stage">
            <div className="lf-stack-tilt">
              <div className="lf-stack">
                <CourtsLayer />
                <WorkspaceLayer />
                <WallLayer />
                <ClubsLayer clubs={clubs} />
              </div>
            </div>
          </div>
          <div className="lf-words">
            {WORDS.map(([word, line]) => (
              <div className="lf-word" key={word}>
                <h2 className="lf-title">
                  <Split text={word} />
                </h2>
                <p>{line}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lf-shot lf-count">
          <div className="lf-count-glow" />
          <div className="lf-count-row">
            <span className="lf-odometer">
              {String(count)
                .split("")
                .map((digit, i) => (
                  <span className="lf-digit" key={i} style={{ "--digit": digit, "--i": i }}>
                    <span className="lf-reel">
                      {REEL.map((n, j) => (
                        <span key={j}>{n}</span>
                      ))}
                    </span>
                  </span>
                ))}
            </span>
            <span className="lf-count-unit">clubs.</span>
          </div>
          <p className="lf-count-sub">
            <Split text="One home for every one of them." />
          </p>
        </section>

        <section className="lf-shot lf-ollie">
          <canvas className="lf-particles" width="1920" height="1080" ref={canvas} />
          <div className="lf-orb-ring" />
          <div className="lf-orb" />
          <div className="lf-ollie-title">
            <span className="lf-ollie-meet">
              <Split text="Meet" />
            </span>
            <Title className="lf-ollie-name" text="Agent Ollie." />
            <p className="lf-ollie-sub">An AI assistant built for every club.</p>
          </div>
          <div className="lf-chat-stage">
            <ChatWindow />
          </div>
          <div className="lf-captions">
            {CAPTIONS.map((caption) => (
              <p key={caption}>{caption}</p>
            ))}
          </div>
        </section>

        <section className="lf-shot lf-privacy">
          <div className="lf-lock-glow" />
          <Lock />
          <Title className="lf-privacy-title" text="Private by design." />
          <p className="lf-privacy-sub">Messages and Agent Ollie chats are stored encrypted.</p>
        </section>

        <section className="lf-shot lf-finale">
          <div className="lf-finale-light" />
          <Title className="lf-tagline" text="Make room for what you love." />
          <div className="lf-end">
            <img className="lf-end-crest" src={CREST} alt="" />
            <h2 className="lf-end-title">
              QPWFLHS Clubs<span className="lf-sheen">QPWFLHS Clubs</span>
            </h2>
            <p className="lf-end-url">qpwflhsclub.com</p>
            <p className="lf-end-note">Available now.</p>
          </div>
        </section>

        <div className="lf-gl">
          <canvas className="lf-gl-canvas" ref={glCanvas} />
          <div className="lf-gl-screens" ref={glScreens} />
        </div>
        {createPortal(
          <>
            <SiteScreen clubs={clubs} />
            <div className="lf-glare" />
          </>,
          screens.mac,
        )}
        {createPortal(
          <>
            <MobileScreen />
            <span className="lf-island" />
            <div className="lf-glare" />
          </>,
          screens.phone,
        )}

        <div className="lf-flash" />
        <div className="lf-vignette" />
      </div>

      <a className="lf-home" href="/">
        <img src={CREST} alt="" />
        QPWFLHS Clubs
      </a>

      {loading && <span className="lf-loading" role="status" aria-label="Loading the film" />}

      {showCta && (
        <>
          <button type="button" className="lf-cta" onClick={play}>
            {ended ? <ArrowCounterClockwise weight="bold" /> : <Play weight="fill" />}
            {ended ? "Replay" : "Play the film"}
          </button>
          <p className="lf-credits">
            3D models:{" "}
            <a href="https://sketchfab.com/3d-models/macbook-pro-13-inch-2020-efab224280fd4c3993c808107f7c0b38">
              Macbook Pro 13 inch 2020
            </a>{" "}
            by timblewee and{" "}
            <a href="https://sketchfab.com/3d-models/apple-iphone-15-pro-max-black-df17520841214c1792fb8a44c6783ee7">
              Apple iPhone 15 Pro Max Black
            </a>{" "}
            by polyman Studio, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.
            Textures resized and compressed; screens replaced.
          </p>
        </>
      )}

      <div className="lf-controls">
        <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause weight="fill" size={20} /> : <Play weight="fill" size={20} />}
        </button>
        <input
          ref={scrub}
          className="lf-scrub"
          type="range"
          min="0"
          max={DURATION}
          step="0.01"
          defaultValue="0"
          aria-label="Film position"
          onInput={(event) => seek(Number(event.target.value))}
        />
        <span className="lf-time" ref={elapsed}>
          0:00 / {clock(DURATION)}
        </span>
        <button
          type="button"
          onClick={toggleSound}
          aria-label={sound ? "Mute" : "Turn sound on"}
          aria-pressed={sound}
        >
          {sound ? <SpeakerHigh weight="fill" size={20} /> : <SpeakerSlash size={20} />}
        </button>
      </div>
    </div>
  );
}
