# Melting Cheese (Bhadohi) - Kitchen POS & Admin Web App

A dedicated, ultra-simple, high-contrast, standalone **Kitchen POS & Admin Web App** for **Melting Cheese (14, Sant Ravidas Nagar, Bhadohi)**. Built with Next.js 15 (App Router), Tailwind CSS, Lucide icons, Supabase Auth (`@supabase/ssr`), Supabase Storage, and Supabase Realtime.

---

## 🍕 Design Philosophy (Built for a Busy Kitchen on Mobile & Tablets)

- **Zero Storefront Clutter:** Dedicated specifically for chefs, packers, and delivery dispatchers with no consumer distractions.
- **Brand SVG Logo:** Bespoke **Melting Cheese Kitchen POS** SVG logo embedded across the header (`POSHeader.tsx`) and authentication portal (`/login`).
- **Large Tap Targets (Minimum 48px Height):** Every button, status advance action, phone dialer, map pin, WhatsApp update, and stock switch is sized for rapid, mistake-free tapping with greasy or wet kitchen fingers.
- **High-Contrast Dark Theme & Status Hierarchy:**
  - **NEW ORDER:** Bright Amber/Red pulsing card (`animate-new-order-glow`) with high-contrast alert badges, elapsed timer, loud Web Audio chime, and prominent **`ACCEPT ORDER`** button (moves to `PREPARING`).
  - **PREPARING:** Solid blue card with elapsed preparation timer and **`MARK OUT FOR DELIVERY`** button (moves to `OUT_FOR_DELIVERY`).
  - **OUT FOR DELIVERY:** Solid purple card with driver dispatch details and **`MARK DELIVERED`** button (moves to `DELIVERED`).
  - **DELIVERED:** Subdued emerald completion state.
- **Loud Web Audio Chime:** Multi-tone ascending chime (C5 → E5 → G5 → C6) designed to cut through background restaurant sounds. Includes audio priming on first interaction and a "Test Bell" button in the header.

---

## 🌟 Core Features

### 1. Simple Login Screen (`/login`)
- Clean email/password authentication using `@supabase/ssr`.
- Branded with the golden Melting Cheese Kitchen POS emblem.
- Automatic route protection: Unauthenticated visitors are redirected to `/login`, while authenticated staff are redirected to `/`.

### 2. Real-Time Orders Board (`/`)
- **Live Supabase Sync:** Subscribes to `postgres_changes` on the `orders` table for instantaneous `INSERT`, `UPDATE`, and `DELETE` events.
- **10-Second Polling Fallback & Manual Refresh:** Guarantees order synchronization even over spotty mobile hotspot or kitchen Wi-Fi connections.
- **Top Summary KPI Bar:**
  - **Today's Orders:** Live count of all orders placed today (since 12:00 AM).
  - **Today's Revenue (₹):** Sum of gross revenue from today's non-cancelled orders.
  - **Pending UPI Payments:** Counter and rupee amount for UPI orders awaiting payment verification.
- **1-Tap Kitchen Actions:**
  - **Notify on WhatsApp:** Opens `https://wa.me/91<customer_phone>?text=...` pre-filled with a polite WhatsApp Business status update:
    > *"Hi <Name>, your Melting Cheese order #<number> is now <STATUS>! Thank you for ordering direct."*
  - **Call Customer (`tel:`):** Directly launches the phone dialer.
  - **Open Maps Pin:** Directly launches customer GPS pin or address in Google Maps.
  - **Mark UPI Paid:** 1-tap button to instantly verify and mark pending UPI payments as `PAID`.
  - **Stage Advancement:** 1-tap `ACCEPT ORDER` → `MARK OUT FOR DELIVERY` → `MARK DELIVERED`.

### 3. Full Menu Management & Dish Photo Manager (`/menu`)
- **Responsive Desktop PC + Mobile Grid:** Spacious multi-column display (`lg:grid-cols-2 xl:grid-cols-3 max-w-7xl mx-auto`) for kitchen monitors and desktop workstations, while retaining large 48px touch targets for mobile.
- **"+ Add New Dish" Modal:** Complete creation modal with Dish Name, Category (presets + custom), Dietary (Veg / Non-Veg toggle), Base Price (₹), Description, Customizability, Highlight Badge (Bestseller, Chef Special, Spicy), and instant image upload to Supabase Storage `menu-images`.
- **Inline Edit Price:** 1-tap price editor on every dish card allowing staff to adjust base price with immediate Supabase update.
- **Delete Dish:** Permanent deletion button (with confirmation) executing `supabase.from('menu_items').delete().eq('id', item.id)`.
- **Upload Real Dish Photos:** 1-tap **"Change Photo"** button on every dish uploading directly to the public Supabase Storage bucket `menu-images` and updating `menu_items.image`.
- **1-Tap Stock Switch:** Instant `IN STOCK` (Green) / `SOLD OUT` (Red) toggle updating `is_available` in Supabase with optimistic UI updates.
- Real-time stock counters (Total Items, In Stock count, Sold Out count) and quick dish search.

---

## 🛠️ Tech Stack & Architecture

- **Framework:** Next.js 15 (App Router, React 19)
- **Styling:** Tailwind CSS with custom POS animations
- **Database, Auth & Storage:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`, Storage bucket `menu-images`)
- **Icons:** Lucide React
- **Audio:** Web Audio API with multi-oscillator chime

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node.js v24)
- npm or yarn

### Environment Setup
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_UPI_ID=rhythm8@slc
NEXT_PUBLIC_RESTAURANT_PHONE=918090485140
```

### Installation & Run
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

---

## 📍 Restaurant Details
- **Restaurant:** Melting Cheese
- **Address:** 14, Sant Ravidas Nagar, Bhadohi, Uttar Pradesh, India
- **Phone:** +91 80904 85140
