import React from "react";
import { api } from "./api";

export type User = {
  id: string;
  email: string;
  displayName: string;
  handle: string;
  avatarKey: string | null;
};

type AuthState = {
  user: User | null;
  csrfToken: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setAuth: (u: User | null, csrf: string | null) => void;
};

const AuthCtx = React.createContext<AuthState | null>(null);

export function useAuth() {
  const v = React.useContext(AuthCtx);
  if (!v) throw new Error("AuthCtx missing");
  return v;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [csrfToken, setCsrfToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const res = await api<{ ok: true; user: User | null; csrfToken?: string }>("/auth/me", { method: "GET" });
      setUser(res.user);
      setCsrfToken(res.csrfToken ?? null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
  }, []);

  function setAuth(u: User | null, csrf: string | null) {
    setUser(u);
    setCsrfToken(csrf);
  }

  return <AuthCtx.Provider value={{ user, csrfToken, loading, refresh, setAuth }}>{children}</AuthCtx.Provider>;
}
