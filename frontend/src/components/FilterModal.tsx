import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterState {
  bodyStyle: string;
  fuelType: string;
  priceRange: string;
  drivetrain: string;
}

interface FilterOption {
  value: string;
  label: string;
  icon?: string;
}

interface PriceRange extends FilterOption {
  min: number | null;
  max: number | null;
}

interface AppliedFilters extends FilterState {
  minPrice?: number | null;
  maxPrice?: number | null;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: AppliedFilters) => void;
  currentFilters?: Partial<FilterState>;
}

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply, currentFilters = {} }) => {
  const [filters, setFilters] = useState<FilterState>({
    bodyStyle: currentFilters.bodyStyle || '',
    fuelType: currentFilters.fuelType || '',
    priceRange: currentFilters.priceRange || '',
    drivetrain: currentFilters.drivetrain || '',
  });

  const bodyStyles: FilterOption[] = [
    { value: '', label: 'All Types', icon: '🚗' },
    { value: 'SUV', label: 'SUV', icon: '🚙' },
    { value: 'Truck', label: 'Truck', icon: '🛻' },
    { value: 'Sedan', label: 'Sedan', icon: '🚗' },
    { value: 'Coupe', label: 'Coupe', icon: '🏎️' },
    { value: 'Van', label: 'Van', icon: '🚐' },
    { value: 'Convertible', label: 'Convertible', icon: '🚗' },
  ];

  const fuelTypes: FilterOption[] = [
    { value: '', label: 'All Fuel Types', icon: '⛽' },
    { value: 'Gasoline', label: 'Gasoline', icon: '⛽' },
    { value: 'Electric', label: 'Electric', icon: '⚡' },
    { value: 'Hybrid', label: 'Hybrid', icon: '🔋' },
  ];

  const priceRanges: PriceRange[] = [
    { value: '', label: 'Any Price', min: null, max: null },
    { value: 'under40', label: 'Under $40,000', min: null, max: 40000 },
    { value: '40to60', label: '$40,000 - $60,000', min: 40000, max: 60000 },
    { value: '60to80', label: '$60,000 - $80,000', min: 60000, max: 80000 },
    { value: 'over80', label: 'Over $80,000', min: 80000, max: null },
  ];

  const drivetrains: FilterOption[] = [
    { value: '', label: 'All Drivetrains' },
    { value: '4WD', label: '4WD' },
    { value: 'AWD', label: 'AWD' },
    { value: 'FWD', label: 'FWD' },
    { value: 'RWD', label: 'RWD' },
  ];

  const handleFilterChange = (key: keyof FilterState, value: string): void => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = (): void => {
    const priceRange = priceRanges.find((p) => p.value === filters.priceRange);
    onApply({
      ...filters,
      minPrice: priceRange?.min,
      maxPrice: priceRange?.max,
    });
    onClose();
  };

  const handleClear = (): void => {
    setFilters({
      bodyStyle: '',
      fuelType: '',
      priceRange: '',
      drivetrain: '',
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        style={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          style={styles.modal}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <div style={styles.header}>
            <h2 style={styles.title}>Filter Vehicles</h2>
            <button style={styles.closeButton} onClick={onClose}>
              ✕
            </button>
          </div>

          <div style={styles.content}>
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Body Style</h3>
              <div style={styles.optionGrid}>
                {bodyStyles.map((option) => (
                  <button
                    key={option.value}
                    style={{
                      ...styles.optionButton,
                      ...(filters.bodyStyle === option.value ? styles.optionActive : {}),
                    }}
                    onClick={() => handleFilterChange('bodyStyle', option.value)}
                  >
                    <span style={styles.optionIcon}>{option.icon}</span>
                    <span style={styles.optionLabel}>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Fuel Type</h3>
              <div style={styles.optionGrid}>
                {fuelTypes.map((option) => (
                  <button
                    key={option.value}
                    style={{
                      ...styles.optionButton,
                      ...(filters.fuelType === option.value ? styles.optionActive : {}),
                    }}
                    onClick={() => handleFilterChange('fuelType', option.value)}
                  >
                    <span style={styles.optionIcon}>{option.icon}</span>
                    <span style={styles.optionLabel}>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Price Range</h3>
              <div style={styles.optionList}>
                {priceRanges.map((option) => (
                  <button
                    key={option.value}
                    style={{
                      ...styles.listButton,
                      ...(filters.priceRange === option.value ? styles.listButtonActive : {}),
                    }}
                    onClick={() => handleFilterChange('priceRange', option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Drivetrain</h3>
              <div style={styles.optionRow}>
                {drivetrains.map((option) => (
                  <button
                    key={option.value}
                    style={{
                      ...styles.chipButton,
                      ...(filters.drivetrain === option.value ? styles.chipActive : {}),
                    }}
                    onClick={() => handleFilterChange('drivetrain', option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={styles.footer}>
            <button style={styles.clearButton} onClick={handleClear}>
              Clear All
            </button>
            <button style={styles.applyButton} onClick={handleApply}>
              Apply Filters
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modal: {
    background: '#1a1a1a',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px',
    borderBottom: '1px solid #2a2a2a',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  closeButton: {
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#242424',
    border: 'none',
    borderRadius: '50%',
    color: '#ffffff',
    fontSize: '1.25rem',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#a0a0a0',
    marginBottom: '16px',
  },
  optionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  optionButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    background: '#242424',
    border: '2px solid #2a2a2a',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  optionActive: {
    background: 'rgba(26, 71, 42, 0.3)',
    borderColor: '#1a472a',
  },
  optionIcon: {
    fontSize: '1.5rem',
  },
  optionLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#ffffff',
  },
  optionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  listButton: {
    width: '100%',
    padding: '16px',
    background: '#242424',
    border: '2px solid #2a2a2a',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 500,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  listButtonActive: {
    background: 'rgba(26, 71, 42, 0.3)',
    borderColor: '#1a472a',
  },
  optionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  chipButton: {
    padding: '12px 20px',
    background: '#242424',
    border: '2px solid #2a2a2a',
    borderRadius: '24px',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  chipActive: {
    background: 'rgba(26, 71, 42, 0.3)',
    borderColor: '#1a472a',
  },
  footer: {
    display: 'flex',
    gap: '12px',
    padding: '24px',
    borderTop: '1px solid #2a2a2a',
  },
  clearButton: {
    flex: 1,
    padding: '16px',
    background: '#242424',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  applyButton: {
    flex: 2,
    padding: '16px',
    background: '#1a472a',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default FilterModal;
