/**
 * Digital Worksheet Component
 * Interactive deal structuring interface for the kiosk.
 * Allows customers to view and adjust payment options in real-time.
 */

import React, { useState, useEffect, useCallback } from 'react';
import './DigitalWorksheet.css';
import { worksheetStyles as ws } from './DigitalWorksheet.styles';

// =============================================================================
// TYPES
// =============================================================================

interface TermOption {
  term_months: number;
  apr: number;
  monthly_payment: number;
  total_of_payments: number;
  total_interest: number;
  is_selected: boolean;
}

interface VehicleInfo {
  stock_number: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  exterior_color?: string;
  vin?: string;
  msrp: number;
}

interface TradeInInfo {
  year?: number;
  make?: string;
  model?: string;
  mileage?: number;
  estimated_value?: number;
  appraised_value?: number;
  payoff_amount?: number;
  equity: number;
  appraisal_status: string;
}

interface Worksheet {
  id: string;
  session_id: string;
  status: string;
  vehicle: VehicleInfo;
  has_trade: boolean;
  trade_in?: TradeInInfo;
  selling_price: number;
  trade_equity: number;
  down_payment: number;
  amount_financed: number;
  term_options: TermOption[];
  selected_term?: number;
  total_due_at_signing: number;
  monthly_payment: number;
  doc_fee: number;
  title_fee: number;
  manager_adjustment?: number;
  manager_notes?: string;
  counter_offer_sent?: boolean;
}

interface DigitalWorksheetProps {
  worksheetId: string;
  sessionId: string;
  onReady?: (worksheetId: string) => void;
  onClose?: () => void;
  apiBaseUrl?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_API_URL = process.env.REACT_APP_API_URL || 'https://quirk-backend-production.up.railway.app';

// =============================================================================
// COMPONENT
// =============================================================================

const DigitalWorksheet: React.FC<DigitalWorksheetProps> = ({
  worksheetId,
  sessionId,
  onReady,
  onClose,
  apiBaseUrl = DEFAULT_API_URL,
}) => {
  // State
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downPayment, setDownPayment] = useState(0);
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // =============================================================================
  // API CALLS
  // =============================================================================

  const fetchWorksheet = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/worksheet/${worksheetId}`, {
        headers: {
          'X-Session-ID': sessionId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load worksheet');
      }

      const data = await response.json();
      if (data.success && data.worksheet) {
        setWorksheet(data.worksheet);
        setDownPayment(data.worksheet.down_payment);
        setSelectedTerm(data.worksheet.selected_term || 72);
      } else {
        throw new Error(data.message || 'Failed to load worksheet');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [worksheetId, sessionId, apiBaseUrl]);

  const updateWorksheet = useCallback(async (updates: {
    down_payment?: number;
    selected_term?: number;
  }) => {
    if (!worksheet) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`${apiBaseUrl}/worksheet/${worksheetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update worksheet');
      }

