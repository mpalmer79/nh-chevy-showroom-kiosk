import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import VehicleCard from '../components/VehicleCard';
import FilterModal from '../components/FilterModal';
import api from '../components/api';
import type { Vehicle } from '../types';

interface Filters {
  bodyStyle?: string;
  fuelType?: string;
  priceRange?: string;
  drivetrain?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  [key: string]: string | number | null | undefined;
}

interface InventoryParams {
  bodyType?: string;
  fuelType?: string;
  minPrice?: number;
  maxPrice?: number;
}

interface InventoryStats {
  total: number;
  byBodyStyle?: Record<string, number>;
  priceRange?: { min: number; max: number };
}

const HomePage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>({});
  const [stats, setStats] = useState<InventoryStats | null>(null);

  useEffect(() => {
    loadInventory();
    loadStats();
  }, []);

  const loadInventory = async (appliedFilters: Filters = {}): Promise<void> => {
    try {
      setLoading(true);

      const params: InventoryParams = {};
      if (appliedFilters.bodyStyle) params.bodyType = appliedFilters.bodyStyle;
      if (appliedFilters.fuelType) params.fuelType = appliedFilters.fuelType;
      if (appliedFilters.minPrice) params.minPrice = appliedFilters.minPrice;
      if (appliedFilters.maxPrice) params.maxPrice = appliedFilters.maxPrice;

      const data = await api.getInventory(params);
      const vehicleList: Vehicle[] = Array.isArray(data) ? data : (data as { vehicles?: Vehicle[] })?.vehicles || [];
      setVehicles(vehicleList);
      setError(null);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (): Promise<void> => {
    try {
      const data = await api.getInventoryStats();
      setStats(data as unknown as InventoryStats);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleApplyFilters = (newFilters: Filters): void => {
    setFilters(newFilters);
    loadInventory(newFilters);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v);

  return (
    <div style={styles.container}>
      {/* Quick Stats */}
      {stats && (
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{stats.total}</span>
            <span style={styles.statLabel}>Vehicles In Stock</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>
              {stats.byBodyStyle?.SUV || 0}
            </span>
            <span style={styles.statLabel}>SUVs</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>
              {stats.byBodyStyle?.Truck || 0}
            </span>
            <span style={styles.statLabel}>Trucks</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>
              ${Math.round((stats.priceRange?.min || 0) / 1000)}K
            </span>
            <span style={styles.statLabel}>Starting At</span>
          </div>
        </div>
      )}

      {/* All Inventory */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>
            {hasActiveFilters ? 'Filtered Results' : 'All Inventory'}
            <span style={styles.resultCount}>({vehicles.length})</span>
          </h2>
          <button
            style={{
              ...styles.filterButton,
              ...(hasActiveFilters ? styles.filterButtonActive : {}),
            }}
            onClick={() => setShowFilters(true)}
          >
            <span>🎛️</span>
            <span>Filter</span>
            {hasActiveFilters && <span style={styles.filterBadge}>•</span>}
          </button>
        </div>

        {loading ? (
          <div style={styles.loadingGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={styles.skeleton} />
            ))}
          </div>
        ) : error ? (
          <div style={styles.errorState}>
            <p>{error}</p>
            <button style={styles.retryButton} onClick={() => loadInventory(filters)}>
              Try Again
            </button>
          </div>
        ) : vehicles.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No vehicles match your filters</p>
            <button
              style={styles.clearButton}
              onClick={() => {
                setFilters({});
                loadInventory({});
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <motion.div
            style={styles.vehicleGrid}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {vehicles.map((vehicle, index) => (
              <motion.div
                key={vehicle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <VehicleCard vehicle={vehicle} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={(filters) => handleApplyFilters(filters as unknown as Filters)}
        currentFilters={filters}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    paddingBottom: '48px',
  },
  statsRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '32px',
    overflowX: 'auto',
    paddingBottom: '8px',
  },
  statCard: {
    flex: '0 0 auto',
    minWidth: '140px',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '16px 24px',
    textAlign: 'center',
  },
  statValue: {
    display: 'block',
    fontSize: '2rem',
    fontWeight: 700,
    color: '#2d5a3d',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#a0a0a0',
  },
  section: {
    marginBottom: '40px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  resultCount: {
    fontSize: '1rem',
    fontWeight: 400,
    color: '#666666',
  },
  filterButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    position: 'relative',
  },
  filterButtonActive: {
    background: 'rgba(26, 71, 42, 0.3)',
    borderColor: '#1a472a',
  },
  filterBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    color: '#22c55e',
    fontSize: '1.5rem',
    lineHeight: 1,
  },
  vehicleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
  },
  loadingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
  },
  skeleton: {
    height: '320px',
    background: 'linear-gradient(90deg, #1a1a1a 25%, #242424 50%, #1a1a1a 75%)',
    backgroundSize: '200% 100%',
    borderRadius: '16px',
    animation: 'shimmer 1.5s infinite',
  },
  errorState: {
    textAlign: 'center',
    padding: '48px',
    color: '#a0a0a0',
  },
  retryButton: {
    marginTop: '16px',
    padding: '12px 24px',
    background: '#1a472a',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '64px 24px',
    background: '#1a1a1a',
    borderRadius: '16px',
    border: '1px solid #2a2a2a',
  },
  emptyText: {
    fontSize: '1.125rem',
    color: '#a0a0a0',
    marginBottom: '16px',
  },
  clearButton: {
    padding: '12px 24px',
    background: '#242424',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default HomePage;
