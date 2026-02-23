import { useState, useMemo, useCallback } from 'react';
import {
  LEASE_CONFIG,
  FINANCE_CONFIG,
  calculateLeasePayment,
  calculateFinancePayment,
  DEFAULT_VEHICLE,
} from '../data/paymentOptions';

interface TradeInInput {
  estimatedValue?: number;
  amountOwed?: number;
}

interface VehicleInput {
  salePrice: number;
  msrp: number;
  model?: string;
  year?: number;
}

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

interface FinanceCalcResult {
  monthly: number;
  totalCost: number;
  totalInterest: number;
}

interface LeaseState {
  term: number;
  setTerm: React.Dispatch<React.SetStateAction<number>>;
  miles: number;
  setMiles: React.Dispatch<React.SetStateAction<number>>;
  down: number;
  setDown: React.Dispatch<React.SetStateAction<number>>;
  calc: LeaseCalcResult;
  terms: number[];
  milesOptions: number[];
  downRange: RangeConfig;
}

interface FinanceState {
  term: number;
  setTerm: React.Dispatch<React.SetStateAction<number>>;
  down: number;
  setDown: React.Dispatch<React.SetStateAction<number>>;
  apr: number;
  setApr: React.Dispatch<React.SetStateAction<number>>;
  calc: FinanceCalcResult;
  terms: number[];
  aprRange: RangeConfig;
  downRange: RangeConfig;
}

interface TradeInState {
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
  owed: number;
  setOwed: React.Dispatch<React.SetStateAction<number>>;
  equity: number;
  hasTradeIn: boolean;
}

interface ComparisonState {
  monthlyDifference: number;
  annualSavings: number;
  leaseIsCheaper: boolean;
}

interface LeasePaymentData {
  type: 'lease';
  monthly: number;
  dueAtSigning: number;
  totalCost: number;
  residual: number;
  term: number;
  milesPerYear: number;
  downPayment: number;
}

interface FinancePaymentData {
  type: 'finance';
  monthly: number;
  totalCost: number;
  totalInterest: number;
  term: number;
  apr: number;
  downPayment: number;
}

interface TradeInData {
  estimatedValue: number;
  amountOwed: number;
  equity: number;
}

interface UsePaymentCalcParams {
  vehicle?: VehicleInput | null;
  tradeIn?: TradeInInput | null;
}

interface UsePaymentCalcReturn {
  vehicle: VehicleInput;
  lease: LeaseState;
  finance: FinanceState;
  tradeIn: TradeInState;
  comparison: ComparisonState;
  getLeasePaymentData: () => LeasePaymentData;
  getFinancePaymentData: () => FinancePaymentData;
  getTradeInData: () => TradeInData | null;
}

export const usePaymentCalc = ({ vehicle, tradeIn }: UsePaymentCalcParams): UsePaymentCalcReturn => {
  const vehicleData: VehicleInput = vehicle || DEFAULT_VEHICLE;

  const [leaseTerm, setLeaseTerm] = useState<number>(LEASE_CONFIG.defaultTerm);
  const [leaseMiles, setLeaseMiles] = useState<number>(LEASE_CONFIG.defaultMiles);
  const [leaseDown, setLeaseDown] = useState<number>(LEASE_CONFIG.defaultDown);

  const [financeTerm, setFinanceTerm] = useState<number>(FINANCE_CONFIG.defaultTerm);
  const [financeDown, setFinanceDown] = useState<number>(FINANCE_CONFIG.defaultDown);
  const [apr, setApr] = useState<number>(FINANCE_CONFIG.defaultApr);

  const [tradeValue, setTradeValue] = useState<number>(tradeIn?.estimatedValue || 0);
  const [tradeOwed, setTradeOwed] = useState<number>(tradeIn?.amountOwed || 0);

  const tradeEquity = Math.max(0, tradeValue - tradeOwed);

  const leaseCalc = useMemo(() => calculateLeasePayment({
    salePrice: vehicleData.salePrice,
    msrp: vehicleData.msrp,
    term: leaseTerm,
    downPayment: leaseDown,
    tradeEquity,
  }), [vehicleData.salePrice, vehicleData.msrp, leaseTerm, leaseDown, tradeEquity]);

  const financeCalc = useMemo(() => calculateFinancePayment({
    salePrice: vehicleData.salePrice,
    term: financeTerm,
    apr,
    downPayment: financeDown,
    tradeEquity,
  }), [vehicleData.salePrice, financeTerm, apr, financeDown, tradeEquity]);

  const monthlyDifference = financeCalc.monthly - leaseCalc.monthly;
  const annualSavings = monthlyDifference * 12;

  const getLeasePaymentData = useCallback((): LeasePaymentData => ({
    type: 'lease',
    ...leaseCalc,
    term: leaseTerm,
    milesPerYear: leaseMiles,
    downPayment: leaseDown,
  }), [leaseCalc, leaseTerm, leaseMiles, leaseDown]);

  const getFinancePaymentData = useCallback((): FinancePaymentData => ({
    type: 'finance',
    ...financeCalc,
    term: financeTerm,
    apr,
    downPayment: financeDown,
  }), [financeCalc, financeTerm, apr, financeDown]);

  const getTradeInData = useCallback((): TradeInData | null => {
    if (tradeValue <= 0) return null;
    return {
      estimatedValue: tradeValue,
      amountOwed: tradeOwed,
      equity: tradeEquity,
    };
  }, [tradeValue, tradeOwed, tradeEquity]);

  return {
    vehicle: vehicleData,

    lease: {
      term: leaseTerm,
      setTerm: setLeaseTerm,
      miles: leaseMiles,
      setMiles: setLeaseMiles,
      down: leaseDown,
      setDown: setLeaseDown,
      calc: leaseCalc,
      terms: LEASE_CONFIG.terms,
      milesOptions: LEASE_CONFIG.milesOptions,
      downRange: LEASE_CONFIG.downPaymentRange,
    },

    finance: {
      term: financeTerm,
      setTerm: setFinanceTerm,
      down: financeDown,
      setDown: setFinanceDown,
      apr,
      setApr,
      calc: financeCalc,
      terms: FINANCE_CONFIG.terms,
      aprRange: FINANCE_CONFIG.aprRange,
      downRange: FINANCE_CONFIG.downPaymentRange,
    },

    tradeIn: {
      value: tradeValue,
      setValue: setTradeValue,
      owed: tradeOwed,
      setOwed: setTradeOwed,
      equity: tradeEquity,
      hasTradeIn: tradeValue > 0,
    },

    comparison: {
      monthlyDifference,
      annualSavings,
      leaseIsCheaper: monthlyDifference > 0,
    },

    getLeasePaymentData,
    getFinancePaymentData,
    getTradeInData,
  };
};

export default usePaymentCalc;
