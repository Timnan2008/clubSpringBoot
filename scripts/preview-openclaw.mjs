// Local main-site preview only. The production route is owned by OpenClawController.
// Resolve the real school session on every request; never accept a client-supplied role.
import { canUseOpenClaw } from "../frontend/openclaw-access.mjs";
import { readFile } from "node:fs/promises";

export async function openClawPreview(req, res, url, upstream, fetchProfile = fetch) {
  const page = url.pathname === "/page/openclaw";
  if (!page && url.pathname !== "/api/openclaw/bootstrap") return false;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Preview-Source", "local-page-live-session");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return true;
  }
  try {
    const profile = await fetchProfile(new URL("/api/campus-social/me", upstream), {
      headers: { cookie: req.headers.cookie || "", accept: "application/json" },
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    if (profile.status === 401 && page) {
      res.writeHead(302, { Location: "/page/user/login?next=%2Fpage%2Fopenclaw" });
      res.end();
      return true;
    }
    if (!profile.ok) {
      res.writeHead([401, 403].includes(profile.status) ? profile.status : 503);
      res.end();
      return true;
    }
    const { account } = await profile.json();
    if (!canUseOpenClaw(account)) {
      res.writeHead(403);
      res.end();
      return true;
    }
    const body = page
      ? await readFile(
          new URL("../src/main/resources/templates/page/openclaw.html", import.meta.url),
          "utf8",
        )
      : JSON.stringify({ connected: false, account });
    res.writeHead(200, { "Content-Type": page ? "text/html; charset=utf-8" : "application/json" });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(503);
    res.end();
  }
  return true;
}
