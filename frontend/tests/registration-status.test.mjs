import { test } from "node:test";
import assert from "node:assert/strict";
import { alreadyRegistered } from "../registration-status.mjs";

test("duplicate signup messages are recognized in Chinese and English", () => {
  assert.equal(
    alreadyRegistered(
      "此邮箱已注册，请直接登录 / This email is already registered. Please sign in.",
    ),
    true,
  );
  assert.equal(
    alreadyRegistered("This student number is already registered. Please sign in."),
    true,
  );
  assert.equal(alreadyRegistered("该邮箱已被使用"), true);
  assert.equal(alreadyRegistered("This email is already in use."), true);
  assert.equal(alreadyRegistered("验证码错误或已过期，请重新获取"), false);
  assert.equal(alreadyRegistered("学号与姓名不一致，无法注册"), false);
  assert.equal(alreadyRegistered(""), false);
});
