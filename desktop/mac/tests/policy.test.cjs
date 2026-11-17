const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resourcePath, servicePath, allowedRemote, PRODUCTION } = require("../electron/policy.cjs");
test("renderer cannot request arbitrary endpoints or URLs", () => {
  for (const value of [
    "__proto__",
    "constructor",
    "/api/user/all",
    "https://attacker.test",
    "logout",
  ])
    assert.throws(() => resourcePath(value));
  assert.equal(resourcePath("clubs"), "/api/club/all");
});
test("calendar requests reject unbounded or injected query input", () => {
  assert.throws(() => resourcePath("calendar", { from: "2026-01-01", to: "2027-01-01" }));
  assert.throws(() =>
    resourcePath("calendar", { from: "2026-01-01&admin=true", to: "2026-02-01" }),
  );
  assert.throws(() => resourcePath("calendar", { from: "2026-02-30", to: "2026-03-15" }));
  assert.equal(
    resourcePath("calendar", { from: "2026-11-01", to: "2026-12-01" }),
    "/api/campus-social/calendar?from=2026-11-01&to=2026-12-01",
  );
});
test("service windows cannot be redirected to another origin or a local file", () => {
  for (const value of [
    "https://attacker.test",
    "//attacker.test",
    "/page/../api/user/logout",
    "/page/%2e%2e/api/user/logout",
    "/page/evil%5cfile",
    "/page/evil\\file",
    "file:///etc/passwd",
  ])
    assert.throws(() => servicePath(value));
  assert.equal(servicePath("/page/clubs/1"), "/page/clubs/1");
  assert.equal(allowedRemote("https://qpwflhsclub.com.evil.test", PRODUCTION), false);
  assert.equal(allowedRemote("https://qpwflhsclub.com/page/user/login", PRODUCTION), true);
});
