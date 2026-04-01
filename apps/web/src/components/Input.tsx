import React from "react";
import clsx from "clsx";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      className={clsx(
        "w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner backdrop-blur-sm transition-all",
        "focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/30 focus:bg-slate-900/80",
        className
      )}
      {...rest}
    />
  );
}
