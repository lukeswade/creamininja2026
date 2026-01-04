import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/Card";
import { NinjaStar } from "../components/NinjaStar";

export default function Landing() {
  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950 to-slate-950/30 p-8">
        <div className="flex items-center gap-3">
          <NinjaStar className="h-7 w-7 text-slate-100" />
          <h1 className="text-3xl font-semibold tracking-tight">CreamiNinja</h1>
        </div>
        <p className="mt-4 max-w-2xl text-slate-300">
          A sleek community for Ninja CREAMi owners: share recipes, keep a private vault, connect with your Ninjagos, and
          discover what’s trending.
        </p>
        <div className="mt-6 flex gap-3">
          <Link to="/feed" className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100">
            Browse feed
          </Link>
          <Link to="/register" className="rounded-md border border-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-900">
            Create account
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-sm font-semibold">Visibility controls</div>
          <p className="mt-2 text-sm text-slate-300">Keep recipes private, share with friends, or go public.</p>
        </Card>
        <Card>
          <div className="text-sm font-semibold">Ninjagos</div>
          <p className="mt-2 text-sm text-slate-300">Friends list + sharing that feels social without being noisy.</p>
        </Card>
        <Card>
          <div className="text-sm font-semibold">AI inspiration</div>
          <p className="mt-2 text-sm text-slate-300">List ingredients or upload a photo to generate a CREAMi-ready recipe.</p>
        </Card>
      </div>
    </div>
  );
}
