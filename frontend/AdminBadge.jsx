import { tx } from "./language";
import "./AdminBadge.css";
export default function AdminBadge({ person, className = "" }) {
  if (person?.role !== "admin") return null;
  return (
    <span className={`admin-badge ${className}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="m2 5 3 2 3-4 3 4 3-2-1.2 7H3.2L2 5Zm2 8h8" />
      </svg>
      <span>{tx("超级管理员", "Super admin")}</span>
    </span>
  );
}
