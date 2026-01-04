import React from "react";
import clsx from "clsx";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      className={clsx(
        "w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
        "focus:outline-none focus:ring-2 focus:ring-slate-400/30",
        className
      )}
      {...rest}
    />
  );
}
