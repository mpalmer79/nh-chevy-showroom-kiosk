/**
 * NH Chevy Showroom Kiosk - Trade-In Estimator (Redesigned)
 * ------------------------------------------------
 * - Guided step-by-step trade input
 * - Instant valuation estimate with transparent factors
 * - Optional payoff, equity, and offer routing
 * - Integrates with existing API patterns and UI styling
 *
 * NOTE:
 * This file was renamed to fix Linux CI failures caused by case-sensitive paths.
 * The original file in the repo was TradeInestimator.tsx (lowercase "e"),
 * but tests import "../components/TradeInEstimator" which fails on GitHub Actions.
 */

import React, { useEffect, useMemo, useState } from 'react';
import api from './api';
import type { KioskComponentProps } from '../types';

type TradeInEstimatorProps = KioskComponentProps & {
  isModal?: boolean;
  onClose?: () => void;
  vehicle?: {
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
    mileage?: number;
    vin?: string;
    price?: number;
  };
};

type ConditionOption = 'Excellent' | 'Good' | 'Fair' | 'Poor';

type TradeForm = {
  year: string;
  make: string;
  model: string;
  trim: string;
  mileage: string;
  vin: string;
  condition: ConditionOption;
  hasAccidents: boolean;
  owners: string;
  zip: string;
  payoffAmount: string;
  wantsInstantCashOffer: boolean;
};

type ValuationResult = {
  low: number;
  mid: number;
  high: number;
  adjustments: Array<{ label: string; amount: number }>;
  confidence: 'High' | 'Medium' | 'Low';
  disclaimer: string;
};

