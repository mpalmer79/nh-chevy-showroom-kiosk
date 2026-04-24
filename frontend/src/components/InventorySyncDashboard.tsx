/**
 * NH Chevy Showroom Kiosk - Inventory Sync Status Dashboard
 * 
 * Monitors PBS DMS inventory sync status including:
 * - Data freshness indicators
 * - Last sync time and duration
 * - Error monitoring
 * - Manual refresh capability
 * - Inventory breakdown by status/type
 * 
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, CSSProperties } from 'react';
import api from './api';
import type { SyncStatusResponse, RefreshResponse } from './api';

interface InventorySyncDashboardProps {
  navigateTo?: (page: string) => void;
}

const InventorySyncDashboard: React.FC<InventorySyncDashboardProps> = ({ navigateTo }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshResult, setLastRefreshResult] = useState<RefreshResponse | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const status = await api.getSyncStatus();
      setSyncStatus(status);
      setError(null);
    } catch (err) {
      setError('Failed to fetch sync status');
      console.error('Sync status error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSyncStatus();
    
    let interval: ReturnType<typeof setInterval>;
    if (autoRefresh) {
      interval = setInterval(fetchSyncStatus, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, fetchSyncStatus]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    setLastRefreshResult(null);
    
    try {
      const result = await api.refreshInventory();
      setLastRefreshResult(result);
      await fetchSyncStatus();
    } catch (err) {
      setError('Failed to refresh inventory');
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const formatDateTime = (isoString: string | null): string => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const formatTimeAgo = (minutes: number | null): string => {
    if (minutes === null) return 'Unknown';
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${Math.round(minutes)} minutes ago`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hours ago`;
    return `${Math.round(minutes / 1440)} days ago`;
  };

  const getFreshnessColor = (status: string): string => {
    switch (status) {
      case 'fresh': return '#4ade80';
      case 'stale': return '#fbbf24';
      case 'outdated': return '#f87171';
      default: return 'rgba(255,255,255,0.5)';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'healthy': return '✅';
      case 'error': return '❌';
      default: return '⚠️';
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>Loading sync status...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {navigateTo && (
            <button style={styles.backButton} onClick={() => navigateTo('admin')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
          )}
          <div>
            <h1 style={styles.title}>📊 Inventory Sync Dashboard</h1>
            <p style={styles.subtitle}>PBS DMS Integration Status</p>
          </div>
        </div>
        
        <div style={styles.headerRight}>
          <label style={styles.autoRefreshLabel}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={styles.checkbox}
            />
            Auto-refresh (30s)
          </label>
          <button
            style={{
              ...styles.refreshButton,
              opacity: refreshing ? 0.6 : 1,
            }}
            onClick={handleManualRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <div style={styles.buttonSpinner} />
                Refreshing...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
                Refresh Now
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {lastRefreshResult && (
        <div style={styles.successBanner}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {lastRefreshResult.message} • {lastRefreshResult.newCount} vehicles loaded
          {lastRefreshResult.change !== 0 && (
            <span style={{ color: lastRefreshResult.change > 0 ? '#4ade80' : '#f87171' }}>
              {' '}({lastRefreshResult.change > 0 ? '+' : ''}{lastRefreshResult.change})
            </span>
          )}
        </div>
      )}

      {syncStatus && (
        <>
          {/* Status Cards */}
          <div style={styles.statusGrid}>
            {/* Overall Status */}
            <div style={styles.statusCard}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>{getStatusIcon(syncStatus.status)}</span>
                <span style={styles.cardTitle}>Sync Status</span>
              </div>
              <div style={styles.cardValue}>
                <span style={{
                  color: syncStatus.status === 'healthy' ? '#4ade80' : '#f87171',
                  textTransform: 'capitalize',
                }}>
                  {syncStatus.status}
                </span>
              </div>
              <div style={styles.cardSubtext}>Source: {syncStatus.source}</div>
            </div>

            {/* Vehicle Count */}
            <div style={styles.statusCard}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>🚗</span>
                <span style={styles.cardTitle}>Total Vehicles</span>
              </div>
              <div style={styles.cardValue}>{syncStatus.vehicleCount.toLocaleString()}</div>
              <div style={styles.cardSubtext}>In inventory</div>
            </div>

            {/* Data Freshness */}
            <div style={styles.statusCard}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>⏱️</span>
                <span style={styles.cardTitle}>Data Freshness</span>
              </div>
              <div style={{
                ...styles.cardValue,
                color: getFreshnessColor(syncStatus.freshnessStatus),
              }}>
                {syncStatus.freshnessStatus.charAt(0).toUpperCase() + syncStatus.freshnessStatus.slice(1)}
              </div>
              <div style={styles.cardSubtext}>
                {formatTimeAgo(syncStatus.minutesSinceLoad)}
              </div>
            </div>

            {/* Load Performance */}
            <div style={styles.statusCard}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>⚡</span>
                <span style={styles.cardTitle}>Load Time</span>
              </div>
              <div style={styles.cardValue}>{syncStatus.loadDurationMs}ms</div>
              <div style={styles.cardSubtext}>Last load duration</div>
            </div>
          </div>

          {/* Detail Panels */}
          <div style={styles.detailGrid}>
            {/* File Info */}
            <div style={styles.detailPanel}>
              <h3 style={styles.panelTitle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Source File
              </h3>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>File Path</span>
                <span style={styles.detailValue}>{syncStatus.filePath || 'N/A'}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>File Exists</span>
                <span style={{
                  ...styles.detailValue,
                  color: syncStatus.fileExists ? '#4ade80' : '#f87171',
                }}>
                  {syncStatus.fileExists ? 'Yes ✓' : 'No ✗'}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>File Size</span>
                <span style={styles.detailValue}>{syncStatus.fileSizeKb} KB</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Last Modified</span>
                <span style={styles.detailValue}>{formatDateTime(syncStatus.lastFileModified)}</span>
              </div>
              {syncStatus.needsRefresh && (
                <div style={styles.warningBox}>
                  ⚠️ File has been updated since last load - refresh recommended
                </div>
              )}
            </div>

            {/* Sync Timeline */}
            <div style={styles.detailPanel}>
              <h3 style={styles.panelTitle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Timeline
              </h3>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Last Sync</span>
                <span style={styles.detailValue}>{formatDateTime(syncStatus.lastLoadTime)}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Time Elapsed</span>
                <span style={styles.detailValue}>{formatTimeAgo(syncStatus.minutesSinceLoad)}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Current File Time</span>
                <span style={styles.detailValue}>{formatDateTime(syncStatus.currentFileModified)}</span>
              </div>
              
              {syncStatus.lastError && (
                <div style={styles.errorBox}>
                  <strong>Last Error:</strong><br />
                  {syncStatus.lastError}<br />
                  <small>{formatDateTime(syncStatus.lastErrorTime)}</small>
                </div>
              )}
            </div>
          </div>

          {/* Inventory Breakdown */}
          <div style={styles.breakdownSection}>
            <h3 style={styles.sectionTitle}>Inventory Breakdown</h3>
            
            <div style={styles.breakdownGrid}>
              {/* By Status */}
              <div style={styles.breakdownCard}>
                <h4 style={styles.breakdownTitle}>By Status</h4>
                {Object.entries(syncStatus.breakdown.byStatus).map(([status, count]) => (
                  <div key={status} style={styles.breakdownRow}>
                    <span style={styles.breakdownLabel}>{status}</span>
                    <div style={styles.breakdownBarContainer}>
                      <div 
                        style={{
                          ...styles.breakdownBar,
                          width: `${(count / syncStatus.vehicleCount) * 100}%`,
                          background: status.includes('In Stock') ? '#4ade80' : 
                                     status.includes('Transit') ? '#60a5fa' :
                                     status.includes('Sold') ? '#f87171' : '#fbbf24',
                        }}
                      />
                    </div>
                    <span style={styles.breakdownCount}>{count}</span>
                  </div>
                ))}
              </div>

              {/* By Body Style */}
              <div style={styles.breakdownCard}>
                <h4 style={styles.breakdownTitle}>By Body Style</h4>
                {Object.entries(syncStatus.breakdown.byBodyStyle)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
                  .map(([bodyStyle, count]) => (
                    <div key={bodyStyle} style={styles.breakdownRow}>
                      <span style={styles.breakdownLabel}>{bodyStyle}</span>
                      <div style={styles.breakdownBarContainer}>
                        <div 
                          style={{
                            ...styles.breakdownBar,
                            width: `${(count / syncStatus.vehicleCount) * 100}%`,
                            background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                          }}
                        />
                      </div>
                      <span style={styles.breakdownCount}>{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
    padding: '24px',
    color: '#ffffff',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    gap: '16px',
    color: 'rgba(255,255,255,0.6)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backButton: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    margin: '4px 0 0 0',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  autoRefreshLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  buttonSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 18px',
    background: 'rgba(248, 113, 113, 0.15)',
    border: '1px solid rgba(248, 113, 113, 0.3)',
    borderRadius: '12px',
    color: '#f87171',
    marginBottom: '20px',
  },
  successBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 18px',
    background: 'rgba(74, 222, 128, 0.15)',
    border: '1px solid rgba(74, 222, 128, 0.3)',
    borderRadius: '12px',
    color: '#4ade80',
    marginBottom: '20px',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statusCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '20px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  cardIcon: {
    fontSize: '20px',
  },
  cardTitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  cardValue: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '4px',
  },
  cardSubtext: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  detailPanel: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px',
  },
  panelTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  detailLabel: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#ffffff',
    textAlign: 'right',
    maxWidth: '60%',
    wordBreak: 'break-all',
  },
  warningBox: {
    marginTop: '16px',
    padding: '12px',
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: '8px',
    color: '#fbbf24',
    fontSize: '13px',
  },
  errorBox: {
    marginTop: '16px',
    padding: '12px',
    background: 'rgba(248, 113, 113, 0.1)',
    border: '1px solid rgba(248, 113, 113, 0.3)',
    borderRadius: '8px',
    color: '#f87171',
    fontSize: '13px',
  },
  breakdownSection: {
    marginTop: '8px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
  },
  breakdownGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px',
  },
  breakdownCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px',
  },
  breakdownTitle: {
    fontSize: '15px',
    fontWeight: '600',
    marginBottom: '16px',
    color: 'rgba(255,255,255,0.9)',
  },
  breakdownRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '10px',
  },
  breakdownLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
    width: '100px',
    flexShrink: 0,
  },
  breakdownBarContainer: {
    flex: 1,
    height: '8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  breakdownBar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  breakdownCount: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#ffffff',
    width: '40px',
    textAlign: 'right',
  },
};

export default InventorySyncDashboard;
