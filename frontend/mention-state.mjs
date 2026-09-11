// Completed mentions are ranges, not text to rediscover on every keystroke.
export function mentionQuery(text, caret, mentions = []) {
  if (mentions.some(m => caret > m.start && caret <= m.end)) return null;
  const before = text.slice(0, caret);
  const match = before.match(/(?:^|[\s(（])@([^@\n]{0,40})$/u);
  if (!match) return null;
  const start = caret - match[1].length - 1;
  if (mentions.some(m => start < m.end && caret > m.start)) return null;
  return {start, end: caret, text: match[1]};
}

export function editMentions(previous, next, mentions = []) {
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++;
  let tail = 0;
  while (tail < previous.length - start && tail < next.length - start && previous[previous.length - 1 - tail] === next[next.length - 1 - tail]) tail++;
  const end = previous.length - tail, delta = next.length - previous.length;
  return mentions.filter(m => m.end <= start || m.start >= end).map(m => m.start >= end ? {...m, start: m.start + delta, end: m.end + delta} : m);
}

export function insertMention(value, query, mentions, label, account) {
  const next = value.slice(0, query.start) + label + ' ' + value.slice(query.end);
  const delta = label.length + 1 - (query.end - query.start);
  return {value: next, caret: query.start + label.length + 1, mentions: [
    ...mentions.filter(m => m.end <= query.start || m.start >= query.end).map(m => m.start >= query.end ? {...m, start: m.start + delta, end: m.end + delta} : m),
    {start: query.start, end: query.start + label.length, account}
  ].sort((a,b) => a.start - b.start)};
}
