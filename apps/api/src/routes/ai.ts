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
  title: z.string().min(1).max(60),
  category: z.string().min(1).max(40),
  description: z.string().max(120),
  ingredients: z.array(z.string().min(1).max(120)).min(3).max(6),
  steps: z.array(z.string().min(1).max(280)).min(3).max(5),
  notes: z.array(z.string().min(1).max(160)).max(2).optional(),
  allergens: z.array(z.string().min(1).max(40)).max(3).optional()
});

const GenFromIngredients = z.object({
  ingredients: z.array(z.string().min(1).max(80)).min(1).max(80),
  category: z.string().min(2).max(40),
  dietary: z.array(z.string().min(1).max(40)).max(10).optional(),
  creativity: z.enum(["safe", "balanced", "wild"]).default("balanced"),
  isDeluxe: z.boolean().optional().default(false)
});

router.post("/from-ingredients", zValidator("json", GenFromIngredients), async (c) => {
  const body = c.req.valid("json");

  const deluxeInstruction = body.isDeluxe
    ? "The user is using a Ninja CREAMi Deluxe (24oz pint). You MUST scale all ingredients and macros for a massive 24oz yield, and you may utilize Deluxe-exclusive processing modes (like FRAPPE, FROZEN DRINK, SLUSHI, ITALIAN ICE, or CREAMICCINO)."
    : "The user is using a standard Ninja CREAMi (16oz pint). Keep ingredient measurements safely below the 16oz max fill line.";

  const validCategories = [...CORE_CATEGORIES, ...LIFESTYLE_CATEGORIES, ...(body.isDeluxe ? DELUXE_ONLY_CATEGORIES : [])];

  const system = `You are a Minimalist Chef and Ninja CREAMi expert. 
Tone: Professional, direct, no fluff.
${deluxeInstruction}
Return ONLY valid JSON:
{
  "title": string (engaging, 3-60 chars),
  "category": string (EXACTLY one of: ${validCategories.join(", ")}),
  "description": string (Nutritional summary only. MAX 120 chars. No flowery AI adjectives),
  "ingredients": string[] (3-6 items, precise),
  "steps": string[] (3-5 concise items),
  "notes": string[] (optional, max 2 items),
  "allergens": string[] (optional, max 3 items)
}
Hardware: 1) "Freeze 24h." 2) Specific Spin (e.g. LITE ICE CREAM). 3) Re-spin if needed.`;

  const userPrompt = `Create a ${body.category} CREAMi recipe using these ingredients: ${body.ingredients.join(", ")}.
Dietary restrictions: ${(body.dietary ?? []).join(", ") || "none"}.
Creativity level: ${body.creativity}.`;

  try {
    const recipe = await geminiGenerateJSON<any>({
      apiKey: c.env.GEMINI_API_KEY,
      system,
      user: userPrompt,
      maxOutputTokens: 1500,
      temperature: 0.6
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
  category: z.string().min(2).max(40),
  isDeluxe: z.boolean().optional().default(false)
});

router.post("/from-image", zValidator("json", GenFromImage), async (c) => {
  const { imageKey, category, isDeluxe } = c.req.valid("json");

  const obj = await c.env.UPLOADS.get(imageKey);
  if (!obj) return c.json(badRequest("Image not found. Upload first."), 400);

  const contentType = obj.httpMetadata?.contentType || "image/jpeg";
  const bytes = await obj.arrayBuffer();
  if (bytes.byteLength > 2_500_000) return c.json(badRequest("Image too large (max ~2.5MB). Compress client-side."), 400);

  const b64 = arrayBufferToBase64(bytes);

  const deluxeInstruction = isDeluxe
    ? "The user is using a Ninja CREAMi Deluxe (24oz pint). Scale ingredients for a 24oz yield. You can use Deluxe-exclusive processing modes like FRAPPE, FROZEN DRINK, SLUSHI, ITALIAN ICE, or CREAMICCINO."
    : "The user is using a standard Ninja CREAMi (16oz pint). Keep ingredients scaled for a 16oz max fill line.";

  const validCategories = [...CORE_CATEGORIES, ...LIFESTYLE_CATEGORIES, ...(isDeluxe ? DELUXE_ONLY_CATEGORIES : [])];

  const system = `You are a Minimalist Chef. Identify ingredients in the photo and invent a recipe.
Tone: Direct, professional, 0% fluff.
${deluxeInstruction}
Return ONLY valid JSON:
{
  "title": string (engaging, 3-60 chars),
  "category": string (EXACTLY one of: ${validCategories.join(", ")}),
  "description": string (Macros only. MAX 120 chars. No "escape to paradise" tropes),
  "ingredients": string[] (3-6 items),
  "steps": string[] (3-5 items),
  "notes": string[] (optional),
  "allergens": string[] (optional)
}
Hardware: 1) "Freeze 24h." 2) Specific Spin program.`;

  const userPrompt = `Generate a ${category} CREAMi recipe based on this photo of ingredients.`;

  try {
    const recipe = await geminiGenerateJSON<any>({
      apiKey: c.env.GEMINI_API_KEY,
      system,
      user: userPrompt,
      image: { mimeType: contentType, base64: b64 },
      maxOutputTokens: 1500,
      temperature: 0.6
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

const GenFromDescription = z.object({
  description: z.string().min(3).max(300),
  isDeluxe: z.boolean().optional().default(false)
});

router.post("/from-description", zValidator("json", GenFromDescription), async (c) => {
  const { description, isDeluxe } = c.req.valid("json");

  const deluxeInstruction = isDeluxe
    ? "The user is using a Ninja CREAMi Deluxe (24oz pint). Scale ingredients for a 24oz yield. You can use Deluxe-exclusive processing modes like FRAPPE, FROZEN DRINK, SLUSHI, ITALIAN ICE, or CREAMICCINO."
    : "The user is using a standard Ninja CREAMi (16oz pint). Keep ingredients scaled for a 16oz max capacity.";

  const validCategories = [...CORE_CATEGORIES, ...LIFESTYLE_CATEGORIES, ...(isDeluxe ? DELUXE_ONLY_CATEGORIES : [])];

  const system = `You are a Minimalist Chef. Architect a recipe from the craving.
Tone: Concise, technical, professional. 
${deluxeInstruction}
Return ONLY valid JSON:
{
  "title": string (3-60 chars),
  "category": string (EXACTLY one of: ${validCategories.join(", ")}),
  "description": string (Macros summary. MAX 120 chars. No marketing fluff),
  "ingredients": string[] (3-6 items),
  "steps": string[] (3-5 concise items),
  "notes": string[] (optional),
  "allergens": string[] (optional)
}
Hardware: 1) "Freeze 24h." 2) Specific Spin program.`;

  const userPrompt = `Create an incredible CREAMi recipe based on this exact description or craving: "${description}".`;

  try {
    const recipe = await geminiGenerateJSON<any>({
      apiKey: c.env.GEMINI_API_KEY,
      system,
      user: userPrompt,
      maxOutputTokens: 1500,
      temperature: 0.75
    });

    const parsed = RecipeSchema.safeParse(recipe);
    if (!parsed.success) return c.json(badRequest("Model output did not match schema", parsed.error.flatten()), 400);

    return c.json(jsonOk({ ok: true, recipe: parsed.data }));
  } catch (err: any) {
    return c.json(badRequest(err.message || "AI generation failed"), 400);
  }
});

// Categories that exactly match the UI dropdown <option> values
const CORE_CATEGORIES = ["Ice Cream", "Lite Ice Cream", "Protein Ice Cream", "Gelato", "Sorbet", "Smoothie Bowl", "Milkshake", "Slushie", "Frozen Yogurt"];
const DELUXE_ONLY_CATEGORIES = ["Frappe", "Frozen Drink", "Italian Ice", "Creamiccino"];
const LIFESTYLE_CATEGORIES = ["Diet/Keto", "Dairy-Free", "Vegan", "Adult", "Creamy", "Decadent", "Refreshing", "Other"];
const SURPRISE_THEMES = [
  "high-protein peanut butter cup hack",
  "electrolyte frozen recovery slush",
  "midnight munchies mashup",
  "cookies and cream explosion",
  "salted caramel pretzel delight",
  "tropical dragonfruit paradise",
  "coffee shop frappuccino inspired",
  "matcha green tea wellness",
  "birthday cake celebration",
  "mint chocolate chip refresh",
  "banana foster homage",
  "key lime pie tribute",
  "maple butter pecan autumn vibes",
  "s'mores campfire classic",
  "strawberry cheesecake protein swirl",
  "lemon curd and shortbread crunch"
];

const SurpriseSchema = z.object({
  isDeluxe: z.boolean().optional().default(false)
});

router.post("/surprise", zValidator("json", SurpriseSchema), async (c) => {
  const { isDeluxe } = c.req.valid("json");
  
  const validPool = [...CORE_CATEGORIES, ...LIFESTYLE_CATEGORIES, ...(isDeluxe ? DELUXE_ONLY_CATEGORIES : [])];
  const category = validPool[Math.floor(Math.random() * validPool.length)];
  const theme = SURPRISE_THEMES[Math.floor(Math.random() * SURPRISE_THEMES.length)];

  const deluxeInstruction = isDeluxe
    ? "The user is using a Ninja CREAMi Deluxe (24oz pint). Scale ingredients for a 24oz yield. You can use Deluxe-exclusive processing modes like FRAPPE, FROZEN DRINK, SLUSHI, ITALIAN ICE, or CREAMICCINO."
    : "The user is using a standard Ninja CREAMi (16oz pint). Keep ingredients scaled for a 16oz max capacity.";

  const system = `You are a Minimalist Chef creating secret menu CREAMi hacks.
${deluxeInstruction}
Return ONLY valid JSON:
{
  "title": string (3-60 chars),
  "category": string (EXACTLY one of: ${validPool.join(", ")}),
  "description": string (Macros only. MAX 120 chars. 0% generic AI fluff),
  "ingredients": string[] (3-6 items),
  "steps": string[] (3-5 concise items),
  "notes": string[] (optional),
  "allergens": string[] (optional)
}
Hardware: 1) "Freeze 24h." 2) Exact Spin mode.`;

  const userPrompt = `Create a ${category} recipe with theme: "${theme}".`;

  try {
    const recipe = await geminiGenerateJSON<any>({
      apiKey: c.env.GEMINI_API_KEY,
      system,
      user: userPrompt,
      maxOutputTokens: 1500,
      temperature: 0.85
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
