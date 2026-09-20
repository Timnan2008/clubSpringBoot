import React from "react";
import { createRoot } from "react-dom/client";
import AdminBadge from "../AdminBadge";
import PersonIdentity from "../PersonIdentity";
import "../PublicProfile.css";
createRoot(document.getElementById("badge-preview")).render(
  <section
    style={{ padding: 32, background: "#09090b", color: "#fafafa", fontFamily: "sans-serif" }}
  >
    <h2>超级管理员</h2>
    <div className="profile-home-tags">
      <AdminBadge person={{ role: "admin" }} />
    </div>
    <PersonIdentity person={{ role: "admin", name: "CARBON", grade: "G11" }} />
    <div data-student>
      <AdminBadge person={{ role: "student" }} />
    </div>
  </section>,
);
