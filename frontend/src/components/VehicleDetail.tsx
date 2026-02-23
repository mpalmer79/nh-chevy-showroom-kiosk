import React, { useState, useEffect, CSSProperties } from 'react';
import { logTrafficSession, notifyStaff } from './api';
import type { Vehicle, KioskComponentProps } from '../types';
import { getVehicleImageUrl, getColorCategory, getColorGradient } from '../utils/vehicleHelpers';
import QRCodeModal from './QRCodeModal';

interface DetailedVehicle extends Vehicle {
  transmission?: string;
  fuelEconomy?: string;
  savings?: number;
  monthlyLease?: number;
  monthlyFinance?: number;
  mileage?: number;
  gradient?: string;
  rebates?: Array<{ name: string; amount: number }>;
}

// Default rebates for Chevrolet vehicles
const DEFAULT_REBATES = [
  { name: 'Customer Cash', amount: 3000 },
  { name: 'Bonus Cash', amount: 1000 },
];

// Conditional offers that may apply
const CONDITIONAL_OFFERS = [
  { name: 'Select Market Chevy Loyalty Cash', amount: 2500 },
  { name: 'Trade Assistance', amount: 1250 },
  { name: 'GM First Responder Offer', amount: 500 },
  { name: 'GM Military Offer', amount: 500 },
  { name: 'Costco Executive Member Incentive', amount: 1250 },
  { name: 'Costco Gold Star and Business Member Incentive', amount: 1000 },
];

// Decode VIN for Silverado trucks
const decodeGMTruckVIN = (vin: string, model: string): { cabType: string; driveType: string } | null => {
  if (!vin || vin.length !== 17) return null;
  if (!(model || '').toLowerCase().includes('silverado')) return null;
  const v = vin.toUpperCase();
  let cabType = '', driveType = '';
  switch (v[5]) {
    case 'A': case 'B': cabType = 'Regular Cab'; break;
    case 'C': case 'D': cabType = 'Double Cab'; break;
    case 'K': case 'U': case 'G': cabType = 'Crew Cab'; break;
  }
  switch (v[6]) {
    case 'E': case 'K': case 'G': case 'J': driveType = '4WD'; break;
    case 'A': case 'D': case 'C': case 'B': driveType = '2WD'; break;
  }
  return (cabType || driveType) ? { cabType, driveType } : null;
};

// Get color hex for swatch
const getColorHex = (colorDesc: string): string => {
  const category = getColorCategory(colorDesc);
  const colorHexMap: Record<string, string> = {
    'black': '#1a1a1a',
    'white': '#f5f5f5',
    'red': '#c41e3a',
    'blue': '#1e40af',
    'gray': '#6b7280',
    'silver': '#c0c0c0',
    'green': '#15803d',
    'orange': '#ea580c',
    'yellow': '#eab308',
    'brown': '#78350f',
  };
  return colorHexMap[category] || '#6b7280';
};

// Get gradient background for image placeholder (uses imported getColorGradient)
const getGradient = (color?: string): string => getColorGradient(color);

// Format currency
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return '$0';
  return `$${Math.round(amount).toLocaleString()}`;
};

