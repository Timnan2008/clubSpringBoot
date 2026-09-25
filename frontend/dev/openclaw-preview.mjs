// Local UI fixture only. Never forwards requests to the application or production.
import { build } from "esbuild";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const bundle = await build({
  entryPoints: ["frontend/openclaw.jsx"],
  bundle: true,
  write: false,
  outdir: "fixture",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
});
const assets = new Map(
  bundle.outputFiles.map((file) => ["/" + path.basename(file.path), file.contents]),
);
const crest = await readFile("src/main/resources/static/other photo/WFL-crest.svg");
const account = { id: "ui-preview", name: "界面预览", nameEn: "UI preview", role: "teacher" };
const html = `<!doctype html><html><head><meta charset="UTF-8"><title>OpenClaw · 本地界面预览</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/openclaw.css"></head><body class="openclaw-page"><div id="openclaw-root"></div><script src="/openclaw.js"></script></body></html>`;
const simulateChat = process.env.OPENCLAW_PREVIEW_CHAT === "1";
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Preview-Mode", "local-ui-fixture");
  if (simulateChat && url.pathname === "/api/openclaw/chat" && req.method === "POST") {
    for await (const chunk of req) {
      /* Consume the local fixture request only. */
    }
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.write(": local animation preview\n\n");
    setTimeout(
      () =>
        res.end(
          `data: ${JSON.stringify({ delta: "这是本地动画预览，未调用模型，也不会修改校园数据。你可以重新编辑这条消息，或新建对话再次查看落球动画。" })}\n\ndata: [DONE]\n\n`,
        ),
      900,
    );
    return;
  }
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("UI preview does not accept writes.");
    return;
  }
  if (url.pathname === "/api/openclaw/bootstrap") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ connected: simulateChat, account }));
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end("{}");
    return;
  }
  if (assets.has(url.pathname)) {
    res.setHeader("Content-Type", url.pathname.endsWith("css") ? "text/css" : "text/javascript");
    res.end(assets.get(url.pathname));
    return;
  }
  if (url.pathname === "/other%20photo/WFL-crest.svg") {
    res.setHeader("Content-Type", "image/svg+xml");
    res.end(crest);
    return;
  }
  if (url.pathname === "/" || url.pathname === "/page/openclaw") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
    return;
  }
  res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
  res.end(
    '<p>这里只预览 OpenClaw 页面，未连接学校网站。</p><a href="/page/openclaw">返回界面预览</a>',
  );
});
server.listen(Number(process.env.OPENCLAW_PREVIEW_PORT || 8091), "127.0.0.1", () => {
  console.log(
    `OpenClaw UI preview: http://localhost:${server.address().port}/page/openclaw?lang=zh`,
  );
  console.log("Local sample account only. No production requests, uploads or AI calls.");
});
