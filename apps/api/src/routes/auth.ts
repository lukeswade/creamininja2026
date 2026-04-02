import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../env";
import { zValidator } from "@hono/zod-validator";
import { hashPassword, newId, randomToken, sha256Base64url, verifyPassword } from "../util/crypto";
import { first, run } from "../db/sql";
import { badRequest, jsonOk, unauthorized } from "../util/http";
import { serializeCookie } from "../util/cookies";
import { authOptional, requireAuth, requireCsrf } from "../middleware/auth";
import { requireTurnstile } from "../middleware/turnstile";

const router = new Hono<{ Bindings: Env }>();
const OAUTH_STATE_COOKIE = "cn_oauth_state";

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

router.get("/google", async (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return c.json(badRequest("Google OAuth is not configured."), 400);
  }

  const state = randomToken(16);
  const redirectUri = `${new URL(c.req.url).origin}/auth/google/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const stateCookie = serializeCookie(OAUTH_STATE_COOKIE, state, { ...cookieOpts(c.env), httpOnly: true, maxAge: 600 });
  const headers = new Headers({ Location: authUrl.toString() });
  headers.append("Set-Cookie", stateCookie);
  return new Response(null, { status: 302, headers });
});

router.get("/google/callback", async (c) => {
  try {
    const code = c.req.query("code");
    const state = c.req.query("state");
  const stateCookie = readCookie(c.req.header("cookie") || "", OAUTH_STATE_COOKIE);

    if (!code || !state || !stateCookie || stateCookie !== state) {
      return c.json(unauthorized("Invalid OAuth state"), 401);
    }

    const clientId = c.env.GOOGLE_CLIENT_ID;
    const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return c.json(badRequest("Google OAuth is not configured."), 400);
    }

    const redirectUri = `${new URL(c.req.url).origin}/auth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenRes.ok) {
      return c.json(badRequest("Google OAuth failed."), 400);
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) return c.json(badRequest("Google OAuth failed."), 400);

    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    if (!profileRes.ok) return c.json(badRequest("Google profile fetch failed."), 400);

    const profile = (await profileRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };

    if (!profile.sub || !profile.email) {
      return c.json(badRequest("Google profile missing required fields."), 400);
    }
    if (profile.email_verified === false) {
      return c.json(badRequest("Google account email is not verified."), 400);
    }

    const email = profile.email.toLowerCase();
    let userId: string | null = null;

    const existingOauth = await first<{ user_id: string }>(
      c.env,
      "SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?",
      ["google", profile.sub]
    );
    if (existingOauth) userId = existingOauth.user_id;

    if (!userId) {
      const existingUser = await first<{ id: string }>(c.env, "SELECT id FROM users WHERE email = ?", [email]);
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const handleBase = normalizeHandle(email);
        const handle = await uniqueHandle(c.env, handleBase);
        const passwordHash = await hashPassword(randomToken(20));
        userId = newId("usr");
        await run(
          c.env,
          "INSERT INTO users (id, email, password_hash, display_name, handle) VALUES (?, ?, ?, ?, ?)",
          [userId, email, passwordHash, profile.name || handle, handle]
        );
      }

      await run(
        c.env,
        "INSERT INTO oauth_accounts (id, provider, provider_user_id, user_id, email) VALUES (?, ?, ?, ?, ?)",
        [newId("oauth"), "google", profile.sub, userId, email]
      );
    }

    if (!userId) return c.json(badRequest("Google sign-in failed."), 400);

    const session = await createSession(c.env, userId);
    const setCookie = serializeCookie("cn_session", session.token, cookieOpts(c.env));
    const csrfCookie = serializeCookie("cn_csrf", session.csrfToken, { ...cookieOpts(c.env), httpOnly: false });
    const clearState = serializeCookie(OAUTH_STATE_COOKIE, "", { ...cookieOpts(c.env), httpOnly: true, maxAge: 0 });

    const dest = new URL("/feed", c.env.APP_ORIGIN).toString();
    const headers = new Headers({ Location: dest });
    headers.append("Set-Cookie", setCookie);
    headers.append("Set-Cookie", csrfCookie);
    headers.append("Set-Cookie", clearState);
    return new Response(null, { status: 302, headers });
  } catch (err: any) {
    console.error("google_oauth_callback_error", err);
    return c.json(badRequest(err?.message || "Google OAuth failed."), 400);
  }
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

function readCookie(rawCookie: string, name: string) {
  const cookies = rawCookie.split(";").map((x) => x.trim());
  const hit = cookies.find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.split("=")[1]) : null;
}

function normalizeHandle(email: string) {
  const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "");
  const padded = base.length >= 3 ? base : `${base}ninja`;
  return padded.slice(0, 18);
}

async function uniqueHandle(env: Env, base: string) {
  let handle = base.slice(0, 20);
  for (let i = 0; i < 50; i++) {
    const exists = await first<{ id: string }>(env, "SELECT id FROM users WHERE handle = ?", [handle]);
    if (!exists) return handle;
    const suffix = String(i + 1);
    const prefix = base.slice(0, 20 - suffix.length);
    handle = `${prefix}${suffix}`;
  }
  throw new Error("Unable to allocate unique handle");
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
