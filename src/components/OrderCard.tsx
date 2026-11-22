'use client';

import React from 'react';
import { Phone, MapPin, Clock, Truck, Check, QrCode, Banknote, CheckCircle, Flame, ExternalLink, XCircle, MessageSquare, AlertTriangle } from 'lucide-react';
import { Order, OrderStatus, PaymentStatus } from '@/types';
import { buildCustomerWhatsAppUrl, getFriendlyStatusText } from '@/lib/whatsapp';

interface OrderCardProps {
  order: Order;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onTogglePaymentStatus: (orderId: string, currentStatus: PaymentStatus) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onUpdateStatus,
  onTogglePaymentStatus,
}) => {
  const isNew = order.order_status === 'NEW';
  const isPreparing = order.order_status === 'PREPARING';
  const isOutForDelivery = order.order_status === 'OUT_FOR_DELIVERY';
  const isDelivered = order.order_status === 'DELIVERED';
  const isCancelled = order.order_status === 'CANCELLED';

  const isUpiPending = order.payment_method === 'UPI' && order.payment_status !== 'PAID';

  // Compute elapsed time since order placed
  const orderDate = new Date(order.created_at);
  const now = new Date();
  const diffMinutes = Math.max(0, Math.floor((now.getTime() - orderDate.getTime()) / 60000));

  let timeDisplay = '';
  if (diffMinutes < 1) {
    timeDisplay = 'Just now';
  } else if (diffMinutes < 60) {
    timeDisplay = `${diffMinutes}m ago`;
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    timeDisplay = `${hours}h ${mins}m ago`;
  }

  const formattedTime = orderDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Card theme classes based on strict design philosophy
  let cardTheme = 'bg-[#181920] border-2 border-stone-800 text-stone-200';
  if (isNew) {
    // NEW ORDER = Bright Amber/Red pulsing card
    cardTheme = 'bg-gradient-to-b from-[#2a1215] to-[#1c1214] border-2 border-red-500 animate-new-order-glow shadow-2xl';
  } else if (isPreparing) {
    // PREPARING = Blue card
    cardTheme = 'bg-gradient-to-b from-[#0f1d32] to-[#131722] border-2 border-blue-500/80 shadow-xl';
  } else if (isOutForDelivery) {
    // OUT FOR DELIVERY = Purple card
    cardTheme = 'bg-gradient-to-b from-[#241335] to-[#171322] border-2 border-purple-500/80 shadow-xl';
  } else if (isDelivered) {
    cardTheme = 'bg-[#141816] border-2 border-emerald-900/40 opacity-90';
  } else if (isCancelled) {
    cardTheme = 'bg-[#1c1414] border-2 border-stone-800 opacity-60';
  }

  const mapsUrl = order.gps_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address + ', Bhadohi')}`;
  const whatsAppUrl = buildCustomerWhatsAppUrl(order);

  // Gatekeeping for Accept Order button when UPI is pending
  const handleAcceptOrder = () => {
    if (isUpiPending) {
      const confirmed = window.confirm(
        `⚠️ CAUTION: UPI Payment of ₹${order.total} is still UNVERIFIED!\n\nHave you verified ₹${order.total} received in GPay / PhonePe?\n\n• Click OK to accept and begin baking anyway.\n• Click Cancel to verify payment first.`
      );
      if (!confirmed) {
        return;
      }
    }
    onUpdateStatus(order.id, 'PREPARING');
  };

  return (
    <div className={`rounded-3xl p-4 sm:p-6 transition-all duration-300 flex flex-col justify-between gap-4 ${cardTheme}`}>
      {/* 1. Header: Order Number, Elapsed Time, Status Badge */}
      <div className="space-y-2 border-b border-stone-800/80 pb-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                #{order.order_number || order.id.slice(0, 5)}
              </span>
              {isNew && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-600 text-white font-black text-xs uppercase tracking-wider animate-bounce shadow-md">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  NEW ORDER
                </span>
              )}
              {isPreparing && (
                <span className="px-3 py-1 rounded-full bg-blue-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                  PREPARING
                </span>
              )}
              {isOutForDelivery && (
                <span className="px-3 py-1 rounded-full bg-purple-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                  OUT FOR DELIVERY
                </span>
              )}
              {isDelivered && (
                <span className="px-3 py-1 rounded-full bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 font-bold text-xs uppercase tracking-wider">
                  DELIVERED ✓
                </span>
              )}
              {isCancelled && (
                <span className="px-3 py-1 rounded-full bg-rose-950/60 text-rose-400 border border-rose-800/60 font-bold text-xs uppercase tracking-wider">
                  CANCELLED
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-stone-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>Placed at {formattedTime}</span>
              <span className="text-stone-600">•</span>
              <span className={`font-bold ${isNew ? 'text-red-400' : 'text-stone-300'}`}>
                {timeDisplay}
              </span>
            </div>
          </div>

          {/* Payment Method & Status Tag */}
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border-2 ${
                order.payment_status === 'PAID'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-500 text-amber-300'
              }`}
            >
              {order.payment_method === 'UPI' ? (
                <QrCode className="w-4 h-4 shrink-0" />
              ) : (
                <Banknote className="w-4 h-4 shrink-0" />
              )}
              <span>{order.payment_method}: {order.payment_status}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. CRITICAL SAFEGUARD: UPI Payment Verification Warning Banner */}
      {isUpiPending && (
        <div className="p-3 sm:p-3.5 bg-amber-500/20 border-2 border-amber-500 rounded-2xl text-amber-300 font-black text-xs sm:text-sm flex items-center gap-2.5 shadow-lg shadow-amber-950/40 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 stroke-[2.5]" />
          <span>⚠️ VERIFY ₹{order.total} IN GPAY/PHONEPE BEFORE BAKING</span>
        </div>
      )}

      {/* 3. Customer Details Card with Large Quick Action Buttons (Min 48px) */}
      <div className="bg-black/40 rounded-2xl p-3.5 sm:p-4 border border-stone-800/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs text-stone-400 font-bold uppercase tracking-wider">Customer</div>
            <div className="text-base sm:text-lg font-black text-white">{order.customer_name}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-400 font-bold uppercase tracking-wider">Total Bill</div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
              ₹{order.total}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-2 text-stone-300 text-xs sm:text-sm">
          <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">{order.delivery_address}</span>
        </div>

        {/* 1-Tap Action Row: Call & Open Maps Pin */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {/* Call Customer Button */}
          <a
            href={`tel:${order.customer_phone}`}
            className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-95 text-stone-200 hover:text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all border border-stone-700"
          >
            <Phone className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Call {order.customer_phone}</span>
          </a>

          {/* Open Maps Pin Button */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-95 text-stone-200 hover:text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all border border-stone-700"
          >
            <MapPin className="w-4 h-4 shrink-0 text-blue-400" />
            <span>Open Maps Pin</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>
        </div>

        {/* 1-TAP WHATSAPP BUSINESS STATUS UPDATE BUTTON (Min 48px height) */}
        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-stone-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/40 border-2 border-emerald-300 transition-all uppercase tracking-wide cursor-pointer"
          title={`Send WhatsApp update: Order #${order.order_number} is ${getFriendlyStatusText(order.order_status)}`}
        >
          <MessageSquare className="w-5 h-5 shrink-0 stroke-[2.5]" />
          <span>Notify on WhatsApp</span>
        </a>

        {/* 1-Tap Mark UPI Paid Button if unpaid UPI */}
        {isUpiPending && (
          <button
            type="button"
            onClick={() => onTogglePaymentStatus(order.id, 'PENDING')}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-stone-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 border-2 border-amber-300 transition-all uppercase tracking-wide cursor-pointer"
          >
            <QrCode className="w-5 h-5 stroke-[2.5]" />
            <span>Mark UPI as Paid (₹{order.total})</span>
          </button>
        )}

        {/* If already paid or COD, allow staff to toggle if needed */}
        {order.payment_status === 'PAID' && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Payment Verified & Cleared</span>
            </span>
            <button
              type="button"
              onClick={() => onTogglePaymentStatus(order.id, 'PAID')}
              className="text-[11px] underline text-stone-400 hover:text-stone-200 cursor-pointer"
            >
              Undo
            </button>
          </div>
        )}
      </div>

      {/* 4. Items Ordered List - Ultra High Contrast & Readability */}
      <div className="space-y-2">
        <div className="text-xs font-black text-stone-400 uppercase tracking-wider flex items-center justify-between">
          <span>Items Ordered ({order.items ? order.items.length : 0})</span>
          <span className="text-stone-500 font-mono text-[11px]">Subtotal: ₹{order.subtotal}</span>
        </div>

        <div className="divide-y divide-stone-800/80 bg-black/50 rounded-2xl border-2 border-stone-800 overflow-hidden">
          {(order.items || []).map((item, idx) => (
            <div key={idx} className="p-3 sm:p-3.5 flex items-start justify-between gap-3 text-sm">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center min-w-[26px] h-[26px] rounded-lg bg-amber-500 text-stone-950 font-black text-sm px-1.5 shadow-sm">
                    {item.quantity}x
                  </span>
                  <span className="font-extrabold text-white text-base">
                    {item.name}
                  </span>
                </div>

                {/* Customizations */}
                {item.customization && (
                  <div className="pl-8 text-xs font-semibold text-amber-400/90">
                    {item.customization.crust && <span>{item.customization.crust} Crust</span>}
                    {item.customization.extraCheese && (
                      <span className="ml-1 bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                        + Extra Cheese
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="font-mono font-bold text-stone-300 text-sm whitespace-nowrap pt-0.5">
                ₹{item.totalPrice}
              </div>
            </div>
          ))}

          {/* Free Item (if any promotional item was unlocked) */}
          {order.free_item && (
            <div className="p-3 bg-emerald-950/40 border-t border-emerald-800/40 flex items-center justify-between text-xs sm:text-sm font-black text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span>🎁 FREE SPECIAL:</span>
                <span className="text-white underline">{order.free_item}</span>
              </span>
              <span className="bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                ₹0 (FREE)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 5. Kitchen Stage Advancement Buttons - MINIMUM 52px HEIGHT FOR RAPID TAPS */}
      <div className="space-y-2 pt-1 border-t border-stone-800/80">
        {/* NEW ORDER -> ACCEPT ORDER (With UPI Verification Gatekeeping) */}
        {isNew && (
          <button
            type="button"
            onClick={handleAcceptOrder}
            className={`w-full min-h-[52px] px-5 py-3 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl border-2 transition-all uppercase tracking-wide cursor-pointer active:scale-95 ${
              isUpiPending
                ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-stone-950 border-amber-300 shadow-amber-600/30'
                : 'bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-blue-400 shadow-blue-600/30'
            }`}
          >
            <Clock className="w-6 h-6 stroke-[2.5]" />
            <span>{isUpiPending ? 'ACCEPT ORDER (UPI PENDING ⚠️)' : 'ACCEPT ORDER'}</span>
          </button>
        )}

        {/* PREPARING -> MARK OUT FOR DELIVERY */}
        {isPreparing && (
          <button
            type="button"
            onClick={() => onUpdateStatus(order.id, 'OUT_FOR_DELIVERY')}
            className="w-full min-h-[52px] px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 active:scale-95 text-white font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl shadow-purple-600/30 border-2 border-purple-400 transition-all uppercase tracking-wide cursor-pointer"
          >
            <Truck className="w-6 h-6 stroke-[2.5]" />
            <span>MARK OUT FOR DELIVERY</span>
          </button>
        )}

        {/* OUT FOR DELIVERY -> MARK DELIVERED */}
        {isOutForDelivery && (
          <button
            type="button"
            onClick={() => onUpdateStatus(order.id, 'DELIVERED')}
            className="w-full min-h-[52px] px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/30 border-2 border-emerald-400 transition-all uppercase tracking-wide cursor-pointer"
          >
            <Check className="w-6 h-6 stroke-[3]" />
            <span>MARK DELIVERED</span>
          </button>
        )}

        {/* COMPLETED STATUS DISPLAY */}
        {isDelivered && (
          <div className="w-full min-h-[48px] rounded-2xl bg-emerald-950/60 border-2 border-emerald-700/60 text-emerald-400 font-extrabold text-sm flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span>Order Completed & Delivered</span>
          </div>
        )}

        {/* CANCEL BUTTON FOR ACTIVE ORDERS */}
        {!isDelivered && !isCancelled && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Are you sure you want to cancel Order #${order.order_number}?`)) {
                  onUpdateStatus(order.id, 'CANCELLED');
                }
              }}
              className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-transparent hover:bg-rose-950/50 text-stone-500 hover:text-rose-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel Order</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
