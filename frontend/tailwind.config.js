/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        canvas: '#090E1A',
        surface: {
          DEFAULT: '#111827',
          elevated: '#1A2234',
          glass: 'rgba(255, 255, 255, 0.06)',
        },
        // Brand — trust (blue), curiosity (violet), conversation (sky)
        brand: {
          DEFAULT: '#4F8EF7',
          hover: '#6BA1F9',
          muted: 'rgba(79, 142, 247, 0.15)',
          glow: 'rgba(79, 142, 247, 0.25)',
        },
        violet: {
          DEFAULT: '#7C6BF0',
          muted: 'rgba(124, 107, 240, 0.15)',
        },
        sky: {
          DEFAULT: '#38BDF8',
          muted: 'rgba(56, 189, 248, 0.15)',
        },
        // Semantic
        success: {
          DEFAULT: '#4ADE80',
          muted: 'rgba(74, 222, 128, 0.15)',
        },
        warning: {
          DEFAULT: '#FBBF24',
          muted: 'rgba(251, 191, 36, 0.15)',
        },
        danger: {
          DEFAULT: '#FB7185',
          muted: 'rgba(251, 113, 133, 0.15)',
        },
        info: {
          DEFAULT: '#60A5FA',
          muted: 'rgba(96, 165, 250, 0.15)',
        },
        like: {
          DEFAULT: '#F472B6',
          muted: 'rgba(244, 114, 182, 0.2)',
          glow: 'rgba(244, 114, 182, 0.35)',
        },
        // Text
        content: {
          primary: 'rgba(255, 255, 255, 0.95)',
          secondary: 'rgba(255, 255, 255, 0.65)',
          tertiary: 'rgba(255, 255, 255, 0.40)',
        },
        // Borders
        edge: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.15)',
        },
        // Legacy aliases
        accent: {
          DEFAULT: '#4F8EF7',
          light: '#6BA1F9',
          glow: 'rgba(79, 142, 247, 0.25)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'heading': ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        'subheading': ['1.125rem', { lineHeight: '1.4', fontWeight: '500' }],
        'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'caption': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'micro': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      boxShadow: {
        'soft-sm': '0 1px 3px rgba(0, 0, 0, 0.24)',
        'soft-md': '0 4px 16px rgba(0, 0, 0, 0.28)',
        'soft-lg': '0 8px 32px rgba(0, 0, 0, 0.36)',
        'soft-xl': '0 16px 48px rgba(0, 0, 0, 0.44)',
        'glow-brand': '0 0 24px rgba(79, 142, 247, 0.25)',
        'glow-like': '0 0 32px rgba(244, 114, 182, 0.35)',
        'inner-soft': 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
      },
      backdropBlur: {
        xs: '4px',
        glass: '20px',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'fade-out': 'fadeOut 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'slide-down': 'slideDown 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'slide-in': 'slideIn 0.35s ease-out forwards',
        'scale-up': 'scaleUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'scale-down': 'scaleDown 0.15s ease-out forwards',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
        'search-ring': 'searchRing 2s ease-in-out infinite',
        'search-dot': 'searchDot 1.4s ease-in-out infinite',
        'heart-beat': 'heartBeat 0.55s ease-in-out',
        'heart-glow': 'heartGlow 0.6s ease-out forwards',
        'float-particle': 'floatParticle 3.5s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleDown: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(0.96)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
        searchRing: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.4' },
          '50%': { transform: 'scale(1.08)', opacity: '0.8' },
        },
        searchDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        heartBeat: {
          '0%': { transform: 'scale(1)' },
          '20%': { transform: 'scale(1.22)' },
          '40%': { transform: 'scale(1.08)' },
          '60%': { transform: 'scale(1.18)' },
          '100%': { transform: 'scale(1)' },
        },
        heartGlow: {
          '0%': { boxShadow: '0 0 0 0 rgba(244, 114, 182, 0.5)' },
          '100%': { boxShadow: '0 0 24px 8px rgba(244, 114, 182, 0)' },
        },
        floatParticle: {
          '0%': { transform: 'translateY(80vh) rotate(0deg)', opacity: '0' },
          '15%': { opacity: '0.7' },
          '85%': { opacity: '0.5' },
          '100%': { transform: 'translateY(-10vh) rotate(15deg)', opacity: '0' },
        },
        shimmer: {
          '0%': { opacity: '0.5' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};
