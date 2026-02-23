import React from 'react';
import { styles } from '../styles';

interface HeaderProps {
  customerName?: string;
  audioEnabled: boolean;
  isSpeaking: boolean;
  ttsAvailable: boolean;
  showObjectionPanel: boolean;
  onToggleAudio: () => void;
  onToggleObjectionPanel: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  customerName,
  audioEnabled,
  isSpeaking,
  ttsAvailable,
  showObjectionPanel,
  onToggleAudio,
  onToggleObjectionPanel,
}) => {
  return (
    <>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={styles.title}>
            {customerName 
              ? `Hi ${customerName}, let's find your perfect vehicle!` 
              : "Let's find your perfect vehicle!"}
          </h1>
          <p style={styles.subtitle}>Ask me anything about our inventory</p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Audio Toggle */}
          <button
            style={{
              ...styles.audioToggle,
              background: audioEnabled ? '#e8f4f8' : '#f5f5f5',
              borderColor: audioEnabled ? '#0077b6' : '#ddd',
            }}
            onClick={onToggleAudio}
            title={ttsAvailable ? 'ElevenLabs HD Voice' : 'Browser Speech'}
          >
            {isSpeaking ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
            ) : audioEnabled ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            )}
            <span style={styles.audioLabel}>
              {audioEnabled 
                ? (isSpeaking ? 'Speaking...' : (ttsAvailable ? 'HD Audio' : 'Audio On')) 
                : 'Audio Off'}
            </span>
          </button>
          
          {/* Common Questions Toggle */}
          <button
            style={{
              ...styles.questionsToggle,
              background: showObjectionPanel ? '#e8f4f8' : '#f5f5f5',
              borderColor: showObjectionPanel ? '#0077b6' : '#ddd',
            }}
            onClick={onToggleObjectionPanel}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span style={styles.audioLabel}>Common Questions</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Header;
