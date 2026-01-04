import React from "react";
import clsx from "clsx";

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }
) {
  const { variant = "primary", className, ...rest } = props;
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition",
        "focus:outline-none focus:ring-2 focus:ring-slate-400/30 disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" && "bg-slate-100 text-slate-950 hover:bg-white",
        variant === "ghost" && "bg-transparent text-slate-100 hover:bg-slate-800",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-500",
        className
      )}
      {...rest}
    />
  );
}
