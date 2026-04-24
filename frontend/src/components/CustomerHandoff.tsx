import React, { useState } from 'react';
import api from './api';
import type { KioskComponentProps } from '../types';

// ============================================
// TYPE DEFINITIONS
// ============================================


interface LeadSubmitResult {
  leadId?: string;
  estimatedWait?: number;
  [key: string]: unknown;
}

// ============================================
// COMPONENT
// ============================================

const CustomerHandoff: React.FC<KioskComponentProps> = ({ navigateTo, updateCustomerData, customerData }) => {
  const [phone, setPhone] = useState<string>('');
  // Pre-fill name from customerData if available
  const [name, setName] = useState<string>(customerData?.customerName || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [waitTime, setWaitTime] = useState<number | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);

  // Get customer name for personalization
  const customerName = customerData?.customerName;
  
  const vehicle = customerData.selectedVehicle;
  const payment = customerData.paymentPreference;
  const tradeIn = customerData.tradeIn;

  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setError(null);
  };

  const handleSubmit = async (): Promise<void> => {
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Submit lead to backend
      const result = await api.submitLead({
        phone: phoneDigits,
        name: name || null,
        vehicle: vehicle ? {
          stockNumber: vehicle.stockNumber,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          trim: vehicle.trim,
          salePrice: vehicle.salePrice,
        } : null,
        payment_preference: payment ? {
          type: payment.type,
          monthly: payment.monthly,
          term: payment.term,
          downPayment: payment.downPayment,
        } : null,
        trade_in: tradeIn ? {
          year: tradeIn.year,
          make: tradeIn.make,
          model: tradeIn.model,
          estimatedValue: tradeIn.estimatedValue,
        } : null,
        quiz_answers: customerData.quizAnswers || null,
      } as unknown as Parameters<typeof api.submitLead>[0]) as unknown as LeadSubmitResult;
      
      setLeadId(result.leadId || null);
      setWaitTime(result.estimatedWait || 3);
      
      updateCustomerData({
        contactInfo: {
          phone: phoneDigits,
          name,
          submittedAt: new Date().toISOString(),
          leadId: result.leadId,
        },
      });
      
      // Log analytics
      api.logAnalytics('lead_submitted', {
        leadId: result.leadId,
        hasVehicle: !!vehicle,
        hasPayment: !!payment,
        hasTradeIn: !!tradeIn,
      });
      
      setIsComplete(true);
    } catch (err: unknown) {
      console.error('Failed to submit lead:', err);
      setError('Unable to submit. Please try again or speak with a team member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <div style={styles.container}>
        <div style={styles.successContent}>
          <div style={styles.successIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          
          <h1 style={styles.successTitle}>You're All Set!</h1>
          <p style={styles.successSubtitle}>
            A team member has been notified and will be with you shortly.
          </p>

          {/* Wait Time */}
          <div style={styles.waitTimeCard}>
            <span style={styles.waitTimeLabel}>Estimated Wait</span>
            <span style={styles.waitTimeValue}>{waitTime} minutes</span>
          </div>

          {/* Summary */}
          <div style={styles.summaryCard}>
            <h3 style={styles.summaryTitle}>Your Interest</h3>
            
            {vehicle && (
              <div style={styles.summaryItem}>
                <span style={styles.summaryIcon}>🚗</span>
                <div style={styles.summaryDetails}>
                  <span style={styles.summaryLabel}>Vehicle</span>
                  <span style={styles.summaryValue}>
                    {vehicle.year} {vehicle.model} {vehicle.trim}
                  </span>
                  <span style={styles.summaryMeta}>Stock #{vehicle.stockNumber}</span>
                </div>
              </div>
            )}

            {payment && (
              <div style={styles.summaryItem}>
                <span style={styles.summaryIcon}>💰</span>
                <div style={styles.summaryDetails}>
                  <span style={styles.summaryLabel}>Payment</span>
                  <span style={styles.summaryValue}>
                    ${payment.monthly}/mo ({payment.type})
                  </span>
                  <span style={styles.summaryMeta}>
                    {payment.term} months, ${payment.downPayment?.toLocaleString()} down
                  </span>
                </div>
              </div>
            )}

            {tradeIn && (
              <div style={styles.summaryItem}>
                <span style={styles.summaryIcon}>🔄</span>
                <div style={styles.summaryDetails}>
                  <span style={styles.summaryLabel}>Trade-In</span>
                  <span style={styles.summaryValue}>
                    {tradeIn.year} {tradeIn.make} {tradeIn.model}
                  </span>
                  <span style={styles.summaryMeta}>
                    Est. Value: ~${tradeIn.estimatedValue?.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* What to Expect */}
          <div style={styles.expectCard}>
            <h4 style={styles.expectTitle}>What to Expect</h4>
            <div style={styles.expectSteps}>
              <div style={styles.expectStep}>
                <span style={styles.stepNumber}>1</span>
                <span style={styles.stepText}>A sales consultant will greet you</span>
              </div>
              <div style={styles.expectStep}>
                <span style={styles.stepNumber}>2</span>
                <span style={styles.stepText}>They'll have your info ready</span>
              </div>
              <div style={styles.expectStep}>
                <span style={styles.stepNumber}>3</span>
                <span style={styles.stepText}>Schedule a test drive or finalize numbers</span>
              </div>
            </div>
          </div>

          {/* Reference Number */}
          {leadId && (
            <div style={styles.refNumber}>
              Reference: {leadId}
            </div>
          )}

          {/* Actions */}
          <div style={styles.successActions}>
            <button 
              style={styles.browseButton}
              onClick={() => navigateTo('welcome')}
            >
              Continue Browsing
            </button>
          </div>

          {/* Confirmation Text */}
          <p style={styles.confirmationText}>
            📱 We'll text {phone} with your appointment details
          </p>
        </div>

        <style>{`
          @keyframes checkmark {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.formContent}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <h1 style={styles.title}>
            {customerName ? `Almost there, ${customerName}!` : 'Almost There!'}
          </h1>
          <p style={styles.subtitle}>
            Enter your phone number and a team member will be right with you
          </p>
        </div>

        {/* Quick Summary */}
        {vehicle && (
          <div style={styles.vehicleSummary}>
            <div style={{ 
              ...styles.vehicleThumb, 
              background: vehicle.gradient || 'linear-gradient(135deg, #4b5563 0%, #374151 100%)' 
            }}>
              <span style={styles.vehicleInitial}>{(vehicle.model || 'V').charAt(0)}</span>
            </div>
            <div style={styles.vehicleInfo}>
              <span style={styles.vehicleName}>
                {vehicle.year} {vehicle.model}
              </span>
              <span style={styles.vehiclePrice}>
                ${vehicle.salePrice?.toLocaleString()}
                {payment && ` • $${payment.monthly}/mo`}
              </span>
            </div>
          </div>
        )}

        {/* Form */}
        <div style={styles.form}>
          {/* Name - Pre-filled if we have it, optional otherwise */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Your Name {!customerName && <span style={styles.optional}>(optional)</span>}
            </label>
            <input
              type="text"
              style={styles.input}
              placeholder="First name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            />
          </div>

          {/* Phone */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Phone Number</label>
            <input
              type="tel"
              style={styles.phoneInput}
              placeholder="(___) ___-____"
              value={phone}
              onChange={handlePhoneChange}
              maxLength={14}
            />
          </div>

          {error && (
            <div style={styles.errorMessage}>{error}</div>
          )}

          <button
            style={{
              ...styles.submitButton,
              opacity: phone.replace(/\D/g, '').length >= 10 ? 1 : 0.5,
            }}
            onClick={handleSubmit}
            disabled={phone.replace(/\D/g, '').length < 10 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span style={styles.spinner} />
                Notifying Team...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
                Send & Notify Sales Team
              </>
            )}
          </button>
        </div>

        {/* Privacy Note */}
        <p style={styles.privacyNote}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Your information is private and only shared with our sales team
        </p>

        {/* Skip Option */}
        <button 
          style={styles.skipButton}
          onClick={() => navigateTo('welcome')}
        >
          Skip for now — I'll find someone myself
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

// ============================================
// STYLES
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    overflow: 'auto',
  },
  formContent: {
    width: '100%',
    maxWidth: '440px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  successContent: {
    width: '100%',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  headerIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    margin: '0 auto 16px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.6)',
    margin: 0,
  },
  vehicleSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    width: '100%',
    padding: '16px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  vehicleThumb: {
    width: '60px',
    height: '60px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInitial: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.3)',
  },
  vehicleInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  vehicleName: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#ffffff',
  },
  vehiclePrice: {
    fontSize: '14px',
    color: '#4ade80',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '24px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  optional: {
    fontWeight: '400',
    color: 'rgba(255,255,255,0.4)',
  },
  input: {
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '16px',
    transition: 'border-color 0.2s ease',
  },
  phoneInput: {
    padding: '20px 24px',
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: '2px',
  },
  errorMessage: {
    padding: '12px 16px',
    background: 'rgba(220, 38, 38, 0.2)',
    borderRadius: '8px',
    color: '#fca5a5',
    fontSize: '14px',
    textAlign: 'center',
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '18px 24px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '17px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  privacyNote: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '16px',
  },
  skipButton: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  // Success State Styles
  successIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'rgba(74, 222, 128, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4ade80',
    marginBottom: '24px',
    animation: 'checkmark 0.5s ease',
  },
  successTitle: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 8px 0',
  },
  successSubtitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.6)',
    margin: '0 0 24px 0',
  },
  waitTimeCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 40px',
    background: 'rgba(27, 115, 64, 0.2)',
    borderRadius: '16px',
    marginBottom: '24px',
  },
  waitTimeLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  waitTimeValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#4ade80',
  },
  summaryCard: {
    width: '100%',
    padding: '20px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  summaryTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    margin: '0 0 16px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  summaryItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  summaryIcon: {
    fontSize: '24px',
  },
  summaryDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  summaryLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#ffffff',
  },
  summaryMeta: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
  },
  expectCard: {
    width: '100%',
    padding: '20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    marginBottom: '16px',
    textAlign: 'left',
  },
  expectTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    margin: '0 0 16px 0',
  },
  expectSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  expectStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  stepNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'rgba(27, 115, 64, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    color: '#4ade80',
  },
  stepText: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
  },
  refNumber: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '16px',
  },
  successActions: {
    width: '100%',
    marginBottom: '16px',
  },
  browseButton: {
    width: '100%',
    padding: '14px 24px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  confirmationText: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
  },
};

export default CustomerHandoff;
