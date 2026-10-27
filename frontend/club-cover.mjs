// Generated covers for clubs that still use the school crest as their logo.
// Pure data only: catalog (React) and the homepage (DOM) render the same parts.

const placeholder = /WFL-(logo\.png|crest\.svg)/i;
export const isPlaceholderLogo = (src) => !src || placeholder.test(String(src));

// Each category owns a hue family; a club's id picks its place inside that family,
// so neighbouring covers differ without leaving the category's mood.
const families = {
  creativity: [352, 378],
  activity: [146, 174],
  service: [194, 218],
  study: [246, 278],
};
export const categoryHue = (kind) => {
  const [from, to] = families[kind] || [282, 300];
  return ((from + to) / 2) % 360;
};
const seals = { creativity: "创", activity: "动", service: "服", study: "学" };

function hash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

const trims = [/^(上海)?青浦世外(高中|高级中学)?/, /(社团|俱乐部|校队|社|队)$/];
// The artwork is the club's leading character: a Chinese glyph, or a short Latin acronym.
export function coverGlyph(name) {
  const full = String(name || "").trim();
  let text = full;
  for (const trim of trims) text = text.replace(trim, "");
  text = text.trim() || full;
  const latin = text.match(/^[A-Za-z]+/);
  if (latin) return latin[0].length <= 3 ? latin[0].toUpperCase() : latin[0][0].toUpperCase();
  return Array.from(text)[0] || "社";
}

// The glyph follows the name the visitor reads, so English pages get a Latin monogram.
export function coverParts(club, name) {
  const seed = hash(String(club?.id ?? club?.clubName ?? ""));
  const [from, to] = families[club?.clubClass] || [282, 300];
  const glyph = coverGlyph(name || club?.clubName || club?.clubNameEn);
  return {
    hue: Math.round(from + ((seed % 997) / 996) * (to - from)) % 360,
    pattern: seed % 3,
    glyph,
    script: /^[A-Za-z]/.test(glyph) ? "latin" : "cjk",
    seal: seals[club?.clubClass] || "社",
    number: club?.id == null ? "" : "Nº " + String(club.id).padStart(2, "0"),
    inscription: /[\u3400-\u9fff]/.test(club?.clubName || "") ? club.clubName : "",
  };
}
