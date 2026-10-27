// Entirely local fixtures. No model calls and no production requests.
import { build } from "esbuild";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
export async function startArtifactsPreview(port = 0, { background = false, live = false } = {}) {
  const bundle = await build({
    entryPoints: ["frontend/openclaw.jsx"],
    bundle: true,
    write: false,
    outdir: "fixture",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const assets = new Map(bundle.outputFiles.map((f) => ["/" + path.basename(f.path), f.contents]));
  const file = {
    name: "Codecraft-Welcome-Plan.docx",
    href: "/api/openclaw/files/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  };
  let history = {
    saved: true,
    resetAt: 0,
    updatedAt: Date.now(),
    activeId: "11111111-1111-1111-1111-111111111111",
    history: [
      {
        id: "11111111-1111-1111-1111-111111111111",
        title: "编程社迎新计划",
        messages: [
          { role: "user", content: "准备编程社迎新计划，并加入我的日历。" },
          {
            role: "assistant",
            content:
              "已整理一份 45 分钟的迎新活动方案，包含破冰、编程演示与组队环节，并加入你的日历。",
            approvals: [
              {
                id: "sample-approved",
                name: "add_personal_event",
                argument: "编程社迎新会 · 周五 16:30",
                status: "approved",
              },
            ],
            files: [file],
            outcome: "completed",
          },
        ],
      },
    ],
  };
  const jobs = new Map();
  const observers = new Set();
  const push = (name, data) => { for (const response of observers) response.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`); };
  const requests = [];
  let stream;
  let failApproval = false;
  let expired = false;
  let mode = "approval";
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    requests.push({ method: req.method, path: url.pathname });
    const json = (data, status = 200) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };
    if (url.pathname === "/api/openclaw/bootstrap")
      return json({
        connected: true,
        background,
        token: "fixture-token",
        account: { id: "artifact-preview", name: "界面预览", role: "admin" },
      });
    if (url.pathname === "/api/openclaw/history") {
      if (req.method === "PUT") {
        let raw = "";
        for await (const c of req) raw += c;
        history = { ...JSON.parse(raw), saved: true };
      }
      return json(history);
    }
    if (url.pathname === file.href) {
      if (req.method === "DELETE") return json({ ok: true });
      res.writeHead(200, {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Length": "18432",
      });
      return res.end(req.method === "HEAD" ? undefined : Buffer.alloc(18432));
    }
    if (url.pathname === "/other") {
      res.setHeader("Content-Type", "text/html;charset=utf-8");
      res.end("<h1>校园墙</h1>");
      return;
    }
    if (url.pathname === "/api/openclaw/runs/stream") {
      if (!live) return json({}, 404);
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
      res.write(": connected\n\n");
      observers.add(res);
      for (const entry of jobs.values()) res.write(`event: snapshot\ndata: ${JSON.stringify(entry)}\n\n`);
      req.on("close", () => observers.delete(res));
      return;
    }
    if (background && url.pathname === "/api/openclaw/runs") {
      if (req.method === "POST") {
        let raw = "";
        for await (const part of req) raw += part;
        const body = JSON.parse(raw),
          id = body.request.conversationId;
        const entry = {
          id,
          runId: body.runId,
          runVersion: 1,
          startedAt: Date.now(),
          working: true,
          title: body.request.text,
          messages: body.messages,
          calls: [],
          stopped: false,
        };
        const answer = entry.messages.at(-1);
        answer.thinking = "正在后台核对资料";
        answer.tasks = [{ id: "work", label: "核对资料", status: "running" }];
        if (mode === "background-approval") {
          entry.approval = {
            id: crypto.randomUUID(),
            name: "write_document",
            argument: "保存计划书",
          };
          entry.awaiting = true;
        }
        jobs.set(id, entry);
        return json(entry);
      }
      return json({ runs: [...jobs.values()] });
    }
    if (background && url.pathname.startsWith("/api/openclaw/runs/")) {
      const id = url.pathname.split("/")[4],
        entry = jobs.get(id);
      if (req.method === "DELETE") {
        jobs.delete(id);
        return json({ ok: true });
      }
      if (url.pathname.endsWith("/stop") && entry) {
        entry.working = false;
        entry.stopped = true;
        entry.runVersion++;
        entry.messages.at(-1).tasks[0].status = "cancelled";
        return json(entry);
      }
      return json({}, 404);
    }
    if (background && url.pathname === "/api/openclaw/approve") {
      let raw = "";
      for await (const part of req) raw += part;
      const body = JSON.parse(raw);
      const entry = [...jobs.values()].find((entry) => entry.approval?.id === body.id);
      if (!entry) return json({ ok: false });
      const answer = entry.messages.at(-1);
      answer.approvals = [{ ...entry.approval, status: body.approved ? "approved" : "denied" }];
      delete entry.approval;
      entry.awaiting = false;
      entry.working = false;
      entry.runVersion++;
      answer.content = body.approved ? "已按批准保存计划书" : "已拒绝写入";
      answer.outcome = "completed";
      answer.tasks[0].status = "done";
      return json({ ok: true });
    }
    if (url.pathname === "/api/openclaw/chat") {
      for await (const c of req) {
      }
      stream = res;
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      if (mode !== "approval") {
        res.write(
          `data: ${JSON.stringify({ reasoning: "正在核对资料", tasks: [{ id: "lookup", label: "核对资料", status: "running" }] })}\n\n`,
        );
        if (mode === "done-open") res.write('data: {"delta":"已经完成"}\n\ndata: [DONE]\n\n');
        if (mode === "disconnect") res.end();
        return;
      }
      res.write(
        `data: ${JSON.stringify({ approval: { id: crypto.randomUUID(), name: "add_personal_event", argument: "编程社迎新会 · 周五 16:30" } })}\n\n`,
      );
      return;
    }
    if (url.pathname === "/api/openclaw/approve") {
      let raw = "";
      for await (const c of req) raw += c;
      const { approved } = JSON.parse(raw);
      json({ ok: !failApproval && !expired }, failApproval ? 503 : 200);
      if (stream) {
        stream.end(
          `data: ${JSON.stringify({ delta: approved ? "操作已批准。这是本地界面演示，不会修改真实日历。" : "已拒绝，不会添加日程。" })}\n\ndata: [DONE]\n\n`,
        );
        stream = null;
      }
      return;
    }
    if (url.pathname.startsWith("/api/")) return json({}, 401);
    if (assets.has(url.pathname)) {
      res.setHeader("Content-Type", url.pathname.endsWith("css") ? "text/css" : "text/javascript");
      return res.end(assets.get(url.pathname));
    }
    if (url.pathname === "/other%20photo/WFL-crest.svg") {
      res.setHeader("Content-Type", "image/svg+xml");
      return res.end(await readFile("src/main/resources/static/other photo/WFL-crest.svg"));
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(
      '<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agent 批准与附件 · 本地预览</title><link rel="stylesheet" href="/openclaw.css"><body class="openclaw-page"><div id="openclaw-root"></div><script src="/openclaw.js"></script></body></html>',
    );
  });
  await new Promise((r) => server.listen(port, "127.0.0.1", r));
  return {
    server,
    requests,
    jobs,
    appendThinking: (id, text) => {
      const entry = jobs.get(id), fromVersion = entry.runVersion;
      entry.messages.at(-1).thinking += text;
      entry.runVersion++;
      push("text", { id, runId: entry.runId, fromVersion, runVersion: entry.runVersion, content: "", thinking: text });
    },
    closeObservers: () => { for (const response of observers) response.end(); observers.clear(); },
    observerCount: () => observers.size,
    completeBackground: (id, text = "后台已完成计划书") => {
      const entry = jobs.get(id);
      entry.working = false;
      entry.endedAt = Date.now();
      entry.runVersion++;
      entry.messages.at(-1).content = text;
      entry.messages.at(-1).outcome = "completed";
      entry.messages.at(-1).tasks[0].status = "done";
      push("snapshot", entry);
    },
    setMode: (value) => {
      mode = value;
    },
    failApproval: () => {
      failApproval = true;
    },
    expireApproval: () => {
      failApproval = false;
      expired = true;
    },
    url: `http://localhost:${server.address().port}/page/openclaw?lang=zh`,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const preview = await startArtifactsPreview(Number(process.env.PORT || 8112));
  console.log(preview.url);
}
