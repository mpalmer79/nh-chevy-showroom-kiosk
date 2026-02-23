import React from 'react';
import { StyleObject } from '../../types';

interface RangeConfig {
  min: number;
  max: number;
  step: number;
}

interface LeaseCalcResult {
  monthly: number;
  dueAtSigning: number;
  totalCost: number;
  residual: number;
}

interface LeaseCalculatorProps {
  term: number;
  setTerm: (term: number) => void;
  miles: number;
  setMiles: (miles: number) => void;
  down: number;
  setDown: (down: number) => void;
  calc: LeaseCalcResult;
  terms: number[];
  milesOptions: number[];
  downRange: RangeConfig;
  onSelect: () => void;
}

const LeaseCalculator: React.FC<LeaseCalculatorProps> = ({
  term,
  setTerm,
  miles,
  setMiles,
  down,
  setDown,
  calc,
  terms,
  milesOptions,
  downRange,
  onSelect
}) => {
  return (
    <div style={styles.calculatorCard}>
      <div style={styles.cardHeader}>
        <span style={styles.cardIcon}>📅</span>
        <h2 style={styles.cardTitle}>Lease</h2>
      </div>
      <p style={styles.cardDescription}>
        Lower payments, new car every few years
      </p>

      {/* Lease Term */}
      <div style={styles.inputGroup}>
        <label style={styles.inputLabel}>Lease Term</label>
        <div style={styles.buttonGroup}>
          {terms.map((t) => (
            <button
              key={t}
              type="button"
              style={{
                ...styles.termButton,
                background: term === t ? '#22c55e' : 'transparent',
                borderColor: term === t ? '#22c55e' : 'rgba(255,255,255,0.2)',
              }}
              onClick={() => setTerm(t)}
            >
              {t} mo
            </button>
          ))}
        </div>
      </div>

      {/* Miles Per Year */}
      <div style={styles.inputGroup}>
        <label style={styles.inputLabel}>Miles Per Year</label>
        <div style={styles.buttonGroup}>
          {milesOptions.map((m) => (
            <button
              key={m}
              type="button"
              style={{
                ...styles.termButton,
                background: miles === m ? '#22c55e' : 'transparent',
                borderColor: miles === m ? '#22c55e' : 'rgba(255,255,255,0.2)',
              }}
              onClick={() => setMiles(m)}
            >
              {(m / 1000)}K
            </button>
          ))}
        </div>
      </div>

      {/* Down Payment */}
      <div style={styles.inputGroup}>
        <label style={styles.inputLabel}>Down Payment</label>
        <div style={styles.sliderContainer}>
          <input
            type="range"
            min={downRange.min}
            max={downRange.max}
            step={downRange.step}
            value={down}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDown(Number(e.target.value))}
            style={styles.slider}
          />
          <span style={styles.sliderValue}>${down.toLocaleString()}</span>
        </div>
      </div>

      {/* Lease Results */}
      <div style={styles.resultsSection}>
        <div style={styles.mainPayment}>
          <span style={styles.paymentLabel}>Monthly Payment</span>
          <span style={styles.paymentAmount}>${calc.monthly}</span>
          <span style={styles.paymentTerm}>per month for {term} months</span>
        </div>

        <div style={styles.resultDetails}>
          <div style={styles.resultRow}>
            <span>Due at Signing</span>
            <span>${calc.dueAtSigning.toLocaleString()}</span>
          </div>
          <div style={styles.resultRow}>
            <span>Residual Value</span>
            <span>${calc.residual.toLocaleString()}</span>
          </div>
          <div style={styles.resultRow}>
            <span>Total Lease Cost</span>
            <span>${calc.totalCost.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        style={styles.selectButton}
        onClick={onSelect}
      >
        Select Lease
      </button>
    </div>
  );
};

const styles: StyleObject = {
  calculatorCard: {
    padding: '24px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  cardIcon: {
    fontSize: '28px',
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
  },
  cardDescription: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    margin: '0 0 20px 0',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  inputLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '8px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
  },
  termButton: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  sliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  slider: {
    flex: 1,
  },
  sliderValue: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#4ade80',
    minWidth: '80px',
    textAlign: 'right',
  },
  resultsSection: {
    padding: '20px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  mainPayment: {
    textAlign: 'center',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  paymentLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  paymentAmount: {
    display: 'block',
    fontSize: '48px',
    fontWeight: '700',
    color: '#ffffff',
  },
  paymentTerm: {
    display: 'block',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
  },
  resultDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
  },
  selectButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
  },
};

export default LeaseCalculator;
