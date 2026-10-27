import { DURATION } from "../launch-cues.mjs";
import { createScore } from "../launch-score.js";

function wav(buffer) {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const view = new DataView(new ArrayBuffer(44 + frames * channels * 2));
  const text = (offset, value) =>
    [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + frames * channels * 2, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, frames * channels * 2, true);
  const data = [...Array(channels)].map((_, c) => buffer.getChannelData(c));
  for (let i = 0, o = 44; i < frames; i++)
    for (let c = 0; c < channels; c++, o += 2)
      view.setInt16(o, Math.max(-1, Math.min(1, data[c][i])) * 0x7fff, true);
  return new Uint8Array(view.buffer);
}

/** Renders the whole score offline and reports per-second peak and RMS levels. */
window.renderScore = async () => {
  const rate = 44100;
  const ctx = new OfflineAudioContext(2, rate * (DURATION + 1), rate);
  const score = createScore({ context: ctx, lookahead: DURATION + 2 });
  score.start(0);
  const buffer = await ctx.startRendering();
  score.dispose();
  const left = buffer.getChannelData(0);
  const seconds = [];
  for (let s = 0; s < DURATION; s++) {
    let peak = 0;
    let sum = 0;
    for (let i = s * rate; i < (s + 1) * rate; i++) {
      peak = Math.max(peak, Math.abs(left[i]));
      sum += left[i] * left[i];
    }
    seconds.push({ peak, rms: Math.sqrt(sum / rate) });
  }
  let binary = "";
  const bytes = wav(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { seconds, wav: btoa(binary) };
};
