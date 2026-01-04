import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

import type { Env } from "../env";
import { authOptional, requireAuth, requireCsrf } from "../middleware/auth";
import { all, first, run } from "../db/sql";
import { badRequest, forbidden, jsonOk, notFound } from "../util/http";
import { newId } from "../util/crypto";

type AuthedUser = {
  id: string;
  handle: string;
  displayName: string;
  avatarKey: string | null;
};

type HonoVars = {
  user?: AuthedUser;
  secureHeadersNonce?: string;
};

const router = new Hono<{ Bindings: Env; Variables: HonoVars }>();

/**
 * Visibility rules:
 * - author always sees own
 * - public: everyone
 * - restricted: friends of author
 * - private: only author, or explicitly shared via recipe_shares
 */
async function canView(env: Env, viewerId: string | null, recipeId: string): Promise<boolean> {
  const recipe = await first<{ author_id: string; visibility: string }>(
    env,
    "SELECT author_id, visibility FROM recipes WHERE id = ?",
    [recipeId]
  );
  if (!recipe) return false;

  if (viewerId && recipe.author_id === viewerId) return true;
  if (recipe.visibility === "public") return true;
  if (!viewerId) return false;

  if (recipe.visibility === "restricted") {
    const f = await first<{ user_id: string }>(
      env,
      "SELECT user_id FROM friendships WHERE user_id = ? AND friend_id = ?",
      [viewerId, recipe.author_id]
    );
    return !!f;
  }

  // private
  const share = await first<{ id: string }>(
    env,
    "SELECT id FROM recipe_shares WHERE recipe_id = ? AND shared_with_user_id = ?",
    [recipeId, viewerId]
  );
  return !!share;
}

function recipeSelect(viewerId: string | null): { sql: string; params: any[] } {
  // include whether viewer starred
  if (viewerId) {
    return {
      sql: `
        SELECT
          r.id, r.title, r.description, r.category, r.visibility,
          r.ingredients_json as ingredientsJson,
          r.steps_json as stepsJson,
          r.image_key as imageKey,
          r.stars_count as starsCount,
          r.created_at as createdAt,
          r.updated_at as updatedAt,
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
        r.ingredients_json as ingredientsJson,
        r.steps_json as stepsJson,
        r.image_key as imageKey,
        r.stars_count as starsCount,
        r.created_at as createdAt,
        r.updated_at as updatedAt,
        u.id as authorId,
        u.display_name as authorDisplayName,
        u.handle as authorHandle,
        u.avatar_key as authorAvatarKey,
        0 as viewerStarred
      FROM recipes r
      JOIN users u ON u.id = r.author_id
      LEFT JOIN stars s ON 1=0
    `,
    params: []
  };
}

router.get("/:id", authOptional, async (c) => {
  const id = c.req.param("id");
  const viewer = c.get("user")?.id ?? null;

  const ok = await canView(c.env, viewer, id);
  if (!ok) return c.json(forbidden(), 403);

  const base = recipeSelect(viewer);
  const row = await first<any>(c.env, `${base.sql} WHERE r.id = ?`, [...base.params, id]);
  if (!row) return c.json(notFound(), 404);

  return c.json(jsonOk({ ok: true, recipe: normalize(row) }));
});

router.get("/by-handle/:handle", authOptional, async (c) => {
  const handle = c.req.param("handle");
  const viewer = c.get("user")?.id ?? null;

  // viewer can see public, their own, restricted if friends, or shared.
  const base = recipeSelect(viewer);

  const sql = `
    ${base.sql}
    WHERE u.handle = ?
      AND (
        r.visibility = 'public'
        OR ( ? IS NOT NULL AND r.author_id = ? )
        OR ( ? IS NOT NULL AND r.visibility='restricted' AND EXISTS(
             SELECT 1 FROM friendships f WHERE f.user_id = ? AND f.friend_id = r.author_id
           ))
        OR ( ? IS NOT NULL AND r.visibility='private' AND EXISTS(
             SELECT 1 FROM recipe_shares rs WHERE rs.recipe_id = r.id AND rs.shared_with_user_id = ?
           ))
      )
    ORDER BY r.created_at DESC
    LIMIT 50
  `;

  // IMPORTANT: This must match the number of ? placeholders above (7 in WHERE),
  // plus optional 1 from recipeSelect(viewer) join param.
  const params = [
    ...base.params,
    handle,
    viewer,
    viewer,
    viewer,
    viewer,
    viewer,
    viewer
  ];

  const rows = await all<any>(c.env, sql, params);

  return c.json(jsonOk({ ok: true, recipes: rows.map(normalize) }));
});

// Protected endpoints
router.use("*", authOptional, requireAuth, requireCsrf);

const RecipeCreateSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(1000).optional().nullable(),
  category: z.string().min(2).max(40),
  visibility: z.enum(["private", "restricted", "public"]),
  ingredients: z.array(z.string().min(1).max(160)).min(1).max(80),
  steps: z.array(z.string().min(1).max(400)).min(1).max(40),
  imageKey: z.string().max(500).optional().nullable()
});

