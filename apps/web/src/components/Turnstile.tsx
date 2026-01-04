import React from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: any) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

async function ensureTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return;
  if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;

  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(s);
  });
}

export function Turnstile({
  siteKey,
  onToken
}: {
  siteKey?: string;
  onToken: (token: string) => void;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const widgetId = React.useRef<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function mount() {
      if (!siteKey) {
        // Allow local/dev bypass when backend TURNSTILE_BYPASS=true
        onToken("dev");
        return;
      }
      try {
        await ensureTurnstileScript();
        if (cancelled) return;
        if (!ref.current) return;
        if (!window.turnstile?.render) throw new Error("Turnstile unavailable");

        // Render only once
        if (widgetId.current) return;
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme: "dark",
          callback: (token: string) => onToken(token),
          "error-callback": () => setErr("Verification failed. Please retry."),
          "expired-callback": () => {
            onToken("");
            try {
              window.turnstile?.reset(widgetId.current || undefined);
            } catch {}
          }
        });
      } catch (e: any) {
        setErr(e?.message || "Turnstile error");
      }
    }

    mount();
    return () => {
      cancelled = true;
    };
  }, [siteKey, onToken]);

  return (
    <div className="grid gap-2">
      <div ref={ref} />
      {err && <div className="text-xs text-red-200">{err}</div>}
    </div>
  );
}
