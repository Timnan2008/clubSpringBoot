// Offline fixtures only. This client never receives a transport or session.
const blocked = () => ({ ok: false, message: "只读预览：此操作不会提交，示例数据保持不变。" });
function createPreviewClient(role = "student") {
  if (!["student", "teacher", "admin"].includes(role)) throw Error("无效预览身份");
  const account = {
    id: "a".repeat(64),
    name: "预览" + { student: "同学", teacher: "教师", admin: "管理员" }[role],
    role,
  };
  const dates = Array.from({ length: 5 }, (_, i) =>
    new Date(Date.now() + (i + 1) * 86400000).toLocaleDateString("sv-SE", {
      timeZone: "Asia/Shanghai",
    }),
  );
  const times = ["16:00", "17:00", "18:00"];
  const courts = [
    { id: 1, name: "羽毛球 1 号场" },
    { id: 2, name: "羽毛球 2 号场" },
  ];
  const cells = courts.flatMap((c) =>
    dates.flatMap((d) =>
      times.map((t) => {
        const start = Date.parse(d + "T" + t + ":00+08:00") / 1000;
        const occupied = d === dates[0] && t === "16:00";
        return {
          courtId: c.id,
          start,
          end: start + 3600,
          status: occupied ? "confirmed" : "available",
          mine: occupied && c.id === 1,
          canBook: !occupied,
          pending: 0,
        };
      }),
    ),
  );
  const records = [
    {
      id: 1,
      courtId: 1,
      courtName: courts[0].name,
      start: cells[0].start,
      end: cells[0].end,
      status: "confirmed",
      displayName: "示例同学",
      email: "student@example.invalid",
      note: "双人练习（示例）",
    },
    {
      id: 2,
      courtId: 2,
      courtName: courts[1].name,
      start: cells[1].start,
      end: cells[1].end,
      status: "pending",
      displayName: "示例队员",
      email: "member@example.invalid",
      note: "等待分配（示例）",
    },
  ];
  const posts = [
    {
      id: "preview-notice",
      author: { name: "示例教师", role: "teacher" },
      text: "本周羽毛球练习安排已更新，请先查看空闲时段，再提交预约。\n这是本地预览示例，不是校园真实公告。",
      createdAt: dates[0] + "T09:00:00",
      wallPinned: true,
      likes: 3,
      replies: 1,
    },
    {
      id: "preview-own",
      author: account,
      own: true,
      text: "今天在校园里发现了一个很适合安静阅读的角落。\n欢迎分享你喜欢的校园空间。",
      createdAt: dates[0] + "T08:30:00",
      likes: 0,
      replies: 0,
    },
    {
      id: "preview-anonymous",
      anonymous: true,
      author: { role: "anonymous", name: "匿名同学" },
      text: "这是一条历史匿名内容示例，用于检查身份信息不会泄露。",
      createdAt: dates[0] + "T08:00:00",
      likes: 1,
      replies: 0,
    },
  ];
  const data = {
    me: { account },
    clubs: [],
    announcements: [{ id: "preview", title: "本地只读预览 · 全部内容为示例" }],
    mine: [],
    calendar: { events: [] },
    inbox: [],
    notifications: { items: [], unread: 0 },
    social: { account, canPost: true, admin: role === "admin", clubs: [] },
    booking: {
      account,
      calendar: {
        courts,
        dates,
        times,
        cells,
        studentOpen: true,
        teacher: role === "teacher",
        overseer: role === "admin",
        serverTime: Math.floor(Date.now() / 1000),
        policy: { version: 1, settings: { slotMinutes: 60, weeklyLimit: 2 } },
      },
    },
    bookings: [records[0]],
    bookingRoster: records,
    moderationWords: { words: [{ word: "示例词条", source: "本机" }] },
    moderationStrikes: { accounts: [] },
    suggestions: [],
    staffAccounts: [],
    staffClubs: [],
  };
  return {
    invalidate() {},
    write: async () => blocked(),
    logout: async () => blocked(),
    read: async (key, input = {}) => {
      if (key === "bookingRoster" && role !== "admin")
        return { ok: false, status: 403, message: "当前账号没有预约管理权限" };
      if (key === "posts")
        return {
          ok: true,
          data: {
            items:
              Number(input.page || 1) === 1
                ? posts.filter((p) => p.text.includes(input.keyword || ""))
                : [],
            next: false,
          },
        };
      if (key === "replies")
        return {
          ok: true,
          data:
            input.id === "preview-notice"
              ? [
                  {
                    id: "preview-reply",
                    author: { name: "示例同学", role: "student" },
                    text: "收到，会提前查看时段。",
                    createdAt: dates[0] + "T09:10:00",
                  },
                ]
              : [],
        };
      return Object.hasOwn(data, key)
        ? { ok: true, data: structuredClone(data[key]) }
        : { ok: false, message: "此页面暂无本地预览数据" };
    },
  };
}
module.exports = { createPreviewClient };
