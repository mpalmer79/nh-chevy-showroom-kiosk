import type { CSSProperties } from 'react';
import { colors, spacing, typography, borderRadius } from '../styles/tokens';

// =============================================================================
// NH CHEVY SHOWROOM KIOSK - Model Budget Selector Styles
// Design: Dark, cutting-edge tech aesthetic with depth and polish
// =============================================================================

const styles: Record<string, CSSProperties> = {
  // ---------------------------------------------------------------------------
  // MAIN CONTAINER - Dark gradient background
  // ---------------------------------------------------------------------------
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    paddingTop: '80px',
    paddingBottom: '40px',
    overflow: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    minHeight: 0,
    boxSizing: 'border-box',
    backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.5)), url(/showroom5.jfif)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  },

  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------
  loadingContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingSpinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(34, 197, 94, 0.2)',
    borderTopColor: colors.success,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255,255,255,0.7)',
  },

  // ---------------------------------------------------------------------------
  // STEP CONTAINER
  // ---------------------------------------------------------------------------
  stepContainer: {
    flex: '1 0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
    paddingBottom: '100px',
  },

  // ---------------------------------------------------------------------------
  // BACK BUTTON
  // ---------------------------------------------------------------------------
  backButton: {
    alignSelf: 'flex-start',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '10px 20px',
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    marginBottom: spacing.lg,
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s ease',
  },

  // ---------------------------------------------------------------------------
  // STEP HEADER - Glassmorphism card
  // ---------------------------------------------------------------------------
  stepHeader: {
    textAlign: 'center',
    marginBottom: spacing.xl,
    padding: '28px 36px',
    background: 'rgba(200, 200, 200, 0.5)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.3)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    backdropFilter: 'blur(20px)',
  },
  stepIcon: {
    width: '64px',
    height: '64px',
    borderRadius: borderRadius.xl,
    background: `linear-gradient(135deg, ${colors.success} 0%, #16a34a 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.white,
    margin: '0 auto 20px',
    boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4)',
  },
  stepTitle: {
    fontSize: 'clamp(22px, 5vw, 28px)',
    fontWeight: typography.fontWeight.bold,
    color: '#1e293b',
    margin: '0 0 8px 0',
    textAlign: 'center',
    letterSpacing: '-0.5px',
  },
  stepSubtitle: {
    fontSize: typography.fontSize.base,
    color: 'rgba(30, 41, 59, 0.7)',
    margin: 0,
  },

  // ---------------------------------------------------------------------------
  // BADGES
  // ---------------------------------------------------------------------------
  categoryBadge: {
    display: 'inline-block',
    padding: '8px 18px',
    background: 'linear-gradient(135deg, rgba(34,197,94,0.9) 0%, rgba(22,163,74,0.85) 100%)',
    borderRadius: '20px',
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: borderRadius.lg,
    border: '1px solid rgba(34,197,94,0.6)',
    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
  },
  modelBadge: {
    display: 'inline-block',
    padding: `${spacing.sm} ${spacing.md}`,
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.2) 100%)',
    borderRadius: '20px',
    color: '#60a5fa',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: borderRadius.lg,
    border: `1px solid rgba(59, 130, 246, 0.4)`,
    boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)',
  },

  // ---------------------------------------------------------------------------
  // CATEGORY GRID - Dark glass container
  // ---------------------------------------------------------------------------
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: spacing.md,
    width: '100%',
    padding: '0',
    paddingBottom: '0',
  },

  // Category selection card wrapper (matches stepHeader glassmorphism)
  categorySelectionCard: {
    background: 'rgba(200, 200, 200, 0.5)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.3)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    backdropFilter: 'blur(20px)',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.lg,
    width: '100%',
  },

  // ---------------------------------------------------------------------------
  // START OVER
  // ---------------------------------------------------------------------------
  startOverContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: '0',
  },
  startOverButton: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: borderRadius.lg,
    padding: '14px 28px',
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  },

  // ---------------------------------------------------------------------------
  // CATEGORY CARD - Image-based cards like GM Protection packages
  // ---------------------------------------------------------------------------
  categoryCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0',
    background: 'linear-gradient(145deg, rgba(51, 65, 85, 0.7) 0%, rgba(30, 41, 59, 0.9) 100%)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: borderRadius.xl,
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 0 20px rgba(255, 255, 255, 0.15), 0 4px 20px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    position: 'relative',
  },
  categoryImageContainer: {
    position: 'relative',
    width: '100%',
    height: '120px',
    overflow: 'hidden',
    borderRadius: '16px 16px 0 0',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.4s ease',
  },
  categoryImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.4) 100%)',
    pointerEvents: 'none',
  },
  categoryContent: {
    padding: `${spacing.md} ${borderRadius.lg} 20px`,
    textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box',
  },
  categoryIcon: {
    fontSize: '40px',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
  },
  categoryName: {
    fontSize: '15px',
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    letterSpacing: '-0.3px',
    marginBottom: spacing.xs,
  },
  categoryCount: {
    fontSize: '13px',
    color: 'rgba(148, 163, 184, 0.9)',
    fontWeight: typography.fontWeight.medium,
  },
  // Fallback emoji icon when no image (displayed in badge position)
  categoryFallbackIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '48px',
    opacity: 0.9,
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
  },
  categoryImagePlaceholder: {
    width: '100%',
    height: '120px',
    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.7) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  // ---------------------------------------------------------------------------
  // MODEL GRID
  // ---------------------------------------------------------------------------
  modelGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: spacing.md,
    width: '100%',
    padding: '0',
  },

  // ---------------------------------------------------------------------------
  // MODEL CARD
  // ---------------------------------------------------------------------------
  modelCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0',
    background: 'linear-gradient(145deg, rgba(51, 65, 85, 0.7) 0%, rgba(30, 41, 59, 0.9) 100%)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: borderRadius.xl,
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 0 20px rgba(255, 255, 255, 0.15), 0 4px 20px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    position: 'relative',
  },
  modelInitial: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: `linear-gradient(135deg, ${colors.info} 0%, #1d4ed8 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
  },
  modelName: {
    display: 'block',
    fontSize: '15px',
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    letterSpacing: '-0.3px',
    marginBottom: '6px',
  },
  modelCount: {
    display: 'block',
    fontSize: '13px',
    color: '#4ade80',
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    textShadow: '0 0 10px rgba(74, 222, 128, 0.5)',
  },
  modelConfig: {
    display: 'block',
    fontSize: typography.fontSize.xs,
    color: 'rgba(148, 163, 184, 0.8)',
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // ---------------------------------------------------------------------------
  // CAB SELECTION
  // ---------------------------------------------------------------------------
  cabGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: spacing.md,
    width: '100%',
    padding: '0',
  },
  cabCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: borderRadius.lg,
    padding: '28px 20px',
    background: 'linear-gradient(145deg, rgba(51, 65, 85, 0.6) 0%, rgba(30, 41, 59, 0.8) 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: borderRadius.xl,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
  },
  cabIcon: {
    fontSize: '40px',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
  },
  cabIconLarge: {
    fontSize: '56px',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
  },
  cabName: {
    fontSize: '17px',
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  cabDesc: {
    fontSize: '13px',
    color: 'rgba(148, 163, 184, 0.8)',
    textAlign: 'center',
  },

  // ---------------------------------------------------------------------------
  // FORM SECTIONS
  // ---------------------------------------------------------------------------
  formSection: {
    width: '100%',
    padding: spacing.lg,
    background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxSizing: 'border-box',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  },
  formIntro: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: '1.6',
  },

  // ---------------------------------------------------------------------------
  // COLOR SELECTION
  // ---------------------------------------------------------------------------
  colorSelects: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '28px',
  },
  colorSelectGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  inputLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  downPaymentDisclaimer: {
    fontSize: '10px',
    fontWeight: typography.fontWeight.medium,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'none',
    letterSpacing: '0',
    marginLeft: spacing.sm,
  },
  selectInput: {
    padding: '16px 18px',
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: borderRadius.lg,
    color: colors.white,
    fontSize: '15px',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
  },
  colorPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: borderRadius.lg,
    padding: '10px 14px',
    background: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '10px',
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  colorSwatch: {
    width: '28px',
    height: '28px',
    borderRadius: borderRadius.md,
    border: '2px solid rgba(255,255,255,0.3)',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },

  // ---------------------------------------------------------------------------
  // BUTTONS
  // ---------------------------------------------------------------------------
  continueButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '18px',
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    border: 'none',
    borderRadius: '14px',
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
    transition: 'all 0.3s ease',
  },
  searchButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: borderRadius.lg,
    width: '100%',
    padding: '18px',
    background: `linear-gradient(135deg, ${colors.success} 0%, #16a34a 100%)`,
    border: 'none',
    borderRadius: '14px',
    color: colors.white,
    fontSize: '17px',
    fontWeight: typography.fontWeight.bold,
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4)',
    transition: 'all 0.3s ease',
    letterSpacing: '-0.3px',
  },

  // ---------------------------------------------------------------------------
  // BUDGET DISPLAY
  // ---------------------------------------------------------------------------
  budgetDisplay: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: borderRadius.lg,
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
  },
  budgetValue: {
    fontSize: 'clamp(32px, 7vw, 42px)',
    fontWeight: 800,
    color: '#4ade80',
    textShadow: '0 0 30px rgba(74, 222, 128, 0.5)',
    letterSpacing: '-1px',
  },
  budgetSeparator: {
    fontSize: typography.fontSize.lg,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: typography.fontWeight.medium,
  },
  budgetLabel: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.8)',
  },

  // ---------------------------------------------------------------------------
  // SLIDERS
  // ---------------------------------------------------------------------------
  sliderGroup: {
    marginBottom: spacing.lg,
  },
  sliderLabel: {
    display: 'block',
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: borderRadius.lg,
    fontWeight: typography.fontWeight.medium,
  },
  slider: {
    width: '100%',
    height: '10px',
    borderRadius: '5px',
    appearance: 'none',
    background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)',
    cursor: 'pointer',
  },

  // ---------------------------------------------------------------------------
  // DOWN PAYMENT
  // ---------------------------------------------------------------------------
  downPaymentSection: {
    marginTop: '28px',
    marginBottom: '28px',
  },
  downPaymentOptions: {
    display: 'flex',
    gap: '10px',
    marginTop: '14px',
    flexWrap: 'wrap',
  },
  optionButton: {
    padding: `${borderRadius.lg} 18px`,
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: borderRadius.lg,
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    flex: '1 1 auto',
    minWidth: '70px',
    textAlign: 'center',
    transition: 'all 0.2s ease',
  },
  optionButtonActive: {
    background: `linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(22, 163, 74, 0.4) 100%)`,
    borderColor: colors.success,
    color: '#4ade80',
    boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)',
  },

  // ---------------------------------------------------------------------------
  // TRADE-IN
  // ---------------------------------------------------------------------------
  tradeOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing.md,
    marginBottom: '28px',
  },
  tradeCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: borderRadius.lg,
    padding: '28px 20px',
    background: 'linear-gradient(145deg, rgba(51, 65, 85, 0.6) 0%, rgba(30, 41, 59, 0.8) 100%)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: '18px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
  },
  tradeCardActive: {
    background: `linear-gradient(145deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.15) 100%)`,
    borderColor: colors.success,
    boxShadow: '0 0 30px rgba(34, 197, 94, 0.3)',
  },
  tradeIcon: {
    fontSize: spacing.xl,
    color: '#4ade80',
    filter: 'drop-shadow(0 0 10px rgba(74, 222, 128, 0.5))',
  },
  tradeName: {
    fontSize: '17px',
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
  },
  tradeDesc: {
    fontSize: '13px',
    color: 'rgba(148, 163, 184, 0.8)',
    textAlign: 'center',
    lineHeight: '1.5',
  },

  // ---------------------------------------------------------------------------
  // PAYOFF SECTION
  // ---------------------------------------------------------------------------
  payoffSection: {
    padding: '20px',
    background: 'rgba(15, 23, 42, 0.6)',
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    border: '1px solid rgba(255,255,255,0.08)',
  },
  payoffTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: '18px',
  },
  payoffOptions: {
    display: 'flex',
    gap: borderRadius.lg,
    marginBottom: '18px',
    flexWrap: 'wrap',
  },
  payoffAmountGroup: {
    marginTop: '18px',
  },
  payoffFieldsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '18px',
    marginTop: '18px',
  },
  tradeVehicleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '14px',
    marginBottom: '18px',
  },
  payoffFieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  // ---------------------------------------------------------------------------
  // INPUTS
  // ---------------------------------------------------------------------------
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: borderRadius.lg,
    marginTop: '10px',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  },
  inputPrefix: {
    padding: '16px 14px',
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.5)',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  textInput: {
    flex: 1,
    padding: '16px 18px',
    background: 'transparent',
    border: 'none',
    color: colors.white,
    fontSize: typography.fontSize.base,
    outline: 'none',
    minWidth: 0,
  },
  textInputFull: {
    flex: 1,
    padding: '16px 18px',
    background: 'transparent',
    border: 'none',
    color: colors.white,
    fontSize: typography.fontSize.base,
    outline: 'none',
    minWidth: 0,
    width: '100%',
  },
  textInputStandalone: {
    padding: '16px 18px',
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: borderRadius.lg,
    color: colors.white,
    fontSize: '15px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    marginTop: '10px',
    transition: 'all 0.2s ease',
  },

  // ---------------------------------------------------------------------------
  // PROGRESS BAR
  // ---------------------------------------------------------------------------
  progressBar: {
    display: 'flex',
    justifyContent: 'center',
    gap: borderRadius.lg,
    marginTop: '36px',
    marginBottom: '40px',
    paddingBottom: 'env(safe-area-inset-bottom, 20px)',
  },
  progressDot: {
    width: borderRadius.lg,
    height: borderRadius.lg,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    transition: 'all 0.3s ease',
  },
  progressDotActive: {
    background: `linear-gradient(135deg, ${colors.success} 0%, #16a34a 100%)`,
    transform: 'scale(1.3)',
    boxShadow: '0 0 16px rgba(34, 197, 94, 0.6)',
  },
  progressDotComplete: {
    background: '#4ade80',
    boxShadow: '0 0 10px rgba(74, 222, 128, 0.4)',
  },

  // ---------------------------------------------------------------------------
  // BUYING POWER SECTION
  // ---------------------------------------------------------------------------
  buyingPowerSection: {
    marginTop: '28px',
    padding: '20px',
    background: 'rgba(15, 23, 42, 0.6)',
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    border: '1px solid rgba(255,255,255,0.08)',
  },
  buyingPowerIntro: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: '18px',
    lineHeight: '1.6',
  },
  buyingPowerCard: {
    padding: '18px',
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '14px',
    marginBottom: '18px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  buyingPowerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  buyingPowerList: {
    listStyle: 'disc',
    paddingLeft: '22px',
    marginBottom: '18px',
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.fontSize.sm,
    lineHeight: '2',
  },
  buyingPowerText: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: '14px',
    lineHeight: '1.6',
  },
  buyingPowerResult: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '14px 18px',
    background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.15) 0%, rgba(34, 197, 94, 0.1) 100%)',
    borderRadius: borderRadius.lg,
    marginBottom: '18px',
    fontSize: '15px',
    color: '#4ade80',
    border: '1px solid rgba(74, 222, 128, 0.3)',
  },
  buyingPowerTotal: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '14px 18px',
    background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)',
    borderRadius: borderRadius.lg,
    fontSize: typography.fontSize.base,
    color: '#60a5fa',
    border: '1px solid rgba(96, 165, 250, 0.3)',
  },
  mathBreakdown: {
    padding: '18px',
    background: 'rgba(15, 23, 42, 0.4)',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  mathTitle: {
    fontSize: '15px',
    fontWeight: typography.fontWeight.bold,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: borderRadius.lg,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  mathList: {
    listStyle: 'disc',
    paddingLeft: '22px',
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.fontSize.sm,
    lineHeight: '2',
  },
  disclaimer: {
    marginTop: '18px',
    textAlign: 'center',
    fontSize: '13px',
    color: 'rgba(148, 163, 184, 0.7)',
    fontStyle: 'italic',
  },
};

export default styles;
