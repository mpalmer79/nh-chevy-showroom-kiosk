/**
 * Quirk AI Kiosk - Design System Theme
 * Centralized design tokens for consistent styling across all components
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

interface ThemeColors {
  // Brand Colors
  primary: string;
  primaryDark: string;
  primaryLight: string;

  // Gradients
  primaryGradient: string;
  progressGradient: string;

  // Text Colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textSubtle: string;
  textDisabled: string;

  // Background Colors
  bgDark: string;
  bgCard: string;
  bgCardHover: string;
  bgOverlay: string;
  bgOverlayLight: string;

  // Border Colors
  border: string;
  borderLight: string;
  borderFocus: string;

  // Status Colors
  success: string;
  successBg: string;
  successBgStrong: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;

  // Accent backgrounds
  primaryBg: string;
  primaryBgMedium: string;
  primaryBgStrong: string;
  primaryBorder: string;
}

interface FontSizes {
  xs: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
  '5xl': string;
  '6xl': string;
  '7xl': string;
  '8xl': string;
  '9xl': string;
}

interface FontWeights {
  normal: string;
  medium: string;
  semibold: string;
  bold: string;
  extrabold: string;
}

interface LineHeights {
  tight: string;
  normal: string;
  relaxed: string;
}

interface ThemeTypography {
  fontFamily: string;
  fontMono: string;
  fontSize: FontSizes;
  fontWeight: FontWeights;
  lineHeight: LineHeights;
}

interface ThemeSpacing {
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
  7: string;
  8: string;
  9: string;
  10: string;
  12: string;
  16: string;
}

interface ThemeBorderRadius {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
  full: string;
  pill: string;
}

interface ThemeShadows {
  sm: string;
  md: string;
  lg: string;
  glow: string;
}

interface ThemeTransitions {
  fast: string;
  normal: string;
  slow: string;
}

interface ThemeZIndex {
  base: number;
  dropdown: number;
  sticky: number;
  modal: number;
  tooltip: number;
}

interface ThemeBreakpoints {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface Theme {
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  transitions: ThemeTransitions;
  zIndex: ThemeZIndex;
  breakpoints: ThemeBreakpoints;
}

// ============================================
// COLORS
// ============================================
export const colors: ThemeColors = {
  // Brand Colors
  primary: '#22c55e',
  primaryDark: '#16a34a',
  primaryLight: '#4ade80',

  // Gradients
  primaryGradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
  progressGradient: 'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)',

  // Text Colors
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.8)',
  textMuted: 'rgba(255,255,255,0.6)',
  textSubtle: 'rgba(255,255,255,0.5)',
  textDisabled: 'rgba(255,255,255,0.4)',

  // Background Colors
  bgDark: '#0a0a0a',
  bgCard: 'rgba(255,255,255,0.05)',
  bgCardHover: 'rgba(255,255,255,0.08)',
  bgOverlay: 'rgba(0,0,0,0.2)',
  bgOverlayLight: 'rgba(0,0,0,0.7)',

  // Border Colors
  border: 'rgba(255,255,255,0.1)',
  borderLight: 'rgba(255,255,255,0.2)',
  borderFocus: '#22c55e',

  // Status Colors
  success: '#4ade80',
  successBg: 'rgba(74, 222, 128, 0.1)',
  successBgStrong: 'rgba(74, 222, 128, 0.2)',
  warning: '#fbbf24',
  warningBg: 'rgba(251, 191, 36, 0.1)',
  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.1)',

  // Accent backgrounds
  primaryBg: 'rgba(27, 115, 64, 0.1)',
  primaryBgMedium: 'rgba(27, 115, 64, 0.15)',
  primaryBgStrong: 'rgba(27, 115, 64, 0.2)',
  primaryBorder: 'rgba(27, 115, 64, 0.3)',
};

// ============================================
// TYPOGRAPHY
// ============================================
export const typography: ThemeTypography = {
  // Font Family
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
  fontMono: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",

  // Font Sizes
  fontSize: {
    xs: '11px',
    sm: '12px',
    base: '13px',
    md: '14px',
    lg: '15px',
    xl: '16px',
    '2xl': '18px',
    '3xl': '20px',
    '4xl': '24px',
    '5xl': '28px',
    '6xl': '32px',
    '7xl': '48px',
    '8xl': '72px',
    '9xl': '120px',
  },

  // Font Weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line Heights
  lineHeight: {
    tight: '1.2',
    normal: '1.5',
    relaxed: '1.75',
  },
};

// ============================================
// SPACING
// ============================================
export const spacing: ThemeSpacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  12: '48px',
  16: '64px',
};

// ============================================
// BORDER RADIUS
// ============================================
export const borderRadius: ThemeBorderRadius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '10px',
  '2xl': '12px',
  '3xl': '16px',
  '4xl': '20px',
  full: '50%',
  pill: '9999px',
};

// ============================================
// SHADOWS
// ============================================
export const shadows: ThemeShadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px rgba(0, 0, 0, 0.3)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.3)',
  glow: '0 0 20px rgba(27, 115, 64, 0.3)',
};

// ============================================
// TRANSITIONS
// ============================================
export const transitions: ThemeTransitions = {
  fast: 'all 0.15s ease',
  normal: 'all 0.2s ease',
  slow: 'all 0.3s ease',
};

// ============================================
// Z-INDEX
// ============================================
export const zIndex: ThemeZIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  modal: 30,
  tooltip: 40,
};

// ============================================
// BREAKPOINTS
// ============================================
export const breakpoints: ThemeBreakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
};

// Default export
const theme: Theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
};

export default theme;
