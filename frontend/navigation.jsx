import React from "react";
import { createRoot } from "react-dom/client";
import StaggeredMenu from "./StaggeredMenu";
import Search from "./Search";
import "./navigation.css";
const navbar = document.querySelector(".navbar");
if (navbar) {
  const language = navbar.dataset.language || "zh",
    en = language === "en";
  const items = [
    { label: en ? "Home" : "首页", link: "/" },
    { label: en ? "Campus wall" : "校园墙", link: "/page/wall" },
    { label: en ? "Messages" : "站内私信", link: "/page/messages" },
    {
      label: en ? "Creativity" : "创造类社团",
      link: "/page/club-type/creativity",
    },
    { label: en ? "Activity" : "活动类社团", link: "/page/club-type/activity" },
    { label: en ? "Service" : "服务类社团", link: "/page/club-type/service" },
    { label: en ? "Study" : "学术类社团", link: "/page/club-type/study" },
    { label: en ? "Badminton booking" : "羽毛球场预约", link: "/page/booking" },
    { label: en ? "QingYuan Studio" : "青源智造", link: "/page/suggestion" },
  ];
  navbar
    .querySelectorAll(".user-dropdown .dropdown-content a")
    .forEach((a) =>
      items.push({
        label: a.textContent.trim(),
        link: a.getAttribute("href") === "/page/club/manage" ? "/page/club/workspace" : a.getAttribute("href"),
        action: a.getAttribute("href") === "#" ? "logout" : undefined,
      }),
    );
  const login = navbar.querySelector(".navbar-login-btn");
  const nav = navbar.querySelector(".navbar-links");
  if (login && nav) nav.append(login);
  if (login)
    items.push({
      label: en ? "Sign in / Register" : "登录 / 注册",
      link: "/page/user/login",
    });
  const search = navbar.querySelector(".navbar-center");
  if (search) createRoot(search).render(<Search en={en} />);
  const menu = document.createElement("div");
  menu.className = "navbar-menu-host";
  navbar.append(menu);
  const langLink = (lang) => {
    const next = new URL(location.href);
    next.searchParams.set("lang", lang);
    return next.pathname + next.search;
  };
  createRoot(menu).render(
    <StaggeredMenu
      language={language}
      items={items}
      colors={["#c9b6de", "#7543a3"]}
      displaySocials
      socialItems={[
        { label: "中文", link: langLink("zh") },
        { label: "English", link: langLink("en") },
      ]}
    />,
  );
  navbar.classList.add("navbar-enhanced");
}

window.addEventListener("pageshow", event => { if(event.persisted) location.reload(); });

import './CampusMotion.css';
