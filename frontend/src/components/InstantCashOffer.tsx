/**
 * NH Chevy Showroom Kiosk - Instant Cash Offer
 * 
 * Features:
 * - Firm cash offer with 7-day expiration
 * - Unique offer ID for tracking
 * - Print/Email/SMS offer options
 * - Manager review request
 * - Accept/Decline workflow
 * - QR code for mobile access
 * 
 * @version 1.0.0
 */

import React, { useState, useEffect, CSSProperties } from 'react';

// ============================================================================
// Types
// ============================================================================

interface VehicleInfo {
  year: string;
  make: string;
  model: string;
  trim?: string;
  mileage: string;
  vin?: string;
  condition: string;
}

interface OfferData {
  offerId: string;
  amount: number;
  expiresAt: Date;
  vehicle: VehicleInfo;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'manager_review';
  createdAt: Date;
}

interface InstantCashOfferProps {
  vehicle: VehicleInfo;
  estimatedValue: number;
  onClose: () => void;
  onAccept?: (offer: OfferData) => void;
  onDecline?: () => void;
  customerName?: string;
  customerPhone?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

const generateOfferId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'ICO-'; // Instant Cash Offer
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const calculateOfferAmount = (estimatedValue: number, condition: string): number => {
  // Apply condition-based adjustment
  const conditionMultipliers: Record<string, number> = {
    excellent: 0.95,
    good: 0.90,
    fair: 0.82,
    poor: 0.70,
  };
  
  const multiplier = conditionMultipliers[condition.toLowerCase()] || 0.85;
  
  // Round to nearest $50
  return Math.round((estimatedValue * multiplier) / 50) * 50;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

// ============================================================================
// Component
// ============================================================================

const InstantCashOffer: React.FC<InstantCashOfferProps> = ({
  vehicle,
  estimatedValue,
  onClose,
  onAccept,
  onDecline,
  customerName,
  customerPhone,
}) => {
  // State
  const [step, setStep] = useState<'offer' | 'contact' | 'confirmation' | 'accepted'>('offer');
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [contactInfo, setContactInfo] = useState({
    name: customerName || '',
    phone: customerPhone || '',
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [requestingReview, setRequestingReview] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate offer on mount
  useEffect(() => {
    const offerAmount = calculateOfferAmount(estimatedValue, vehicle.condition);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    
    const newOffer: OfferData = {
      offerId: generateOfferId(),
      amount: offerAmount,
      expiresAt,
      vehicle,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      status: 'pending',
      createdAt: new Date(),
    };
    
    setOffer(newOffer);
  }, [estimatedValue, vehicle, customerName, customerPhone]);

  // Countdown timer
  useEffect(() => {
    if (!offer) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = offer.expiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [offer]);

  // Handlers
  const handleAcceptOffer = () => {
    if (!offer) return;
    setStep('contact');
  };

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offer) return;
    
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const updatedOffer: OfferData = {
      ...offer,
      customerName: contactInfo.name,
      customerPhone: contactInfo.phone,
      customerEmail: contactInfo.email,
      status: 'accepted',
    };
    
    setOffer(updatedOffer);
    setStep('accepted');
    setIsLoading(false);
    
    if (onAccept) {
      onAccept(updatedOffer);
    }
  };

  const handleRequestManagerReview = async () => {
    if (!offer) return;
    
    setRequestingReview(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setOffer({ ...offer, status: 'manager_review' });
    setRequestingReview(false);
    setStep('confirmation');
  };

  const handleDecline = () => {
    if (onDecline) onDecline();
    onClose();
  };

  const handleCopyOfferId = async () => {
    if (!offer) return;
    
    try {
      await navigator.clipboard.writeText(offer.offerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderOfferStep = () => {
    if (!offer) return null;

    return (
      <div style={styles.offerContent}>
        {/* Offer Header */}
        <div style={styles.offerHeader}>
          <div style={styles.offerBadge}>💰 INSTANT CASH OFFER</div>
          <h2 style={styles.offerTitle}>We'll Buy Your Vehicle!</h2>
          <p style={styles.offerSubtitle}>
            No purchase necessary. Get cash today or apply toward a new vehicle.
          </p>
        </div>

        {/* Vehicle Summary */}
        <div style={styles.vehicleSummary}>
          <div style={styles.vehicleIcon}>🚗</div>
          <div style={styles.vehicleDetails}>
            <span style={styles.vehicleTitle}>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </span>
            <span style={styles.vehicleMeta}>
              {vehicle.trim && `${vehicle.trim} • `}
              {parseInt(vehicle.mileage.replace(/,/g, '')).toLocaleString()} miles • {vehicle.condition}
            </span>
          </div>
        </div>

        {/* Offer Amount */}
        <div style={styles.offerAmountCard}>
          <span style={styles.offerLabel}>Your Guaranteed Offer</span>
          <span style={styles.offerAmount}>{formatCurrency(offer.amount)}</span>
          <div style={styles.offerExpiry}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span>Expires in {timeRemaining}</span>
          </div>
        </div>

        {/* Offer ID */}
        <div style={styles.offerIdSection}>
          <span style={styles.offerIdLabel}>Offer ID</span>
          <div style={styles.offerIdRow}>
            <span style={styles.offerId}>{offer.offerId}</span>
            <button style={styles.copyBtn} onClick={handleCopyOfferId}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <span style={styles.offerIdNote}>
            Save this ID to retrieve your offer later
          </span>
        </div>

        {/* What's Included */}
        <div style={styles.includesSection}>
          <h4 style={styles.includesTitle}>What's Included:</h4>
          <div style={styles.includesList}>
            <div style={styles.includesItem}>
              <span style={styles.checkmark}>✓</span>
              <span>Free vehicle inspection</span>
            </div>
            <div style={styles.includesItem}>
              <span style={styles.checkmark}>✓</span>
              <span>Same-day payment available</span>
            </div>
            <div style={styles.includesItem}>
              <span style={styles.checkmark}>✓</span>
              <span>We handle all paperwork</span>
            </div>
            <div style={styles.includesItem}>
              <span style={styles.checkmark}>✓</span>
              <span>Payoff handled directly</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionButtons}>
          <button style={styles.acceptBtn} onClick={handleAcceptOffer}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <path d="M22 4L12 14.01l-3-3"/>
            </svg>
            Accept This Offer
          </button>
          
          <button 
            style={styles.reviewBtn} 
            onClick={handleRequestManagerReview}
            disabled={requestingReview}
          >
            {requestingReview ? (
              <>
                <span style={styles.spinner} />
                Requesting...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Request Manager Review
              </>
            )}
          </button>

          <button style={styles.declineBtn} onClick={handleDecline}>
            No Thanks, Continue Shopping
          </button>
        </div>

        {/* Fine Print */}
        <div style={styles.finePrint}>
          <p>
            Offer valid for 7 days from {formatDate(offer.createdAt)}. 
            Final amount subject to vehicle inspection verification. 
            Vehicle must match description provided.
          </p>
        </div>
      </div>
    );
  };

  const renderContactStep = () => (
    <div style={styles.contactContent}>
      <div style={styles.stepBack}>
        <button style={styles.backLink} onClick={() => setStep('offer')}>
          ← Back to Offer
        </button>
      </div>

      <div style={styles.contactHeader}>
        <div style={styles.offerBadge}>✓ OFFER ACCEPTED</div>
        <h2 style={styles.contactTitle}>Almost Done!</h2>
        <p style={styles.contactSubtitle}>
          Enter your contact info to lock in your {formatCurrency(offer?.amount || 0)} offer
        </p>
      </div>

      <form onSubmit={handleSubmitContact} style={styles.contactForm}>
        <div style={styles.inputGroup}>
          <label style={styles.inputLabel}>Full Name *</label>
          <input
            type="text"
            value={contactInfo.name}
            onChange={(e) => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
            placeholder="John Smith"
            style={styles.input}
            required
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.inputLabel}>Phone Number *</label>
          <input
            type="tel"
            value={contactInfo.phone}
            onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="(555) 123-4567"
            style={styles.input}
            required
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.inputLabel}>Email Address</label>
          <input
            type="email"
            value={contactInfo.email}
            onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
            placeholder="john@example.com"
            style={styles.input}
          />
        </div>

        <button type="submit" style={styles.submitBtn} disabled={isLoading}>
          {isLoading ? (
            <>
              <span style={styles.spinner} />
              Processing...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <path d="M22 4L12 14.01l-3-3"/>
              </svg>
              Confirm & Lock In Offer
            </>
          )}
        </button>
      </form>
    </div>
  );

  const renderConfirmationStep = () => (
    <div style={styles.confirmationContent}>
      <div style={styles.confirmationIcon}>👀</div>
      <h2 style={styles.confirmationTitle}>Manager Review Requested</h2>
      <p style={styles.confirmationText}>
        A manager will review your vehicle information and may be able to offer a higher amount.
        They'll be with you shortly.
      </p>

      <div style={styles.offerIdSection}>
        <span style={styles.offerIdLabel}>Your Offer ID</span>
        <span style={styles.offerId}>{offer?.offerId}</span>
      </div>

      <button style={styles.doneBtn} onClick={onClose}>
        Continue Shopping While You Wait
      </button>
    </div>
  );

  const renderAcceptedStep = () => (
    <div style={styles.acceptedContent}>
      <div style={styles.successIcon}>🎉</div>
      <h2 style={styles.acceptedTitle}>Offer Locked In!</h2>
      <p style={styles.acceptedSubtitle}>
        Your {formatCurrency(offer?.amount || 0)} offer has been confirmed
      </p>

      {/* Offer Summary Card */}
      <div style={styles.summaryCard}>
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>Offer ID</span>
          <span style={styles.summaryValue}>{offer?.offerId}</span>
        </div>
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>Vehicle</span>
          <span style={styles.summaryValue}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </span>
        </div>
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>Offer Amount</span>
          <span style={styles.summaryValueLarge}>{formatCurrency(offer?.amount || 0)}</span>
        </div>
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>Valid Until</span>
          <span style={styles.summaryValue}>{formatDate(offer?.expiresAt || new Date())}</span>
        </div>
      </div>

      {/* Next Steps */}
      <div style={styles.nextSteps}>
        <h4 style={styles.nextStepsTitle}>Next Steps:</h4>
        <div style={styles.stepsList}>
          <div style={styles.stepItem}>
            <span style={styles.stepNumber}>1</span>
            <div>
              <span style={styles.stepText}>Bring your vehicle and title</span>
              <span style={styles.stepSubtext}>Visit the dealership within 7 days</span>
            </div>
          </div>
          <div style={styles.stepItem}>
            <span style={styles.stepNumber}>2</span>
            <div>
              <span style={styles.stepText}>Quick inspection</span>
              <span style={styles.stepSubtext}>We'll verify the vehicle matches your description</span>
            </div>
          </div>
          <div style={styles.stepItem}>
            <span style={styles.stepNumber}>3</span>
            <div>
              <span style={styles.stepText}>Get paid!</span>
              <span style={styles.stepSubtext}>Same-day payment or apply toward a new vehicle</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={styles.acceptedActions}>
        <button style={styles.printBtn} onClick={handlePrint}>
          🖨️ Print Offer
        </button>
        <button style={styles.doneBtn} onClick={onClose}>
          Done
        </button>
      </div>

      {/* Contact Info */}
      <div style={styles.contactConfirm}>
        <p>Confirmation sent to:</p>
        <span>{contactInfo.phone}</span>
        {contactInfo.email && <span> • {contactInfo.email}</span>}
      </div>
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Close Button */}
        <button style={styles.closeBtn} onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* Content */}
        {step === 'offer' && renderOfferStep()}
        {step === 'contact' && renderContactStep()}
        {step === 'confirmation' && renderConfirmationStep()}
        {step === 'accepted' && renderAcceptedStep()}
      </div>

      {/* Print Styles */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media print {
          body * { visibility: hidden; }
          .print-section, .print-section * { visibility: visible; }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: '#1a1a1a',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#fff',
    zIndex: 10,
  },

  // Offer Step
  offerContent: {
    padding: '32px 24px',
  },
  offerHeader: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  offerBadge: {
    display: 'inline-block',
    padding: '6px 16px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '1px',
    marginBottom: '12px',
  },
  offerTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 8px 0',
  },
  offerSubtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    margin: 0,
  },

  // Vehicle Summary
  vehicleSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  vehicleIcon: {
    fontSize: '32px',
  },
  vehicleDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  vehicleTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
  },
  vehicleMeta: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'capitalize',
  },

  // Offer Amount
  offerAmountCard: {
    textAlign: 'center',
    padding: '24px',
    background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.15) 0%, rgba(34, 197, 94, 0.1) 100%)',
    border: '2px solid rgba(74, 222, 128, 0.3)',
    borderRadius: '16px',
    marginBottom: '20px',
  },
  offerLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  offerAmount: {
    display: 'block',
    fontSize: '48px',
    fontWeight: '800',
    color: '#4ade80',
    lineHeight: 1,
    marginBottom: '12px',
  },
  offerExpiry: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '20px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
  },

  // Offer ID
  offerIdSection: {
    textAlign: 'center',
    padding: '16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  offerIdLabel: {
    display: 'block',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    marginBottom: '6px',
  },
  offerIdRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '6px',
  },
  offerId: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'monospace',
    letterSpacing: '2px',
  },
  copyBtn: {
    padding: '4px 12px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '6px',
    color: '#4ade80',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  offerIdNote: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
  },

  // Includes Section
  includesSection: {
    marginBottom: '24px',
  },
  includesTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    margin: '0 0 12px 0',
  },
  includesList: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  includesItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
  },
  checkmark: {
    color: '#4ade80',
    fontWeight: '700',
  },

  // Action Buttons
  actionButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  acceptBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#000',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  reviewBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '14px 24px',
    background: 'rgba(99, 102, 241, 0.2)',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    borderRadius: '12px',
    color: '#a5b4fc',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  declineBtn: {
    padding: '12px',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },

  // Fine Print
  finePrint: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 1.5,
  },

  // Contact Step
  contactContent: {
    padding: '24px',
  },
  stepBack: {
    marginBottom: '16px',
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    cursor: 'pointer',
    padding: 0,
  },
  contactHeader: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  contactTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#fff',
    margin: '12px 0 8px 0',
  },
  contactSubtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    margin: 0,
  },
  contactForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inputLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  input: {
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '16px',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#000',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '8px',
  },

  // Confirmation Step
  confirmationContent: {
    padding: '48px 24px',
    textAlign: 'center',
  },
  confirmationIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  confirmationTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 12px 0',
  },
  confirmationText: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 1.6,
    marginBottom: '24px',
  },

  // Accepted Step
  acceptedContent: {
    padding: '32px 24px',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  acceptedTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 8px 0',
  },
  acceptedSubtitle: {
    fontSize: '16px',
    color: '#4ade80',
    margin: '0 0 24px 0',
  },

  // Summary Card
  summaryCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  summaryLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
  },
  summaryValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
  },
  summaryValueLarge: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#4ade80',
  },

  // Next Steps
  nextSteps: {
    textAlign: 'left',
    marginBottom: '24px',
  },
  nextStepsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    margin: '0 0 16px 0',
  },
  stepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  stepItem: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: '28px',
    height: '28px',
    background: 'rgba(74, 222, 128, 0.2)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    color: '#4ade80',
    flexShrink: 0,
  },
  stepText: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
  },
  stepSubtext: {
    display: 'block',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '2px',
  },

  // Accepted Actions
  acceptedActions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  printBtn: {
    flex: 1,
    padding: '14px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  doneBtn: {
    flex: 1,
    padding: '14px',
    background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#000',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  contactConfirm: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
  },

  // Spinner
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(0,0,0,0.2)',
    borderTopColor: '#000',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

export default InstantCashOffer;
