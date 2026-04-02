import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "../lib/api";
import { useAuth } from "../lib/auth";
import { RecipeCard, RecipeSummary } from "../components/RecipeCard";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Avatar } from "../components/Avatar";
import { Skeleton } from "../components/Skeleton";
import { UserPlus, UserMinus, Settings, ChefHat, Clock, Users, ImagePlus, Camera, Save, Loader2 } from "lucide-react";

type ProfileResp = {
  ok: true;
  user: {
    id: string;
    handle: string;
    displayName: string;
    avatarKey: string | null;
    bannerKey: string | null;
    createdAt: string;
  };
  recipes: RecipeSummary[];
  friendCount: number;
  isFriend: boolean;
  isPending: boolean;
};

export default function Profile() {
  const { handle } = useParams<{ handle: string }>();
  const cleanHandle = (handle || "").replace(/^@/, "");
  const { user: me, csrfToken, setAuth } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [profileErr, setProfileErr] = React.useState<string | null>(null);
  const [displayNameDraft, setDisplayNameDraft] = React.useState("");

  const q = useQuery({
    queryKey: ["profile", cleanHandle],
    queryFn: () => api<ProfileResp>(`/users/${cleanHandle}`, { method: "GET" }),
    enabled: !!cleanHandle
  });

  async function addFriend() {
    if (!me || !q.data) return;
    setBusy(true);
    await api("/friends/request", {
      method: "POST",
      body: JSON.stringify({ toUserId: q.data.user.id }),
      csrf: csrfToken || ""
    });
    qc.invalidateQueries({ queryKey: ["profile", cleanHandle] });
    setBusy(false);
  }

  async function unfriend() {
    if (!me || !q.data) return;
    setBusy(true);
    await api(`/friends/${q.data.user.id}`, { method: "DELETE", csrf: csrfToken || "" });
    qc.invalidateQueries({ queryKey: ["profile", cleanHandle] });
    setBusy(false);
  }

  function refetch() {
    qc.invalidateQueries({ queryKey: ["profile", cleanHandle] });
  }

  const isOwnProfile = me?.handle === cleanHandle;
  const profileUser = q.data?.user;

  React.useEffect(() => {
    if (profileUser) {
      setDisplayNameDraft(profileUser.displayName);
    }
  }, [profileUser?.displayName]);

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

  const { user: loadedProfileUser, recipes, friendCount, isFriend, isPending } = q.data;
  const profileUserToRender = loadedProfileUser;
  const memberSince = new Date(profileUserToRender.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  async function saveProfile(payload: { displayName?: string; avatarKey?: string | null; bannerKey?: string | null }) {
    setSavingProfile(true);
    setProfileErr(null);
    try {
      const res = await api<{ ok: true; user: typeof me }>(`/users/me`, {
        method: "PATCH",
        csrf: csrfToken || "",
        body: JSON.stringify(payload)
      });
      setAuth(res.user as any, csrfToken || null);
      await qc.invalidateQueries({ queryKey: ["profile", cleanHandle] });
    } catch (e: any) {
      setProfileErr(e.message || "Profile update failed");
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadProfileImage(file: File, kind: "avatar" | "banner") {
    setProfileErr(null);
    setSavingProfile(true);
    try {
      const presign = await api<{ ok: true; key: string; url: string; headers: Record<string, string> }>("/uploads/presign", {
        method: "POST",
        csrf: csrfToken || "",
        body: JSON.stringify({ kind, contentType: file.type, bytes: file.size })
      });

      const putRes = await fetch(presign.url, {
        method: "PUT",
        headers: presign.headers,
        body: file
      });
      if (!putRes.ok) throw new Error(`Failed to upload ${kind} image`);

      await saveProfile(kind === "avatar" ? { avatarKey: presign.key } : { bannerKey: presign.key });
    } catch (e: any) {
      setProfileErr(e.message || `Failed to update ${kind} image`);
      setSavingProfile(false);
    }
  }

  async function saveDisplayName() {
    await saveProfile({ displayName: displayNameDraft.trim() });
  }

  return (
    <div className="grid gap-6">
      {/* Profile header */}
      <Card className="relative overflow-hidden">
        <div className="relative h-28 overflow-hidden bg-slate-900">
          {profileUserToRender.bannerKey ? (
            <img
              src={`${API_BASE}/uploads/file/${encodeURIComponent(profileUserToRender.bannerKey)}`}
              alt={`${profileUserToRender.displayName} banner`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col items-center gap-4 sm:flex-row sm:items-end">
            <div className="relative">
              <Avatar
                handle={profileUserToRender.handle}
                avatarKey={profileUserToRender.avatarKey}
                size="xl"
                className="ring-4 ring-slate-900"
              />
              {isOwnProfile && (
                <label className="absolute -bottom-1 -right-1 inline-flex cursor-pointer items-center justify-center rounded-full border border-white/15 bg-slate-900/85 p-2 text-slate-200 backdrop-blur">
                  <Camera className="h-4 w-4" />
                  <input
                    className="hidden"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadProfileImage(file, "avatar");
                    }}
                  />
                </label>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-slate-100">
                {profileUserToRender.displayName}
              </h1>
              <p className="text-slate-400">@{profileUserToRender.handle}</p>
            </div>
            <div className="flex gap-2">
              {isOwnProfile ? (
                <>
                  <Button variant="secondary" className="gap-2" onClick={() => setEditing((v) => !v)}>
                    <Settings className="h-4 w-4" />
                    {editing ? "Close editor" : "Edit profile"}
                  </Button>
                  <Link to="/create">
                    <Button className="gap-2">Create recipe</Button>
                  </Link>
                </>
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

        {isOwnProfile && editing && (
          <div className="border-t border-white/5 px-6 pb-6 pt-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <label className="text-xs text-slate-400">Display name</label>
                <input
                  value={displayNameDraft}
                  onChange={(e) => setDisplayNameDraft(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100"
                  placeholder="Your display name"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={saveDisplayName} disabled={savingProfile || !displayNameDraft.trim()} className="gap-2">
                  {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
                <ImagePlus className="h-4 w-4 text-violet-300" />
                Update banner
                <input
                  className="hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadProfileImage(file, "banner");
                  }}
                />
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
                <Camera className="h-4 w-4 text-fuchsia-300" />
                Update avatar
                <input
                  className="hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadProfileImage(file, "avatar");
                  }}
                />
              </label>
            </div>

            {profileErr && <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">{profileErr}</div>}
          </div>
        )}
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
                : `${profileUserToRender.displayName} hasn't shared any recipes yet`}
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
