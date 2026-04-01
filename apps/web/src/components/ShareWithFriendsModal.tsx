import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Button } from "./Button";
import { Avatar } from "./Avatar";
import { Copy } from "lucide-react";

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

  const [copied, setCopied] = React.useState(false);

  function copyViralCaption() {
    const caption = `Just made "${recipeTitle}" in the Ninja CREAMi! 🥷🍦 Snag the full recipe and macros natively here: https://creamininja.com/recipes/${recipeId} #ninjacreami #creamininja #proteindessert #healthyicecream`;
    navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        <div className="mt-2 border-t border-slate-800 pt-4">
          <Button variant="secondary" onClick={copyViralCaption} className="w-full gap-2">
            <Copy className="h-4 w-4" />
            {copied ? "Copied to clipboard!" : "Copy Viral TikTok/IG Caption"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
