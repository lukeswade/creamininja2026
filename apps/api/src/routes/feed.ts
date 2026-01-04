import { Hono } from "hono";
import type { Env } from "../env";
import { authOptional } from "../middleware/auth";
import { all } from "../db/sql";
import { jsonOk } from "../util/http";

const router = new Hono<{ Bindings: Env }>();

function recipeSelect(viewerId: string | null): { sql: string; params: any[] } {
  // Use parameterized query to prevent SQL injection
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

router.get("/network", authOptional, async (c) => {
  const viewer = c.get("user")?.id ?? null;

  if (!viewer) return c.json(jsonOk({ ok: true, items: [] }), 200);

  const window = (c.req.query("window") || "week").toLowerCase();
  const sort = (c.req.query("sort") || "time").toLowerCase(); // time, stars, spicy

  const dt = windowToSql(window);
  const base = recipeSelect(viewer);

  // Determine ORDER BY based on sort
  let orderBy: string;
  let extraWhere = "";
  if (sort === "spicy") {
    // Trending: most stars in past 24 hours (approximate via recent + stars)
    orderBy = "ORDER BY r.stars_count DESC, r.created_at DESC";
    extraWhere = `AND r.created_at >= datetime('now','-1 day')`;
  } else if (sort === "stars") {
    orderBy = "ORDER BY r.stars_count DESC, r.created_at DESC";
  } else {
    // time (chronological)
    orderBy = "ORDER BY r.created_at DESC";
  }

  const items = await all<any>(
    c.env,
    `${base.sql}
     WHERE
       (r.visibility = 'public')
       OR (r.author_id = ?)
       OR (r.visibility = 'restricted' AND EXISTS(
            SELECT 1 FROM friendships f WHERE f.user_id = ? AND f.friend_id = r.author_id
         ))
       OR (r.visibility = 'private' AND EXISTS(
            SELECT 1 FROM recipe_shares rs WHERE rs.recipe_id = r.id AND rs.shared_with_user_id = ?
         ))
     AND r.created_at >= ${dt}
     ${extraWhere}
     ${orderBy}
     LIMIT 50`,
    [...base.params, viewer, viewer, viewer]
  );

  return c.json(jsonOk({ ok: true, items: items.map(normalize) }));
});

router.get("/popular", authOptional, async (c) => {
  const viewer = c.get("user")?.id ?? null;
  const window = (c.req.query("window") || "week").toLowerCase();
  const sort = (c.req.query("sort") || "stars").toLowerCase(); // stars, time, spicy

  const dt = windowToSql(window);
  const base = recipeSelect(viewer);

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

  // Determine ORDER BY based on sort
  let orderBy: string;
  let extraWhere = "";
  if (sort === "spicy") {
    // Trending: most stars in past 24 hours
    orderBy = "ORDER BY r.stars_count DESC, r.created_at DESC";
    extraWhere = `AND r.created_at >= datetime('now','-1 day')`;
  } else if (sort === "time") {
    orderBy = "ORDER BY r.created_at DESC";
  } else {
    // stars (default)
    orderBy = "ORDER BY r.stars_count DESC, r.created_at DESC";
  }

  const visibilityParams = viewer ? [viewer, viewer, viewer] : [];

  const items = await all<any>(
    c.env,
    `${base.sql}
     WHERE ${visibilityWhere}
       AND r.created_at >= ${dt}
       ${extraWhere}
     ${orderBy}
     LIMIT 50`,
    [...base.params, ...visibilityParams]
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
