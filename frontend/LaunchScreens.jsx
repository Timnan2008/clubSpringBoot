import { Fragment, useState } from "react";

export const CREST = "/other%20photo/WFL-crest.svg";

/** Words wrapped in clipping masks, so each word can rise into view like a track matte. */
export function Split({ text, className = "" }) {
  return (
    <span className={`lf-split ${className}`}>
      {text.split(" ").map((word, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span className="lf-mask">
            <span className="lf-piece">{word}</span>
          </span>
        </Fragment>
      ))}
    </span>
  );
}

/** A title whose words rise in, with a matching text layer on top for the light sweep. */
export function Title({ text, className = "" }) {
  return (
    <h2 className={`lf-title ${className}`}>
      <Split text={text} />
      <span className="lf-sheen">{text}</span>
    </h2>
  );
}

export function Logo({ src, className = "" }) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      className={className}
      src={failed ? CREST : src}
      alt=""
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

const NOTICES = [
  "[Update] The QPWFLHS Club website 6.3.1 is officially online.",
  "[Features] Registration and sign-in are now fully open.",
  "[Notice] Club presidents can now update their own club pages.",
];

export function SiteScreen({ clubs }) {
  return (
    <div className="lf-site">
      <div className="lf-site-veil" />
      <div className="lf-site-scroll">
        <section className="lf-site-hero">
          <span className="lf-site-pill">QPWFLHS CLUBS</span>
          <h3>Make room for what you love.</h3>
          <p>Find your club, meet your people, and make the most of life beyond the classroom.</p>
          <span className="lf-site-btn">Browse All Clubs</span>
        </section>
        <section className="lf-site-panel">
          <h4>Notices</h4>
          <div className="lf-site-notices">
            {NOTICES.map((text, i) => (
              <p key={i}>{text}</p>
            ))}
          </div>
        </section>
        <section className="lf-site-panel">
          <h4>Featured Clubs</h4>
          <div className="lf-site-cards">
            {clubs.slice(0, 5).map((club, i) => (
              <div className="lf-site-card" key={i}>
                <div className="lf-site-logo">
                  <Logo src={club.logo} />
                </div>
                <b>{club.name}</b>
                <span>View Details ↗</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <header className="lf-site-nav">
        <img src={CREST} alt="" />
        <b>Shanghai Qingpu World Foreign Language High School</b>
        <span className="lf-site-search">Search clubs, names, nicknames or posts</span>
        <span className="lf-site-signin">Sign in</span>
        <span className="lf-site-menu">Menu +</span>
      </header>
    </div>
  );
}

export function MobileScreen() {
  return (
    <div className="lf-mobile">
      <div className="lf-site-veil" />
      <header className="lf-mobile-nav">
        <div className="lf-mobile-row">
          <img src={CREST} alt="" />
          <b>QPWFLHS</b>
          <span className="lf-site-signin">Sign in</span>
          <span className="lf-site-menu">Menu +</span>
        </div>
        <span className="lf-mobile-search">Search clubs, names or posts</span>
      </header>
      <section className="lf-site-hero">
        <span className="lf-site-pill">QPWFLHS CLUBS</span>
        <h3>Make room for what you love.</h3>
        <p>Find your club, meet your people, and make the most of life beyond the classroom.</p>
        <span className="lf-site-btn">Browse All Clubs</span>
      </section>
      <section className="lf-site-panel">
        <h4>Notices</h4>
        <div className="lf-site-notices">
          {NOTICES.map((text, i) => (
            <p key={i}>{text}</p>
          ))}
        </div>
      </section>
    </div>
  );
}

function Layer({ label, className, children }) {
  return (
    <div className={`lf-layer ${className}`}>
      <span className="lf-layer-label">{label}</span>
      {children}
    </div>
  );
}

export function ClubsLayer({ clubs }) {
  return (
    <Layer label="Clubs" className="lf-layer-clubs">
      <div className="lf-tiles">
        {clubs.slice(0, 8).map((club, i) => (
          <div className="lf-tile" key={i}>
            <Logo src={club.logo} />
            <b>{club.name}</b>
          </div>
        ))}
      </div>
    </Layer>
  );
}

export function WallLayer() {
  return (
    <Layer label="Campus Wall" className="lf-layer-wall">
      <div className="lf-post">
        <div className="lf-post-head">
          <span className="lf-avatar">M</span>
          <div>
            <b>Maya</b>
            <small>Codecraft · 2 min ago</small>
          </div>
        </div>
        <p>Our first hackathon is this Friday. Bring a laptop and a friend!</p>
        <div className="lf-post-media" />
        <div className="lf-post-meta">
          <span className="lf-heart">♥ 128</span>
          <span>24 replies</span>
          <span>@Leo you in?</span>
        </div>
      </div>
    </Layer>
  );
}

const MEMBERS = [
  ["Maya Chen", 0],
  ["Leo Wang", 0],
  ["Ava Zhang", 2],
  ["Noah Liu", 0],
  ["Iris Zhou", 1],
];

export function WorkspaceLayer() {
  return (
    <Layer label="Workspace" className="lf-layer-workspace">
      <div className="lf-attendance">
        <h5>Attendance · Friday meeting</h5>
        {MEMBERS.map(([name, state]) => (
          <div className="lf-member" key={name}>
            <span>{name}</span>
            {["Present", "Leave", "Absent"].map((mark, i) => (
              <em key={mark} className={i === state ? `is-on mark-${i}` : ""}>
                {mark}
              </em>
            ))}
          </div>
        ))}
      </div>
      <div className="lf-docs">
        <h5>Documents</h5>
        <p>Semester proposal.docx</p>
        <p>Meeting notes.md</p>
        <p>Budget 2026.xlsx</p>
      </div>
    </Layer>
  );
}

const SLOTS = ["11:30", "11:50", "12:10", "12:30"];
const BOOKED = new Set([0, 2, 3, 5, 9, 10]);

export function CourtsLayer() {
  return (
    <Layer label="Courts" className="lf-layer-courts">
      <h5>Badminton courts · Monday</h5>
      <div className="lf-slots">
        <span />
        {["Court 1", "Court 2", "Court 3"].map((court) => (
          <b key={court}>{court}</b>
        ))}
        {SLOTS.map((time, row) => [
          <b key={time}>{time}</b>,
          ...[0, 1, 2].map((col) => {
            const i = row * 3 + col;
            const mine = i === 7;
            return (
              <span key={i} className={mine ? "is-mine" : BOOKED.has(i) ? "is-booked" : "is-free"}>
                {mine ? "Yours" : BOOKED.has(i) ? "Booked" : "Open"}
              </span>
            );
          }),
        ])}
      </div>
    </Layer>
  );
}

export const ANSWER =
  "Done. I drafted a 45-minute welcome plan with an ice-breaker, a live coding demo and team sign-ups, and added the meeting to your calendar.";

export function ChatWindow() {
  return (
    <div className="lf-chat">
      <div className="lf-chat-bar">
        <i />
        <i />
        <i />
        <b>Agent Ollie</b>
      </div>
      <div className="lf-chat-body">
        <p className="lf-msg-user">Plan Codecraft's first meeting and put it on our calendar.</p>
        <div className="lf-ollie-row">
          <span className="lf-ollie-avatar" />
          <div className="lf-thinking">
            <span className="lf-lattice">
              {Array.from({ length: 9 }, (_, i) => (
                <i key={i} />
              ))}
            </span>
            <span className="lf-think-label">Thinking</span>
            <span className="lf-think-done">Thought for 1.2s</span>
          </div>
        </div>
        <div className="lf-chips">
          {[
            ["search_club_materials", "Codecraft", "312 ms"],
            ["draft_document", "Welcome plan", "846 ms"],
          ].map(([name, arg, ms]) => (
            <div className="lf-chip" key={name}>
              <code>{name}</code>
              <span>{arg}</span>
              <em>✓ {ms}</em>
            </div>
          ))}
        </div>
        <div className="lf-approval">
          <div>
            <small>Needs your approval</small>
            <b>Add to calendar</b>
            <span>Codecraft welcome meeting · Fri, Oct 9 · 4:30 PM</span>
          </div>
          <span className="lf-deny">Deny</span>
          <span className="lf-approve">
            <span className="lf-approve-label">Approve</span>
            <span className="lf-approved-label">Approved</span>
          </span>
        </div>
        <p className="lf-answer">
          {ANSWER.split(" ").map((word, i) => (
            <span key={i}>{word} </span>
          ))}
        </p>
        <div className="lf-file">
          <span className="lf-file-icon">W</span>
          <div>
            <b>Codecraft-Welcome-Plan.docx</b>
            <small>Word document · 18 KB</small>
          </div>
        </div>
      </div>
      <div className="lf-chat-input">Message Agent Ollie…</div>
    </div>
  );
}

export function Lock() {
  return (
    <svg className="lf-lock" viewBox="0 0 200 240" aria-hidden="true">
      <defs>
        <linearGradient id="lf-lock-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="0.55" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#312e81" />
        </linearGradient>
      </defs>
      <path
        className="lf-lock-shackle"
        d="M52 112V78a48 48 0 0 1 96 0v34"
        pathLength="1"
        fill="none"
      />
      <rect
        className="lf-lock-body"
        x="28"
        y="108"
        width="144"
        height="112"
        rx="26"
        pathLength="1"
      />
      <circle className="lf-lock-hole" cx="100" cy="158" r="11" />
    </svg>
  );
}
