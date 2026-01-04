import React from "react";

export function NinjaStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.25l1.6 5.2 5.4-2.6-2.6 5.4 5.2 1.6-5.2 1.6 2.6 5.4-5.4-2.6-1.6 5.2-1.6-5.2-5.4 2.6 2.6-5.4-5.2-1.6 5.2-1.6-2.6-5.4 5.4 2.6L12 2.25zm0 7.1a2.65 2.65 0 100 5.3 2.65 2.65 0 000-5.3z" />
    </svg>
  );
}
