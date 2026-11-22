'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { primeAudio } from '@/lib/sound';
import { ChefHat, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // If already logged in, redirect directly to `/`
  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          router.replace('/');
          return;
        }
      } catch (err) {
        console.warn('Session check note:', err);
      } finally {
        setIsCheckingSession(false);
      }
    }

    checkSession();
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    primeAudio();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        setErrorMsg(error.message || 'Invalid email or password.');
      } else if (data.session) {
        router.push('/');
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#0c0d10] flex flex-col items-center justify-center text-stone-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0d10] flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-amber-500 selection:text-black">
      <div className="w-full max-w-md bg-[#14151b] border-2 border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Branding */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20">
            <ChefHat className="w-9 h-9 text-stone-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
              Melting Cheese
            </h1>
            <div className="inline-block px-3 py-1 mt-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-xs tracking-wider">
              KITCHEN POS & ADMIN PORTAL
            </div>
          </div>
          <p className="text-xs text-stone-400 font-medium">
            14, Sant Ravidas Nagar, Bhadohi • Staff Access Only
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-950/60 border-2 border-rose-800/80 text-rose-300 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
              Staff Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="kitchen@meltingcheese.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-[48px] pl-12 pr-4 py-3 bg-[#1b1c24] border-2 border-stone-800 focus:border-amber-500 rounded-2xl text-sm sm:text-base text-white placeholder:text-stone-500 focus:outline-none transition-colors font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[48px] pl-12 pr-12 py-3 bg-[#1b1c24] border-2 border-stone-800 focus:border-amber-500 rounded-2xl text-sm sm:text-base text-white placeholder:text-stone-500 focus:outline-none transition-colors font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="min-h-[48px] px-3.5 absolute right-0 top-0 bottom-0 text-stone-400 hover:text-white flex items-center justify-center"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button - Min 52px Touch Target */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[52px] px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 border-2 border-amber-300 transition-all uppercase tracking-wide cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Enter Kitchen POS</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-[11px] text-stone-500 font-medium">
          Protected by Supabase Authentication • Realtime Session Sync
        </div>
      </div>
    </div>
  );
}
