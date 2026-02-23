/**
 * Sales Manager Dashboard - Styles
 */

import { CSSProperties } from 'react';
import { colors, spacing, typography, borderRadius, shadows } from '../../styles/tokens';

export const styles: Record<string, CSSProperties> = {
  // Layout
  container: {
    minHeight: '100vh',
    background: '#f5f7fa',
    color: colors.dark,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '"Montserrat", sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 32px',
    background: colors.white,
    borderBottom: '1px solid #e2e8f0',
    boxShadow: shadows.sm,
  },
  title: {
    fontSize: '24px',
    fontWeight: typography.fontWeight.bold,
    color: colors.dark,
    margin: 0,
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  mainContent: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: spacing.lg,
    padding: '24px 32px',
  },

  // Tabs
  tabContainer: {
    display: 'flex',
    gap: spacing.xs,
    marginRight: spacing.md,
  },
  tabButton: {
    padding: `${spacing.sm} ${spacing.md}`,
    border: 'none',
    fontSize: '13px',
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },
  tabButtonLeft: {
    borderRadius: '6px 0 0 6px',
  },
  tabButtonRight: {
    borderRadius: '0 6px 6px 0',
  },
  tabButtonActive: {
    background: '#10b981',
    color: colors.white,
  },
  tabButtonInactive: {
    background: '#f1f5f9',
    color: colors.dark,
  },

  // Controls
  lastUpdate: {
    fontSize: '13px',
    color: colors.dark,
  },
  autoRefreshLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    fontSize: '13px',
    color: colors.dark,
    cursor: 'pointer',
  },
  checkbox: {
    width: spacing.md,
    height: spacing.md,
    cursor: 'pointer',
  },
  refreshBtn: {
    padding: `${spacing.sm} ${spacing.md}`,
    background: '#10b981',
    border: 'none',
    borderRadius: '6px',
    color: colors.white,
    fontSize: '13px',
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },
  backBtn: {
    padding: `${spacing.sm} ${spacing.md}`,
    background: '#3b4c6b',
    border: 'none',
    borderRadius: '6px',
    color: colors.white,
    fontSize: '13px',
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },

  // Session List
  sessionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  sessionListTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: 0,
  },

  // Cards
  card: {
    padding: spacing.md,
    background: colors.white,
    border: '1px solid #e2e8f0',
    borderRadius: borderRadius.lg,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: shadows.sm,
  },
  cardActive: {
    background: '#f0fdf4',
    border: '2px solid #10b981',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: typography.fontWeight.semibold,
    color: colors.dark,
  },
  cardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  cardTime: {
    fontSize: typography.fontSize.xs,
    color: '#64748b',
  },
  cardStep: {
    fontSize: typography.fontSize.xs,
    color: '#64748b',
  },
  cardVehicle: {
    fontSize: typography.fontSize.xs,
    color: '#10b981',
    fontWeight: typography.fontWeight.semibold,
  },

  // Badges
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    fontSize: '11px',
    fontWeight: typography.fontWeight.bold,
  },
  badgeSmall: {
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    fontSize: '10px',
    fontWeight: typography.fontWeight.semibold,
  },

  // States
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: spacing.md,
    color: '#64748b',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#10b981',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
    gap: spacing.md,
    color: '#64748b',
  },
  emptyIcon: {
    fontSize: '48px',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#64748b',
  },
  placeholderIcon: {
    fontSize: '64px',
    marginBottom: spacing.md,
  },
  placeholderTitle: {
    fontSize: '20px',
    fontWeight: typography.fontWeight.semibold,
    color: colors.dark,
    margin: `0 0 ${spacing.sm} 0`,
  },
  placeholderText: {
    fontSize: typography.fontSize.sm,
    margin: 0,
  },

  // Detail Panel
  detailPanel: {
    minHeight: '600px',
  },

  // Worksheet
  worksheet: {
    background: colors.white,
    borderRadius: borderRadius.xl,
    border: '1px solid #e2e8f0',
    padding: spacing.lg,
    boxShadow: shadows.sm,
  },
  worksheetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottom: '1px solid #e2e8f0',
  },
  worksheetTitle: {
    fontSize: '20px',
    fontWeight: typography.fontWeight.bold,
    color: colors.dark,
    margin: 0,
  },
  worksheetCustomer: {
    fontSize: typography.fontSize.sm,
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  worksheetActions: {
    display: 'flex',
    gap: spacing.sm,
  },
  worksheetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: spacing.lg,
  },

  // Sections
  section: {
    background: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    border: '1px solid #e2e8f0',
    padding: '20px',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: `0 0 ${spacing.md} 0`,
  },
  sectionIcon: {
    fontSize: typography.fontSize.base,
  },
  sectionContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },

  // Form Elements
  editableRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  editableLabel: {
    fontSize: typography.fontSize.xs,
    color: '#64748b',
  },
  editableInput: {
    padding: '10px 12px',
    background: colors.white,
    border: '1px solid #e2e8f0',
    borderRadius: borderRadius.md,
    color: colors.dark,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    width: '100%',
    boxSizing: 'border-box',
  },

  // Price Rows
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: typography.fontSize.sm,
    color: colors.dark,
  },
  equityRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '15px',
    fontWeight: typography.fontWeight.semibold,
    paddingTop: spacing.md,
    borderTop: '1px solid #e2e8f0',
    marginTop: spacing.sm,
  },
  positiveValue: {
    color: '#10b981',
  },
  negativeValue: {
    color: colors.error,
  },

  // Buttons
  actionBtn: {
    padding: '8px 14px',
    background: colors.bgSecondary,
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    color: colors.dark,
    fontSize: '13px',
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },
  actionBtnPrimary: {
    padding: '8px 14px',
    background: '#10b981',
    border: 'none',
    borderRadius: '6px',
    color: colors.white,
    fontSize: '13px',
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },
  actionBtnBlue: {
    padding: '8px 14px',
    background: colors.info,
    border: 'none',
    borderRadius: '6px',
    color: colors.white,
    fontSize: '13px',
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },
  viewChatBtn: {
    padding: '8px 14px',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    color: colors.info,
    fontSize: '13px',
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },

  // Payment
  paymentToggle: {
    display: 'flex',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  toggleBtn: {
    flex: 1,
    padding: '10px',
    background: colors.bgSecondary,
    border: '1px solid #e2e8f0',
    borderRadius: borderRadius.md,
    color: colors.dark,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },
  toggleBtnActive: {
    background: '#f0fdf4',
    border: '1px solid #10b981',
    color: '#10b981',
  },
  termButtons: {
    display: 'flex',
    gap: '6px',
    marginTop: '6px',
  },
  termBtn: {
    flex: 1,
    padding: spacing.sm,
    background: colors.bgSecondary,
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    color: colors.dark,
    fontSize: '13px',
    cursor: 'pointer',
  },
  termBtnActive: {
    background: '#f0fdf4',
    border: '1px solid #10b981',
    color: '#10b981',
  },
  paymentResult: {
    textAlign: 'center',
    padding: spacing.md,
    background: '#f0fdf4',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    border: '1px solid #bbf7d0',
  },
  paymentLabel: {
    display: 'block',
    fontSize: typography.fontSize.xs,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  paymentAmount: {
    display: 'block',
    fontSize: '32px',
    fontWeight: typography.fontWeight.bold,
    color: '#10b981',
    margin: '4px 0',
  },
  paymentTerm: {
    display: 'block',
    fontSize: '13px',
    color: '#64748b',
  },

  // Deal Summary
  dealSummary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: '20px',
    background: '#f0fdf4',
    borderRadius: borderRadius.lg,
    border: '1px solid #bbf7d0',
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.dark,
  },
  summaryValueLarge: {
    fontSize: '20px',
    fontWeight: typography.fontWeight.bold,
    color: '#10b981',
  },
  summaryDivider: {
    fontSize: '20px',
    color: '#cbd5e1',
    fontWeight: 300,
  },

  // Notes
  notesBox: {
    background: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    border: '1px solid #e2e8f0',
    padding: spacing.md,
  },
  boxTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.dark,
    textTransform: 'uppercase',
    margin: `0 0 ${spacing.md} 0`,
  },
  notesTextarea: {
    width: '100%',
    minHeight: '80px',
    padding: spacing.md,
    background: colors.white,
    border: '1px solid #e2e8f0',
    borderRadius: borderRadius.md,
    color: colors.dark,
    fontSize: '13px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },

  // Chat
  chatPanel: {
    background: colors.white,
    borderRadius: borderRadius.xl,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    boxShadow: shadows.sm,
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: `${spacing.md} 20px`,
    borderBottom: '1px solid #e2e8f0',
    background: colors.bgSecondary,
  },
  chatTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.dark,
    margin: 0,
  },
  chatMessages: {
    padding: '20px',
    maxHeight: '600px',
    overflowY: 'auto',
  },
  message: {
    padding: `${spacing.md} ${spacing.md}`,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    maxWidth: '80%',
  },
  messageUser: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    marginLeft: 'auto',
  },
  messageAssistant: {
    background: colors.bgSecondary,
    border: '1px solid #e2e8f0',
    marginRight: 'auto',
  },
  messageRole: {
    fontSize: '11px',
    fontWeight: typography.fontWeight.bold,
    color: '#64748b',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: spacing.xs,
  },
  messageContent: {
    fontSize: typography.fontSize.sm,
    lineHeight: 1.5,
    margin: 0,
    color: colors.dark,
  },
};
