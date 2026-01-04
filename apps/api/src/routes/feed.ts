import { Hono } from "hono";
import type { Env } from "../env";
import { authOptional } from "../middleware/auth";
import { all } from "../db/sql";
import { jsonOk } from "../util/http";

const router = new Hono<{ Bindings: Env }>();

function recipeSelect(viewerId: string | null) {
  const starredJoin = viewerId
    ? `LEFT JOIN stars s ON s.recipe_id = r.id AND s.user_id = '${viewerId.replace(/'/g, "''")}'`
    : `LEFT JOIN stars s ON 1=0`;
  return `
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
    ${starredJoin}
  `;
}

router.get("/network", authOptional, async (c) => {
  const viewer = c.get("user")?.id ?? null;

  if (!viewer) return c.json(jsonOk({ ok: true, items: [] }), 200);

  const items = await all<any>(
    c.env,
    `${recipeSelect(viewer)}
     WHERE
       (r.visibility = 'public')
       OR (r.author_id = ?)
       OR (r.visibility = 'restricted' AND EXISTS(
            SELECT 1 FROM friendships f WHERE f.user_id = ? AND f.friend_id = r.author_id
         ))
       OR (r.visibility = 'private' AND EXISTS(
            SELECT 1 FROM recipe_shares rs WHERE rs.recipe_id = r.id AND rs.shared_with_user_id = ?
         ))
     ORDER BY r.created_at DESC
     LIMIT 50`,
    [viewer, viewer, viewer]
  );

  return c.json(jsonOk({ ok: true, items: items.map(normalize) }));
});

router.get("/popular", authOptional, async (c) => {
  const viewer = c.get("user")?.id ?? null;
  const window = (c.req.query("window") || "week").toLowerCase();

  const dt = windowToSql(window);
  // Popular feed includes: viewer-visible recipes + public recipes
  // (If not logged in, public only).
  const visibilityWhere = viewer
    ? `
      (
        r.visibility = 'public'
        OR (r.author_id = ?)
        OR (r.visibility = 'restricted' AND EXISTS(
             SELECT 1 FROM friendships f WHERE f.user_id = ? AND f.friend_id = r.author_id
           ))
        OR (r.visibility = 'private' AND EXISTS(
             SELECT 1 FROM recipe_shares rs WHERE rs.recipe_id = r.id AND rs.shared_with_user_id = ?
           ))
      )
    `
    : `(r.visibility = 'public')`;

  const params = viewer ? [viewer, viewer, viewer] : [];

  const items = await all<any>(
    c.env,
    `${recipeSelect(viewer)}
     WHERE ${visibilityWhere}
       AND r.created_at >= ${dt}
     ORDER BY r.stars_count DESC, r.created_at DESC
     LIMIT 50`,
    params
  );

  return c.json(jsonOk({ ok: true, items: items.map(normalize) }));
});

function windowToSql(win: string) {
  switch (win) {
    case "day":
      return "datetime('now','-1 day')";
    case "week":
      return "datetime('now','-7 day')";
    case "month":
      return "datetime('now','-30 day')";
    case "all":
    default:
      return "datetime('now','-3650 day')";
  }
}

function normalize(row: any) {
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

export default router;
