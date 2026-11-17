(() => {
  const THEME_KEY = "club.desktop.theme";
  let theme = "light";
  try {
    if (localStorage.getItem(THEME_KEY) === "dark") theme = "dark";
  } catch {
    // 本地存储不可用时保持默认浅色
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.appTheme = theme;
})();
