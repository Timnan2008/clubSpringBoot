const { PRODUCTION, LOCAL } = require("./policy.cjs");
// Only the trusted main process constructs request provenance for its fixed campus origin.
// Renderer IPC still exposes operation names, never URLs, cookies, tokens or headers.
function createCampusTransport(getSession, getBase) {
  return (route, options = {}) => {
    const origin = getBase();
    if (![PRODUCTION, LOCAL].includes(origin)) throw Error("无效校园服务地址");
    const target = new URL(route, origin);
    if (
      typeof route !== "string" ||
      !route.startsWith("/") ||
      route.startsWith("//") ||
      target.origin !== origin ||
      !/^\/(api|page)\//.test(target.pathname) ||
      target.hash
    )
      throw Error("无效校园请求");
    const headers = new Headers(options.headers);
    headers.set("Origin", origin);
    headers.set("Referer", origin + "/");
    headers.set("Sec-Fetch-Site", "same-origin");
    return getSession().fetch(target.href, { ...options, headers, redirect: "error" });
  };
}
module.exports = { createCampusTransport };
