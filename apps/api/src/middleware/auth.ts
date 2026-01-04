import { createMiddleware } from "hono/factory";
import type { Env } from "../env";
import { parseCookies } from "../util/cookies";
import { sha256Base64url } from "../util/crypto";
import { first } from "../db/sql";
import { unauthorized } from "../util/http";

export type AuthedVars = {
  user: { id: string; email: string; displayName: string; handle: string; avatarKey: string | null };
  session: { id: string; csrfToken: string };
};

export const authOptional = createMiddleware<{ Bindings: Env; Variables: Partial<AuthedVars> }>(async (c, next) => {
  const cookies = parseCookies(c.req.header("cookie") || null);
  const token = cookies["cn_session"];
  if (!token) return next();

  const tokenHash = await sha256Base64url(token);
  const row = await first<{
    session_id: string;
    csrf_token: string;
    expires_at: string;
    user_id: string;
    email: string;
    display_name: string;
    handle: string;
    avatar_key: string | null;
  }>(
    c.env,
    `SELECT s.id as session_id, s.csrf_token, s.expires_at,
            u.id as user_id, u.email, u.display_name, u.handle, u.avatar_key
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?`,
    [tokenHash]
  );

  if (!row) return next();
  if (new Date(row.expires_at).getTime() < Date.now()) return next();

  c.set("user", { id: row.user_id, email: row.email, displayName: row.display_name, handle: row.handle, avatarKey: row.avatar_key });
  c.set("session", { id: row.session_id, csrfToken: row.csrf_token });
  return next();
});

export const requireAuth = createMiddleware<{ Bindings: Env; Variables: AuthedVars }>(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json(unauthorized(), 401);
  return next();
});

export const requireCsrf = createMiddleware<{ Bindings: Env; Variables: AuthedVars }>(async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();

  const sess = c.get("session");
  const header = c.req.header("x-csrf-token") || "";
  if (!sess || !header || header !== sess.csrfToken) return c.json(unauthorized("Missing/invalid CSRF token"), 401);
  return next();
});
