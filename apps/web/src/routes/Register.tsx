import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Turnstile } from "../components/Turnstile";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Register() {
  const nav = useNavigate();
  const { setAuth } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [handle, setHandle] = React.useState("");
  const [turnstileToken, setTurnstileToken] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await api<{ ok: true; user: any; csrfToken: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName, handle, turnstileToken })
      });
      setAuth(res.user, res.csrfToken);
      nav("/feed");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <h2 className="text-lg font-semibold">Create account</h2>
      <p className="mt-1 text-sm text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="text-slate-200 hover:text-white">
          Log in
        </Link>
      </p>

      <form className="mt-4 grid gap-3" onSubmit={submit}>
        <div>
          <label className="text-xs text-slate-400">Display name</label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Handle (no spaces)</label>
          <Input value={handle} onChange={(e) => setHandle(e.target.value)} autoComplete="nickname" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Password</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        {err && <div className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{err}</div>}
        <Turnstile siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} onToken={setTurnstileToken} />
        <Button disabled={busy || (!turnstileToken && !!import.meta.env.VITE_TURNSTILE_SITE_KEY)} type="submit">
          {busy ? "Creating..." : "Create account"}
        </Button>
      </form>

      <div className="mt-4 text-xs text-slate-500">
        By continuing you agree to basic community norms. (Add your TOS/Privacy later.)
      </div>
    </Card>
  );
}
