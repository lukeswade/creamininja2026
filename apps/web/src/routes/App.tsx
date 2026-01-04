import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../lib/auth";
import { TopNav } from "../components/TopNav";
import Landing from "./Landing";
import Login from "./Login";
import Register from "./Register";
import Feed from "./Feed";
import CreateRecipe from "./CreateRecipe";
import RecipeDetail from "./RecipeDetail";
import Profile from "./Profile";
import Friends from "./Friends";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-slate-300">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <TopNav />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/feed" element={<Feed />} />
          <Route
            path="/create"
            element={
              <RequireAuth>
                <CreateRecipe />
              </RequireAuth>
            }
          />
          <Route path="/recipes/:id" element={<RecipeDetail />} />
          <Route path="/u/:handle" element={<Profile />} />
          <Route
            path="/friends"
            element={
              <RequireAuth>
                <Friends />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
