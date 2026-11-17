(function () {
  const params = new URLSearchParams(location.search);
  const baseUrl = params.get("url") || "https://qpwflhsclub.com/";
  const startPath = params.get("start") || "/page/dashboard";
  const view = document.getElementById("club-view");
  const progress = document.getElementById("progress");
  const offline = document.getElementById("offline");
  const offlineUrl = document.getElementById("offline-url");
  const retryBtn = document.getElementById("retry");
  const searchForm = document.getElementById("app-search");
  const searchInput = document.getElementById("app-search-input");
  const searchShortcut = document.getElementById("search-shortcut");
  const navItems = Array.from(document.querySelectorAll(".nav-item"));
  const notificationWrap = document.getElementById("notification-wrap");
  const notificationToggle = document.getElementById("notification-toggle");
  const notificationPanel = document.getElementById("notification-panel");
  const notificationBadge = document.getElementById("notification-badge");
  const notificationList = document.getElementById("notification-list");
  const notificationReadAll = document.getElementById("notification-read-all");
  const userWrap = document.getElementById("user-wrap");
  const userToggle = document.getElementById("user-toggle");
  const userMenu = document.getElementById("user-menu");
  const userName = document.getElementById("user-name");
  const userRole = document.getElementById("user-role");
  const userAvatar = document.getElementById("user-avatar");
  const menuName = document.getElementById("menu-name");
  const menuEmail = document.getElementById("menu-email");
  const userLogin = document.getElementById("user-login");
  const userLogout = document.getElementById("user-logout");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const themeToggle = document.getElementById("theme-toggle");
  const themeSource = document.getElementById("webview-theme-source");

  const ROLE_LEVEL = {
    guest: 0,
    student: 0,
    president: 1,
    vice_president: 1,
    teacher: 2,
    admin: 3,
  };
  const ROLE_LABEL = {
    student: "学生",
    president: "社长",
    vice_president: "副社长",
    teacher: "教师",
    admin: "管理员",
  };
  const SIDEBAR_KEY = "club.desktop.sidebar.collapsed";
  const THEME_KEY = "club.desktop.theme";
  const platform = window.desktop?.platform || "win32";
  const isMac = platform === "darwin";

  document.body.classList.add(`platform-${platform}`);
  searchShortcut.textContent = isMac ? "⌘ K" : "Ctrl K";

  let lastUrl = resolve(startPath);
  let currentMe = null;
  let notificationsState = { items: [], unread: 0, token: "" };
  let manualCollapsed = readSidebarPreference();
  let currentTheme =
    document.documentElement.dataset.theme === "dark" ? "dark" : "light";

  function resolve(path) {
    try {
      return new URL(path, baseUrl).href;
    } catch {
      return baseUrl;
    }
  }

  function normalizePath(url) {
    try {
      const path = new URL(url).pathname.replace(/\/+$/, "");
      return path === "" ? "/" : path;
    } catch {
      return "";
    }
  }

  function readSidebarPreference() {
    try {
      const value = localStorage.getItem(SIDEBAR_KEY);
      return value === "1" ? true : value === "0" ? false : null;
    } catch {
      return null;
    }
  }

  function saveSidebarPreference(value) {
    try {
      localStorage.setItem(SIDEBAR_KEY, value ? "1" : "0");
    } catch {
      // 忽略本地存储不可用
    }
  }

  function themeLabel(theme) {
    return theme === "dark" ? "切换到浅色模式" : "切换到深色模式";
  }

  function syncThemeToView(forceCss) {
    if (!view) return;

    if (forceCss && themeSource) {
      const css = themeSource.textContent || "";
      if (css.trim()) {
        try {
          const inserted = view.insertCSS(css, { cssOrigin: "user" });
          inserted?.catch?.(() => {});
        } catch {
          // webview 尚未就绪
        }
      }
    }

    try {
      const applied = view.executeJavaScript(
        `document.documentElement.dataset.appTheme = ${JSON.stringify(currentTheme)};`,
      );
      applied?.catch?.(() => {});
    } catch {
      // 页面切换过程中忽略
    }
  }

  function applyTheme(theme, persist) {
    currentTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = currentTheme;
    document.documentElement.dataset.appTheme = currentTheme;

    if (themeToggle) {
      const label = themeLabel(currentTheme);
      themeToggle.setAttribute("aria-label", label);
      themeToggle.setAttribute("title", label);
      themeToggle.setAttribute("aria-pressed", currentTheme === "dark" ? "true" : "false");
    }

    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, currentTheme);
      } catch {
        // 忽略本地存储不可用
      }
    }

    syncThemeToView(false);
  }

  function updateActive(url) {
    const path = normalizePath(url);
    let best = null;
    let bestLength = -1;

    for (const item of navItems) {
      for (const match of (item.dataset.match || "").split(/\s+/)) {
        if (!match) continue;
        const hit = path === match || (match !== "/" && path.startsWith(match + "/"));
        if (hit && match.length > bestLength) {
          best = item;
          bestLength = match.length;
        }
      }
    }

    for (const item of navItems) {
      const active = item === best;
      item.classList.toggle("active", active);
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    }
    document.title = best ? `${best.dataset.label} · 青浦世外社团` : "青浦世外社团";
  }

  function setBadge(id, count) {
    const element = document.getElementById(id);
    if (!element) return;
    const value = Number(count) || 0;
    element.hidden = value <= 0;
    element.textContent = value > 99 ? "99+" : String(value);
  }

  function applyRole(roleName) {
    const role = ROLE_LEVEL[roleName] === undefined ? "guest" : roleName;
    const level = ROLE_LEVEL[role] ?? 0;
    document.querySelectorAll("[data-min-role]").forEach((item) => {
      item.hidden = level < Number(item.dataset.minRole);
    });
    document.querySelectorAll(".nav-group").forEach((group) => {
      const visible = Array.from(group.querySelectorAll(".nav-item")).some(
        (item) => !item.hidden,
      );
      group.hidden = !visible;
    });
  }

  function updateUserUI(account) {
    if (!account) {
      userName.textContent = "未登录";
      userRole.textContent = "点击登录";
      menuName.textContent = "未登录";
      menuEmail.textContent = "登录后同步你的社团数据";
      userAvatar.replaceChildren(document.createTextNode("W"));
      userLogin.hidden = false;
      userLogout.hidden = true;
      return;
    }

    const name = account.nickname || account.name || "同学";
    userName.textContent = name;
    userRole.textContent = ROLE_LABEL[account.role] || "已登录";
    menuName.textContent = name;
    menuEmail.textContent = account.nameEn || account.name || "";
    userLogin.hidden = true;
    userLogout.hidden = false;

    userAvatar.replaceChildren();
    if (account.avatarUrl) {
      const image = document.createElement("img");
      image.alt = "";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => {
        userAvatar.replaceChildren(document.createTextNode(name.slice(0, 1)));
      });
      image.src = account.avatarUrl;
      userAvatar.append(image);
    } else {
      userAvatar.textContent = name.slice(0, 1);
    }
  }

  function noticeText(item) {
    switch (item.type) {
      case "mention":
        return "提及了你";
      case "reply":
        return "回复了你的帖子";
      case "message":
        return "发来一条私信";
      case "join_request":
        return `提交了入社申请${item.clubName ? " · " + item.clubName : ""}`;
      case "join_approved":
        return "你的入社申请已通过";
      case "join_declined":
        return "你的入社申请未通过";
      default:
        return "你有一条新的通知";
    }
  }

  function noticeTitle(item) {
    if (item.type === "join_approved" || item.type === "join_declined") {
      return item.clubName || "社团";
    }
    return item.actor?.nickname || item.actor?.name || item.clubName || "站内通知";
  }

  function noticeTime(item) {
    return item.createdAt ? item.createdAt.slice(0, 16).replace("T", " ") : "";
  }

  function renderNotifications(data) {
    notificationList.replaceChildren();
    const items = Array.isArray(data?.items) ? data.items.slice(0, 6) : [];
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "notification-empty";
      empty.textContent = "暂时没有新通知";
      notificationList.append(empty);
      return;
    }

    for (const item of items) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "notification-item";

      const copy = document.createElement("span");
      copy.className = "notification-item-copy";

      const title = document.createElement("strong");
      title.textContent = noticeTitle(item);

      const text = document.createElement("span");
      text.textContent = noticeText(item);

      const time = document.createElement("time");
      time.textContent = noticeTime(item);

      copy.append(title, text, time);
      button.append(copy);
      if (item.unread) {
        const dot = document.createElement("span");
        dot.className = "notification-dot";
        button.append(dot);
      }
      button.addEventListener("click", () => openNotification(item));
      notificationList.append(button);
    }
  }

  function updateNotificationBadges() {
    notificationBadge.hidden = notificationsState.unread <= 0;
    notificationBadge.textContent =
      notificationsState.unread > 99 ? "99+" : String(notificationsState.unread);

    const messages = notificationsState.items.filter(
      (item) => item.type === "message" && item.unread,
    ).length;
    const pending = notificationsState.items.filter(
      (item) => item.type === "join_request",
    ).length;
    setBadge("badge-messages", messages);
    setBadge("badge-pending", pending);
  }

  async function viewFetch(path, options) {
    const payload = JSON.stringify({ path, options: options || {} });
    return view.executeJavaScript(
      `(async () => {
        const req = ${payload};
        try {
          const response = await fetch(req.path, {
            credentials: "same-origin",
            ...req.options,
          });
          const data = await response.json().catch(() => null);
          return { ok: response.ok, status: response.status, data };
        } catch (error) {
          return { ok: false, status: 0, data: null, error: String(error) };
        }
      })()`,
      true,
    );
  }

  async function refreshShellData() {
    try {
      const meResult = await viewFetch("/api/campus-social/me");
      if (!meResult.ok) {
        currentMe = null;
        updateUserUI(null);
        applyRole("guest");
        setBadge("badge-clubs", 0);
        setBadge("badge-messages", 0);
        setBadge("badge-pending", 0);
        notificationBadge.hidden = true;
        return;
      }

      currentMe = meResult.data;
      updateUserUI(currentMe.account);
      applyRole(currentMe.account?.role || "guest");

      const [mineResult, noticeResult] = await Promise.all([
        viewFetch("/api/campus-social/me/clubs"),
        viewFetch("/api/campus-social/notifications"),
      ]);

      if (mineResult.ok && Array.isArray(mineResult.data)) {
        setBadge("badge-clubs", mineResult.data.length);
      } else {
        setBadge("badge-clubs", 0);
      }

      if (noticeResult.ok && noticeResult.data) {
        notificationsState = {
          items: Array.isArray(noticeResult.data.items) ? noticeResult.data.items : [],
          unread: Number(noticeResult.data.unread) || 0,
          token: noticeResult.data.token || "",
        };
        renderNotifications(noticeResult.data);
        updateNotificationBadges();
      }
    } catch {
      // 页面切换或离线时保持上一次状态
    }
  }

  function navigate(pathOrUrl) {
    const url = /^https?:/i.test(pathOrUrl) ? pathOrUrl : resolve(pathOrUrl);
    lastUrl = url;
    offline.hidden = true;
    closePopovers();
    view.loadURL(url).catch(() => {});
  }

  async function openNotification(item) {
    closePopovers();
    if (item.unread && notificationsState.token) {
      await viewFetch("/api/campus-social/notifications/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Token": notificationsState.token,
        },
        body: JSON.stringify({ id: item.id }),
      });
      await refreshShellData();
    }
    if (item.url) navigate(item.url);
  }

  async function markAllRead() {
    if (!notificationsState.token || notificationsState.unread <= 0) return;
    await viewFetch("/api/campus-social/notifications/read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Workspace-Token": notificationsState.token,
      },
      body: JSON.stringify({ all: true }),
    });
    await refreshShellData();
  }

  function closePopovers() {
    notificationPanel.hidden = true;
    userMenu.hidden = true;
    notificationToggle.setAttribute("aria-expanded", "false");
    userToggle.setAttribute("aria-expanded", "false");
  }

  function applySidebar() {
    const narrow = window.innerWidth < 1100;
    const collapsed = narrow
      ? true
      : manualCollapsed === null
        ? false
        : manualCollapsed;
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    sidebarToggle.disabled = narrow;
    sidebarToggle.title = narrow
      ? "窗口较窄时自动收起"
      : collapsed
        ? "展开侧栏"
        : "收起侧栏";
  }

  for (const item of navItems) {
    item.addEventListener("click", () => {
      navigate(item.dataset.path || "/page/dashboard");
    });
  }

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const keyword = searchInput.value.trim();
    if (!keyword) return;
    navigate(`/page/search?keyword=${encodeURIComponent(keyword)}&lang=zh`);
  });

  function focusSearch() {
    searchInput.focus();
    searchInput.select();
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === "k") {
      event.preventDefault();
      focusSearch();
    }
    if (event.key === "Escape") closePopovers();
  });

  window.desktop?.onFocusSearch?.(focusSearch);

  notificationToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = notificationPanel.hidden;
    closePopovers();
    if (open) {
      notificationPanel.hidden = false;
      notificationToggle.setAttribute("aria-expanded", "true");
      refreshShellData();
    }
  });

  userToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = userMenu.hidden;
    closePopovers();
    if (open) {
      userMenu.hidden = false;
      userToggle.setAttribute("aria-expanded", "true");
    }
  });

  notificationReadAll.addEventListener("click", markAllRead);

  document.addEventListener("pointerdown", (event) => {
    if (
      !notificationWrap.contains(event.target) &&
      !userWrap.contains(event.target)
    ) {
      closePopovers();
    }
  });

  userMenu.addEventListener("click", (event) => {
    const target = event.target.closest("[data-nav]");
    if (!target) return;
    event.preventDefault();
    navigate(target.getAttribute("href"));
  });

  userLogin.addEventListener("click", () => {
    navigate("/page/user/login?next=/page/dashboard");
  });

  userLogout.addEventListener("click", async () => {
    await viewFetch("/api/user/logout");
    closePopovers();
    navigate("/page/user/login");
  });

  sidebarToggle.addEventListener("click", () => {
    manualCollapsed = !document.body.classList.contains("sidebar-collapsed");
    saveSidebarPreference(manualCollapsed);
    applySidebar();
  });

  themeToggle?.addEventListener("click", () => {
    applyTheme(currentTheme === "dark" ? "light" : "dark", true);
  });

  window.addEventListener("resize", applySidebar);

  retryBtn.addEventListener("click", () => {
    offline.hidden = true;
    view.loadURL(lastUrl || resolve(startPath)).catch(() => {});
  });

  const winMin = document.getElementById("win-min");
  const winMax = document.getElementById("win-max");
  const winClose = document.getElementById("win-close");

  if (window.desktop) {
    winMin.addEventListener("click", () => window.desktop.minimize());
    winMax.addEventListener("click", () => window.desktop.toggleMaximize());
    winClose.addEventListener("click", () => window.desktop.close());

    if (!isMac) {
      document.querySelector(".titlebar").addEventListener("dblclick", (event) => {
        if (event.target.closest("button") || event.target.closest("input")) return;
        window.desktop.toggleMaximize();
      });
    }

    window.desktop
      .isMaximized()
      .then((maximized) => document.body.classList.toggle("maximized", maximized));
    window.desktop.onMaximizedChange((maximized) =>
      document.body.classList.toggle("maximized", maximized),
    );
  }

  view.addEventListener("did-start-loading", () => {
    progress.classList.add("loading");
    offline.hidden = true;
  });

  view.addEventListener("did-stop-loading", () => {
    progress.classList.remove("loading");
  });

  view.addEventListener("did-navigate", (event) => {
    lastUrl = event.url;
    updateActive(event.url);
    refreshShellData();
  });

  view.addEventListener("did-navigate-in-page", (event) => {
    lastUrl = event.url;
    updateActive(event.url);
    refreshShellData();
  });

  view.addEventListener("dom-ready", () => {
    syncThemeToView(true);
    updateActive(view.getURL());
    refreshShellData();
  });

  view.addEventListener("did-fail-load", (event) => {
    if (!event.isMainFrame || event.errorCode === -3) return;
    offlineUrl.textContent = event.validatedURL || lastUrl;
    offline.hidden = false;
  });

  window.setInterval(() => {
    if (!document.hidden) refreshShellData();
  }, 30000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshShellData();
  });

  applySidebar();
  applyTheme(currentTheme, false);
  applyRole("guest");
  updateUserUI(null);
  updateActive(resolve(startPath));
  view.src = resolve(startPath);
})();
