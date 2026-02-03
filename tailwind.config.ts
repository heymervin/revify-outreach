import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Keep existing brand colors for backwards compatibility
        brand: {
          50: '#f7f5f2',
          100: '#f2f0eb',
          200: '#e5e1d8',
          300: '#c9c3b5',
          400: '#a39d8f',
          500: '#7a7468',
          600: '#5c5649',
          700: '#3d3830',
          800: '#2a2520',
          900: '#1a1714',
        },
      },
      boxShadow: {
        'primary': '0 4px 14px 0 rgba(16, 185, 129, 0.3)',
        'primary-lg': '0 8px 25px 0 rgba(16, 185, 129, 0.35)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-hero': 'linear-gradient(135deg, #10b981 0%, #059669 50%, #0d9488 100%)',
        'gradient-card': 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease forwards',
        'slide-up': 'slideUp 0.5s ease forwards',
        'slide-down': 'slideDown 0.3s ease forwards',
        'scale-in': 'scaleIn 0.2s ease forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
};

export default config;
