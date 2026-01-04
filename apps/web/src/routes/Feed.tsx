import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { RecipeCard, RecipeSummary } from "../components/RecipeCard";
import { Card } from "../components/Card";
import { useAuth } from "../lib/auth";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { Link } from "react-router-dom";
import { TrendingUp, Users, Plus, Flame } from "lucide-react";

type FeedItem = RecipeSummary;
type FeedResp = { ok: true; items: FeedItem[] };

export default function Feed() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<"network" | "popular">("popular");
  const [window, setWindow] = React.useState<"day" | "week" | "month" | "all">("week");

  const q = useQuery({
    queryKey: ["feed", tab, window, !!user],
    queryFn: async () => {
      if (tab === "network") return api<FeedResp>("/feed/network", { method: "GET" });
      return api<FeedResp>(`/feed/popular?window=${window}`, { method: "GET" });
    }
  });

  function refetch() {
    qc.invalidateQueries({ queryKey: ["feed"] });
  }

  const windowLabels = {
    day: "Today",
    week: "This week",
    month: "This month",
    all: "All time"
  };

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            {tab === "popular" ? "Trending recipes" : "Your network"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {tab === "popular" 
              ? "See what the community is loving right now" 
              : "Latest from your Dojo"}
          </p>
        </div>
        {user && (
          <Link to="/create">
            <Button className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600">
              <Plus className="h-4 w-4" />
              New recipe
            </Button>
          </Link>
        )}
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
              <Link to="/login" className="text-violet-400 hover:underline">Sign in</Link> for Network
            </span>
          )}
        </div>

        {tab === "popular" && (
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
        )}
      </Card>

      {/* Loading state */}
      {q.isLoading && (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Skeleton className="h-32 w-full rounded-xl sm:h-24 sm:w-40" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-2/3" />
                  <div className="mt-4 flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Error state */}
      {q.isError && (
        <Card className="border-red-900/50 bg-red-950/20">
          <div className="text-center py-4">
            <p className="text-red-200">Failed to load feed</p>
            <Button variant="ghost" onClick={() => q.refetch()} className="mt-2">
              Try again
            </Button>
          </div>
        </Card>
      )}

      {/* Feed content */}
      {!q.isLoading && !q.isError && (
        <div className="grid gap-4">
          {(q.data?.items || []).map((r) => (
            <RecipeCard key={r.id} r={r} onMutate={refetch} />
          ))}
          
          {/* Empty state */}
          {q.data?.items?.length === 0 && (
            <Card className="text-center py-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                <TrendingUp className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-200">No recipes yet</h3>
              <p className="mt-2 text-sm text-slate-400">
                {tab === "network" 
                  ? "Add some ninjas to your Dojo or wait for them to share recipes" 
                  : "Be the first to share a creation!"}
              </p>
              {user && (
                <Link to="/create" className="mt-4 inline-block">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create your first recipe
                  </Button>
                </Link>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
