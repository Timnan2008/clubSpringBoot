# Club motion and frosted navigation QA — 2026-09-24

final result: passed

## Reference and capture
- Source: user image `codex-clipboard-61acfaa4-26c7-4922-b51b-38acae062a55.png` (1436×802), glass material reference only; preserve the existing horizontal navigation rather than copy icon buttons.
- Source: user image `codex-clipboard-2be134e3-62f6-49ad-a7c9-4cddcfc4bda0.png` (1774×638) and `/Users/jasonli/Desktop/Screen Recording 2026-09-24 at 4.18.33 PM.mov`; whole-height purple highlight, rounded ends, left-to-right reveal.
- Video contact sheet: `/tmp/club-motion-reference/video.jpg`.
- Desktop implementation: `/tmp/club-motion-qa/agent-desktop.png` (1440×1000 CSS pixels, density 1).
- Mobile implementation: `/tmp/club-motion-qa/agent-mobile.png` (390×844 CSS pixels, density 1).
- Introduction/navigation: `/tmp/club-effects-qa/opensteam-desktop.png`, `/tmp/club-effects-qa/opensteam-mobile.png`.
- In-app browser checked actual public club content through http://localhost:8094/page/clubs/28?lang=zh and Agent fixture http://localhost:8095/page/openclaw?lang=zh; expanded menu, greeting after typing, and settled ballpit inspected.

## Comparison
The source images are component/material references, not replacement full-page layouts. Reference and implementation were viewed together. The existing logo, school navigation, body layout and Chinese introduction are deliberately retained; typography is not enlarged to the reference demo's display size. All club descriptions increase from 16px to 18px. Purple marks now cover the character height with rounded ends and side padding, using #7c3aed and 1.5-second staggered reveals.

- Typography: existing family preserved; 18px/2 description supports Chinese and English wrapping. Welcome heading reserves line height during typing and exposes the complete text to assistive technology.
- Spacing: existing navigation proportions retained; horizontal composer on desktop and two-row composer on mobile remain usable. No viewport overflow at 390px. Ballpit is behind controls and is removed after sending.
- Colors: transparent neutral glass, bright edge reflection and 22px backdrop blur; dark/light host ink retained. Purple highlight now matches the reference's saturated treatment.
- Images: real site crest/logo retained. The automated Agent fixture intentionally omits image responses; in-app preview confirmed the actual crest. No production image changes.
- Content: actual introduction text unchanged; three relevant phrases highlighted. Welcome phrase unchanged, only typing added. Regeneration history behavior remains intact.

## Iteration history
- P2: OS motion-preference change initially hid the background without unmounting it. Added a reactive media-query subscription; final browser test verifies canvas unmounting and immediate complete welcome text.
- Reduced repeated initialization: memoized the welcome scene so typing does not re-randomize ball sizes.
- P2 live bright-background check: the dark glass transmitted too much of a white club logo under the search input. Added a 66% neutral smoked-glass base, keeping backdrop blur and translucent edges. Final in-app browser recheck on the public HTTPS page, at the same scroll position over the white logo, confirmed the search surface remains readable and still visibly translucent.
- Final checks: send/unmount, new conversation/remount, mobile input, model controls, reduced motion, WebGL/shader errors, navigation expanded and collapsed. No remaining P0/P1/P2 findings.

## Verification
- Frontend build passed.
- Club effects browser tests passed, including mobile, highlight completion, English and other clubs, reduced motion and WebGL fallback.
- Agent regression passed, including background lifecycle, retained/discarded regeneration branches, mobile overflow and reduced motion.
- Local 90-frame sample: 60 FPS, frame P95 approximately 16.8 ms. This is a local measurement, not a guarantee for all devices.
