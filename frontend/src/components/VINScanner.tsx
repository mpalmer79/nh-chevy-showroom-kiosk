/**
 * NH Chevy Showroom Kiosk - VIN Scanner Component
 * 
 * Camera-based VIN barcode scanner using ZXing library.
 * Supports Code 39, Code 128, and DataMatrix formats commonly used for VIN barcodes.
 * 
 * Features:
 * - Real-time camera preview
 * - Auto-detection of VIN barcodes
 * - Manual VIN entry fallback
 * - Torch/flashlight support (where available)
 * - Front/rear camera switching
 * 
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect, useCallback, CSSProperties } from 'react';

// VIN validation regex (17 alphanumeric, excluding I, O, Q)
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

interface VINScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (vin: string) => void;
}

type ScanStatus = 'idle' | 'initializing' | 'scanning' | 'success' | 'error';

const VINScanner: React.FC<VINScannerProps> = ({ isOpen, onClose, onScan }) => {
  // State
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [manualVin, setManualVin] = useState('');
  const [scannedVin, setScannedVin] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [_scanAttempts, setScanAttempts] = useState(0);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<any>(null);

  // Check for multiple cameras
  useEffect(() => {
    const checkCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch (err) {
        console.error('Error checking cameras:', err);
      }
    };
    checkCameras();
  }, []);

  // Initialize barcode detector
  useEffect(() => {
    // Check for native BarcodeDetector API (Chrome, Edge)
    if ('BarcodeDetector' in window) {
      try {
        // @ts-ignore - BarcodeDetector is not in TypeScript types yet
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: ['code_39', 'code_128', 'data_matrix', 'qr_code']
        });
      } catch (err) {
        console.log('Native BarcodeDetector not available:', err);
      }
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setStatus('initializing');
    setErrorMessage('');
    
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('scanning');
        startScanning();
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setStatus('error');
      
      if (err.name === 'NotAllowedError') {
        setErrorMessage('Camera access denied. Please allow camera permissions to scan VIN barcodes.');
      } else if (err.name === 'NotFoundError') {
        setErrorMessage('No camera found on this device. Please enter VIN manually.');
      } else {
        setErrorMessage('Unable to access camera. Please enter VIN manually.');
      }
    }
  }, [facingMode]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Validate VIN format
  const isValidVin = (vin: string): boolean => {
    return VIN_REGEX.test(vin.toUpperCase());
  };

  // Process detected barcode
  const processBarcode = useCallback((rawValue: string) => {
    // Clean up the value
    const cleaned = rawValue.replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase();
    
    // Check if it's a valid VIN
    if (isValidVin(cleaned)) {
      setScannedVin(cleaned);
      setStatus('success');
      stopCamera();
      
      // Vibrate on success (if supported)
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
    }
  }, [stopCamera]);

  // Main scanning loop
  const startScanning = useCallback(() => {
    const scan = async () => {
      if (!videoRef.current || !canvasRef.current || status !== 'scanning') {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(scan);
        return;
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Try native BarcodeDetector first
      if (barcodeDetectorRef.current) {
        try {
          const barcodes = await barcodeDetectorRef.current.detect(canvas);
          
          for (const barcode of barcodes) {
            if (barcode.rawValue && barcode.rawValue.length >= 17) {
              processBarcode(barcode.rawValue);
              return;
            }
          }
        } catch (err) {
          // Continue scanning
        }
      }

      // Increment scan attempts for UI feedback
      setScanAttempts(prev => prev + 1);

      // Continue scanning
      animationFrameRef.current = requestAnimationFrame(scan);
    };

    animationFrameRef.current = requestAnimationFrame(scan);
  }, [status, processBarcode]);

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;

    const track = streamRef.current.getVideoTracks()[0];
    
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn } as unknown as MediaTrackConstraintSet]
      });
      setTorchOn(!torchOn);
    } catch (err) {
      console.log('Torch not supported:', err);
    }
  }, [torchOn]);

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  // Effect to restart camera when facing mode changes
  useEffect(() => {
    if (isOpen && status === 'scanning') {
      startCamera();
    }
  }, [facingMode]);

  // Effect to start/stop camera based on modal state
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setStatus('idle');
      setScannedVin(null);
      setManualVin('');
      setScanAttempts(0);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Handle manual VIN submission
  const handleManualSubmit = () => {
    const vin = manualVin.toUpperCase().trim();
    if (isValidVin(vin)) {
      onScan(vin);
      onClose();
    } else {
      setErrorMessage('Please enter a valid 17-character VIN');
    }
  };

  // Handle scanned VIN confirmation
  const handleConfirmScan = () => {
    if (scannedVin) {
      onScan(scannedVin);
      onClose();
    }
  };

  // Retry scanning
  const handleRetry = () => {
    setScannedVin(null);
    setStatus('idle');
    setScanAttempts(0);
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            <span style={{ fontSize: '24px' }}>📷</span>
            Scan VIN Barcode
          </h2>
          <button style={styles.closeButton} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scanner Content */}
        <div style={styles.content}>
          {/* Camera Preview */}
          {(status === 'initializing' || status === 'scanning') && (
            <div style={styles.cameraContainer}>
              <video 
                ref={videoRef} 
                style={styles.video}
                playsInline
                muted
              />
              <canvas ref={canvasRef} style={styles.canvas} />
              
              {/* Scanning overlay */}
              <div style={styles.scanOverlay}>
                <div style={styles.scanFrame}>
                  <div style={styles.scanCorner} data-position="top-left" />
                  <div style={styles.scanCorner} data-position="top-right" />
                  <div style={styles.scanCorner} data-position="bottom-left" />
                  <div style={styles.scanCorner} data-position="bottom-right" />
                  <div style={styles.scanLine} />
                </div>
              </div>

              {/* Camera controls */}
              <div style={styles.cameraControls}>
                <button style={styles.controlButton} onClick={toggleTorch} title="Toggle flashlight">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={torchOn ? '#fbbf24' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M9 18v-6l-2 2M15 18v-6l2 2M12 2v1M12 21v1M4.22 4.22l.71.71M18.36 18.36l.71.71M1 12h1M22 12h1M4.22 19.78l.71-.71M18.36 5.64l.71-.71" />
                    <circle cx="12" cy="12" r="5" />
                  </svg>
                </button>
                
                {hasMultipleCameras && (
                  <button style={styles.controlButton} onClick={switchCamera} title="Switch camera">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 3h5v5M8 21H3v-5M21 3l-7 7M3 21l7-7" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Status indicator */}
              <div style={styles.statusBar}>
                {status === 'initializing' && (
                  <span style={styles.statusText}>
                    <div style={styles.miniSpinner} />
                    Starting camera...
                  </span>
                )}
                {status === 'scanning' && (
                  <span style={styles.statusText}>
                    <span style={styles.scanPulse}>●</span>
                    Position VIN barcode in frame
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && scannedVin && (
            <div style={styles.successContainer}>
              <div style={styles.successIcon}>✅</div>
              <h3 style={styles.successTitle}>VIN Detected!</h3>
              <div style={styles.vinDisplay}>
                {scannedVin}
              </div>
              <p style={styles.successHint}>
                Please verify this matches your vehicle's VIN
              </p>
              <div style={styles.successActions}>
                <button style={styles.confirmButton} onClick={handleConfirmScan}>
                  Confirm & Use This VIN
                </button>
                <button style={styles.retryButton} onClick={handleRetry}>
                  Scan Again
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div style={styles.errorContainer}>
              <div style={styles.errorIcon}>📵</div>
              <p style={styles.errorText}>{errorMessage}</p>
              <button style={styles.retryButton} onClick={startCamera}>
                Try Again
              </button>
            </div>
          )}

          {/* Manual Entry Fallback */}
          <div style={styles.manualSection}>
            <div style={styles.divider}>
              <span style={styles.dividerText}>or enter manually</span>
            </div>
            
            <div style={styles.manualInputRow}>
              <input
                type="text"
                style={styles.manualInput}
                placeholder="Enter 17-character VIN"
                value={manualVin}
                onChange={(e) => {
                  setManualVin(e.target.value.toUpperCase());
                  setErrorMessage('');
                }}
                maxLength={17}
              />
              <button 
                style={{
                  ...styles.manualSubmitButton,
                  opacity: manualVin.length === 17 ? 1 : 0.5,
                }}
                onClick={handleManualSubmit}
                disabled={manualVin.length !== 17}
              >
                Use VIN
              </button>
            </div>
            
            {errorMessage && status !== 'error' && (
              <p style={styles.inputError}>{errorMessage}</p>
            )}
          </div>

          {/* Tips Section */}
          <div style={styles.tipsSection}>
            <p style={styles.tipText}>
              📄 You can find your VIN on your vehicle registration
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: { [key: string]: CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },
  modal: {
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '20px',
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
  },
  closeButton: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },
  cameraContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4/3',
    borderRadius: '16px',
    overflow: 'hidden',
    background: '#000',
    marginBottom: '20px',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  canvas: {
    display: 'none',
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.3)',
  },
  scanFrame: {
    position: 'relative',
    width: '80%',
    height: '40%',
    maxWidth: '300px',
    maxHeight: '100px',
    border: '2px solid rgba(74, 222, 128, 0.5)',
    borderRadius: '8px',
  },
  scanCorner: {
    position: 'absolute',
    width: '20px',
    height: '20px',
    borderColor: '#4ade80',
    borderStyle: 'solid',
    borderWidth: '0',
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: '10%',
    right: '10%',
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #4ade80, transparent)',
    animation: 'scanPulse 1.5s ease-in-out infinite',
  },
  cameraControls: {
    position: 'absolute',
    bottom: '16px',
    right: '16px',
    display: 'flex',
    gap: '12px',
  },
  controlButton: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.6)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(4px)',
  },
  statusBar: {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    right: '80px',
  },
  statusText: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'rgba(0,0,0,0.6)',
    borderRadius: '20px',
    color: '#ffffff',
    fontSize: '14px',
    backdropFilter: 'blur(4px)',
  },
  miniSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.2)',
    borderTopColor: '#4ade80',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  scanPulse: {
    color: '#4ade80',
    animation: 'pulse 1s ease-in-out infinite',
  },
  successContainer: {
    textAlign: 'center',
    padding: '32px 20px',
    background: 'rgba(74, 222, 128, 0.1)',
    borderRadius: '16px',
    border: '1px solid rgba(74, 222, 128, 0.3)',
    marginBottom: '20px',
  },
  successIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  successTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#4ade80',
    margin: '0 0 16px 0',
  },
  vinDisplay: {
    fontFamily: 'monospace',
    fontSize: '24px',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '2px',
    padding: '16px 20px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  successHint: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    margin: '0 0 24px 0',
  },
  successActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  confirmButton: {
    width: '100%',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  retryButton: {
    width: '100%',
    padding: '14px 24px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '32px 20px',
    background: 'rgba(248, 113, 113, 0.1)',
    borderRadius: '16px',
    border: '1px solid rgba(248, 113, 113, 0.3)',
    marginBottom: '20px',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  errorText: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.8)',
    margin: '0 0 20px 0',
    lineHeight: 1.5,
  },
  manualSection: {
    marginTop: '20px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
  },
  dividerText: {
    flex: 1,
    textAlign: 'center',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    position: 'relative',
  },
  manualInputRow: {
    display: 'flex',
    gap: '12px',
  },
  manualInput: {
    flex: 1,
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '16px',
    fontFamily: 'monospace',
    letterSpacing: '1px',
    outline: 'none',
    textTransform: 'uppercase',
  },
  manualSubmitButton: {
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  inputError: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#f87171',
  },
  tipsSection: {
    marginTop: '24px',
    padding: '16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    textAlign: 'center',
  },
  tipText: {
    margin: 0,
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
  },
};

// Add CSS keyframes for animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  @keyframes scanPulse {
    0%, 100% { opacity: 0.3; transform: scaleX(0.8); }
    50% { opacity: 1; transform: scaleX(1); }
  }
  
  [data-position="top-left"] {
    top: -2px;
    left: -2px;
    border-top-width: 3px !important;
    border-left-width: 3px !important;
    border-top-left-radius: 8px;
  }
  [data-position="top-right"] {
    top: -2px;
    right: -2px;
    border-top-width: 3px !important;
    border-right-width: 3px !important;
    border-top-right-radius: 8px;
  }
  [data-position="bottom-left"] {
    bottom: -2px;
    left: -2px;
    border-bottom-width: 3px !important;
    border-left-width: 3px !important;
    border-bottom-left-radius: 8px;
  }
  [data-position="bottom-right"] {
    bottom: -2px;
    right: -2px;
    border-bottom-width: 3px !important;
    border-right-width: 3px !important;
    border-bottom-right-radius: 8px;
  }
`;
if (!document.querySelector('#vin-scanner-styles')) {
  styleSheet.id = 'vin-scanner-styles';
  document.head.appendChild(styleSheet);
}

export default VINScanner;
