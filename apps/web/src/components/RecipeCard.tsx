import React from "react";
import { Link } from "react-router-dom";
import { NinjaStar } from "./NinjaStar";
import { Button } from "./Button";
import { Avatar } from "./Avatar";
import { useAuth } from "../lib/auth";
import { api, API_BASE } from "../lib/api";

export type RecipeSummary = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  visibility: "private" | "restricted" | "public";
  imageKey?: string | null;
  starsCount: number;
  viewerStarred?: boolean;
  createdAt: string;
  author: { id: string; displayName: string; handle: string; avatarKey?: string | null };
};

export function RecipeCard({ r, onMutate }: { r: RecipeSummary; onMutate?: () => void }) {
  const { user, csrfToken } = useAuth();

  async function toggleStar() {
    if (!user) return;
    if (r.viewerStarred) {
      await api(`/recipes/${r.id}/star`, { method: "DELETE", csrf: csrfToken || "" });
    } else {
      await api(`/recipes/${r.id}/star`, { method: "POST", body: JSON.stringify({}), csrf: csrfToken || "" });
    }
    onMutate?.();
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 hover:border-slate-700 transition">
      <div className="flex flex-col gap-4 md:flex-row">
        {r.imageKey && (
          <Link
            to={`/recipes/${r.id}`}
            className="block h-[160px] w-full overflow-hidden rounded-xl border border-slate-800 md:h-[120px] md:w-[180px]"
          >
            <img
              className="h-full w-full object-cover"
              src={`${API_BASE}/uploads/file/${encodeURIComponent(r.imageKey)}`}
              alt={r.title}
              loading="lazy"
            />
          </Link>
        )}

        <div className="flex flex-1 items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/recipes/${r.id}`} className="text-lg font-semibold text-slate-100 hover:text-white">
                {r.title}
              </Link>
              <span className="rounded-full border border-slate-800 bg-slate-900/60 px-2 py-0.5 text-xs text-slate-300">
                {r.category}
              </span>
              <span className="rounded-full border border-slate-800 bg-slate-900/60 px-2 py-0.5 text-xs text-slate-400">
                {r.visibility}
              </span>
            </div>

            {r.description && <p className="mt-2 text-sm text-slate-300 line-clamp-2">{r.description}</p>}

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Avatar avatarKey={r.author.avatarKey} name={r.author.displayName} size={22} />
              <span>
                <Link to={`/u/${r.author.handle}`} className="text-slate-300 hover:text-white">
                  @{r.author.handle}
                </Link>
                <span className="mx-2 text-slate-700">•</span>
                {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-slate-200">
              <NinjaStar className="h-5 w-5" />
              <span className="text-sm font-medium">{r.starsCount}</span>
            </div>
            {user && (
              <Button variant={r.viewerStarred ? "primary" : "ghost"} onClick={toggleStar}>
                {r.viewerStarred ? "Starred" : "Star"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
