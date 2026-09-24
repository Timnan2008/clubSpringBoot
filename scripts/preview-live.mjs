/** Local UI assets with the real application server for pages, sessions and APIs.
 * Binds only to loopback. Never stores account credentials or response bodies.
 * Run npm run build, then node scripts/preview-live.mjs.
 */
import http from "node:http";
import { openClawPreview } from "./preview-openclaw.mjs";
import https from "node:https";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream";

const upstream = new URL("https://qpwflhsclub.com");
const root = path.resolve(import.meta.dirname, "../src/main/resources/static");
const port = Number(process.env.PORT || 8088);
// Explicit, loopback-only UI identity. It never grants access to production data.
const previewAccount =
  process.env.PREVIEW_ACCOUNT === "teacher"
    ? {
        id: "local-ui-teacher",
        name: "本地测试老师",
        nameEn: "Local test teacher",
        role: "teacher",
      }
    : null;
const hopHeaders = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];
const cleanHeaders = (source) => {
  const headers = { ...source };
  const connection = String(headers.connection || "")
    .split(",")
    .map((s) => s.trim().toLowerCase());
  for (const key of [...hopHeaders, ...connection]) delete headers[key];
  return headers;
};
const server = http.createServer(async (req, res) => {
  const host = req.headers.host || "";
  if (!["localhost", "127.0.0.1"].some((name) => host === `${name}:${port}`)) {
    res.writeHead(403);
    res.end("Loopback preview only");
    return;
  }
  let url;
  try {
    url = new URL(req.url, `http://${host}`);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  if (url.host !== host) {
    res.writeHead(400);
    res.end();
    return;
  }
  if (previewAccount && !["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("本地测试账号仅用于界面预览，不能修改学校数据。");
    return;
  }
  const previewProfile = previewAccount
    ? async () =>
        new Response(JSON.stringify({ account: previewAccount }), {
          headers: { "Content-Type": "application/json" },
        })
    : undefined;
  if (await openClawPreview(req, res, url, upstream, previewProfile)) return;
  if (previewAccount && url.pathname.startsWith("/api/")) {
    const isProfile = url.pathname === "/api/campus-social/me";
    res.writeHead(isProfile ? 200 : 403, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Preview-Source": "local-test-account",
    });
    res.end(
      req.method === "HEAD"
        ? undefined
        : JSON.stringify(
            isProfile ? { account: previewAccount } : { message: "本地测试账号未连接学校数据" },
          ),
    );
    return;
  }
  const localAsset = /^\/javascript\/(ui|darkveil)\//.test(url.pathname);
  if (localAsset && ["GET", "HEAD"].includes(req.method)) {
    let filename;
    try {
      filename = path.resolve(root, "." + decodeURIComponent(url.pathname));
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    if (!filename.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      const info = await stat(filename);
      if (!info.isFile()) throw Error("Not a file");
      const type = filename.endsWith(".css")
        ? "text/css"
        : filename.endsWith(".js")
          ? "text/javascript"
          : "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": info.size,
        "Cache-Control": "no-store",
        "X-Preview-Source": "local-ui",
      });
      if (req.method === "HEAD") res.end();
      else pipeline(createReadStream(filename), res, () => {});
    } catch {
      res.writeHead(404);
      res.end("Build the frontend with npm run build");
    }
    return;
  }
  const headers = cleanHeaders(req.headers);
  if (previewAccount) {
    delete headers.cookie;
    delete headers.authorization;
  }
  headers.host = upstream.host;
  headers["accept-encoding"] = "identity";
  delete headers["x-forwarded-for"];
  delete headers["x-forwarded-host"];
  delete headers["x-forwarded-proto"];
  // The browser's same-origin requests remain same-origin at the application server.
  if (headers.origin === `http://${host}`) headers.origin = upstream.origin;
  if (headers.referer?.startsWith(`http://${host}/`))
    headers.referer = headers.referer.replace(`http://${host}`, upstream.origin);
  const remote = https.request(
    new URL(url.pathname + url.search, upstream),
    { method: req.method, headers },
    (response) => {
      const out = cleanHeaders(response.headers);
      if (previewAccount) delete out["set-cookie"];
      out["cache-control"] = "no-store";
      out["x-preview-source"] = "live-server";
      if (out.location?.startsWith(upstream.origin))
        out.location = out.location.replace(upstream.origin, `http://${host}`);
      if (out["set-cookie"])
        out["set-cookie"] = out["set-cookie"].map((cookie) =>
          cookie.replace(/;\s*Domain=[^;]+/gi, "").replace(/;\s*Secure(?=;|$)/gi, ""),
        );
      const html = String(out["content-type"] || "").includes("text/html") && req.method !== "HEAD";
      if (html) {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          // Upstream templates preload older build hashes; current entrypoints load their own chunks.
          const body = Buffer.concat(chunks)
            .toString("utf8")
            .replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, "");
          delete out["content-length"];
          delete out.etag;
          delete out["content-encoding"];
          res.writeHead(response.statusCode, out);
          res.end(body);
        });
        response.on("error", () => res.destroy());
      } else {
        res.writeHead(response.statusCode, out);
        pipeline(response, res, () => {});
      }
    },
  );
  remote.setTimeout(60000, () => remote.destroy(Error("Upstream timeout")));
  remote.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("服务器暂时无法连接，请刷新重试。");
  });
  req.on("aborted", () => remote.destroy());
  pipeline(req, remote, () => {});
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Preview: http://localhost:${port} — local frontend / ${upstream.origin} backend`);
  if (previewAccount)
    console.log("Local test teacher: production cookies stripped, APIs and writes blocked.");
});
