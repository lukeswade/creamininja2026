import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { RecipeCard, RecipeSummary } from "../components/RecipeCard";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Avatar } from "../components/Avatar";
import { Skeleton } from "../components/Skeleton";
import { UserPlus, UserMinus, Settings, ChefHat, Clock, Users } from "lucide-react";

type ProfileResp = {
  ok: true;
  user: {
    id: string;
    handle: string;
    displayName: string;
    avatarKey: string | null;
    createdAt: string;
  };
  recipes: RecipeSummary[];
  friendCount: number;
  isFriend: boolean;
  isPending: boolean;
};

export default function Profile() {
  const { handle } = useParams<{ handle: string }>();
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState(false);

  const q = useQuery({
    queryKey: ["profile", handle],
    queryFn: () => api<ProfileResp>(`/users/${handle}`, { method: "GET" })
  });

  async function addFriend() {
    if (!me || !q.data) return;
    setBusy(true);
    await api("/friends/request", {
      method: "POST",
      body: JSON.stringify({ toUserId: q.data.user.id })
    });
    qc.invalidateQueries({ queryKey: ["profile", handle] });
    setBusy(false);
  }

  async function unfriend() {
    if (!me || !q.data) return;
    setBusy(true);
    await api(`/friends/${q.data.user.id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["profile", handle] });
    setBusy(false);
  }

  function refetch() {
    qc.invalidateQueries({ queryKey: ["profile", handle] });
  }

  const isOwnProfile = me?.handle === handle;

  if (q.isLoading) {
    return (
      <div className="grid gap-6">
        {/* Profile header skeleton */}
        <Card className="relative overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20" />
          <div className="px-6 pb-6">
            <div className="-mt-12 flex flex-col items-center gap-4 sm:flex-row sm:items-end">
              <Skeleton className="h-24 w-24 rounded-full ring-4 ring-slate-900" />
              <div className="flex-1 text-center sm:text-left">
                <Skeleton className="h-6 w-40 mx-auto sm:mx-0" />
                <Skeleton className="mt-2 h-4 w-24 mx-auto sm:mx-0" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </Card>

        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="text-center py-4">
              <Skeleton className="h-8 w-12 mx-auto" />
              <Skeleton className="mt-2 h-3 w-16 mx-auto" />
            </Card>
          ))}
        </div>

        {/* Recipe skeleton */}
        <Card>
          <Skeleton className="h-32 w-full" />
        </Card>
      </div>
    );
  }

  if (!q.data) {
    return (
      <Card className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-200">User not found</h2>
        <p className="mt-2 text-slate-400">This profile doesn't exist</p>
        <Link to="/" className="mt-4 inline-block">
          <Button>Go home</Button>
        </Link>
      </Card>
    );
  }

  const { user: profileUser, recipes, friendCount, isFriend, isPending } = q.data;
  const memberSince = new Date(profileUser.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  return (
    <div className="grid gap-6">
      {/* Profile header */}
      <Card className="relative overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30" />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col items-center gap-4 sm:flex-row sm:items-end">
            <Avatar
              handle={profileUser.handle}
              avatarKey={profileUser.avatarKey}
              size="xl"
              className="ring-4 ring-slate-900"
            />
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-slate-100">
                {profileUser.displayName}
              </h1>
              <p className="text-slate-400">@{profileUser.handle}</p>
            </div>
            <div className="flex gap-2">
              {isOwnProfile ? (
                <Link to="/settings">
                  <Button variant="secondary" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Edit profile
                  </Button>
                </Link>
              ) : me ? (
                isFriend ? (
                  <Button
                    variant="secondary"
                    onClick={unfriend}
                    disabled={busy}
                    className="gap-2"
                  >
                    <UserMinus className="h-4 w-4" />
                    Unfriend
                  </Button>
                ) : isPending ? (
                  <Button variant="secondary" disabled className="gap-2">
                    <Clock className="h-4 w-4" />
                    Pending
                  </Button>
                ) : (
                  <Button
                    onClick={addFriend}
                    disabled={busy}
                    className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Ninjago
                  </Button>
                )
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center py-4">
          <div className="flex items-center justify-center gap-2">
            <ChefHat className="h-5 w-5 text-violet-400" />
            <span className="text-2xl font-bold text-slate-100">{recipes.length}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Recipes</p>
        </Card>
        <Card className="text-center py-4">
          <div className="flex items-center justify-center gap-2">
            <Users className="h-5 w-5 text-fuchsia-400" />
            <span className="text-2xl font-bold text-slate-100">{friendCount}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Ninjagos</p>
        </Card>
        <Card className="text-center py-4">
          <div className="flex items-center justify-center gap-2">
            <Clock className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mt-1 text-xs text-slate-400">{memberSince}</p>
        </Card>
      </div>

      {/* Recipes */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-200">
          {isOwnProfile ? "Your recipes" : `${profileUser.displayName}'s recipes`}
        </h2>
        {recipes.length === 0 ? (
          <Card className="text-center py-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
              <ChefHat className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-200">No recipes yet</h3>
            <p className="mt-2 text-sm text-slate-400">
              {isOwnProfile
                ? "Share your first creation with the community"
                : `${profileUser.displayName} hasn't shared any recipes yet`}
            </p>
            {isOwnProfile && (
              <Link to="/create" className="mt-4 inline-block">
                <Button className="gap-2">Create a recipe</Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="grid gap-4">
            {recipes.map((r) => (
              <RecipeCard key={r.id} r={r} onMutate={refetch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
