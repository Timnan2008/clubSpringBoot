import { scoreEvents } from "./launch-cues.mjs";

const LOOKAHEAD = 0.3;
const SILENT = 0.0001;

function noiseBuffer(ctx, seconds) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 1;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 16807) % 2147483647;
    data[i] = (seed / 2147483647) * 2 - 1;
  }
  return buffer;
}

function impulse(ctx, seconds) {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  let seed = 7;
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = ((seed / 2147483647) * 2 - 1) * (1 - i / length) ** 3;
    }
  }
  return buffer;
}

/** Attack, hold, then an exponential release on a fresh gain node. */
function envelope(ctx, at, attack, peak, hold, release) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(SILENT, at);
  gain.gain.linearRampToValueAtTime(peak, at + attack);
  gain.gain.setValueAtTime(peak, at + attack + hold);
  gain.gain.exponentialRampToValueAtTime(SILENT, at + attack + hold + release);
  return gain;
}

/**
 * Plays the film score in sync with an external clock. `start(filmTime)` schedules
 * sounds a short window ahead; `stop()` silences everything already queued.
 * Passing an OfflineAudioContext with a long lookahead renders the whole score at once.
 */
export function createScore({ context, lookahead = LOOKAHEAD } = {}) {
  const events = scoreEvents();
  let ctx, input, reverb, noise, session, timer, next, base;

  function ensure() {
    if (ctx) return;
    ctx = context ?? new AudioContext({ latencyHint: "interactive" });
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.25;
    const master = ctx.createGain();
    master.gain.value = 0.8;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.1;
    compressor.connect(master).connect(limiter).connect(ctx.destination);
    reverb = ctx.createConvolver();
    reverb.buffer = impulse(ctx, 3.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    reverb.connect(wet).connect(compressor);
    input = compressor;
    noise = noiseBuffer(ctx, 2);
  }

  function out(node, send = 0.3) {
    node.connect(session.dry);
    if (send) {
      const amount = ctx.createGain();
      amount.gain.value = send;
      node.connect(amount).connect(session.wet);
    }
  }

  function osc(type, freq, at, end) {
    const node = ctx.createOscillator();
    node.type = type;
    node.frequency.setValueAtTime(freq, at);
    node.start(at);
    node.stop(end);
    return node;
  }

  function noiseSource(at, end) {
    const node = ctx.createBufferSource();
    node.buffer = noise;
    node.loop = true;
    node.start(at);
    node.stop(end);
    return node;
  }

  function filter(type, freq, q = 0.7) {
    const node = ctx.createBiquadFilter();
    node.type = type;
    node.frequency.value = freq;
    node.Q.value = q;
    return node;
  }

  const voices = {
    pad(e, at, dur, attack = Math.min(1.2, dur / 3)) {
      const lowpass = filter("lowpass", e.cutoff);
      const gain = envelope(ctx, at, attack, (e.level * 0.21) / e.notes.length, dur - attack, 1.6);
      lowpass.connect(gain);
      out(gain, 0.6);
      for (const freq of e.notes)
        for (const cents of [-8, 8]) {
          const node = osc("sawtooth", freq, at, at + dur + 1.7);
          node.detune.value = cents;
          node.connect(lowpass);
        }
    },
    drone(e, at, dur) {
      const gain = envelope(ctx, at, 1.6, e.level * 0.4, dur - 2.6, 1);
      out(gain, 0.4);
      osc("sine", e.freq, at, at + dur + 0.2).connect(gain);
      osc("triangle", e.freq * 2, at, at + dur + 0.2).connect(gain);
    },
    shimmer(e, at, dur) {
      const gain = envelope(ctx, at, dur * 0.6, e.level, 0, dur * 0.4);
      out(gain, 0.9);
      osc("sine", e.freq, at, at + dur + 0.1).connect(gain);
    },
    sub(e, at, dur) {
      const gain = envelope(ctx, at, 0.4, e.level * 0.5, dur - 1, 0.6);
      out(gain, 0);
      osc("sine", e.freq, at, at + dur + 0.1).connect(gain);
    },
    bass(e, at, dur) {
      const lowpass = filter("lowpass", 520);
      const gain = envelope(ctx, at, 0.008, e.level * 0.4, dur * 0.3, 0.16);
      lowpass.connect(gain);
      out(gain, 0);
      osc("triangle", e.freq, at, at + dur + 0.2).connect(lowpass);
      osc("sine", e.freq / 2, at, at + dur + 0.2).connect(lowpass);
    },
    kick(e, at) {
      const gain = envelope(ctx, at, 0.004, e.level * 0.6, 0.02, 0.34);
      out(gain, 0);
      const body = osc("sine", 140, at, at + 0.45);
      body.frequency.exponentialRampToValueAtTime(42, at + 0.12);
      body.connect(gain);
    },
    hat(e, at) {
      const gain = envelope(ctx, at, 0.002, e.level, 0, 0.05);
      const highpass = filter("highpass", 8000);
      highpass.connect(gain);
      out(gain, 0.1);
      noiseSource(at, at + 0.1).connect(highpass);
    },
    riser(e, at, dur) {
      const band = filter("bandpass", 250, 4);
      band.frequency.setValueAtTime(250, at);
      band.frequency.exponentialRampToValueAtTime(7000, at + dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(SILENT, at);
      gain.gain.exponentialRampToValueAtTime(e.level, at + dur);
      gain.gain.linearRampToValueAtTime(SILENT, at + dur + 0.04);
      band.connect(gain);
      out(gain, 0.5);
      noiseSource(at, at + dur + 0.05).connect(band);
      const tone = osc("sine", 180, at, at + dur + 0.05);
      tone.frequency.exponentialRampToValueAtTime(880, at + dur);
      const toneGain = ctx.createGain();
      toneGain.gain.value = 0.25;
      tone.connect(toneGain).connect(gain);
    },
    impact(e, at) {
      const boom = envelope(ctx, at, 0.005, e.level * 0.8, 0.05, 2.2);
      out(boom, 0.35);
      const body = osc("sine", 92, at, at + 2.4);
      body.frequency.exponentialRampToValueAtTime(30, at + 1.1);
      body.connect(boom);
      const lowpass = filter("lowpass", 2200);
      lowpass.frequency.setValueAtTime(2200, at);
      lowpass.frequency.exponentialRampToValueAtTime(180, at + 0.9);
      const burst = envelope(ctx, at, 0.003, e.level * 0.35, 0, 0.9);
      lowpass.connect(burst);
      out(burst, 0.9);
      noiseSource(at, at + 1).connect(lowpass);
    },
    whoosh(e, at, dur) {
      const band = filter("bandpass", 600, 1.2);
      band.frequency.setValueAtTime(600, at);
      band.frequency.exponentialRampToValueAtTime(2600, at + dur * 0.6);
      band.frequency.exponentialRampToValueAtTime(700, at + dur);
      const gain = envelope(ctx, at, dur * 0.6, e.level, 0, dur * 0.4);
      band.connect(gain);
      out(gain, 0.4);
      noiseSource(at, at + dur + 0.05).connect(band);
    },
    tick(e, at) {
      const gain = envelope(ctx, at, 0.002, e.level, 0, 0.07);
      out(gain, 0.3);
      osc("sine", e.freq, at, at + 0.1).connect(gain);
      osc("triangle", e.freq * 2, at, at + 0.06).connect(gain);
    },
    click(e, at) {
      const band = filter("bandpass", 2500, 3);
      const gain = envelope(ctx, at, 0.001, e.level, 0, 0.03);
      band.connect(gain);
      out(gain, 0.2);
      noiseSource(at, at + 0.06).connect(band);
      voices.tick({ freq: 1400, level: e.level * 0.5 }, at);
    },
    chime(e, at) {
      e.notes.forEach((freq, i) => {
        const start = at + i * 0.06;
        for (const [ratio, level] of [
          [1, 1],
          [2.76, 0.3],
          [5.4, 0.08],
        ]) {
          const gain = envelope(ctx, start, 0.004, e.level * level, 0, 2.6 / ratio);
          out(gain, 0.8);
          osc("sine", freq * ratio, start, start + 2.8).connect(gain);
        }
      });
    },
  };

  function pump() {
    const horizon = ctx.currentTime - base + lookahead;
    while (next < events.length && events[next].at < horizon) {
      const e = events[next++];
      voices[e.kind](e, base + e.at, e.dur);
    }
  }

  function stop() {
    clearInterval(timer);
    timer = undefined;
    if (!session) return;
    const { dry, wet } = session;
    const now = ctx.currentTime;
    for (const node of [dry, wet]) {
      node.gain.setTargetAtTime(0, now, 0.03);
      setTimeout(() => node.disconnect(), 400);
    }
    session = undefined;
  }

  return {
    start(filmTime) {
      ensure();
      stop();
      if (!context) ctx.resume();
      session = { dry: ctx.createGain(), wet: ctx.createGain() };
      session.dry.connect(input);
      session.wet.connect(reverb);
      base = ctx.currentTime + 0.05 - filmTime;
      next = events.findIndex((e) => e.at >= filmTime);
      if (next < 0) next = events.length;
      for (const e of events)
        if (e.kind === "pad" && e.at < filmTime && e.at + e.dur > filmTime + 0.4)
          voices.pad(e, base + filmTime, e.at + e.dur - filmTime, 0.3);
      pump();
      timer = setInterval(pump, 40);
    },
    stop,
    dispose() {
      stop();
      if (!context) ctx?.close();
      ctx = undefined;
    },
  };
}
