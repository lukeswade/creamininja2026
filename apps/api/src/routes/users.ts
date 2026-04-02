import { Hono } from "hono";

import type { Env } from "../env";
import { all, first } from "../db/sql";
import { authOptional } from "../middleware/auth";
import { jsonOk, notFound } from "../util/http";

const router = new Hono<{ Bindings: Env }>();

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

export default router;
