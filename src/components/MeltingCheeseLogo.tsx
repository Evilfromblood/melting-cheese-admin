import React from 'react';

interface MeltingCheeseLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const MeltingCheeseLogo: React.FC<MeltingCheeseLogoProps> = ({
  size = 48,
  className = '',
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* SVG Icon Graphic */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200"
      >
        <defs>
          {/* Cheese Gradient */}
          <linearGradient id="cheeseGrad" x1="15" y1="20" x2="105" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE047" />    {/* Yellow 300 */}
            <stop offset="45%" stopColor="#F59E0B" />   {/* Amber 500 */}
            <stop offset="100%" stopColor="#D97706" />  {/* Amber 600 */}
          </linearGradient>

          {/* Crust Top Edge Gradient */}
          <linearGradient id="crustGrad" x1="20" y1="25" x2="100" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EA580C" />    {/* Orange 600 */}
            <stop offset="100%" stopColor="#B45309" />  {/* Amber 700 */}
          </linearGradient>

          {/* Molten Glow Filter */}
          <filter id="cheeseGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#F59E0B" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Outer Circular Badge Background */}
        <rect
          x="4"
          y="4"
          width="112"
          height="112"
          rx="32"
          fill="#1C1A24"
          stroke="#3730A3"
          strokeWidth="1.5"
          className="stroke-amber-500/30"
        />

        {/* Glowing Molten Cheese Base Shape */}
        <g filter="url(#cheeseGlow)">
          {/* Main Cheese Wedge Slice */}
          <path
            d="M22 42C22 39.5 24 37.5 26.5 37.8L92.5 45.2C95.2 45.5 97 47.9 96.5 50.6L85.5 86.2C84.8 88.5 82.5 90 80.1 89.8L27.5 84.5C24.5 84.2 22 81.7 22 78.7V42Z"
            fill="url(#cheeseGrad)"
          />

          {/* Top Crispy Crust Layer */}
          <path
            d="M23 41.5L93.5 49.2C96.2 49.5 97.2 46.8 94.8 45.3L64 26.5C61.5 25 58.5 25 56 26.5L24.2 38.2C22.5 38.8 22 40.8 23 41.5Z"
            fill="url(#crustGrad)"
          />

          {/* Characteristic Cheese Holes */}
          {/* Hole 1 - Large */}
          <circle cx="48" cy="58" r="7.5" fill="#B45309" fillOpacity="0.8" />
          <path d="M43 55C44 53 48 53 50 55" stroke="#FDE047" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

          {/* Hole 2 - Medium */}
          <circle cx="74" cy="67" r="5.5" fill="#B45309" fillOpacity="0.8" />
          <path d="M70 65C71 63.5 74 63.5 76 65" stroke="#FDE047" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />

          {/* Hole 3 - Small */}
          <circle cx="36" cy="72" r="4" fill="#B45309" fillOpacity="0.8" />

          {/* Molten / Dripping Cheese Drops at Bottom */}
          {/* Drip 1 */}
          <path
            d="M38 84C38 84 37 96 42 96C46 96 45 84 45 84"
            fill="#F59E0B"
          />
          {/* Drip 2 - Deep Melt */}
          <path
            d="M56 86C56 86 54 102 61 102C67 102 65 86 65 86"
            fill="#FBBF24"
          />
          {/* Drip 3 */}
          <path
            d="M74 87C74 87 73 95 77 95C80.5 95 80 87 80 87"
            fill="#F59E0B"
          />
        </g>

        {/* Mini Chef Hat / Toque Accent on Top Left */}
        <g transform="translate(18, 14) scale(0.65)">
          <path
            d="M12 28H36V32C36 33.1 35.1 34 34 34H14C12.9 34 12 33.1 12 32V28Z"
            fill="#FFFFFF"
          />
          <path
            d="M14 28C10 26 8 20 11 15C13 11 18 11 20 13C22 8 28 8 30 13C33 11 38 12 38 16C39 21 36 26 34 28H14Z"
            fill="#FFFFFF"
          />
          <path
            d="M16 29H32"
            stroke="#EA580C"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        {/* Small Golden Stars / Sparkles */}
        <path
          d="M100 24L101.5 27.5L105 29L101.5 30.5L100 34L98.5 30.5L95 29L98.5 27.5L100 24Z"
          fill="#FDE047"
        />
        <path
          d="M18 92L19 94.5L21.5 95.5L19 96.5L18 99L17 96.5L14.5 95.5L17 94.5L18 92Z"
          fill="#F59E0B"
          opacity="0.8"
        />
      </svg>

      {/* Optional Matching Text Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-black text-xl sm:text-2xl text-white tracking-wide uppercase font-sans">
              Melting Cheese
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-black tracking-widest uppercase">
              POS
            </span>
          </div>
          <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
            Bhadohi • Kitchen Admin
          </span>
        </div>
      )}
    </div>
  );
};
