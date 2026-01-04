import React from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { RecipeCard, RecipeSummary } from "../components/RecipeCard";
import { useAuth } from "../lib/auth";

export default function Profile() {
  const { handle } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["profile", handle, !!user],
    queryFn: () => api<{ ok: true; recipes: RecipeSummary[] }>(`/recipes/by-handle/${handle}`, { method: "GET" })
  });

  return (
    <div className="grid gap-4">
      <Card>
        <div className="text-lg font-semibold">@{handle}</div>
        <div className="mt-1 text-sm text-slate-400">Recipes visible to you.</div>
      </Card>

      <div className="grid gap-3">
        {(q.data?.recipes || []).map((r) => (
          <RecipeCard key={r.id} r={r} onMutate={() => qc.invalidateQueries({ queryKey: ["profile", handle] })} />
        ))}
        {q.data?.recipes?.length === 0 && <div className="text-slate-400">No visible recipes yet.</div>}
      </div>
    </div>
  );
}
