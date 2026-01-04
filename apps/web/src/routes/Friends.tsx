import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

type Friend = { id: string; displayName: string; handle: string; avatarKey: string | null };
type ReqIn = { id: string; fromUserId: string; displayName: string; handle: string; createdAt: string };
type ReqOut = { id: string; toUserId: string; displayName: string; handle: string; createdAt: string };

export default function Friends() {
  const { csrfToken } = useAuth();
  const qc = useQueryClient();
  const [target, setTarget] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);

  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: () => api<{ ok: true; friends: Friend[] }>("/friends", { method: "GET" })
  });

  const reqs = useQuery({
    queryKey: ["friend-requests"],
    queryFn: () => api<{ ok: true; incoming: ReqIn[]; outgoing: ReqOut[] }>("/friends/requests", { method: "GET" })
  });

  async function send() {
    setErr(null);
    try {
      await api("/friends/request", { method: "POST", csrf: csrfToken || "", body: JSON.stringify({ handleOrEmail: target }) });
      setTarget("");
      qc.invalidateQueries({ queryKey: ["friend-requests"] });
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function accept(id: string) {
    await api("/friends/accept", { method: "POST", csrf: csrfToken || "", body: JSON.stringify({ requestId: id }) });
    qc.invalidateQueries({ queryKey: ["friends"] });
    qc.invalidateQueries({ queryKey: ["friend-requests"] });
  }

  async function reject(id: string) {
    await api("/friends/reject", { method: "POST", csrf: csrfToken || "", body: JSON.stringify({ requestId: id }) });
    qc.invalidateQueries({ queryKey: ["friend-requests"] });
  }

  return (
    <div className="grid gap-4">
      <Card>
        <div className="text-lg font-semibold">Ninjagos</div>
        <div className="mt-1 text-sm text-slate-400">Friends list + recipe sharing.</div>
        <div className="mt-4 flex gap-2">
          <Input placeholder="Friend handle or email" value={target} onChange={(e) => setTarget(e.target.value)} />
          <Button onClick={send} disabled={!target.trim()}>
            Send request
          </Button>
        </div>
        {err && <div className="mt-3 text-sm text-red-200">{err}</div>}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold">Friends</div>
          <div className="mt-3 grid gap-2">
            {(friends.data?.friends || []).map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-md border border-slate-800 px-3 py-2">
                <div>
                  <div className="text-sm text-slate-100">{f.displayName}</div>
                  <div className="text-xs text-slate-400">@{f.handle}</div>
                </div>
              </div>
            ))}
            {friends.data?.friends?.length === 0 && <div className="text-sm text-slate-400">No Ninjagos yet.</div>}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold">Requests</div>

          <div className="mt-3">
            <div className="text-xs text-slate-500">Incoming</div>
            <div className="mt-2 grid gap-2">
              {(reqs.data?.incoming || []).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border border-slate-800 px-3 py-2">
                  <div>
                    <div className="text-sm text-slate-100">{r.displayName}</div>
                    <div className="text-xs text-slate-400">@{r.handle}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => accept(r.id)}>Accept</Button>
                    <Button variant="ghost" onClick={() => reject(r.id)}>
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
              {reqs.data?.incoming?.length === 0 && <div className="text-sm text-slate-400">No incoming requests.</div>}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs text-slate-500">Outgoing</div>
            <div className="mt-2 grid gap-2">
              {(reqs.data?.outgoing || []).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border border-slate-800 px-3 py-2">
                  <div>
                    <div className="text-sm text-slate-100">{r.displayName}</div>
                    <div className="text-xs text-slate-400">@{r.handle}</div>
                  </div>
                  <div className="text-xs text-slate-500">Pending</div>
                </div>
              ))}
              {reqs.data?.outgoing?.length === 0 && <div className="text-sm text-slate-400">No outgoing requests.</div>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
