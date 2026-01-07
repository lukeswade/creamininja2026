import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Turnstile } from "../components/Turnstile";
import { api, API_BASE } from "../lib/api";
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

        <div className="grid gap-3">
          <a
            href={`${API_BASE}/auth/google`}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-slate-700 bg-slate-900/40 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
              <path fill="#4285F4" d="M23.5 12.3c0-.7-.1-1.4-.2-2H12v3.8h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.5z"/>
              <path fill="#34A853" d="M12 24c3.2 0 5.9-1 7.8-2.7l-3.9-3c-1 .7-2.3 1.2-3.9 1.2-3 0-5.6-2-6.5-4.8h-4v3.1C3.4 21.7 7.4 24 12 24z"/>
              <path fill="#FBBC05" d="M5.5 14.7a7.2 7.2 0 0 1 0-5.4V6.2h-4A12 12 0 0 0 0 12c0 1.9.4 3.7 1.5 5.3l4-2.6z"/>
              <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.3 1.5 6.2l4 3.1C6.4 6.8 9 4.8 12 4.8z"/>
            </svg>
            Continue with Google
          </a>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
            <span className="h-px flex-1 bg-slate-800" />
            Or create with email
            <span className="h-px flex-1 bg-slate-800" />
          </div>
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
