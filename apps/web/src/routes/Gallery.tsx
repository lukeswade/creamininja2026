import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "../lib/api";
import { RecipeSummary } from "../components/RecipeCard";
import { Card } from "../components/Card";
import { useAuth } from "../lib/auth";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { Link } from "react-router-dom";
import { Users, Flame, Camera, Star, Clock, Zap, ChevronDown } from "lucide-react";
import { NinjaStar } from "../components/NinjaStar";

type FeedResp = { ok: true; items: RecipeSummary[] };
type SortMode = "stars" | "time" | "spicy";

const sortConfig: Record<SortMode, { icon: typeof Star; label: string; description: string }> = {
  stars: { icon: Star, label: "Stars", description: "Most starred" },
  time: { icon: Clock, label: "Recent", description: "Chronological" },
  spicy: { icon: Zap, label: "Spicy", description: "Trending (24h)" }
};

export default function Gallery() {
  const { user, csrfToken } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<"network" | "popular">("popular");
  const [window, setWindow] = React.useState<"day" | "week" | "month" | "all">("week");
  const [sort, setSort] = React.useState<SortMode>("stars");
  const [sortOpen, setSortOpen] = React.useState(false);

  // Update default sort when switching tabs
  React.useEffect(() => {
    setSort(tab === "popular" ? "stars" : "time");
  }, [tab]);

  const q = useQuery({
    queryKey: ["gallery", tab, window, sort, !!user],
    queryFn: async () => {
      const params = new URLSearchParams({ window, sort });
      if (tab === "network") return api<FeedResp>(`/feed/network?${params}`, { method: "GET" });
      return api<FeedResp>(`/feed/popular?${params}`, { method: "GET" });
    },
    select: (data) => ({
      ...data,
      // Filter to only recipes with images
      items: data.items.filter((r) => r.imageKey)
    })
  });

  function refetch() {
    qc.invalidateQueries({ queryKey: ["gallery"] });
  }

  const windowLabels = {
    day: "Today",
    week: "This week",
    month: "This month",
    all: "All time"
  };

  const SortIcon = sortConfig[sort].icon;

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          {tab === "popular" ? "Visual Feast" : "Network Gallery"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {tab === "popular"
            ? "Eye candy from the CREAMi community"
            : "Beautiful creations from your Dojo"}
        </p>
      </div>

      {/* Tabs and filters */}
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("popular")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "popular"
                ? "bg-violet-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Flame className="h-4 w-4" />
            Popular
          </button>
          <button
            onClick={() => setTab("network")}
            disabled={!user}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "network"
                ? "bg-violet-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            <Users className="h-4 w-4" />
            Network
          </button>
          {!user && (
            <span className="text-xs text-slate-500">
              <Link to="/login" className="text-violet-400 hover:underline">
                Sign in
              </Link>{" "}
              for Network
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
            >
              <SortIcon className="h-4 w-4 text-slate-400" />
              {sortConfig[sort].label}
              <ChevronDown className={`h-4 w-4 text-slate-500 transition ${sortOpen ? "rotate-180" : ""}`} />
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl">
                  {(Object.keys(sortConfig) as SortMode[]).map((s) => {
                    const { icon: Icon, label, description } = sortConfig[s];
                    return (
                      <button
                        key={s}
                        onClick={() => { setSort(s); setSortOpen(false); }}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition ${
                          sort === s
                            ? "bg-violet-600/20 text-violet-300"
                            : "text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{label}</div>
                          <div className="text-xs text-slate-500">{description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Time window filter */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-900/50 p-1">
            {(["day", "week", "month", "all"] as const).map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  window === w
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {windowLabels[w]}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Loading state */}
      {q.isLoading && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      )}

      {/* Error state */}
      {q.isError && (
        <Card className="border-red-900/50 bg-red-950/20">
          <div className="text-center py-4">
            <p className="text-red-200">Failed to load gallery</p>
            <Button variant="ghost" onClick={() => q.refetch()} className="mt-2">
              Try again
            </Button>
          </div>
        </Card>
      )}

      {/* Gallery grid */}
      {!q.isLoading && !q.isError && (
        <>
          {(q.data?.items || []).length === 0 ? (
            <Card className="text-center py-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                <Camera className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-200">No photos yet</h3>
              <p className="mt-2 text-sm text-slate-400">
                {tab === "network"
                  ? "Your ninjas haven't shared any photos yet"
                  : "Be the first to share a beautiful creation!"}
              </p>
              {user && (
                <Link to="/create" className="mt-4 inline-block">
                  <Button className="gap-2">
                    <Camera className="h-4 w-4" />
                    Create with a photo
                  </Button>
                </Link>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {(q.data?.items || []).map((r) => (
                <GalleryItem key={r.id} r={r} onMutate={refetch} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GalleryItem({ r, onMutate }: { r: RecipeSummary; onMutate?: () => void }) {
  const { user, csrfToken } = useAuth();
  const [starring, setStarring] = React.useState(false);
  const [justThrew, setJustThrew] = React.useState(false);

  async function toggleStar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user || starring) return;
    setStarring(true);
    const wasStarred = r.viewerStarred;
    try {
      if (wasStarred) {
        await api(`/recipes/${r.id}/star`, { method: "DELETE", csrf: csrfToken || "" });
      } else {
        await api(`/recipes/${r.id}/star`, { method: "POST", body: JSON.stringify({}), csrf: csrfToken || "" });
        setJustThrew(true);
        setTimeout(() => setJustThrew(false), 600);
      }
      onMutate?.();
    } finally {
      setStarring(false);
    }
  }

  return (
    <Link
      to={`/recipes/${r.id}`}
      className="group relative aspect-square overflow-hidden rounded-xl bg-slate-900"
    >
      <img
        src={`${API_BASE}/uploads/file/${encodeURIComponent(r.imageKey!)}`}
        alt={r.title}
        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        loading="lazy"
      />
      
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      {/* Content overlay on hover */}
      <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <h3 className="text-sm font-semibold text-white line-clamp-2">{r.title}</h3>
        <p className="mt-0.5 text-xs text-slate-300">@{r.author.handle}</p>
      </div>
      
      {/* Star button - always visible */}
      <button
        onClick={toggleStar}
        disabled={!user || starring}
        title={!user ? "Log in to throw stars" : r.viewerStarred ? "Take back your star" : "Throw a star! 🥷"}
        className={`absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium backdrop-blur-sm transition ${
          r.viewerStarred
            ? "bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white"
            : "bg-black/50 text-white hover:bg-black/70"
        } ${!user ? "cursor-default" : ""}`}
      >
        <NinjaStar
          className={`h-3.5 w-3.5 ${starring ? "animate-pulse" : ""} ${
            justThrew ? "animate-[throw_0.6s_ease-out]" : ""
          }`}
        />
        <span>{r.starsCount}</span>
      </button>
      
      {/* Category badge */}
      <div className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100">
        {r.category}
      </div>
    </Link>
  );
}
