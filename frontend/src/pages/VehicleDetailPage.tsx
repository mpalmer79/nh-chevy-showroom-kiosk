import React from 'react';
import type { Vehicle } from '../types';

// Professional gradient backgrounds based on vehicle type
const getVehicleGradient = (bodyStyle: string | undefined, model: string | undefined): string => {
  const modelLower = (model || '').toLowerCase();

  if (modelLower.includes('corvette')) {
    return 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)';
  }
  if (modelLower.includes('silverado') || modelLower.includes('colorado')) {
    return 'linear-gradient(135deg, #2c3e50 0%, #1a252f 100%)';
  }
  if (modelLower.includes('tahoe') || modelLower.includes('suburban')) {
    return 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)';
  }
  if (modelLower.includes('equinox') || modelLower.includes('traverse') || modelLower.includes('blazer')) {
    return 'linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%)';
  }
  if (modelLower.includes('bolt') || modelLower.includes('ev')) {
    return 'linear-gradient(135deg, #00b894 0%, #00806a 100%)';
  }
  if (modelLower.includes('trax') || modelLower.includes('trailblazer')) {
    return 'linear-gradient(135deg, #6c5ce7 0%, #4834d4 100%)';
  }
  if (modelLower.includes('express') || modelLower.includes('van')) {
    return 'linear-gradient(135deg, #636e72 0%, #2d3436 100%)';
  }

  return 'linear-gradient(135deg, #2c3e50 0%, #1a252f 100%)';
};

