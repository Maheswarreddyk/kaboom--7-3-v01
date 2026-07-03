/**
 * IndiaTV Design Tokens
 * 8pt spacing · Apple-inspired softness · Trust-first color psychology
 *
 * Primary blue  → trust, safety, technology
 * Secondary violet → curiosity, connection
 * Accent sky    → conversation, openness
 * Error rose    → caution without aggression
 */

export const tokens = {
  color: {
    bg: '#090E1A',
    surface: '#111827',
    surfaceElevated: '#1A2234',
    surfaceGlass: 'rgba(255, 255, 255, 0.06)',
    primary: '#4F8EF7',
    primaryHover: '#6BA1F9',
    primaryMuted: 'rgba(79, 142, 247, 0.15)',
    secondary: '#7C6BF0',
    secondaryMuted: 'rgba(124, 107, 240, 0.15)',
    accent: '#38BDF8',
    success: '#4ADE80',
    successMuted: 'rgba(74, 222, 128, 0.15)',
    warning: '#FBBF24',
    warningMuted: 'rgba(251, 191, 36, 0.15)',
    error: '#FB7185',
    errorMuted: 'rgba(251, 113, 133, 0.15)',
    info: '#60A5FA',
    like: '#F472B6',
    likeMuted: 'rgba(244, 114, 182, 0.2)',
    textPrimary: 'rgba(255, 255, 255, 0.95)',
    textSecondary: 'rgba(255, 255, 255, 0.65)',
    textTertiary: 'rgba(255, 255, 255, 0.40)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.15)',
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    full: '9999px',
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },
  shadow: {
    sm: '0 1px 3px rgba(0,0,0,0.24)',
    md: '0 4px 16px rgba(0,0,0,0.28)',
    lg: '0 8px 32px rgba(0,0,0,0.36)',
    glow: '0 0 24px rgba(79, 142, 247, 0.25)',
    glowLike: '0 0 32px rgba(244, 114, 182, 0.35)',
  },
  motion: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  touch: {
    min: '44px',
    control: '48px',
  },
} as const;
