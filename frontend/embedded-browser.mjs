export function embeddedBrowser(ua = "") {
  return /MicroMessenger|QQ\/|WeiBo|DingTalk|AlipayClient/i.test(ua);
}
