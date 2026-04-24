/**
 * Chat Transcript Component
 */

import React from 'react';
import type { ChatMessage } from '../types';
import { styles } from '../styles';

interface ChatTranscriptProps {
  messages: ChatMessage[];
  onBack: () => void;
}

export const ChatTranscript: React.FC<ChatTranscriptProps> = ({ messages, onBack }) => {
  return (
    <div style={styles.chatPanel}>
      <div style={styles.chatHeader}>
        <button style={styles.backBtn} onClick={onBack}>
          ← Back to Worksheet
        </button>
        <h3 style={styles.chatTitle}>Chat Transcript</h3>
      </div>
      <div style={styles.chatMessages}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
            No chat history available
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                ...styles.message,
                ...(msg.role === 'user' ? styles.messageUser : styles.messageAssistant),
              }}
            >
              <span style={styles.messageRole}>
                {msg.role === 'user' ? 'Customer' : 'Showroom AI'}
              </span>
              <p style={styles.messageContent}>{msg.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
