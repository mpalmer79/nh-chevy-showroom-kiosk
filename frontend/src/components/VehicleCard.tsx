import React, { CSSProperties, MouseEvent, useState } from 'react';
import type { Vehicle } from '../types';
import { getVehicleImageUrl } from '../utils/vehicleHelpers';

// Component Props
interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: (vehicle: Vehicle) => void;
}

// Professional gradient backgrounds based on vehicle type
const getVehicleGradient = (_bodyStyle?: string, model?: string): string => {
  const modelLower = (model || '').toLowerCase();
  
  if (modelLower.includes('corvette')) {
    return 'linear-gradient(135deg, #c41e3a 0%, #8b0000 100%)'; // Racing red
  }
  if (modelLower.includes('silverado') || modelLower.includes('colorado')) {
    return 'linear-gradient(135deg, #2c3e50 0%, #1a252f 100%)'; // Truck steel
  }
  if (modelLower.includes('tahoe') || modelLower.includes('suburban')) {
    return 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)'; // SUV charcoal
  }
  if (modelLower.includes('equinox') || modelLower.includes('traverse') || modelLower.includes('blazer')) {
    return 'linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%)'; // Crossover blue
  }
  if (modelLower.includes('bolt') || modelLower.includes('ev')) {
    return 'linear-gradient(135deg, #00b894 0%, #00806a 100%)'; // EV green
  }
  if (modelLower.includes('trax') || modelLower.includes('trailblazer')) {
    return 'linear-gradient(135deg, #6c5ce7 0%, #4834d4 100%)'; // Compact purple
  }
  if (modelLower.includes('express') || modelLower.includes('van')) {
    return 'linear-gradient(135deg, #636e72 0%, #2d3436 100%)'; // Commercial gray
  }
  
  // Default gradient
  return 'linear-gradient(135deg, #2c3e50 0%, #1a252f 100%)';
};

