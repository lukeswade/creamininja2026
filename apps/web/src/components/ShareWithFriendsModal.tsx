import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Button } from "./Button";
import { Avatar } from "./Avatar";

type Friend = { id: string; displayName: string; handle: string; avatarKey?: string | null };

export function ShareWithFriendsModal({
  open,
  onClose,
  recipeId,
  recipeTitle
}: {
  open: boolean;
  onClose: () => void;
  recipeId: string;
  recipeTitle: string;
}) {
  const { csrfToken } = useAuth();
  const [q, setQ] = React.useState("");
  const [sharedIds, setSharedIds] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!open) {
      setQ("");
      setSharedIds({});
    }
  }, [open]);

  const friends = useQuery({
    enabled: open,
    queryKey: ["friends", "share"],
    queryFn: () => api<{ ok: true; friends: Friend[] }>("/friends", { method: "GET", csrf: csrfToken || "" })
  });

  const filtered = (friends.data?.friends || []).filter((f) => {
    const s = `${f.displayName} ${f.handle}`.toLowerCase();
    return s.includes(q.trim().toLowerCase());
  });

  async function shareTo(userId: string) {
    await api(`/recipes/${recipeId}/share`, {
      method: "POST",
      body: JSON.stringify({ toUserId: userId }),
      csrf: csrfToken || ""
    });
    setSharedIds((m) => ({ ...m, [userId]: true }));
  }

  return (
    <Modal open={open} onClose={onClose} title="Share recipe">
      <div className="grid gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">{recipeTitle}</div>
          <div className="mt-1 text-xs text-slate-500">Share with friends to grant access (especially for Private recipes).</div>
        </div>

        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search friends…" />

        {friends.isLoading && <div className="text-sm text-slate-300">Loading friends…</div>}
        {friends.isError && <div className="text-sm text-red-200">Error loading friends.</div>}

        <div className="grid max-h-[52vh] gap-2 overflow-auto pr-1">
          {filtered.map((f) => {
            const shared = !!sharedIds[f.id];
            return (
              <div key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                <div className="flex items-center gap-3">
                  <Avatar avatarKey={f.avatarKey} name={f.displayName} size={30} />
                  <div>
                    <div className="text-sm font-medium text-slate-100">{f.displayName}</div>
                    <div className="text-xs text-slate-500">@{f.handle}</div>
                  </div>
                </div>
                <Button variant={shared ? "primary" : "ghost"} onClick={() => shareTo(f.id)} disabled={shared}>
                  {shared ? "Shared" : "Share"}
                </Button>
              </div>
            );
          })}

          {!friends.isLoading && filtered.length === 0 && <div className="text-sm text-slate-400">No matches.</div>}
        </div>
      </div>
    </Modal>
  );
}
