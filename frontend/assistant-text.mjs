/** Turns assistant markdown into blocks. Markers such as ** and | are not kept as text. */

const SEPARATOR = /\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?/;

function splitRow(line) {
  let text = String(line || "").trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|")) text = text.slice(0, -1);
  return text.split("|").map((cell) => cell.trim());
}

function isSeparator(line) {
  const cells = splitRow(line);
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isRow(line) {
  return String(line).includes("|") && splitRow(line).length >= 2 && !isSeparator(line);
}

export function expandLine(line) {
  const match = String(line).match(SEPARATOR);
  if (!match || match.index == null) return [line];
  const before = line.slice(0, match.index).trim();
  const after = line.slice(match.index + match[0].length).trim();
  if (!before || !after) return [line];
  let columns = splitRow(match[0]).filter(Boolean).length;
  if (columns < 2) return [line];
  const beforeCells = splitRow(before);
  let header = beforeCells.slice(-columns);
  let lead = beforeCells
    .slice(0, Math.max(0, beforeCells.length - columns))
    .join(" ")
    .trim();
  if (/^#{1,3}\s+/.test(header[0]) && header.length >= 3) {
    lead = header.shift();
    columns = header.length;
  }
  const body = splitRow(after);
  const lines = [];
  if (lead) lines.push(lead);
  lines.push(`| ${header.join(" | ")} |`);
  lines.push(`| ${Array.from({ length: columns }, () => "---").join(" | ")} |`);
  for (let index = 0; index < body.length; index += columns) {
    const row = body.slice(index, index + columns);
    while (row.length < columns) row.push("");
    if (row.some((cell) => cell)) lines.push(`| ${row.join(" | ")} |`);
  }
  return lines;
}

export function parseInline(text) {
  const source = String(text || "").replace(/(\*\*|__|`)+\s*$/u, "");
  const pattern =
    /`([^`\n]+)`|\*\*([^*]+)\*\*|__([^_]+)__|(?<![\w*])\*([^*\n]+)\*(?![\w*])|\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)|(\/page\/wall\?post=[0-9a-fA-F-]{36})/g;
  const parts = [];
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    if (match.index > cursor) parts.push({ kind: "text", text: source.slice(cursor, match.index) });
    if (match[1] != null) parts.push({ kind: "code", text: match[1] });
    else if (match[2] != null || match[3] != null)
      parts.push({ kind: "strong", text: match[2] || match[3] });
    else if (match[4] != null) parts.push({ kind: "em", text: match[4] });
    else if (match[5] != null) parts.push({ kind: "link", text: match[5], href: match[6] });
    else parts.push({ kind: "link", text: match[7], href: match[7] });
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) parts.push({ kind: "text", text: source.slice(cursor) });
  return parts
    .map((part) =>
      part.kind === "text" ? { ...part, text: part.text.replace(/\*\*|__|`/g, "") } : part,
    )
    .filter((part) => part.text);
}

function paragraph(lines) {
  return { type: "paragraph", text: lines.join("\n").trim() };
}

export function parseAssistant(source) {
  const lines = String(source || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .flatMap(expandLine);
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (line.trim().startsWith("```")) {
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2].replace(/^#+\s*/, ""),
      });
      index += 1;
      continue;
    }
    if (isRow(line) && (isSeparator(lines[index + 1] || "") || isRow(lines[index + 1] || ""))) {
      const header = splitRow(line);
      const rows = [];
      index += 1;
      if (isSeparator(lines[index] || "")) index += 1;
      while (index < lines.length && isRow(lines[index])) {
        const row = splitRow(lines[index]);
        while (row.length < header.length) row.push("");
        rows.push(row.slice(0, header.length));
        index += 1;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }
    const unordered = /^[-*]\s+(.+)$/.exec(line.trim());
    const ordered = /^\d+[.)]\s+(.+)$/.exec(line.trim());
    if (unordered || ordered) {
      const items = [];
      const kind = unordered ? "unordered" : "ordered";
      while (index < lines.length) {
        const item = (kind === "unordered" ? /^[-*]\s+(.+)$/ : /^\d+[.)]\s+(.+)$/).exec(
          lines[index].trim(),
        );
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      blocks.push({ type: "list", ordered: kind === "ordered", items });
      continue;
    }
    const text = [];
    while (index < lines.length && lines[index].trim()) {
      const next = lines[index];
      if (
        next.trim().startsWith("```") ||
        /^(#{1,3})\s+/.test(next.trim()) ||
        /^[-*]\s+/.test(next.trim()) ||
        /^\d+[.)]\s+/.test(next.trim()) ||
        (isRow(next) && (isSeparator(lines[index + 1] || "") || isRow(lines[index + 1] || "")))
      ) {
        break;
      }
      text.push(next.trim());
      index += 1;
    }
    if (text.length) blocks.push(paragraph(text));
    else index += 1;
  }
  return blocks;
}
