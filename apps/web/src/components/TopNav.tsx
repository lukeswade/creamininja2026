import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "./Button";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

export function TopNav() {
  const { user, csrfToken, setAuth } = useAuth();
  const nav = useNavigate();

  async function logout() {
    await api("/auth/logout", { method: "POST", body: JSON.stringify({}), csrf: csrfToken || "" });
    setAuth(null, null);
    nav("/login");
  }

  return (
    <div className="sticky top-0 z-10 border-b border-slate-900 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="font-semibold tracking-tight">
          Creami<span className="text-slate-400">Ninja</span>
        </Link>
        <div className="flex items-center gap-4">
          <NavLink to="/feed" className={({ isActive }) => (isActive ? "text-white" : "text-slate-400 hover:text-slate-200")}>
            Feed
          </NavLink>
          {user && (
            <NavLink to="/friends" className={({ isActive }) => (isActive ? "text-white" : "text-slate-400 hover:text-slate-200")}>
              Ninjagos
            </NavLink>
          )}
          {user && (
            <NavLink to="/create" className={({ isActive }) => (isActive ? "text-white" : "text-slate-400 hover:text-slate-200")}>
              Create
            </NavLink>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <NavLink to={`/u/${user.handle}`} className="text-slate-200 hover:text-white">
                @{user.handle}
              </NavLink>
              <Button variant="ghost" onClick={logout}>
                Log out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => nav("/login")}>
                Log in
              </Button>
              <Button onClick={() => nav("/register")}>Sign up</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
