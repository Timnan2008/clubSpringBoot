// Beat sheet for the launch film, in seconds at 120 BPM (one bar = 2 s).
// The picture timeline and the score both read these times.
export const BEAT = 0.5;
export const DURATION = 50;

export const cues = {
  crest: 4,
  device: 8,
  powerOn: 10,
  dive: 16,
  words: [17.5, 19, 20.5, 22],
  count: 24,
  build: 28,
  ollie: 31,
  chat: 34,
  chips: [36, 36.6],
  approval: 37.1,
  approve: 37.9,
  file: 39.1,
  privacy: 40,
  lock: 41.5,
  finale: 44,
  endCard: 47.5,
};

const hz = (note) => 440 * 2 ** ((note - 69) / 12);

// Dmaj9, Bm9, Gmaj9, Aadd9 voiced around middle C; one chord per two bars.
const CHORDS = [
  { root: 38, notes: [50, 57, 61, 64, 66] },
  { root: 35, notes: [47, 54, 57, 61, 62] },
  { root: 31, notes: [43, 50, 54, 57, 59] },
  { root: 33, notes: [45, 52, 57, 59, 61] },
];

const inAny = (t, ranges) => ranges.some(([from, to]) => t >= from && t < to);
const DRIVE = [
  [16, 27.5],
  [34, 39.75],
  [44, cues.endCard],
];

function padColor(t) {
  if (t < cues.device) return { cutoff: 700, level: 0.5 };
  if (t < cues.dive) return { cutoff: 1200, level: 0.6 };
  if (t < cues.build) return { cutoff: 2200, level: 0.7 };
  if (t < cues.ollie + 1) return { cutoff: 520, level: 0.55 };
  if (t < cues.privacy) return { cutoff: 2600, level: 0.7 };
  if (t < cues.finale) return { cutoff: 900, level: 0.5 };
  return { cutoff: 3200, level: 0.8 };
}

/** Every sound in the film as `{ at, kind, ...params }`, sorted by start time. */
export function scoreEvents() {
  const events = [];
  const add = (at, kind, params = {}) => events.push({ at, kind, dur: 0, ...params });

  add(0.2, "drone", { dur: 4.4, freq: hz(38), level: 0.22 });
  add(0.6, "shimmer", { dur: 3.2, freq: hz(86), level: 0.05 });
  add(2, "riser", { dur: 2, level: 0.16 });

  for (let t = cues.crest, i = 0; t < 48; t += 4, i++) {
    const chord = CHORDS[i % CHORDS.length];
    add(t, "pad", { dur: 4.4, notes: chord.notes.map(hz), ...padColor(t) });
    if (t >= cues.device && t < cues.dive)
      add(t, "sub", { dur: 4, freq: hz(chord.root), level: 0.3 });
    for (let e = t; e < t + 4; e += BEAT / 2)
      if (inAny(e, DRIVE)) add(e, "bass", { dur: 0.22, freq: hz(chord.root + 12), level: 0.32 });
  }
  add(cues.ollie, "pad", {
    dur: 3.4,
    notes: CHORDS[3].notes.map((n) => hz(n + 12)),
    cutoff: 3400,
    level: 0.35,
  });
  add(cues.endCard, "pad", {
    dur: 3,
    notes: [...CHORDS[0].notes, 69, 74].map(hz),
    cutoff: 2800,
    level: 0.8,
  });

  for (let t = cues.powerOn; t < cues.endCard; t += BEAT) {
    if (t < cues.dive) add(t, "kick", { level: 0.45 });
    else if (inAny(t, DRIVE)) {
      add(t, "kick", { level: 0.8 });
      add(t + BEAT / 2, "hat", { level: 0.12 });
    }
  }

  for (const [at, dur, level] of [
    [14.2, 1.8, 0.2],
    [22.9, 1.1, 0.12],
    [cues.build, 3, 0.3],
    [42.4, 1.6, 0.2],
    [46.4, 1.1, 0.14],
  ])
    add(at, "riser", { dur, level });

  for (const [at, level] of [
    [cues.crest, 0.8],
    [cues.powerOn, 0.55],
    [cues.dive, 0.8],
    [cues.count, 0.7],
    [cues.ollie, 1],
    [cues.finale, 0.9],
    [cues.endCard, 1],
  ])
    add(at, "impact", { level });

  for (const at of [7.4, 15.2, 23.3, 27.4, 33.8, 39.6, 43.4])
    add(at, "whoosh", { dur: 0.8, level: 0.14 });

  for (const at of cues.words) add(at, "tick", { freq: 1760, level: 0.08 });
  for (const at of cues.chips) add(at + 0.3, "tick", { freq: 2093, level: 0.06 });
  for (let i = 0, t = cues.count + 0.08; i < 14; i++, t += 0.05 + i * 0.012)
    add(t, "tick", { freq: 2637, level: 0.035 });
  add(cues.approval, "tick", { freq: 1319, level: 0.06 });
  add(cues.approve, "click", { level: 0.12 });
  add(cues.lock, "click", { level: 0.18 });

  add(cues.ollie + 0.05, "chime", { notes: [74, 78, 81, 85].map(hz), level: 0.09 });
  add(cues.file, "chime", { notes: [81, 86].map(hz), level: 0.07 });
  add(cues.lock + 0.08, "chime", { notes: [69, 76].map(hz), level: 0.07 });
  add(cues.endCard + 0.05, "chime", { notes: [62, 69, 74, 78, 81].map(hz), level: 0.08 });

  return events.sort((a, b) => a.at - b.at);
}
