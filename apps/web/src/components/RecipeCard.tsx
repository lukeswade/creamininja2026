import React from "react";
import { Link } from "react-router-dom";
import { NinjaStar } from "./NinjaStar";
import { Avatar } from "./Avatar";
import { useAuth } from "../lib/auth";
import { api, API_BASE } from "../lib/api";
import { Eye, EyeOff, Users, Clock } from "lucide-react";

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

const visibilityConfig = {
  public: { icon: Eye, label: "Public" },
  restricted: { icon: Users, label: "Ninjagos" },
  private: { icon: EyeOff, label: "Private" }
};

export function RecipeCard({ r, onMutate }: { r: RecipeSummary; onMutate?: () => void }) {
  const { user, csrfToken } = useAuth();
  const [starring, setStarring] = React.useState(false);

  async function toggleStar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user || starring) return;
    setStarring(true);
    try {
      if (r.viewerStarred) {
        await api(`/recipes/${r.id}/star`, { method: "DELETE", csrf: csrfToken || "" });
      } else {
        await api(`/recipes/${r.id}/star`, { method: "POST", body: JSON.stringify({}), csrf: csrfToken || "" });
      }
      onMutate?.();
    } finally {
      setStarring(false);
    }
  }

  const VisIcon = visibilityConfig[r.visibility].icon;
  const formattedDate = new Date(r.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });

  return (
    <Link
      to={`/recipes/${r.id}`}
      className="group block rounded-2xl border border-slate-800 bg-slate-900/50 transition hover:border-slate-700 hover:bg-slate-900/80"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        {r.imageKey && (
          <div className="relative h-48 w-full overflow-hidden sm:h-auto sm:w-48 sm:flex-shrink-0">
            <img
              className="h-full w-full object-cover transition group-hover:scale-105 sm:rounded-l-2xl"
              src={`${API_BASE}/uploads/file/${encodeURIComponent(r.imageKey)}`}
              alt={r.title}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent sm:bg-gradient-to-r" />
          </div>
        )}

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-100 line-clamp-1 group-hover:text-white">
                  {r.title}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-600/20 px-2 py-0.5 text-xs font-medium text-violet-300">
                    {r.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <VisIcon className="h-3 w-3" />
                    {visibilityConfig[r.visibility].label}
                  </span>
                </div>
              </div>

              {/* Star button */}
              <button
                onClick={toggleStar}
                disabled={!user || starring}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  r.viewerStarred
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                } ${!user ? "cursor-default opacity-60" : ""}`}
              >
                <NinjaStar className={`h-4 w-4 ${starring ? "animate-pulse" : ""}`} />
                <span>{r.starsCount}</span>
              </button>
            </div>

            {/* Description */}
            {r.description && (
              <p className="mt-2 text-sm text-slate-400 line-clamp-2">{r.description}</p>
            )}
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-800/50 pt-3">
            <div className="flex items-center gap-2">
              <Avatar
                handle={r.author.handle}
                avatarKey={r.author.avatarKey}
                size="xs"
              />
              <span className="text-sm text-slate-400">
                <span className="font-medium text-slate-300">{r.author.displayName}</span>
              </span>
            </div>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {formattedDate}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
