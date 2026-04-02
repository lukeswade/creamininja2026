import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, API_BASE } from "../lib/api";
import { Card } from "../components/Card";
import { useAuth } from "../lib/auth";
import { Button } from "../components/Button";
import { NinjaStar } from "../components/NinjaStar";
import { Avatar } from "../components/Avatar";
import { ShareWithFriendsModal } from "../components/ShareWithFriendsModal";
import { Skeleton } from "../components/Skeleton";
import { ChefHat, Clock, Eye, EyeOff, Users, Share2, ArrowLeft, Loader2, Pencil, Save, ChevronLeft } from "lucide-react";

type Recipe = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  visibility: "private" | "restricted" | "public";
  ingredients: string[];
  steps: string[];
  imageKey?: string | null;
  starsCount: number;
  viewerStarred: boolean;
  createdAt: string;
  author: { id: string; handle: string; displayName: string; avatarKey?: string | null };
};

const visibilityIcons = {
  public: Eye,
  restricted: Users,
  private: EyeOff
};

const visibilityLabels = {
  public: "Public",
  restricted: "Ninjagos only",
  private: "Private"
};

export default function RecipeDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, csrfToken } = useAuth();
  const [shareOpen, setShareOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editErr, setEditErr] = React.useState<string | null>(null);
  const [mobileActionsOpen, setMobileActionsOpen] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    title: "",
    description: "",
    category: "",
    visibility: "restricted" as Recipe["visibility"],
    ingredientsText: "",
    stepsText: ""
  });

  const q = useQuery({
    queryKey: ["recipe", id, !!user],
    queryFn: () => api<{ ok: true; recipe: Recipe }>(`/recipes/${id}`, { method: "GET" }),
    refetchInterval: (query) => {
      const r = query.state.data?.recipe;
      // If recipe exists but has no image, poll every 3s
      return r && !r.imageKey ? 3000 : false;
    }
  });

  async function toggleStar() {
    if (!user || !id) return;
    if (q.data?.recipe.viewerStarred) {
      await api(`/recipes/${id}/star`, { method: "DELETE", csrf: csrfToken || "" });
    } else {
      await api(`/recipes/${id}/star`, { method: "POST", body: JSON.stringify({}), csrf: csrfToken || "" });
    }
    q.refetch();
  }

  const r = q.data?.recipe;
  const isOwner = !!user && !!r && r.author.id === user.id;

  React.useEffect(() => {
    if (!r) return;
    setEditForm({
      title: r.title,
      description: r.description ?? "",
      category: r.category,
      visibility: r.visibility,
      ingredientsText: r.ingredients.join("\n"),
      stepsText: r.steps.join("\n")
    });
  }, [r]);

  React.useEffect(() => {
    setMobileActionsOpen(false);
  }, [id]);

  // Loading state
  if (q.isLoading) {
    return (
      <div className="grid gap-6">
        <Card className="relative overflow-hidden">
          <Skeleton className="h-64 w-full" />
          <div className="p-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="mt-3 h-4 w-1/2" />
            <Skeleton className="mt-4 h-20 w-full" />
          </div>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-4 h-32 w-full" />
          </Card>
          <Card>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-4 h-32 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (q.isError) {
    return (
      <Card className="text-center py-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-950/50">
          <ChefHat className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-200">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-400">{(q.error as Error).message}</p>
        <div className="mt-4 inline-block">
          <Button variant="secondary" className="gap-2" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </div>
      </Card>
    );
  }

  // Not found
  if (!r) {
    return (
      <Card className="text-center py-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
          <ChefHat className="h-8 w-8 text-slate-500" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-200">Recipe not found</h2>
        <p className="mt-2 text-sm text-slate-400">This recipe may have been deleted or made private</p>
        <div className="mt-4 inline-block">
          <Button variant="secondary" className="gap-2" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </div>
      </Card>
    );
  }

  const VisIcon = visibilityIcons[r.visibility];
  const canShare = isOwner;
  const formattedDate = new Date(r.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  const descriptionParts = splitDescriptionAndMacros(r.description);

  function goBack() {
    if (window.history.length > 1) {
      nav(-1);
      return;
    }
    nav("/feed");
  }

  async function saveEdits() {
    if (!id || !isOwner) return;
    setSaving(true);
    setEditErr(null);
    try {
      await api(`/recipes/${id}`, {
        method: "PATCH",
        csrf: csrfToken || "",
        body: JSON.stringify({
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          category: editForm.category,
          visibility: editForm.visibility,
          ingredients: editForm.ingredientsText.split(/\n/).map((x) => x.trim()).filter(Boolean),
          steps: editForm.stepsText.split(/\n/).map((x) => x.trim()).filter(Boolean)
        })
      });
      await q.refetch();
      setEditing(false);
    } catch (e: any) {
      setEditErr(e.message || "Failed to update recipe");
    } finally {
      setSaving(false);
    }
  }

  async function exportAsImage() {
    if (exporting || !r) return;
    setExporting(true);
    try {
      const link = document.createElement("a");
      link.download = `CreamiNinja-${r.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.png`;
      link.href = await renderRecipeExport(r);
      link.click();
    } catch (err) {
      console.error(err);
      alert("Failed to export image");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-6">
      {/* Main content area */}
      <div className="-mx-4 -mt-6 sm:mx-0 sm:mt-0 sm:overflow-hidden sm:rounded-[2.5rem] sm:border sm:border-white/10 sm:bg-slate-900/40 sm:backdrop-blur-xl sm:shadow-2xl sm:shadow-black/50">
        {/* Image / Generation State */}
        <div className="relative aspect-square sm:aspect-auto sm:min-h-[400px] sm:h-[500px] bg-slate-950 overflow-hidden">
          <button
            onClick={goBack}
            className="absolute left-4 top-4 z-20 inline-flex items-center justify-center rounded-full border border-white/10 bg-slate-950/55 p-3 text-slate-100 backdrop-blur-xl transition hover:bg-slate-900/75"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {r.imageKey ? (
            <>
              <img
                className="h-full w-full object-cover animate-in fade-in duration-700"
                src={`${API_BASE}/uploads/file/${encodeURIComponent(r.imageKey)}`}
                alt={r.title}
                onError={(e) => {
                  e.currentTarget.src = "https://placehold.co/1200x800/1e1e2f/8b5cf6?text=CREAMi+Creation";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
            </>
          ) : (
             <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 p-12 text-center">
                <div className="absolute inset-0 bg-mesh opacity-20 animate-pulse" />
                <div className="relative z-10 flex flex-col items-center gap-4">
                   <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600/20 shadow-inner">
                      <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                   </div>
                   <div className="space-y-1">
                      <div className="text-lg font-bold text-slate-200">Architecting your vision...</div>
                      <div className="text-sm text-violet-400/60 font-medium">Cloudflare Workers are generating your AI photo.</div>
                   </div>
                </div>
                {/* Shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
             </div>
          )}
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-100">{r.title}</h1>
              
              {/* Meta info */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <Link to={`/u/${r.author.handle}`} className="flex items-center gap-2 hover:underline">
                  <Avatar
                    handle={r.author.handle}
                    avatarKey={r.author.avatarKey}
                    size="sm"
                  />
                  <span className="font-medium text-slate-200">{r.author.displayName}</span>
                </Link>
                
                <span className="text-slate-600">•</span>
                
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600/20 px-2.5 py-0.5 text-xs font-medium text-violet-300">
                  {r.category}
                </span>
                
                <span className="text-slate-600">•</span>
                
                <span className="inline-flex items-center gap-1.5 text-slate-400">
                  <VisIcon className="h-3.5 w-3.5" />
                  {visibilityLabels[r.visibility]}
                </span>
                
                <span className="text-slate-600">•</span>
                
                <span className="inline-flex items-center gap-1.5 text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  {formattedDate}
                </span>
              </div>

              {/* Description */}
              {r.description && (
                <div className="mt-4 space-y-2 text-slate-300">
                  {descriptionParts.flavor && (
                    <p className="leading-relaxed">{descriptionParts.flavor}</p>
                  )}
                  {descriptionParts.macros && (
                    <p className="leading-relaxed text-slate-400">{descriptionParts.macros}</p>
                  )}
                </div>
              )}
            </div>

            {/* Mobile action drawer */}
            <div className="fixed bottom-24 right-3 z-40 flex flex-col items-end gap-2 sm:hidden">
              {mobileActionsOpen && (
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => {
                      setMobileActionsOpen(false);
                      void (user ? toggleStar() : nav("/register"));
                    }}
                    className={`group flex min-w-[92px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 backdrop-blur-xl transition-all active:scale-95 ${
                      r.viewerStarred
                        ? "border-violet-400/20 bg-violet-600/25 text-white"
                        : "border-white/10 bg-slate-950/35 text-slate-200 hover:bg-slate-900/45"
                    }`}
                  >
                    <NinjaStar className={`h-5 w-5 ${r.viewerStarred ? "text-white" : "text-violet-300"}`} />
                    <span className="font-semibold">{r.starsCount}</span>
                  </button>

                  {isOwner && (
                    <button
                      onClick={() => {
                        setMobileActionsOpen(false);
                        setEditing((v) => !v);
                      }}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/35 text-slate-200 backdrop-blur-xl transition hover:bg-slate-900/45"
                      aria-label={editing ? "Close recipe editor" : "Edit recipe"}
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                  )}

                  {canShare && (
                    <button
                      onClick={() => {
                        setMobileActionsOpen(false);
                        setShareOpen(true);
                      }}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/35 text-slate-200 backdrop-blur-xl transition hover:bg-slate-900/45"
                      aria-label="Share recipe"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setMobileActionsOpen(false);
                      void exportAsImage();
                    }}
                    disabled={exporting}
                    className="flex min-w-[92px] items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-600/25 px-4 py-3 text-white backdrop-blur-xl transition hover:bg-violet-500/30 disabled:opacity-60"
                  >
                    {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="text-xl">📸</span>}
                  </button>
                </div>
              )}

              <button
                onClick={() => setMobileActionsOpen((v) => !v)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-transparent text-slate-200 transition hover:bg-slate-900/20"
                aria-label={mobileActionsOpen ? "Hide recipe actions" : "Show recipe actions"}
              >
                <ChevronLeft className={`h-5 w-5 transition-transform ${mobileActionsOpen ? "-rotate-180" : ""}`} />
              </button>
            </div>

            {/* Desktop actions */}
            <div className="hidden sm:flex sm:flex-row sm:items-center sm:gap-3">
              <button
                onClick={user ? toggleStar : () => nav("/register")}
                className={`group flex items-center gap-2 rounded-2xl border px-5 py-3 backdrop-blur-xl transition-all active:scale-95 shadow-lg ${
                  r.viewerStarred
                    ? "border-violet-400/30 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white shadow-violet-500/25"
                    : "border-white/10 bg-slate-900/55 text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <NinjaStar className={`h-6 w-6 ${r.viewerStarred ? "text-white" : "text-violet-400 group-hover:text-violet-300 transition-colors"}`} />
                <span className="font-bold">{r.starsCount}</span>
              </button>

              {isOwner && (
                <Button
                  variant="secondary"
                  onClick={() => setEditing((v) => !v)}
                  className="gap-2 rounded-2xl border border-white/10 bg-slate-900/55 px-5 py-3 shadow-lg backdrop-blur-xl"
                >
                  <Pencil className="h-5 w-5" />
                  <span>{editing ? "Close" : "Edit"}</span>
                </Button>
              )}

              {canShare && (
                <Button variant="secondary" onClick={() => setShareOpen(true)} className="gap-2 rounded-2xl border border-white/10 bg-slate-900/55 px-5 py-3 shadow-lg backdrop-blur-xl">
                  <Share2 className="h-5 w-5" />
                  <span>Share</span>
                </Button>
              )}

              <Button
                variant="primary"
                onClick={exportAsImage}
                disabled={exporting}
                className="gap-2 rounded-2xl border-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-white shadow-lg hover:shadow-violet-500/40"
              >
                {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="text-xl">📸</span>}
                <span>{exporting ? "Exporting..." : "Export"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isOwner && editing && (
        <Card className="rounded-[2rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-100">Edit recipe</h2>
            <Button onClick={saveEdits} disabled={saving || !editForm.title.trim() || !editForm.category} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs text-slate-400">Title</label>
              <input
                value={editForm.title}
                onChange={(e) => setEditForm((v) => ({ ...v, title: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Category</label>
              <input
                value={editForm.category}
                onChange={(e) => setEditForm((v) => ({ ...v, category: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400">Description</label>
              <textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm((v) => ({ ...v, description: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Visibility</label>
              <select
                value={editForm.visibility}
                onChange={(e) => setEditForm((v) => ({ ...v, visibility: e.target.value as Recipe["visibility"] }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100"
              >
                <option value="private">Private</option>
                <option value="restricted">Ninjagos only</option>
                <option value="public">Public</option>
              </select>
            </div>
            <div />
            <div>
              <label className="text-xs text-slate-400">Ingredients</label>
              <textarea
                rows={7}
                value={editForm.ingredientsText}
                onChange={(e) => setEditForm((v) => ({ ...v, ingredientsText: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Instructions</label>
              <textarea
                rows={7}
                value={editForm.stepsText}
                onChange={(e) => setEditForm((v) => ({ ...v, stepsText: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100"
              />
            </div>
          </div>

          {editErr && <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">{editErr}</div>}
        </Card>
      )}

      {/* Ingredients and Steps */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Ingredients */}
        <Card className="lg:col-span-2 rounded-[2rem] p-6 lg:p-8">
          <h2 className="flex items-center gap-3 text-xl font-bold text-slate-100">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 shadow-inner">
              <ChefHat className="h-4 w-4 text-violet-400" />
            </span>
            Ingredients
          </h2>
          {r.ingredients.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 italic">No ingredients listed</p>
          ) : (
            <>
              <ul className="mt-4 space-y-2">
                {r.ingredients.map((x, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-500" />
                    {x}
                  </li>
                ))}
              </ul>
              
              <a 
                href={`https://www.amazon.com/s?k=${encodeURIComponent("Ninja Creami " + r.ingredients.slice(0, 3).join(" ").replace(/[0-9/.\-gcupstbspmloz]+ /gi, ''))}&tag=lukeswade-20`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 px-4 py-3 text-sm font-bold text-slate-200 transition-colors shadow-inner border border-white/5 active:scale-95"
              >
                <span className="text-amber-500 text-lg">🛒</span>
                Shop Ingredients on Amazon
              </a>
            </>
          )}
        </Card>

        {/* Steps */}
        <Card className="lg:col-span-3 rounded-[2rem] p-6 lg:p-8">
          <h2 className="flex items-center gap-3 text-xl font-bold text-slate-100">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-600/20 shadow-inner">
              <Clock className="h-4 w-4 text-fuchsia-400" />
            </span>
            Instructions
          </h2>
          {r.steps.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 italic">No instructions listed</p>
          ) : (
            <ol className="mt-4 space-y-4">
              {r.steps.map((x, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <p className="pt-0.5 text-slate-300 leading-relaxed">{x}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* Share modal */}
      {canShare && id && (
        <ShareWithFriendsModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          recipeId={id}
          recipeTitle={r.title}
        />
      )}

    </div>
  );
}

function splitDescriptionAndMacros(description?: string | null) {
  const text = (description || "").trim();
  if (!text) return { flavor: "", macros: "" };

  const macroMatch = text.match(/(?:~\s*)?(?:approx\.?\s*)?\d+\s*(?:k?cal|cals?)\b.*$/i);
  if (!macroMatch) return { flavor: text, macros: "" };

  const flavor = text
    .slice(0, macroMatch.index)
    .trim()
    .replace(/[\s~([{-]*[.,;:!?]*[\s~([{-]*$/g, "")
    .replace(/[~.\s]+$/, "");

  const rawMacros = macroMatch[0].trim();
  const macros = rawMacros
    .replace(/^[)\].,;\s}]+/, "")
    .replace(/[)\]}]+$/g, (match) => {
      const opens = countChars(rawMacros, "([{");
      const closes = countChars(rawMacros, ")]}");
      return closes > opens ? "" : match;
    });

  return {
    flavor: flavor ? `${flavor}.` : "",
    macros
  };
}

function countChars(value: string, chars: string) {
  let count = 0;
  for (const ch of value) {
    if (chars.includes(ch)) count += 1;
  }
  return count;
}

async function renderRecipeExport(recipe: Recipe) {
  const width = 1200;
  const height = 1600;
  const padding = 56;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const descriptionParts = splitDescriptionAndMacros(recipe.description);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#0b1024");
  bg.addColorStop(0.45, "#111633");
  bg.addColorStop(1, "#190d2b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const imageHeight = 620;
  if (recipe.imageKey) {
    try {
      const image = await loadExportImage(`${API_BASE}/uploads/file/${encodeURIComponent(recipe.imageKey)}`);
      drawCoverImage(ctx, image, 0, 0, width, imageHeight);
    } catch (err) {
      console.warn("export_image_load_failed", err);
      drawImageFallback(ctx, width, imageHeight);
    }
  } else {
    drawImageFallback(ctx, width, imageHeight);
  }

  const imageFade = ctx.createLinearGradient(0, imageHeight - 160, 0, imageHeight);
  imageFade.addColorStop(0, "rgba(2,6,23,0)");
  imageFade.addColorStop(1, "rgba(2,6,23,0.95)");
  ctx.fillStyle = imageFade;
  ctx.fillRect(0, imageHeight - 160, width, 160);

  const panelY = imageHeight - 16;
  roundRect(ctx, 24, panelY, width - 48, height - panelY - 24, 32, "rgba(10,14,33,0.96)", "rgba(255,255,255,0.08)");

  ctx.fillStyle = "#c4b5fd";
  roundRect(ctx, padding, panelY + 38, 132, 34, 17, "rgba(124,58,237,0.22)");
  ctx.font = "600 20px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(recipe.category, padding + 18, panelY + 60);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 54px ui-sans-serif, system-ui, sans-serif";
  drawWrappedText(ctx, recipe.title, padding, panelY + 128, width - padding * 2 - 180, 62, 2);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(recipe.author.displayName, padding, panelY + 188);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 20px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(`@${recipe.author.handle}`, padding + 190, panelY + 188);

  const flavorY = panelY + 250;
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "500 28px ui-sans-serif, system-ui, sans-serif";
  const flavorBottom = drawWrappedText(
    ctx,
    descriptionParts.flavor || recipe.description || "The ultimate Ninja CREAMi creation.",
    padding,
    flavorY,
    width - padding * 2,
    40,
    3
  );

  let textBlockY = flavorBottom + 12;
  if (descriptionParts.macros) {
    ctx.fillStyle = "#a5b4fc";
    ctx.font = "500 24px ui-sans-serif, system-ui, sans-serif";
    textBlockY = drawWrappedText(ctx, descriptionParts.macros, padding, textBlockY, width - padding * 2, 34, 2) + 8;
  }

  const columnTop = Math.max(textBlockY + 36, panelY + 410);
  const columnWidth = (width - padding * 2 - 32) / 2;
  roundRect(ctx, padding, columnTop, columnWidth, height - columnTop - 110, 28, "rgba(15,23,42,0.82)", "rgba(255,255,255,0.06)");
  roundRect(ctx, padding + columnWidth + 32, columnTop, columnWidth, height - columnTop - 110, 28, "rgba(15,23,42,0.82)", "rgba(255,255,255,0.06)");

  ctx.fillStyle = "#e9d5ff";
  ctx.font = "700 30px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Ingredients", padding + 28, columnTop + 52);
  ctx.fillStyle = "#f1f5f9";
  ctx.font = "500 24px ui-sans-serif, system-ui, sans-serif";
  drawBulletedList(ctx, recipe.ingredients.slice(0, 7), padding + 28, columnTop + 100, columnWidth - 56, 38, "#8b5cf6");

  const stepsX = padding + columnWidth + 60;
  ctx.fillStyle = "#f5d0fe";
  ctx.font = "700 30px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Instructions", stepsX, columnTop + 52);
  ctx.fillStyle = "#f1f5f9";
  ctx.font = "500 24px ui-sans-serif, system-ui, sans-serif";
  drawNumberedList(ctx, recipe.steps.slice(0, 6), stepsX, columnTop + 100, columnWidth - 56, 38, "#d946ef");

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("CreamiNinja.com", padding, height - 46);

  return canvas.toDataURL("image/png");
}

async function loadExportImage(src: string) {
  const res = await fetch(src, { credentials: "include" });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = objectUrl;
    });
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: CanvasImageSource, x: number, y: number, width: number, height: number) {
  const imgWidth = "width" in image ? image.width : width;
  const imgHeight = "height" in image ? image.height : height;
  const scale = Math.max(width / imgWidth, height / imgHeight);
  const drawWidth = imgWidth * scale;
  const drawHeight = imgHeight * scale;
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function drawImageFallback(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#111827");
  grad.addColorStop(1, "#0f172a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#8b5cf6";
  ctx.font = "700 68px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CREAMi Creation", width / 2, height / 2);
  ctx.textAlign = "left";
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines - 1) break;
  }
  if (line && lines.length < maxLines) lines.push(line);

  if (words.length && lines.length === maxLines) {
    const usedWords = lines.join(" ").split(/\s+/).length;
    if (usedWords < words.length) {
      let trimmed = lines[maxLines - 1];
      while (ctx.measureText(`${trimmed}…`).width > maxWidth && trimmed.includes(" ")) {
        trimmed = trimmed.split(" ").slice(0, -1).join(" ");
      }
      lines[maxLines - 1] = `${trimmed}…`;
    }
  }

  lines.forEach((currentLine, index) => {
    ctx.fillText(currentLine, x, y + index * lineHeight);
  });

  return y + lines.length * lineHeight;
}

function drawBulletedList(
  ctx: CanvasRenderingContext2D,
  items: string[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  bulletColor: string
) {
  let cursorY = y;
  for (const item of items) {
    ctx.fillStyle = bulletColor;
    ctx.beginPath();
    ctx.arc(x + 8, cursorY - 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f1f5f9";
    cursorY = drawWrappedText(ctx, item, x + 28, cursorY, maxWidth - 28, lineHeight, 2) + 10;
  }
}

function drawNumberedList(
  ctx: CanvasRenderingContext2D,
  items: string[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  numberColor: string
) {
  let cursorY = y;
  items.forEach((item, index) => {
    ctx.fillStyle = numberColor;
    ctx.beginPath();
    ctx.arc(x + 14, cursorY - 10, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 18px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(index + 1), x + 14, cursorY - 3);
    ctx.textAlign = "left";
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "500 24px ui-sans-serif, system-ui, sans-serif";
    cursorY = drawWrappedText(ctx, item, x + 42, cursorY, maxWidth - 42, lineHeight, 2) + 10;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke?: string
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
