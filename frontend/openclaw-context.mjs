// Only the retained visible branch is model context. Never send discarded answers,
// hidden reasoning, tool state or UI metadata as a new conversation instruction.
export function conversationContext(messages = []) {
  const result = [];
  let remaining = 60000;
  for (const message of messages.slice(-40).reverse()) {
    if (!["user", "assistant"].includes(message?.role)) continue;
    const content = String(message.content || "").trim();
    if (!content) continue;
    const clipped = content.slice(0, Math.min(16000, remaining));
    if (!clipped) break;
    result.unshift({ role: message.role, content: clipped });
    remaining -= clipped.length;
  }
  while (result[0]?.role === "assistant") result.shift();
  return result;
}
