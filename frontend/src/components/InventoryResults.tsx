import React, { useState, useEffect, ChangeEvent, CSSProperties, MouseEvent } from 'react';
import api from './api';
import type { Vehicle, KioskComponentProps } from '../types';

type SortOption = 'recommended' | 'priceLow' | 'priceHigh' | 'newest';

// Generate gradient based on color
const getGradient = (color?: string): string => {
  const colorMap: Record<string, string> = {
    'white': 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
    'black': 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
    'red': 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
    'blue': 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
    'silver': 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
    'gray': 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    'beige': 'linear-gradient(135deg, #d4b896 0%, #a78b6c 100%)',
    'cypress': 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
    'polar': 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)',
  };
  const lowerColor = (color || '').toLowerCase();
  return Object.entries(colorMap).find(([key]) => lowerColor.includes(key))?.[1] 
    || 'linear-gradient(135deg, #4b5563 0%, #374151 100%)';
};

// Format price without decimals
const formatPrice = (price?: number): string => {
  return Math.round(price || 0).toLocaleString();
};

// Map color descriptions to base color categories
// Handles truncated color names (e.g., "Blu" → "blue", "Whi" → "white")
const getColorCategory = (colorDesc: string): string => {
  const c = colorDesc.toLowerCase().trim();
  
  // If empty or too short, return empty
  if (c.length < 2) return '';
  
  // Define color mappings with keywords and partial matches
  const colorMappings: Array<{ category: string; keywords: string[] }> = [
    { category: 'black', keywords: ['black', 'blac', 'bla', 'mosaic', 'onyx', 'ebony'] },
    { category: 'white', keywords: ['white', 'whit', 'whi', 'summit', 'arctic', 'polar', 'iridescent', 'pearl'] },
    { category: 'red', keywords: ['red', 'cherry', 'cajun', 'radiant', 'garnet', 'crimson', 'apex'] },
    { category: 'blue', keywords: ['blue', 'blu', 'northsky', 'glacier', 'reef', 'midnight', 'navy', 'lakeshore'] },
    { category: 'gray', keywords: ['gray', 'grey', 'gra', 'shadow', 'sterling', 'satin steel', 'graphite'] },
    { category: 'silver', keywords: ['silver', 'silve', 'silv', 'sil'] },
    { category: 'green', keywords: ['green', 'gree', 'gre', 'woodland', 'evergreen', 'forest'] },
    { category: 'orange', keywords: ['orange', 'orang', 'oran', 'ora', 'tangier', 'cayenne'] },
    { category: 'yellow', keywords: ['yellow', 'yello', 'yell', 'yel', 'accelerate', 'nitro'] },
    { category: 'brown', keywords: ['brown', 'brow', 'bro', 'harvest', 'auburn', 'bronze'] },
  ];
  
  // Check each color mapping
  for (const mapping of colorMappings) {
    for (const keyword of mapping.keywords) {
      // Check if color contains keyword OR keyword starts with color (for truncated names)
      if (c.includes(keyword) || (keyword.startsWith(c) && c.length >= 2)) {
        return mapping.category;
      }
    }
  }
  
  return '';
};

