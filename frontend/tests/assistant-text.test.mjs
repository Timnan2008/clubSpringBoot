import assert from "node:assert/strict";
import test from "node:test";
import { parseAssistant, parseInline } from "../assistant-text.mjs";

test("markdown markers are removed and tables become rows", () => {
  const blocks = parseAssistant(
    [
      "## 待确认",
      "",
      "| 项目 | 取值 |",
      "| --- | --- |",
      "| 社团 | 待定 |",
      "",
      "先看 **44 个社团** 和 `BOOTSTRAP`。",
    ].join("\n"),
  );
  assert.equal(blocks[0].type, "heading");
  assert.equal(blocks[0].text, "待确认");
  assert.equal(blocks[1].type, "table");
  assert.deepEqual(blocks[1].header, ["项目", "取值"]);
  assert.deepEqual(blocks[1].rows, [["社团", "待定"]]);
  assert.equal(blocks[2].type, "paragraph");
  const inline = parseInline(blocks[2].text);
  assert.deepEqual(
    inline.map((part) => part.text),
    ["先看 ", "44 个社团", " 和 ", "BOOTSTRAP", "。"],
  );
  assert.equal(
    inline.some((part) => part.text.includes("*") || part.text.includes("`")),
    false,
  );
});

test("a campus post path becomes a link", () => {
  const parts = parseInline("已发布。查看 /page/wall?post=8a465c93-4d37-479f-a32f-f8335ea7d723。");
  const link = parts.find((part) => part.kind === "link");
  assert.equal(link.href, "/page/wall?post=8a465c93-4d37-479f-a32f-f8335ea7d723");
});

test("a table written on one line is split into rows", () => {
  const blocks = parseAssistant(
    "## 0. 待确认字段 | 项目 | 取值 |---|---|---| 社团 | 待定 | 日期 | 开学后 |",
  );
  const table = blocks.find((block) => block.type === "table");
  assert.ok(table);
  assert.deepEqual(table.header, ["项目", "取值"]);
  assert.deepEqual(table.rows[0], ["社团", "待定"]);
  assert.deepEqual(table.rows[1], ["日期", "开学后"]);
  assert.equal(JSON.stringify(table).includes("|"), false);
});
