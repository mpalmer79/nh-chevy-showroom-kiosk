/**
 * Quirk AI Kiosk - API Hooks
 * React hooks for managing API calls with loading states and error handling
 */

import { useState, useCallback } from 'react';
import api from './api';
import type { Vehicle, InventoryResponse } from '../types';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface UseApiReturn<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
  execute: <R = T>(apiCall: (...args: unknown[]) => Promise<R>, ...args: unknown[]) => Promise<R>;
  reset: () => void;
}

interface InventoryFilters {
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  bodyType?: string;
  drivetrain?: string;
  cabType?: string;
  condition?: string;
  sortBy?: string;
  limit?: number;
  [key: string]: unknown;
}

interface InventoryStats {
  total?: number;
  byBodyStyle?: Record<string, number>;
  byStatus?: Record<string, number>;
  [key: string]: unknown;
}

interface UseInventoryReturn {
  inventory: Vehicle[];
  stats: InventoryStats | null;
  loading: boolean;
  error: string | null;
  fetchInventory: (filters?: InventoryFilters) => Promise<InventoryResponse | Vehicle[] | never[]>;
  fetchStats: () => Promise<Record<string, unknown> | null>;
  searchByStock: (stockNumber: string) => Promise<Vehicle | null>;
  searchByPreferences: (preferences: Record<string, unknown>) => Promise<Vehicle[] | never[]>;
}

interface TradeInEstimate {
  estimatedValue: number;
  range?: { low: number; high: number };
  adjustments?: Record<string, number>;
  [key: string]: unknown;
}

interface DecodedVin {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  [key: string]: unknown;
}

interface TradeInVehicleData {
  vin?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage: number;
  condition: string;
  [key: string]: unknown;
}

interface UseTradeInReturn {
  estimate: TradeInEstimate | null;
  decodedVin: DecodedVin | null;
  loading: boolean;
  error: string | null;
  getEstimate: (vehicleData: TradeInVehicleData) => Promise<TradeInEstimate | null>;
  decodeVin: (vin: string) => Promise<DecodedVin | null>;
  requestAppraisal: (tradeInData: TradeInVehicleData) => Promise<unknown | null>;
  reset: () => void;
}

interface PaymentResult {
  monthlyPayment: number;
  totalCost?: number;
  [key: string]: unknown;
}

interface Rebate {
  name: string;
  amount: number;
  [key: string]: unknown;
}

interface UsePaymentsReturn {
  leasePayment: PaymentResult | null;
  financePayment: PaymentResult | null;
  rebates: Rebate[];
  loading: boolean;
  error: string | null;
  calculateLease: (params: Record<string, unknown>) => Promise<PaymentResult | null>;
  calculateFinance: (params: Record<string, unknown>) => Promise<PaymentResult | null>;
  fetchRebates: (vehicleId: string) => Promise<Rebate[] | never[]>;
}

interface LeadSubmission {
  leadId?: string;
  success?: boolean;
  [key: string]: unknown;
}

interface LeadData {
  customerName?: string;
  phone?: string;
  email?: string;
  [key: string]: unknown;
}

interface AppointmentData {
  customerName?: string;
  phone?: string;
  vehicleStockNumber?: string;
  preferredDate?: string;
  preferredTime?: string;
  [key: string]: unknown;
}

interface UseLeadsReturn {
  submission: LeadSubmission | null;
  loading: boolean;
  error: string | null;
  submitLead: (leadData: LeadData) => Promise<LeadSubmission | null>;
  scheduleTestDrive: (appointmentData: AppointmentData) => Promise<unknown | null>;
  sendSummary: (phone: string, dealData: Record<string, unknown>) => Promise<unknown | null>;
}

interface UseVehicleDataReturn {
  makes: string[];
  models: string[];
  trims: string[];
  loading: boolean;
  fetchMakes: () => Promise<string[] | never[]>;
  fetchModels: (make: string) => Promise<string[] | never[]>;
  fetchTrims: (make: string, model: string, year: number) => Promise<string[] | never[]>;
}

// ============================================
// HOOKS
// ============================================

/**
 * Generic hook for API calls with loading and error states
 */
