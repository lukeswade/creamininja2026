import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Avatar } from "../components/Avatar";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Skeleton } from "../components/Skeleton";
import { Users, UserCheck, UserX, Clock, Search, UserPlus, Send, Loader2 } from "lucide-react";

type Friend = { id: string; handle: string; displayName: string; avatarKey: string | null; requestId?: string };
type FriendsResp = { ok: true; friends: Friend[]; pending: Friend[]; outgoing: Friend[] };
type SearchUser = { id: string; handle: string; displayName: string; avatarKey: string | null; status: "friend" | "pending_outgoing" | "pending_incoming" | "none" };
type SearchResp = { ok: true; users: SearchUser[] };

export default function Friends() {
  const { user, csrfToken } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<"friends" | "pending" | "recruit">("friends");
  const [search, setSearch] = React.useState("");
  const [recruitSearch, setRecruitSearch] = React.useState("");
  const [sendingRequest, setSendingRequest] = React.useState<string | null>(null);

  const q = useQuery({
    queryKey: ["friends"],
    queryFn: () => api<FriendsResp>("/friends", { method: "GET" }),
    enabled: !!user
  });

  const searchQ = useQuery({
    queryKey: ["friends-search", recruitSearch],
    queryFn: () => api<SearchResp>(`/friends/search?q=${encodeURIComponent(recruitSearch)}`, { method: "GET" }),
    enabled: !!user && recruitSearch.length >= 2
  });

  async function accept(requestId: string) {
    await api("/friends/accept", { method: "POST", body: JSON.stringify({ requestId }), csrf: csrfToken || "" });
    qc.invalidateQueries({ queryKey: ["friends"] });
  }

  async function decline(requestId: string) {
    await api("/friends/reject", { method: "POST", body: JSON.stringify({ requestId }), csrf: csrfToken || "" });
    qc.invalidateQueries({ queryKey: ["friends"] });
  }

  async function remove(id: string) {
    await api(`/friends/${id}`, { method: "DELETE", csrf: csrfToken || "" });
    qc.invalidateQueries({ queryKey: ["friends"] });
  }

  async function sendRequest(handleOrEmail: string) {
    setSendingRequest(handleOrEmail);
    try {
      await api("/friends/request", { method: "POST", body: JSON.stringify({ handleOrEmail }), csrf: csrfToken || "" });
      qc.invalidateQueries({ queryKey: ["friends"] });
      qc.invalidateQueries({ queryKey: ["friends-search"] });
    } finally {
      setSendingRequest(null);
    }
  }

  if (!user) return <Navigate to="/login" replace />;

  const friends = q.data?.friends || [];
  const pending = q.data?.pending || [];
  const outgoing = q.data?.outgoing || [];

  const filteredFriends = friends.filter(
    (f) =>
      f.displayName.toLowerCase().includes(search.toLowerCase()) ||
      f.handle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">The Dojo</h1>
        <p className="mt-1 text-sm text-slate-400">
          Your ninja network — connect with fellow CREAMi masters
        </p>
      </div>

      {/* Tabs */}
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("friends")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "friends"
                ? "bg-violet-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Users className="h-4 w-4" />
            Ninjas
            {friends.length > 0 && (
              <span className="ml-1 rounded-full bg-slate-700 px-2 py-0.5 text-xs">
                {friends.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("pending")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "pending"
                ? "bg-violet-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Clock className="h-4 w-4" />
            Requests
            {(pending.length + outgoing.length) > 0 && (
              <span className="ml-1 rounded-full bg-fuchsia-600 px-2 py-0.5 text-xs text-white">
                {pending.length + outgoing.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("recruit")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "recruit"
                ? "bg-violet-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Recruit
          </button>
        </div>

        {tab === "friends" && friends.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search friends..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
        )}
      </Card>

      {/* Loading */}
      {q.isLoading && (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
              <Skeleton className="h-9 w-24" />
            </Card>
          ))}
        </div>
      )}

      {/* Friends list */}
      {!q.isLoading && tab === "friends" && (
        <>
          {filteredFriends.length === 0 ? (
            <Card className="text-center py-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                <Users className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-200">
                {search ? "No matching ninjas" : "No ninjas in your dojo yet"}
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                {search
                  ? "Try a different search term"
                  : "Visit profiles to recruit ninjas into your dojo"}
              </p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredFriends.map((f) => (
                <Card key={f.id} className="flex items-center gap-4">
                  <Link to={`/@${f.handle}`}>
                    <Avatar handle={f.handle} avatarKey={f.avatarKey} size="md" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/@${f.handle}`} className="hover:underline">
                      <p className="font-medium text-slate-200 truncate">
                        {f.displayName}
                      </p>
                    </Link>
                    <p className="text-sm text-slate-400 truncate">@{f.handle}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(f.id)}
                    className="text-slate-400 hover:text-red-400"
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Pending requests */}
      {!q.isLoading && tab === "pending" && (
        <>
          {pending.length === 0 && outgoing.length === 0 ? (
            <Card className="text-center py-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                <Clock className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-200">
                No pending requests
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                When someone wants to connect, you'll see them here
              </p>
              <Button
                onClick={() => setTab("recruit")}
                className="mt-4 gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Recruit ninjas
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6">
              {/* Incoming requests */}
              {pending.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-medium text-slate-400">Incoming requests</h3>
                  <div className="grid gap-3">
                    {pending.map((f) => (
                      <Card key={f.id} className="flex items-center gap-4">
                        <Link to={`/@${f.handle}`}>
                          <Avatar handle={f.handle} avatarKey={f.avatarKey} size="md" />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={`/@${f.handle}`} className="hover:underline">
                            <p className="font-medium text-slate-200 truncate">
                              {f.displayName}
                            </p>
                          </Link>
                          <p className="text-sm text-slate-400 truncate">@{f.handle}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => accept(f.requestId!)}
                            className="gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600"
                          >
                            <UserCheck className="h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => decline(f.requestId!)}
                            className="text-slate-400 hover:text-red-400"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Outgoing requests */}
              {outgoing.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-medium text-slate-400">Sent requests (waiting for response)</h3>
                  <div className="grid gap-3">
                    {outgoing.map((f) => (
                      <Card key={f.id} className="flex items-center gap-4">
                        <Link to={`/@${f.handle}`}>
                          <Avatar handle={f.handle} avatarKey={f.avatarKey} size="md" />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={`/@${f.handle}`} className="hover:underline">
                            <p className="font-medium text-slate-200 truncate">
                              {f.displayName}
                            </p>
                          </Link>
                          <p className="text-sm text-slate-400 truncate">@{f.handle}</p>
                        </div>
                        <span className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Recruit tab */}
      {!q.isLoading && tab === "recruit" && (
        <div className="grid gap-6">
          <Card>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by username or display name..."
                value={recruitSearch}
                onChange={(e) => setRecruitSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/50 py-3 pl-11 pr-4 text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                autoFocus
              />
            </div>
          </Card>

          {recruitSearch.length < 2 ? (
            <Card className="text-center py-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                <UserPlus className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-200">
                Find ninjas to recruit
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Search by username or name to send friend requests
              </p>
            </Card>
          ) : searchQ.isLoading ? (
            <div className="grid gap-3">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-2 h-3 w-24" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </Card>
              ))}
            </div>
          ) : (searchQ.data?.users || []).length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-slate-400">No ninjas found matching "{recruitSearch}"</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {(searchQ.data?.users || []).map((u) => (
                <Card key={u.id} className="flex items-center gap-4">
                  <Link to={`/@${u.handle}`}>
                    <Avatar handle={u.handle} avatarKey={u.avatarKey} size="md" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/@${u.handle}`} className="hover:underline">
                      <p className="font-medium text-slate-200 truncate">
                        {u.displayName}
                      </p>
                    </Link>
                    <p className="text-sm text-slate-400 truncate">@{u.handle}</p>
                  </div>
                  {u.status === "friend" ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-600/20 px-3 py-1 text-xs font-medium text-emerald-400">
                      <UserCheck className="h-3 w-3" />
                      In your Dojo
                    </span>
                  ) : u.status === "pending_outgoing" ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400">
                      <Clock className="h-3 w-3" />
                      Request sent
                    </span>
                  ) : u.status === "pending_incoming" ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        // Find the request and accept it
                        const req = pending.find(p => p.id === u.id);
                        if (req?.requestId) accept(req.requestId);
                      }}
                      className="gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600"
                    >
                      <UserCheck className="h-4 w-4" />
                      Accept
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => sendRequest(u.handle)}
                      disabled={sendingRequest === u.handle}
                      className="gap-1.5"
                    >
                      {sendingRequest === u.handle ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Recruit
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
