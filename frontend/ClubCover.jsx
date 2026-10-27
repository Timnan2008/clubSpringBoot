import React from "react";
import { coverParts } from "./club-cover.mjs";
import "./ClubCover.css";

// Typographic cover for clubs without their own logo. Decorative layers are hidden;
// the accessible name is the club name the caller passes in.
export default function ClubCover({ club, name, variant = "tile", className = "" }) {
  const { hue, pattern, glyph, script, seal, number, inscription } = coverParts(club, name);
  return (
    <div
      className={`club-cover club-cover-${variant} ${className}`}
      style={{ "--cover-hue": hue }}
      data-pattern={pattern}
      data-script={script}
      data-length={Math.min(Array.from(glyph).length, 3)}
      role="img"
      aria-label={name}
    >
      <span className="club-cover-glyph" aria-hidden="true">
        {glyph}
      </span>
      <span className="club-cover-seal" aria-hidden="true">
        {seal}
      </span>
      {number && (
        <span className="club-cover-number" aria-hidden="true">
          {number}
        </span>
      )}
      {variant === "hero" && inscription && (
        <span className="club-cover-vertical" lang="zh-CN" aria-hidden="true">
          {inscription}
        </span>
      )}
    </div>
  );
}
