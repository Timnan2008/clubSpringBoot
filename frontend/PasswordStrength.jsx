import React from "react";
import { tx } from "./language";
import "./PasswordStrength.css";

export function passwordChecks(value) {
  return [value.length >= 8 && value.length <= 128];
}

export default function PasswordStrength({ value }) {
  const checks = passwordChecks(value);
  const score = checks.filter(Boolean).length;
  return (
    <div className="password-strength">
      <div
        role="meter"
        aria-label={tx("密码长度", "Password length")}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={score}
        className="password-strength-bars"
      >
        {checks.map((v, i) => (
          <i key={i} data-met={v} />
        ))}
      </div>
      <div className="password-strength-checks">
        <span data-met={checks[0]}>
          {checks[0] ? "✓" : "○"} {tx("8–128 位", "8–128 characters")}
        </span>
      </div>
    </div>
  );
}
