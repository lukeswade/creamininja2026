import React from "react";
import clsx from "clsx";

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "secondary" }
) {
  const { variant = "primary", className, ...rest } = props;
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.97]",
        "focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" && "bg-slate-100 text-slate-950 shadow-md hover:bg-white hover:shadow-lg",
        variant === "secondary" && "bg-slate-800 text-slate-200 border border-white/5 shadow hover:bg-slate-700/80",
        variant === "ghost" && "bg-transparent text-slate-200 hover:bg-slate-800/60",
        variant === "danger" && "bg-red-500/10 text-red-500 hover:bg-red-500/20",
        className
      )}
      {...rest}
    />
  );
}
