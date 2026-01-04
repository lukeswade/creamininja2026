import { Hono } from "hono";
import type { Env } from "../env";
import { authOptional, requireAuth, requireCsrf } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { jsonOk, badRequest } from "../util/http";

/**
 * AI Provider (OpenAI Responses API).
 * - Ingredients → recipe
 * - Image key → recipe (client uploads image first, then references key)
 *
 * Output uses a strict JSON schema to reduce malformed responses.
 */
const router = new Hono<{ Bindings: Env }>();
router.use("*", authOptional, requireAuth, requireCsrf);

// basic per-user throttling
router.use(
  "*",
  rateLimit((c) => `ai:${c.get("user").id}`, 20, 60_000) // 20 requests/min/user
);

const RecipeSchema = z.object({
  title: z.string().min(3).max(120),
  category: z.string().min(2).max(40),
  description: z.string().max(1000).optional(),
  ingredients: z.array(z.string().min(1).max(160)).min(3).max(60),
  steps: z.array(z.string().min(1).max(400)).min(3).max(25),
  notes: z.array(z.string().min(1).max(200)).max(10).optional(),
  allergens: z.array(z.string().min(1).max(40)).max(10).optional()
});

const GenFromIngredients = z.object({
  ingredients: z.array(z.string().min(1).max(80)).min(1).max(80),
  category: z.string().min(2).max(40),
  dietary: z.array(z.string().min(1).max(40)).max(10).optional(),
  creativity: z.enum(["safe", "balanced", "wild"]).default("balanced")
});

router.post("/from-ingredients", zValidator("json", GenFromIngredients), async (c) => {
  const me = c.get("user");
  const body = c.req.valid("json");

  const system = `You are an expert Ninja CREAMi recipe developer.
Return ONLY valid JSON matching the provided schema.
Include clear CREAMi-specific instructions (freeze time, respin notes, mix-ins). Avoid unsafe food advice.`;

  const prompt = {
    user: {
      ingredients: body.ingredients,
      category: body.category,
      dietary: body.dietary ?? [],
      creativity: body.creativity
    }
  };

  const recipe = await callOpenAIRecipe(c.env, system, JSON.stringify(prompt));
  const parsed = RecipeSchema.safeParse(recipe);
  if (!parsed.success) {
    return c.json(badRequest("Model output did not match schema", parsed.error.flatten()), 400);
  }

  return c.json(jsonOk({ ok: true, recipe: parsed.data }));
});

const GenFromImage = z.object({
  imageKey: z.string().min(1).max(500),
  category: z.string().min(2).max(40)
});

router.post("/from-image", zValidator("json", GenFromImage), async (c) => {
  const { imageKey, category } = c.req.valid("json");

  const obj = await c.env.UPLOADS.get(imageKey);
  if (!obj) return c.json(badRequest("Image not found. Upload first."), 400);

  const contentType = obj.httpMetadata?.contentType || "image/jpeg";
  const bytes = await obj.arrayBuffer();
  if (bytes.byteLength > 2_500_000) return c.json(badRequest("Image too large (max ~2.5MB). Compress client-side."), 400);

  const b64 = arrayBufferToBase64(bytes);

  const system = `You are an expert Ninja CREAMi recipe developer.
Return ONLY valid JSON matching the provided schema.
First infer reasonable ingredients from the image; then propose a recipe in the requested category.
Avoid unsafe food advice.`;

  const input = [
    {
      role: "user",
      content: [
        { type: "input_text", text: `Generate a ${category} CREAMi recipe. The user provided a photo of ingredients.` },
        { type: "input_image", image_url: `data:${contentType};base64,${b64}` }
      ]
    }
  ];

  const recipe = await callOpenAIRecipeWithInput(c.env, system, input);
  const parsed = RecipeSchema.safeParse(recipe);
  if (!parsed.success) return c.json(badRequest("Model output did not match schema", parsed.error.flatten()), 400);

  return c.json(jsonOk({ ok: true, recipe: parsed.data }));
});

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function callOpenAIRecipe(env: Env, system: string, userText: string) {
  // Responses API: see docs. We request structured outputs by asking for JSON matching schema.
  // (If your account has "structured outputs" parameter support, you can enhance this endpoint later.)
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-5-mini",
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        { role: "user", content: [{ type: "input_text", text: userText }] }
      ],
      // Encourage JSON-only outputs
      text: { format: { type: "json_object" } }
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI error: ${JSON.stringify(data)}`);

  const text = extractOutputText(data);
  return JSON.parse(text);
}

async function callOpenAIRecipeWithInput(env: Env, system: string, input: any[]) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-5-mini",
      input: [{ role: "system", content: [{ type: "input_text", text: system }] }, ...input],
      text: { format: { type: "json_object" } }
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI error: ${JSON.stringify(data)}`);

  const text = extractOutputText(data);
  return JSON.parse(text);
}

function extractOutputText(resp: any): string {
  // Responses API returns output array; we pull first text content.
  const out = resp.output ?? [];
  for (const item of out) {
    if (item.type === "message") {
      for (const c of item.content || []) {
        if (c.type === "output_text" && typeof c.text === "string") return c.text;
      }
    }
  }
  throw new Error("No output_text in response");
}

export default router;
