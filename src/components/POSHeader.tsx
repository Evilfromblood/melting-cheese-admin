'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, UtensilsCrossed, LogOut, Volume2, BellRing, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { playKitchenChime, primeAudio } from '@/lib/sound';
import { MeltingCheeseLogo } from '@/components/MeltingCheeseLogo';

interface POSHeaderProps {
  userEmail?: string | null;
  activeOrdersCount?: number;
}

export const POSHeader: React.FC<POSHeaderProps> = ({ userEmail, activeOrdersCount = 0 }) => {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [audioTested, setAudioTested] = useState(false);

  // Kitchen Open / Closed Master Switch state
  const [isKitchenOpen, setIsKitchenOpen] = useState<boolean>(true);
  const [isUpdatingKitchenStatus, setIsUpdatingKitchenStatus] = useState<boolean>(false);

  // Fetch initial kitchen status and subscribe to realtime updates
  useEffect(() => {
    async function fetchKitchenStatus() {
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('is_open')
          .eq('id', 1)
          .single();

        if (!error && data) {
          setIsKitchenOpen(Boolean(data.is_open));
        }
      } catch (err) {
        console.warn('Could not fetch store_settings note:', err);
      }
    }

    fetchKitchenStatus();

    // Subscribe to store_settings changes in realtime
    const channel = supabase
      .channel('kitchen:store_settings_feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_settings' },
        (payload) => {
          const updated = payload.new as { id?: number; is_open?: boolean };
          if (updated && (updated.id === 1 || updated.id === undefined)) {
            if (typeof updated.is_open === 'boolean') {
              setIsKitchenOpen(updated.is_open);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Master switch toggle handler
  const handleToggleKitchenStatus = async () => {
    primeAudio();
    const nextStatus = !isKitchenOpen;

    // Optimistic UI update
    setIsKitchenOpen(nextStatus);
    setIsUpdatingKitchenStatus(true);

    try {
      const { error } = await supabase
        .from('store_settings')
        .update({
          is_open: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (error) {
        console.error('Failed to update kitchen open/closed status:', error);
        // Rollback on error
        setIsKitchenOpen(!nextStatus);
      }
    } catch (err) {
      console.error('Error toggling kitchen status:', err);
      setIsKitchenOpen(!nextStatus);
    } finally {
      setIsUpdatingKitchenStatus(false);
    }
  };

  const handleTestSound = () => {
    primeAudio();
    playKitchenChime();
    setAudioTested(true);
    setTimeout(() => setAudioTested(false), 2000);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      router.replace('/login');
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#121318]/95 backdrop-blur-md border-b-2 border-stone-800 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Kitchen Title with Melting Cheese POS SVG Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 group-hover:scale-105 transition-transform">
              <MeltingCheeseLogo size={42} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase group-hover:text-amber-400 transition-colors">
                  Melting Cheese
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-black tracking-wider">
                  KITCHEN POS
                </span>
              </div>
              <div className="text-[12px] text-stone-400 font-medium flex items-center gap-2 mt-0.5">
                <span>Bhadohi Terminal</span>
                {userEmail && (
                  <>
                    <span className="text-stone-600">•</span>
                    <span className="text-amber-400/90 font-mono text-[11px] truncate max-w-[150px] sm:max-w-none">
                      {userEmail}
                    </span>
                  </>
                )}
              </div>
            </div>
          </Link>

          {/* Navigation & Operational Controls - Min 48px Tap Targets */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* 1. MASTER SWITCH: KITCHEN OPEN (Green) / KITCHEN CLOSED (Red) */}
            <button
              type="button"
              onClick={handleToggleKitchenStatus}
              disabled={isUpdatingKitchenStatus}
              title={isKitchenOpen ? 'Tap to Pause Orders (Close Kitchen)' : 'Tap to Resume Orders (Open Kitchen)'}
              className={`min-h-[48px] px-4 py-2 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2.5 shadow-lg border-2 transition-all active:scale-95 cursor-pointer uppercase tracking-wider ${
                isKitchenOpen
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 hover:bg-emerald-900/60 shadow-emerald-950/50'
                  : 'bg-rose-950/90 border-rose-500 text-rose-300 hover:bg-rose-900/60 shadow-rose-950/60 animate-pulse'
              }`}
            >
              {isUpdatingKitchenStatus ? (
                <Loader2 className="w-4 h-4 animate-spin text-current" />
              ) : isKitchenOpen ? (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
                </span>
              ) : (
                <span className="relative flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
              <span>{isKitchenOpen ? 'KITCHEN OPEN' : 'KITCHEN CLOSED'}</span>
            </button>

            {/* Orders Nav Button */}
            <Link
              href="/"
              prefetch={true}
              onClick={primeAudio}
              className={`min-h-[48px] px-4 py-2.5 rounded-xl font-extrabold text-sm sm:text-base flex items-center gap-2 transition-all active:scale-95 border-2 ${
                pathname === '/'
                  ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-lg shadow-amber-500/25'
                  : 'bg-stone-900/90 text-stone-300 hover:text-white border-stone-700/80 hover:border-stone-600'
              }`}
            >
              <ShoppingBag className="w-5 h-5 shrink-0" />
              <span>Orders</span>
              {activeOrdersCount > 0 && (
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-xs font-black ${
                    pathname === '/'
                      ? 'bg-stone-950 text-amber-400'
                      : 'bg-rose-500 text-white animate-pulse'
                  }`}
                >
                  {activeOrdersCount}
                </span>
              )}
            </Link>

            {/* Menu Stock Nav Button */}
            <Link
              href="/menu"
              prefetch={true}
              onClick={primeAudio}
              className={`min-h-[48px] px-4 py-2.5 rounded-xl font-extrabold text-sm sm:text-base flex items-center gap-2 transition-all active:scale-95 border-2 ${
                pathname === '/menu'
                  ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-lg shadow-amber-500/25'
                  : 'bg-stone-900/90 text-stone-300 hover:text-white border-stone-700/80 hover:border-stone-600'
              }`}
            >
              <UtensilsCrossed className="w-5 h-5 shrink-0" />
              <span>Menu Stock</span>
            </Link>

            {/* Chime Test Button */}
            <button
              type="button"
              onClick={handleTestSound}
              title="Test Kitchen Audio Chime"
              className={`min-h-[48px] px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 border-2 transition-all active:scale-95 ${
                audioTested
                  ? 'bg-emerald-500 text-stone-950 border-emerald-400'
                  : 'bg-stone-900 text-stone-300 hover:text-amber-400 border-stone-800 hover:border-stone-700'
              }`}
            >
              {audioTested ? (
                <>
                  <BellRing className="w-4 h-4 animate-bounce text-stone-950" />
                  <span className="hidden sm:inline">Chime Played!</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Test Bell</span>
                </>
              )}
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleSignOut}
              title="Logout from Kitchen POS"
              className="min-h-[48px] px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-stone-900 text-stone-400 hover:text-rose-400 border-2 border-stone-800 hover:border-rose-900/60 flex items-center gap-2 transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
