import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, API_BASE } from "../lib/api";
import { Card } from "../components/Card";
import { useAuth } from "../lib/auth";
import { Button } from "../components/Button";
import { NinjaStar } from "../components/NinjaStar";
import { Avatar } from "../components/Avatar";
import { ShareWithFriendsModal } from "../components/ShareWithFriendsModal";
import { Skeleton } from "../components/Skeleton";
import { ChefHat, Clock, Eye, EyeOff, Users, Share2, ArrowLeft } from "lucide-react";

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
  const { user, csrfToken } = useAuth();
  const [shareOpen, setShareOpen] = React.useState(false);

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

  return (
    <div className="grid gap-6">
      {/* Back link */}
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>

      {/* Main card */}
      <Card className="overflow-hidden">
        {/* Image */}
        {r.imageKey && (
          <div className="relative">
            <img
              className="w-full max-h-[400px] object-cover"
              src={`${API_BASE}/uploads/file/${encodeURIComponent(r.imageKey)}`}
              alt={r.title}
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

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={user ? toggleStar : undefined}
                disabled={!user}
                className={`group flex items-center gap-2 rounded-xl px-4 py-2 transition ${
                  r.viewerStarred
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                } ${!user ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <NinjaStar className={`h-5 w-5 ${r.viewerStarred ? "text-white" : "text-violet-400"}`} />
                <span className="font-semibold">{r.starsCount}</span>
              </button>
              
              {canShare && (
                <Button variant="secondary" onClick={() => setShareOpen(true)} className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Ingredients and Steps */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Ingredients */}
        <Card className="lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20">
              <ChefHat className="h-4 w-4 text-violet-400" />
            </span>
            Ingredients
          </h2>
          {r.ingredients.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 italic">No ingredients listed</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {r.ingredients.map((x, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-300">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-500" />
                  {x}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Steps */}
        <Card className="lg:col-span-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-600/20">
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
