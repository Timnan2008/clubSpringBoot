(function () {
  const baseUrl =
    new URLSearchParams(location.search).get("url") || "https://qpwflhsclub.com/";
  const view = document.getElementById("club-view");
  const progress = document.getElementById("progress");
  const offline = document.getElementById("offline");
  const offlineUrl = document.getElementById("offline-url");
  const pageLabel = document.getElementById("page-label");
  const backBtn = document.getElementById("nav-back");
  const forwardBtn = document.getElementById("nav-forward");
  const reloadBtn = document.getElementById("nav-reload");
  const retryBtn = document.getElementById("retry");
  const accountAction = document.getElementById("account-action");
  const searchForm = document.getElementById("app-search");
  const searchInput = document.getElementById("app-search-input");
  const navItems = Array.from(document.querySelectorAll(".nav-item"));

  const ROLE_LEVEL = {
    guest: 0,
    student: 0,
    president: 1,
    vice_president: 1,
    teacher: 2,
    admin: 3,
  };

  let lastUrl = baseUrl;
  let currentRole = "guest";

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
      return path === "" ? "/page/index" : path;
    } catch {
      return "";
    }
  }

  function updateActive(url) {
    const path = normalizePath(url);
    let best = null;
    let bestLength = -1;

    for (const item of navItems) {
      for (const match of (item.dataset.match || "").split(/\s+/)) {
        if (!match) continue;
        const hit = path === match || path.startsWith(match + "/");
        if (hit && match.length > bestLength) {
          best = item;
          bestLength = match.length;
        }
      }
    }

    for (const item of navItems) item.classList.toggle("active", item === best);
    const label = best ? best.dataset.label : "青浦世外社团";
    pageLabel.textContent = label;
    document.title = best ? label + " · 青浦世外社团" : "青浦世外社团";
  }

  function updateToolbar() {
    try {
      backBtn.disabled = !view.canGoBack();
      forwardBtn.disabled = !view.canGoForward();
    } catch {
      backBtn.disabled = true;
      forwardBtn.disabled = true;
    }
  }

  function applyRole(roleName) {
    currentRole = ROLE_LEVEL[roleName] === undefined ? "guest" : roleName;
    accountAction.textContent =
      currentRole === "guest" ? "登录 / 注册" : "退出登录";
    const level = ROLE_LEVEL[currentRole] ?? 0;
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

  async function refreshRole() {
    try {
      const data = await view.executeJavaScript(
        "fetch('/api/campus-social/me',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).catch(()=>null)",
        true,
      );
      applyRole(data && data.account ? data.account.role : "guest");
    } catch {
      applyRole("guest");
    }
  }

  for (const item of navItems) {
    item.addEventListener("click", () => {
      const url = resolve(item.dataset.path || "/page/index");
      lastUrl = url;
      offline.hidden = true;
      view.loadURL(url).catch(() => {});
    });
  }

  backBtn.addEventListener("click", () => {
    if (view.canGoBack()) view.goBack();
  });

  forwardBtn.addEventListener("click", () => {
    if (view.canGoForward()) view.goForward();
  });

  reloadBtn.addEventListener("click", () => view.reload());

  retryBtn.addEventListener("click", () => {
    offline.hidden = true;
    view.loadURL(lastUrl || baseUrl).catch(() => {});
  });

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const keyword = searchInput.value.trim();
    if (!keyword) return;
    const url = resolve(
      `/page/search?keyword=${encodeURIComponent(keyword)}&lang=zh`,
    );
    lastUrl = url;
    offline.hidden = true;
    view.loadURL(url).catch(() => {});
  });

  accountAction.addEventListener("click", () => {
    if (currentRole === "guest") {
      const url = resolve("/page/user/login");
      lastUrl = url;
      offline.hidden = true;
      view.loadURL(url).catch(() => {});
      return;
    }
    view
      .executeJavaScript(
        "fetch('/api/user/logout').finally(()=>{location.href='/page/user/login'})",
      )
      .catch(() => {});
  });

  const winMin = document.getElementById("win-min");
  const winMax = document.getElementById("win-max");
  const winClose = document.getElementById("win-close");

  if (window.desktop) {
    winMin.addEventListener("click", () => window.desktop.minimize());
    winMax.addEventListener("click", () => window.desktop.toggleMaximize());
    winClose.addEventListener("click", () => window.desktop.close());

    document.querySelector(".titlebar").addEventListener("dblclick", (event) => {
      if (event.target.closest("button")) return;
      window.desktop.toggleMaximize();
    });

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
    updateToolbar();
  });

  view.addEventListener("did-navigate", (event) => {
    lastUrl = event.url;
    updateActive(event.url);
    updateToolbar();
  });

  view.addEventListener("did-navigate-in-page", (event) => {
    lastUrl = event.url;
    updateActive(event.url);
    updateToolbar();
  });

  view.addEventListener("dom-ready", () => {
    updateActive(view.getURL());
    updateToolbar();
    refreshRole();
  });

  view.addEventListener("page-title-updated", (event) => {
    if (!navItems.some((item) => item.classList.contains("active"))) {
      pageLabel.textContent = event.title || "青浦世外社团";
    }
  });

  view.addEventListener("did-fail-load", (event) => {
    if (!event.isMainFrame || event.errorCode === -3) return;
    offlineUrl.textContent = event.validatedURL || lastUrl;
    offline.hidden = false;
  });

  applyRole("guest");
  updateActive(baseUrl);
  updateToolbar();
  view.src = baseUrl;
})();
