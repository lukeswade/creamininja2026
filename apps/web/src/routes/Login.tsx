import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Turnstile } from "../components/Turnstile";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Login() {
  const nav = useNavigate();
  const { setAuth } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [turnstileToken, setTurnstileToken] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await api<{ ok: true; user: any; csrfToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, turnstileToken })
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
      <h2 className="text-lg font-semibold">Log in</h2>
      <p className="mt-1 text-sm text-slate-400">
        No account?{" "}
        <Link to="/register" className="text-slate-200 hover:text-white">
          Sign up
        </Link>
      </p>

      <form className="mt-4 grid gap-3" onSubmit={submit}>
        <div>
          <label className="text-xs text-slate-400">Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Password</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>

        <Turnstile siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} onToken={setTurnstileToken} />
        {err && <div className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{err}</div>}
        <Button disabled={busy || (!turnstileToken && !!import.meta.env.VITE_TURNSTILE_SITE_KEY)} type="submit">
          {busy ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </Card>
  );
}
