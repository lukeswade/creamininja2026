import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "../components/Card";
import { NinjaStar } from "../components/NinjaStar";
import { Sparkles, Users, Lock, Zap, ArrowRight } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function Landing() {
  const { user } = useAuth();

  const containerResp = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemResp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="grid gap-8">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-[2.5rem] glass-panel p-8 md:p-16 shadow-glass-lg"
      >
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" 
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl" 
        />
        
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
              className="group inline-flex items-center gap-2 rounded-2xl bg-white/90 px-8 py-4 font-semibold text-slate-900 shadow-glass border border-white/40 backdrop-blur-md transition-all duration-300 active:scale-95 hover:bg-white hover:shadow-glass-lg"
            >
              <Zap className="h-5 w-5" />
              Explore recipes
            </Link>
            {user ? (
              <Link 
                to="/create" 
                className="inline-flex items-center gap-2 rounded-2xl glass p-4 px-8 font-semibold text-slate-100 transition-all duration-300 active:scale-95 hover:bg-white/10"
              >
                Add recipe
              </Link>
            ) : (
              <Link 
                to="/register" 
                className="group inline-flex items-center gap-2 rounded-2xl glass p-4 px-8 font-semibold text-slate-100 transition-all duration-300 active:scale-95 hover:bg-white/10"
              >
                Create free account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      {/* Feature Cards */}
      <motion.div 
        variants={containerResp}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={itemResp}>
          <Card className="group relative overflow-hidden h-full">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-violet-500/10 blur-xl transition duration-500 group-hover:bg-violet-500/30" />
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
        </motion.div>

        <motion.div variants={itemResp}>
          <Card className="group relative overflow-hidden h-full">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-fuchsia-500/10 blur-xl transition duration-500 group-hover:bg-fuchsia-500/30" />
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-500/20 text-fuchsia-400">
              <Users className="h-5 w-5" />
            </div>
            <div className="mt-4 text-base font-semibold text-slate-100">The Dojo</div>
            <p className="mt-2 text-sm text-slate-400">
              Build your ninja network. Share secret recipes with your trusted inner circle.
            </p>
          </div>
          </Card>
        </motion.div>

        <motion.div variants={itemResp}>
          <Card className="group relative overflow-hidden h-full">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500/10 blur-xl transition duration-500 group-hover:bg-amber-500/30" />
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
        </motion.div>

        <motion.div variants={itemResp}>
          <Card className="group relative overflow-hidden h-full">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-xl transition duration-500 group-hover:bg-emerald-500/30" />
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <NinjaStar className="h-5 w-5" />
            </div>
            <div className="mt-4 text-base font-semibold text-slate-100">Throw stars</div>
            <p className="mt-2 text-sm text-slate-400">
              Like a recipe? Throw it a star! 🥷 Watch the best creations rise to the top.
            </p>
          </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* CTA Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-slate-900/60 border border-white/10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-full bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 blur-[100px]" />
          <div className="relative py-8">
          {user ? (
            <>
              <h2 className="text-2xl font-bold text-slate-100">Get started?</h2>
              <p className="mt-2 text-slate-400">Enter the Ninjaverse</p>
              <div className="mt-6 flex justify-center gap-4">
                <Link 
                  to="/create" 
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-semibold text-slate-950 transition-all active:scale-95 hover:bg-slate-100 hover:shadow-xl hover:shadow-white/10"
                >
                  <NinjaStar className="h-4 w-4" />
                  Ninjafy
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-100">Ready to start creating?</h2>
              <p className="mt-2 text-slate-400">Join thousands of CREAMi enthusiasts sharing their frozen creations.</p>
              <div className="mt-6 flex justify-center gap-4">
                <Link 
                  to="/register" 
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-semibold text-slate-950 transition-all active:scale-95 hover:bg-slate-100 hover:shadow-xl hover:shadow-white/10"
                >
                  Get started free
                </Link>
              </div>
            </>
          )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
