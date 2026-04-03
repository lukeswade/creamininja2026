import React from "react";
import clsx from "clsx";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        "rounded-3xl glass-panel p-5 overflow-hidden transition-all duration-300",
        className
      )}
    >
      {children}
    </div>
  );
}
