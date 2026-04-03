import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

import type { Env } from "../env";
import { all, first, run } from "../db/sql";
import { authOptional, requireAuth, requireCsrf } from "../middleware/auth";
import { badRequest, jsonOk, notFound } from "../util/http";

const router = new Hono<{ Bindings: Env }>();
const UpdateMeSchema = z.object({
  displayName: z.string().min(2).max(40).optional(),
  avatarKey: z.string().min(1).max(500).nullable().optional(),
  bannerKey: z.string().min(1).max(500).nullable().optional()
});

function recipeSelect(viewerId: string | null): { sql: string; params: unknown[] } {
  if (viewerId) {
    return {
      sql: `
        SELECT
          r.id, r.title, r.description, r.category, r.visibility,
          r.image_key as imageKey,
          r.stars_count as starsCount,
          r.created_at as createdAt,
          u.id as authorId,
          u.display_name as authorDisplayName,
          u.handle as authorHandle,
          u.avatar_key as authorAvatarKey,
          CASE WHEN s.user_id IS NULL THEN 0 ELSE 1 END as viewerStarred
        FROM recipes r
        JOIN users u ON u.id = r.author_id
        LEFT JOIN stars s ON s.recipe_id = r.id AND s.user_id = ?
      `,
      params: [viewerId]
    };
  }

  return {
    sql: `
      SELECT
        r.id, r.title, r.description, r.category, r.visibility,
        r.image_key as imageKey,
        r.stars_count as starsCount,
        r.created_at as createdAt,
        u.id as authorId,
        u.display_name as authorDisplayName,
        u.handle as authorHandle,
        u.avatar_key as authorAvatarKey,
        0 as viewerStarred
      FROM recipes r
      JOIN users u ON u.id = r.author_id
    `,
    params: []
  };
}

function normalizeRecipe(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    visibility: row.visibility,
    imageKey: row.imageKey,
    starsCount: row.starsCount,
    viewerStarred: !!row.viewerStarred,
    createdAt: row.createdAt,
    author: {
      id: row.authorId,
      displayName: row.authorDisplayName,
      handle: row.authorHandle,
      avatarKey: row.authorAvatarKey
    }
  };
}

router.get("/:handle", authOptional, async (c) => {
  const handle = c.req.param("handle").replace(/^@/, "");
  const viewer = c.get("user")?.id ?? null;

  const profile = await first<{
    id: string;
    handle: string;
    displayName: string;
    avatarKey: string | null;
    bannerKey: string | null;
    createdAt: string;
    friendCount: number;
  }>(
    c.env,
    `
      SELECT
        u.id,
        u.handle,
        u.display_name as displayName,
        u.avatar_key as avatarKey,
        u.banner_key as bannerKey,
        u.created_at as createdAt,
        (
          SELECT COUNT(*)
          FROM friendships f
          WHERE f.user_id = u.id
        ) as friendCount
      FROM users u
      WHERE u.handle = ?
    `,
    [handle]
  );

  if (!profile) return c.json(notFound("User not found"), 404);

  const friendship = viewer
    ? await first<{ isFriend: number; isPending: number }>(
        c.env,
        `
          SELECT
            EXISTS(
              SELECT 1
              FROM friendships f
              WHERE f.user_id = ? AND f.friend_id = ?
            ) as isFriend,
            EXISTS(
              SELECT 1
              FROM friend_requests fr
              WHERE fr.from_user_id = ? AND fr.to_user_id = ? AND fr.status = 'pending'
            ) as isPending
        `,
        [viewer, profile.id, viewer, profile.id]
      )
    : null;

  const base = recipeSelect(viewer);
  const recipes = await all<any>(
    c.env,
    `
      ${base.sql}
      WHERE u.handle = ?
        AND (
          r.visibility = 'public'
          OR (? IS NOT NULL AND r.author_id = ?)
          OR (? IS NOT NULL AND r.visibility = 'restricted' AND EXISTS(
               SELECT 1
               FROM friendships f
               WHERE f.user_id = ? AND f.friend_id = r.author_id
             ))
          OR (? IS NOT NULL AND r.visibility = 'private' AND EXISTS(
               SELECT 1
               FROM recipe_shares rs
               WHERE rs.recipe_id = r.id AND rs.shared_with_user_id = ?
             ))
        )
      ORDER BY r.created_at DESC
      LIMIT 100
    `,
    [...base.params, handle, viewer, viewer, viewer, viewer, viewer, viewer]
  );

  return c.json(
    jsonOk({
      ok: true,
      user: profile,
      recipes: recipes.map(normalizeRecipe),
      friendCount: Number(profile.friendCount || 0),
      isFriend: !!friendship?.isFriend,
      isPending: !!friendship?.isPending
    })
  );
});

router.patch("/me", authOptional, requireAuth, requireCsrf, zValidator("json", UpdateMeSchema), async (c) => {
  const me = c.get("user");
  const body = c.req.valid("json");
  const updates: { col: string; val: unknown }[] = [];

  if (body.displayName !== undefined) {
    const trimmed = body.displayName.trim();
    if (!trimmed) return c.json(badRequest("Display name cannot be empty"), 400);
    updates.push({ col: "display_name", val: trimmed });
  }
  if (body.avatarKey !== undefined) {
    updates.push({ col: "avatar_key", val: body.avatarKey });
  }
  if (body.bannerKey !== undefined) {
    updates.push({ col: "banner_key", val: body.bannerKey });
  }

  if (updates.length === 0) return c.json(badRequest("No profile fields to update"), 400);

  const ALLOWED_COLUMNS = ["display_name", "avatar_key", "banner_key"];
  const setClause = updates
    .map((u) => {
      if (!ALLOWED_COLUMNS.includes(u.col)) throw new Error("Invalid column");
      return `${u.col} = ?`;
    })
    .join(", ");

  await run(c.env, `UPDATE users SET ${setClause}, updated_at = datetime('now') WHERE id = ?`, [
    ...updates.map((u) => u.val),
    me.id
  ]);

  const updated = await first<{
    id: string;
    email: string;
    displayName: string;
    handle: string;
    avatarKey: string | null;
    bannerKey: string | null;
    createdAt: string;
  }>(
    c.env,
    `SELECT
      id,
      email,
      display_name as displayName,
      handle,
      avatar_key as avatarKey,
      banner_key as bannerKey,
      created_at as createdAt
     FROM users
     WHERE id = ?`,
    [me.id]
  );

  return c.json(jsonOk({ ok: true, user: updated }));
});

export default router;
