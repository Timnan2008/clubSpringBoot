// Shared by the site's navigation and React screens. Bespoke chat composers retain their own sizing.
if (typeof document !== "undefined" && !window.__campusAutoTextarea) {
  window.__campusAutoTextarea = true;
  const style = document.createElement("style");
  style.textContent = `textarea { resize: none !important; } textarea[data-campus-autosize] { scrollbar-width: none; } textarea[data-campus-autosize]::-webkit-scrollbar { display: none; }`;
  document.head.append(style);
  const fields = new Map();
  const fit = (el, force = false) => {
    const record = fields.get(el);
    if (!record || !el.isConnected || !el.getClientRects().length) return;
    const width = el.clientWidth;
    if (!force && record.value === el.value && record.width === width) return;
    record.value = el.value;
    record.width = width;
    const css = getComputedStyle(el);
    const border = parseFloat(css.borderTopWidth) + parseFloat(css.borderBottomWidth);
    const padding = parseFloat(css.paddingTop) + parseFloat(css.paddingBottom);
    const min = Math.max(
      parseFloat(css.minHeight) || 0,
      (parseFloat(css.lineHeight) || 22) + padding + border,
    );
    const max = Math.max(min, Math.min(parseFloat(css.maxHeight) || 240, innerHeight * 0.4));
    const scroll = el.scrollTop;
    el.style.height = "0px";
    const natural = el.scrollHeight + border;
    const height = Math.min(max, Math.max(min, natural));
    el.style.height = `${css.boxSizing === "border-box" ? height : height - padding - border}px`;
    el.style.overflowY = natural > max ? "auto" : "hidden";
    el.scrollTop = scroll;
  };
  const scan = () => {
    for (const el of fields.keys()) if (!el.isConnected) fields.delete(el);
    document.querySelectorAll("textarea:not([data-autosize-managed])").forEach((el) => {
      if (!fields.has(el)) {
        fields.set(el, {});
        el.dataset.campusAutosize = "";
      }
      fit(el);
    });
  };
  document.addEventListener("input", (e) => {
    if (e.target.matches("textarea")) requestAnimationFrame(() => fit(e.target, true));
  });
  document.addEventListener("focusin", (e) => {
    if (e.target.matches("textarea")) fit(e.target, true);
  });
  document.addEventListener("reset", () => requestAnimationFrame(scan));
  window.addEventListener("resize", () => {
    for (const el of fields.keys()) fit(el, true);
  });
  // Includes asynchronously loaded form values and controls mounted by React.
  setInterval(() => {
    if (!document.hidden) scan();
  }, 350);
  scan();
}