// Get vehicle image URL based on model and color rules
// PRIORITIZE local images over API URLs (API URLs often fail)
// Supports multiple formats: tries .jpg by default, .avif as fallback
const getVehicleImageUrl = (vehicle: Vehicle, useAvif = false): string | null => {
  const fullModel = (vehicle.model || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const baseModel = fullModel.replace(/-ev$/, '').replace(/-hd$/, '').replace(/\d+$/, '');
  const exteriorColor = (vehicle.exteriorColor || vehicle.exterior_color || '').toLowerCase();
  const colorCategory = getColorCategory(exteriorColor);
  const modelForImage = baseModel || fullModel;
  const ext = useAvif ? 'avif' : 'jpg';
  
  // Try local image first (most reliable)
  if (modelForImage && colorCategory) {
    return `/images/vehicles/${modelForImage}-${colorCategory}.${ext}`;
  }
  if (modelForImage) {
    return `/images/vehicles/${modelForImage}.${ext}`;
  }
  
  // Fall back to API URLs only if no local path can be generated
  if (vehicle.imageUrl) return vehicle.imageUrl;
  if (vehicle.image_url) return vehicle.image_url;
  if (vehicle.images && vehicle.images.length > 0) return vehicle.images[0];
  
  return null;
};

const InventoryResults: React.FC<KioskComponentProps> = ({ navigateTo, updateCustomerData, customerData }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>((customerData?.sortBy as SortOption) || 'recommended');
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  // Track vehicles that should retry with .avif after .jpg failed
  const [avifRetry, setAvifRetry] = useState<Set<string>>(new Set());

  // Handle image load error - try .avif fallback before showing placeholder
  const handleImageError = (vehicleId: string) => {
    if (!avifRetry.has(vehicleId)) {
      // First failure (.jpg) - try .avif next
      setAvifRetry(prev => new Set(prev).add(vehicleId));
    } else {
      // Second failure (.avif also failed) - show placeholder
      setFailedImages(prev => new Set(prev).add(vehicleId));
    }
  };

  // Handle vehicle card click - navigate to VehicleDetail page
  const handleVehicleClick = (vehicle: Vehicle): void => {
    const enrichedVehicle = {
      ...vehicle,
      gradient: getGradient(vehicle.exteriorColor || vehicle.exterior_color),
      rebates: [
        { name: 'Customer Cash', amount: 3000 },
        { name: 'Bonus Cash', amount: 1000 },
      ],
    };
    updateCustomerData({ selectedVehicle: enrichedVehicle });
    navigateTo('vehicleDetail');
  };

  useEffect(() => {
    const fetchVehicles = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      
      try {
        const params: Record<string, string | number> = {};
        
        if (customerData?.selectedModel) {
          params.model = customerData.selectedModel;
        }
        
        // Only apply budget filter if user went through model/budget selection flow
        // NOT when browsing all inventory (path === 'browse' or no selectedModel)
        if (customerData?.budgetRange && customerData?.selectedModel) {
          params.minPrice = customerData.budgetRange.min * 60;
          params.maxPrice = customerData.budgetRange.max * 80;
        }
        
        if (customerData?.selectedCab) {
          params.cabType = customerData.selectedCab;
        }
        
        if (customerData?.preferences?.bodyStyle) {
          params.bodyType = customerData.preferences.bodyStyle;
        }
        
        // Add bodyStyleFilter to API params if set
        if (customerData?.bodyStyleFilter) {
          params.body_style = customerData.bodyStyleFilter;
        }
        
        const data = await api.getInventory(params);
        
        let vehicleList: Vehicle[] = Array.isArray(data) ? data : (data as { vehicles?: Vehicle[] })?.vehicles || [];
        
        // CLIENT-SIDE EXACT MODEL FILTERING
        if (customerData?.selectedModel) {
          const targetModel = customerData.selectedModel.toLowerCase().trim();
          
          vehicleList = vehicleList.filter((vehicle: Vehicle) => {
            const rawModel = vehicle.model || '';
            const vehicleModel = rawModel.toLowerCase().trim();
            
            if (vehicleModel === targetModel) return true;
            if (vehicleModel.startsWith(targetModel + ' ')) return true;
            if (vehicleModel.startsWith(targetModel)) {
              const nextChar = vehicleModel.charAt(targetModel.length);
              return !nextChar || nextChar === ' ' || !/\d/.test(nextChar);
            }
            return false;
          });
        }
        
        // CLIENT-SIDE BODY STYLE FILTERING (SUV vs Truck)
        if (customerData?.bodyStyleFilter) {
          const targetBodyStyle = customerData.bodyStyleFilter.toLowerCase();
          
          vehicleList = vehicleList.filter((vehicle: Vehicle) => {
            const bodyStyle = (vehicle.bodyStyle || vehicle.body_style || '').toLowerCase();
            const model = (vehicle.model || '').toLowerCase();
            
            if (targetBodyStyle === 'truck') {
              // Trucks: Silverado, Colorado - NEVER Traverse, Tahoe, etc.
              if (model.includes('silverado') || model.includes('colorado')) {
                return true;
              }
              // Also check bodyStyle field
              if (bodyStyle === 'truck') {
                return true;
              }
              return false;
            }
            
            if (targetBodyStyle === 'suv') {
              // SUVs: Traverse, Tahoe, Suburban, Equinox, Trailblazer, Trax, Blazer
              // NEVER Silverado or Colorado
              if (model.includes('silverado') || model.includes('colorado')) {
                return false;
              }
              const suvModels = ['traverse', 'tahoe', 'suburban', 'equinox', 'trailblazer', 'trax', 'blazer'];
              if (suvModels.some(suv => model.includes(suv))) {
                return true;
              }
              // Also check bodyStyle field
              if (bodyStyle === 'suv') {
                return true;
              }
              return false;
            }
            
            // For other body styles, match directly
            return bodyStyle === targetBodyStyle;
          });
        }
        
        // Filter by cab type if specified
        if (customerData?.selectedCab) {
          const targetCab = customerData.selectedCab.toLowerCase();
          vehicleList = vehicleList.filter((vehicle: Vehicle) => {
            const cab = (
              (vehicle as Record<string, unknown>).cabStyle ||
              vehicle.cabType || 
              vehicle.bodyStyle || 
              vehicle.body_style || 
              (vehicle as Record<string, unknown>).body ||
              (vehicle as Record<string, unknown>).Body ||
              ''
            ).toString().toLowerCase(); 
            
            const cabMappings: Record<string, string[]> = {
              'regular': ['regular', 'reg'],
              'double': ['double', 'dbl'],
              'crew': ['crew'],
              'extended': ['extended', 'ext'],
            };
            
            const cabKeyword = targetCab.split(' ')[0];
            const keywords = cabMappings[cabKeyword] || [cabKeyword];
            
            return keywords.some(kw => cab.includes(kw));
          });
        }
        
        // Sort by color preferences if provided
        if (customerData?.colorPreferences && customerData.colorPreferences.length > 0) {
          const colorPrefs = customerData.colorPreferences.map((c: string) => c.toLowerCase());
          vehicleList = vehicleList.sort((a: Vehicle, b: Vehicle) => {
            const aColor = (a.exteriorColor || a.exterior_color || '').toLowerCase();
            const bColor = (b.exteriorColor || b.exterior_color || '').toLowerCase();
            
            const getMatchIndex = (color: string): number => {
              for (let i = 0; i < colorPrefs.length; i++) {
                const keyword = colorPrefs[i].split(' ')[0];
                if (color.includes(keyword)) return i;
              }
              return 999;
            };
            
            return getMatchIndex(aColor) - getMatchIndex(bColor);
          });
        }
        
        setVehicles(vehicleList);
      } catch {
        setError('Unable to load inventory. Please try again.');
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [customerData]);

  // Apply additional client-side filtering as a safety net
  const filteredVehicles = vehicles.filter((vehicle: Vehicle) => {
    if (!customerData?.selectedModel) return true;
    
    const targetModel = customerData.selectedModel.toLowerCase().trim();
    const vehicleModel = (vehicle.model || '').toLowerCase().trim();
    
    return vehicleModel === targetModel || 
           vehicleModel.startsWith(targetModel + ' ') ||
           (vehicleModel.startsWith(targetModel) && !/\d/.test(vehicleModel.charAt(targetModel.length)));
  });

  const sortedVehicles = [...filteredVehicles].sort((a: Vehicle, b: Vehicle) => {
    switch (sortBy) {
      case 'priceLow': return (a.price || 0) - (b.price || 0);
      case 'priceHigh': return (b.price || 0) - (a.price || 0);
      case 'newest': return (b.year || 0) - (a.year || 0);
      default: return ((b as Vehicle & { matchScore?: number }).matchScore || 50) - ((a as Vehicle & { matchScore?: number }).matchScore || 50);
    }
  });

  // Get the appropriate title based on path and filters
  const getTitle = (): string => {
    // Check for body style filter first
    if (customerData?.bodyStyleFilter) {
      if (customerData.bodyStyleFilter === 'SUV') return 'SUVs';
      if (customerData.bodyStyleFilter === 'Truck') return 'Trucks';
      return `${customerData.bodyStyleFilter} Inventory`;
    }
    if (customerData?.path === 'browse') return 'All Inventory';
    if (customerData?.quizAnswers && Object.keys(customerData.quizAnswers).length > 0) {
      return 'Recommended For You';
    }
    if (customerData?.selectedModel) return `${customerData.selectedModel} Inventory`;
    return 'All Inventory';
  };

  // Get subtitle based on filter
  const getSubtitle = (): string => {
    if (customerData?.bodyStyleFilter) {
      return `Showing all ${customerData.bodyStyleFilter.toLowerCase()}s in stock`;
    }
    if (customerData?.path === 'browse') {
      return 'Browse our complete inventory';
    }
    return 'Sorted by best match based on your preferences';
  };

  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    setSortBy(e.target.value as SortOption);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>Loading inventory...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <p style={styles.errorText}>{error}</p>
        <button style={styles.retryButton} onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>
            {getTitle()}
            <span style={styles.matchCount}> ({filteredVehicles.length})</span>
          </h1>
          <p style={styles.subtitle}>{getSubtitle()}</p>
        </div>

        <div style={styles.headerRight}>
          <button
            style={styles.compareButton}
            onClick={() => navigateTo('vehicleComparison')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9V4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5"/>
            </svg>
            Compare
          </button>
          <select 
            style={styles.sortSelect}
            value={sortBy}
            onChange={handleSortChange}
          >
            <option value="recommended">Best Match</option>
            <option value="priceLow">Price: Low to High</option>
            <option value="priceHigh">Price: High to Low</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {/* Vehicle Grid */}
      {sortedVehicles.length > 0 ? (
        <div style={styles.vehicleGrid}>
          {sortedVehicles.map((vehicle, index) => {
            const vehicleWithScore = vehicle as Vehicle & { matchScore?: number };
            const exteriorColor = vehicle.exteriorColor || vehicle.exterior_color || '';
            const stockNumber = vehicle.stockNumber || vehicle.stock_number || '';
            const vehicleId = String(vehicle.id || stockNumber || index);
            const imageUrl = getVehicleImageUrl(vehicle, avifRetry.has(vehicleId));
            const showImage = imageUrl && !failedImages.has(vehicleId);
            
            return (
              <div 
                key={vehicleId}
                style={styles.vehicleCard}
                onClick={() => handleVehicleClick(vehicle)}
                title="View on dealership inventory site"
              >
                {/* Match Score - only show if from quiz */}
                {vehicleWithScore.matchScore && customerData?.quizAnswers && (
                  <div style={styles.matchBadge}>
                    <span style={styles.matchScore}>{vehicleWithScore.matchScore}%</span>
                    <span style={styles.matchLabel}>Match</span>
                  </div>
                )}

                {/* Vehicle Image */}
                <div style={{ 
                  ...styles.vehicleImage, 
                  background: showImage ? '#1a1a1a' : getGradient(exteriorColor) 
                }}>
                  {showImage ? (
                    <img 
                      src={imageUrl}
                      alt={`${vehicle.year} ${vehicle.make || 'Chevrolet'} ${vehicle.model}`}
                      style={styles.vehicleImg}
                      onError={() => handleImageError(vehicleId)}
                    />
                  ) : (
                    <span style={styles.vehicleInitial}>{(vehicle.model || 'V').charAt(0)}</span>
                  )}
                  <div style={styles.statusBadge}>
                    <span style={{
                      ...styles.statusDot,
                      background: vehicle.status === 'In Stock' ? '#4ade80' : '#fbbf24',
                    }} />
                    {vehicle.status || 'In Stock'}
                  </div>
                </div>

                {/* Vehicle Info */}
                <div style={styles.vehicleInfo}>
                  <div style={styles.vehicleHeader}>
                    <div>
                      <h3 style={styles.vehicleName}>{vehicle.year} {vehicle.model}</h3>
                      <p style={styles.vehicleTrim}>{vehicle.trim}</p>
                    </div>
                    <span style={styles.stockNumber}>STK# {stockNumber}</span>
                  </div>

                  <div style={styles.vehicleColor}>
                    <div style={{ ...styles.colorSwatch, background: getGradient(exteriorColor) }} />
                    {exteriorColor}
                  </div>

                  {/* Features */}
                  {vehicle.features && vehicle.features.length > 0 && (
                    <div style={styles.featureTags}>
                      {vehicle.features.slice(0, 3).map((feature, idx) => (
                        <span key={idx} style={styles.featureTag}>{feature}</span>
                      ))}
                    </div>
                  )}

                  {/* Pricing */}
                  <div style={styles.pricingSection}>
                    <div style={styles.priceColumn}>
                      <span style={styles.priceLabel}>MSRP</span>
                      <span style={styles.msrpValue}>${formatPrice(vehicle.msrp || vehicle.price)}</span>
                    </div>
                    <div style={styles.paymentColumn}>
                      <span style={styles.priceLabel}>Your Price</span>
                      <span style={styles.paymentValue}>
                        ${formatPrice(vehicle.price)}
                      </span>
                    </div>
                  </div>

                  <button 
                    style={styles.viewDetailsButton}
                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      handleVehicleClick(vehicle);
                    }}
                  >
                    View Details
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={styles.noResults}>
          <div style={styles.noResultsIcon}>🔍</div>
          <h3 style={styles.noResultsTitle}>No vehicles match your criteria</h3>
          <p style={styles.noResultsText}>Try adjusting your filters or preferences</p>
        </div>
      )}

      {/* Refine Search */}
      <div style={styles.refineSection}>
        <p style={styles.refineText}>Not seeing what you're looking for?</p>
        <button style={styles.refineButton} onClick={() => {
          updateCustomerData({ 
            selectedModel: undefined, 
            bodyStyleFilter: undefined, 
            selectedCab: undefined 
          });
          navigateTo('welcome');
        }}>
          Start Over
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    maxHeight: '100vh',
    padding: '32px 40px',
    overflowY: 'auto',
    overflowX: 'hidden',
    boxSizing: 'border-box',
    background: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
  },
  loadingSpinner: {
    width: '48px',
    height: '48px',
    border: '4px solid rgba(0,0,0,0.1)',
    borderTopColor: '#22c55e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '18px',
    color: 'rgba(0,0,0,0.6)',
  },
  errorContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  errorIcon: {
    fontSize: '48px',
  },
  errorText: {
    fontSize: '18px',
    color: 'rgba(0,0,0,0.6)',
  },
  retryButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(34,197,94,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerLeft: {
    background: 'rgba(30, 41, 59, 0.95)',
    padding: '16px 24px',
    borderRadius: '12px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 4px 0',
  },
  matchCount: {
    color: '#4ade80',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    margin: 0,
  },
  sortSelect: {
    padding: '10px 16px',
    background: 'rgba(30, 41, 59, 0.95)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  compareButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: 'rgba(30, 41, 59, 0.95)',
    border: '1px solid rgba(34,197,94,0.4)',
    borderRadius: '10px',
    color: '#4ade80',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  vehicleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
    marginBottom: '40px',
    padding: '24px',
    background: 'rgba(241, 245, 249, 0.6)',
    borderRadius: '16px',
  },
  vehicleCard: {
    background: '#ffffff',
    borderRadius: '20px',
    border: '1px solid rgba(0,0,0,0.08)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  matchBadge: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 14px',
    background: 'linear-gradient(135deg, rgba(34,197,94,0.9) 0%, rgba(22,163,74,0.9) 100%)',
    borderRadius: '12px',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
  },
  matchScore: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#ffffff',
    textShadow: '0 2px 4px rgba(255,255,255,0.06)',
  },
  matchLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
  },
  vehicleImage: {
    height: '180px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  vehicleImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  vehicleInitial: {
    fontSize: '72px',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.2)',
  },
  statusBadge: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'rgba(0,0,0,0.5)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#ffffff',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  vehicleInfo: {
    padding: '20px',
  },
  vehicleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  vehicleName: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  vehicleTrim: {
    fontSize: '13px',
    color: '#1e293b',
    margin: '2px 0 0 0',
  },
  stockNumber: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#1e293b',
  },
  vehicleColor: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#1e293b',
    marginBottom: '12px',
  },
  colorSwatch: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '2px solid rgba(0,0,0,0.1)',
  },
  featureTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '16px',
  },
  featureTag: {
    padding: '6px 12px',
    background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(16,185,129,0.1) 100%)',
    borderRadius: '14px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#16a34a',
    border: '1px solid rgba(34,197,94,0.3)',
  },
  pricingSection: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '14px',
    background: 'linear-gradient(135deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.01) 100%)',
    borderRadius: '12px',
    marginBottom: '16px',
    border: '1px solid rgba(0,0,0,0.05)',
  },
  priceColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  paymentColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#1e293b',
    textTransform: 'uppercase',
  },
  msrpValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
  },
  paymentValue: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#4ade80',
    textShadow: '0 0 20px rgba(74,222,128,0.3)',
  },
  viewDetailsButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(34,197,94,0.3)',
    transition: 'all 0.2s ease',
  },
  noResults: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  noResultsIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  noResultsTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  noResultsText: {
    fontSize: '16px',
    color: 'rgba(0,0,0,0.5)',
  },
  refineSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '24px',
    background: 'linear-gradient(145deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.01) 100%)',
    borderRadius: '16px',
    border: '1px solid rgba(0,0,0,0.08)',
  },
  refineText: {
    fontSize: '14px',
    color: 'rgba(0,0,0,0.5)',
    margin: 0,
  },
  refineButton: {
    padding: '10px 20px',
    background: 'rgba(30, 41, 59, 0.95)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default InventoryResults;
