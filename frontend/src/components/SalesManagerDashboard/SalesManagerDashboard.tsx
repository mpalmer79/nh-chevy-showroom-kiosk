/**
 * NH Chevy Showroom Kiosk - Sales Manager Dashboard
 * Refactored main component
 */

import React, { useState } from 'react';
import { styles } from './styles';
import type { TabType, DealOverrides } from './types';
import { DEFAULT_OVERRIDES } from './constants';
import { useSessions, useWorksheets } from './hooks';
import {
  SessionList,
  WorksheetList,
  WorksheetDetail,
  ChatTranscript,
  Placeholder,
} from './components';
import { DigitalWorksheet } from './components/DigitalWorksheet';

interface SalesManagerDashboardProps {
  customerData?: { selectedSessionId?: string };
  updateCustomerData?: (data: { selectedSessionId?: string }) => void;
  navigateTo?: (page: string) => void;
}

const SalesManagerDashboard: React.FC<SalesManagerDashboardProps> = ({
  navigateTo,
}) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('sessions');
  const [showChatTranscript, setShowChatTranscript] = useState(false);
  
  // Digital Worksheet overrides
  const [overrides, setOverrides] = useState<DealOverrides>(DEFAULT_OVERRIDES);
  const [managerNotes, setManagerNotes] = useState('');
  
  // Hooks
  const {
    sessions,
    loading: loadingSessions,
    selectedSession,
    sessionDetail,
    loadingDetail,
    lastUpdate,
    autoRefresh,
    setAutoRefresh,
    selectSession,
    clearSelection: clearSessionSelection,
    refresh: refreshSessions,
  } = useSessions();

  const {
    worksheets,
    loading: loadingWorksheets,
    selectedWorksheet,
    selectWorksheet,
    refresh: refreshWorksheets,
    sendCounterOffer,
    acceptDeal,
    sendingCounterOffer,
  } = useWorksheets(autoRefresh, activeTab === 'worksheets');

  // Handlers
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    clearSessionSelection();
    selectWorksheet(null);
    setShowChatTranscript(false);
  };

  const handleSessionSelect = (session: any) => {
    selectSession(session);
    setShowChatTranscript(false);
    setManagerNotes('');
    setOverrides(DEFAULT_OVERRIDES);
  };

  const handleRefresh = () => {
    if (activeTab === 'sessions') {
      refreshSessions();
    } else {
      refreshWorksheets();
    }
  };

  const handleBack = () => {
    clearSessionSelection();
    selectWorksheet(null);
    if (navigateTo) navigateTo('trafficLog');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Sales Manager Dashboard</h1>
        <div style={styles.headerControls}>
          {/* Tab Buttons */}
          <div style={styles.tabContainer}>
            <button
              style={{
                ...styles.tabButton,
                ...styles.tabButtonLeft,
                ...(activeTab === 'sessions' ? styles.tabButtonActive : styles.tabButtonInactive),
              }}
              onClick={() => handleTabChange('sessions')}
            >
              👥 Sessions ({sessions.length})
            </button>
            <button
              style={{
                ...styles.tabButton,
                ...styles.tabButtonRight,
                ...(activeTab === 'worksheets' ? styles.tabButtonActive : styles.tabButtonInactive),
              }}
              onClick={() => handleTabChange('worksheets')}
            >
              📋 Worksheets ({worksheets.length})
            </button>
          </div>
          
          <span style={styles.lastUpdate}>Last update: {lastUpdate}</span>
          <label style={styles.autoRefreshLabel}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={styles.checkbox}
            />
            Auto-refresh
          </label>
          <button style={styles.refreshBtn} onClick={handleRefresh}>
            Refresh
          </button>
          {(selectedSession || selectedWorksheet) && (
            <button style={styles.backBtn} onClick={handleBack}>
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Sidebar */}
        {activeTab === 'sessions' ? (
          <SessionList
            sessions={sessions}
            loading={loadingSessions}
            selectedSessionId={selectedSession?.sessionId || null}
            onSelectSession={handleSessionSelect}
          />
        ) : (
          <WorksheetList
            worksheets={worksheets}
            loading={loadingWorksheets}
            selectedWorksheetId={selectedWorksheet?.id || null}
            onSelectWorksheet={selectWorksheet}
          />
        )}

        {/* Detail Panel */}
        <div style={styles.detailPanel}>
          {activeTab === 'sessions' ? (
            !selectedSession ? (
              <Placeholder
                icon="👈"
                title="Select a Session"
                text="Choose a customer session from the list to view their Digital Worksheet"
              />
            ) : loadingDetail ? (
              <div style={styles.loadingState}>
                <div style={styles.spinner} />
                <span>Loading session details...</span>
              </div>
            ) : showChatTranscript ? (
              <ChatTranscript
                messages={sessionDetail?.chatHistory || []}
                onBack={() => setShowChatTranscript(false)}
              />
            ) : (
              <DigitalWorksheet
                session={selectedSession}
                sessionDetail={sessionDetail}
                overrides={overrides}
                setOverrides={setOverrides}
                managerNotes={managerNotes}
                setManagerNotes={setManagerNotes}
                onViewChat={() => setShowChatTranscript(true)}
              />
            )
          ) : (
            !selectedWorksheet ? (
              <Placeholder
                icon="📋"
                title="Select a Worksheet"
                text="Choose a worksheet to view deal details and send counter-offers"
              />
            ) : (
              <WorksheetDetail
                worksheet={selectedWorksheet}
                onClose={() => selectWorksheet(null)}
                onSendCounterOffer={sendCounterOffer}
                onAcceptDeal={acceptDeal}
                sendingCounterOffer={sendingCounterOffer}
              />
            )
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default SalesManagerDashboard;
