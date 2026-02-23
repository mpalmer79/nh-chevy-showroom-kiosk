import React, { useState, useEffect, CSSProperties } from 'react';
import api from './api';

interface ChatMessage { role: 'user' | 'assistant'; content: string; timestamp?: string; }
interface Stats {
  today?: number; total_sessions?: number; with_vehicle_selected?: number;
  vehicle_requests?: number; completed_handoffs?: number; conversion_rate?: number;
}
interface TrafficLogProps { 
  navigateTo: (page: string) => void; 
  updateCustomerData?: (data: { selectedSessionId?: string }) => void;
}

const PATH_LABELS: Record<string, string> = { stockLookup: 'Stock Lookup', modelBudget: 'Model & Budget', guidedQuiz: 'Guided Quiz', browse: 'Browse All', aiChat: 'AI Chat' };
const PATH_COLORS: Record<string, string> = { stockLookup: '#22c55e', modelBudget: '#2563eb', guidedQuiz: '#dc2626', browse: '#6b7280', aiChat: '#8b5cf6' };

const TrafficLog: React.FC<TrafficLogProps> = ({ navigateTo, updateCustomerData }) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = { limit: 100, filter_today: activeFilter === 'today' };
      const [logData, statsData] = await Promise.all([api.getTrafficLog(params.limit, 0, params.filter_today), api.getTrafficStats()]);
      let sessionList = logData.sessions || [];
      if (activeFilter === 'vehicle') sessionList = sessionList.filter(s => s.vehicle);
      else if (activeFilter === 'requested') sessionList = sessionList.filter(s => s.vehicleRequested);
      else if (activeFilter === 'completed') sessionList = sessionList.filter(s => s.phone);
      else if (activeFilter === 'chat') sessionList = sessionList.filter(s => s.chatHistory && s.chatHistory.length > 0);
      setSessions(sessionList);
      setStats(statsData);
      setError(null);
    } catch (err) { console.error('Failed to load traffic data:', err); setError('Failed to load traffic data'); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { loadData(); }, [activeFilter]);

  const handleRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };
  const handleStatCardClick = (filterType: string) => setActiveFilter(activeFilter === filterType ? null : filterType);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };
  const formatChatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true });
  };
  const formatPhone = (phone?: string) => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 ? `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}` : phone;
  };
  const getPathLabel = (path?: string) => PATH_LABELS[path || ''] || path || 'Unknown';
  const getPathColor = (path?: string) => PATH_COLORS[path || ''] || '#6b7280';

  if (loading && !refreshing) {
    return <div style={s.container}><div style={s.loadingState}><div style={s.spinner} /><p>Loading traffic data...</p></div></div>;
  }
  if (error) {
    return <div style={s.container}><div style={s.loadingState}><div style={s.errorIcon}>⚠️</div><p style={s.errorText}>{error}</p><button style={s.retryBtn} onClick={loadData}>Try Again</button></div></div>;
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <button style={s.backBtn} onClick={() => navigateTo('welcome')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to Kiosk
          </button>
          <h1 style={s.title}>Traffic Log</h1>
          <span style={s.subtitle}>Kiosk Session Monitor</span>
        </div>
        <div style={s.headerRight}>
          <button style={s.syncDashboardBtn} onClick={() => navigateTo('inventorySync')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
            </svg>
            Inventory Sync
          </button>
          {activeFilter && <button style={s.clearFilterBtn} onClick={() => setActiveFilter(null)}>Clear Filter ✕</button>}
          <button style={s.refreshBtn} onClick={handleRefresh} disabled={refreshing}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>
              <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {stats && (
        <div style={s.statsGrid}>
          {[{ key: 'today', value: stats.today, label: 'Today', clickable: true },
            { key: 'total', value: stats.total_sessions, label: 'Total Sessions', clickable: false },
            { key: 'vehicle', value: stats.with_vehicle_selected, label: 'Viewed Vehicle', clickable: true },
            { key: 'requested', value: stats.vehicle_requests, label: 'Requested Vehicle', clickable: true },
            { key: 'completed', value: stats.completed_handoffs, label: 'Completed', clickable: true },
            { key: 'conversion', value: stats.conversion_rate, label: 'Conversion', clickable: false, isPercent: true }
          ].map(stat => (
            <div key={stat.key} style={{ ...s.statCard, ...(activeFilter === stat.key ? s.statCardActive : {}), cursor: stat.clickable ? 'pointer' : 'default' }}
              onClick={() => stat.clickable && handleStatCardClick(stat.key)}>
              <span style={{ ...s.statValue, ...(stat.isPercent ? { color: (stat.value || 0) > 0 ? '#10b981' : '#ef4444' } : {}) }}>{stat.value || 0}{stat.isPercent ? '%' : ''}</span>
              <span style={s.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {activeFilter && (
        <div style={s.filterIndicator}>
          Showing: {activeFilter === 'today' ? "Today's Sessions" : activeFilter === 'vehicle' ? 'Sessions with Vehicle Viewed' : activeFilter === 'requested' ? 'Sessions with Vehicle Requested' : activeFilter === 'completed' ? 'Completed Sessions' : activeFilter === 'chat' ? 'Sessions with AI Chat' : 'All'} ({sessions.length} results)
        </div>
      )}

      <div style={s.tableContainer} className="traffic-table-container">
        <table style={s.table} className="traffic-table">
          <thead>
            <tr>{['Time', 'Cust #', 'Customer', 'Path', 'Vehicle', 'Trade-In', 'Status', 'Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr><td colSpan={8} style={s.emptyState}>{activeFilter ? 'No sessions match this filter' : 'No sessions recorded yet'}</td></tr>
            ) : sessions.map((session) => (
              <tr key={session.sessionId} style={s.tr} onClick={() => setSelectedSession(session)}>
                <td style={s.td}><span style={s.timeValue}>{formatDate(session.createdAt)}</span></td>
                <td style={s.td}><span style={s.custNumValue}>{session.phone ? session.phone.replace(/\D/g, '').slice(-4) : '—'}</span></td>
                <td style={s.td}>
                  <div style={s.customerCell}>
                    <span style={s.customerName}>{session.customerName || 'Anonymous'}</span>
                    {session.phone && <span style={s.customerPhone}>{formatPhone(session.phone)}</span>}
                  </div>
                </td>
                <td style={s.td}><span style={{ ...s.pathBadge, background: `${getPathColor(session.path)}20`, color: getPathColor(session.path) }}>{getPathLabel(session.path)}</span></td>
                <td style={s.td}>
                  {session.vehicle ? (
                    <div style={s.vehicleCell}><span style={s.vehicleName}>{session.vehicle.year} {session.vehicle.model}</span><span style={s.vehicleStock}>#{session.vehicle.stockNumber}</span></div>
                  ) : <span style={s.emptyCell}>—</span>}
                </td>
                <td style={s.td}>
                  {session.tradeIn ? (
                    <div style={s.tradeCell}><span style={s.tradeName}>{session.tradeIn.year} {session.tradeIn.make}</span>{session.tradeIn.estimatedValue && <span style={s.tradeValue}>~${session.tradeIn.estimatedValue.toLocaleString()}</span>}</div>
                  ) : <span style={s.emptyCell}>—</span>}
                </td>
                <td style={s.td}>
                  <div style={s.statusCell}>
                    {session.phone ? (
                      <span style={s.statusComplete}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>Completed</span>
                    ) : session.vehicleRequested ? (
                      <span style={s.statusRequested}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Requested</span>
                    ) : <span style={s.statusBrowsing}>Browsing</span>}
                    {session.chatHistory && session.chatHistory.length > 0 && <span style={s.chatBadge} title="Has AI Chat History">💬 {session.chatHistory.length}</span>}
                  </div>
                </td>
                <td style={s.td}><button style={s.viewBtn} onClick={(e) => { e.stopPropagation(); updateCustomerData?.({ selectedSessionId: session.sessionId }); navigateTo('salesDashboard'); }}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSession && (
        <div style={s.modalOverlay} onClick={() => setSelectedSession(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Session Details</h2>
              <button style={s.closeBtn} onClick={() => setSelectedSession(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={s.modalContent}>
              <div style={s.detailSection}>
                <h3 style={s.sectionTitle}>Customer</h3>
                <div style={s.detailGrid}>
                  {[{ label: 'Name', value: selectedSession.customerName || 'Anonymous' }, { label: 'Phone', value: formatPhone(selectedSession.phone) || 'Not provided' },
                    { label: 'Path', value: getPathLabel(selectedSession.path) }, { label: 'Session ID', value: selectedSession.sessionId, mono: true }].map((item, i) => (
                    <div key={i} style={s.detailItem}><span style={s.detailLabel}>{item.label}</span><span style={{ ...s.detailValue, ...(item.mono ? { fontFamily: 'monospace', fontSize: '12px' } : {}) }}>{item.value}</span></div>
                  ))}
                </div>
              </div>
              {selectedSession.vehicle && (
                <div style={s.detailSection}>
                  <h3 style={s.sectionTitle}>Vehicle Interest</h3>
                  <div style={s.detailGrid}>
                    {[{ label: 'Vehicle', value: `${selectedSession.vehicle.year} ${selectedSession.vehicle.make} ${selectedSession.vehicle.model}` },
                      { label: 'Trim', value: selectedSession.vehicle.trim || 'N/A' }, { label: 'Stock #', value: selectedSession.vehicle.stockNumber },
                      { label: 'Price', value: selectedSession.vehicle.salePrice ? `$${selectedSession.vehicle.salePrice.toLocaleString()}` : 'N/A' }].map((item, i) => (
                      <div key={i} style={s.detailItem}><span style={s.detailLabel}>{item.label}</span><span style={s.detailValue}>{item.value}</span></div>
                    ))}
                  </div>
                </div>
              )}
              {selectedSession.tradeIn && (
                <div style={s.detailSection}>
                  <h3 style={s.sectionTitle}>Trade-In</h3>
                  <div style={s.detailGrid}>
                    {[{ label: 'Vehicle', value: `${selectedSession.tradeIn.year} ${selectedSession.tradeIn.make} ${selectedSession.tradeIn.model}` },
                      { label: 'Mileage', value: selectedSession.tradeIn.mileage ? `${selectedSession.tradeIn.mileage.toLocaleString()} mi` : 'N/A' },
                      { label: 'Condition', value: selectedSession.tradeIn.condition || 'N/A' },
                      { label: 'Est. Value', value: selectedSession.tradeIn.estimatedValue ? `$${selectedSession.tradeIn.estimatedValue.toLocaleString()}` : 'N/A', color: '#10b981' }].map((item, i) => (
                      <div key={i} style={s.detailItem}><span style={s.detailLabel}>{item.label}</span><span style={{ ...s.detailValue, ...(item.color ? { color: item.color } : {}) }}>{item.value}</span></div>
                    ))}
                  </div>
                </div>
              )}
              {selectedSession.payment && (
                <div style={s.detailSection}>
                  <h3 style={s.sectionTitle}>Payment Preference</h3>
                  <div style={s.detailGrid}>
                    {[{ label: 'Type', value: selectedSession.payment.type === 'lease' ? 'Lease' : 'Finance' },
                      { label: 'Monthly', value: `$${selectedSession.payment.monthly}/mo` }, { label: 'Term', value: `${selectedSession.payment.term} months` },
                      { label: 'Down Payment', value: `$${selectedSession.payment.downPayment?.toLocaleString() || 0}` }].map((item, i) => (
                      <div key={i} style={s.detailItem}><span style={s.detailLabel}>{item.label}</span><span style={s.detailValue}>{item.value}</span></div>
                    ))}
                  </div>
                </div>
              )}
              {selectedSession.chatHistory && selectedSession.chatHistory.length > 0 && (
                <div style={s.detailSection}>
                  <h3 style={s.sectionTitle}>AI Chat History ({selectedSession.chatHistory.length} messages)</h3>
                  <div style={s.chatHistoryContainer}>
                    {selectedSession.chatHistory.map((msg: ChatMessage, idx: number) => (
                      <div key={idx} style={{ ...s.chatMessage, ...(msg.role === 'user' ? s.chatMessageUser : s.chatMessageAssistant) }}>
                        <div style={s.chatMessageHeader}><span style={s.chatRole}>{msg.role === 'user' ? '👤 Customer' : '🤖 AI Assistant'}</span>{msg.timestamp && <span style={s.chatTimestamp}>{formatChatTime(msg.timestamp)}</span>}</div>
                        <div style={s.chatContent}>{msg.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={s.detailSection}>
                <h3 style={s.sectionTitle}>Timeline</h3>
                <div style={s.detailGrid}>
                  {[{ label: 'Started', value: formatDate(selectedSession.createdAt) }, { label: 'Last Activity', value: formatDate(selectedSession.updatedAt) }].map((item, i) => (
                    <div key={i} style={s.detailItem}><span style={s.detailLabel}>{item.label}</span><span style={s.detailValue}>{item.value}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        /* Mobile horizontal scroll for table */
        @media (max-width: 768px) {
          .traffic-table-container {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
            margin: 0 -20px;
            padding: 0 20px;
          }
          .traffic-table {
            min-width: 800px;
          }
        }
      `}</style>
    </div>
  );
};

const s: Record<string, CSSProperties> = {
  container: { flex: 1, padding: '24px 40px', overflow: 'auto', background: '#f5f7fa', color: '#1a1a2e', minHeight: '100vh' },
  loadingState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px', color: '#64748b' },
  spinner: { width: '48px', height: '48px', border: '4px solid #e2e8f0', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  errorIcon: { fontSize: '48px' },
  errorText: { color: '#ef4444' },
  retryBtn: { padding: '12px 24px', background: '#10b981', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: '8px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', color: '#475569', fontSize: '14px', cursor: 'pointer', marginBottom: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  title: { fontSize: '28px', fontWeight: 700, margin: 0, color: '#1a1a2e' },
  subtitle: { fontSize: '14px', color: '#64748b' },
  clearFilterBtn: { padding: '8px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#ef4444', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  refreshBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1a1a2e', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  syncDashboardBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#10b981', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  statCardActive: { background: '#f0fdf4', border: '2px solid #10b981' },
  statValue: { fontSize: '32px', fontWeight: 700, color: '#1a1a2e' },
  statLabel: { fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginTop: '4px' },
  filterIndicator: { padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#10b981', fontSize: '13px', marginBottom: '16px', fontWeight: 500 },
  tableContainer: { background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  tr: { cursor: 'pointer' },
  td: { padding: '16px 20px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: '14px' },
  timeValue: { fontSize: '13px', color: '#475569' },
  custNumValue: { fontSize: '14px', fontWeight: 600, color: '#D4AF37', fontFamily: 'monospace', letterSpacing: '1px' },
  customerCell: { display: 'flex', flexDirection: 'column', gap: '2px' },
  customerName: { fontSize: '14px', fontWeight: 600, color: '#1a1a2e' },
  customerPhone: { fontSize: '12px', color: '#64748b' },
  pathBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 },
  vehicleCell: { display: 'flex', flexDirection: 'column', gap: '2px' },
  vehicleName: { fontSize: '14px', fontWeight: 600, color: '#1a1a2e' },
  vehicleStock: { fontSize: '12px', color: '#64748b' },
  tradeCell: { display: 'flex', flexDirection: 'column', gap: '2px' },
  tradeName: { fontSize: '14px', color: '#1a1a2e' },
  tradeValue: { fontSize: '12px', color: '#10b981', fontWeight: 600 },
  emptyCell: { color: '#cbd5e1' },
  statusCell: { display: 'flex', alignItems: 'center', gap: '8px' },
  statusComplete: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', background: '#f0fdf4', color: '#10b981', fontSize: '12px', fontWeight: 600, border: '1px solid #bbf7d0' },
  statusRequested: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', background: '#fffbeb', color: '#f59e0b', fontSize: '12px', fontWeight: 600, border: '1px solid #fde68a' },
  statusBrowsing: { display: 'inline-block', padding: '4px 10px', borderRadius: '6px', background: '#f8fafc', color: '#64748b', fontSize: '12px', fontWeight: 600, border: '1px solid #e2e8f0' },
  chatBadge: { fontSize: '12px', padding: '2px 6px', background: '#f3e8ff', borderRadius: '4px', color: '#9333ea', border: '1px solid #e9d5ff' },
  viewBtn: { padding: '6px 12px', background: '#3b4c6b', border: 'none', borderRadius: '6px', color: '#ffffff', fontSize: '12px', cursor: 'pointer', fontWeight: 500 },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { width: '90%', maxWidth: '700px', maxHeight: '90vh', background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' },
  modalTitle: { fontSize: '20px', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  closeBtn: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' },
  modalContent: { padding: '24px', overflow: 'auto' },
  detailSection: { marginBottom: '24px' },
  sectionTitle: { fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', margin: '0 0 12px 0' },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  detailItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  detailLabel: { fontSize: '12px', color: '#94a3b8' },
  detailValue: { fontSize: '14px', fontWeight: 600, color: '#1a1a2e' },
  chatHistoryContainer: { maxHeight: '300px', overflow: 'auto', background: '#f8fafc', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' },
  chatMessage: { marginBottom: '12px', padding: '12px', borderRadius: '8px' },
  chatMessageUser: { background: '#eff6ff', borderLeft: '3px solid #3b82f6' },
  chatMessageAssistant: { background: '#f0fdf4', borderLeft: '3px solid #10b981' },
  chatMessageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  chatRole: { fontSize: '12px', fontWeight: 600, color: '#475569' },
  chatTimestamp: { fontSize: '11px', color: '#94a3b8' },
  chatContent: { fontSize: '13px', color: '#1a1a2e', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
};

export default TrafficLog;
