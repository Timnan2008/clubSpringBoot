import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { assistantSchema, normalizeAssistantMarkdown } from "./assistant-markdown.mjs";

const components = {
  a: ({ href, children }) => (
    <a
      href={href}
      {...(href?.startsWith("/") || href?.startsWith("#")
        ? {}
        : { target: "_blank", rel: "noreferrer noopener" })}
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="openclaw-table-wrap">
      <table>{children}</table>
    </div>
  ),
  // Render model images as links: no unsolicited third-party image requests.
  img: ({ src, alt }) => (
    <a href={src} target="_blank" rel="noreferrer noopener">
      {alt || "图片"}
    </a>
  ),
};
export default function AssistantText({ text, streaming }) {
  return (
    <div className="openclaw-rich">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, assistantSchema]]}
        components={components}
      >
        {normalizeAssistantMarkdown(text)}
      </Markdown>
      {streaming && <span className="openclaw-stream-caret" aria-hidden="true" />}
    </div>
  );
}
