import React, { useState, CSSProperties } from 'react';
import type { Vehicle } from '../types';

interface QRCodeModalProps {
  vehicle: Vehicle;
  isOpen: boolean;
  onClose: () => void;
}

// Format price for display
const formatPrice = (price: number | undefined): string => {
  if (!price) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const QRCodeModal: React.FC<QRCodeModalProps> = ({ vehicle, isOpen, onClose }) => {
  const [qrLoaded, setQrLoaded] = useState(false);
  const [qrError, setQrError] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Build vehicle URL - this would be your dealership's website URL
  const stockNumber = vehicle.stockNumber || vehicle.stock_number || '';
  // TODO: set REACT_APP_INVENTORY_URL to real dealership inventory URL
  const baseUrl = process.env.REACT_APP_INVENTORY_URL ?? 'https://example.com/inventory';
  const vehicleUrl = `${baseUrl}/${stockNumber}`;
  
  // QR Code API URL (using free goqr.me API - no dependencies needed)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(vehicleUrl)}&bgcolor=ffffff&color=1B7340`;

  // Vehicle info for display
  const year = vehicle.year || '';
  const make = vehicle.make || 'Chevrolet';
  const model = vehicle.model || '';
  const trim = vehicle.trim || '';
  const exteriorColor = vehicle.exteriorColor || vehicle.exterior_color || '';
  // Show MSRP (not discounted sale price)
  const price = vehicle.msrp || vehicle.price || vehicle.salePrice || vehicle.sale_price || 0;

  // Copy URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(vehicleUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Print the QR code card
  const handlePrint = () => {
    // Modal must be open to print (checked by isOpen above)
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vehicle QR Code - ${year} ${model}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Montserrat', sans-serif;
            padding: 40px;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          .card {
            width: 400px;
            border: 2px solid #22c55e;
            border-radius: 16px;
            overflow: hidden;
          }
          .header {
            background: #22c55e;
            color: white;
            padding: 16px 20px;
            text-align: center;
          }
          .header h1 {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 1px;
            margin: 0;
          }
          .content {
            padding: 24px;
            text-align: center;
          }
          .qr-container {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
          }
          .qr-container img {
            width: 180px;
            height: 180px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          }
          .vehicle-name {
            font-size: 20px;
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 4px;
          }
          .vehicle-trim {
            font-size: 14px;
            color: #666;
            margin-bottom: 12px;
          }
          .vehicle-details {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-bottom: 16px;
            font-size: 13px;
            color: #666;
          }
          .price {
            font-size: 24px;
            font-weight: 700;
            color: #22c55e;
            margin-bottom: 12px;
          }
          .stock {
            font-size: 12px;
            color: #999;
            margin-bottom: 16px;
          }
          .cta {
            background: #f3f4f6;
            padding: 12px;
            border-radius: 8px;
            font-size: 12px;
            color: #666;
          }
          .footer {
            background: #f9fafb;
            padding: 12px 20px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            font-size: 11px;
            color: #999;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>NEW HAMPSHIRE CHEVROLET</h1>
          </div>
          <div class="content">
            <div class="qr-container">
              <img src="${qrCodeUrl}" alt="QR Code" />
            </div>
            <div class="vehicle-name">${year} ${make} ${model}</div>
            <div class="vehicle-trim">${trim}</div>
            <div class="vehicle-details">
              <span>${exteriorColor}</span>
            </div>
            <div class="price">${formatPrice(price)}</div>
            <div class="stock">Stock #${stockNumber}</div>
            <div class="cta">
              Scan to view full details, photos & availability
            </div>
          </div>
          <div class="footer">
            <p>New Hampshire Chevrolet • Manchester, NH • example.com</p>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    // Wait for QR image to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={handleBackdropClick}>
      <div style={styles.modal}>
        {/* Close Button */}
        <button style={styles.closeBtn} onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <h2 style={styles.title}>Save This Vehicle</h2>
          <p style={styles.subtitle}>
            Scan the QR code with your phone to save vehicle details
          </p>
        </div>

        {/* QR Code */}
        <div style={styles.qrContainer}>
          {!qrLoaded && !qrError && (
            <div style={styles.qrPlaceholder}>
              <div style={styles.spinner} />
            </div>
          )}
          {qrError && (
            <div style={styles.qrError}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span>Unable to generate QR code</span>
            </div>
          )}
          <img
            src={qrCodeUrl}
            alt="Vehicle QR Code"
            style={{
              ...styles.qrImage,
              display: qrLoaded && !qrError ? 'block' : 'none',
            }}
            onLoad={() => setQrLoaded(true)}
            onError={() => setQrError(true)}
          />
        </div>

        {/* Vehicle Summary */}
        <div style={styles.vehicleSummary}>
          <h3 style={styles.vehicleName}>{year} {make} {model}</h3>
          <p style={styles.vehicleTrim}>{trim}</p>
          <div style={styles.vehicleDetails}>
            {exteriorColor && (
              <span style={styles.detailItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                {exteriorColor}
              </span>
            )}
            <span style={styles.detailItem}>
              Stock #{stockNumber}
            </span>
          </div>
          <div style={styles.vehiclePrice}>{formatPrice(price)}</div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.copyBtn} onClick={handleCopyUrl}>
            {copied ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy Link
              </>
            )}
          </button>
          <button style={styles.printBtn} onClick={handlePrint}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print QR Card
          </button>
        </div>

        {/* URL Display */}
        <div style={styles.urlContainer}>
          <span style={styles.urlLabel}>Or visit:</span>
          <span style={styles.urlText}>{vehicleUrl}</span>
        </div>

        {/* Instructions */}
        <div style={styles.instructions}>
          <div style={styles.instructionItem}>
            <span style={styles.instructionNumber}>1</span>
            <span style={styles.instructionText}>Open camera on your phone</span>
          </div>
          <div style={styles.instructionItem}>
            <span style={styles.instructionNumber}>2</span>
            <span style={styles.instructionText}>Point at QR code</span>
          </div>
          <div style={styles.instructionItem}>
            <span style={styles.instructionNumber}>3</span>
            <span style={styles.instructionText}>Tap the link that appears</span>
          </div>
        </div>
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    position: 'relative',
    width: '100%',
    maxWidth: '440px',
    maxHeight: '90vh',
    overflowY: 'auto',
    background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '32px',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '50%',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  
  // Header
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  headerIcon: {
    width: '56px',
    height: '56px',
    margin: '0 auto 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(27, 115, 64, 0.2)',
    borderRadius: '16px',
    color: '#4ade80',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#ffffff',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.6)',
    margin: 0,
    lineHeight: 1.5,
  },

  // QR Code
  qrContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  qrPlaceholder: {
    width: '200px',
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#22c55e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  qrError: {
    width: '200px',
    height: '200px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '13px',
    textAlign: 'center',
  },
  qrImage: {
    width: '200px',
    height: '200px',
    borderRadius: '16px',
    background: '#ffffff',
    padding: '12px',
  },

  // Vehicle Summary
  vehicleSummary: {
    textAlign: 'center',
    marginBottom: '24px',
    padding: '20px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '16px',
  },
  vehicleName: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#ffffff',
    margin: '0 0 4px 0',
  },
  vehicleTrim: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.6)',
    margin: '0 0 12px 0',
  },
  vehicleDetails: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '12px',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  vehiclePrice: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#4ade80',
  },

  // Actions
  actions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '20px',
  },
  copyBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 20px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  printBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 20px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // URL Display
  urlContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  urlLabel: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  urlText: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.7)',
    wordBreak: 'break-all',
    textAlign: 'center',
  },

  // Instructions
  instructions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
  },
  instructionItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  instructionNumber: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(27, 115, 64, 0.2)',
    borderRadius: '50%',
    fontSize: '13px',
    fontWeight: 700,
    color: '#4ade80',
  },
  instructionText: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    maxWidth: '80px',
  },
};

export default QRCodeModal;
