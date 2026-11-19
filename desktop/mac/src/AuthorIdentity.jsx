import React from "react";
import "./AuthorIdentity.css";

// Same public role and server-assigned badge rules as frontend/SocialPost.jsx,
// AdminBadge.jsx and TeacherDay.jsx; anonymous authors never show these fields.
export default function AuthorIdentity({ person, anonymous = false, anonymousLabel = "匿名同学" }) {
  const hidden = anonymous || person?.role === "anonymous";
  const role =
    person?.role === "president"
      ? [person.clubName, person.position === "vice_president" ? "副社长" : "社长"]
          .filter(Boolean)
          .join(" · ")
      : { student: "学生", teacher: "教师" }[person?.role];
  const badges = Array.isArray(person?.badges) ? person.badges : [];
  return (
    <span className="author-identity">
      <strong>{hidden ? anonymousLabel : person?.name || person?.nameEn || "校园同学"}</strong>
      {!hidden && (
        <>
          {person?.role === "admin" ? (
            <span className="author-admin-badge">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="m2 5 3 2 3-4 3 4 3-2-1.2 7H3.2L2 5Zm2 8h8" />
              </svg>
              <span>超级管理员</span>
            </span>
          ) : role ? (
            <span className="author-role">{role}</span>
          ) : null}
          {badges.includes("teacher-day-2026") && (
            <span className="author-holiday-badge">✦ 2026 教师节限定</span>
          )}
          {badges.includes("male-bestie") && (
            <span className="author-exclusive-badge" title="专属限定标签，不可移除">
              <span aria-hidden="true">✦</span> 男闺蜜
            </span>
          )}
        </>
      )}
    </span>
  );
}
