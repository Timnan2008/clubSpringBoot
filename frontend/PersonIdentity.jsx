import React from "react";
import AdminBadge from "./AdminBadge";
import { en } from "./language";
import { realNames, postName, searchName } from "./person-names.mjs";
import "./PersonIdentity.css";
export { realNames, postName };
export default function PersonIdentity({ person, english = en, query }) {
  const matched = searchName(person, query);
  const role = {
    teacher: ["教师", "Teacher"],
    admin: ["学生", "Student"],
    student: ["学生", "Student"],
    president: ["学生 · 社团负责人", "Student · Club leader"],
    member: ["学生", "Student"],
  }[person?.role];
  return (
    <span className="person-identity">
      <strong className="person-real-names">{matched.text}</strong>
      {matched.field !== "nickname" && person?.nickname?.trim() && (
        <small className="person-nickname">@{person.nickname.trim()}</small>
      )}
      <small className="person-identity-meta">
        {person?.role === "admin" && (
          <>
            <AdminBadge person={person} />
            {" · "}
          </>
        )}
        {[role?.[english ? 1 : 0], person?.grade].filter(Boolean).join(" · ")}
      </small>
    </span>
  );
}
