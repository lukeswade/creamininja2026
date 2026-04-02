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

function buildRecipeSystem(validCategories: string[], deluxeInstruction: string) {
  return [
    "You are a Ninja CREAMi recipe generator.",
    "Write concise, practical, realistic recipes.",
    deluxeInstruction,
    `Category must be exactly one of: ${validCategories.join(", ")}.`,
    'Return only JSON with keys: "title", "category", "description", "ingredients", "steps", "notes", "allergens".',
    "Description: start with a plain-language flavor description, then end with compact macros, max 120 chars total.",
    "Ingredients: 3-6 precise items.",
    "Steps: 3-5 short steps.",
    'Include freeze/spin guidance such as "Freeze 24h" and the correct spin mode.'
  ].join(" ");
}

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

  const system = buildRecipeSystem(validCategories, deluxeInstruction);

  const userPrompt = `Create a ${body.category} CREAMi recipe using these ingredients: ${body.ingredients.join(", ")}.
Dietary restrictions: ${(body.dietary ?? []).join(", ") || "none"}.
Creativity level: ${body.creativity}.`;

  try {
    const recipe = await geminiGenerateJSON<any>({
      apiKey: c.env.GEMINI_API_KEY,
      model: "gemini-3.1-flash-lite",
      fallbacks: ["gemini-2.5-flash-lite", "gemini-3-flash-preview"],
      system,
      user: userPrompt,
      maxOutputTokens: 650,
      temperature: body.creativity === "wild" ? 0.8 : body.creativity === "safe" ? 0.35 : 0.55
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

  const system = `${buildRecipeSystem(validCategories, deluxeInstruction)} First identify the likely ingredients visible in the image, then build the recipe from those ingredients.`;

  const userPrompt = `Generate a ${category} CREAMi recipe based on this photo of ingredients.`;

  try {
    const recipe = await geminiGenerateJSON<any>({
      apiKey: c.env.GEMINI_API_KEY,
      model: "gemini-3.1-flash-lite",
      fallbacks: ["gemini-2.5-flash-lite", "gemini-3-flash-preview"],
      system,
      user: userPrompt,
      image: { mimeType: contentType, base64: b64 },
      maxOutputTokens: 800,
      temperature: 0.45
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

  const system = `${buildRecipeSystem(validCategories, deluxeInstruction)} Infer the best category from the user's craving if it is not explicit.`;

  const userPrompt = `Create an incredible CREAMi recipe based on this exact description or craving: "${description}".`;

  try {
    const recipe = await geminiGenerateJSON<any>({
      apiKey: c.env.GEMINI_API_KEY,
      model: "gemini-3.1-flash-lite",
      fallbacks: ["gemini-2.5-flash-lite", "gemini-3-flash-preview"],
      system,
      user: userPrompt,
      maxOutputTokens: 650,
      temperature: 0.55
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

  const system = `${buildRecipeSystem(validPool, deluxeInstruction)} Make it feel inventive but still realistic and easy to follow.`;

  const userPrompt = `Create a ${category} recipe with theme: "${theme}".`;

  try {
    const recipe = await geminiGenerateJSON<any>({
      apiKey: c.env.GEMINI_API_KEY,
      model: "gemini-3.1-flash-lite",
      fallbacks: ["gemini-2.5-flash-lite", "gemini-3-flash-preview"],
      system,
      user: userPrompt,
      maxOutputTokens: 650,
      temperature: 0.75
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
