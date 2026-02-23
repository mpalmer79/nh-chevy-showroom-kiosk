import React from 'react';
import { LEASE_FINANCE_COMPARISON, getLeaseRecommendation } from '../../data/quizQuestions';
import { StyleObject } from '../../types';

interface LeaseHelpModalProps {
  mileageAnswer?: string;
  onSelect: (choice: string) => void;
  onBack: () => void;
}

const LeaseHelpModal: React.FC<LeaseHelpModalProps> = ({ mileageAnswer, onSelect, onBack }) => {
  const recommendation = getLeaseRecommendation(mileageAnswer);
  const { lease, finance } = LEASE_FINANCE_COMPARISON;

  return (
    <div style={styles.container}>
      <div style={styles.leaseModal}>
        <h2 style={styles.leaseTitle}>Lease vs. Finance: Which is Right for You?</h2>

        <div style={styles.leaseComparison}>
          {/* Lease Card */}
          <div style={styles.leaseCard}>
            <div style={styles.leaseCardHeader}>
              <span style={styles.leaseIcon}>{lease.icon}</span>
              <h3 style={styles.leaseCardTitle}>{lease.title}</h3>
            </div>
            <ul style={styles.leaseFeatures}>
              {lease.pros.map((pro: string, idx: number) => (
                <li key={idx}>✓ {pro}</li>
              ))}
              {lease.cons.map((con: string, idx: number) => (
                <li key={`con-${idx}`}>✗ {con}</li>
              ))}
            </ul>
            <div style={styles.leaseBestFor}>
              <strong>Best if:</strong> {lease.bestFor}
            </div>
            <button
              style={styles.leaseChoiceButton}
              onClick={() => onSelect('lease')}
              type="button"
            >
              I'll Lease
            </button>
          </div>

          {/* Finance Card */}
          <div style={styles.leaseCard}>
            <div style={styles.leaseCardHeader}>
              <span style={styles.leaseIcon}>{finance.icon}</span>
              <h3 style={styles.leaseCardTitle}>{finance.title}</h3>
            </div>
            <ul style={styles.leaseFeatures}>
              {finance.pros.map((pro: string, idx: number) => (
                <li key={idx}>✓ {pro}</li>
              ))}
              {finance.cons.map((con: string, idx: number) => (
                <li key={`con-${idx}`}>✗ {con}</li>
              ))}
            </ul>
            <div style={styles.leaseBestFor}>
              <strong>Best if:</strong> {finance.bestFor}
            </div>
            <button
              style={styles.leaseChoiceButton}
              onClick={() => onSelect('finance')}
              type="button"
            >
              I'll Finance
            </button>
          </div>
        </div>

        {mileageAnswer && (
          <div style={styles.aiRecommendation}>
            <div style={styles.aiIcon}>🤖</div>
            <div style={styles.aiText}>
              <strong>AI Recommendation:</strong> Based on your driving habits
              ({recommendation.mileageDescription}),
              {recommendation.message}
            </div>
          </div>
        )}

        <button
          style={styles.backToQuiz}
          onClick={onBack}
          type="button"
        >
          ← Back to question
        </button>
      </div>
    </div>
  );
};

const styles: StyleObject = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '32px 40px',
    overflow: 'auto',
  },
  leaseModal: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px',
  },
  leaseTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: '32px',
  },
  leaseComparison: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '24px',
  },
  leaseCard: {
    padding: '24px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  leaseCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  leaseIcon: {
    fontSize: '32px',
  },
  leaseCardTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
  },
  leaseFeatures: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 16px 0',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: '1.8',
  },
  leaseBestFor: {
    padding: '12px',
    background: 'rgba(27, 115, 64, 0.1)',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: '16px',
  },
  leaseChoiceButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  aiRecommendation: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '20px',
    background: 'rgba(74, 222, 128, 0.1)',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  aiIcon: {
    fontSize: '32px',
  },
  aiText: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: '1.5',
  },
  backToQuiz: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '8px 0',
  },
};

export default LeaseHelpModal;
