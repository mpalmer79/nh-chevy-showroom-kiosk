import React, { useState, CSSProperties } from 'react';
import type { Vehicle, KioskComponentProps } from '../types';

// Package selection state
interface PackageSelections {
  serviceContract: boolean;
  deficiencyBalance: boolean;
  tireWheel: boolean;
}

// Package definition
interface ProtectionPackage {
  id: keyof PackageSelections;
  name: string;
  tagline: string;
  price: number;
  monthlyEstimate: number;
  duration?: string;
  icon: JSX.Element;
  color: string;
  highlights: string[];
  details: string;
}

// Packages collection type
type PackagesMap = Record<keyof PackageSelections, ProtectionPackage>;

const ProtectionPackages: React.FC<KioskComponentProps> = ({ navigateTo, updateCustomerData, customerData }) => {
  const vehicle = customerData?.selectedVehicle as Vehicle | undefined;
  const customerName = customerData?.customerName;
  
  // Protection package selections
  const [selectedPackages, setSelectedPackages] = useState<PackageSelections>({
    serviceContract: false,
    deficiencyBalance: false,
    tireWheel: false,
  });
  
  // Expanded info sections
  const [expandedPackage, setExpandedPackage] = useState<keyof PackageSelections | null>(null);

  // Package definitions with pricing
  const packages: PackagesMap = {
    serviceContract: {
      id: 'serviceContract',
      name: 'Service Contract',
      tagline: 'Mechanical Breakdown Protection',
      price: 2295,
      monthlyEstimate: 38, // Rough estimate over 60 months
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      ),
      color: '#22c55e',
      highlights: [
        'Covers major mechanical repairs',
        'Engine, transmission, drivetrain',
        'Electrical & A/C systems',
        'Nationwide coverage at any dealer',
        '24/7 roadside assistance included',
      ],
      details: `Protect yourself from unexpected repair costs. Our Service Contract covers mechanical breakdowns beyond your factory warranty, giving you peace of mind for years to come. Coverage includes engine, transmission, drivetrain, electrical systems, air conditioning, and more.`,
    },
    deficiencyBalance: {
      id: 'deficiencyBalance',
      name: 'Deficiency Balance Protection',
      tagline: 'Loan/Lease Shortfall Coverage',
      price: 595,
      monthlyEstimate: 10,
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      ),
      color: '#2563eb',
      highlights: [
        'Covers loan balance if vehicle is totaled',
        'Protects against depreciation gap',
        'Works with insurance settlement',
        'Includes up to $1,000 deductible coverage',
        'Peace of mind for financed vehicles',
      ],
      details: `If your vehicle is totaled or stolen, your insurance pays the actual cash value - which may be less than what you owe. Deficiency Balance Protection covers the difference between your insurance payout and your remaining loan or lease balance, so you're not left paying for a vehicle you can no longer drive.`,
    },
    tireWheel: {
      id: 'tireWheel',
      name: 'Tire & Wheel Protection',
      tagline: '5 Years of Coverage',
      price: 795,
      monthlyEstimate: 13,
      duration: '5 Years',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      ),
      color: '#dc2626',
      highlights: [
        'Covers tire damage from road hazards',
        'Wheel repair or replacement',
        'No deductible on claims',
        'Includes mounting & balancing',
        'Full 5-year coverage period',
      ],
      details: `Roads are unpredictable. Potholes, nails, debris, and curbs can damage your tires and wheels at any time. Our Tire & Wheel Protection covers the cost of repair or replacement due to road hazard damage for a full 5 years - no deductible required.`,
    },
  };

  // Calculate totals
  const calculateTotals = (): { totalPrice: number; totalMonthly: number } => {
    let totalPrice = 0;
    let totalMonthly = 0;
    
    (Object.keys(selectedPackages) as Array<keyof PackageSelections>).forEach(key => {
      if (selectedPackages[key]) {
        totalPrice += packages[key].price;
        totalMonthly += packages[key].monthlyEstimate;
      }
    });
    
    return { totalPrice, totalMonthly };
  };

  const { totalPrice, totalMonthly } = calculateTotals();
  const selectedCount = Object.values(selectedPackages).filter(Boolean).length;

  const togglePackage = (packageId: keyof PackageSelections): void => {
    setSelectedPackages(prev => ({
      ...prev,
      [packageId]: !prev[packageId],
    }));
  };

  const toggleExpanded = (packageId: keyof PackageSelections): void => {
    setExpandedPackage(expandedPackage === packageId ? null : packageId);
  };

  const handleContinue = (): void => {
    // Save selected packages to customer data
    const selectedProtection: Array<{ id: string; name: string; price: number }> = [];
    (Object.keys(selectedPackages) as Array<keyof PackageSelections>).forEach(key => {
      if (selectedPackages[key]) {
        selectedProtection.push({
          id: key,
          name: packages[key].name,
          price: packages[key].price,
        });
      }
    });
    
    updateCustomerData({
      protectionPackages: selectedProtection,
      protectionTotal: totalPrice,
    });
    
    // Navigate to handoff
    navigateTo('handoff');
  };

  const handleSkip = (): void => {
    updateCustomerData({
      protectionPackages: [],
      protectionTotal: 0,
    });
    navigateTo('handoff');
  };

  // Get gradient for vehicle display
  const vehicleGradient = (vehicle as Vehicle & { gradient?: string })?.gradient || 'linear-gradient(135deg, #4b5563 0%, #374151 100%)';

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigateTo('vehicleDetail')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        
        <div style={styles.headerContent}>
          <h1 style={styles.title}>
            {customerName ? `${customerName}, protect your investment` : 'Protect Your Investment'}
          </h1>
          <p style={styles.subtitle}>
            Add coverage to your new vehicle for peace of mind
          </p>
        </div>
      </div>

      {/* Vehicle Context */}
      {vehicle && (
        <div style={styles.vehicleContext}>
          <div style={{ ...styles.vehicleThumb, background: vehicleGradient }}>
            <span style={styles.vehicleInitial}>{(vehicle.model || 'V').charAt(0)}</span>
          </div>
          <div style={styles.vehicleInfo}>
            <span style={styles.vehicleName}>{vehicle.year} {vehicle.make} {vehicle.model}</span>
            <span style={styles.vehicleTrim}>{vehicle.trim}</span>
          </div>
        </div>
      )}

      {/* Package Cards */}
      <div style={styles.packagesGrid}>
        {Object.values(packages).map((pkg) => (
          <div 
            key={pkg.id}
            style={{
              ...styles.packageCard,
              borderColor: selectedPackages[pkg.id] ? pkg.color : 'rgba(255,255,255,0.1)',
              background: selectedPackages[pkg.id] 
                ? `linear-gradient(135deg, ${pkg.color}15 0%, ${pkg.color}05 100%)`
                : 'rgba(255,255,255,0.02)',
            }}
          >
            {/* Card Header */}
            <div style={styles.cardHeader}>
              <div style={{ ...styles.packageIcon, background: `${pkg.color}20`, color: pkg.color }}>
                {pkg.icon}
              </div>
              <div style={styles.packageHeaderInfo}>
                <h3 style={styles.packageName}>{pkg.name}</h3>
                <p style={styles.packageTagline}>{pkg.tagline}</p>
              </div>
              <div style={styles.packagePricing}>
                <span style={styles.packagePrice}>${pkg.price.toLocaleString()}</span>
                <span style={styles.packageMonthly}>~${pkg.monthlyEstimate}/mo</span>
              </div>
            </div>

            {/* Highlights */}
            <div style={styles.highlights}>
              {pkg.highlights.slice(0, 3).map((highlight, idx) => (
                <div key={idx} style={styles.highlightItem}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={pkg.color} strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>{highlight}</span>
                </div>
              ))}
            </div>

            {/* Expanded Details */}
            {expandedPackage === pkg.id && (
              <div style={styles.expandedSection}>
                <p style={styles.expandedText}>{pkg.details}</p>
                <div style={styles.allHighlights}>
                  {pkg.highlights.map((highlight, idx) => (
                    <div key={idx} style={styles.highlightItem}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={pkg.color} strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Card Actions */}
            <div style={styles.cardActions}>
              <button 
                style={styles.learnMoreButton}
                onClick={() => toggleExpanded(pkg.id)}
              >
                {expandedPackage === pkg.id ? 'Show Less' : 'Learn More'}
              </button>
              
              <button
                style={{
                  ...styles.selectButton,
                  background: selectedPackages[pkg.id] 
                    ? pkg.color 
                    : 'transparent',
                  borderColor: pkg.color,
                  color: selectedPackages[pkg.id] ? '#ffffff' : pkg.color,
                }}
                onClick={() => togglePackage(pkg.id)}
              >
                {selectedPackages[pkg.id] ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Added
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Add Protection
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div style={styles.footer}>
        <div style={styles.summarySection}>
          {selectedCount > 0 ? (
            <>
              <div style={styles.summaryInfo}>
                <span style={styles.summaryLabel}>
                  {selectedCount} protection{selectedCount > 1 ? 's' : ''} selected
                </span>
                <span style={styles.summaryTotal}>
                  ${totalPrice.toLocaleString()} total
                </span>
                <span style={styles.summaryMonthly}>
                  ~${totalMonthly}/mo added to payment
                </span>
              </div>
            </>
          ) : (
            <div style={styles.summaryInfo}>
              <span style={styles.noSelectionText}>
                No protection packages selected
              </span>
            </div>
          )}
        </div>

        <div style={styles.footerActions}>
          <button style={styles.skipButton} onClick={handleSkip}>
            No Thanks, Continue
          </button>
          <button 
            style={{
              ...styles.continueButton,
              opacity: selectedCount > 0 ? 1 : 0.5,
            }}
            onClick={handleContinue}
          >
            {selectedCount > 0 ? 'Continue with Protection' : 'Continue'}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 40px',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '24px',
    marginBottom: '24px',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.6)',
    margin: 0,
  },
  vehicleContext: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  vehicleThumb: {
    width: '50px',
    height: '50px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInitial: {
    fontSize: '24px',
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
  vehicleTrim: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
  },
  packagesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    flex: 1,
    marginBottom: '24px',
  },
  packageCard: {
    borderRadius: '16px',
    border: '2px solid rgba(255,255,255,0.1)',
    padding: '24px',
    transition: 'all 0.3s ease',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
  },
  packageIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  packageHeaderInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 4px 0',
  },
  packageTagline: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    margin: 0,
  },
  packagePricing: {
    textAlign: 'right',
  },
  packagePrice: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
  },
  packageMonthly: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
  },
  highlights: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px 16px',
    marginBottom: '16px',
  },
  highlightItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
  },
  expandedSection: {
    padding: '16px 0',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '16px',
  },
  expandedText: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: '1.6',
    margin: '0 0 16px 0',
  },
  allHighlights: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  learnMoreButton: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '8px 0',
  },
  selectButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '10px',
    border: '2px solid',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    marginTop: 'auto',
  },
  summarySection: {
    flex: 1,
  },
  summaryInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  summaryLabel: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
  },
  summaryTotal: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#4ade80',
  },
  summaryMonthly: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
  },
  noSelectionText: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
  },
  footerActions: {
    display: 'flex',
    gap: '12px',
  },
  skipButton: {
    padding: '14px 24px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  continueButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
};

export default ProtectionPackages;