router.post("/", zValidator("json", RecipeCreateSchema), async (c) => {
  const me = c.get("user")!;
  const body = c.req.valid("json");

  const id = newId("rcp");
  await run(
    c.env,
    `INSERT INTO recipes
      (id, author_id, title, description, category, visibility, ingredients_json, steps_json, image_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      me.id,
      body.title,
      body.description ?? null,
      body.category,
      body.visibility,
      JSON.stringify(body.ingredients),
      JSON.stringify(body.steps),
      body.imageKey ?? null
    ]
  );

  const base = recipeSelect(me.id);
  const row = await first<any>(c.env, `${base.sql} WHERE r.id = ?`, [...base.params, id]);
  return c.json(jsonOk({ ok: true, recipe: normalize(row) }));
});

const RecipeUpdateSchema = RecipeCreateSchema.partial().extend({ id: z.string().optional() });

router.patch("/:id", zValidator("json", RecipeUpdateSchema), async (c) => {
  const me = c.get("user")!;
  const id = c.req.param("id");

  const current = await first<{ author_id: string }>(c.env, "SELECT author_id FROM recipes WHERE id = ?", [id]);
  if (!current) return c.json(notFound(), 404);
  if (current.author_id !== me.id) return c.json(forbidden(), 403);

  const body = c.req.valid("json");
  const fields: string[] = [];
  const params: any[] = [];

  if (body.title !== undefined) {
    fields.push("title = ?");
    params.push(body.title);
  }
  if (body.description !== undefined) {
    fields.push("description = ?");
    params.push(body.description);
  }
  if (body.category !== undefined) {
    fields.push("category = ?");
    params.push(body.category);
  }
  if (body.visibility !== undefined) {
    fields.push("visibility = ?");
    params.push(body.visibility);
  }
  if (body.ingredients !== undefined) {
    fields.push("ingredients_json = ?");
    params.push(JSON.stringify(body.ingredients));
  }
  if (body.steps !== undefined) {
    fields.push("steps_json = ?");
    params.push(JSON.stringify(body.steps));
  }
  if (body.imageKey !== undefined) {
    fields.push("image_key = ?");
    params.push(body.imageKey);
  }

  if (!fields.length) return c.json(badRequest("No fields to update"), 400);

  fields.push("updated_at = datetime('now')");

  await run(c.env, `UPDATE recipes SET ${fields.join(", ")} WHERE id = ?`, [...params, id]);

  const base = recipeSelect(me.id);
  const row = await first<any>(c.env, `${base.sql} WHERE r.id = ?`, [...base.params, id]);
  return c.json(jsonOk({ ok: true, recipe: normalize(row) }));
});

router.delete("/:id", async (c) => {
  const me = c.get("user")!;
  const id = c.req.param("id");

  const current = await first<{ author_id: string }>(c.env, "SELECT author_id FROM recipes WHERE id = ?", [id]);
  if (!current) return c.json(notFound(), 404);
  if (current.author_id !== me.id) return c.json(forbidden(), 403);

  await run(c.env, "DELETE FROM recipes WHERE id = ?", [id]);
  return c.json(jsonOk({ ok: true }));
});

const ShareSchema = z.object({ toUserId: z.string().min(1) });

router.post("/:id/share", zValidator("json", ShareSchema), async (c) => {
  const me = c.get("user")!;
  const id = c.req.param("id");
  const { toUserId } = c.req.valid("json");

  const recipe = await first<{ author_id: string; visibility: string }>(
    c.env,
    "SELECT author_id, visibility FROM recipes WHERE id = ?",
    [id]
  );
  if (!recipe) return c.json(notFound(), 404);
  if (recipe.author_id !== me.id) return c.json(forbidden("Only author can share"), 403);

  const shareId = newId("shr");
  await run(
    c.env,
    "INSERT OR IGNORE INTO recipe_shares (id, recipe_id, shared_with_user_id, shared_by_user_id) VALUES (?, ?, ?, ?)",
    [shareId, id, toUserId, me.id]
  );
  return c.json(jsonOk({ ok: true }));
});

const StarSchema = z.object({});

router.post("/:id/star", zValidator("json", StarSchema), async (c) => {
  const me = c.get("user")!;
  const id = c.req.param("id");

  const ok = await canView(c.env, me.id, id);
  if (!ok) return c.json(forbidden(), 403);

  // insert star then increment counter if actually inserted
  const res = await c.env.DB.prepare("INSERT OR IGNORE INTO stars (user_id, recipe_id) VALUES (?, ?)")
    .bind(me.id, id)
    .run();

  if (res.meta.changes && res.meta.changes > 0) {
    await run(c.env, "UPDATE recipes SET stars_count = stars_count + 1 WHERE id = ?", [id]);
  }

  return c.json(jsonOk({ ok: true }));
});

router.delete("/:id/star", async (c) => {
  const me = c.get("user")!;
  const id = c.req.param("id");

  const del = await c.env.DB.prepare("DELETE FROM stars WHERE user_id = ? AND recipe_id = ?")
    .bind(me.id, id)
    .run();

  if (del.meta.changes && del.meta.changes > 0) {
    await run(
      c.env,
      "UPDATE recipes SET stars_count = CASE WHEN stars_count > 0 THEN stars_count - 1 ELSE 0 END WHERE id = ?",
      [id]
    );
  }

  return c.json(jsonOk({ ok: true }));
});

function normalize(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    visibility: row.visibility,
    ingredients: safeParseJsonArray(row.ingredientsJson ?? "[]"),
    steps: safeParseJsonArray(row.stepsJson ?? "[]"),
    imageKey: row.imageKey,
    starsCount: row.starsCount,
    viewerStarred: !!row.viewerStarred,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: {
      id: row.authorId,
      displayName: row.authorDisplayName,
      handle: row.authorHandle,
      avatarKey: row.authorAvatarKey
    }
  };
}

function safeParseJsonArray(s: string) {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default router;
