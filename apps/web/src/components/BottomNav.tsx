import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Users, PlusCircle, Image, UserCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../lib/auth";

export function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  const links = [
    { to: "/feed", icon: Home, label: "Feed", requireAuth: false },
    { to: "/gallery", icon: Image, label: "Gallery", requireAuth: false },
    { to: "/create", icon: PlusCircle, label: "Create", requireAuth: true },
    { to: "/friends", icon: Users, label: "Dojo", requireAuth: true },
    { to: user ? `/u/${user.handle}` : "/login", icon: UserCircle, label: user ? "Profile" : "Log In", requireAuth: false },
  ].filter(l => !l.requireAuth || user);

  return (
    <div className="safe-area-inset md:hidden fixed bottom-0 left-0 right-0 z-50 glass-nav border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <nav className="flex items-center justify-around px-2 h-16">
        {links.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className="relative flex flex-col items-center justify-center w-full h-full text-slate-400 focus:outline-none"
            >
              <div className="relative flex flex-col items-center transition-colors">
                <Icon className={`h-6 w-6 mb-1 transition-colors ${isActive ? "text-violet-400" : "text-slate-400"}`} />
                <span className={`text-[10px] font-medium ${isActive ? "text-violet-400" : "text-slate-500"}`}>
                  {label}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute -top-2 w-8 h-1 bg-violet-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
