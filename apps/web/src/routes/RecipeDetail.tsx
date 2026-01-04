import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, API_BASE } from "../lib/api";
import { Card } from "../components/Card";
import { useAuth } from "../lib/auth";
import { Button } from "../components/Button";
import { NinjaStar } from "../components/NinjaStar";
import { Avatar } from "../components/Avatar";
import { ShareWithFriendsModal } from "../components/ShareWithFriendsModal";

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
  if (q.isLoading) return <div className="text-slate-300">Loading…</div>;
  if (q.isError) return <div className="text-red-200">Error: {(q.error as any).message}</div>;
  if (!r) return <div className="text-slate-400">Not found.</div>;

  const canShare = !!user && !!r && r.author.id === user.id;

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold">{r.title}</div>
            <div className="mt-1 text-sm text-slate-400">
              <span className="inline-flex items-center gap-2">
                <Avatar avatarKey={r.author.avatarKey} name={r.author.displayName} size={20} />
                <span className="text-slate-200">@{r.author.handle}</span>
              </span>
              <span className="mx-2 text-slate-700">•</span>
              {r.category}
              <span className="mx-2 text-slate-700">•</span>
              {r.visibility}
              <span className="mx-2 text-slate-700">•</span>
              {new Date(r.createdAt).toLocaleString()}
            </div>
            {r.description && <div className="mt-3 text-slate-200">{r.description}</div>}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-slate-200">
              <NinjaStar className="h-6 w-6" />
              <span className="text-lg font-semibold">{r.starsCount}</span>
            </div>
            {user && (
              <Button variant={r.viewerStarred ? "primary" : "ghost"} onClick={toggleStar}>
                {r.viewerStarred ? "Starred" : "Star"}
              </Button>
            )}
            {canShare && (
              <Button variant="ghost" onClick={() => setShareOpen(true)}>
                Share
              </Button>
            )}
          </div>
        </div>

        {r.imageKey && (
          <div className="mt-4">
            <img
              className="w-full max-h-[420px] rounded-xl object-cover border border-slate-800"
              src={`${API_BASE}/uploads/file/${encodeURIComponent(r.imageKey)}`}
              alt={r.title}
            />
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold">Ingredients</div>
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-200">
            {r.ingredients.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <div className="text-sm font-semibold">Steps</div>
          <ol className="mt-3 list-decimal pl-5 text-sm text-slate-200">
            {r.steps.map((x, i) => (
              <li key={i} className="mb-2">
                {x}
              </li>
            ))}
          </ol>
        </Card>
      </div>

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
