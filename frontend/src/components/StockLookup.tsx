import React, { useState, useRef, useEffect, ChangeEvent, KeyboardEvent, CSSProperties } from 'react';
import api from './api';
import type { Vehicle, KioskComponentProps } from '../types';

type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'clear' | 'backspace';

const StockLookup: React.FC<KioskComponentProps> = ({ navigateTo, updateCustomerData, customerData: _customerData }) => {
  const [stockNumber, setStockNumber] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<Vehicle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Stock numbers always start with M
  const STOCK_PREFIX = 'M';

  // Auto-focus the hidden input on mount (desktop keyboard support)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Re-focus after search result is cleared
  useEffect(() => {
    if (!searchResult && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchResult]);

  const handleKeyPress = (key: KeypadKey): void => {
    if (key === 'clear') {
      setStockNumber('');
      setSearchResult(null);
      setError(null);
    } else if (key === 'backspace') {
      setStockNumber(prev => prev.slice(0, -1));
      setError(null);
    } else if (stockNumber.length < 8) {
      setStockNumber(prev => prev + key);
      setError(null);
    }
  };

  // Handle keyboard input from the hidden input field
  const handleKeyboardInput = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    // Only allow numbers, max 8 digits
    const numbersOnly = value.replace(/\D/g, '').slice(0, 8);
    setStockNumber(numbersOnly);
    setError(null);
  };

  // Handle keyboard shortcuts (Enter to search, Escape to clear)
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && stockNumber.length >= 4 && !isSearching) {
      handleSearch();
    } else if (e.key === 'Escape') {
      setStockNumber('');
      setSearchResult(null);
      setError(null);
    }
  };

  const handleSearch = async (): Promise<void> => {
    if (stockNumber.length < 4) {
      setError('Please enter at least 4 digits');
      return;
    }

    setIsSearching(true);
    setError(null);

    const fullStockNumber = STOCK_PREFIX + stockNumber;

    try {
      const vehicle = await api.getVehicleByStock(fullStockNumber);
      
      if (vehicle) {
        setSearchResult(vehicle);
        updateCustomerData({ selectedVehicle: vehicle });
      }
    } catch (err) {
      setError(`Vehicle ${fullStockNumber} not found. Please check the number and try again.`);
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewDetails = (): void => {
    navigateTo('vehicleDetail');
  };

  const handleScheduleTestDrive = (): void => {
    navigateTo('handoff');
  };

  const keypadLayout: KeypadKey[][] = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'backspace'],
  ];

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconWrapper}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
          <h1 style={styles.title}>Find Your Vehicle</h1>
          <p style={styles.subtitle}>
            Enter the stock number from the vehicle window sticker
          </p>
        </div>

        {/* Input Display */}
        <div style={styles.inputSection}>
          <div 
            style={styles.inputDisplay}
            onClick={() => inputRef.current?.focus()}
          >
            {/* Hidden input for keyboard support on desktop */}
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={stockNumber}
              onChange={handleKeyboardInput}
              onKeyDown={handleKeyDown}
              style={styles.hiddenInput}
              aria-label="Stock number input"
            />
            <span style={styles.inputPrefix}>STK#</span>
            <span style={styles.mPrefix}>M</span>
            <span style={styles.inputValue}>
              {stockNumber || <span style={styles.placeholder}>Enter numbers</span>}
            </span>
            {stockNumber && <span style={styles.cursor}>|</span>}
          </div>
          
          <p style={styles.inputHint}>
            Example: For stock M39547, enter <strong>39547</strong>
          </p>
          
          {error && (
            <div style={styles.errorMessage}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Search Result */}
        {searchResult && (
          <div style={styles.resultCard}>
            <div style={styles.resultHeader}>
              <div style={styles.statusBadge}>
                <span style={styles.statusDot} />
                {searchResult.status || 'In Stock'}
              </div>
              <span style={styles.stockLabel}>STK# {searchResult.stockNumber || searchResult.stock_number}</span>
            </div>

            <h2 style={styles.vehicleTitle}>
              {searchResult.year} {searchResult.make} {searchResult.model}
            </h2>
            <p style={styles.vehicleTrim}>{searchResult.trim}</p>

            <div style={styles.vehicleSpecs}>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Exterior</span>
                <span style={styles.specValue}>{searchResult.exteriorColor || searchResult.exterior_color}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Interior</span>
                <span style={styles.specValue}>{searchResult.interiorColor || searchResult.interior_color}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Engine</span>
                <span style={styles.specValue}>{searchResult.engine}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Drivetrain</span>
                <span style={styles.specValue}>{searchResult.drivetrain}</span>
              </div>
            </div>

            <div style={styles.priceSection}>
              <div style={styles.priceRow}>
                <span style={styles.msrpLabel}>MSRP</span>
                <span style={styles.msrpValue}>${(searchResult.msrp || 0).toLocaleString()}</span>
              </div>
              <div style={styles.priceRow}>
                <span style={styles.salePriceLabel}>Your Price</span>
                <span style={styles.salePriceValue}>${(searchResult.salePrice || searchResult.sale_price || searchResult.price || 0).toLocaleString()}</span>
              </div>
              {searchResult.msrp && (searchResult.salePrice || searchResult.sale_price) && searchResult.msrp > (searchResult.salePrice || searchResult.sale_price || 0) && (
                <div style={styles.savings}>
                  You Save ${(searchResult.msrp - (searchResult.salePrice || searchResult.sale_price || 0)).toLocaleString()}
                </div>
              )}
            </div>

            <div style={styles.resultActions}>
              <button style={styles.primaryButton} onClick={handleViewDetails}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                </svg>
                View Full Details
              </button>
              <button style={styles.secondaryButton} onClick={handleScheduleTestDrive}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                Schedule Test Drive
              </button>
            </div>
          </div>
        )}

        {/* Keypad */}
        {!searchResult && (
          <div style={styles.keypadSection}>
            <div style={styles.keypad}>
              {keypadLayout.map((row, rowIndex) => (
                <div key={rowIndex} style={styles.keypadRow}>
                  {row.map((key) => (
                    <button
                      key={key}
                      style={{
                        ...styles.keypadButton,
                        ...(key === 'clear' ? styles.keypadButtonClear : {}),
                        ...(key === 'backspace' ? styles.keypadButtonBackspace : {}),
                      }}
                      onClick={() => handleKeyPress(key)}
                    >
                      {key === 'backspace' ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                          <path d="M18 9l-6 6M12 9l6 6"/>
                        </svg>
                      ) : key === 'clear' ? (
                        'Clear'
                      ) : (
                        key
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <button
              style={{
                ...styles.searchButton,
                opacity: stockNumber.length >= 4 ? 1 : 0.5,
              }}
              onClick={handleSearch}
              disabled={stockNumber.length < 4 || isSearching}
            >
              {isSearching ? (
                <>
                  <span style={styles.spinner} />
                  Searching...
                </>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                  </svg>
                  Search
                </>
              )}
            </button>
          </div>
        )}

        {/* Help Text */}
        <div style={styles.helpText}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
          <span>
            Can't find the stock number? Look for the sticker on the vehicle's window, 
            or ask any team member for assistance.
          </span>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px',
    overflow: 'auto',
    backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.5)), url(/showroom3.jfif)',
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
    backgroundAttachment: 'fixed',
  },
  content: {
    width: '100%',
    maxWidth: '600px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  iconWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    margin: '0 auto 20px',
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
  inputSection: {
    width: '100%',
    marginBottom: '24px',
  },
  inputDisplay: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px 24px',
    background: 'rgba(50, 50, 50, 0.7)',
    borderRadius: '16px',
    border: '2px solid rgba(255,255,255,0.2)',
    fontSize: '32px',
    fontWeight: '700',
    fontFamily: 'monospace',
    position: 'relative',
    cursor: 'text',
  },
  hiddenInput: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    border: 'none',
    background: 'transparent',
    fontSize: '32px',
    color: 'transparent',
    outline: 'none',
  },
  inputPrefix: {
    color: 'rgba(255,255,255,0.4)',
    marginRight: '12px',
    fontSize: '20px',
  },
  mPrefix: {
    color: '#4ade80',
    fontSize: '32px',
    fontWeight: '700',
  },
  inputValue: {
    color: '#ffffff',
    letterSpacing: '4px',
  },
  placeholder: {
    color: 'rgba(255,255,255,0.3)',
    fontFamily: '"Montserrat", sans-serif',
    letterSpacing: 'normal',
    fontSize: '20px',
    fontWeight: '400',
  },
  cursor: {
    color: '#4ade80',
    animation: 'blink 1s infinite',
  },
  inputHint: {
    marginTop: '12px',
    textAlign: 'center',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
    padding: '12px 16px',
    background: 'rgba(220, 38, 38, 0.2)',
    borderRadius: '8px',
    color: '#fca5a5',
    fontSize: '14px',
  },
  keypadSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  keypad: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
    maxWidth: '360px',
    padding: '20px',
    background: 'rgba(50, 50, 50, 0.7)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  keypadRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  keypadButton: {
    width: '100px',
    height: '70px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.15)',
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadButtonClear: {
    fontSize: '14px',
    fontWeight: '600',
    background: 'rgba(220, 38, 38, 0.2)',
    borderColor: 'rgba(220, 38, 38, 0.3)',
    color: '#fca5a5',
  },
  keypadButtonBackspace: {
    background: 'rgba(255,255,255,0.1)',
  },
  searchButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    maxWidth: '360px',
    padding: '20px 32px',
    background: 'rgba(50, 50, 50, 0.7)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  resultCard: {
    width: '100%',
    padding: '28px',
    background: 'rgba(255,255,255,0.12)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '24px',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    background: 'rgba(34, 197, 94, 0.2)',
    borderRadius: '20px',
    color: '#4ade80',
    fontSize: '13px',
    fontWeight: '600',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#4ade80',
  },
  stockLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    fontWeight: '600',
  },
  vehicleTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 4px 0',
  },
  vehicleTrim: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.6)',
    margin: '0 0 20px 0',
  },
  vehicleSpecs: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '20px',
    padding: '16px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '12px',
  },
  specItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  specLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  specValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
  },
  priceSection: {
    padding: '16px',
    background: 'rgba(27, 115, 64, 0.1)',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  msrpLabel: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
  },
  msrpValue: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'line-through',
  },
  salePriceLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffffff',
  },
  salePriceValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#4ade80',
  },
  savings: {
    textAlign: 'center',
    padding: '8px',
    background: 'rgba(34, 197, 94, 0.2)',
    borderRadius: '8px',
    color: '#4ade80',
    fontSize: '14px',
    fontWeight: '600',
  },
  resultActions: {
    display: 'flex',
    gap: '12px',
  },
  primaryButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  secondaryButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px 24px',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  helpText: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '13px',
    lineHeight: '1.5',
    marginTop: '16px',
  },
};

export default StockLookup;
