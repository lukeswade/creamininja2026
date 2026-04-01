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
    try {
      const presign = await api<{ ok: true; key: string; url: string; headers: Record<string, string> }>("/uploads/presign", {
        method: "POST",
        body: JSON.stringify({ kind: "recipe", contentType: file.type, bytes: file.size }),
        csrf: csrfToken || ""
      });

      const putRes = await fetch(presign.url, {
        method: "PUT",
        headers: presign.headers,
        body: file
      });

      if (!putRes.ok) {
        throw new Error("Upload failed. Please try a smaller photo or re-upload.");
      }

      if (opts?.forAi) setAiPhotoKey(presign.key);
      else setImageKey(presign.key);
    } catch (e: any) {
      setErr(e.message || "Upload failed.");
    }
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
      {/* Prominent Surprise Me section at the very top */}
      <Card className="relative overflow-hidden border-violet-500/30 bg-gradient-to-r from-violet-900/30 to-fuchsia-900/30 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
        <div className="absolute inset-0 bg-mesh opacity-20 mix-blend-overlay" />
        <div className="relative flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <div className="flex items-center gap-2 text-xl font-bold text-violet-100">
              <span className="animate-pulse">✨</span> Feeling lucky?
            </div>
            <div className="mt-1 text-sm text-violet-300">Let AI create a completely random CREAMi recipe for you!</div>
          </div>
          <Button 
            onClick={surpriseMe} 
            disabled={surpriseBusy || aiBusy || busy}
            className="whitespace-nowrap rounded-2xl bg-violet-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-violet-500/30 transition-all active:scale-95 hover:bg-violet-500"
          >
            {surpriseBusy ? "Summoning..." : "Surprise Me!"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="text-lg font-semibold">Create a recipe</div>
        <div className="mt-1 text-sm text-slate-400">Fill in the basics. Only title and category are required.</div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-slate-400">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's your creation called?" />
          </div>

          <div>
            <label className="text-xs text-slate-400">Category *</label>
            <select
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-100 shadow-inner backdrop-blur-sm transition-all focus:border-violet-500/30 focus:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select a category…</option>
              <option value="Ice Cream">Ice Cream</option>
              <option value="Gelato">Gelato</option>
              <option value="Sorbet">Sorbet</option>
              <option value="Slushie">Slushie</option>
              <option value="Adult">Adult</option>
              <option value="Creamy">Creamy</option>
              <option value="Decadent">Decadent</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-400">Description <span className="text-slate-600">(optional)</span></label>
            <textarea
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-100 shadow-inner backdrop-blur-sm transition-all focus:border-violet-500/30 focus:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder=""
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Visibility</label>
            <select
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-100 shadow-inner backdrop-blur-sm transition-all focus:border-violet-500/30 focus:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
            >
              <option value="private">Private (only shared)</option>
              <option value="restricted">Restricted (friends)</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Photo <span className="text-slate-600">(optional)</span></label>
            <input
              className="mt-1 block w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-950 hover:file:bg-white"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPhoto(f);
              }}
            />
          </div>

          <div className="md:col-span-2">
            {imageKey && (
              <img
                className="mt-2 max-h-[240px] rounded-xl border border-slate-800 object-cover"
                src={`${API_BASE}/uploads/file/${encodeURIComponent(imageKey)}`}
                alt="Uploaded recipe"
              />
            )}
          </div>

          <div>
            <label className="text-xs text-slate-400">Ingredients <span className="text-slate-600">(optional, one per line)</span></label>
            <textarea
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-100 shadow-inner backdrop-blur-sm transition-all focus:border-violet-500/30 focus:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              rows={8}
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              placeholder=""
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Steps <span className="text-slate-600">(optional, one per line)</span></label>
            <textarea
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-100 shadow-inner backdrop-blur-sm transition-all focus:border-violet-500/30 focus:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              rows={8}
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              placeholder=""
            />
          </div>
        </div>

        {err && <div className="mt-4 rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{err}</div>}

        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={create} disabled={busy || !title.trim() || !category}>
            {busy ? "Saving..." : "Save recipe"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold">AI assist</div>
        <p className="mt-1 text-sm text-slate-400">List ingredients and get a CREAMi-ready recipe draft.</p>
        <textarea
          className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-100 shadow-inner backdrop-blur-sm transition-all focus:border-violet-500/30 focus:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          rows={5}
          value={aiIngredients}
          onChange={(e) => setAiIngredients(e.target.value)}
          placeholder=""
        />
        <div className="mt-3">
          <Button onClick={aiGenerate} disabled={aiBusy || !aiIngredients.trim()}>
            {aiBusy ? "Generating..." : "Generate from ingredients"}
          </Button>
        </div>

        <div className="mt-6 border-t border-white/10 pt-6">
          <div className="flex items-center gap-2 text-base font-bold text-slate-100">
            <span className="text-xl">📸</span> Generate from a photo
          </div>
          <p className="mt-1 text-sm text-slate-400">Snap or upload a photo of your ingredients; the AI will invent a recipe instantly.</p>

          <input
            className="mt-4 block w-full text-sm text-slate-300 file:mr-4 file:rounded-xl file:border file:border-white/10 file:bg-slate-800/50 file:px-5 file:py-2.5 file:text-sm file:font-semibold file:text-slate-200 file:backdrop-blur-sm file:transition-all file:active:scale-95 hover:file:bg-slate-700/50 file:cursor-pointer"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPhoto(f, { forAi: true });
            }}
          />
          {aiPhotoKey && <div className="mt-2 text-xs text-slate-400">Uploaded for AI: {aiPhotoKey}</div>}

          <div className="mt-4">
            <Button onClick={aiGenerateFromPhoto} disabled={aiBusy || !aiPhotoKey} className="w-full sm:w-auto gap-2">
              📸 {aiBusy ? "Analyzing photo..." : "Generate from photo"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
