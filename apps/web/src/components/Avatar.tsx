import React from "react";
import { API_BASE } from "../lib/api";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | number;

const sizeMap: Record<Exclude<AvatarSize, number>, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 96
};

export function Avatar({
  avatarKey,
  handle,
  name,
  size = "sm",
  className = ""
}: {
  avatarKey?: string | null;
  handle?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
}) {
  const displayName = name || handle || "?";
  const pixelSize = typeof size === "number" ? size : sizeMap[size];
  const fontSize = pixelSize < 32 ? "text-xs" : pixelSize < 48 ? "text-sm" : "text-base";

  const initials = displayName
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
        alt={displayName}
        width={pixelSize}
        height={pixelSize}
        className={`rounded-full border border-slate-700 object-cover ${className}`}
        style={{ width: pixelSize, height: pixelSize }}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`grid place-items-center rounded-full border border-slate-700 bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 ${fontSize} font-semibold text-slate-200 ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
      aria-label={displayName}
      title={displayName}
    >
      {initials}
    </div>
  );
}
