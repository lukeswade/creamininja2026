import { Hono } from "hono";
import type { Env } from "../env";
import { authOptional, requireAuth, requireCsrf } from "../middleware/auth";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { newId } from "../util/crypto";
import { jsonOk, notFound, forbidden, badRequest } from "../util/http";
import { AwsClient } from "aws4fetch";
import { first, run } from "../db/sql";

/**
 * Upload flow:
 * 1) Client requests POST /uploads/presign with { kind: 'avatar'|'recipe', contentType }
 * 2) API returns { key, url, headers }
 * 3) Client PUTs file to presigned URL
 * 4) Client saves key on profile or recipe create/update
 *
 * Storage is private. Access is served via /uploads/file/:key (proxy + auth rules).
 */

const router = new Hono<{ Bindings: Env }>();
router.use("*", authOptional, requireAuth, requireCsrf);

const PresignSchema = z.object({
  kind: z.enum(["avatar", "recipe"]),
  contentType: z.string().min(3).max(80),
  bytes: z.number().int().min(1).max(2_500_000)
});

router.post("/presign", zValidator("json", PresignSchema), async (c) => {
  const me = c.get("user");
  const { kind, contentType, bytes } = c.req.valid("json");

  if (!/^image\/(jpeg|png|webp)$/.test(contentType)) return c.json(badRequest("Only jpeg/png/webp supported"), 400);

  const ext = contentType.includes("jpeg") ? "jpg" : contentType.split("/")[1];
  const key = `${kind}/${me.id}/${newId("img")}.${ext}`;

  // R2 presigned URLs use AWS SigV4; we generate via aws4fetch.
  // Requires R2 API credentials (Access Key + Secret) as secrets/vars; but we avoid exposing them by signing in Worker.
  // For simplicity, we use the "R2 binding" + S3 endpoint signing.
  //
  // IMPORTANT: You must create R2 API tokens (S3) in Cloudflare and store:
  // - R2_ACCESS_KEY_ID (secret)
  // - R2_SECRET_ACCESS_KEY (secret)
  // - R2_ENDPOINT (var) e.g. https://<accountid>.r2.cloudflarestorage.com
  //
  // If you prefer not to use presigned URLs, you can implement multipart upload through the Worker instead.
  const endpoint = (c.env as any).R2_ENDPOINT as string | undefined;
  const accessKeyId = (c.env as any).R2_ACCESS_KEY_ID as string | undefined;
  const secretAccessKey = (c.env as any).R2_SECRET_ACCESS_KEY as string | undefined;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return c.json(
      badRequest(
        "Missing R2 S3 credentials. Add vars/secrets: R2_ENDPOINT (var), R2_ACCESS_KEY_ID (secret), R2_SECRET_ACCESS_KEY (secret)."
      ),
      400
    );
  }

  const bucket = (c.env as any).R2_BUCKET_NAME || "creamininja-uploads";
  const url = new URL(`${endpoint.replace(/\/$/, "")}/${bucket}/${key}`);

  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    region: "auto",
    service: "s3"
  });

  // Create a presigned URL (PUT) good for 10 minutes.
  const signed = await client.sign(url.toString(), {
    method: "PUT",
    headers: {
      "content-type": contentType,
      "content-length": String(bytes)
    },
    aws: { signQuery: true, expires: 600 }
  });

  return c.json(jsonOk({ ok: true, key, url: signed.url, headers: { "content-type": contentType } }));
});

const AvatarUpdateSchema = z.object({ avatarKey: z.string().min(1).max(500).nullable() });

router.post("/set-avatar", zValidator("json", AvatarUpdateSchema), async (c) => {
  const me = c.get("user");
  const { avatarKey } = c.req.valid("json");
  await run(c.env, "UPDATE users SET avatar_key = ?, updated_at=datetime('now') WHERE id = ?", [avatarKey, me.id]);
  return c.json(jsonOk({ ok: true }));
});

router.get("/file/:key{.+}", authOptional, requireAuth, async (c) => {
  const me = c.get("user");
  const key = c.req.param("key");

  // Enforce access:
  // - avatar/*: if the avatar belongs to me OR belongs to a friend
  // - recipe/*: only if key is referenced by a recipe the user can view OR recipe author (or public)
  if (key.startsWith("avatar/")) {
    const ownerId = key.split("/")[1];
    if (ownerId === me.id) return await streamR2(c, key);
    const friend = await first<{ user_id: string }>(c.env, "SELECT user_id FROM friendships WHERE user_id = ? AND friend_id = ?", [me.id, ownerId]);
    if (!friend) return c.json(forbidden(), 403);
    return await streamR2(c, key);
  }

  if (key.startsWith("recipe/")) {
    // find recipe referencing this key
    const r = await first<{ id: string; author_id: string; visibility: string }>(
      c.env,
      "SELECT id, author_id, visibility FROM recipes WHERE image_key = ?",
      [key]
    );
    if (!r) return c.json(notFound(), 404);
    const can = await canViewRecipe(c.env, me.id, r.id, r.author_id, r.visibility);
    if (!can) return c.json(forbidden(), 403);
    return await streamR2(c, key);
  }

  return c.json(forbidden(), 403);
});

async function streamR2(c: any, key: string) {
  const obj = await c.env.UPLOADS.get(key);
  if (!obj) return c.json(notFound(), 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=3600");
  return new Response(obj.body, { headers });
}

async function canViewRecipe(env: Env, viewerId: string, recipeId: string, authorId: string, visibility: string) {
  if (authorId === viewerId) return true;
  if (visibility === "public") return true;
  if (visibility === "restricted") {
    const f = await first<{ user_id: string }>(env, "SELECT user_id FROM friendships WHERE user_id = ? AND friend_id = ?", [viewerId, authorId]);
    return !!f;
  }
  const share = await first<{ id: string }>(env, "SELECT id FROM recipe_shares WHERE recipe_id = ? AND shared_with_user_id = ?", [recipeId, viewerId]);
  return !!share;
}

export default router;
