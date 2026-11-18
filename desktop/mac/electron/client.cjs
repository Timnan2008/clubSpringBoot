const { resourcePath, mutation } = require("./policy.cjs");
// User management endpoints may include nested backend records. Never expose credentials.
function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !/^(password|passwordHash|token|secret|rememberMeToken)$/i.test(key))
      .map(([key, v]) => [key, scrub(v)]),
  );
}
// A transport-bound client keeps cookies and the workspace token out of the renderer.
function createClient(fetcher) {
  let token = "",
    epoch = 0;
  function invalidate() {
    token = "";
    epoch++;
  }
  async function request(route, options = {}, notice = false) {
    const generation = epoch;
    try {
      const response = await fetcher(route, {
        credentials: "include",
        redirect: "error",
        signal: AbortSignal.timeout(18000),
        ...options,
      });
      if (generation !== epoch) return { ok: false, message: "连接已切换，请重试" };
      if (notice && response.ok) {
        const html = await response.text();
        const board =
          html.match(/<div[^>]*class="notice-board"[^>]*>([\s\S]*?)<\/section>/)?.[1] || "";
        return {
          ok: true,
          data: [
            ...board.matchAll(
              /<div[^>]*class="notice(?:-important|-normal)?"[^>]*>([\s\S]*?)<\/div>/g,
            ),
          ]
            .map((m, i) => ({
              id: String(i),
              title: m[1]
                .replace(/<[^>]*>/g, "")
                .replace(/&nbsp;/g, " ")
                .replace(/&amp;/g, "&")
                .trim(),
            }))
            .filter((x) => x.title),
        };
      }
      const json = response.headers.get("content-type")?.includes("json")
        ? await response.json()
        : null;
      if (generation !== epoch) return { ok: false, message: "连接已切换，请重试" };
      if (!response.ok || (json?.code && json.code !== 200))
        return {
          ok: false,
          auth: response.status === 401 || json?.code === 401,
          status: response.status,
          message:
            json?.message ||
            { 401: "请先登录校园账号", 403: "当前账号没有此操作权限", 404: "这项服务暂未开放" }[
              response.status
            ] ||
            "服务暂不可用，请稍后重试",
        };
      if (!json) return { ok: false, message: "服务暂未提供可用数据" };
      const data = json.code === 200 && Object.hasOwn(json, "data") ? json.data : json;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        if (data.token) token = data.token;
        const { token: privateToken, ...safe } = data;
        return { ok: true, data: scrub(safe) };
      }
      return { ok: true, data: scrub(data) };
    } catch (error) {
      return {
        ok: false,
        message: /abort|timeout/i.test(error.message)
          ? "连接超时，请稍后重试"
          : "连接失败，请检查网络后重试",
      };
    }
  }
  return {
    invalidate,
    read: async (key, input) => {
      try {
        return await request(resourcePath(key, input), {}, key === "announcements");
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
    write: async (key, input) => {
      try {
        const operation = mutation(key, input);
        if (operation.csrf && !token) {
          const result = await request(resourcePath("me"));
          if (!result.ok) return result;
          if (!token) return { ok: false, message: "登录状态已过期，请重新登录" };
        }
        if (key === "login") invalidate();
        const generation = epoch;
        const result = await request(operation.route, {
          method: operation.method,
          headers: {
            "Content-Type": "application/json",
            ...(operation.csrf ? { "X-Workspace-Token": token } : {}),
          },
          body: JSON.stringify(operation.body),
        });
        // Login responses contain a backend user record. Only expose success, never its hash.
        if (key === "login") return result.ok ? { ok: true, data: { signedIn: true } } : result;
        if (generation !== epoch) return { ok: false, message: "连接已切换，请重试" };
        return result;
      } catch (e) {
        return { ok: false, message: e.message };
      }
    },
    logout: async () => {
      const result = await request("/api/user/logout");
      invalidate();
      return result;
    },
  };
}
module.exports = { createClient };
