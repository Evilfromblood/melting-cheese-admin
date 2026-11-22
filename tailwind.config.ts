import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cheese: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        crust: {
          dark: '#121214',
          card: '#18181b',
          elevated: '#202024',
          border: '#2e2e36',
          lightBorder: '#3f3f46',
        }
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
        'new-order-glow': {
          '0%, 100%': { 
            boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7), 0 0 25px rgba(245, 158, 11, 0.5)',
            borderColor: 'rgba(239, 68, 68, 0.9)'
          },
          '50%': { 
            boxShadow: '0 0 0 8px rgba(239, 68, 68, 0.1), 0 0 35px rgba(245, 158, 11, 0.8)',
            borderColor: 'rgba(245, 158, 11, 1)'
          },
        }
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'new-order-glow': 'new-order-glow 1.5s ease-in-out infinite',
      }
    },
  },
  plugins: [],
} satisfies Config;
