import { Hono } from "hono";
import type { Env } from "../env";
import { authOptional, requireAuth, requireCsrf } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { jsonOk, badRequest } from "../util/http";
import { geminiGenerateJSON } from "../util/gemini";

/**
 * AI Provider (Gemini 2.0 Flash).
 * - Ingredients → recipe
 * - Image key → recipe (client uploads image first, then references key)
 * - Surprise → random creative recipe
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
  title: z.string().min(1).max(120),
  category: z.string().min(1).max(40),
  description: z.string().max(1000).optional(),
  ingredients: z.array(z.string().min(1).max(160)).min(1).max(60),
  steps: z.array(z.string().min(1).max(400)).min(1).max(25),
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
  const body = c.req.valid("json");

  const system = `You are an expert Ninja CREAMi recipe developer.
Return ONLY valid JSON matching this schema:
{
  "title": string (3-120 chars),
  "category": string (2-40 chars),
  "description": string (optional, max 1000 chars),
  "ingredients": string[] (3-60 items),
  "steps": string[] (3-25 items),
  "notes": string[] (optional, max 10 items),
  "allergens": string[] (optional, max 10 items)
}
Include clear CREAMi-specific instructions (freeze time, respin notes, mix-ins). Avoid unsafe food advice.`;

  const userPrompt = `Create a ${body.category} CREAMi recipe using these ingredients: ${body.ingredients.join(", ")}.
Dietary restrictions: ${(body.dietary ?? []).join(", ") || "none"}.
Creativity level: ${body.creativity}.`;

  try {
    const recipe = await geminiGenerateJSON<any>({
      apiKey: c.env.GEMINI_API_KEY,
      system,
      user: userPrompt
    });

    const parsed = RecipeSchema.safeParse(recipe);
    if (!parsed.success) {
      return c.json(badRequest("Model output did not match schema", parsed.error.flatten()), 400);
    }

    return c.json(jsonOk({ ok: true, recipe: parsed.data }));
  } catch (err: any) {
    return c.json(badRequest(err.message || "AI generation failed"), 400);
  }
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
Return ONLY valid JSON matching this schema:
{
  "title": string (3-120 chars),
  "category": string (2-40 chars),
  "description": string (optional, max 1000 chars),
  "ingredients": string[] (3-60 items),
  "steps": string[] (3-25 items),
  "notes": string[] (optional, max 10 items),
  "allergens": string[] (optional, max 10 items)
}
First infer reasonable ingredients from the image; then propose a recipe in the requested category.
Avoid unsafe food advice.`;

  const userPrompt = `Generate a ${category} CREAMi recipe based on this photo of ingredients.`;

  try {
    const recipe = await geminiGenerateJSON<any>({
      apiKey: c.env.GEMINI_API_KEY,
      system,
      user: userPrompt,
      image: { mimeType: contentType, base64: b64 }
    });

    const parsed = RecipeSchema.safeParse(recipe);
    if (!parsed.success) return c.json(badRequest("Model output did not match schema", parsed.error.flatten()), 400);

    return c.json(jsonOk({ ok: true, recipe: parsed.data }));
  } catch (err: any) {
    return c.json(badRequest(err.message || "AI generation failed"), 400);
  }
});

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// Categories for random "Surprise Me" generation
const SURPRISE_CATEGORIES = ["Ice Cream", "Gelato", "Sorbet", "Slushie", "Creamy", "Decadent"];
const SURPRISE_THEMES = [
  "classic vanilla bean with a twist",
  "chocolate lovers dream",
  "tropical fruit paradise",
  "peanut butter cup indulgence",
  "cookies and cream explosion",
  "salted caramel delight",
  "berry blast summer treat",
  "coffee shop inspired",
  "birthday cake celebration",
  "mint chocolate chip refresh",
  "banana foster homage",
  "key lime pie tribute",
  "maple pecan autumn vibes",
  "s'mores campfire classic",
  "strawberry cheesecake swirl"
];

router.post("/surprise", async (c) => {
  const category = SURPRISE_CATEGORIES[Math.floor(Math.random() * SURPRISE_CATEGORIES.length)];
  const theme = SURPRISE_THEMES[Math.floor(Math.random() * SURPRISE_THEMES.length)];

  const system = `You are an expert Ninja CREAMi recipe developer.
Return ONLY valid JSON matching this schema:
{
  "title": string (3-120 chars, creative and fun),
  "category": string (2-40 chars),
  "description": string (optional, max 1000 chars),
  "ingredients": string[] (3-60 items with quantities),
  "steps": string[] (3-25 items),
  "notes": string[] (optional, max 10 items),
  "allergens": string[] (optional, max 10 items)
}
Include clear CREAMi-specific instructions (freeze time, respin notes, mix-ins). Be creative and fun!`;

  const userPrompt = `Create an amazing ${category} CREAMi recipe with the theme: "${theme}". 
Be creative with the name and ingredients! Make it sound delicious and fun.`;

  try {
    const recipe = await geminiGenerateJSON<any>({
      apiKey: c.env.GEMINI_API_KEY,
      system,
      user: userPrompt
    });

    const parsed = RecipeSchema.safeParse(recipe);
    if (!parsed.success) {
      return c.json(badRequest("Model output did not match schema", parsed.error.flatten()), 400);
    }

    return c.json(jsonOk({ ok: true, recipe: parsed.data }));
  } catch (err: any) {
    return c.json(badRequest(err.message || "AI generation failed"), 400);
  }
});

export default router;
