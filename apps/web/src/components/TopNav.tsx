import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "./Button";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { Home, Users, PlusCircle, LogOut, Image } from "lucide-react";
import { motion } from "framer-motion";

export function TopNav() {
  const { user, csrfToken, setAuth } = useAuth();
  const nav = useNavigate();

  async function logout() {
    await api("/auth/logout", { method: "POST", body: JSON.stringify({}), csrf: csrfToken || "" });
    setAuth(null, null);
    nav("/login");
  }

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
        <nav className="hidden items-center gap-2 md:flex">
          {[
            { to: "/feed", icon: Home, label: "Feed" },
            { to: "/gallery", icon: Image, label: "Gallery" },
            ...(user ? [{ to: "/friends", icon: Users, label: "Dojo" }] : []),
          ].map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className="relative px-3 py-2 rounded-xl group focus:outline-none">
              {({ isActive }) => (
                <div className={`relative z-10 flex items-center gap-2 text-sm font-semibold transition-colors duration-200 ${isActive ? "text-violet-100" : "text-slate-400 group-hover:text-slate-200"}`}>
                  <Icon className={`h-4 w-4 ${isActive ? "text-violet-400" : ""}`} />
                  {label}
                  {isActive && (
                    <motion.div
                      layoutId="topnav-indicator"
                      className="absolute -inset-0 rounded-xl bg-violet-500/20 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)] -z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
              )}
            </NavLink>
          ))}
          
          {user && (
            <div className="ml-2 pl-4 border-l border-white/10 hidden md:block">
              <Button onClick={() => nav("/create")} className="h-9 px-4 text-sm font-bold gap-2 shadow-lg shadow-violet-500/20 active:scale-95 transition-all">
                <PlusCircle className="h-4 w-4" />
                Create Recipe
              </Button>
            </div>
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
