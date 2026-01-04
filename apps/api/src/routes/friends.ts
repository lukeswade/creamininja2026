import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../env";
import { zValidator } from "@hono/zod-validator";
import { authOptional, requireAuth, requireCsrf } from "../middleware/auth";
import { all, first, run } from "../db/sql";
import { badRequest, jsonOk, notFound } from "../util/http";
import { newId } from "../util/crypto";

const router = new Hono<{ Bindings: Env }>();

router.use("*", authOptional, requireAuth, requireCsrf);

router.get("/", async (c) => {
  const me = c.get("user");
  const friends = await all<{ id: string; displayName: string; handle: string; avatarKey: string | null }>(
    c.env,
    `SELECT u.id, u.display_name as displayName, u.handle, u.avatar_key as avatarKey
     FROM friendships f
     JOIN users u ON u.id = f.friend_id
     WHERE f.user_id = ?
     ORDER BY u.display_name COLLATE NOCASE`,
    [me.id]
  );
  
  // Pending incoming requests
  const pending = await all<{ id: string; requestId: string; displayName: string; handle: string; avatarKey: string | null }>(
    c.env,
    `SELECT u.id, fr.id as requestId, u.display_name as displayName, u.handle, u.avatar_key as avatarKey
     FROM friend_requests fr
     JOIN users u ON u.id = fr.from_user_id
     WHERE fr.to_user_id = ? AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [me.id]
  );
  
  // Outgoing requests (sent by me, waiting for response)
  const outgoing = await all<{ id: string; requestId: string; displayName: string; handle: string; avatarKey: string | null }>(
    c.env,
    `SELECT u.id, fr.id as requestId, u.display_name as displayName, u.handle, u.avatar_key as avatarKey
     FROM friend_requests fr
     JOIN users u ON u.id = fr.to_user_id
     WHERE fr.from_user_id = ? AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [me.id]
  );
  
  return c.json(jsonOk({ ok: true, friends, pending, outgoing }));
});

// Search for users to add as friends
router.get("/search", async (c) => {
  const me = c.get("user");
  const q = (c.req.query("q") || "").trim();
  
  if (q.length < 2) {
    return c.json(jsonOk({ ok: true, users: [] }));
  }
  
  // Search by handle or display name, exclude self
  const users = await all<{ id: string; displayName: string; handle: string; avatarKey: string | null }>(
    c.env,
    `SELECT u.id, u.display_name as displayName, u.handle, u.avatar_key as avatarKey
     FROM users u
     WHERE u.id != ?
       AND (u.handle LIKE ? OR u.display_name LIKE ?)
     ORDER BY 
       CASE WHEN u.handle LIKE ? THEN 0 ELSE 1 END,
       u.display_name COLLATE NOCASE
     LIMIT 20`,
    [me.id, `%${q}%`, `%${q}%`, `${q}%`]
  );
  
  // Get friendship status for each user
  const friendIds = new Set(
    (await all<{ friend_id: string }>(c.env, "SELECT friend_id FROM friendships WHERE user_id = ?", [me.id])).map(r => r.friend_id)
  );
  
  const pendingOutgoing = new Set(
    (await all<{ to_user_id: string }>(c.env, "SELECT to_user_id FROM friend_requests WHERE from_user_id = ? AND status = 'pending'", [me.id])).map(r => r.to_user_id)
  );
  
  const pendingIncoming = new Set(
    (await all<{ from_user_id: string }>(c.env, "SELECT from_user_id FROM friend_requests WHERE to_user_id = ? AND status = 'pending'", [me.id])).map(r => r.from_user_id)
  );
  
  const results = users.map(u => ({
    ...u,
    status: friendIds.has(u.id) ? "friend" as const
          : pendingOutgoing.has(u.id) ? "pending_outgoing" as const
          : pendingIncoming.has(u.id) ? "pending_incoming" as const
          : "none" as const
  }));
  
  return c.json(jsonOk({ ok: true, users: results }));
});

