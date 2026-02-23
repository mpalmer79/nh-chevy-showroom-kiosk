import React, { useState } from 'react';
import { KioskComponentProps, StyleObject } from '../types';

interface LeaseCalcResult {
  monthly: number;
  dueAtSigning: number;
  totalCost: number;
  residual: number;
}

interface FinanceCalcResult {
  monthly: number;
  totalCost: number;
  totalInterest: number;
}

const PaymentCalculator: React.FC<KioskComponentProps> = ({ navigateTo, updateCustomerData, customerData }) => {
  const vehicle = customerData.selectedVehicle || {
    salePrice: 47495,
    msrp: 52995,
    model: 'Silverado 1500',
    year: 2025,
  };

  // Lease State
  const [leaseTerm, setLeaseTerm] = useState<number>(39);
  const [leaseMiles, setLeaseMiles] = useState<number>(12000);
  const [leaseDown, setLeaseDown] = useState<number>(3000);

  // Finance State
  const [financeTerm, setFinanceTerm] = useState<number>(72);
  const [financeDown, setFinanceDown] = useState<number>(3000);
  const [apr, setApr] = useState<number>(6.9);

  // Trade-in (read-only from customerData)
  const tradeValue = customerData.tradeIn?.estimatedValue || 0;
  const tradeOwed = customerData.tradeIn?.amountOwed || 0;

  // Calculate Lease Payment
  const calculateLease = (): LeaseCalcResult => {
    const salePrice = vehicle.salePrice || vehicle.price || 47495;
    const msrp = vehicle.msrp || salePrice;
    const capitalizedCost = salePrice - leaseDown - Math.max(0, tradeValue - tradeOwed);
    const residualPercent = leaseTerm === 24 ? 0.72 : leaseTerm === 36 ? 0.65 : 0.58;
    const residualValue = msrp * residualPercent;
    const moneyFactor = 0.00125; // ~3% APR equivalent

    const depreciation = (capitalizedCost - residualValue) / leaseTerm;
    const rentCharge = (capitalizedCost + residualValue) * moneyFactor;
    const monthlyPayment = depreciation + rentCharge;

    const taxRate = 0.0625; // MA sales tax
    const monthlyWithTax = monthlyPayment * (1 + taxRate);

    return {
      monthly: Math.round(monthlyWithTax),
      dueAtSigning: leaseDown + Math.round(monthlyWithTax) + 895, // first payment + acq fee
      totalCost: Math.round(monthlyWithTax * leaseTerm + leaseDown),
      residual: Math.round(residualValue),
    };
  };

  // Calculate Finance Payment
  const calculateFinance = (): FinanceCalcResult => {
    const salePrice = vehicle.salePrice || vehicle.price || 47495;
    const principal = salePrice - financeDown - Math.max(0, tradeValue - tradeOwed);
    const taxRate = 0.0625;
    const taxAmount = salePrice * taxRate;
    const totalPrincipal = principal + taxAmount;

    const monthlyRate = apr / 100 / 12;
    const payment = totalPrincipal * (monthlyRate * Math.pow(1 + monthlyRate, financeTerm)) /
                   (Math.pow(1 + monthlyRate, financeTerm) - 1);

    const totalCost = payment * financeTerm + financeDown;
    const totalInterest = totalCost - salePrice - taxAmount;

    return {
      monthly: Math.round(payment),
      totalCost: Math.round(totalCost),
      totalInterest: Math.round(totalInterest),
    };
  };

  const leaseCalc = calculateLease();
  const financeCalc = calculateFinance();
  const monthlyDifference = financeCalc.monthly - leaseCalc.monthly;

  const handleApplyDeal = (type: 'lease' | 'finance'): void => {
    const paymentData = type === 'lease'
      ? { type: 'lease' as const, ...leaseCalc, term: leaseTerm, milesPerYear: leaseMiles, downPayment: leaseDown }
      : { type: 'finance' as const, ...financeCalc, term: financeTerm, apr, downPayment: financeDown };

    updateCustomerData({
      paymentPreference: paymentData,
      tradeIn: tradeValue > 0 ? { estimatedValue: tradeValue, amountOwed: tradeOwed } : undefined,
    });
    navigateTo('handoff');
  };

  const vehicleSalePrice = vehicle.salePrice || vehicle.price || 47495;

  return (
    <div style={styles.container}>
      {/* Back Button */}
      <button style={styles.backButton} onClick={() => navigateTo('vehicleDetail')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Vehicle
      </button>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Payment Calculator</h1>
        <p style={styles.subtitle}>
          {vehicle.year} {vehicle.model} &bull; ${vehicleSalePrice.toLocaleString()}
        </p>
      </div>

      {/* Trade-In Section */}
      {(tradeValue > 0 || customerData.tradeIn) && (
        <div style={styles.tradeInBanner}>
          <div style={styles.tradeInInfo}>
            <span style={styles.tradeInIcon}>🔄</span>
            <div>
              <span style={styles.tradeInLabel}>Trade-In Applied</span>
              <span style={styles.tradeInValue}>
                ${tradeValue.toLocaleString()} equity
              </span>
            </div>
          </div>
          <button
            style={styles.editTradeButton}
            onClick={() => navigateTo('tradeIn')}
          >
            Edit
          </button>
        </div>
      )}

      {/* Calculator Grid */}
      <div style={styles.calculatorGrid}>
        {/* Lease Column */}
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
              {[24, 36, 39].map((term) => (
                <button
                  key={term}
                  style={{
                    ...styles.termButton,
                    background: leaseTerm === term ? '#22c55e' : 'transparent',
                    borderColor: leaseTerm === term ? '#22c55e' : 'rgba(255,255,255,0.2)',
                  }}
                  onClick={() => setLeaseTerm(term)}
                >
                  {term} mo
                </button>
              ))}
            </div>
          </div>

          {/* Miles Per Year */}
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Miles Per Year</label>
            <div style={styles.buttonGroup}>
              {[10000, 12000, 15000].map((miles) => (
                <button
                  key={miles}
                  style={{
                    ...styles.termButton,
                    background: leaseMiles === miles ? '#22c55e' : 'transparent',
                    borderColor: leaseMiles === miles ? '#22c55e' : 'rgba(255,255,255,0.2)',
                  }}
                  onClick={() => setLeaseMiles(miles)}
                >
                  {(miles / 1000)}K
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
                min={0}
                max={10000}
                step={500}
                value={leaseDown}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLeaseDown(Number(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.sliderValue}>${leaseDown.toLocaleString()}</span>
            </div>
          </div>

          {/* Lease Results */}
          <div style={styles.resultsSection}>
            <div style={styles.mainPayment}>
              <span style={styles.paymentLabel}>Monthly Payment</span>
              <span style={styles.paymentAmount}>${leaseCalc.monthly}</span>
              <span style={styles.paymentTerm}>per month for {leaseTerm} months</span>
            </div>

            <div style={styles.resultDetails}>
              <div style={styles.resultRow}>
                <span>Due at Signing</span>
                <span>${leaseCalc.dueAtSigning.toLocaleString()}</span>
              </div>
              <div style={styles.resultRow}>
                <span>Residual Value</span>
                <span>${leaseCalc.residual.toLocaleString()}</span>
              </div>
              <div style={styles.resultRow}>
                <span>Total Lease Cost</span>
                <span>${leaseCalc.totalCost.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            style={styles.selectButton}
            onClick={() => handleApplyDeal('lease')}
          >
            Select Lease
          </button>
        </div>

        {/* Finance Column */}
        <div style={styles.calculatorCard}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>🏦</span>
            <h2 style={styles.cardTitle}>Finance</h2>
          </div>
          <p style={styles.cardDescription}>
            Build equity, own it when paid off
          </p>

          {/* Finance Term */}
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Loan Term</label>
            <div style={styles.buttonGroup}>
              {[48, 60, 72, 84].map((term) => (
                <button
                  key={term}
                  style={{
                    ...styles.termButton,
                    background: financeTerm === term ? '#22c55e' : 'transparent',
                    borderColor: financeTerm === term ? '#22c55e' : 'rgba(255,255,255,0.2)',
                  }}
                  onClick={() => setFinanceTerm(term)}
                >
                  {term} mo
                </button>
              ))}
            </div>
          </div>

          {/* APR */}
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Est. APR</label>
            <div style={styles.sliderContainer}>
              <input
                type="range"
                min={2.9}
                max={12.9}
                step={0.1}
                value={apr}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApr(Number(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.sliderValue}>{apr.toFixed(1)}%</span>
            </div>
          </div>

          {/* Down Payment */}
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Down Payment</label>
            <div style={styles.sliderContainer}>
              <input
                type="range"
                min={0}
                max={15000}
                step={500}
                value={financeDown}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFinanceDown(Number(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.sliderValue}>${financeDown.toLocaleString()}</span>
            </div>
          </div>

          {/* Finance Results */}
          <div style={styles.resultsSection}>
            <div style={styles.mainPayment}>
              <span style={styles.paymentLabel}>Monthly Payment</span>
              <span style={styles.paymentAmount}>${financeCalc.monthly}</span>
              <span style={styles.paymentTerm}>per month for {financeTerm} months</span>
            </div>

            <div style={styles.resultDetails}>
              <div style={styles.resultRow}>
                <span>Down Payment</span>
                <span>${financeDown.toLocaleString()}</span>
              </div>
              <div style={styles.resultRow}>
                <span>Total Interest</span>
                <span>${financeCalc.totalInterest.toLocaleString()}</span>
              </div>
              <div style={styles.resultRow}>
                <span>Total Cost</span>
                <span>${financeCalc.totalCost.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            style={styles.selectButton}
            onClick={() => handleApplyDeal('finance')}
          >
            Select Finance
          </button>
        </div>
      </div>

      {/* Comparison Banner */}
      <div style={styles.comparisonBanner}>
        <div style={styles.comparisonIcon}>💡</div>
        <div style={styles.comparisonText}>
          <strong>Leasing saves you ${monthlyDifference}/month</strong>
          <span>That's ${(monthlyDifference * 12).toLocaleString()} per year in your pocket!</span>
        </div>
      </div>

      {/* Trade-In CTA */}
      {!tradeValue && (
        <button
          style={styles.tradeInCTA}
          onClick={() => navigateTo('tradeIn')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
          </svg>
          <div>
            <strong>Have a Trade-In?</strong>
            <span>Get an instant estimate to lower your payment</span>
          </div>
        </button>
      )}

      <style>{`
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255,255,255,0.1);
          height: 6px;
          border-radius: 3px;
          cursor: pointer;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          background: #22c55e;
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

const styles: StyleObject = {
  container: {
    flex: 1,
    padding: '24px 40px',
    overflow: 'auto',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '24px',
    padding: 0,
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.6)',
    margin: 0,
  },
  tradeInBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: 'rgba(74, 222, 128, 0.1)',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  tradeInInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  tradeInIcon: {
    fontSize: '24px',
  },
  tradeInLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  tradeInValue: {
    display: 'block',
    fontSize: '18px',
    fontWeight: '700',
    color: '#4ade80',
  },
  editTradeButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  calculatorGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px',
  },
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
  comparisonBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    background: 'rgba(27, 115, 64, 0.15)',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  comparisonIcon: {
    fontSize: '32px',
  },
  comparisonText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.8)',
  },
  tradeInCTA: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    width: '100%',
    padding: '20px',
    background: 'rgba(255,255,255,0.05)',
    border: '2px dashed rgba(255,255,255,0.2)',
    borderRadius: '12px',
    color: '#ffffff',
    cursor: 'pointer',
    textAlign: 'left',
  },
};

export default PaymentCalculator;
