import React from "react";
import { API_BASE } from "../lib/api";

export function Avatar({
  avatarKey,
  name,
  size = 28,
  className = ""
}: {
  avatarKey?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

  if (avatarKey) {
    return (
      <img
        src={`${API_BASE}/uploads/file/${encodeURIComponent(avatarKey)}`}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full border border-slate-800 object-cover ${className}`}
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`grid place-items-center rounded-full border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-200 ${className}`}
      style={{ width: size, height: size }}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  );
}