router.get("/requests", async (c) => {
  const me = c.get("user");
  const incoming = await all<{ id: string; fromUserId: string; displayName: string; handle: string; createdAt: string }>(
    c.env,
    `SELECT fr.id, fr.from_user_id as fromUserId, u.display_name as displayName, u.handle, fr.created_at as createdAt
     FROM friend_requests fr
     JOIN users u ON u.id = fr.from_user_id
     WHERE fr.to_user_id = ? AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [me.id]
  );
  const outgoing = await all<{ id: string; toUserId: string; displayName: string; handle: string; createdAt: string }>(
    c.env,
    `SELECT fr.id, fr.to_user_id as toUserId, u.display_name as displayName, u.handle, fr.created_at as createdAt
     FROM friend_requests fr
     JOIN users u ON u.id = fr.to_user_id
     WHERE fr.from_user_id = ? AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [me.id]
  );
  return c.json(jsonOk({ ok: true, incoming, outgoing }));
});

const SendSchema = z.object({ handleOrEmail: z.string().min(3).max(254) });

router.post("/request", zValidator("json", SendSchema), async (c) => {
  const me = c.get("user");
  const { handleOrEmail } = c.req.valid("json");

  const target = await first<{ id: string }>(
    c.env,
    "SELECT id FROM users WHERE handle = ? OR email = ?",
    [handleOrEmail, handleOrEmail.toLowerCase()]
  );
  if (!target) return c.json(notFound("User not found"), 404);
  if (target.id === me.id) return c.json(badRequest("You cannot add yourself"), 400);

  // already friends?
  const already = await first<{ user_id: string }>(c.env, "SELECT user_id FROM friendships WHERE user_id = ? AND friend_id = ?", [me.id, target.id]);
  if (already) return c.json(badRequest("Already friends"), 400);

  // create or revive request
  const existing = await first<{ id: string; status: string }>(c.env, "SELECT id, status FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?", [
    me.id,
    target.id
  ]);

  if (existing) {
    if (existing.status === "pending") return c.json(badRequest("Request already pending"), 400);
    await run(c.env, "UPDATE friend_requests SET status='pending', updated_at=datetime('now') WHERE id = ?", [existing.id]);
    return c.json(jsonOk({ ok: true, requestId: existing.id }));
  }

  const id = newId("frq");
  await run(
    c.env,
    "INSERT INTO friend_requests (id, from_user_id, to_user_id, status) VALUES (?, ?, ?, 'pending')",
    [id, me.id, target.id]
  );
  return c.json(jsonOk({ ok: true, requestId: id }));
});

const ActSchema = z.object({ requestId: z.string().min(1) });

router.post("/accept", zValidator("json", ActSchema), async (c) => {
  const me = c.get("user");
  const { requestId } = c.req.valid("json");

  const fr = await first<{ id: string; from_user_id: string; to_user_id: string; status: string }>(
    c.env,
    "SELECT id, from_user_id, to_user_id, status FROM friend_requests WHERE id = ?",
    [requestId]
  );
  if (!fr || fr.to_user_id !== me.id) return c.json(notFound("Request not found"), 404);
  if (fr.status !== "pending") return c.json(badRequest("Request not pending"), 400);

  // transactional-ish: set accepted, create mutual friendships
  await run(c.env, "UPDATE friend_requests SET status='accepted', updated_at=datetime('now') WHERE id = ?", [requestId]);

  await run(c.env, "INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)", [me.id, fr.from_user_id]);
  await run(c.env, "INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)", [fr.from_user_id, me.id]);

  return c.json(jsonOk({ ok: true }));
});

router.post("/reject", zValidator("json", ActSchema), async (c) => {
  const me = c.get("user");
  const { requestId } = c.req.valid("json");

  const fr = await first<{ id: string; to_user_id: string; status: string }>(c.env, "SELECT id, to_user_id, status FROM friend_requests WHERE id = ?", [requestId]);
  if (!fr || fr.to_user_id !== me.id) return c.json(notFound("Request not found"), 404);
  if (fr.status !== "pending") return c.json(badRequest("Request not pending"), 400);

  await run(c.env, "UPDATE friend_requests SET status='rejected', updated_at=datetime('now') WHERE id = ?", [requestId]);
  return c.json(jsonOk({ ok: true }));
});

export default router;