const DEFAULT_FORM: TradeForm = {
  year: '',
  make: '',
  model: '',
  trim: '',
  mileage: '',
  vin: '',
  condition: 'Good',
  hasAccidents: false,
  owners: '1',
  zip: '',
  payoffAmount: '',
  wantsInstantCashOffer: false,
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const formatCurrency = (value: number) =>
  value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const safeNumber = (v: string) => {
  const n = Number(String(v).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const isTestEnv = process.env.NODE_ENV === 'test';

const TradeInEstimator: React.FC<TradeInEstimatorProps> = ({
  isModal = true,
  onClose,
  vehicle,
  navigateTo,
  customerData,
  updateCustomerData: _updateCustomerData,
  resetJourney: _resetJourney,
}) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<TradeForm>(() => {
    const initial = { ...DEFAULT_FORM };
    // Use vehicle prop or fall back to customerData.selectedVehicle
    const v = vehicle || customerData?.selectedVehicle;
    if (v?.year) initial.year = String(v.year);
    if (v?.make) initial.make = v.make;
    if (v?.model) initial.model = v.model;
    if (v?.trim) initial.trim = v.trim;
    if (v?.mileage) initial.mileage = String(v.mileage);
    if (v?.vin) initial.vin = v.vin;
    return initial;
  });

  // Handle close - use onClose if provided, otherwise navigate back
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (navigateTo) {
      navigateTo('vehicleDetail');
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [valuation, setValuation] = useState<ValuationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerStyle: React.CSSProperties = useMemo(
    () => ({
      padding: '24px 20px',
      minHeight: '100%',
      boxSizing: 'border-box',
      ...(isModal
        ? {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            overflow: 'auto',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }
        : {}),
    }),
    [isModal]
  );

  const panelStyle: React.CSSProperties = useMemo(
    () => ({
      width: 'min(980px, 100%)',
      background: 'rgba(17, 24, 39, 0.98)',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
      padding: 20,
    }),
    []
  );

  const headerStyle: React.CSSProperties = useMemo(
    () => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 12,
    }),
    []
  );

  const titleStyle: React.CSSProperties = useMemo(
    () => ({
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: 0.2,
      color: 'rgba(255,255,255,0.92)',
    }),
    []
  );

  const subtitleStyle: React.CSSProperties = useMemo(
    () => ({
      marginTop: 4,
      fontSize: 13,
      color: 'rgba(255,255,255,0.62)',
      lineHeight: 1.4,
    }),
    []
  );

  const buttonStyle: React.CSSProperties = useMemo(
    () => ({
      background: 'rgba(74, 222, 128, 0.14)',
      border: '1px solid rgba(74, 222, 128, 0.35)',
      color: 'rgba(255,255,255,0.92)',
      padding: '10px 12px',
      borderRadius: 12,
      cursor: 'pointer',
      fontWeight: 700,
      fontSize: 13,
      transition: 'transform 0.05s ease-in-out',
    }),
    []
  );

  const buttonSecondaryStyle: React.CSSProperties = useMemo(
    () => ({
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.14)',
      color: 'rgba(255,255,255,0.86)',
      padding: '10px 12px',
      borderRadius: 12,
      cursor: 'pointer',
      fontWeight: 700,
      fontSize: 13,
    }),
    []
  );

  const inputStyle: React.CSSProperties = useMemo(
    () => ({
      width: '100%',
      padding: '10px 12px',
      borderRadius: 12,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.10)',
      color: 'rgba(255,255,255,0.92)',
      outline: 'none',
      fontSize: 14,
    }),
    []
  );

  const labelStyle: React.CSSProperties = useMemo(
    () => ({
      fontSize: 12,
      fontWeight: 700,
      color: 'rgba(255,255,255,0.70)',
      marginBottom: 6,
    }),
    []
  );

  const sectionStyle: React.CSSProperties = useMemo(
    () => ({
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: 14,
      marginTop: 10,
    }),
    []
  );

  const grid2Style: React.CSSProperties = useMemo(
    () => ({
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: 12,
    }),
    []
  );

  const grid3Style: React.CSSProperties = useMemo(
    () => ({
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 12,
    }),
    []
  );

  const cardStyle: React.CSSProperties = useMemo(
    () => ({
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: 16,
    }),
    []
  );

  const pillStyle: React.CSSProperties = useMemo(
    () => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 12,
      fontWeight: 800,
      padding: '8px 10px',
      borderRadius: 999,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.10)',
      color: 'rgba(255,255,255,0.82)',
    }),
    []
  );

  const stepLabel = useMemo(() => {
    const labels: Record<number, string> = {
      1: 'Vehicle',
      2: 'Usage',
      3: 'Loan',
      4: 'Estimate',
    };
    return labels[step] ?? 'Estimate';
  }, [step]);

  const canGoNext = useMemo(() => {
    if (step === 1) {
      return form.year.trim() !== '' && form.make.trim() !== '' && form.model.trim() !== '' && form.mileage.trim() !== '';
    }
    if (step === 2) {
      return form.zip.trim() !== '' && form.owners.trim() !== '';
    }
    return true;
  }, [form, step]);

  const setField = <K extends keyof TradeForm>(key: K, value: TradeForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => {
    setStep(1);
    setForm(() => {
      const initial = { ...DEFAULT_FORM };
      if (vehicle?.year) initial.year = String(vehicle.year);
      if (vehicle?.make) initial.make = vehicle.make;
      if (vehicle?.model) initial.model = vehicle.model;
      if (vehicle?.trim) initial.trim = vehicle.trim;
      if (vehicle?.mileage) initial.mileage = String(vehicle.mileage);
      if (vehicle?.vin) initial.vin = vehicle.vin;
      return initial;
    });
    setValuation(null);
    setError(null);
  };

  const computeLocalValuation = (): ValuationResult => {
    const year = safeNumber(form.year);
    const mileage = safeNumber(form.mileage);
    const owners = clamp(safeNumber(form.owners), 1, 6);
    const payoff = safeNumber(form.payoffAmount);

    // Baseline: rough curve (newer and lower miles => higher)
    const currentYear = new Date().getFullYear();
    const age = clamp(currentYear - year, 0, 30);

    const base = clamp(28000 - age * 1500, 2500, 60000);

    // Mileage adjustment: assume 12k/year average
    const expected = age * 12000;
    const delta = mileage - expected;
    const mileageAdj = clamp(-delta * 0.06, -8000, 8000); // +/- $8k cap

    // Condition adjustment
    const conditionAdjMap: Record<ConditionOption, number> = {
      Excellent: 1800,
      Good: 0,
      Fair: -2200,
      Poor: -4500,
    };
    const conditionAdj = conditionAdjMap[form.condition] ?? 0;

    // Accidents adjustment
    const accidentAdj = form.hasAccidents ? -2200 : 0;

    // Owners adjustment
    const ownersAdj = owners <= 1 ? 600 : owners === 2 ? 0 : -400 * (owners - 2);

    // Zip / market adjustment (very light random-ish deterministic factor)
    const zipSeed = safeNumber(form.zip) % 1000;
    const marketAdj = clamp(((zipSeed - 500) / 500) * 600, -600, 600);

    const mid = clamp(base + mileageAdj + conditionAdj + accidentAdj + ownersAdj + marketAdj, 1000, 90000);
    const spread = clamp(1200 + Math.abs(delta) * 0.01 + (form.condition === 'Poor' ? 1400 : 0), 1800, 6500);

    const low = clamp(mid - spread, 500, mid);
    const high = clamp(mid + spread, mid, 120000);

    const adjustments = [
      { label: 'Age/Model baseline', amount: base - 28000 },
      { label: 'Mileage', amount: mileageAdj },
      { label: 'Condition', amount: conditionAdj },
      { label: 'Accident history', amount: accidentAdj },
      { label: 'Ownership history', amount: ownersAdj },
      { label: 'Local market', amount: marketAdj },
      ...(payoff > 0 ? [{ label: 'Payoff (for equity calc only)', amount: 0 }] : []),
    ];

    const confidence: ValuationResult['confidence'] =
      form.vin.trim().length >= 11 && form.zip.trim().length >= 5 ? 'High' : form.zip.trim().length >= 5 ? 'Medium' : 'Low';

    return {
      low: Math.round(low / 50) * 50,
      mid: Math.round(mid / 50) * 50,
      high: Math.round(high / 50) * 50,
      adjustments,
      confidence,
      disclaimer:
        'This is an estimated range based on typical market factors (age, mileage, condition, and local demand). Final appraisal may differ after a quick in-person or photo-based review.',
    };
  };

  const fetchValuation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Prefer API, but always fall back locally (so kiosk is resilient)
      // If API throws, we still show a helpful estimate.
      let result: ValuationResult | null = null;

      try {
        const payload = {
          trade: {
            year: safeNumber(form.year),
            make: form.make.trim(),
            model: form.model.trim(),
            trim: form.trim.trim(),
            mileage: safeNumber(form.mileage),
            vin: form.vin.trim(),
            condition: form.condition,
            hasAccidents: form.hasAccidents,
            owners: safeNumber(form.owners),
            zip: form.zip.trim(),
          },
        };

        // If backend doesn't support this endpoint yet, this will throw.
        // That's fine—we'll use local estimate.
        const res = await api.post<{
          low?: number;
          mid?: number;
          high?: number;
          adjustments?: Array<{ label: string; amount: number }>;
          confidence?: string;
          disclaimer?: string;
        }>('/trade/estimate', payload);
        if (res?.low && res?.mid && res?.high) {
          result = {
            low: res.low,
            mid: res.mid,
            high: res.high,
            adjustments: Array.isArray(res.adjustments) ? res.adjustments : [],
            confidence: (res.confidence as 'High' | 'Medium' | 'Low') ?? 'Medium',
            disclaimer:
              res.disclaimer ??
              'Estimated range is based on provided details and market factors. Final offer may change after verification.',
          };
        }
      } catch {
        // ignore API errors; fallback to local
      }

      if (!result) {
        // For tests, avoid timers / network
        result = computeLocalValuation();
      }

      setValuation(result);
      setStep(4);
    } catch (e: any) {
      setError(e?.message || 'Unable to generate estimate.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-run estimate when step hits 4 and we don't have one yet (but don’t spam)
  useEffect(() => {
    if (step === 4 && !valuation && !isLoading) {
      // In test env we avoid any non-deterministic delays
      if (isTestEnv) {
        fetchValuation();
      } else {
        fetchValuation();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const equity = useMemo(() => {
    const payoff = safeNumber(form.payoffAmount);
    if (!valuation || payoff <= 0) return null;
    return valuation.mid - payoff;
  }, [valuation, form.payoffAmount]);

  const renderProgress = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[1, 2, 3, 4].map((s) => {
          const active = s === step;
          const done = s < step;
          return (
            <span
              key={s}
              style={{
                ...pillStyle,
                background: active ? 'rgba(74, 222, 128, 0.12)' : done ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.12)',
                borderColor: active ? 'rgba(74, 222, 128, 0.28)' : 'rgba(255,255,255,0.10)',
                color: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.78)',
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 900,
                  background: active ? 'rgba(74, 222, 128, 0.25)' : 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              >
                {s}
              </span>
              {s === 1 ? 'Vehicle' : s === 2 ? 'Usage' : s === 3 ? 'Loan' : 'Estimate'}
            </span>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          style={buttonSecondaryStyle}
          onClick={() => {
            if (step === 1) {
              handleClose();
              return;
            }
            setStep((prev) => Math.max(1, prev - 1));
          }}
        >
          {step === 1 ? 'Close' : 'Back'}
        </button>

        {step < 4 && (
          <button
            style={{
              ...buttonStyle,
              opacity: canGoNext ? 1 : 0.55,
              cursor: canGoNext ? 'pointer' : 'not-allowed',
            }}
            disabled={!canGoNext}
            onClick={() => setStep((prev) => Math.min(4, prev + 1))}
          >
            Next
          </button>
        )}

        {step === 4 && (
          <button
            style={buttonStyle}
            onClick={() => {
              handleClose();
            }}
          >
            Done
          </button>
        )}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div style={sectionStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ ...labelStyle, fontSize: 13 }}>Tell us about your trade</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.60)', marginTop: 2 }}>
              The more accurate the details, the tighter the estimate range.
            </div>
          </div>
          <span style={{ ...pillStyle, background: 'rgba(74, 222, 128, 0.10)', borderColor: 'rgba(74, 222, 128, 0.22)' }}>
            Step 1: {stepLabel}
          </span>
        </div>

        <div style={{ marginTop: 14, ...grid3Style }}>
          <div>
            <div style={labelStyle}>Year *</div>
            <input
              style={inputStyle}
              value={form.year}
              onChange={(e) => setField('year', e.target.value)}
              placeholder="2021"
              inputMode="numeric"
            />
          </div>
          <div>
            <div style={labelStyle}>Make *</div>
            <input style={inputStyle} value={form.make} onChange={(e) => setField('make', e.target.value)} placeholder="Chevrolet" />
          </div>
          <div>
            <div style={labelStyle}>Model *</div>
            <input style={inputStyle} value={form.model} onChange={(e) => setField('model', e.target.value)} placeholder="Equinox" />
          </div>
        </div>

        <div style={{ marginTop: 12, ...grid2Style }}>
          <div>
            <div style={labelStyle}>Trim</div>
            <input style={inputStyle} value={form.trim} onChange={(e) => setField('trim', e.target.value)} placeholder="LT / Premier" />
          </div>
          <div>
            <div style={labelStyle}>Mileage *</div>
            <input
              style={inputStyle}
              value={form.mileage}
              onChange={(e) => setField('mileage', e.target.value)}
              placeholder="45000"
              inputMode="numeric"
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={labelStyle}>VIN (optional, boosts accuracy)</div>
          <input style={inputStyle} value={form.vin} onChange={(e) => setField('vin', e.target.value)} placeholder="1G..." />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={sectionStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ ...labelStyle, fontSize: 13 }}>Vehicle usage & history</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.60)', marginTop: 2 }}>
              These inputs affect marketability and likely reconditioning.
            </div>
          </div>
          <span style={{ ...pillStyle, background: 'rgba(74, 222, 128, 0.10)', borderColor: 'rgba(74, 222, 128, 0.22)' }}>
            Step 2: {stepLabel}
          </span>
        </div>

        <div style={{ marginTop: 14, ...grid2Style }}>
          <div>
            <div style={labelStyle}>Condition</div>
            <select style={inputStyle} value={form.condition} onChange={(e) => setField('condition', e.target.value as ConditionOption)}>
              <option>Excellent</option>
              <option>Good</option>
              <option>Fair</option>
              <option>Poor</option>
            </select>
          </div>

          <div>
            <div style={labelStyle}>Owners</div>
            <select style={inputStyle} value={form.owners} onChange={(e) => setField('owners', e.target.value)}>
              <option value="1">1 owner</option>
              <option value="2">2 owners</option>
              <option value="3">3 owners</option>
              <option value="4">4 owners</option>
              <option value="5">5 owners</option>
              <option value="6">6+ owners</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 12, ...grid2Style }}>
          <div>
            <div style={labelStyle}>ZIP Code *</div>
            <input style={inputStyle} value={form.zip} onChange={(e) => setField('zip', e.target.value)} placeholder="03101" inputMode="numeric" />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={form.hasAccidents}
                onChange={(e) => setField('hasAccidents', e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>Accidents reported</span>
            </label>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={form.wantsInstantCashOffer}
              onChange={(e) => setField('wantsInstantCashOffer', e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>
              I’m interested in an Instant Cash Offer (ICO)
            </span>
          </label>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.56)', marginTop: 6, lineHeight: 1.4 }}>
            If selected, a sales advisor can help route your trade through a quick offer workflow.
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div style={sectionStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ ...labelStyle, fontSize: 13 }}>Loan & payoff (optional)</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.60)', marginTop: 2 }}>
              Adds an estimated equity view. Leave blank if you’re unsure.
            </div>
          </div>
          <span style={{ ...pillStyle, background: 'rgba(74, 222, 128, 0.10)', borderColor: 'rgba(74, 222, 128, 0.22)' }}>
            Step 3: {stepLabel}
          </span>
        </div>

        <div style={{ marginTop: 14, ...grid2Style }}>
          <div>
            <div style={labelStyle}>Estimated payoff amount</div>
            <input
              style={inputStyle}
              value={form.payoffAmount}
              onChange={(e) => setField('payoffAmount', e.target.value)}
              placeholder="e.g., 14500"
              inputMode="numeric"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 10 }}>
            <button style={buttonSecondaryStyle} onClick={reset}>
              Start Over
            </button>
            <button
              style={{
                ...buttonStyle,
                opacity: 1,
              }}
              onClick={() => setStep(4)}
            >
              Get Estimate
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.56)', lineHeight: 1.5 }}>
          Tip: Adding your VIN and ZIP improves accuracy. If you don’t know the VIN, we can still estimate using year/make/model/mileage.
        </div>
      </div>
    </div>
  );

  const renderEstimate = () => {
    if (isLoading || !valuation) {
      return (
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: '#4ade80',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: 16,
            }}
          />
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>Calculating your estimate…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }

    const payoff = safeNumber(form.payoffAmount);

    return (
      <div style={sectionStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ ...labelStyle, fontSize: 13 }}>Estimated trade-in range</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', marginTop: 4, lineHeight: 1.4 }}>
                {form.year} {form.make} {form.model} {form.trim ? `(${form.trim})` : ''} • {safeNumber(form.mileage).toLocaleString()} miles
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ ...pillStyle, background: 'rgba(255,255,255,0.06)' }}>Confidence: {valuation.confidence}</span>
                {form.wantsInstantCashOffer && (
                  <span style={{ ...pillStyle, background: 'rgba(59, 130, 246, 0.14)', borderColor: 'rgba(59, 130, 246, 0.35)' }}>
                    Interested in ICO
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button style={buttonSecondaryStyle} onClick={() => setStep(1)}>
                Edit Details
              </button>
              <button style={buttonStyle} onClick={() => handleClose()}>
                Done
              </button>
            </div>
          </div>

          <div style={{ marginTop: 16, ...grid3Style }}>
            <div
              style={{
                background: 'rgba(74, 222, 128, 0.12)',
                border: '1px solid rgba(74, 222, 128, 0.20)',
                borderRadius: 16,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', fontWeight: 800 }}>Low</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6, color: 'rgba(255,255,255,0.95)' }}>
                {formatCurrency(valuation.low)}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 16,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', fontWeight: 800 }}>Most Likely</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6, color: 'rgba(255,255,255,0.95)' }}>
                {formatCurrency(valuation.mid)}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.22)',
                borderRadius: 16,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', fontWeight: 800 }}>High</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6, color: 'rgba(255,255,255,0.95)' }}>
                {formatCurrency(valuation.high)}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 12 }}>
            <div style={{ ...cardStyle, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.82)', marginBottom: 10 }}>What influenced this estimate</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {valuation.adjustments.map((a, idx) => (
                  <div
                    key={`${a.label}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.74)',
                      gap: 10,
                    }}
                  >
                    <span>{a.label}</span>
                    <span style={{ fontWeight: 900, color: 'rgba(255,255,255,0.86)' }}>
                      {a.amount === 0 ? '—' : `${a.amount > 0 ? '+' : ''}${formatCurrency(a.amount)}`}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.56)', lineHeight: 1.45 }}>
                {valuation.disclaimer}
              </div>
            </div>

            <div style={{ ...cardStyle, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.82)' }}>Equity Snapshot</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.60)', marginTop: 6, lineHeight: 1.45 }}>
                If you still owe money, this helps estimate how the trade affects your next purchase.
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.74)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span>Estimated value</span>
                  <span style={{ fontWeight: 900, color: 'rgba(255,255,255,0.90)' }}>{formatCurrency(valuation.mid)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
                  <span>Estimated payoff</span>
                  <span style={{ fontWeight: 900, color: 'rgba(255,255,255,0.90)' }}>{payoff > 0 ? formatCurrency(payoff) : '—'}</span>
                </div>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', margin: '10px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span>Estimated equity</span>
                  <span style={{ fontWeight: 900, color: equity !== null && equity < 0 ? 'rgba(248,113,113,0.95)' : 'rgba(74,222,128,0.95)' }}>
                    {equity === null ? '—' : formatCurrency(equity)}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                <button
                  style={{
                    ...buttonStyle,
                    background: 'rgba(59, 130, 246, 0.15)',
                    borderColor: 'rgba(59, 130, 246, 0.32)',
                  }}
                  onClick={() => {
                    // no-op placeholder; kiosk flow can route to sales advisor or ICO screen
                    handleClose();
                  }}
                >
                  Talk to a Sales Advisor
                </button>

                <button style={buttonSecondaryStyle} onClick={reset}>
                  Estimate Another Trade
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <div style={panelStyle}>
        <div style={headerStyle}>
          <div>
            <div style={titleStyle}>Trade-In Estimator</div>
            <div style={subtitleStyle}>A quick, transparent estimate to help you plan your purchase.</div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {isModal && (
              <button style={buttonSecondaryStyle} onClick={() => (handleClose())}>
                Close
              </button>
            )}
          </div>
        </div>

        {renderProgress()}

        {error && (
          <div
            style={{
              background: 'rgba(248,113,113,0.10)',
              border: '1px solid rgba(248,113,113,0.25)',
              padding: 12,
              borderRadius: 12,
              color: 'rgba(255,255,255,0.88)',
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderEstimate()}
      </div>
    </div>
  );
};

export default TradeInEstimator;