export const useApi = (): UseApiReturn<unknown> => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<unknown | null>(null);

  const execute = useCallback(async <R = unknown>(apiCall: (...args: unknown[]) => Promise<R>, ...args: unknown[]): Promise<R> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall(...args);
      setData(result);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback((): void => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { loading, error, data, execute, reset };
};

/**
 * Hook for inventory operations
 */
export const useInventory = (): UseInventoryReturn => {
  const [inventory, setInventory] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async (filters: InventoryFilters = {}): Promise<InventoryResponse | Vehicle[] | never[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.getInventory(filters);
      const vehicles = Array.isArray(result) ? result : (result as InventoryResponse)?.vehicles || [];
      setInventory(vehicles);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (): Promise<Record<string, unknown> | null> => {
    try {
      const result = await api.getInventoryStats();
      setStats(result as InventoryStats);
      return result;
    } catch (err: unknown) {
      console.error('Failed to fetch stats:', err);
      return null;
    }
  }, []);

  const searchByStock = useCallback(async (stockNumber: string): Promise<Vehicle | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.getVehicleByStock(stockNumber);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchByPreferences = useCallback(async (preferences: Record<string, unknown>): Promise<Vehicle[] | never[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.searchByPreferences(preferences);
      const vehicles = Array.isArray(result) ? result : (result as InventoryResponse)?.vehicles || [];
      setInventory(vehicles);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    inventory,
    stats,
    loading,
    error,
    fetchInventory,
    fetchStats,
    searchByStock,
    searchByPreferences,
  };
};

/**
 * Hook for trade-in operations
 */
export const useTradeIn = (): UseTradeInReturn => {
  const [estimate, setEstimate] = useState<TradeInEstimate | null>(null);
  const [decodedVin, setDecodedVin] = useState<DecodedVin | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getEstimate = useCallback(async (vehicleData: TradeInVehicleData): Promise<TradeInEstimate | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.getTradeInEstimate(vehicleData as Parameters<typeof api.getTradeInEstimate>[0]);
      setEstimate(result as TradeInEstimate);
      return result as TradeInEstimate;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const decodeVin = useCallback(async (vin: string): Promise<DecodedVin | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.decodeTradeInVin(vin);
      setDecodedVin(result as DecodedVin);
      return result as DecodedVin;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const requestAppraisal = useCallback(async (tradeInData: TradeInVehicleData): Promise<unknown | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.requestAppraisal(tradeInData as Parameters<typeof api.requestAppraisal>[0]);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback((): void => {
    setEstimate(null);
    setDecodedVin(null);
    setError(null);
  }, []);

  return {
    estimate,
    decodedVin,
    loading,
    error,
    getEstimate,
    decodeVin,
    requestAppraisal,
    reset,
  };
};

/**
 * Hook for payment calculations
 */
export const usePayments = (): UsePaymentsReturn => {
  const [leasePayment, setLeasePayment] = useState<PaymentResult | null>(null);
  const [financePayment, setFinancePayment] = useState<PaymentResult | null>(null);
  const [rebates, setRebates] = useState<Rebate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const calculateLease = useCallback(async (params: Record<string, unknown>): Promise<PaymentResult | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.calculateLease(params as Parameters<typeof api.calculateLease>[0]);
      setLeasePayment(result as PaymentResult);
      return result as PaymentResult;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateFinance = useCallback(async (params: Record<string, unknown>): Promise<PaymentResult | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.calculateFinance(params as Parameters<typeof api.calculateFinance>[0]);
      setFinancePayment(result as PaymentResult);
      return result as PaymentResult;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRebates = useCallback(async (vehicleId: string): Promise<Rebate[] | never[]> => {
    try {
      const result = await api.getRebates(vehicleId);
      const rebateList = Array.isArray(result) ? result : (result as { rebates?: Rebate[] }).rebates || result;
      setRebates(rebateList as Rebate[]);
      return result as Rebate[];
    } catch (err: unknown) {
      console.error('Failed to fetch rebates:', err);
      return [];
    }
  }, []);

  return {
    leasePayment,
    financePayment,
    rebates,
    loading,
    error,
    calculateLease,
    calculateFinance,
    fetchRebates,
  };
};

/**
 * Hook for lead submission and handoff
 */
export const useLeads = (): UseLeadsReturn => {
  const [submission, setSubmission] = useState<LeadSubmission | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const submitLead = useCallback(async (leadData: LeadData): Promise<LeadSubmission | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.submitLead(leadData as Parameters<typeof api.submitLead>[0]);
      setSubmission(result as LeadSubmission);
      return result as LeadSubmission;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleTestDrive = useCallback(async (appointmentData: AppointmentData): Promise<unknown | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.scheduleTestDrive(appointmentData as Parameters<typeof api.scheduleTestDrive>[0]);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendSummary = useCallback(async (phone: string, dealData: Record<string, unknown>): Promise<unknown | null> => {
    try {
      const result = await api.sendDealSummary(phone, dealData);
      return result;
    } catch (err: unknown) {
      console.error('Failed to send summary:', err);
      return null;
    }
  }, []);

  return {
    submission,
    loading,
    error,
    submitLead,
    scheduleTestDrive,
    sendSummary,
  };
};

/**
 * Hook for vehicle data (makes, models, trims)
 */
export const useVehicleData = (): UseVehicleDataReturn => {
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [trims, setTrims] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchMakes = useCallback(async (): Promise<string[] | never[]> => {
    setLoading(true);
    try {
      const result = await api.getMakes();
      const makesList = Array.isArray(result) ? result : (result as { makes?: string[] }).makes || result;
      setMakes(makesList as string[]);
      return result;
    } catch (err: unknown) {
      console.error('Failed to fetch makes:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchModels = useCallback(async (make: string): Promise<string[] | never[]> => {
    setLoading(true);
    try {
      const result = await api.getModels(make);
      const modelsList = Array.isArray(result) ? result : (result as { models?: string[] }).models || result;
      setModels(modelsList as string[]);
      return result;
    } catch (err: unknown) {
      console.error('Failed to fetch models:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrims = useCallback(async (make: string, model: string, year: number): Promise<string[] | never[]> => {
    setLoading(true);
    try {
      const result = await api.getTrims(make, model, year);
      const trimsList = Array.isArray(result) ? result : (result as { trims?: string[] }).trims || result;
      setTrims(trimsList as string[]);
      return result;
    } catch (err: unknown) {
      console.error('Failed to fetch trims:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    makes,
    models,
    trims,
    loading,
    fetchMakes,
    fetchModels,
    fetchTrims,
  };
};

export default {
  useApi,
  useInventory,
  useTradeIn,
  usePayments,
  useLeads,
  useVehicleData,
};
