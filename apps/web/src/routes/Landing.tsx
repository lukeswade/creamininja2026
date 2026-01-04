import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/Card";
import { NinjaStar } from "../components/NinjaStar";
import { Sparkles, Users, Lock, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="grid gap-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950/30 p-8 md:p-12">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <NinjaStar className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              Creami<span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Ninja</span>
            </h1>
          </div>
          
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            The ultimate community for Ninja CREAMi enthusiasts. Share recipes, discover trending creations, 
            and let AI help you craft the perfect frozen treat.
          </p>
          
          <div className="mt-8 flex flex-wrap gap-4">
            <Link 
              to="/feed" 
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 font-medium text-white shadow-lg shadow-violet-500/25 transition hover:shadow-violet-500/40 hover:brightness-110"
            >
              <Zap className="h-4 w-4" />
              Explore recipes
            </Link>
            <Link 
              to="/register" 
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-6 py-3 font-medium text-slate-100 backdrop-blur transition hover:border-slate-600 hover:bg-slate-800/50"
            >
              Create free account
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-violet-500/10 transition group-hover:bg-violet-500/20" />
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
              <Lock className="h-5 w-5" />
            </div>
            <div className="mt-4 text-base font-semibold text-slate-100">Privacy first</div>
            <p className="mt-2 text-sm text-slate-400">
              Keep recipes private, share with friends only, or go fully public. You're in control.
            </p>
          </div>
        </Card>

        <Card className="group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-fuchsia-500/10 transition group-hover:bg-fuchsia-500/20" />
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-500/20 text-fuchsia-400">
              <Users className="h-5 w-5" />
            </div>
            <div className="mt-4 text-base font-semibold text-slate-100">Ninjagos</div>
            <p className="mt-2 text-sm text-slate-400">
              Connect with fellow CREAMi lovers. Share recipes directly with your inner circle.
            </p>
          </div>
        </Card>

        <Card className="group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-500/10 transition group-hover:bg-amber-500/20" />
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="mt-4 text-base font-semibold text-slate-100">AI-powered</div>
            <p className="mt-2 text-sm text-slate-400">
              List ingredients or snap a photo—AI generates a perfect CREAMi recipe instantly.
            </p>
          </div>
        </Card>

        <Card className="group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-500/10 transition group-hover:bg-emerald-500/20" />
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <NinjaStar className="h-5 w-5" />
            </div>
            <div className="mt-4 text-base font-semibold text-slate-100">Star favorites</div>
            <p className="mt-2 text-sm text-slate-400">
              Save recipes you love and see what's trending in the community.
            </p>
          </div>
        </Card>
      </div>

      {/* CTA Section */}
      <Card className="bg-gradient-to-r from-violet-950/50 to-fuchsia-950/50 border-violet-800/50 text-center">
        <div className="py-4">
          <h2 className="text-2xl font-bold text-slate-100">Ready to start creating?</h2>
          <p className="mt-2 text-slate-400">Join thousands of CREAMi enthusiasts sharing their frozen creations.</p>
          <div className="mt-6 flex justify-center gap-4">
            <Link 
              to="/register" 
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-medium text-slate-950 transition hover:bg-slate-100"
            >
              Get started free
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