const getVehicleIcon = (bodyStyle: string | undefined): React.ReactElement => {
  const style = (bodyStyle || '').toLowerCase();

  if (style.includes('truck')) {
    return (
      <svg viewBox="0 0 64 32" fill="white" opacity="0.25" style={{ width: '160px', height: '80px' }}>
        <path d="M58,24H52V20a2,2,0,0,0-2-2H42L38,10H16a2,2,0,0,0-2,2v8H6a2,2,0,0,0-2,2v4a2,2,0,0,0,2,2h4a6,6,0,0,0,12,0H42a6,6,0,0,0,12,0h4a2,2,0,0,0,2-2V26A2,2,0,0,0,58,24ZM16,28a4,4,0,1,1,4-4A4,4,0,0,1,16,28Zm32,0a4,4,0,1,1,4-4A4,4,0,0,1,48,28Z"/>
      </svg>
    );
  }
  if (style.includes('suv') || style.includes('crossover')) {
    return (
      <svg viewBox="0 0 64 32" fill="white" opacity="0.25" style={{ width: '160px', height: '80px' }}>
        <path d="M56,20H54L48,10H16L10,20H8a4,4,0,0,0-4,4v4a2,2,0,0,0,2,2h4a6,6,0,0,0,12,0H42a6,6,0,0,0,12,0h4a2,2,0,0,0,2-2V24A4,4,0,0,0,56,20ZM16,28a4,4,0,1,1,4-4A4,4,0,0,1,16,28Zm32,0a4,4,0,1,1,4-4A4,4,0,0,1,48,28Z"/>
      </svg>
    );
  }
  if (style.includes('van')) {
    return (
      <svg viewBox="0 0 64 32" fill="white" opacity="0.25" style={{ width: '160px', height: '80px' }}>
        <path d="M56,12H48V8a4,4,0,0,0-4-4H8A4,4,0,0,0,4,8V24a2,2,0,0,0,2,2h4a6,6,0,0,0,12,0H42a6,6,0,0,0,12,0h4a2,2,0,0,0,2-2V16A4,4,0,0,0,56,12ZM16,28a4,4,0,1,1,4-4A4,4,0,0,1,16,28Zm32,0a4,4,0,1,1,4-4A4,4,0,0,1,48,28Z"/>
      </svg>
    );
  }
  if (style.includes('coupe') || style.includes('convertible')) {
    return (
      <svg viewBox="0 0 64 32" fill="white" opacity="0.25" style={{ width: '160px', height: '80px' }}>
        <path d="M58,22H54L44,14H20L10,22H6a2,2,0,0,0-2,2v2a2,2,0,0,0,2,2h4a6,6,0,0,0,12,0H42a6,6,0,0,0,12,0h4a2,2,0,0,0,2-2V24A2,2,0,0,0,58,22ZM16,28a4,4,0,1,1,4-4A4,4,0,0,1,16,28Zm32,0a4,4,0,1,1,4-4A4,4,0,0,1,48,28Z"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 32" fill="white" opacity="0.25" style={{ width: '160px', height: '80px' }}>
      <path d="M56,20H52L44,12H20L12,20H8a4,4,0,0,0-4,4v2a2,2,0,0,0,2,2h4a6,6,0,0,0,12,0H42a6,6,0,0,0,12,0h4a2,2,0,0,0,2-2V24A4,4,0,0,0,56,20ZM16,28a4,4,0,1,1,4-4A4,4,0,0,1,16,28Zm32,0a4,4,0,1,1,4-4A4,4,0,0,1,48,28Z"/>
    </svg>
  );
};

interface VehicleDetailPageProps {
  vehicle: Vehicle | null;
  onBack: () => void;
  onScheduleTestDrive?: (vehicle: Vehicle) => void;
  onContactDealer?: (vehicle: Vehicle) => void;
}

const VehicleDetailPage: React.FC<VehicleDetailPageProps> = ({ vehicle, onBack, onScheduleTestDrive, onContactDealer }) => {
  const formatPrice = (price: number | undefined): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  if (!vehicle) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' as const }}>
        <p>Vehicle not found</p>
        <button onClick={onBack} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Back to Inventory
        </button>
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const backButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: '#f5f5f5',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '20px',
    transition: 'background 0.2s',
  };

  const mainContentStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    alignItems: 'start',
  };

  const imageContainerStyle: React.CSSProperties = {
    width: '100%',
    height: '400px',
    borderRadius: '16px',
    overflow: 'hidden',
    background: getVehicleGradient(vehicle.bodyStyle, vehicle.model),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  };

  const chevyLogoStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    width: '60px',
    height: '60px',
    opacity: 0.5,
  };

  const modelTextStyle: React.CSSProperties = {
    color: 'white',
    fontSize: '42px',
    fontWeight: '700',
    textAlign: 'center',
    textShadow: '0 4px 8px rgba(0,0,0,0.3)',
    marginTop: '16px',
  };

  const yearTrimStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.85)',
    fontSize: '20px',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: '8px',
  };

  const detailsPanelStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '8px',
  };

  const priceRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  };

  const priceStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: '700',
    color: '#cc0000',
  };

  const msrpStyle: React.CSSProperties = {
    fontSize: '16px',
    color: '#888',
    textDecoration: 'line-through',
  };

  const statusBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    background: vehicle.status === 'In Stock' ? '#e8f5e9' : '#fff3e0',
    color: vehicle.status === 'In Stock' ? '#2e7d32' : '#e65100',
  };

  const specsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  };

  const specItemStyle: React.CSSProperties = {
    background: '#f8f9fa',
    padding: '12px 16px',
    borderRadius: '8px',
  };

  const specLabelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  };

  const specValueStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1a1a1a',
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  };

  const primaryButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '14px 24px',
    background: '#cc0000',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '14px 24px',
    background: '#f5f5f5',
    color: '#333',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  };

  const featuresStyle: React.CSSProperties = {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #eee',
  };

  const featureTagStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '6px 12px',
    background: '#e3f2fd',
    color: '#1565c0',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
    margin: '4px',
  };

  return (
    <div style={containerStyle}>
      <button
        style={backButtonStyle}
        onClick={onBack}
        onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { (e.target as HTMLButtonElement).style.background = '#e8e8e8'; }}
        onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { (e.target as HTMLButtonElement).style.background = '#f5f5f5'; }}
      >
        ← Back to Inventory
      </button>

      <div style={mainContentStyle}>
        {/* Image Section */}
        <div style={imageContainerStyle}>
          <svg style={chevyLogoStyle} viewBox="0 0 100 36" fill="white">
            <path d="M0,14.4L16.5,0h67L100,14.4v7.2L83.5,36h-67L0,21.6V14.4z M21.2,5.8L8.2,16.9l13,11.1h57.6l13-11.1L78.8,5.8H21.2z"/>
          </svg>
          {getVehicleIcon(vehicle.bodyStyle)}
          <div style={modelTextStyle}>{vehicle.model}</div>
          <div style={yearTrimStyle}>{vehicle.year} {vehicle.trim}</div>
        </div>

        {/* Details Panel */}
        <div style={detailsPanelStyle}>
          <h1 style={titleStyle}>
            {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
          </h1>

          <div style={priceRowStyle}>
            <span style={priceStyle}>{formatPrice(vehicle.price)}</span>
            {(vehicle.msrp || 0) > (vehicle.price || 0) && (
              <span style={msrpStyle}>MSRP {formatPrice(vehicle.msrp)}</span>
            )}
            <span style={statusBadgeStyle}>{vehicle.status}</span>
          </div>

          <div style={specsGridStyle}>
            <div style={specItemStyle}>
              <div style={specLabelStyle}>Exterior Color</div>
              <div style={specValueStyle}>{vehicle.exteriorColor}</div>
            </div>
            <div style={specItemStyle}>
              <div style={specLabelStyle}>Interior Color</div>
              <div style={specValueStyle}>{vehicle.interiorColor}</div>
            </div>
            <div style={specItemStyle}>
              <div style={specLabelStyle}>Engine</div>
              <div style={specValueStyle}>{vehicle.engine}</div>
            </div>
            <div style={specItemStyle}>
              <div style={specLabelStyle}>Transmission</div>
              <div style={specValueStyle}>{vehicle.transmission}</div>
            </div>
            <div style={specItemStyle}>
              <div style={specLabelStyle}>Drivetrain</div>
              <div style={specValueStyle}>{vehicle.drivetrain}</div>
            </div>
            <div style={specItemStyle}>
              <div style={specLabelStyle}>Fuel Economy</div>
              <div style={specValueStyle}>
                {vehicle.fuelType === 'Electric'
                  ? `${vehicle.evRange} mi range`
                  : `${vehicle.mpgCity} city / ${vehicle.mpgHighway} hwy`}
              </div>
            </div>
            <div style={specItemStyle}>
              <div style={specLabelStyle}>Stock Number</div>
              <div style={specValueStyle}>{vehicle.stockNumber}</div>
            </div>
            <div style={specItemStyle}>
              <div style={specLabelStyle}>VIN</div>
              <div style={{ ...specValueStyle, fontSize: '12px' }}>{vehicle.vin}</div>
            </div>
          </div>

          <div style={buttonContainerStyle}>
            <button
              style={primaryButtonStyle}
              onClick={() => onScheduleTestDrive && onScheduleTestDrive(vehicle)}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { (e.target as HTMLButtonElement).style.background = '#aa0000'; }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { (e.target as HTMLButtonElement).style.background = '#cc0000'; }}
            >
              Schedule Test Drive
            </button>
            <button
              style={secondaryButtonStyle}
              onClick={() => onContactDealer && onContactDealer(vehicle)}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { (e.target as HTMLButtonElement).style.background = '#e8e8e8'; }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { (e.target as HTMLButtonElement).style.background = '#f5f5f5'; }}
            >
              Contact Dealer
            </button>
          </div>

          {vehicle.features && vehicle.features.length > 0 && (
            <div style={featuresStyle}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '12px' }}>
                KEY FEATURES
              </div>
              <div>
                {vehicle.features.map((feature: string, index: number) => (
                  <span key={index} style={featureTagStyle}>{feature}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailPage;
