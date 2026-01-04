import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Turnstile } from "../components/Turnstile";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { NinjaStar } from "../components/NinjaStar";
import { Mail, Lock, User, AtSign } from "lucide-react";

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
    <div className="flex min-h-[60vh] items-center justify-center py-8">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
            <NinjaStar className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-100">Create your account</h2>
          <p className="mt-2 text-sm text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Display name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input 
                  className="pl-10" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                  autoComplete="name" 
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Username</label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input 
                  className="pl-10" 
                  value={handle} 
                  onChange={(e) => setHandle(e.target.value.replace(/\s/g, ""))} 
                  autoComplete="username" 
                />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input 
                className="pl-10" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                autoComplete="email" 
                type="email"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input 
                className="pl-10" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                autoComplete="new-password" 
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">At least 8 characters</p>
          </div>

          <Turnstile siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} onToken={setTurnstileToken} />
          
          {err && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {err}
            </div>
          )}
          
          <Button 
            className="mt-2 w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 py-2.5 hover:brightness-110" 
            disabled={busy || (!turnstileToken && !!import.meta.env.VITE_TURNSTILE_SITE_KEY)} 
            type="submit"
          >
            {busy ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          By signing up, you agree to our community guidelines.
        </p>
      </Card>
    </div>
  );
}
