import { expandLine } from "./assistant-text.mjs";
import { defaultSchema } from "rehype-sanitize";

export const assistantSchema = {
  ...defaultSchema,
  tagNames: [...defaultSchema.tagNames, "details", "summary", "kbd", "mark", "sub", "sup"],
  attributes: { ...defaultSchema.attributes, details: ["open"] },
};

// Normalize model transport escaping outside code; code examples stay literal.
export function normalizeAssistantMarkdown(input) {
  return String(input || "")
    .split(/(`{3,}[\s\S]*?(?:`{3,}|$)|~{3,}[\s\S]*?(?:~{3,}|$)|`+[^`\n]*`+)/g)
    .map((part, index) => {
      if (index % 2) return part;
      let text = part;
      for (let pass = 0; pass < 2; pass++)
        text = text.replace(
          /&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos|nbsp);/gi,
          (full, number, name) => {
            if (!number)
              return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[
                name.toLowerCase()
              ];
            const code =
              number[0].toLowerCase() === "x" ? parseInt(number.slice(1), 16) : Number(number);
            return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : full;
          },
        );
      return text
        .replace(/\\(?=[<>*#_~])/g, "")
        .replace(/<\\\//g, "</")
        .split("\n")
        .flatMap(expandLine)
        .join("\n")
        .replace(/(^|\s)(\/page\/wall\?post=[0-9a-fA-F-]{36})/g, "$1[查看帖子]($2)");
    })
    .join("");
}
