const statuses = new Set(["pending", "running", "done", "failed", "cancelled"]);
export function mergeTasks(previous = [], incoming = []) {
  const merged = previous.map((item) => ({ ...item }));
  for (const task of incoming) {
    if (!task?.id || !task.label || !statuses.has(task.status)) continue;
    const next = {
      id: String(task.id).slice(0, 80),
      label: String(task.label).slice(0, 240),
      status: task.status,
    };
    const index = merged.findIndex((item) => item.id === next.id);
    if (index < 0) merged.push(next);
    else merged[index] = next;
  }
  return merged.slice(0, 20);
}
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
};
function key(call) {
  try {
    return call.name + JSON.stringify(canonical(JSON.parse(call.argument || "{}")));
  } catch {
    return null;
  } // Truncated arguments cannot prove that two actions match.
}
export function resolvedCalls(calls = [], completed = false) {
  const hasReadableSource = calls.some(
    (call) => call.name === "web_fetch" && call.status === "done",
  );
  return calls
    .filter((call) => call.name !== "update_plan")
    .map((call, index) => {
      const retry =
        call.status === "error" &&
        key(call) !== null &&
        calls.slice(index + 1).find((next) => next.status === "done" && key(next) === key(call));
      if (retry) return { ...call, recovered: true, recoveredBy: retry.id };
      return completed && hasReadableSource && call.name === "web_fetch" && call.status === "error"
        ? { ...call, unavailable: true }
        : call;
    });
}
export const isInterruptedConversation = (live, nextId) =>
  Boolean(live?.id && live.id !== nextId && live.working);
export function conversationFailed(entry) {
  const last = [...(entry.messages || [])]
    .reverse()
    .find((message) => message.role === "assistant");
  if (last?.outcome === "completed") return false;
  // A file already delivered to the user remains a result even if the stream
  // disconnects while the model is composing its closing sentence.
  if (last?.delivered || last?.files?.length) return false;
  const calls = resolvedCalls(entry.calls);
  if (
    last?.content &&
    calls.some((call) => call.recovered) &&
    calls.every((call) => call.status === "done" || call.recovered)
  )
    return false;
  if (last?.outcome === "failed") return true;
  return Boolean(entry.failed);
}
