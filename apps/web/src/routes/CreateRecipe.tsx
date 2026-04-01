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
  const [aiDescription, setAiDescription] = React.useState("");
  const [aiIngredients, setAiIngredients] = React.useState("");
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiPhotoKey, setAiPhotoKey] = React.useState<string | null>(null);
  
  // App state
  const [isDeluxe, setIsDeluxe] = React.useState(false);

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
        body: JSON.stringify({ imageKey: aiPhotoKey, category: cat, isDeluxe })
      });

      applyAiRecipe({ ...res.recipe, category: res.recipe.category || cat });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setAiBusy(false);
    }
  }

  async function aiGenerateFromDescription() {
    if (!aiDescription.trim()) return;
    setAiBusy(true);
    setErr(null);
    try {
      const res = await api<{ ok: true; recipe: AiRecipe }>("/ai/from-description", {
        method: "POST",
        csrf: csrfToken || "",
        body: JSON.stringify({ description: aiDescription, isDeluxe })
      });

      applyAiRecipe({ ...res.recipe });
      window.scrollTo({ top: window.innerHeight * 0.4, behavior: "smooth" });
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
        body: JSON.stringify({ isDeluxe })
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
    <div className="grid gap-6">
      {/* 1. Premiere Hero Mode: Describe Your Craving */}
      <div className="relative overflow-hidden rounded-[2rem] border border-violet-500/40 bg-gradient-to-br from-violet-900/40 via-fuchsia-900/20 to-slate-900 p-6 md:p-8 shadow-[0_0_40px_rgba(139,92,246,0.2)]">
        <div className="absolute inset-0 bg-mesh opacity-30 mix-blend-overlay pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white md:text-3xl">
              <span className="text-3xl animate-pulse">✨</span> What are you craving?
            </h1>
            <p className="mt-2 text-sm text-violet-200/80 md:text-base max-w-xl">
              Describe your wildest idea. The AI will instantly engineer the perfect CREAMi recipe, complete with precise macros and hardware instructions.
            </p>
          </div>
          <div className="relative w-full shadow-2xl rounded-2xl">
            <textarea
              className="w-full rounded-2xl border-2 border-violet-500/50 bg-slate-950/60 px-5 py-5 text-base text-slate-100 shadow-inner backdrop-blur-md transition-all focus:border-violet-400 focus:bg-slate-950/80 focus:outline-none focus:ring-4 focus:ring-violet-500/30 placeholder-slate-500 min-h-[120px]"
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              placeholder="e.g., A low-calorie frozen irish coffee with whey protein, or a spicy mango margarita sorbet..."
            />
            <div className="absolute bottom-3 right-3">
              <Button 
                onClick={aiGenerateFromDescription} 
                disabled={aiBusy || !aiDescription.trim() || surpriseBusy || busy} 
                className="gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition-all active:scale-95 hover:bg-violet-500 hover:shadow-violet-500/50"
              >
                {aiBusy ? "Architecting..." : "Generate Recipe"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Generate from Photo */}
        <Card className="relative overflow-hidden border-indigo-500/20 bg-gradient-to-br from-slate-900 to-indigo-950/30 shadow-[0_0_20px_rgba(99,102,241,0.05)]">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-2 text-lg font-bold text-indigo-100">
                <span>📸</span> Generate from photo
              </div>
              <p className="mt-1 text-sm text-indigo-300/80 mb-4">Snap a photo of your ingredients and AI will invent the recipe.</p>
            </div>
            
            <div className="space-y-3">
              <input
                className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-xl file:border file:border-indigo-500/30 file:bg-indigo-900/40 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-indigo-200 file:shadow-inner file:cursor-pointer transition-all hover:file:bg-indigo-800/50"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadPhoto(f, { forAi: true });
                }}
              />
              {aiPhotoKey && <div className="text-xs text-indigo-400 font-medium">Image locked. Ready to analyze.</div>}

              <Button 
                onClick={aiGenerateFromPhoto} 
                disabled={aiBusy || !aiPhotoKey || surpriseBusy || busy} 
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-lg shadow-indigo-500/20 text-white border-0"
              >
                {aiBusy ? "Analyzing photo..." : "Analyze Image"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Prominent Surprise Me section */}
        <Card className="relative overflow-hidden border-fuchsia-500/20 bg-gradient-to-br from-slate-900 to-fuchsia-950/30 shadow-[0_0_20px_rgba(217,70,239,0.05)]">
          <div className="absolute inset-0 bg-mesh opacity-10 mix-blend-overlay pointer-events-none" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-2 text-lg font-bold text-fuchsia-100">
                <span>🎲</span> Feeling lucky?
              </div>
              <div className="mt-1 text-sm text-fuchsia-300/80 mb-4">Let AI create a fully randomized, highly creative recipe!</div>
            </div>
            
            <Button 
              onClick={surpriseMe} 
              disabled={surpriseBusy || aiBusy || busy}
              className="w-full whitespace-nowrap rounded-xl bg-fuchsia-900/40 px-6 py-4 text-base font-bold shadow-inner backdrop-blur transition-all active:scale-95 border border-fuchsia-500/30 hover:bg-fuchsia-800/60 text-fuchsia-100"
            >
              {surpriseBusy ? "Summoning..." : "Surprise Me!"}
            </Button>
          </div>
        </Card>
      </div>

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
              <optgroup label="CREAMi Standards">
                <option value="Ice Cream">Ice Cream</option>
                <option value="Lite Ice Cream">Lite Ice Cream</option>
                <option value="Protein Ice Cream">Protein Ice Cream</option>
                <option value="Gelato">Gelato</option>
                <option value="Sorbet">Sorbet</option>
                <option value="Smoothie Bowl">Smoothie Bowl</option>
                <option value="Milkshake">Milkshake</option>
                <option value="Slushie">Slushie</option>
                <option value="Frozen Yogurt">Frozen Yogurt</option>
              </optgroup>
              
              {isDeluxe && (
                <optgroup label="Deluxe Exclusive (24oz)">
                  <option value="Frappe">Frappe</option>
                  <option value="Frozen Drink">Frozen Drink</option>
                  <option value="Italian Ice">Italian Ice</option>
                  <option value="Creamiccino">Creamiccino</option>
                </optgroup>
              )}
              
              <optgroup label="Dietary & Lifestyles">
                <option value="Diet/Keto">Diet / Keto</option>
                <option value="Dairy-Free">Dairy-Free</option>
                <option value="Vegan">Vegan</option>
              </optgroup>

              <optgroup label="Mood & Vibe">
                <option value="Adult">Adult / Boozy</option>
                <option value="Creamy">Creamy</option>
                <option value="Decadent">Decadent</option>
                <option value="Refreshing">Refreshing</option>
              </optgroup>

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
    </div>
  );
}
