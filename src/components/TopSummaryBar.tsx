'use client';

import React from 'react';
import { ShoppingCart, IndianRupee, Clock, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Order } from '@/types';

interface TopSummaryBarProps {
  orders: Order[];
  onManualRefresh: () => void;
  isRefreshing: boolean;
  lastSyncedAt: Date | null;
}

export const TopSummaryBar: React.FC<TopSummaryBarProps> = ({
  orders,
  onManualRefresh,
  isRefreshing,
  lastSyncedAt,
}) => {
  // Compute today's start in local time
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter((order) => {
    const orderDate = new Date(order.created_at);
    return orderDate >= todayStart;
  });

  const todayOrdersCount = todayOrders.length;

  // Today's Revenue: sum of all non-cancelled orders today
  const todayRevenue = todayOrders
    .filter((order) => order.order_status !== 'CANCELLED')
    .reduce((sum, order) => sum + (Number(order.total) || 0), 0);

  // Pending UPI Payments (all active/unpaid UPI orders or today's pending UPI)
  const pendingUpiOrders = orders.filter(
    (order) =>
      order.payment_method === 'UPI' &&
      order.payment_status === 'PENDING' &&
      order.order_status !== 'CANCELLED'
  );
  const pendingUpiCount = pendingUpiOrders.length;
  const pendingUpiAmount = pendingUpiOrders.reduce(
    (sum, order) => sum + (Number(order.total) || 0),
    0
  );

  return (
    <div className="bg-[#14151b] border-2 border-stone-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Top Status & Sync Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="font-extrabold text-sm sm:text-base text-white tracking-wide uppercase">
            Live Kitchen Feed
          </span>
          <span className="text-xs text-stone-400 font-mono hidden sm:inline">
            {lastSyncedAt ? `Synced ${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Connecting...'}
          </span>
        </div>

        {/* Manual Refresh Button - Min 48px Tap Target */}
        <button
          type="button"
          onClick={onManualRefresh}
          disabled={isRefreshing}
          className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white border-2 border-stone-700/80 hover:border-stone-600 font-bold text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Updating...' : 'Refresh Orders'}</span>
        </button>
      </div>

      {/* 3 Main Summary KPI Cards - High Contrast */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* 1. Today's Orders */}
        <div className="bg-[#1b1c24] border-2 border-stone-800 rounded-2xl p-4 flex items-center justify-between shadow-inner">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              <span>Today&apos;s Orders</span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {todayOrdersCount}
            </div>
            <div className="text-[11px] text-stone-400 font-medium">
              Orders placed since 12:00 AM
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg shrink-0">
            #{todayOrdersCount}
          </div>
        </div>

        {/* 2. Today's Revenue (₹) */}
        <div className="bg-[#1b1c24] border-2 border-emerald-900/40 rounded-2xl p-4 flex items-center justify-between shadow-inner">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4 text-emerald-400" />
              <span>Today&apos;s Revenue</span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-emerald-300 tracking-tight">
              ₹{todayRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-400/80 font-medium">
              Gross total from non-cancelled
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <IndianRupee className="w-6 h-6 stroke-[2.5]" />
          </div>
        </div>

        {/* 3. Pending UPI Payments */}
        <div
          className={`border-2 rounded-2xl p-4 flex items-center justify-between shadow-inner transition-colors ${
            pendingUpiCount > 0
              ? 'bg-amber-950/20 border-amber-500/50'
              : 'bg-[#1b1c24] border-stone-800'
          }`}
        >
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Pending UPI Payments</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {pendingUpiCount}
              </span>
              {pendingUpiCount > 0 && (
                <span className="text-sm font-bold text-amber-400 font-mono">
                  (₹{pendingUpiAmount.toLocaleString('en-IN')})
                </span>
              )}
            </div>
            <div className="text-[11px] text-stone-400 font-medium">
              {pendingUpiCount === 0 ? 'All UPI orders cleared ✓' : 'Awaiting manual UPI verification'}
            </div>
          </div>
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              pendingUpiCount > 0
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse'
                : 'bg-stone-800/60 border-stone-700/60 text-stone-400'
            }`}
          >
            {pendingUpiCount > 0 ? (
              <Clock className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
