import { createMiddleware } from "hono/factory";
import type { Env } from "../env";
import { badRequest } from "../util/http";

export const requireTurnstile = (opts?: { field?: string }) =>
  createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const bypass = c.env.TURNSTILE_BYPASS === "true";
    if (bypass) return next();

    const field = opts?.field ?? "turnstileToken";
    const body = await c.req.json().catch(() => null);
    const token = body?.[field];
    if (!token || typeof token !== "string") return c.json(badRequest("Missing Turnstile token"), 400);

    const form = new FormData();
    form.append("secret", c.env.TURNSTILE_SECRET_KEY);
    form.append("response", token);
    // Optional: form.append("remoteip", ...)

    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const data = (await resp.json()) as { success: boolean; ["error-codes"]?: string[] };

    if (!data.success) return c.json(badRequest("Turnstile verification failed", data["error-codes"]), 400);
    return next();
  });
