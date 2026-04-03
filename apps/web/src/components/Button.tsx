import React from "react";
import clsx from "clsx";

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "secondary" }
) {
  const { variant = "primary", className, ...rest } = props;
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 active:scale-[0.97] backdrop-blur-md",
        "focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" && "bg-white/90 text-slate-900 shadow-glass-sm hover:bg-white hover:shadow-glass border border-white/40",
        variant === "secondary" && "bg-white/10 text-slate-100 border border-white/20 shadow-glass-sm hover:bg-white/20",
        variant === "ghost" && "bg-transparent text-slate-200 hover:bg-white/10",
        variant === "danger" && "bg-red-500/20 text-red-100 border border-red-500/30 hover:bg-red-500/40 shadow-glass-sm",
        className
      )}
      {...rest}
    />
  );
}
