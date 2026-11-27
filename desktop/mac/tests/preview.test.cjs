const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createPreviewClient } = require("../electron/preview.cjs");
const { resourcePath, mutation } = require("../electron/policy.cjs");
test("offline previews reject every mutation and keep fixtures intact", async () => {
  for (const role of ["student", "teacher", "admin"]) {
    const c = createPreviewClient(role),
      before = await c.read("posts");
    for (const key of [
      "login",
      "post",
      "postDelete",
      "postPin",
      "booking",
      "bookingCancel",
      "moderationAdd",
      "keyProvision",
      "unknown",
    ])
      assert.equal((await c.write(key, {})).ok, false);
    assert.equal((await c.logout()).ok, false);
    assert.deepEqual(await c.read("posts"), before);
    assert.equal((await c.read("social")).data.admin, role === "admin");
    assert.equal((await c.read("bookingRoster")).ok, role === "admin");
    assert.equal((await c.read("posts", { keyword: "不存在的词" })).data.items.length, 0);
    assert.equal((await c.read("posts", { page: 2 })).data.items.length, 0);
  }
});
test("management routes stay fixed and validate record IDs", () => {
  assert.equal(resourcePath("bookingRoster"), "/api/booking/all");
  assert.equal(mutation("postDelete", { id: "abc" }).method, "DELETE");
  assert.deepEqual(
    mutation("postPin", { id: "abc", body: { scope: "other", pinned: true } }).body,
    { scope: "wall", pinned: true },
  );
  assert.throws(() => mutation("postDelete", { id: "../me" }));
  assert.throws(() => createPreviewClient("owner"));
});
