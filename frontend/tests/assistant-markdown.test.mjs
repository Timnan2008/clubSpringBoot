import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { normalizeAssistantMarkdown, assistantSchema } from "../assistant-markdown.mjs";
const render = (text) =>
  renderToStaticMarkup(
    createElement(Markdown, {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeRaw, [rehypeSanitize, assistantSchema]],
      children: normalizeAssistantMarkdown(text),
    }),
  );
test("HTML, escaped details and encoded or nested Markdown are interpreted", () => {
  const html = render(
    "\\<details>\n<summary>资料</summary>\n\n**加粗与 *斜体*** 和 &#x2a;&#x2a;重点&#x2a;&#x2a;\n\n\\</details>\n</details>",
  );
  assert.match(html, /<details>/);
  assert.match(html, /<summary>资料<\/summary>/);
  assert.match(html, /<strong>加粗与 <em>斜体<\/em><\/strong>/);
  assert.match(html, /<strong>重点<\/strong>/);
  assert.doesNotMatch(html, /&lt;\/details|\*\*/);
});
test("tables, checklists and strikethrough render normally", () => {
  const html = render(
    "| 标题 | 数量 |\n| --- | --- |\n| 已核对 | 3 |\n\n- [x] 完成\n- [ ] 待办\n\n~~取消~~",
  );
  assert.match(html, /<table>/);
  assert.match(html, /checked=""/);
  assert.match(html, /<del>取消<\/del>/);
});
test("code remains literal and untrusted HTML cannot execute or inject CSS", () => {
  const html = render(
    '```html\n</details> **literal**\n```\n\n<img src=x onerror=alert(1)><script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(1)">click</a><div style="position:fixed">text</div>',
  );
  assert.match(html, /&lt;\/details&gt; \*\*literal\*\*/);
  assert.doesNotMatch(html, /<script|onerror|onclick|javascript:|position:fixed/);
});
