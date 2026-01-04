import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../env";
import { zValidator } from "@hono/zod-validator";
import { hashPassword, newId, randomToken, sha256Base64url, verifyPassword } from "../util/crypto";
import { all, first, run } from "../db/sql";
import { badRequest, jsonOk, unauthorized } from "../util/http";
import { serializeCookie } from "../util/cookies";
import { authOptional, requireAuth, requireCsrf } from "../middleware/auth";
import { requireTurnstile } from "../middleware/turnstile";

const router = new Hono<{ Bindings: Env }>();

const RegisterSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(40),
  handle: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  turnstileToken: z.string().optional()
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  turnstileToken: z.string().optional()
});

function cookieOpts(env: Env) {
  const isLocal = env.COOKIE_DOMAIN === "localhost";
  return {
    httpOnly: true,
    secure: !isLocal,
    sameSite: "Lax" as const,
    path: "/",
    domain: isLocal ? undefined : env.COOKIE_DOMAIN,
    maxAge: 60 * 60 * 24 * 30 // 30d
  };
}

router.post("/register", requireTurnstile(), zValidator("json", RegisterSchema), async (c) => {
  const { email, password, displayName, handle } = c.req.valid("json");

  const exists = await first<{ id: string }>(c.env, "SELECT id FROM users WHERE email = ? OR handle = ?", [email.toLowerCase(), handle]);
  if (exists) return c.json(badRequest("Email or handle already in use"), 400);

  const userId = newId("usr");
  const passwordHash = await hashPassword(password);

  await run(
    c.env,
    "INSERT INTO users (id, email, password_hash, display_name, handle) VALUES (?, ?, ?, ?, ?)",
    [userId, email.toLowerCase(), passwordHash, displayName, handle]
  );

  // Create session
  const session = await createSession(c.env, userId);
  const setCookie = serializeCookie("cn_session", session.token, cookieOpts(c.env));
  const csrfCookie = serializeCookie("cn_csrf", session.csrfToken, { ...cookieOpts(c.env), httpOnly: false });

  return c.json(
    jsonOk({ ok: true, user: await getUser(c.env, userId), csrfToken: session.csrfToken }),
    200,
    { "Set-Cookie": [setCookie, csrfCookie] as any }
  );
});

router.post("/login", requireTurnstile(), zValidator("json", LoginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const user = await first<{ id: string; password_hash: string }>(c.env, "SELECT id, password_hash FROM users WHERE email = ?", [email.toLowerCase()]);
  if (!user) return c.json(unauthorized("Invalid credentials"), 401);

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return c.json(unauthorized("Invalid credentials"), 401);

  const session = await createSession(c.env, user.id);
  const setCookie = serializeCookie("cn_session", session.token, cookieOpts(c.env));
  const csrfCookie = serializeCookie("cn_csrf", session.csrfToken, { ...cookieOpts(c.env), httpOnly: false });

  return c.json(
    jsonOk({ ok: true, user: await getUser(c.env, user.id), csrfToken: session.csrfToken }),
    200,
    { "Set-Cookie": [setCookie, csrfCookie] as any }
  );
});

router.post("/logout", authOptional, requireAuth, requireCsrf, async (c) => {
  const cookies = (c.req.header("cookie") || "").toString();
  // best effort delete: clear cookie + delete session by token hash
  const token = cookies.split(";").map((x) => x.trim()).find((x) => x.startsWith("cn_session="))?.split("=")[1];
  if (token) {
    const tokenHash = await sha256Base64url(decodeURIComponent(token));
    await run(c.env, "DELETE FROM sessions WHERE token_hash = ?", [tokenHash]);
  }

  const clearSession = serializeCookie("cn_session", "", { ...cookieOpts(c.env), maxAge: 0 });
  const clearCsrf = serializeCookie("cn_csrf", "", { ...cookieOpts(c.env), httpOnly: false, maxAge: 0 });

  return c.json(jsonOk({ ok: true }), 200, { "Set-Cookie": [clearSession, clearCsrf] as any });
});

router.get("/me", authOptional, async (c) => {
  const user = c.get("user");
  const sess = c.get("session");
  if (!user || !sess) return c.json(jsonOk({ ok: true, user: null }), 200);
  return c.json(jsonOk({ ok: true, user, csrfToken: sess.csrfToken }), 200);
});

async function createSession(env: Env, userId: string) {
  const token = randomToken(32);
  const tokenHash = await sha256Base64url(token);
  const csrfToken = randomToken(16);
  const sessionId = newId("ses");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await run(env, "INSERT INTO sessions (id, user_id, token_hash, csrf_token, expires_at) VALUES (?, ?, ?, ?, ?)", [
    sessionId,
    userId,
    tokenHash,
    csrfToken,
    expiresAt
  ]);
  return { id: sessionId, token, csrfToken, expiresAt };
}

async function getUser(env: Env, userId: string) {
  return await first<{ id: string; email: string; displayName: string; handle: string; avatarKey: string | null; createdAt: string }>(
    env,
    `SELECT id, email, display_name as displayName, handle, avatar_key as avatarKey, created_at as createdAt
     FROM users WHERE id = ?`,
    [userId]
  );
}

export default router;
