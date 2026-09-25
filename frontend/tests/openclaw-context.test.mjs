import test from "node:test";
import assert from "node:assert/strict";
import { conversationContext } from "../openclaw-context.mjs";

test("regeneration and edit branches exclude replaced answers and later turns", () => {
  const messages = [
    { role: "user", content: "earlier question" },
    { role: "assistant", content: "earlier answer", thinking: "private trace" },
    { role: "user", content: "question to retry" },
    { role: "assistant", content: "old answer" },
    { role: "user", content: "later question" },
    { role: "assistant", content: "later answer" },
  ];
  assert.deepEqual(conversationContext(messages.slice(0, 2)), [
    { role: "user", content: "earlier question" },
    { role: "assistant", content: "earlier answer" },
  ]);
  assert.deepEqual(conversationContext([]), []);
});

test("context includes only bounded text roles", () => {
  const context = conversationContext([
    { role: "system", content: "bad" },
    ...Array.from({ length: 80 }, (_, i) => ({
      role: i % 2 ? "assistant" : "user",
      content: "x".repeat(20000),
    })),
  ]);
  assert.ok(context.length <= 40);
  assert.equal(context[0].role, "user");
  assert.ok(context.every((message) => message.content.length <= 16000));
  assert.ok(context.reduce((sum, m) => sum + m.content.length, 0) <= 60000);
});
