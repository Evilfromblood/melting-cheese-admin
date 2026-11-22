'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { POSHeader } from '@/components/POSHeader';
import { MenuItem } from '@/types';
import { FALLBACK_MENU_ITEMS } from '@/lib/menu-data';
import { primeAudio } from '@/lib/sound';
import { Loader2, Search, Check, X, Sparkles, Flame, CheckCircle2, AlertOctagon } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

const CATEGORY_ORDER = [
  'Pizza',
  'Burgers',
  'Snacks',
  'Chicken Wings & Strips',
  'Mocktails',
];

export default function MenuStockManager() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const [items, setItems] = useState<MenuItem[]>(FALLBACK_MENU_ITEMS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // 1. Authenticate user
  useEffect(() => {
    async function verifyAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) {
          router.replace('/login');
          return;
        }
        setUser(session.user);
      } catch (err) {
        console.warn('Auth check error:', err);
        router.replace('/login');
      } finally {
        setIsAuthChecking(false);
      }
    }

    verifyAuth();
  }, [router, supabase]);

  // 2. Fetch Menu Items from Supabase
  const loadMenuItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category')
        .order('name');

      if (!error && data && data.length > 0) {
        setItems(data);
      } else {
        console.warn('Using fallback menu items:', error?.message);
      }
    } catch (err) {
      console.warn('Network note fetching menu items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (isAuthChecking || !user) return;
    loadMenuItems();
  }, [loadMenuItems, isAuthChecking, user]);

  // 3. Instant 1-Tap Toggle Stock Status
  const handleToggleStock = async (item: MenuItem) => {
    primeAudio();
    const newStatus = !item.is_available;
    setUpdatingId(item.id);

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_available: newStatus } : i))
    );

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: newStatus })
        .eq('id', item.id);

      if (error) {
        console.error('Failed to update stock status in Supabase:', error);
        // Rollback on error
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_available: !newStatus } : i))
        );
      }
    } catch (err) {
      console.error('Stock toggle failed:', err);
      // Rollback
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: !newStatus } : i))
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // Stats
  const inStockCount = items.filter((i) => i.is_available).length;
  const soldOutCount = items.length - inStockCount;

  // Filter items
  const filteredItems = items.filter((item) => {
    if (activeCategory !== 'All' && item.category !== activeCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      return matchName || matchCat;
    }
    return true;
  });

  // Group filtered items by category in predefined order
  const categoriesPresent = Array.from(
    new Set(filteredItems.map((i) => i.category))
  ).sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a);
    const idxB = CATEGORY_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#0c0d10] flex flex-col items-center justify-center text-stone-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <span className="text-base font-extrabold text-stone-200">
          Loading Menu Inventory...
        </span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0c0d10] text-[#f4f4f6] flex flex-col selection:bg-amber-500 selection:text-black">
      {/* 1. Top Navigation */}
      <POSHeader userEmail={user.email} />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        {/* 2. Stock Overview Banner */}
        <div className="bg-[#14151b] border-2 border-stone-800 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                1-Tap Menu Stock Manager
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black">
                {items.length} Items Total
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-400 font-medium max-w-xl">
              Tap any item to instantly toggle <strong className="text-emerald-400">IN STOCK</strong> or <strong className="text-rose-400">SOLD OUT</strong>. Updates reflect immediately on customer storefront menus.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-2xl bg-emerald-950/60 border-2 border-emerald-500/60 text-emerald-300 font-extrabold text-sm flex items-center gap-2 shadow-inner">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{inStockCount} In Stock</span>
            </div>

            {soldOutCount > 0 && (
              <div className="px-4 py-2.5 rounded-2xl bg-rose-950/60 border-2 border-rose-500/60 text-rose-300 font-extrabold text-sm flex items-center gap-2 animate-pulse shadow-inner">
                <AlertOctagon className="w-5 h-5 text-rose-400" />
                <span>{soldOutCount} Sold Out</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Category Filter Tabs & Search */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Category Pills - Min 48px Tap Target */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setActiveCategory('All')}
                className={`min-h-[48px] px-4 py-2 rounded-2xl font-black text-sm whitespace-nowrap transition-all active:scale-95 border-2 ${
                  activeCategory === 'All'
                    ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-[#181920] text-stone-300 hover:text-white border-stone-800'
                }`}
              >
                All ({items.length})
              </button>

              {CATEGORY_ORDER.map((cat) => {
                const count = items.filter((i) => i.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`min-h-[48px] px-4 py-2 rounded-2xl font-black text-sm whitespace-nowrap transition-all active:scale-95 border-2 ${
                      activeCategory === cat
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-[#181920] text-stone-300 hover:text-white border-stone-800'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="ml-1.5 opacity-70 text-xs">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search dish to toggle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[48px] pl-10 pr-4 py-2.5 bg-[#181920] border-2 border-stone-800 focus:border-amber-500 rounded-2xl text-sm text-white placeholder:text-stone-500 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-xs font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. Categorized Items Grid / List */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-stone-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <span className="font-bold text-sm">Loading menu dishes...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-[#14151b] border-2 border-dashed border-stone-800 rounded-3xl p-12 text-center text-stone-400">
            No menu items found matching &quot;{searchQuery}&quot;.
          </div>
        ) : (
          <div className="space-y-8">
            {categoriesPresent.map((category) => {
              const categoryItems = filteredItems.filter((i) => i.category === category);
              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg sm:text-xl font-black text-amber-400 uppercase tracking-wide">
                      {category}
                    </h3>
                    <div className="h-[2px] flex-1 bg-stone-800/80"></div>
                    <span className="text-xs font-bold text-stone-400 font-mono">
                      {categoryItems.length} items
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {categoryItems.map((item) => {
                      const isUpdating = updatingId === item.id;
                      const isAvailable = item.is_available;

                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl p-3.5 sm:p-4 border-2 transition-all flex items-center justify-between gap-3 shadow-md ${
                            isAvailable
                              ? 'bg-[#181920] border-stone-800 hover:border-stone-700'
                              : 'bg-[#201214] border-rose-900/60 opacity-90'
                          }`}
                        >
                          {/* Item Info */}
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Dietary badge */}
                            <div className="shrink-0">
                              <span
                                className={`inline-flex items-center justify-center w-5 h-5 rounded-md border-2 ${
                                  item.dietary === 'veg'
                                    ? 'border-emerald-500 bg-emerald-950/60'
                                    : 'border-rose-500 bg-rose-950/60'
                                }`}
                                title={item.dietary === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    item.dietary === 'veg' ? 'bg-emerald-400' : 'bg-rose-500'
                                  }`}
                                />
                              </span>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-sm sm:text-base text-white truncate">
                                  {item.name}
                                </h4>
                                {item.badge && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-bold text-stone-400 font-mono mt-0.5">
                                ₹{item.base_price} {item.customizable && '• Customizable'}
                              </div>
                            </div>
                          </div>

                          {/* 1-Tap Stock Switch Button - Min 48px Tap Target */}
                          <button
                            type="button"
                            onClick={() => handleToggleStock(item)}
                            disabled={isUpdating}
                            title={isAvailable ? 'Click to Mark as SOLD OUT' : 'Click to Mark as IN STOCK'}
                            className={`min-h-[48px] px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 shrink-0 transition-all active:scale-95 shadow-lg border-2 cursor-pointer ${
                              isAvailable
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-900/40'
                                : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-rose-900/40 animate-pulse'
                            }`}
                          >
                            {isUpdating ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : isAvailable ? (
                              <>
                                <Check className="w-5 h-5 stroke-[3]" />
                                <span>IN STOCK</span>
                              </>
                            ) : (
                              <>
                                <X className="w-5 h-5 stroke-[3]" />
                                <span>SOLD OUT</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