      const data = await response.json();
      if (data.success && data.worksheet) {
        setWorksheet(data.worksheet);
      }
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setIsUpdating(false);
    }
  }, [worksheet, worksheetId, sessionId, apiBaseUrl]);

  const markReady = useCallback(async () => {
    if (!worksheet) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`${apiBaseUrl}/worksheet/${worksheetId}/ready`, {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to notify sales team');
      }

      const data = await response.json();
      if (data.success) {
        setIsReady(true);
        setShowConfirmation(true);
        if (onReady) {
          onReady(worksheetId);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to notify sales team');
    } finally {
      setIsUpdating(false);
    }
  }, [worksheet, worksheetId, sessionId, apiBaseUrl, onReady]);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  useEffect(() => {
    fetchWorksheet();
  }, [fetchWorksheet]);

  // Debounce down payment updates
  useEffect(() => {
    if (!worksheet || downPayment === worksheet.down_payment) return;

    const timer = setTimeout(() => {
      updateWorksheet({ down_payment: downPayment });
    }, 500);

    return () => clearTimeout(timer);
  }, [downPayment, worksheet, updateWorksheet]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleDownPaymentChange = (value: number) => {
    // Clamp between 0 and selling price
    const maxDown = worksheet?.selling_price || 100000;
    const clamped = Math.max(0, Math.min(value, maxDown));
    setDownPayment(clamped);
  };

  const handleTermSelect = (termMonths: number) => {
    setSelectedTerm(termMonths);
    updateWorksheet({ selected_term: termMonths });
  };

  const handleDownPaymentSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleDownPaymentChange(parseInt(e.target.value, 10));
  };

  const handleDownPaymentInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    handleDownPaymentChange(parseInt(value, 10) || 0);
  };

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSelectedTermOption = (): TermOption | null => {
    if (!worksheet) return null;
    return worksheet.term_options.find(t => t.term_months === selectedTerm) || null;
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <div className="worksheet-container" style={{ ...ws.container, ...ws.loadingError }}>
        <div className="worksheet-spinner" style={ws.spinner}></div>
        <p>Loading your worksheet...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="worksheet-container" style={{ ...ws.container, ...ws.loadingError }}>
        <div style={ws.errorIcon}>&#9888;&#65039;</div>
        <h3 style={ws.errorTitle}>Something went wrong</h3>
        <p style={ws.errorText}>{error}</p>
        <button onClick={fetchWorksheet} style={ws.btnRetry}>
          Try Again
        </button>
      </div>
    );
  }

  if (!worksheet) {
    return (
      <div className="worksheet-container" style={{ ...ws.container, ...ws.loadingError }}>
        <p>Worksheet not found</p>
      </div>
    );
  }

  if (showConfirmation) {
    return (
      <div className="worksheet-container" style={{ ...ws.container, ...ws.confirmationWrapper }}>
        <div style={ws.confirmationContent}>
          <div style={ws.confirmationIcon}>&#10004;&#65039;</div>
          <h2 style={ws.confirmationTitle}>You're All Set!</h2>
          <p style={ws.confirmationText}>A sales manager has been notified and will be with you shortly.</p>
          <div style={ws.confirmationSummary}>
            <div style={ws.summaryItem}>
              <span style={ws.summaryItemLabel}>Vehicle</span>
              <span style={ws.summaryItemValue}>
                {worksheet.vehicle.year} {worksheet.vehicle.model} {worksheet.vehicle.trim}
              </span>
            </div>
            <div style={ws.summaryItem}>
              <span style={ws.summaryItemLabel}>Monthly Payment</span>
              <span style={ws.summaryItemValueHighlight}>
                {formatCurrency(getSelectedTermOption()?.monthly_payment || worksheet.monthly_payment)}/mo
              </span>
            </div>
            <div style={ws.summaryItem}>
              <span style={ws.summaryItemLabel}>Due at Signing</span>
              <span style={ws.summaryItemValue}>{formatCurrency(worksheet.total_due_at_signing)}</span>
            </div>
          </div>
          <p style={ws.confirmationNote}>
            Feel free to continue browsing while you wait!
          </p>
          {onClose && (
            <button onClick={onClose} className="btn-continue-ws" style={ws.btnContinue}>
              Continue Browsing
            </button>
          )}
        </div>
      </div>
    );
  }

  const selectedOption = getSelectedTermOption();

  return (
    <div className="worksheet-container worksheet-container-responsive" style={ws.container}>
      {/* Header */}
      <div className="worksheet-header-responsive" style={ws.header}>
        <h2 style={ws.headerTitle}>Digital Worksheet</h2>
        <p style={ws.subtitle}>
          Adjust the numbers below to find the perfect payment for you
        </p>
        {onClose && (
          <button className="btn-close-ws" style={ws.btnClose} onClick={onClose} aria-label="Close">
            &#215;
          </button>
        )}
      </div>

      {/* Vehicle Info */}
      <div className="vehicle-section-responsive" style={ws.vehicleSection}>
        <div>
          <h3 style={ws.vehicleInfoTitle}>
            {worksheet.vehicle.year} {worksheet.vehicle.make} {worksheet.vehicle.model}
            {worksheet.vehicle.trim && ` ${worksheet.vehicle.trim}`}
          </h3>
          <p style={ws.vehicleDetails}>
            Stock #{worksheet.vehicle.stock_number}
            {worksheet.vehicle.exterior_color && ` \u2022 ${worksheet.vehicle.exterior_color}`}
          </p>
        </div>
        <div className="vehicle-price-responsive" style={ws.vehiclePrice}>
          <span style={ws.priceLabel}>Selling Price</span>
          <span style={ws.priceValue}>
            {formatCurrency(worksheet.selling_price)}
            {worksheet.manager_adjustment && worksheet.manager_adjustment < 0 && (
              <span style={ws.priceDiscount}>
                Save {formatCurrency(Math.abs(worksheet.manager_adjustment))}!
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Trade-In Section */}
      {worksheet.has_trade && worksheet.trade_in && (
        <div style={ws.tradeSection}>
          <h4 style={ws.sectionTitle}>Your Trade-In</h4>
          <div style={ws.tradeInfo}>
            <span style={ws.tradeVehicle}>
              {worksheet.trade_in.year} {worksheet.trade_in.make} {worksheet.trade_in.model}
            </span>
            <div style={ws.tradeEquity}>
              <span style={ws.equityLabel}>Estimated Equity</span>
              <span style={{
                ...ws.equityValue,
                ...(worksheet.trade_equity >= 0 ? ws.equityPositive : ws.equityNegative),
              }}>
                {worksheet.trade_equity >= 0 ? '+' : ''}{formatCurrency(worksheet.trade_equity)}
              </span>
            </div>
          </div>
          {worksheet.trade_in.appraisal_status !== 'appraised' && (
            <p style={ws.tradeNote}>
              * Final trade value pending professional appraisal
            </p>
          )}
        </div>
      )}

      {/* Down Payment Adjuster */}
      <div style={ws.section}>
        <h4 style={ws.sectionTitle}>Down Payment</h4>
        <div style={ws.downpaymentControls}>
          <div className="downpayment-input-group" style={ws.downpaymentInputGroup}>
            <span style={ws.currencySymbol}>$</span>
            <input
              type="text"
              value={downPayment.toLocaleString()}
              onChange={handleDownPaymentInput}
              style={ws.downpaymentInput}
              aria-label="Down payment amount"
            />
          </div>
          <input
            type="range"
            min="0"
            max={Math.min(worksheet.selling_price, 100000)}
            step="500"
            value={downPayment}
            onChange={handleDownPaymentSlider}
            className="downpayment-slider"
            aria-label="Adjust down payment"
          />
          <div style={ws.sliderLabels}>
            <span>$0</span>
            <span>{formatCurrency(Math.min(worksheet.selling_price, 100000))}</span>
          </div>
        </div>
      </div>

      {/* Term Options */}
      <div style={ws.section}>
        <h4 style={ws.sectionTitle}>Select Your Term</h4>
        <div className="term-options-responsive" style={ws.termOptions}>
          {worksheet.term_options.map((option) => (
            <button
              key={option.term_months}
              className="term-option-ws term-option-responsive"
              style={{
                ...ws.termOption,
                ...(selectedTerm === option.term_months ? ws.termOptionSelected : {}),
              }}
              onClick={() => handleTermSelect(option.term_months)}
              disabled={isUpdating}
            >
              <span style={ws.termMonths}>{option.term_months} mo</span>
              <span style={{
                ...ws.termPayment,
                ...(selectedTerm === option.term_months ? ws.termPaymentSelected : {}),
              }}>
                {formatCurrency(option.monthly_payment)}
              </span>
              <span style={ws.termApr}>{option.apr}% APR</span>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Summary */}
      <div style={ws.summarySection}>
        <div style={ws.paymentSummary}>
          <div style={ws.summaryRow}>
            <span>Vehicle Price</span>
            <span>{formatCurrency(worksheet.selling_price)}</span>
          </div>
          {worksheet.trade_equity !== 0 && (
            <div style={ws.summaryRow}>
              <span>Trade-In Equity</span>
              <span style={worksheet.trade_equity >= 0 ? ws.summaryPositive : ws.summaryNegative}>
                {worksheet.trade_equity >= 0 ? '-' : '+'}{formatCurrency(Math.abs(worksheet.trade_equity))}
              </span>
            </div>
          )}
          <div style={ws.summaryRow}>
            <span>Down Payment</span>
            <span>-{formatCurrency(downPayment)}</span>
          </div>
          <div style={{ ...ws.summaryRow, ...ws.summaryRowTotal }}>
            <span>Amount Financed</span>
            <span>{formatCurrency(worksheet.amount_financed)}</span>
          </div>
          <div style={ws.summaryDivider}></div>
          <div style={ws.summaryRow}>
            <span>Doc Fee</span>
            <span>{formatCurrency(worksheet.doc_fee)}</span>
          </div>
          <div style={ws.summaryRow}>
            <span>Title Fee</span>
            <span>{formatCurrency(worksheet.title_fee)}</span>
          </div>
          <div style={{ ...ws.summaryRow, ...ws.summaryRowHighlight }}>
            <span>Due at Signing</span>
            <span>{formatCurrency(worksheet.total_due_at_signing)}</span>
          </div>
        </div>

        {/* Monthly Payment Highlight */}
        <div style={ws.monthlyHighlight}>
          <span style={ws.monthlyLabel}>Your Monthly Payment</span>
          <span className="monthly-amount-responsive" style={ws.monthlyAmount}>
            {formatCurrency(selectedOption?.monthly_payment || worksheet.monthly_payment)}
            <span style={ws.perMonth}>/mo</span>
          </span>
          {selectedOption && (
            <span style={ws.monthlyDetails}>
              for {selectedOption.term_months} months @ {selectedOption.apr}% APR
            </span>
          )}
        </div>

        <p style={ws.taxDisclosure}>
          New Hampshire has no sales tax on vehicles! Other states may add tax to your payment.
        </p>
      </div>

      {/* Counter Offer Banner */}
      {worksheet.counter_offer_sent && worksheet.manager_notes && (
        <div style={ws.counterOfferBanner}>
          <span style={ws.counterIcon}>&#128172;</span>
          <div>
            <strong style={ws.counterContentStrong}>Message from Sales Manager:</strong>
            <p style={ws.counterContentText}>{worksheet.manager_notes}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={ws.worksheetActions}>
        <button
          className="btn-ready-ws btn-ready-responsive"
          style={{
            ...ws.btnReady,
            ...((isUpdating || isReady) ? ws.btnReadyDisabled : {}),
          }}
          onClick={markReady}
          disabled={isUpdating || isReady}
        >
          {isUpdating ? 'Please wait...' : isReady ? 'Manager Notified!' : "I'm Ready - Get a Manager"}
        </button>
        <p style={ws.actionNote}>
          A sales manager will come to finalize the details with you
        </p>
      </div>

      {/* Loading Overlay */}
      {isUpdating && (
        <div style={ws.updatingOverlay}>
          <div className="worksheet-spinner" style={ws.spinner}></div>
        </div>
      )}
    </div>
  );
};

export default DigitalWorksheet;
