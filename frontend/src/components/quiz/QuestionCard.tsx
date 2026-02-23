import React from 'react';
import { StyleObject } from '../../types';

interface QuizOption {
  value: string;
  label: string;
  icon: string;
  desc: string;
}

interface QuestionCardProps {
  option: QuizOption;
  isSelected: boolean;
  onClick: () => void;
  showCheckmark?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ option, isSelected, onClick, showCheckmark = true }) => {
  return (
    <button
      style={{
        ...styles.optionCard,
        borderColor: isSelected ? '#22c55e' : 'rgba(255,255,255,0.1)',
        background: isSelected
          ? 'rgba(27, 115, 64, 0.2)'
          : 'rgba(255,255,255,0.05)',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
      }}
      onClick={onClick}
      type="button"
    >
      <span style={styles.optionIcon}>{option.icon}</span>
      <span style={styles.optionLabel}>{option.label}</span>
      <span style={styles.optionDesc}>{option.desc}</span>
      {isSelected && showCheckmark && (
        <div style={styles.checkmark}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      )}
    </button>
  );
};

const styles: StyleObject = {
  optionCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px',
    borderRadius: '16px',
    border: '2px solid rgba(255,255,255,0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    textAlign: 'center',
  },
  optionIcon: {
    fontSize: '36px',
    marginBottom: '12px',
  },
  optionLabel: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '4px',
  },
  optionDesc: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
  },
  checkmark: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#22c55e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
  },
};

export default QuestionCard;
