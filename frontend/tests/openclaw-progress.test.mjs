import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeTasks,
  resolvedCalls,
  isInterruptedConversation,
  conversationFailed,
} from "../openclaw-progress.mjs";

test("task progress retains completed items when later updates omit them", () => {
  const initial = mergeTasks(
    [],
    [
      { id: "read", label: "读资料", status: "running" },
      { id: "write", label: "写总结", status: "pending" },
    ],
  );
  const complete = mergeTasks(initial, [{ id: "read", label: "读资料", status: "done" }]);
  const next = mergeTasks(complete, [{ id: "write", label: "写总结", status: "running" }]);
  assert.equal(next.length, 2);
  assert.equal(next[0].status, "done");
  assert.equal(next[1].status, "running");
});
test("new conversations never mark a completed previous conversation as failed", () => {
  assert.equal(isInterruptedConversation({ id: "a", working: false }, "b"), false);
  assert.equal(isInterruptedConversation({ id: "a", working: true }, "b"), true);
  assert.equal(
    conversationFailed({
      failed: true,
      messages: [{ role: "assistant", content: "完成", outcome: "completed" }],
    }),
    false,
  );
  assert.equal(
    conversationFailed({
      failed: false,
      messages: [{ role: "assistant", content: "部分结果", outcome: "failed" }],
    }),
    true,
  );
  assert.equal(
    conversationFailed({
      failed: true,
      messages: [
        {
          role: "assistant",
          content: "文件已生成",
          outcome: "failed",
          files: [
            { name: "plan.docx", href: "/api/openclaw/files/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" },
          ],
        },
      ],
    }),
    false,
  );
  assert.equal(
    conversationFailed({
      failed: true,
      messages: [
        { role: "assistant", content: "文件已生成", outcome: "failed", delivered: true, files: [] },
      ],
    }),
    false,
  );
});
test("recovery only applies to successful retries of the same tool and arguments", () => {
  const calls = [
    { id: "a", name: "read_document", argument: '{"clubId":1,"id":"x"}', status: "error" },
    { id: "b", name: "read_document", argument: '{"id":"y","clubId":1}', status: "done" },
  ];
  assert.equal(resolvedCalls(calls)[0].recovered, undefined);
  calls.push({ id: "c", name: "read_document", argument: '{"id":"x","clubId":1}', status: "done" });
  assert.equal(resolvedCalls(calls)[0].recoveredBy, "c");
  assert.equal(calls[0].status, "error");
});
test("completed research keeps unreadable sources neutral without pretending a retry succeeded", () => {
  const calls = [
    { id: "bad", name: "web_fetch", argument: '{"url":"https://a.test"}', status: "error" },
    { id: "good", name: "web_fetch", argument: '{"url":"https://b.test"}', status: "done" },
  ];
  assert.equal(resolvedCalls(calls, true)[0].unavailable, true);
  assert.equal(resolvedCalls(calls, true)[0].recovered, undefined);
  assert.equal(resolvedCalls(calls, false)[0].unavailable, undefined);
  assert.equal(resolvedCalls(calls.slice(0, 1), true)[0].unavailable, undefined);
  assert.equal(calls[0].status, "error");
});
