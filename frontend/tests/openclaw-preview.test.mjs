import test from "node:test";
import assert from "node:assert/strict";
import { openClawPreview } from "../../scripts/preview-openclaw.mjs";

async function request(path, profileStatus, account, method = "GET") {
  let result = { headers: {} },
    called = 0;
  const req = { method, headers: { cookie: "JSESSIONID=fixture-only" } };
  const res = {
    setHeader(key, value) {
      result.headers[key] = value;
    },
    writeHead(status, headers = {}) {
      result.status = status;
      Object.assign(result.headers, headers);
    },
    end(body) {
      result.body = body;
    },
  };
  const handled = await openClawPreview(
    req,
    res,
    new URL(path, "http://localhost:8088"),
    new URL("https://school.example"),
    async (url, options) => {
      called++;
      assert.equal(url.href, "https://school.example/api/campus-social/me");
      assert.equal(options.headers.cookie, req.headers.cookie);
      assert.equal(options.redirect, "manual");
      return new Response(JSON.stringify({ account, token: "must-not-escape" }), {
        status: profileStatus,
      });
    },
  );
  return { ...result, handled, called };
}

test("main-site preview requires the real school session", async () => {
  const page = await request("/page/openclaw", 401);
  assert.equal(page.status, 302);
  assert.equal(page.headers.Location, "/page/user/login?next=%2Fpage%2Fopenclaw");
  assert.equal((await request("/api/openclaw/bootstrap", 401)).status, 401);
  for (const account of [{ role: "student" }, { role: "user" }, {}, null]) {
    assert.equal((await request("/page/openclaw", 200, account)).status, 403);
    assert.equal((await request("/api/openclaw/bootstrap", 200, account)).status, 403);
  }
});
test("allowed roles get the main application template and sanitized bootstrap", async () => {
  for (const account of [
    { role: "president" },
    { role: "president", position: "vice_president" },
    { role: "teacher" },
    { role: "admin" },
  ]) {
    const page = await request("/page/openclaw", 200, account);
    assert.equal(page.status, 200);
    assert.match(page.body, /\/javascript\/ui\/openclaw.js/);
    assert.equal(page.headers["Cache-Control"], "no-store");
    const bootstrap = await request("/api/openclaw/bootstrap", 200, account);
    assert.deepEqual(JSON.parse(bootstrap.body), { connected: false, account });
    assert.equal(bootstrap.body.includes("must-not-escape"), false);
  }
});
test("suspensions, upstream failures and writes fail closed", async () => {
  assert.equal((await request("/page/openclaw", 403)).status, 403);
  assert.equal((await request("/api/openclaw/bootstrap", 500)).status, 503);
  const write = await request("/api/openclaw/bootstrap", 200, { role: "admin" }, "POST");
  assert.equal(write.status, 405);
  assert.equal(write.called, 0);
  const unrelated = await request("/page/wall", 200);
  assert.equal(unrelated.handled, false);
  assert.equal(unrelated.called, 0);
});
