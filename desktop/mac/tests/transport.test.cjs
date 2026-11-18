const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createCampusTransport } = require("../electron/transport.cjs");
const { PRODUCTION, LOCAL } = require("../electron/policy.cjs");
test("campus writes carry correct provenance, token and isolated session", async () => {
  let base = PRODUCTION;
  const calls = [];
  const transport = createCampusTransport(
    () => ({
      fetch: async (url, options) => {
        calls.push({ url, options });
        return new Response("{}");
      },
    }),
    () => base,
  );
  for (const origin of [PRODUCTION, LOCAL]) {
    base = origin;
    await transport("/api/campus-social/keys/provision", {
      method: "POST",
      body: "{}",
      headers: { Origin: "null", Referer: "https://evil.test", "X-Workspace-Token": "private" },
    });
    const { url, options } = calls.at(-1);
    assert.equal(url, origin + "/api/campus-social/keys/provision");
    assert.equal(options.headers.get("Origin"), origin);
    assert.equal(options.headers.get("Referer"), origin + "/");
    assert.equal(options.headers.get("Sec-Fetch-Site"), "same-origin");
    assert.equal(options.headers.get("X-Workspace-Token"), "private");
    assert.equal(options.redirect, "error");
  }
  for (const route of [
    "https://evil.test/api/a",
    "//evil.test/api/a",
    "/page/index#secret",
    "/arbitrary",
  ])
    assert.throws(() => transport(route));
  base = "https://evil.test";
  assert.throws(() => transport("/api/user/login"));
  assert.equal(calls.length, 2);
});
