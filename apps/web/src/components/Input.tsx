import React from "react";
import clsx from "clsx";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      className={clsx(
        "w-full rounded-2xl glass-input px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 outline-none",
        className
      )}
      {...rest}
    />
  );
}
