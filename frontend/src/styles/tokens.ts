export const colors = {
  // Brand
  brandBlue: '#0077b6',
  brandBlueDark: '#005a8c',
  brandGold: '#D1AD57',

  // Neutrals
  white: '#ffffff',
  grayLight: '#f5f5f5',
  gray100: '#f0f0f0',
  gray200: '#e5e5e5',
  gray300: '#d4d4d4',
  gray400: '#a3a3a3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  dark: '#1a1a2e',

  // Semantic
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Backgrounds
  bgPrimary: '#ffffff',
  bgSecondary: '#f8fafc',
  bgChat: '#ffffff',
  bgUserBubble: '#0077b6',
  bgAssistantBubble: '#f0f0f0',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
} as const;

export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '22px',
    xxl: '28px',
    heading: '36px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 6px rgba(0,0,0,0.07)',
  lg: '0 10px 15px rgba(0,0,0,0.1)',
  card: '0 2px 8px rgba(0,0,0,0.08)',
} as const;
