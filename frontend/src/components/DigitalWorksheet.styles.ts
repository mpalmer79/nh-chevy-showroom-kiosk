/**
 * Digital Worksheet Styles
 * Kiosk-optimized styling for the deal structuring interface.
 * Converted from DigitalWorksheet.css to TypeScript style objects using design tokens.
 *
 * NOTE: Pseudo-classes (:hover, :focus-within, :disabled, :active),
 * pseudo-elements (::-webkit-slider-thumb), @keyframes, and @media queries
 * cannot be expressed as inline CSSProperties. A minimal companion CSS file
 * (DigitalWorksheet.css) is retained for those features.
 */

import type { CSSProperties } from 'react';
import { colors, spacing, typography, borderRadius } from '../styles/tokens';

export const worksheetStyles: Record<string, CSSProperties> = {
  // =============================================================================
  // CONTAINER & LAYOUT
  // =============================================================================

  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: spacing.lg,
    background: colors.white,
    borderRadius: borderRadius.xl,
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
    position: 'relative',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
    boxSizing: 'border-box',
  },

  // =============================================================================
  // HEADER
  // =============================================================================

  header: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottom: '1px solid #e9ecef',
    position: 'relative',
  },
  headerTitle: {
    margin: `0 0 ${spacing.sm} 0`,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark,
  },
  subtitle: {
    margin: 0,
    fontSize: typography.fontSize.base,
    color: '#6c757d',
  },
  btnClose: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '36px',
    height: '36px',
    border: 'none',
    background: '#f8f9fa',
    borderRadius: '50%',
    fontSize: '24px',
    color: '#6c757d',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },

  // =============================================================================
  // SECTIONS
  // =============================================================================

  section: {
    marginBottom: spacing.lg,
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: borderRadius.lg,
  },
  sectionTitle: {
    margin: `0 0 ${spacing.md} 0`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  // =============================================================================
  // VEHICLE SECTION
  // =============================================================================

  vehicleSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: `linear-gradient(135deg, ${colors.dark} 0%, #2d2d44 100%)`,
    color: 'white',
    marginBottom: spacing.lg,
    padding: '20px',
    borderRadius: borderRadius.lg,
  },
  vehicleInfoTitle: {
    margin: '0 0 4px 0',
    fontSize: '20px',
    fontWeight: typography.fontWeight.semibold,
  },
  vehicleDetails: {
    margin: 0,
    fontSize: typography.fontSize.sm,
    opacity: 0.8,
  },
  vehiclePrice: {
    textAlign: 'right' as const,
  },
  priceLabel: {
    display: 'block',
    fontSize: typography.fontSize.xs,
    opacity: 0.8,
    marginBottom: '4px',
  },
  priceValue: {
    fontSize: '24px',
    fontWeight: typography.fontWeight.bold,
  },
  priceDiscount: {
    display: 'block',
    fontSize: typography.fontSize.xs,
    color: '#00bf63',
    marginTop: '4px',
  },

  // =============================================================================
  // TRADE-IN SECTION
  // =============================================================================

  tradeSection: {
    background: '#fff3cd',
    border: '1px solid #ffc107',
    marginBottom: spacing.lg,
    padding: '20px',
    borderRadius: borderRadius.lg,
  },
  tradeInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tradeVehicle: {
    fontWeight: typography.fontWeight.medium,
    color: colors.dark,
  },
  tradeEquity: {
    textAlign: 'right' as const,
  },
  equityLabel: {
    display: 'block',
    fontSize: typography.fontSize.xs,
    color: '#6c757d',
  },
  equityValue: {
    fontSize: '20px',
    fontWeight: typography.fontWeight.bold,
  },
  equityPositive: {
    color: '#00bf63',
  },
  equityNegative: {
    color: '#e94560',
  },
  tradeNote: {
    margin: '12px 0 0 0',
    fontSize: typography.fontSize.xs,
    color: '#856404',
    fontStyle: 'italic',
  },

  // =============================================================================
  // DOWN PAYMENT SECTION
  // =============================================================================

  downpaymentControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  downpaymentInputGroup: {
    display: 'flex',
    alignItems: 'center',
    background: 'white',
    border: '2px solid #dee2e6',
    borderRadius: borderRadius.md,
    padding: '12px 16px',
    transition: 'border-color 0.2s',
  },
  currencySymbol: {
    fontSize: '24px',
    fontWeight: typography.fontWeight.semibold,
    color: '#6c757d',
    marginRight: spacing.sm,
  },
  downpaymentInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '28px',
    fontWeight: typography.fontWeight.bold,
    color: colors.dark,
    background: 'transparent',
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: typography.fontSize.xs,
    color: '#6c757d',
  },

  // =============================================================================
  // TERM OPTIONS
  // =============================================================================

  termOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  termOption: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 12px',
    background: 'white',
    border: '2px solid #dee2e6',
    borderRadius: borderRadius.lg,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  termOptionSelected: {
    borderColor: '#e94560',
    background: 'linear-gradient(135deg, #fff5f7 0%, #ffffff 100%)',
    boxShadow: '0 4px 12px rgba(233, 69, 96, 0.2)',
  },
  termMonths: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: '#6c757d',
    marginBottom: '4px',
  },
  termPayment: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark,
  },
  termPaymentSelected: {
    color: '#e94560',
  },
  termApr: {
    fontSize: typography.fontSize.xs,
    color: '#6c757d',
    marginTop: '4px',
  },

  // =============================================================================
  // SUMMARY SECTION
  // =============================================================================

  summarySection: {
    background: 'white',
    border: '1px solid #dee2e6',
    marginBottom: spacing.lg,
    padding: '20px',
    borderRadius: borderRadius.lg,
  },
  paymentSummary: {
    marginBottom: '20px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: typography.fontSize.sm,
    color: '#495057',
  },
  summaryRowTotal: {
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.base,
    color: colors.dark,
    paddingTop: '12px',
  },
  summaryRowHighlight: {
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.base,
    color: colors.dark,
    background: '#f8f9fa',
    margin: '0 -20px',
    padding: '12px 20px',
  },
  summaryPositive: {
    color: '#00bf63',
  },
  summaryNegative: {
    color: '#e94560',
  },
  summaryDivider: {
    height: '1px',
    background: '#dee2e6',
    margin: '12px 0',
  },

  // =============================================================================
  // MONTHLY HIGHLIGHT
  // =============================================================================

  monthlyHighlight: {
    textAlign: 'center',
    padding: spacing.lg,
    background: `linear-gradient(135deg, ${colors.dark} 0%, #2d2d44 100%)`,
    borderRadius: borderRadius.lg,
    color: 'white',
    marginBottom: spacing.md,
  },
  monthlyLabel: {
    display: 'block',
    fontSize: typography.fontSize.sm,
    opacity: 0.8,
    marginBottom: spacing.sm,
  },
  monthlyAmount: {
    fontSize: '48px',
    fontWeight: typography.fontWeight.bold,
    lineHeight: 1,
  },
  perMonth: {
    fontSize: '20px',
    fontWeight: typography.fontWeight.normal,
    opacity: 0.8,
  },
  monthlyDetails: {
    display: 'block',
    fontSize: typography.fontSize.sm,
    opacity: 0.7,
    marginTop: spacing.sm,
  },
  taxDisclosure: {
    margin: 0,
    fontSize: '13px',
    color: '#6c757d',
    textAlign: 'center',
  },

  // =============================================================================
  // COUNTER OFFER BANNER
  // =============================================================================

  counterOfferBanner: {
    display: 'flex',
    gap: '12px',
    padding: spacing.md,
    background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)',
    border: '1px solid #28a745',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  counterIcon: {
    fontSize: '24px',
  },
  counterContentStrong: {
    display: 'block',
    color: '#155724',
    marginBottom: '4px',
    fontWeight: typography.fontWeight.bold,
  },
  counterContentText: {
    margin: 0,
    color: '#155724',
  },

  // =============================================================================
  // ACTION BUTTONS
  // =============================================================================

  worksheetActions: {
    textAlign: 'center',
  },
  btnReady: {
    width: '100%',
    padding: '20px 32px',
    fontSize: '20px',
    fontWeight: typography.fontWeight.bold,
    color: 'white',
    background: 'linear-gradient(135deg, #e94560 0%, #d63850 100%)',
    border: 'none',
    borderRadius: borderRadius.lg,
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 16px rgba(233, 69, 96, 0.4)',
  },
  btnReadyDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  actionNote: {
    margin: '12px 0 0 0',
    fontSize: typography.fontSize.sm,
    color: '#6c757d',
  },

  // =============================================================================
  // LOADING & ERROR STATES
  // =============================================================================

  loadingError: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    textAlign: 'center',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #e94560',
    borderRadius: '50%',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: spacing.md,
  },
  errorTitle: {
    margin: `0 0 ${spacing.sm} 0`,
    color: colors.dark,
  },
  errorText: {
    color: '#6c757d',
    marginBottom: spacing.md,
  },
  btnRetry: {
    padding: '12px 24px',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'white',
    background: '#e94560',
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },
  updatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xl,
    zIndex: 10,
  },

  // =============================================================================
  // CONFIRMATION STATE
  // =============================================================================

  confirmationWrapper: {
    minHeight: '500px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmationContent: {
    textAlign: 'center',
    padding: '40px',
  },
  confirmationIcon: {
    fontSize: '64px',
    marginBottom: spacing.md,
  },
  confirmationTitle: {
    margin: `0 0 ${spacing.sm} 0`,
    fontSize: '32px',
    color: colors.dark,
  },
  confirmationText: {
    color: '#6c757d',
    fontSize: typography.fontSize.base,
    marginBottom: spacing.lg,
  },
  confirmationSummary: {
    background: '#f8f9fa',
    borderRadius: borderRadius.lg,
    padding: '20px',
    marginBottom: spacing.lg,
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
  },
  summaryItemLabel: {
    color: '#6c757d',
  },
  summaryItemValue: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.dark,
  },
  summaryItemValueHighlight: {
    color: '#e94560',
    fontSize: '20px',
    fontWeight: typography.fontWeight.semibold,
  },
  confirmationNote: {
    color: '#6c757d',
    fontSize: typography.fontSize.sm,
    marginBottom: '20px',
  },
  btnContinue: {
    padding: '14px 28px',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.dark,
    background: 'white',
    border: '2px solid #dee2e6',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default worksheetStyles;
