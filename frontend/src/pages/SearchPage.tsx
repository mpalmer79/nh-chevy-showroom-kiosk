import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../components/api';
import VehicleCard from '../components/VehicleCard';
import type { Vehicle } from '../types';

interface Suggestion {
  label: string;
  query: string;
}

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const suggestions: Suggestion[] = [
    { label: 'Corvette', query: 'corvette' },
    { label: 'Silverado', query: 'silverado' },
    { label: 'Tahoe', query: 'tahoe' },
    { label: 'Traverse', query: 'traverse' },
    { label: 'Electric', query: 'electric' },
    { label: 'Truck', query: 'truck' },
    { label: 'SUV', query: 'suv' },
    { label: 'Colorado', query: 'colorado' },
  ];

  const performSearch = useCallback(async (searchQuery: string): Promise<void> => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      const response = await api.getInventory({ model: searchQuery });
      const vehicleList: Vehicle[] = Array.isArray(response) ? response : (response as { vehicles?: Vehicle[] })?.vehicles || [];
      setResults(vehicleList);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query.length >= 2) {
        performSearch(query);
      } else if (query.length === 0) {
        setResults([]);
        setHasSearched(false);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, performSearch]);

  const handleSuggestionClick = (suggestion: Suggestion): void => {
    setQuery(suggestion.query);
    performSearch(suggestion.query);
  };

  const handleClear = (): void => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div style={styles.searchSection}>
        <h1 style={styles.title}>Search Inventory</h1>
        <p style={styles.subtitle}>
          Find your perfect vehicle by make, model, color, or features
        </p>

        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Search vehicles..."
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button style={styles.clearButton} onClick={handleClear}>
              ✕
            </button>
          )}
        </div>

        {!hasSearched && (
          <div style={styles.suggestionsSection}>
            <p style={styles.suggestionsLabel}>Popular searches</p>
            <div style={styles.suggestions}>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.query}
                  style={styles.suggestionChip}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div style={styles.resultsSection}>
        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Searching...</p>
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🔍</span>
            <h3 style={styles.emptyTitle}>No vehicles found</h3>
            <p style={styles.emptyText}>
              Try a different search term or browse our suggestions
            </p>
          </div>
        ) : results.length > 0 ? (
          <>
            <div style={styles.resultsHeader}>
              <span style={styles.resultsCount}>
                {results.length} vehicle{results.length !== 1 ? 's' : ''} found
              </span>
            </div>
            <div style={styles.resultsGrid}>
              {results.map((vehicle, index) => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <VehicleCard vehicle={vehicle} />
                </motion.div>
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* Virtual Keyboard Hint */}
      <div style={styles.keyboardHint}>
        <p style={styles.hintText}>
          Tap the search box to type, or select a suggestion above
        </p>
      </div>
    </motion.div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  searchSection: {
    textAlign: 'center',
    paddingTop: '24px',
    paddingBottom: '32px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#a0a0a0',
    marginBottom: '32px',
  },
  searchWrapper: {
    position: 'relative',
    maxWidth: '600px',
    margin: '0 auto',
  },
  searchIcon: {
    position: 'absolute',
    left: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '1.25rem',
  },
  searchInput: {
    width: '100%',
    padding: '20px 60px',
    fontSize: '1.25rem',
    background: '#1a1a1a',
    border: '2px solid #2a2a2a',
    borderRadius: '16px',
    color: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  clearButton: {
    position: 'absolute',
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#242424',
    border: 'none',
    borderRadius: '50%',
    color: '#a0a0a0',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  suggestionsSection: {
    marginTop: '32px',
  },
  suggestionsLabel: {
    fontSize: '0.875rem',
    color: '#666666',
    marginBottom: '16px',
  },
  suggestions: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '12px',
  },
  suggestionChip: {
    padding: '12px 24px',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '24px',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  resultsSection: {
    flex: 1,
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #2a2a2a',
    borderTopColor: '#1a472a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    color: '#a0a0a0',
  },
  emptyState: {
    textAlign: 'center',
    padding: '64px 24px',
  },
  emptyIcon: {
    fontSize: '3rem',
    display: 'block',
    marginBottom: '16px',
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '8px',
  },
  emptyText: {
    color: '#a0a0a0',
  },
  resultsHeader: {
    marginBottom: '20px',
  },
  resultsCount: {
    fontSize: '1rem',
    color: '#a0a0a0',
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
  },
  keyboardHint: {
    textAlign: 'center',
    padding: '24px',
    marginTop: 'auto',
  },
  hintText: {
    fontSize: '0.875rem',
    color: '#666666',
  },
};

export default SearchPage;
