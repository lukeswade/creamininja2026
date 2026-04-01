import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "./Button";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { Home, Users, PlusCircle, LogOut, Menu, X, Image } from "lucide-react";

export function TopNav() {
  const { user, csrfToken, setAuth } = useAuth();
  const nav = useNavigate();

  async function logout() {
    await api("/auth/logout", { method: "POST", body: JSON.stringify({}), csrf: csrfToken || "" });
    setAuth(null, null);
    nav("/login");
  }

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-slate-800 text-white"
        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
    }`;

  const mobileLinkClass = (isActive: boolean) =>
    `flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition ${
      isActive
        ? "bg-slate-800 text-white"
        : "text-slate-300 hover:bg-slate-800/50"
    }`;

  return (
    <div className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl shadow-lg shadow-black/20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Creami
            </span>
            <span className="text-slate-400">Ninja</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/feed" className={({ isActive }) => linkClass(isActive)}>
            <Home className="h-4 w-4" />
            Feed
          </NavLink>
          <NavLink to="/gallery" className={({ isActive }) => linkClass(isActive)}>
            <Image className="h-4 w-4" />
            Gallery
          </NavLink>
          {user && (
            <>
              <NavLink to="/friends" className={({ isActive }) => linkClass(isActive)}>
                <Users className="h-4 w-4" />
                Dojo
              </NavLink>
              <NavLink to="/create" className={({ isActive }) => linkClass(isActive)}>
                <PlusCircle className="h-4 w-4" />
                Create
              </NavLink>
            </>
          )}
        </nav>

        {/* Desktop auth */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <NavLink
                to={`/@${user.handle}`}
                className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-800/50 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700/50"
              >
                <Avatar handle={user.handle} avatarKey={user.avatarKey} size="xs" />
                <span className="max-w-[100px] truncate">{user.displayName}</span>
              </NavLink>
              <button
                onClick={logout}
                className="group flex items-center justify-center rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut className="h-4 w-4 transition group-hover:scale-110" />
              </button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => nav("/login")}>
                Log in
              </Button>
              <Button
                onClick={() => nav("/register")}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-500/25 transition hover:shadow-violet-500/40 hover:brightness-110"
              >
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
