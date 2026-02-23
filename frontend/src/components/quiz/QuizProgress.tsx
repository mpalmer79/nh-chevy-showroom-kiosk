import React from 'react';
import { StyleObject } from '../../types';

interface QuizProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  progress: number;
}

const QuizProgress: React.FC<QuizProgressProps> = ({ currentQuestion, totalQuestions, progress }) => {
  return (
    <div style={styles.progressSection}>
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>
      <span style={styles.progressText}>
        Question {currentQuestion + 1} of {totalQuestions}
      </span>
    </div>
  );
};

const styles: StyleObject = {
  progressSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '40px',
  },
  progressBar: {
    flex: 1,
    height: '8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
};

export default QuizProgress;
