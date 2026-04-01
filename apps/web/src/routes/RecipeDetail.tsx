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
import { ChefHat, Clock, Eye, EyeOff, Users, Share2, ArrowLeft, Loader2 } from "lucide-react";
import * as htmlToImage from "html-to-image";

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
  const exportRef = React.useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey: ["recipe", id, !!user],
    queryFn: () => api<{ ok: true; recipe: Recipe }>(`/recipes/${id}`, { method: "GET" })
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
        <Link to="/" className="mt-4 inline-block">
          <Button variant="secondary" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </Link>
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
        <Link to="/" className="mt-4 inline-block">
          <Button variant="secondary" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </Link>
      </Card>
    );
  }

  const VisIcon = visibilityIcons[r.visibility];
  const canShare = !!user && !!r && r.author.id === user.id;
  const formattedDate = new Date(r.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  async function exportAsImage() {
    if (!exportRef.current || exporting || !r) return;
    setExporting(true);
    try {
      // Prime the internal renderer cache to ensure fonts/layout are flushed before capturing 
      await htmlToImage.toPng(exportRef.current, { cacheBust: true, pixelRatio: 1 });
      
      const dataUrl = await htmlToImage.toPng(exportRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `CreamiNinja-${r.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.png`;
      link.href = dataUrl;
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
      {/* Back link */}
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>

      {/* Main content area */}
      <div className="-mx-4 -mt-6 sm:mx-0 sm:mt-0 sm:overflow-hidden sm:rounded-[2.5rem] sm:border sm:border-white/10 sm:bg-slate-900/40 sm:backdrop-blur-xl sm:shadow-2xl sm:shadow-black/50">
        {/* Image */}
        {r.imageKey && (
          <div className="relative aspect-square sm:aspect-auto sm:h-[500px]">
            <img
              className="h-full w-full object-cover"
              src={`${API_BASE}/uploads/file/${encodeURIComponent(r.imageKey)}`}
              alt={r.title}
              onError={(e) => {
                e.currentTarget.src = "https://placehold.co/1200x800/1e1e2f/8b5cf6?text=CREAMi+Creation";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
          </div>
        )}

        <div className="p-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-100">{r.title}</h1>
              
              {/* Meta info */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <Link to={`/@${r.author.handle}`} className="flex items-center gap-2 hover:underline">
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
                <p className="mt-4 text-slate-300 leading-relaxed">{r.description}</p>
              )}
            </div>

            {/* Mobile-only Sticky Actions / Desktop Actions */}
            <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-3 sm:static sm:flex-row sm:items-center">
              <button
                onClick={user ? toggleStar : () => nav("/register")}
                className={`group flex items-center gap-2 rounded-2xl px-5 py-3 transition-all active:scale-95 shadow-lg ${
                  r.viewerStarred
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-violet-500/25"
                    : "bg-slate-800/90 backdrop-blur-md text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                <NinjaStar className={`h-6 w-6 ${r.viewerStarred ? "text-white" : "text-violet-400 group-hover:text-violet-300 transition-colors"}`} />
                <span className="font-bold">{r.starsCount}</span>
              </button>
              
              {canShare && (
                <Button variant="secondary" onClick={() => setShareOpen(true)} className="gap-2 rounded-2xl px-5 py-3 shadow-lg bg-slate-800/90 backdrop-blur-md">
                  <Share2 className="h-5 w-5" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
              )}
              
              <Button 
                variant="primary" 
                onClick={exportAsImage} 
                disabled={exporting}
                className="gap-2 rounded-2xl px-5 py-3 shadow-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-0 hover:shadow-violet-500/40"
              >
                {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="text-xl">📸</span>}
                <span className="hidden sm:inline">{exporting ? "Exporting..." : "Export"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

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

      {/* Hidden Export Node (rendered under the layout to prevent blank paints on Safari/Chrome) */}
      <div 
        ref={exportRef}
        className="fixed top-0 left-0 -z-50 opacity-0 w-[600px] pointer-events-none p-8"
      >
        <div className="bg-slate-900/90 rounded-3xl overflow-hidden border border-white/10 flex flex-col shadow-2xl">
          {r.imageKey ? (
            <div className="h-[400px] w-full shrink-0 relative">
              <img 
                src={`${API_BASE}/uploads/file/${encodeURIComponent(r.imageKey)}`} 
                className="w-full h-full object-cover" 
                crossOrigin="anonymous" 
                onError={(e) => {
                  e.currentTarget.src = "https://placehold.co/1200x800/1e1e2f/8b5cf6?text=CREAMi+Creation";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
            </div>
          ) : (
            <div className="pt-8" />
          )}

          <div className="p-8 pb-10 flex flex-col gap-6">
            <div>
              <div className="inline-flex rounded-full bg-violet-600/20 px-3 py-1 text-sm font-semibold text-violet-300">
                {r.category}
              </div>
              <h1 className="mt-3 text-4xl font-extrabold text-white leading-tight">
                {r.title}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <img 
                src={r.author.avatarKey ? `${API_BASE}/uploads/file/${encodeURIComponent(r.author.avatarKey)}` : `https://api.dicebear.com/7.x/open-peeps/svg?seed=${r.author.handle}`}
                className="w-12 h-12 rounded-full border border-slate-700 bg-slate-800"
                crossOrigin="anonymous" 
              />
              <div>
                <div className="text-lg font-bold text-slate-100">{r.author.displayName}</div>
                <div className="text-sm text-slate-400">@{r.author.handle}</div>
              </div>
            </div>

            <div className="text-lg text-slate-300 leading-relaxed font-medium">
              {r.description || "The ultimate Ninja CREAMi creation."}
            </div>

            <div className="grid grid-cols-2 gap-6 mt-2">
               <div>
                  <h3 className="text-violet-400 font-bold uppercase tracking-wider text-xs mb-3">Ingredients</h3>
                  <ul className="text-slate-200 space-y-1 text-sm font-medium">
                    {r.ingredients.slice(0, 6).map((ing, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-violet-500">•</span>
                        {ing}
                      </li>
                    ))}
                    {r.ingredients.length > 6 && <li className="text-slate-500 italic">+ more</li>}
                  </ul>
               </div>
               <div>
                  <h3 className="text-fuchsia-400 font-bold uppercase tracking-wider text-xs mb-3">Instructions</h3>
                  <ul className="text-slate-200 space-y-1 text-sm font-medium">
                    {r.steps.slice(0, 5).map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-fuchsia-500 font-bold">{i + 1}.</span>
                        <span className="line-clamp-2">{step}</span>
                      </li>
                    ))}
                  </ul>
               </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center opacity-80">
               <div className="flex items-center gap-2">
                 <NinjaStar className="w-5 h-5 text-violet-500" />
                 <span className="font-bold text-slate-300">CreamiNinja.com</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
