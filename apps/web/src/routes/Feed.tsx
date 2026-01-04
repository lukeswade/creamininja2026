import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { RecipeCard, RecipeSummary } from "../components/RecipeCard";
import { Card } from "../components/Card";
import { useAuth } from "../lib/auth";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";

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

  return (
    <div className="grid gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant={tab === "popular" ? "primary" : "ghost"} onClick={() => setTab("popular")}>
            Popular
          </Button>
          <Button variant={tab === "network" ? "primary" : "ghost"} onClick={() => setTab("network")} disabled={!user}>
            Network
          </Button>
          {!user && <span className="text-xs text-slate-500">Log in to see Network feed.</span>}
        </div>

        {tab === "popular" && (
          <div className="flex items-center gap-2">
            {(["day", "week", "month", "all"] as const).map((w) => (
              <Button key={w} variant={window === w ? "primary" : "ghost"} onClick={() => setWindow(w)}>
                {w}
              </Button>
            ))}
          </div>
        )}
      </Card>

      {q.isLoading && (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-5/6" />
                  <div className="mt-4 flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {q.isError && <div className="text-red-200">Error: {(q.error as any).message}</div>}

      {!q.isLoading && (
        <div className="grid gap-3">
          {(q.data?.items || []).map((r) => (
            <RecipeCard key={r.id} r={r} onMutate={refetch} />
          ))}
          {q.data?.items?.length === 0 && <div className="text-slate-400">No items yet. Create the first one.</div>}
        </div>
      )}
    </div>
  );
}