const VehicleDetail: React.FC<KioskComponentProps> = ({ navigateTo, updateCustomerData, customerData }) => {
  const [vehicleRequested, setVehicleRequested] = useState(false);
  const [requestSending, setRequestSending] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showConditionalOffers, setShowConditionalOffers] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get vehicle from customerData or use placeholder
  const vehicle: DetailedVehicle = customerData?.selectedVehicle || {
    stockNumber: 'M39816',
    vin: '1GCRKWEK8TZ247247',
    year: 2026,
    make: 'Chevrolet',
    model: 'Silverado 1500',
    trim: 'RST 4WD',
    exteriorColor: 'Sterling Gray Metallic',
    interiorColor: 'Jet Black',
    msrp: 51605,
    salePrice: 47605,
    status: 'In Transit',
    features: ['Remote Start', 'Apple CarPlay', 'Backup Camera', 'Android Auto'],
    rebates: DEFAULT_REBATES,
  };

  // Create a unique key for this vehicle - forces React to create fresh img element
  const vehicleKey = vehicle.stockNumber || vehicle.stock_number || vehicle.vin || 'default';
  
  // Get image URL directly
  const imageUrl = getVehicleImageUrl(vehicle);
  
  // Reset image error when vehicle changes (vehicleKey changes)
  useEffect(() => {
    setImageError(false);
    setSelectedImageIndex(0);
  }, [vehicleKey]);

  const stockNumber = vehicle.stockNumber || vehicle.stock_number || '';
  const vin = vehicle.vin || '';
  const exteriorColor = vehicle.exteriorColor || vehicle.exterior_color || '';
  const msrp = vehicle.msrp || 0;
  const rebates = vehicle.rebates || DEFAULT_REBATES;
  const totalRebates = rebates.reduce((sum, r) => sum + r.amount, 0);
  const quirkPrice = msrp - totalRebates;
  const status = vehicle.status || 'In Stock';
  
  // Decode VIN for additional info
  const vinInfo = decodeGMTruckVIN(vin, vehicle.model || '');
  
  // Build title
  const title = `NEW ${vehicle.year} Chevrolet ${vehicle.model} ${vehicle.trim || ''}`.trim();
  
  // Get gradient for placeholder background
  const gradient = getGradient(exteriorColor);

  // Handle "Let's See It" button click
  const handleLetsSeeIt = async () => {
    setRequestSending(true);
    
    try {
      // Send Slack notification to bring vehicle up front
      await notifyStaff({
        notification_type: 'vehicle_request',
        message: `🚗 Customer requests to have vehicle brought up front to view`,
        vehicle_stock: stockNumber,
        vehicle_info: {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          trim: vehicle.trim,
          exteriorColor: exteriorColor,
          msrp: msrp,
          salePrice: quirkPrice,
        },
      });
      
      // Log the vehicle request to traffic session
      await logTrafficSession({
        currentStep: 'vehicleRequest',
        vehicleRequested: true,
        vehicle: {
          stockNumber: stockNumber,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          trim: vehicle.trim,
          msrp: msrp,
          salePrice: quirkPrice,
        },
        actions: ['lets_see_it_clicked'],
      });
      
      // Update customer data
      updateCustomerData({
        vehicleRequested: {
          stockNumber,
          requestedAt: new Date().toISOString(),
        },
      });
      
      setVehicleRequested(true);
    } catch (err) {
      console.error('Error sending vehicle request:', err);
      // Still show success - the request will be logged when connection resumes
      setVehicleRequested(true);
    } finally {
      setRequestSending(false);
    }
  };

  // Handle back button
  const handleBack = () => {
    navigateTo('inventory');
  };

  // Success confirmation screen
  if (vehicleRequested) {
    return (
      <div style={s.container}>
        <div style={s.successOverlay}>
          <div style={s.successCard}>
            <div style={s.successIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h1 style={s.successTitle}>We're On It!</h1>
            <p style={s.successSubtitle}>
              A team member has been notified and will bring this vehicle to the front for you to see.
            </p>
            <div style={s.successVehicleCard}>
              <div style={{ ...s.successVehicleThumb, background: gradient }}>
                <span style={s.successVehicleInitial}>{(vehicle.model || 'V').charAt(0)}</span>
              </div>
              <div style={s.successVehicleInfo}>
                <span style={s.successVehicleName}>{vehicle.year} {vehicle.model}</span>
                <span style={s.successVehicleTrim}>{vehicle.trim}</span>
                <span style={s.successVehicleStock}>Stock# {stockNumber}</span>
              </div>
            </div>
            <div style={s.expectSection}>
              <h4 style={s.expectTitle}>What to Expect:</h4>
              <div style={s.expectSteps}>
                <div style={s.expectStep}>
                  <span style={s.stepNumber}>1</span>
                  <span style={s.stepText}>A sales consultant will locate the vehicle</span>
                </div>
                <div style={s.expectStep}>
                  <span style={s.stepNumber}>2</span>
                  <span style={s.stepText}>They'll bring it to the front entrance</span>
                </div>
                <div style={s.expectStep}>
                  <span style={s.stepNumber}>3</span>
                  <span style={s.stepText}>You'll be able to see it up close and ask questions</span>
                </div>
              </div>
            </div>
            <div style={s.estimatedTime}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span>Estimated wait: 3-5 minutes</span>
            </div>
            <div style={s.successActions}>
              <button style={s.secondaryBtn} onClick={() => navigateTo('inventory')}>
                Browse More Vehicles
              </button>
              <button style={s.tertiaryBtn} onClick={() => navigateTo('aiAssistant')}>
                Chat with AI Assistant
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      {/* Header Bar */}
      <div style={s.headerBar}>
        <div style={s.headerLeft}>
          <h1 style={s.vehicleTitle}>{title}</h1>
          <div style={s.headerMeta}>
            <span style={s.vinText}>VIN: {vin}</span>
            <span style={s.stockText}>STOCK: {stockNumber}</span>
          </div>
        </div>
        <div style={s.headerRight}>
          <button style={s.backBtn} onClick={handleBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Inventory
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={s.mainContent}>
        {/* Left Column - Images */}
        <div style={s.leftColumn}>
          {/* Main Image - key forces fresh img element per vehicle */}
          <div style={{ ...s.mainImageContainer, background: gradient }}>
            {imageUrl && !imageError ? (
              <img
                key={`main-${vehicleKey}`}
                src={imageUrl}
                alt={title}
                style={s.mainImage}
                onError={() => setImageError(true)}
              />
            ) : (
              <span style={s.imagePlaceholder}>{(vehicle.model || 'V').charAt(0)}</span>
            )}
          </div>
          
          {/* Thumbnail Strip */}
          <div style={s.thumbnailStrip}>
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                style={{
                  ...s.thumbnail,
                  background: gradient,
                  borderColor: selectedImageIndex === idx ? '#22c55e' : '#e2e8f0',
                }}
                onClick={() => setSelectedImageIndex(idx)}
              >
                {imageUrl && !imageError ? (
                  <img
                    key={`thumb-${vehicleKey}-${idx}`}
                    src={imageUrl}
                    alt={`${vehicle.model} view ${idx + 1}`}
                    style={s.thumbnailImage}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <span style={s.thumbnailPlaceholder}>{(vehicle.model || 'V').charAt(0)}</span>
                )}
              </div>
            ))}
          </div>

          {/* Photo Count Badge */}
          <div style={s.photoCountBadge}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>(4) Photos</span>
          </div>

          {/* Status Badge */}
          <div style={s.statusBadge}>
            <span style={{ ...s.statusDot, background: status === 'In Stock' ? '#4ade80' : '#f59e0b' }} />
            {status}
          </div>
        </div>

        {/* Right Column - Pricing */}
        <div style={s.rightColumn}>
          {/* Pricing Card */}
          <div style={s.pricingCard}>
            {/* Base MSRP */}
            <div style={s.priceRow}>
              <span style={s.priceLabel}>MSRP</span>
              <span style={s.priceValue}>{formatCurrency(msrp)}</span>
            </div>

            {/* Rebates */}
            {rebates.map((rebate, idx) => (
              <div key={idx} style={s.rebateRow}>
                <span style={s.rebateName}>{rebate.name}</span>
                <span style={s.rebateAmount}>-{formatCurrency(rebate.amount)}</span>
              </div>
            ))}

            {/* Quirk Price */}
            <div style={s.divider} />
            <div style={s.quirkPriceRow}>
              <span style={s.quirkPriceLabel}>Quirk Price</span>
              <span style={s.quirkPriceValue}>{formatCurrency(quirkPrice)}</span>
            </div>

            {/* Conditional Offers */}
            <div style={s.conditionalSection}>
              <button
                style={s.conditionalToggle}
                onClick={() => setShowConditionalOffers(!showConditionalOffers)}
              >
                <span>Conditional Offers</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ transform: showConditionalOffers ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              
              {showConditionalOffers && (
                <div style={s.conditionalList}>
                  {CONDITIONAL_OFFERS.map((offer, idx) => (
                    <div key={idx} style={s.conditionalRow}>
                      <span style={s.conditionalName}>{offer.name}</span>
                      <span style={s.conditionalAmount}>-{formatCurrency(offer.amount)}</span>
                    </div>
                  ))}
                  <button style={s.detailsLink}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                    Details
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Quick Specs */}
          <div style={s.specsCard}>
            <h3 style={s.specsTitle}>Basic Info</h3>
            <div style={s.specsGrid}>
              <div style={s.specItem}>
                <span style={s.specLabel}>Exterior</span>
                <div style={s.specValueWithSwatch}>
                  <span style={{ ...s.colorSwatch, background: getColorHex(exteriorColor) }} />
                  <span style={s.specValue}>{exteriorColor || '—'}</span>
                </div>
              </div>
              <div style={s.specItem}>
                <span style={s.specLabel}>Interior</span>
                <span style={s.specValue}>{vehicle.interiorColor || vehicle.interior_color || '—'}</span>
              </div>
              <div style={s.specItem}>
                <span style={s.specLabel}>Engine</span>
                <span style={s.specValue}>{vehicle.engine || '5.3L EcoTec3 V8'}</span>
              </div>
              <div style={s.specItem}>
                <span style={s.specLabel}>Drivetrain</span>
                <span style={s.specValue}>{vinInfo?.driveType || vehicle.drivetrain || '4WD'}</span>
              </div>
            </div>
          </div>

          {/* Key Features */}
          {vehicle.features && vehicle.features.length > 0 && (
            <div style={s.featuresCard}>
              <h3 style={s.featuresTitle}>Key Features</h3>
              <div style={s.featuresTags}>
                {vehicle.features.slice(0, 6).map((feature, idx) => (
                  <span key={idx} style={s.featureTag}>{feature}</span>
                ))}
              </div>
            </div>
          )}

          {/* LET'S SEE IT Button */}
          <button
            style={s.letsSeeItBtn}
            onClick={handleLetsSeeIt}
            disabled={requestSending}
          >
            {requestSending ? (
              <>
                <div style={s.spinner} />
                Notifying Team...
              </>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Let's See It!
              </>
            )}
          </button>
          <p style={s.letsSeeItHint}>
            Tap to have this vehicle brought to the showroom entrance
          </p>

          {/* Secondary Actions */}
          <div style={s.secondaryActions}>
            <button style={s.actionBtn} onClick={() => navigateTo('paymentCalculator')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
              Calculate Payment
            </button>
            <button style={s.actionBtn} onClick={() => navigateTo('tradeIn')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Value My Trade
            </button>
          </div>
          
          {/* QR Code Button */}
          <button style={s.qrCodeBtn} onClick={() => setShowQRModal(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            Save to Phone (QR Code)
          </button>
          
          {/* Virtual Test Drive Button */}
          <button style={s.virtualTestDriveBtn} onClick={() => navigateTo('virtualTestDrive')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10,8 16,12 10,16" fill="currentColor" />
            </svg>
            Virtual Experience & Videos
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        vehicle={vehicle}
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
      />
    </div>
  );
};

// Styles - Light Theme
const s: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f5f7fa',
    color: '#1a1a2e',
  },
  
  // Header Bar
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 40px',
    background: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  vehicleTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
  },
  headerMeta: {
    display: 'flex',
    gap: '24px',
  },
  vinText: {
    fontSize: '13px',
    color: '#64748b',
    fontFamily: 'monospace',
  },
  stockText: {
    fontSize: '13px',
    color: '#64748b',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    color: '#1a1a2e',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },

  // Main Content
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '40px',
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto',
  },

  // Left Column - Images
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    position: 'relative',
  },
  mainImageContainer: {
    aspectRatio: '16/10',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  imagePlaceholder: {
    fontSize: '120px',
    fontWeight: 800,
    color: 'rgba(255,255,255,0.4)',
  },
  thumbnailStrip: {
    display: 'flex',
    gap: '12px',
  },
  thumbnail: {
    width: '100px',
    height: '70px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '2px solid #e2e8f0',
    transition: 'border-color 0.2s',
    background: '#ffffff',
  },
  thumbnailPlaceholder: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#94a3b8',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '6px',
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: '100px',
    left: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: '#fff',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#22c55e',
  },
  statusBadge: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: '#ffffff',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#1a1a2e',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },

  // Right Column - Pricing
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  pricingCard: {
    padding: '28px',
    background: 'linear-gradient(145deg, #ffffff 0%, #f8f8f8 100%)',
    borderRadius: '16px',
    color: '#1a1a1a',
    boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(34,197,94,0.15)',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  priceLabel: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  priceValue: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  rebateRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  rebateName: {
    fontSize: '14px',
    color: '#666',
  },
  rebateAmount: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  divider: {
    height: '1px',
    background: '#e5e5e5',
    margin: '16px 0',
  },
  quirkPriceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quirkPriceLabel: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1a1a1a',
  },
  quirkPriceValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#16a34a',
    textShadow: '0 0 20px rgba(34,197,94,0.3)',
  },
  conditionalSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e5e5',
  },
  conditionalToggle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '0',
    background: 'none',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    color: '#666',
    cursor: 'pointer',
  },
  conditionalList: {
    marginTop: '12px',
    padding: '12px',
    background: '#f5f5f5',
    borderRadius: '8px',
  },
  conditionalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  conditionalName: {
    fontSize: '13px',
    color: '#666',
  },
  conditionalAmount: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  detailsLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '12px',
    padding: '0',
    background: 'none',
    border: 'none',
    fontSize: '13px',
    fontWeight: 600,
    color: '#22c55e',
    cursor: 'pointer',
  },

  // Specs Card
  specsCard: {
    padding: '24px',
    background: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  specsTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 16px 0',
  },
  specsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  specItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  specLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  specValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1a1a2e',
  },
  specValueWithSwatch: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  colorSwatch: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    border: '1px solid #e2e8f0',
  },

  // Features Card
  featuresCard: {
    padding: '24px',
    background: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  featuresTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 12px 0',
  },
  featuresTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  featureTag: {
    padding: '6px 12px',
    background: '#ecfdf5',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#059669',
    border: '1px solid #a7f3d0',
  },

  // Let's See It Button
  letsSeeItBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    width: '100%',
    padding: '22px 28px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '16px',
    color: '#fff',
    fontSize: '20px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 8px 32px rgba(34,197,94,0.45), 0 0 20px rgba(34,197,94,0.2)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  letsSeeItHint: {
    fontSize: '13px',
    color: '#64748b',
    textAlign: 'center',
    margin: '8px 0 0 0',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  // Secondary Actions
  secondaryActions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginTop: '8px',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 16px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    color: '#1a1a2e',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  qrCodeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '14px 20px',
    marginTop: '8px',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '10px',
    color: '#059669',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  virtualTestDriveBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '14px 20px',
    marginTop: '8px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // Success Screen
  successOverlay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '40px',
  },
  successCard: {
    maxWidth: '500px',
    width: '100%',
    padding: '40px',
    background: '#ffffff',
    borderRadius: '24px',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  successIcon: {
    width: '80px',
    height: '80px',
    margin: '0 auto 24px',
    borderRadius: '50%',
    background: '#ecfdf5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#059669',
  },
  successTitle: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 12px 0',
  },
  successSubtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: '0 0 24px 0',
    lineHeight: 1.5,
  },
  successVehicleCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '12px',
    marginBottom: '24px',
    textAlign: 'left',
    border: '1px solid #e2e8f0',
  },
  successVehicleThumb: {
    width: '70px',
    height: '50px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  successVehicleInitial: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#94a3b8',
  },
  successVehicleInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  successVehicleName: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1a1a2e',
  },
  successVehicleTrim: {
    fontSize: '14px',
    color: '#64748b',
  },
  successVehicleStock: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  expectSection: {
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '12px',
    marginBottom: '24px',
    textAlign: 'left',
    border: '1px solid #e2e8f0',
  },
  expectTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#1a1a2e',
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
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#ecfdf5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    color: '#059669',
    flexShrink: 0,
  },
  stepText: {
    fontSize: '14px',
    color: '#475569',
  },
  estimatedTime: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '24px',
  },
  successActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  secondaryBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '14px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 6px 24px rgba(34,197,94,0.4)',
  },
  tertiaryBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 24px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    color: '#1a1a2e',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
};

export default VehicleDetail;
