const PRODUCTION = "https://qpwflhsclub.com";
const LOCAL = "http://127.0.0.1:8088";
const fixed = {
  clubs: "/api/club/all",
  me: "/api/campus-social/me",
  mine: "/api/campus-social/me/clubs",
  notifications: "/api/campus-social/notifications",
  inbox: "/api/campus-social/inbox",
  announcements: "/page/index",
  social: "/api/campus-social",
  workspace: "/api/club-workspace",
  booking: "/api/booking",
  bookings: "/api/booking/mine",
  recovery: "/api/campus-social/keys/recovery",
};
const positive = (value) => {
  if (!/^[1-9]\d{0,8}$/.test(String(value))) throw Error("无效社团或预约编号");
  return String(value);
};
const uuid = (value) => {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(value))
    throw Error("无效记录编号");
  return String(value);
};
const account = (value) => {
  if (!/^[a-f0-9]{64}$/.test(String(value))) throw Error("无效账号编号");
  return value;
};
function resourcePath(key, a = {}) {
  if (Object.hasOwn(fixed, key)) return fixed[key];
  const clubKeys = {
    club: "/api/club/id/",
    join: "/api/campus-social/clubs/",
    members: "/api/club-workspace/",
    requests: "/api/club-workspace/",
    clubWorkspace: "/api/club-workspace/",
  };
  if (Object.hasOwn(clubKeys, key))
    return (
      clubKeys[key] +
      positive(a.id) +
      ({ join: "/join", members: "/members", requests: "/join-requests" }[key] || "")
    );
  if (key === "conversation") return "/api/campus-social/conversations/" + account(a.peer);
  if (key === "key") return "/api/campus-social/keys/" + account(a.id);
  if (key === "replies") return "/api/campus-social/posts/" + uuid(a.id) + "/replies";
  if (key === "users")
    return (
      "/api/campus-social/users?keyword=" +
      encodeURIComponent(String(a.keyword || "").slice(0, 100))
    );
  if (key === "posts")
    return (
      "/api/campus-social/posts?" +
      new URLSearchParams({
        keyword: String(a.keyword || "").slice(0, 100),
        category: String(a.category || ""),
        club: a.club ? positive(a.club) : "0",
        page: String(Math.max(1, Math.min(999, parseInt(a.page) || 1))),
      })
    );
  if (key === "calendar") {
    const valid = (s) =>
      typeof s === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(s) &&
      Number.isFinite(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s;
    if (!valid(a.from) || !valid(a.to)) throw Error("无效日期");
    const days = (Date.parse(a.to) - Date.parse(a.from)) / 86400000;
    if (days <= 0 || days > 93) throw Error("日期范围过大");
    return "/api/campus-social/calendar?" + new URLSearchParams({ from: a.from, to: a.to });
  }
  throw Error("不支持的数据请求");
}
function mutation(key, a = {}) {
  const p = "/api/campus-social";
  let method = "POST",
    route,
    body = a.body || {};
  let csrf = true;
  switch (key) {
    case "login":
      route = "/api/user/login";
      csrf = false;
      body = {
        email: String(body.email || "").trim(),
        password: String(body.password || ""),
        rememberMe: !!body.rememberMe,
      };
      break;
    case "resetCode":
      route = "/api/user/password-reset/code";
      csrf = false;
      break;
    case "resetVerify":
      route = "/api/user/password-reset/verify";
      csrf = false;
      break;
    case "resetComplete":
      route = "/api/user/password-reset/complete";
      csrf = false;
      break;
    case "profile":
      route = p + "/me";
      method = "PUT";
      body = { name: body.name, nameEn: body.nameEn };
      break;
    case "join":
      route = p + "/clubs/" + positive(a.id) + "/join";
      body = { note: body.note || "" };
      break;
    case "leave":
      route = p + "/me/clubs/" + positive(a.id);
      method = "DELETE";
      break;
    case "notificationRead":
      route = p + "/notifications/read";
      break;
    case "calendarAdd":
      route = p + "/calendar";
      break;
    case "calendarEdit":
      route = p + "/calendar/" + uuid(a.id);
      method = "PUT";
      break;
    case "calendarDelete":
      route = p + "/calendar/" + uuid(a.id);
      method = "DELETE";
      break;
    case "post":
      route = p + "/posts";
      break;
    case "like":
      route = p + "/posts/" + uuid(a.id) + "/like";
      method = "PUT";
      body = { liked: !!body.liked };
      break;
    case "reply":
      route = p + "/posts/" + uuid(a.id) + "/replies";
      break;
    case "message":
      route = p + "/conversations/" + account(a.peer);
      break;
    case "messageRead":
      route = p + "/conversations/" + account(a.peer) + "/read";
      break;
    case "keyProvision":
      route = p + "/keys/provision";
      break;
    case "keyRecovery":
      route = p + "/keys/recovery";
      method = "PUT";
      break;
    case "joinReview":
      route = "/api/club-workspace/" + positive(a.club) + "/join-requests/" + uuid(a.id);
      break;
    case "clubEvent":
      route = "/api/club-workspace/" + positive(a.club) + "/events";
      break;
    case "booking":
      route = "/api/booking/reservations";
      break;
    case "bookingCancel":
      route = "/api/booking/reservations/" + positive(a.id);
      method = "DELETE";
      break;
    default:
      throw Error("不支持的操作");
  }
  if (JSON.stringify(body).length > 150000) throw Error("内容太长");
  return { route, method, body, csrf };
}
module.exports = { PRODUCTION, LOCAL, resourcePath, mutation };
