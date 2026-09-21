import { test } from "node:test";
import assert from "node:assert/strict";
import { embeddedBrowser } from "../embedded-browser.mjs";

test("WeChat and QQ in-app browsers are treated as embedded", () => {
  assert.equal(
    embeddedBrowser(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.50",
    ),
    true,
  );
  assert.equal(
    embeddedBrowser(
      "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 QQ/9.0.0 Mobile Safari/537.36",
    ),
    true,
  );
  assert.equal(
    embeddedBrowser(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    ),
    false,
  );
});
