'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { POSHeader } from '@/components/POSHeader';
import { TopSummaryBar } from '@/components/TopSummaryBar';
import { OrderCard } from '@/components/OrderCard';
import { Order, OrderStatus, PaymentStatus } from '@/types';
import { playKitchenChime, primeAudio } from '@/lib/sound';
import { Loader2, ShoppingBag, Flame, Clock, Truck, CheckCircle, XCircle, Search } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export default function KitchenOrdersBoard() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const previousOrderIdsRef = useRef<Set<string>>(new Set());

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session || !session.user) {
        setUser(null);
        router.replace('/login');
      } else {
        setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  // 2. Fetch Orders from Supabase
  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Orders fetch note:', error.message);
      } else if (data) {
        // Check for new orders to trigger chime if already loaded
        if (previousOrderIdsRef.current.size > 0) {
          const hasNewOrder = data.some(
            (o: Order) => !previousOrderIdsRef.current.has(o.id) && o.order_status === 'NEW'
          );
          if (hasNewOrder) {
            playKitchenChime();
          }
        }

        const idSet = new Set<string>(data.map((o: Order) => o.id));
        previousOrderIdsRef.current = idSet;

        setOrders(data);
        setLastSyncedAt(new Date());
      }
    } catch (err) {
      console.warn('Network sync note:', err);
    } finally {
      setIsLoadingOrders(false);
      if (!isSilent) setIsRefreshing(false);
    }
  }, [supabase]);

  // 3. Realtime subscription + 10s polling fallback
  useEffect(() => {
    if (isAuthChecking || !user) return;

    fetchOrders(false);

    // Supabase Realtime channel on `orders` table
    const channel = supabase
      .channel('kitchen:orders_stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
          previousOrderIdsRef.current.add(newOrder.id);
          // Play loud Web Audio chime for new incoming orders!
          playKitchenChime();
          setLastSyncedAt(new Date());
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = payload.new as Order;
          setOrders((prev) =>
            prev.map((o) => (o.id === updated.id ? updated : o))
          );
          setLastSyncedAt(new Date());
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        (payload) => {
          const deletedId = (payload.old as { id: string })?.id;
          if (deletedId) {
            setOrders((prev) => prev.filter((o) => o.id !== deletedId));
            previousOrderIdsRef.current.delete(deletedId);
          }
          setLastSyncedAt(new Date());
        }
      )
      .subscribe();

    // 10-second polling fallback to ensure robust updates
    const pollTimer = setInterval(() => {
      fetchOrders(true);
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollTimer);
    };
  }, [supabase, fetchOrders, isAuthChecking, user]);

  // Handle stage update
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    primeAudio();
    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o))
    );

    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: newStatus })
        .eq('id', orderId);

      if (error) {
        console.error('Failed to update order status:', error);
        // Refresh to restore source of truth
        fetchOrders(true);
      }
    } catch (err) {
      console.error('Status update failed:', err);
      fetchOrders(true);
    }
  };

  // Handle payment status toggle
  const handleTogglePaymentStatus = async (
    orderId: string,
    currentStatus: PaymentStatus
  ) => {
    primeAudio();
    const newStatus: PaymentStatus = currentStatus === 'PAID' ? 'PENDING' : 'PAID';

    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, payment_status: newStatus } : o))
    );

    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: newStatus })
        .eq('id', orderId);

      if (error) {
        console.error('Failed to update payment status:', error);
        fetchOrders(true);
      }
    } catch (err) {
      console.error('Payment update failed:', err);
      fetchOrders(true);
    }
  };

  // Counts for filter tabs
  const newCount = orders.filter((o) => o.order_status === 'NEW').length;
  const preparingCount = orders.filter((o) => o.order_status === 'PREPARING').length;
  const outDeliveryCount = orders.filter((o) => o.order_status === 'OUT_FOR_DELIVERY').length;
  const activeCount = newCount + preparingCount + outDeliveryCount;

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    // Status filter
    if (statusFilter === 'ACTIVE') {
      if (order.order_status === 'DELIVERED' || order.order_status === 'CANCELLED') return false;
    } else if (statusFilter !== 'ALL') {
      if (order.order_status !== statusFilter) return false;
    }

    // Search query filter (customer name, phone, or order number)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = order.customer_name?.toLowerCase().includes(q);
      const matchPhone = order.customer_phone?.toLowerCase().includes(q);
      const matchNumber = String(order.order_number).includes(q);
      return matchName || matchPhone || matchNumber;
    }

    return true;
  });

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#0c0d10] flex flex-col items-center justify-center text-stone-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <span className="text-base font-extrabold text-stone-200">
          Loading Kitchen POS Terminal...
        </span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0c0d10] text-[#f4f4f6] flex flex-col selection:bg-amber-500 selection:text-black">
      {/* 1. POS Top Navigation */}
      <POSHeader userEmail={user.email} activeOrdersCount={activeCount} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        {/* 2. Top Summary Bar (Today's Orders, Today's Revenue, Pending UPI Payments) */}
        <TopSummaryBar
          orders={orders}
          onManualRefresh={() => fetchOrders(false)}
          isRefreshing={isRefreshing}
          lastSyncedAt={lastSyncedAt}
        />

        {/* 3. Filter Tabs & Search Bar - Large Minimum 48px Tap Targets */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {/* Active Tab (NEW + PREPARING + OUT FOR DELIVERY) */}
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`min-h-[48px] px-4 py-2 rounded-2xl font-black text-sm flex items-center gap-2 whitespace-nowrap transition-all active:scale-95 border-2 ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-[#181920] text-stone-300 hover:text-white border-stone-800'
                }`}
              >
                <span>Active Kitchen Queue</span>
                {activeCount > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-black ${
                      statusFilter === 'ACTIVE'
                        ? 'bg-stone-950 text-amber-400'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {activeCount}
                  </span>
                )}
              </button>

              {/* NEW Filter */}
              <button
                type="button"
                onClick={() => setStatusFilter('NEW')}
                className={`min-h-[48px] px-3.5 py-2 rounded-2xl font-black text-sm flex items-center gap-2 whitespace-nowrap transition-all active:scale-95 border-2 ${
                  statusFilter === 'NEW'
                    ? 'bg-red-600 text-white border-red-400 shadow-md shadow-red-600/30'
                    : 'bg-[#181920] text-stone-300 hover:text-white border-stone-800'
                }`}
              >
                <Flame className="w-4 h-4 fill-current text-red-400" />
                <span>New</span>
                {newCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-black animate-pulse">
                    {newCount}
                  </span>
                )}
              </button>

              {/* PREPARING Filter */}
              <button
                type="button"
                onClick={() => setStatusFilter('PREPARING')}
                className={`min-h-[48px] px-3.5 py-2 rounded-2xl font-black text-sm flex items-center gap-2 whitespace-nowrap transition-all active:scale-95 border-2 ${
                  statusFilter === 'PREPARING'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                    : 'bg-[#181920] text-stone-300 hover:text-white border-stone-800'
                }`}
              >
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Preparing</span>
                {preparingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-black">
                    {preparingCount}
                  </span>
                )}
              </button>

              {/* OUT FOR DELIVERY Filter */}
              <button
                type="button"
                onClick={() => setStatusFilter('OUT_FOR_DELIVERY')}
                className={`min-h-[48px] px-3.5 py-2 rounded-2xl font-black text-sm flex items-center gap-2 whitespace-nowrap transition-all active:scale-95 border-2 ${
                  statusFilter === 'OUT_FOR_DELIVERY'
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                    : 'bg-[#181920] text-stone-300 hover:text-white border-stone-800'
                }`}
              >
                <Truck className="w-4 h-4 text-purple-400" />
                <span>Out for Delivery</span>
                {outDeliveryCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-xs font-black">
                    {outDeliveryCount}
                  </span>
                )}
              </button>

              {/* DELIVERED Filter */}
              <button
                type="button"
                onClick={() => setStatusFilter('DELIVERED')}
                className={`min-h-[48px] px-3.5 py-2 rounded-2xl font-black text-sm flex items-center gap-2 whitespace-nowrap transition-all active:scale-95 border-2 ${
                  statusFilter === 'DELIVERED'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                    : 'bg-[#181920] text-stone-300 hover:text-white border-stone-800'
                }`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Delivered</span>
              </button>

              {/* ALL Orders Filter */}
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`min-h-[48px] px-3.5 py-2 rounded-2xl font-black text-sm flex items-center gap-2 whitespace-nowrap transition-all active:scale-95 border-2 ${
                  statusFilter === 'ALL'
                    ? 'bg-stone-100 text-stone-950 border-white shadow-md'
                    : 'bg-[#181920] text-stone-300 hover:text-white border-stone-800'
                }`}
              >
                <span>All Orders ({orders.length})</span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search phone, customer, #..."
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

        {/* 4. Orders Grid Display */}
        {isLoadingOrders ? (
          <div className="py-20 flex flex-col items-center justify-center text-stone-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <span className="font-bold text-sm">Fetching kitchen orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-[#14151b] border-2 border-dashed border-stone-800 rounded-3xl p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-stone-900 border border-stone-800 flex items-center justify-center mx-auto text-stone-500">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">No Orders Found</h3>
            <p className="text-stone-400 text-sm max-w-sm mx-auto">
              {searchQuery
                ? `No orders matching "${searchQuery}".`
                : statusFilter === 'ACTIVE'
                ? 'Kitchen queue is clear! All orders have been delivered.'
                : `No orders currently in "${statusFilter}" status.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onUpdateStatus={handleUpdateStatus}
                onTogglePaymentStatus={handleTogglePaymentStatus}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
