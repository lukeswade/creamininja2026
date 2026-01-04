import React from "react";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { api, API_BASE } from "../lib/api";
import { useAuth } from "../lib/auth";

type AiRecipe = {
  title: string;
  category: string;
  description?: string;
  ingredients: string[];
  steps: string[];
  notes?: string[];
  allergens?: string[];
};

type SurpriseDraftResponse =
  | { ok: true; draft: AiRecipe }
  | { ok: true; recipe: AiRecipe }; // supports either shape if your API returns recipe vs draft

export default function CreateRecipe() {
  const { csrfToken } = useAuth();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");

  // UX FIX: do NOT default to "Ice Cream" — placeholder allows user to open options immediately.
  const [category, setCategory] = React.useState("");
  const [visibility, setVisibility] = React.useState<"private" | "restricted" | "public">("restricted");

  const [ingredientsText, setIngredientsText] = React.useState("");
  const [stepsText, setStepsText] = React.useState("");
  const [imageKey, setImageKey] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // AI helpers
  const [aiIngredients, setAiIngredients] = React.useState("");
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiPhotoKey, setAiPhotoKey] = React.useState<string | null>(null);

  // Surprise Me
  const [surpriseBusy, setSurpriseBusy] = React.useState(false);

  function applyAiRecipe(r: AiRecipe) {
    setTitle(r.title ?? "");
    setDescription(r.description ?? "");
    setCategory(r.category ?? "");
    setIngredientsText((r.ingredients ?? []).join("\n"));
    setStepsText((r.steps ?? []).join("\n"));
  }

  async function uploadPhoto(file: File, opts?: { forAi?: boolean }) {
    setErr(null);
    const presign = await api<{ ok: true; key: string; url: string; headers: Record<string, string> }>("/uploads/presign", {
      method: "POST",
      body: JSON.stringify({ kind: "recipe", contentType: file.type, bytes: file.size }),
      csrf: csrfToken || ""
    });

    await fetch(presign.url, {
      method: "PUT",
      headers: presign.headers,
      body: file
    });

    if (opts?.forAi) setAiPhotoKey(presign.key);
    else setImageKey(presign.key);
  }

  async function create() {
    setBusy(true);
    setErr(null);
    try {
      const ingredients = ingredientsText
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);
      const steps = stepsText
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean);

      // basic guard to avoid accidental empty category submissions
      if (!category.trim()) {
        throw new Error("Please choose a category.");
      }

      await api("/recipes", {
        method: "POST",
        csrf: csrfToken || "",
        body: JSON.stringify({
          title,
          description: description || null,
          category,
          visibility,
          ingredients,
          steps,
          imageKey
        })
      });

      setTitle("");
      setDescription("");
      setCategory("");
      setIngredientsText("");
      setStepsText("");
      setImageKey(null);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function aiGenerate() {
    setAiBusy(true);
    setErr(null);
    try {
      const ingredients = aiIngredients
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);

      // If user hasn't chosen a category, we can either error or default.
      // Here: default to Ice Cream to keep flow smooth.
      const cat = category.trim() ? category : "Ice Cream";

      const res = await api<{ ok: true; recipe: AiRecipe }>("/ai/from-ingredients", {
        method: "POST",
        csrf: csrfToken || "",
        body: JSON.stringify({ ingredients, category: cat, creativity: "balanced" })
      });

      applyAiRecipe({ ...res.recipe, category: res.recipe.category || cat });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setAiBusy(false);
    }
  }

  async function aiGenerateFromPhoto() {
    if (!aiPhotoKey) return;
    setAiBusy(true);
    setErr(null);
    try {
      const cat = category.trim() ? category : "Ice Cream";

      const res = await api<{ ok: true; recipe: AiRecipe }>("/ai/from-image", {
        method: "POST",
        csrf: csrfToken || "",
        body: JSON.stringify({ imageKey: aiPhotoKey, category: cat })
      });

      applyAiRecipe({ ...res.recipe, category: res.recipe.category || cat });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setAiBusy(false);
    }
  }

  async function surpriseMe() {
    setSurpriseBusy(true);
    setErr(null);
    try {
      // Endpoint should be implemented on the API as POST /ai/surprise
      // Response shape: { ok: true, draft: { ... } } (recommended) or { ok: true, recipe: { ... } }
      const res = await api<SurpriseDraftResponse>("/ai/surprise", {
        method: "POST",
        csrf: csrfToken || "",
        body: JSON.stringify({
          // Optional hints — safe to ignore on the server
          // currentCategory: category || null,
          // visibility,
        })
      });

      // Accept either "draft" or "recipe" key, to avoid tight coupling.
      const draft = (res as any).draft ?? (res as any).recipe;
      if (!draft) throw new Error("Surprise Me failed: invalid response.");

      applyAiRecipe(draft);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSurpriseBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Create a recipe</div>
            <div className="mt-1 text-sm text-slate-400">Manual or AI-assisted. Photos are optional.</div>
          </div>

          {/* NEW: Surprise Me button, front-and-center */}
          <div className="shrink-0">
            <Button onClick={surpriseMe} disabled={surpriseBusy || aiBusy || busy}>
              {surpriseBusy ? "Summoning..." : "Surprise Me"}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Salted Oreo Blizzard Pint" />
          </div>

          {/* UX FIX: use a real select w/ placeholder instead of an Input+datalist */}
          <div>
            <label className="text-xs text-slate-400">Category</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="" disabled>
                Select a category…
              </option>
              <option value="Ice Cream">Ice Cream</option>
              <option value="Gelato">Gelato</option>
              <option value="Sorbet">Sorbet</option>
              <option value="Slushie">Slushie</option>
              <option value="Adult">Adult</option>
              <option value="Creamy">Creamy</option>
              <option value="Decadent">Decadent</option>
              <option value="Surprise">Surprise</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-400">Description</label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short hook + any special notes."
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Visibility</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
            >
              <option value="private">Private (only shared)</option>
              <option value="restricted">Restricted (friends)</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Photo (optional)</label>
            <input
              className="mt-1 block w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-950 hover:file:bg-white"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPhoto(f);
              }}
            />
            {imageKey && <div className="mt-2 text-xs text-slate-400">Uploaded: {imageKey}</div>}
          </div>

          <div className="md:col-span-2">
            {imageKey && (
              <img
                className="mt-2 max-h-[320px] rounded-xl border border-slate-800 object-cover"
                src={`${API_BASE}/uploads/file/${encodeURIComponent(imageKey)}`}
                alt="Uploaded recipe"
              />
            )}
          </div>

          <div>
            <label className="text-xs text-slate-400">Ingredients (one per line)</label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
              rows={10}
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              placeholder={"milk\ncream\nsugar\nvanilla"}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Steps (one per line)</label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
              rows={10}
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              placeholder={"Blend base\nFreeze 24h\nSpin on Ice Cream\nRespin if crumbly\nAdd mix-ins"}
            />
          </div>
        </div>

        {err && <div className="mt-4 rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{err}</div>}

        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={create} disabled={busy || !title || !category.trim()}>
            {busy ? "Saving..." : "Save recipe"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold">AI assist</div>
        <p className="mt-1 text-sm text-slate-400">List ingredients and get a CREAMi-ready recipe draft.</p>
        <textarea
          className="mt-3 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
          rows={6}
          value={aiIngredients}
          onChange={(e) => setAiIngredients(e.target.value)}
          placeholder={"milk\nbanana\npeanut butter\ncocoa\nprotein powder"}
        />
        <div className="mt-3">
          <Button onClick={aiGenerate} disabled={aiBusy || !aiIngredients.trim()}>
            {aiBusy ? "Generating..." : "Generate from ingredients"}
          </Button>
        </div>

        <div className="mt-6 border-t border-slate-800 pt-4">
          <div className="text-xs font-medium text-slate-300">Or generate from a photo</div>
          <p className="mt-1 text-sm text-slate-400">Upload a photo of ingredients; the AI will infer a sensible base recipe in your chosen category.</p>

          <input
            className="mt-3 block w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-950 hover:file:bg-white"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPhoto(f, { forAi: true });
            }}
          />
          {aiPhotoKey && <div className="mt-2 text-xs text-slate-400">Uploaded for AI: {aiPhotoKey}</div>}

          <div className="mt-3">
            <Button onClick={aiGenerateFromPhoto} disabled={aiBusy || !aiPhotoKey}>
              {aiBusy ? "Generating..." : "Generate from photo"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
