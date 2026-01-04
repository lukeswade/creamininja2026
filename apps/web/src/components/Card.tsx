import React from "react";
import clsx from "clsx";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("rounded-xl border border-slate-800 bg-slate-950/60 p-4", className)}>{children}</div>;
}
