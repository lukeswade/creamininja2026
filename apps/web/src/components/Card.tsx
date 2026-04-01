import React from "react";
import clsx from "clsx";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-white/10 bg-slate-900/40 p-5 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}
