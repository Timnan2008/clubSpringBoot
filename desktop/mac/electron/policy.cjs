const PRODUCTION = "https://qpwflhsclub.com";
const LOCAL = "http://127.0.0.1:8088";
const paths = Object.freeze({
  clubs: "/api/club/all",
  me: "/api/campus-social/me",
  mine: "/api/campus-social/me/clubs",
  notifications: "/api/campus-social/notifications",
  inbox: "/api/campus-social/inbox",
  events: "/api/campus-social/events",
  announcements: "/page/index",
});
function resourcePath(key, input = {}) {
  if (Object.hasOwn(paths, key)) return paths[key];
  if (key === "calendar") {
    const valid = (s) =>
      typeof s === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(s) &&
      Number.isFinite(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s;
    if (!valid(input.from) || !valid(input.to)) throw Error("无效日期");
    const days = (Date.parse(input.to) - Date.parse(input.from)) / 86400000;
    if (days <= 0 || days > 93) throw Error("日期范围过大");
    return `/api/campus-social/calendar?from=${input.from}&to=${input.to}`;
  }
  throw Error("不支持的数据请求");
}
function servicePath(path) {
  if (
    typeof path !== "string" ||
    path.length > 500 ||
    !/^\/page\/[a-zA-Z0-9\-/?=&%_.]+$/.test(path) ||
    path.includes("..") ||
    path.includes("//")
  )
    throw Error("不支持的页面");
  let decoded;
  try {
    decoded = decodeURIComponent(new URL(path, PRODUCTION).pathname);
  } catch {
    throw Error("不支持的页面");
  }
  if (
    !decoded.startsWith("/page/") ||
    decoded.includes("..") ||
    decoded.includes("//") ||
    decoded.includes("\\")
  )
    throw Error("不支持的页面");
  return path;
}
function allowedRemote(value, base) {
  try {
    return new URL(value).origin === base;
  } catch {
    return false;
  }
}
module.exports = { PRODUCTION, LOCAL, resourcePath, servicePath, allowedRemote };
