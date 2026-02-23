/**
 * Payment Calculator Configuration
 * Centralized options and defaults for lease/finance calculations
 */

interface RangeConfig {
  min: number;
  max: number;
  step: number;
}

interface LeasePaymentParams {
  salePrice: number;
  msrp: number;
  term: number;
  downPayment: number;
  tradeEquity?: number;
}

interface LeasePaymentResult {
  monthly: number;
  dueAtSigning: number;
  totalCost: number;
  residual: number;
}

interface FinancePaymentParams {
  salePrice: number;
  term: number;
  apr: number;
  downPayment: number;
  tradeEquity?: number;
}

interface FinancePaymentResult {
  monthly: number;
  totalCost: number;
  totalInterest: number;
}

interface LeaseConfigType {
  defaultTerm: number;
  terms: number[];
  defaultMiles: number;
  milesOptions: number[];
  defaultDown: number;
  downPaymentRange: RangeConfig;
  residualPercent: Record<number, number>;
  moneyFactor: number;
  acquisitionFee: number;
}

interface FinanceConfigType {
  defaultTerm: number;
  terms: number[];
  defaultApr: number;
  aprRange: RangeConfig;
  defaultDown: number;
  downPaymentRange: RangeConfig;
}

interface TaxConfigType {
  salesTaxRate: number;
  state: string;
}

interface DefaultVehicleType {
  salePrice: number;
  msrp: number;
  model: string;
  year: number;
}

export const LEASE_CONFIG: LeaseConfigType = {
  defaultTerm: 39,
  terms: [24, 36, 39],

  defaultMiles: 12000,
  milesOptions: [10000, 12000, 15000],

  defaultDown: 3000,
  downPaymentRange: { min: 0, max: 10000, step: 500 },

  residualPercent: {
    24: 0.72,
    36: 0.65,
    39: 0.58,
  },

  moneyFactor: 0.00125,
  acquisitionFee: 895,
};

export const FINANCE_CONFIG: FinanceConfigType = {
  defaultTerm: 72,
  terms: [48, 60, 72, 84],

  defaultApr: 6.9,
  aprRange: { min: 2.9, max: 12.9, step: 0.1 },

  defaultDown: 3000,
  downPaymentRange: { min: 0, max: 10000, step: 500 },
};

export const TAX_CONFIG: TaxConfigType = {
  salesTaxRate: 0.0625,
  state: 'MA',
};

export const calculateLeasePayment = ({
  salePrice,
  msrp,
  term,
  downPayment,
  tradeEquity = 0,
}: LeasePaymentParams): LeasePaymentResult => {
  const capitalizedCost = salePrice - downPayment - Math.max(0, tradeEquity);
  const residualPercent = LEASE_CONFIG.residualPercent[term] || 0.58;
  const residualValue = msrp * residualPercent;

  const depreciation = (capitalizedCost - residualValue) / term;
  const rentCharge = (capitalizedCost + residualValue) * LEASE_CONFIG.moneyFactor;
  const monthlyPayment = depreciation + rentCharge;

  const monthlyWithTax = monthlyPayment * (1 + TAX_CONFIG.salesTaxRate);

  return {
    monthly: Math.round(monthlyWithTax),
    dueAtSigning: downPayment + Math.round(monthlyWithTax) + LEASE_CONFIG.acquisitionFee,
    totalCost: Math.round(monthlyWithTax * term + downPayment),
    residual: Math.round(residualValue),
  };
};

export const calculateFinancePayment = ({
  salePrice,
  term,
  apr,
  downPayment,
  tradeEquity = 0,
}: FinancePaymentParams): FinancePaymentResult => {
  const principal = salePrice - downPayment - Math.max(0, tradeEquity);
  const taxAmount = salePrice * TAX_CONFIG.salesTaxRate;
  const totalPrincipal = principal + taxAmount;

  const monthlyRate = apr / 100 / 12;
  const payment = totalPrincipal *
    (monthlyRate * Math.pow(1 + monthlyRate, term)) /
    (Math.pow(1 + monthlyRate, term) - 1);

  const totalCost = payment * term + downPayment;
  const totalInterest = totalCost - salePrice - taxAmount;

  return {
    monthly: Math.round(payment),
    totalCost: Math.round(totalCost),
    totalInterest: Math.round(totalInterest),
  };
};

export const DEFAULT_VEHICLE: DefaultVehicleType = {
  salePrice: 47495,
  msrp: 52995,
  model: 'Silverado 1500',
  year: 2025,
};

export default {
  LEASE_CONFIG,
  FINANCE_CONFIG,
  TAX_CONFIG,
  calculateLeasePayment,
  calculateFinancePayment,
  DEFAULT_VEHICLE,
};
