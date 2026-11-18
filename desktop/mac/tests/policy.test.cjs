const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resourcePath, mutation } = require("../electron/policy.cjs");
const { createClient } = require("../electron/client.cjs");
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
test("IPC accepts only fixed campus data and operation names", () => {
  for (const key of [
    "__proto__",
    "constructor",
    "/api/user/all",
    "https://attacker.test",
    "logout",
  ])
    assert.throws(() => resourcePath(key));
  for (const key of ["https://attacker.test", "open", "register", "__proto__"])
    assert.throws(() => mutation(key));
  for (const id of ["1/../../user/all", "1?admin=true", "0", "-1"])
    assert.throws(() => resourcePath("club", { id }));
  assert.throws(() => mutation("message", { peer: "someone@example.com" }));
  assert.throws(() => mutation("calendarDelete", { id: "../me" }));
  assert.equal(resourcePath("club", { id: 1 }), "/api/club/id/1");
  assert.equal(
    mutation("join", { id: 1, body: { note: "hello" } }).route,
    "/api/campus-social/clubs/1/join",
  );
});
test("calendar queries are valid, bounded dates", () => {
  for (const a of [
    { from: "2026-01-01", to: "2027-01-01" },
    { from: "2026-02-30", to: "2026-03-15" },
    { from: "2026-01-01&admin=1", to: "2026-02-01" },
  ])
    assert.throws(() => resourcePath("calendar", a));
  assert.equal(
    resourcePath("calendar", { from: "2026-11-01", to: "2026-12-01" }),
    "/api/campus-social/calendar?from=2026-11-01&to=2026-12-01",
  );
});
test("account mutation obtains a session token without exposing it to renderer", async () => {
  const calls = [];
  const client = createClient(async (route, options) => {
    calls.push({ route, options });
    return route.endsWith("/me")
      ? json({ account: { name: "测试" }, token: "private-token" })
      : json({ status: "pending" });
  });
  const result = await client.write("join", { id: 1, body: { note: "想加入" } });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.headers["X-Workspace-Token"], "private-token");
  const me = await client.read("me");
  assert.equal(me.data.token, undefined);
  assert.equal(me.data.account.name, "测试");
});
test("failed authentication cannot submit a protected write", async () => {
  const calls = [];
  const client = createClient(async (route) => {
    calls.push(route);
    return json({ message: "请登录" }, 401);
  });
  const r = await client.write("post", { body: { text: "Hello" } });
  assert.equal(r.auth, true);
  assert.deepEqual(calls, ["/api/campus-social/me"]);
});
test("login removes password record and reset verification keeps account identifier", async () => {
  const client = createClient(async (route) =>
    route.endsWith("/login")
      ? json({ code: 200, data: { password: "hash", email: "private@example.com" } })
      : json({ code: 200, account: "a".repeat(64) }),
  );
  assert.deepEqual(
    await client.write("login", { body: { email: "test@example.com", password: "not-real" } }),
    { ok: true, data: { signedIn: true } },
  );
  const r = await client.write("resetVerify", {
    body: { email: "test@example.com", code: "123456" },
  });
  assert.equal(r.data.account, "a".repeat(64));
});
test("switching server discards an in-flight account and its token", async () => {
  let release;
  const client = createClient(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const pending = client.read("me");
  client.invalidate();
  release(json({ account: { name: "Old" }, token: "stale" }));
  const r = await pending;
  assert.equal(r.ok, false);
  assert.equal(r.data, undefined);
});

test("staff operations stay on fixed routes and credentials are filtered", async () => {
  assert.equal(resourcePath("staffAccounts"), "/api/user/all");
  assert.throws(() => mutation("accountRole", { body: { newRole: 8 } }));
  assert.throws(() => mutation("appointPresident", { body: { clubId: "../1" } }));
  assert.throws(() => mutation("moderationForgive", { body: { account: "admin" } }));
  assert.equal(
    mutation("moderationDelete", { word: "a/b?#" }).route,
    "/api/campus-social/moderation/words/a%2Fb%3F%23",
  );
  const client = createClient(
    async () =>
      new Response(
        JSON.stringify({
          code: 200,
          data: [
            {
              username: "同学",
              password: "private-hash",
              clubs: [{ token: "private-token", name: "社团" }],
            },
          ],
        }),
        { headers: { "content-type": "application/json" } },
      ),
  );
  const result = await client.read("staffAccounts");
  assert.deepEqual(result.data, [{ username: "同学", clubs: [{ name: "社团" }] }]);
});