// Get vehicle type icon (SVG as data URI)
const getVehicleIcon = (bodyStyle?: string): JSX.Element => {
  const style = (bodyStyle || '').toLowerCase();
  
  if (style.includes('truck')) {
    return (
      <svg viewBox="0 0 64 32" fill="white" opacity="0.3" style={{ width: '80px', height: '40px' }}>
        <path d="M58,24H52V20a2,2,0,0,0-2-2H42L38,10H16a2,2,0,0,0-2,2v8H6a2,2,0,0,0-2,2v4a2,2,0,0,0,2,2h4a6,6,0,0,0,12,0H42a6,6,0,0,0,12,0h4a2,2,0,0,0,2-2V26A2,2,0,0,0,58,24ZM16,28a4,4,0,1,1,4-4A4,4,0,0,1,16,28Zm32,0a4,4,0,1,1,4-4A4,4,0,0,1,48,28Z"/>
      </svg>
    );
  }
  if (style.includes('suv') || style.includes('crossover')) {
    return (
      <svg viewBox="0 0 64 32" fill="white" opacity="0.3" style={{ width: '80px', height: '40px' }}>
        <path d="M56,20H54L48,10H16L10,20H8a4,4,0,0,0-4,4v4a2,2,0,0,0,2,2h4a6,6,0,0,0,12,0H42a6,6,0,0,0,12,0h4a2,2,0,0,0,2-2V24A4,4,0,0,0,56,20ZM16,28a4,4,0,1,1,4-4A4,4,0,0,1,16,28Zm32,0a4,4,0,1,1,4-4A4,4,0,0,1,48,28Z"/>
      </svg>
    );
  }
  if (style.includes('van')) {
    return (
      <svg viewBox="0 0 64 32" fill="white" opacity="0.3" style={{ width: '80px', height: '40px' }}>
        <path d="M56,12H48V8a4,4,0,0,0-4-4H8A4,4,0,0,0,4,8V24a2,2,0,0,0,2,2h4a6,6,0,0,0,12,0H42a6,6,0,0,0,12,0h4a2,2,0,0,0,2-2V16A4,4,0,0,0,56,12ZM16,28a4,4,0,1,1,4-4A4,4,0,0,1,16,28Zm32,0a4,4,0,1,1,4-4A4,4,0,0,1,48,28Z"/>
      </svg>
    );
  }
  if (style.includes('coupe') || style.includes('convertible')) {
    return (
      <svg viewBox="0 0 64 32" fill="white" opacity="0.3" style={{ width: '80px', height: '40px' }}>
        <path d="M58,22H54L44,14H20L10,22H6a2,2,0,0,0-2,2v2a2,2,0,0,0,2,2h4a6,6,0,0,0,12,0H42a6,6,0,0,0,12,0h4a2,2,0,0,0,2-2V24A2,2,0,0,0,58,22ZM16,28a4,4,0,1,1,4-4A4,4,0,0,1,16,28Zm32,0a4,4,0,1,1,4-4A4,4,0,0,1,48,28Z"/>
      </svg>
    );
  }
  // Default sedan
  return (
    <svg viewBox="0 0 64 32" fill="white" opacity="0.3" style={{ width: '80px', height: '40px' }}>
      <path d="M56,20H52L44,12H20L12,20H8a4,4,0,0,0-4,4v2a2,2,0,0,0,2,2h4a6,6,0,0,0,12,0H42a6,6,0,0,0,12,0h4a2,2,0,0,0,2-2V24A4,4,0,0,0,56,20ZM16,28a4,4,0,1,1,4-4A4,4,0,0,1,16,28Zm32,0a4,4,0,1,1,4-4A4,4,0,0,1,48,28Z"/>
    </svg>
  );
};

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onClick }) => {
  const [imageError, setImageError] = useState(false);
  
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleMouseEnter = (e: MouseEvent<HTMLDivElement>): void => {
    e.currentTarget.style.transform = 'translateY(-4px)';
    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
  };

  const handleMouseLeave = (e: MouseEvent<HTMLDivElement>): void => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  };

  // Get normalized values (handle both camelCase and snake_case)
  const exteriorColor = vehicle.exteriorColor || vehicle.exterior_color || 'N/A';
  const bodyStyle = vehicle.bodyStyle || vehicle.body_style;
  const status = vehicle.status || 'In Stock';
  // Show MSRP (not discounted sale price) on vehicle cards
  const price = vehicle.msrp || vehicle.price || vehicle.salePrice || vehicle.sale_price || 0;
  const model = vehicle.model || '';

  // Get image URL - uses API image or local stock photo if available
  const imageUrl = getVehicleImageUrl(vehicle);
  const showRealImage = !imageError && imageUrl;

  const cardStyle: CSSProperties = {
    background: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    width: '100%',
    maxWidth: '320px',
    flexShrink: 0,
  };

  const imageContainerStyle: CSSProperties = {
    width: '100%',
    height: '180px',
    background: getVehicleGradient(bodyStyle, model),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  };

  const realImageStyle: CSSProperties = {
    width: '100%',
    height: '180px',
    objectFit: 'cover',
    objectPosition: 'center',
  };

  const chevyLogoStyle: CSSProperties = {
    position: 'absolute',
    top: '12px',
    left: '12px',
    width: '40px',
    height: '40px',
    opacity: 0.6,
  };

  const modelTextStyle: CSSProperties = {
    color: 'white',
    fontSize: '24px',
    fontWeight: '700',
    textAlign: 'center',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    marginTop: '8px',
  };

  const yearTrimStyle: CSSProperties = {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '14px',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: '4px',
  };

  const contentStyle: CSSProperties = {
    padding: '16px',
  };

  const titleStyle: CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '8px',
    lineHeight: '1.3',
  };

  const detailsStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '12px',
  };

  const detailRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#666',
  };

  const priceContainerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #eee',
    paddingTop: '12px',
  };

  const priceStyle: CSSProperties = {
    fontSize: '20px',
    fontWeight: '700',
    color: '#cc0000',
  };

  const statusStyle: CSSProperties = {
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '4px',
    background: status === 'In Stock' ? '#e8f5e9' : '#fff3e0',
    color: status === 'In Stock' ? '#2e7d32' : '#e65100',
  };

  // Image overlay for real photos (shows model/year)
  const imageOverlayStyle: CSSProperties = {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
    padding: '20px 12px 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  };

  const overlayTextStyle: CSSProperties = {
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  };

  return (
    <div
      style={cardStyle}
      onClick={() => onClick?.(vehicle)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showRealImage && imageUrl ? (
        // Real vehicle photo with overlay
        <div style={{ ...imageContainerStyle, background: '#1a1a1a' }}>
          <img
            src={imageUrl}
            alt={`${vehicle.year} ${vehicle.make} ${model}`}
            style={realImageStyle}
            onError={() => setImageError(true)}
          />
          <div style={imageOverlayStyle}>
            <span style={overlayTextStyle}>{model}</span>
            <span style={{ ...overlayTextStyle, fontSize: '13px', opacity: 0.9 }}>
              {vehicle.year}
            </span>
          </div>
        </div>
      ) : (
        // Fallback gradient design
        <div style={imageContainerStyle}>
          {/* Chevrolet bowtie logo */}
          <svg style={chevyLogoStyle} viewBox="0 0 100 36" fill="white">
            <path d="M0,14.4L16.5,0h67L100,14.4v7.2L83.5,36h-67L0,21.6V14.4z M21.2,5.8L8.2,16.9l13,11.1h57.6l13-11.1L78.8,5.8H21.2z"/>
          </svg>
          
          {/* Vehicle type icon */}
          {getVehicleIcon(bodyStyle)}
          
          {/* Model name */}
          <div style={modelTextStyle}>{model}</div>
          <div style={yearTrimStyle}>{vehicle.year} {vehicle.trim}</div>
        </div>
      )}

      <div style={contentStyle}>
        <div style={titleStyle}>
          {vehicle.year} {vehicle.make} {model}
        </div>
        
        <div style={detailsStyle}>
          <div style={detailRowStyle}>
            <span>Exterior:</span>
            <span style={{ fontWeight: '500', color: '#333' }}>{exteriorColor}</span>
          </div>
          <div style={detailRowStyle}>
            <span>Drivetrain:</span>
            <span style={{ fontWeight: '500', color: '#333' }}>{vehicle.drivetrain || 'N/A'}</span>
          </div>
          <div style={detailRowStyle}>
            <span>Engine:</span>
            <span style={{ fontWeight: '500', color: '#333' }}>{vehicle.engine || 'N/A'}</span>
          </div>
        </div>

        <div style={priceContainerStyle}>
          <div style={priceStyle}>{formatPrice(price)}</div>
          <div style={statusStyle}>{status}</div>
        </div>
      </div>
    </div>
  );
};

export default VehicleCard;
