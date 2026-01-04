import { createMiddleware } from "hono/factory";
import type { Env } from "../env";

/**
 * Lightweight in-memory rate limit (per isolate). Works as a basic safety net.
 * For production-grade enforcement, upgrade to Durable Objects or KV-based counters.
 */
const buckets = new Map<string, { resetAt: number; count: number }>();

export const rateLimit = (keyFn: (c: any) => string, limit: number, windowMs: number) =>
  createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const key = keyFn(c);
    const now = Date.now();
    const cur = buckets.get(key);
    if (!cur || cur.resetAt < now) {
      buckets.set(key, { resetAt: now + windowMs, count: 1 });
      return next();
    }
    if (cur.count >= limit) {
      return c.json({ ok: false, error: { message: "Rate limit exceeded" } }, 429);
    }
    cur.count += 1;
    return next();
  });
