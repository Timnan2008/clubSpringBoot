import React from "react";
import { createRoot } from "react-dom/client";
import AppShell from "./AppShell";
import "./shell.css";

const host = document.getElementById("desktop-shell");
if (host) {
  const dashboard = host.dataset.mode === "dashboard";
  if (dashboard || window.clubDesktop) {
    const source = document.getElementById("desktop-announcements");
    const announcements = Array.from(
      source?.content.querySelectorAll("[data-notice]") || [],
      (row) => {
        const text = row.textContent.trim();
        const match = text.match(/^(?:【([^】]+)】|\[([^\]]+)\])\s*(.*)$/);
        return {
          id: row.dataset.notice,
          type: match?.[1] || match?.[2] || "",
          title: match?.[3] || text,
        };
      },
    ).filter(({ title }) => title);
    if (!dashboard) document.body.classList.add("desk-legacy");
    if (window.clubDesktop) document.body.setAttribute("data-club-desktop-frame", "");
    createRoot(host).render(<AppShell dashboard={dashboard} announcements={announcements} />);
  }
}
