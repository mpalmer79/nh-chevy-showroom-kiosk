import React, { useState, useEffect, CSSProperties } from 'react';
import type { Vehicle, KioskComponentProps } from '../types';
import { getVehicleImageUrl } from '../utils/vehicleHelpers';
import api from './api';

interface ComparisonVehicle extends Vehicle {
  selected?: boolean;
}

// Helper to get normalized vehicle values
const getVehicleValue = (vehicle: Vehicle, key: string): string | number => {
  const camelCase = key;
  const snakeCase = key.replace(/([A-Z])/g, '_$1').toLowerCase();
  
  const value = (vehicle as Record<string, unknown>)[camelCase] ?? 
                (vehicle as Record<string, unknown>)[snakeCase] ?? 
                'N/A';
  
  return value as string | number;
};

// Format price for display
const formatPrice = (price: number | string | undefined): string => {
  if (!price || price === 'N/A') return 'N/A';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// Format MPG for display
const formatMPG = (city?: number, highway?: number): string => {
  if (!city && !highway) return 'N/A';
  if (city && highway) return `${city} city / ${highway} hwy`;
  return `${city || highway} mpg`;
};

// Get gradient based on model
const getVehicleGradient = (model?: string): string => {
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
  
  return 'linear-gradient(135deg, #2c3e50 0%, #1a252f 100%)';
};

// Comparison spec rows configuration
const comparisonSpecs = [
  { key: 'price', label: 'Price', format: 'price' },
  { key: 'msrp', label: 'MSRP', format: 'price' },
  { key: 'exteriorColor', label: 'Exterior Color', format: 'text' },
  { key: 'interiorColor', label: 'Interior Color', format: 'text' },
  { key: 'engine', label: 'Engine', format: 'text' },
  { key: 'transmission', label: 'Transmission', format: 'text' },
  { key: 'drivetrain', label: 'Drivetrain', format: 'text' },
  { key: 'fuelType', label: 'Fuel Type', format: 'text' },
  { key: 'mpg', label: 'Fuel Economy', format: 'mpg' },
  { key: 'bodyStyle', label: 'Body Style', format: 'text' },
  { key: 'doors', label: 'Doors', format: 'text' },
  { key: 'mileage', label: 'Mileage', format: 'number' },
  { key: 'status', label: 'Availability', format: 'status' },
];

const VehicleComparison: React.FC<KioskComponentProps> = ({
  navigateTo,
  customerData: _customerData,
  updateCustomerData,
}) => {
  const [inventory, setInventory] = useState<ComparisonVehicle[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<ComparisonVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelector, setShowSelector] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Fetch inventory on mount
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const response = await api.getInventory({ limit: 100 });
        const vehicles = Array.isArray(response) ? response : response.vehicles || [];
        setInventory(vehicles);
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  // Filter inventory based on search
  const filteredInventory = inventory.filter(vehicle => {
    const term = searchTerm.toLowerCase();
    const year = String(vehicle.year || '');
    const make = (vehicle.make || '').toLowerCase();
    const model = (vehicle.model || '').toLowerCase();
    const stock = (vehicle.stock_number || vehicle.stockNumber || '').toLowerCase();
    
    return year.includes(term) || 
           make.includes(term) || 
           model.includes(term) || 
           stock.includes(term);
  });

  // Toggle vehicle selection
  const toggleVehicleSelection = (vehicle: ComparisonVehicle) => {
    const isSelected = selectedVehicles.some(v => 
      (v.stock_number || v.stockNumber) === (vehicle.stock_number || vehicle.stockNumber)
    );

    if (isSelected) {
      setSelectedVehicles(prev => 
        prev.filter(v => (v.stock_number || v.stockNumber) !== (vehicle.stock_number || vehicle.stockNumber))
      );
    } else if (selectedVehicles.length < 3) {
      setSelectedVehicles(prev => [...prev, vehicle]);
    }
  };

  // Check if vehicle is selected
  const isVehicleSelected = (vehicle: ComparisonVehicle): boolean => {
    return selectedVehicles.some(v => 
      (v.stock_number || v.stockNumber) === (vehicle.stock_number || vehicle.stockNumber)
    );
  };

  // Handle view vehicle details
  const handleViewDetails = (vehicle: Vehicle) => {
    updateCustomerData({ selectedVehicle: vehicle });
    navigateTo('vehicleDetail');
  };

  // Get formatted value for spec row
  const getFormattedValue = (vehicle: Vehicle, spec: typeof comparisonSpecs[0]): string => {
    switch (spec.format) {
      case 'price':
        const price = getVehicleValue(vehicle, spec.key);
        return formatPrice(price as number);
      
      case 'mpg':
        const mpgCity = vehicle.mpg_city || vehicle.mpgCity;
        const mpgHighway = vehicle.mpg_highway || vehicle.mpgHighway;
        return formatMPG(mpgCity, mpgHighway);
      
      case 'number':
        const num = getVehicleValue(vehicle, spec.key);
        if (num === 'N/A') return 'N/A';
        return new Intl.NumberFormat('en-US').format(num as number);
      
      case 'status':
        const status = getVehicleValue(vehicle, spec.key);
        return status === 'N/A' ? 'In Stock' : String(status);
      
      default:
        return String(getVehicleValue(vehicle, spec.key));
    }
  };

  // Check if values differ across compared vehicles
  const valuesDiffer = (spec: typeof comparisonSpecs[0]): boolean => {
    if (selectedVehicles.length < 2) return false;
    
    const values = selectedVehicles.map(v => getFormattedValue(v, spec));
    return new Set(values).size > 1;
  };

  // Find best value for highlighting
  const isBestValue = (vehicle: Vehicle, spec: typeof comparisonSpecs[0]): boolean => {
    if (selectedVehicles.length < 2) return false;
    if (spec.format !== 'price' && spec.format !== 'mpg') return false;
    
    if (spec.key === 'price' || spec.key === 'msrp') {
      const prices = selectedVehicles.map(v => {
        const val = getVehicleValue(v, spec.key);
        return typeof val === 'number' ? val : parseFloat(String(val)) || Infinity;
      });
      const minPrice = Math.min(...prices);
      const currentPrice = getVehicleValue(vehicle, spec.key);
      const currentNum = typeof currentPrice === 'number' ? currentPrice : parseFloat(String(currentPrice)) || Infinity;
      return currentNum === minPrice && currentNum !== Infinity;
    }
    
    if (spec.key === 'mpg') {
      const mpgs = selectedVehicles.map(v => (v.mpg_highway || v.mpgHighway || 0));
      const maxMpg = Math.max(...mpgs);
      const currentMpg = vehicle.mpg_highway || vehicle.mpgHighway || 0;
      return currentMpg === maxMpg && maxMpg > 0;
    }
    
    return false;
  };

  // Handle image error
  const handleImageError = (stockNumber: string) => {
    setImageErrors(prev => ({ ...prev, [stockNumber]: true }));
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9V4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5"/>
          </svg>
          Vehicle Comparison
        </h1>
        <p style={styles.subtitle}>
          Select up to 3 vehicles to compare side-by-side
        </p>
      </div>

      {/* Selection Pills */}
      {selectedVehicles.length > 0 && (
        <div style={styles.selectionBar}>
          <div style={styles.selectionPills}>
            {selectedVehicles.map((vehicle, index) => (
              <div key={vehicle.stock_number || vehicle.stockNumber || index} style={styles.selectionPill}>
                <span>{vehicle.year} {vehicle.model}</span>
                <button 
                  style={styles.removePillBtn}
                  onClick={() => toggleVehicleSelection(vehicle)}
                >
                  ×
                </button>
              </div>
            ))}
            {selectedVehicles.length < 3 && (
              <span style={styles.selectionHint}>
                {3 - selectedVehicles.length} more available
              </span>
            )}
          </div>
          <div style={styles.selectionActions}>
            {!showSelector && (
              <button 
                style={styles.addMoreBtn}
                onClick={() => setShowSelector(true)}
              >
                + Add Vehicle
              </button>
            )}
            {selectedVehicles.length >= 2 && (
              <button 
                style={styles.compareBtn}
                onClick={() => setShowSelector(false)}
              >
                Compare Now →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Vehicle Selector */}
      {showSelector && (
        <div style={styles.selectorSection}>
          <div style={styles.searchBar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search by year, make, model, or stock number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            {searchTerm && (
              <button 
                style={styles.clearSearch}
                onClick={() => setSearchTerm('')}
              >
                ×
              </button>
            )}
          </div>

          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
              <p>Loading inventory...</p>
            </div>
          ) : (
            <div style={styles.vehicleGrid}>
              {filteredInventory.map((vehicle, index) => {
                const stockNum = vehicle.stock_number || vehicle.stockNumber || String(index);
                const isSelected = isVehicleSelected(vehicle);
                const imageUrl = getVehicleImageUrl(vehicle);
                const hasImageError = imageErrors[stockNum];
                
                return (
                  <div 
                    key={stockNum}
                    style={{
                      ...styles.selectorCard,
                      ...(isSelected ? styles.selectorCardSelected : {}),
                    }}
                    onClick={() => toggleVehicleSelection(vehicle)}
                  >
                    {isSelected && (
                      <div style={styles.selectedBadge}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      </div>
                    )}
                    
                    <div style={{
                      ...styles.selectorCardImage,
                      background: getVehicleGradient(vehicle.model),
                    }}>
                      {imageUrl && !hasImageError ? (
                        <img 
                          src={imageUrl} 
                          alt={`${vehicle.year} ${vehicle.model}`}
                          style={styles.selectorImg}
                          onError={() => handleImageError(stockNum)}
                        />
                      ) : (
                        <span style={styles.selectorModelText}>{vehicle.model}</span>
                      )}
                    </div>
                    
                    <div style={styles.selectorCardContent}>
                      <div style={styles.selectorCardTitle}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </div>
                      <div style={styles.selectorCardMeta}>
                        <span>{vehicle.trim || 'Base'}</span>
                        <span style={styles.selectorCardPrice}>
                          {formatPrice(vehicle.msrp || vehicle.price || vehicle.sale_price || vehicle.salePrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Comparison Table */}
      {!showSelector && selectedVehicles.length >= 2 && (
        <div style={styles.comparisonSection}>
          <button 
            style={styles.backToSelector}
            onClick={() => setShowSelector(true)}
          >
            ← Modify Selection
          </button>

          {/* Vehicle Headers */}
          <div style={styles.comparisonHeader}>
            <div style={styles.specLabelHeader}>Specification</div>
            {selectedVehicles.map((vehicle, index) => {
              const stockNum = vehicle.stock_number || vehicle.stockNumber || String(index);
              const imageUrl = getVehicleImageUrl(vehicle);
              const hasImageError = imageErrors[stockNum];
              
              return (
                <div key={stockNum} style={styles.vehicleHeader}>
                  <div style={{
                    ...styles.vehicleHeaderImage,
                    background: getVehicleGradient(vehicle.model),
                  }}>
                    {imageUrl && !hasImageError ? (
                      <img 
                        src={imageUrl} 
                        alt={`${vehicle.year} ${vehicle.model}`}
                        style={styles.headerImg}
                        onError={() => handleImageError(stockNum)}
                      />
                    ) : (
                      <span style={styles.headerModelText}>{vehicle.model}</span>
                    )}
                  </div>
                  <div style={styles.vehicleHeaderInfo}>
                    <h3 style={styles.vehicleHeaderTitle}>
                      {vehicle.year} {vehicle.model}
                    </h3>
                    <p style={styles.vehicleHeaderTrim}>{vehicle.trim || 'Base'}</p>
                    <p style={styles.vehicleHeaderStock}>
                      Stock #{stockNum}
                    </p>
                  </div>
                  <button 
                    style={styles.viewDetailsBtn}
                    onClick={() => handleViewDetails(vehicle)}
                  >
                    View Details
                  </button>
                </div>
              );
            })}
          </div>

          {/* Comparison Rows */}
          <div style={styles.comparisonTable}>
            {comparisonSpecs.map((spec, index) => {
              const differs = valuesDiffer(spec);
              
              return (
                <div 
                  key={spec.key}
                  style={{
                    ...styles.comparisonRow,
                    ...(index % 2 === 0 ? styles.comparisonRowAlt : {}),
                    ...(differs ? styles.comparisonRowDiffers : {}),
                  }}
                >
                  <div style={styles.specLabel}>
                    {spec.label}
                    {differs && (
                      <span style={styles.differsBadge}>Differs</span>
                    )}
                  </div>
                  {selectedVehicles.map((vehicle, vIndex) => {
                    const value = getFormattedValue(vehicle, spec);
                    const isBest = isBestValue(vehicle, spec);
                    
                    return (
                      <div 
                        key={vIndex}
                        style={{
                          ...styles.specValue,
                          ...(isBest ? styles.specValueBest : {}),
                        }}
                      >
                        {value}
                        {isBest && (
                          <span style={styles.bestBadge}>Best</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Features Comparison */}
          {selectedVehicles.some(v => v.features && v.features.length > 0) && (
            <div style={styles.featuresSection}>
              <h3 style={styles.featuresSectionTitle}>Features Comparison</h3>
              <div style={styles.featuresGrid}>
                {selectedVehicles.map((vehicle, index) => {
                  const stockNum = vehicle.stock_number || vehicle.stockNumber || String(index);
                  return (
                    <div key={stockNum} style={styles.featuresColumn}>
                      <h4 style={styles.featuresColumnTitle}>
                        {vehicle.year} {vehicle.model}
                      </h4>
                      <ul style={styles.featuresList}>
                        {(vehicle.features || []).slice(0, 10).map((feature, fIndex) => (
                          <li key={fIndex} style={styles.featureItem}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e" style={{ flexShrink: 0 }}>
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                            {feature}
                          </li>
                        ))}
                        {(!vehicle.features || vehicle.features.length === 0) && (
                          <li style={styles.noFeatures}>No features listed</li>
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={styles.actionBar}>
            <button 
              style={styles.resetBtn}
              onClick={() => {
                setSelectedVehicles([]);
                setShowSelector(true);
              }}
            >
              Start Over
            </button>
            <button 
              style={styles.primaryBtn}
              onClick={() => navigateTo('inventory')}
            >
              Browse More Vehicles
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!showSelector && selectedVehicles.length < 2 && (
        <div style={styles.emptyState}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
            <path d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9V4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5"/>
          </svg>
          <h3 style={styles.emptyStateTitle}>Select at least 2 vehicles to compare</h3>
          <button 
            style={styles.primaryBtn}
            onClick={() => setShowSelector(true)}
          >
            Select Vehicles
          </button>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 40px',
    overflowY: 'auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.6)',
  },
  
  // Selection Bar
  selectionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  selectionPills: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  selectionPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    color: '#ffffff',
    padding: '8px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
  },
  removePillBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: '#ffffff',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '13px',
  },
  selectionActions: {
    display: 'flex',
    gap: '12px',
  },
  addMoreBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#ffffff',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  compareBtn: {
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    color: '#ffffff',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  
  // Selector Section
  selectorSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '12px 20px',
    marginBottom: '20px',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '16px',
    outline: 'none',
  },
  clearSearch: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#ffffff',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '18px',
  },
  loadingContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    color: 'rgba(255,255,255,0.6)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#22c55e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  vehicleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
    overflowY: 'auto',
    paddingBottom: '20px',
  },
  selectorCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '2px solid transparent',
    position: 'relative',
  },
  selectorCardSelected: {
    border: '2px solid #22c55e',
    background: 'rgba(27, 115, 64, 0.1)',
  },
  selectedBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: '#22c55e',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    zIndex: 10,
  },
  selectorCardImage: {
    height: '100px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selectorImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  selectorModelText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '18px',
    fontWeight: '700',
  },
  selectorCardContent: {
    padding: '12px',
  },
  selectorCardTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  selectorCardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
  },
  selectorCardPrice: {
    color: '#4ade80',
    fontWeight: '600',
  },
  
  // Comparison Section
  comparisonSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  backToSelector: {
    alignSelf: 'flex-start',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '20px',
    padding: '8px 0',
  },
  comparisonHeader: {
    display: 'grid',
    gridTemplateColumns: '180px repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '20px',
  },
  specLabelHeader: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    alignSelf: 'end',
    paddingBottom: '16px',
  },
  vehicleHeader: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  vehicleHeaderImage: {
    height: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  headerModelText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '20px',
    fontWeight: '700',
  },
  vehicleHeaderInfo: {
    padding: '16px',
    flex: 1,
  },
  vehicleHeaderTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '4px',
  },
  vehicleHeaderTrim: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '2px',
  },
  vehicleHeaderStock: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
  },
  viewDetailsBtn: {
    background: 'rgba(27, 115, 64, 0.2)',
    border: 'none',
    color: '#4ade80',
    padding: '12px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  
  // Comparison Table
  comparisonTable: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '24px',
  },
  comparisonRow: {
    display: 'grid',
    gridTemplateColumns: '180px repeat(3, 1fr)',
    gap: '16px',
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  comparisonRowAlt: {
    background: 'rgba(255,255,255,0.02)',
  },
  comparisonRowDiffers: {
    background: 'rgba(27, 115, 64, 0.05)',
  },
  specLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  differsBadge: {
    background: 'rgba(251, 191, 36, 0.2)',
    color: '#fbbf24',
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  specValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  specValueBest: {
    color: '#4ade80',
  },
  bestBadge: {
    background: 'rgba(74, 222, 128, 0.2)',
    color: '#4ade80',
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  
  // Features Section
  featuresSection: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
  },
  featuresSectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '16px',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  featuresColumn: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    padding: '16px',
  },
  featuresColumnTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  featuresList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: '1.4',
  },
  noFeatures: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '13px',
    fontStyle: 'italic',
  },
  
  // Action Bar
  actionBar: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    paddingTop: '20px',
  },
  resetBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#ffffff',
    padding: '14px 28px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    color: '#ffffff',
    padding: '14px 28px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  emptyStateTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '8px',
  },
};

// Add CSS animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default VehicleComparison;
