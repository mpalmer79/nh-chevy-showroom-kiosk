/**
 * NH Chevy Showroom Kiosk - API Service Layer
 *
 * Central API client for all communication between the frontend React
 * components and the FastAPI backend. Every outbound HTTP request in the
 * kiosk flows through this module.
 *
 * **URL convention**
 * `REACT_APP_API_URL` (env var) already includes the `/v1` path segment.
 * V1 endpoints use `apiRequest()` directly (it prepends `API_BASE_URL`).
 * V3 and non-versioned endpoints (health, AI chat, worksheets) use
 * `getBaseApiUrl()` which strips the trailing `/v1`.
 *
 * IMPORTANT: Never add `/v1/` to endpoint strings passed to `apiRequest()`.
 * Doing so causes the double `/v1/v1/` bug.
 *
 * **Exports**
 * - Named exports for each endpoint function (e.g., `getInventory`)
 * - A default `api` object that bundles every export for convenience
 *
 * @module api
 */

import type { Vehicle, InventoryResponse } from '../types';

// Base API URL - configure based on environment
const API_BASE_URL: string = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
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
}

interface TradeInVehicleData {
  vin?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
}

interface TradeInEstimate {
  estimatedValue: number;
  range: { low: number; high: number };
  adjustments: Record<string, number>;
}

interface LeaseParams {
  vehiclePrice: number;
  downPayment: number;
  tradeInValue?: number;
  term: number;
  moneyFactor: number;
  residualPercent: number;
}

interface FinanceParams {
  vehiclePrice: number;
  downPayment: number;
  tradeInValue?: number;
  term: number;
  apr: number;
}

interface PaymentResult {
  monthlyPayment: number;
  totalCost: number;
  downPayment: number;
  term: number;
}

interface LeadData {
  customerName: string;
  phone: string;
  email?: string;
  vehicleInterest?: Vehicle;
  tradeIn?: TradeInVehicleData;
  paymentPreference?: PaymentResult;
  notes?: string;
}

interface TestDriveData {
  customerName: string;
  phone: string;
  email?: string;
  vehicleStockNumber: string;
  preferredDate?: string;
  preferredTime?: string;
}

interface AnalyticsData {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
  sessionId: string;
}

// Chat message for AI conversation history
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

// Enhanced trade-in vehicle info
interface TradeInVehicleInfo {
  year: string | null;
  make: string | null;
  model: string | null;
  mileage: number | null;
}

// Enhanced trade-in data
interface TradeInData {
  hasTrade: boolean | null;
  vehicle: TradeInVehicleInfo | null;
  hasPayoff: boolean | null;
  payoffAmount: number | null;
  monthlyPayment: number | null;
  financedWith: string | null;
}

// Vehicle interest from ModelBudgetSelector
interface VehicleInterestData {
  model: string | null;
  cab: string | null;
  colors: string[];
}

// Budget info
interface BudgetData {
  min: number | null;
  max: number | null;
  downPaymentPercent: number | null;
}

interface TrafficSessionData {
  sessionId?: string;
  customerName?: string | null;
  phone?: string;
  path?: string | null;
  currentStep?: string | null;
  vehicleInterest?: VehicleInterestData;
  budget?: BudgetData;
  vehicleRequested?: boolean;
  actions?: string[];
  vehicle?: Partial<Vehicle>;
  tradeIn?: TradeInData | Partial<TradeInVehicleData & { estimatedValue?: number }>;
  payment?: {
    type?: string;
    monthly?: number;
    term?: number;
    downPayment?: number;
  };
  chatHistory?: ChatMessage[];  // AI chat conversation history
  managerNotes?: string;  // Notes added by sales manager
}

interface TrafficLogEntry {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  phone?: string;
  path?: string;
  currentStep?: string;
  vehicle?: Partial<Vehicle>;
  vehicleInterest?: VehicleInterestData;
  budget?: BudgetData;
  tradeIn?: Partial<TradeInVehicleData & { estimatedValue?: number }>;
  payment?: {
    type?: string;
    monthly?: number;
    term?: number;
    downPayment?: number;
  };
  vehicleRequested?: boolean;
  actions: string[];
  chatHistory?: ChatMessage[];  // AI chat conversation history
}

interface TrafficLogResponse {
  total: number;
  limit: number;
  offset: number;
  sessions: TrafficLogEntry[];
  timezone: string;
  server_time: string;
}

interface TrafficStats {
  total_sessions: number;
  active_now: number;
  today: number;
  today_date: string;
  by_path: Record<string, number>;
  with_vehicle_selected: number;
  with_trade_in: number;
  vehicle_requests: number;
  completed_handoffs: number;
  with_ai_chat: number;
  conversion_rate: number;
  timezone: string;
  server_time: string;
}

// Active session for Sales Manager Dashboard
interface ActiveSession {
  sessionId: string;
  customerName: string | null;
  phone: string | null;
  startTime: string;
  lastActivity: string;
  currentStep: string;
  vehicleInterest: {
    model: string | null;
    cab: string | null;
    colors: string[];
  };
  budget: {
    min: number | null;
    max: number | null;
    downPaymentPercent: number | null;
  };
  tradeIn: {
    hasTrade: boolean | null;
    vehicle: {
      year: string | null;
      make: string | null;
      model: string | null;
      mileage: number | null;
    } | null;
    hasPayoff: boolean | null;
    payoffAmount: number | null;
    monthlyPayment: number | null;
    financedWith: string | null;
  };
  selectedVehicle: {
    stockNumber: string | null;
    year: number | null;
    make: string | null;
    model: string | null;
    trim: string | null;
    price: number | null;
  } | null;
}

interface ActiveSessionsResponse {
  sessions: ActiveSession[];
  count: number;
  timeout_minutes: number;
  server_time: string;
  timezone: string;
}

interface AIChatRequest {
  message: string;
  inventoryContext?: string;
  conversationHistory: Array<{ role: string; content: string }>;
  customerName?: string;
}

interface AIChatResponse {
  message: string;
  suggestedVehicles?: string[];
  vehicles?: Array<{
    stock_number: string;
    model: string;
    price?: number;
    match_reasons: string[];
    score: number;
  }>;
  conversation_state?: Record<string, unknown>;
  tools_used?: string[];
  staff_notified?: boolean;
  metadata?: Record<string, unknown>;
  worksheet_id?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Internal helper for all V1 API requests.
 *
 * Prepends `API_BASE_URL` (which already includes `/v1`) to the given
 * endpoint path, merges default headers, and handles JSON serialization.
 *
 * @typeParam T - Expected shape of the JSON response body.
 * @param endpoint - Relative path **without** the `/v1` prefix (e.g., `/inventory`).
 * @param options  - Standard `RequestInit` plus optional `headers` override.
 * @returns Parsed JSON response of type `T`.
 * @throws {Error} If the response status is not OK or the network request fails.
 *
 * @example
 * ```ts
 * const vehicles = await apiRequest<Vehicle[]>('/inventory?model=Equinox');
 * ```
 */
const apiRequest = async <T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API Error: ${response.status}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error(`API Request Failed: ${endpoint}`, error);
    throw error;
  }
};

/**
 * Return the base API URL **without** the `/v1` version prefix.
 *
 * Because `REACT_APP_API_URL` already includes `/v1`, this helper strips
 * that suffix so callers can build paths for non-v1 endpoints such as:
 *
 * - `/api/health`
 * - `/api/v3/ai/chat`
 * - `/api/v3/worksheet/...`
 *
 * @returns The API origin + `/api` (e.g., `http://localhost:8000/api`).
 */
const getBaseApiUrl = (): string => {
  let base = API_BASE_URL;
  if (base.endsWith('/v1')) {
    base = base.slice(0, -3);
  }
  return base;
};

/**
 * Retrieve the current kiosk session ID from `sessionStorage`, or create a
 * new one if none exists. The ID format is `K<timestamp-base36><random4>`,
 * which is compact and unique per browser session.
 *
 * This ID is used as the `X-Session-ID` header and is tied to the
 * `ConversationState` on the backend.
 *
 * @returns A session ID string (e.g., `KMJQ5X7NABC2`).
 */
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('kiosk_session_id');
  if (!sessionId) {
    sessionId = `K${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    sessionStorage.setItem('kiosk_session_id', sessionId);
  }
  return sessionId;
};

// ============================================
// INVENTORY ENDPOINTS
// ============================================

/**
 * Fetch the full vehicle inventory, optionally filtered by model, price
 * range, body type, drivetrain, cab type, condition, and sort order.
 *
 * Maps to `GET /api/v1/inventory`.
 *
 * @param filters - Optional key/value filters forwarded as query parameters.
 * @returns Either an `InventoryResponse` (with `vehicles`, `total`, `featured`)
 *          or a raw `Vehicle[]` array depending on backend version.
 *
 * @example
 * ```ts
 * const result = await getInventory({ bodyType: 'Truck', maxPrice: 60000 });
 * ```
 */
export const getInventory = async (filters: InventoryFilters = {}): Promise<InventoryResponse | Vehicle[]> => {
  const params = new URLSearchParams();
  
  if (filters.model) params.append('model', filters.model);
  if (filters.minPrice) params.append('min_price', String(filters.minPrice));
  if (filters.maxPrice) params.append('max_price', String(filters.maxPrice));
  if (filters.bodyType) params.append('body_type', filters.bodyType);
  if (filters.drivetrain) params.append('drivetrain', filters.drivetrain);
  if (filters.cabType) params.append('cab_type', filters.cabType);
  if (filters.condition) params.append('condition', filters.condition);
  if (filters.sortBy) params.append('sort_by', filters.sortBy);
  if (filters.limit) params.append('limit', String(filters.limit));
  
  const queryString = params.toString();
  const endpoint = `/inventory${queryString ? `?${queryString}` : ''}`;
  
  return apiRequest<InventoryResponse | Vehicle[]>(endpoint);
};

/**
 * Fetch a single vehicle record by its dealer stock number.
 *
 * Maps to `GET /api/v1/inventory/stock/{stockNumber}`.
 *
 * @param stockNumber - The dealer stock number (e.g., `M39196`).
 * @returns The matching `Vehicle` object.
 * @throws {Error} If the stock number does not exist (404).
 */
export const getVehicleByStock = async (stockNumber: string): Promise<Vehicle> => {
  return apiRequest<Vehicle>(`/inventory/stock/${stockNumber}`);
};

/**
 * Fetch a single vehicle record by its VIN.
 *
 * Maps to `GET /api/v1/inventory/vin/{vin}`.
 *
 * @param vin - 17-character Vehicle Identification Number.
 * @returns The matching `Vehicle` object.
 * @throws {Error} If the VIN is not found (404).
 */
export const getVehicleByVin = async (vin: string): Promise<Vehicle> => {
  return apiRequest<Vehicle>(`/inventory/vin/${vin}`);
};

/**
 * Search the inventory using quiz-based preference data.
 * Used by the `GuidedQuiz` component after the customer completes the quiz.
 *
 * Maps to `POST /api/v1/inventory/search`.
 *
 * @param preferences - Object containing quiz answers (body type, features,
 *                      towing needs, budget, etc.).
 * @returns Ranked list of `Vehicle` objects matching the preferences.
 */
export const searchByPreferences = async (preferences: Record<string, unknown>): Promise<Vehicle[]> => {
  return apiRequest<Vehicle[]>('/inventory/search', {
    method: 'POST',
    body: JSON.stringify(preferences),
  });
};

/**
 * Fetch aggregate statistics about the current inventory (counts by model,
 * body type, price ranges, etc.).
 *
 * Maps to `GET /api/v1/inventory/stats`.
 *
 * @returns A record of inventory statistics.
 */
export const getInventoryStats = async (): Promise<Record<string, unknown>> => {
  return apiRequest<Record<string, unknown>>('/inventory/stats');
};

// ============================================
// INVENTORY SYNC STATUS
// ============================================

export interface SyncStatusResponse {
  status: 'healthy' | 'error';
  source: string;
  vehicleCount: number;
  lastLoadTime: string | null;
  lastFileModified: string | null;
  currentFileModified: string | null;
  filePath: string | null;
  fileExists: boolean;
  fileSizeKb: number;
  loadDurationMs: number;
  freshnessStatus: 'fresh' | 'stale' | 'outdated' | 'unknown';
  minutesSinceLoad: number | null;
  needsRefresh: boolean;
  lastError: string | null;
  lastErrorTime: string | null;
  breakdown: {
    byStatus: Record<string, number>;
    byBodyStyle: Record<string, number>;
  };
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  previousCount: number;
  newCount: number;
  change: number;
  loadDurationMs: number;
  timestamp: string;
}

/**
 * Get the current status of the inventory data sync pipeline.
 *
 * Checks the freshness of the PBS Excel export, reports how many vehicles are
 * loaded, and indicates whether a manual refresh is recommended.
 *
 * Maps to `GET /api/v1/inventory/sync/status`.
 *
 * @returns Detailed sync status including vehicle count, file freshness, and load duration.
 *
 * @example
 * ```ts
 * const status = await getSyncStatus();
 * if (status.needsRefresh) {
 *   await refreshInventory();
 * }
 * ```
 */
export const getSyncStatus = async (): Promise<SyncStatusResponse> => {
  return apiRequest<SyncStatusResponse>('/inventory/sync/status');
};

/**
 * Trigger a manual reload of the inventory from the PBS Excel file.
 *
 * Re-reads `backend/data/inventory.xlsx`, rebuilds the in-memory inventory
 * list, and re-fits the SemanticVehicleRetriever's TF-IDF index.
 *
 * Maps to `POST /api/v1/inventory/sync/refresh`.
 *
 * @returns Refresh result with previous/new counts and duration.
 *
 * @example
 * ```ts
 * const result = await refreshInventory();
 * console.log(`Inventory updated: ${result.previousCount} -> ${result.newCount} vehicles`);
 * ```
 */
export const refreshInventory = async (): Promise<RefreshResponse> => {
  return apiRequest<RefreshResponse>('/inventory/sync/refresh', {
    method: 'POST',
  });
};

/**
 * Retrieve the history of inventory sync/refresh operations.
 *
 * Maps to `GET /api/v1/inventory/sync/history`.
 *
 * @returns An object containing a list of historical sync events and an informational note.
 */
export const getSyncHistory = async (): Promise<{ history: Array<Record<string, unknown>>; note: string }> => {
  return apiRequest<{ history: Array<Record<string, unknown>>; note: string }>('/inventory/sync/history');
};

// ============================================
// TRADE-IN ENDPOINTS
// ============================================

/**
 * Get an estimated trade-in value for a customer's vehicle.
 *
 * Uses year, make, model, mileage, and condition to compute a range estimate.
 *
 * Maps to `POST /api/v1/trade-in/estimate`.
 *
 * @param vehicleData - Trade-in vehicle details including year, make, model, mileage, and condition.
 * @returns Estimated value with low/high range and per-factor adjustments.
 *
 * @example
 * ```ts
 * const estimate = await getTradeInEstimate({
 *   year: 2020, make: 'Toyota', model: 'Camry',
 *   mileage: 45000, condition: 'good'
 * });
 * ```
 */
export const getTradeInEstimate = async (vehicleData: TradeInVehicleData): Promise<TradeInEstimate> => {
  return apiRequest<TradeInEstimate>('/trade-in/estimate', {
    method: 'POST',
    body: JSON.stringify(vehicleData),
  });
};

/**
 * Decode a VIN to populate trade-in vehicle fields (year, make, model, trim).
 *
 * Uses the NHTSA VPIC API on the backend for VIN decoding.
 *
 * Maps to `GET /api/v1/trade-in/decode/{vin}`.
 *
 * @param vin - 17-character Vehicle Identification Number.
 * @returns Partially populated trade-in vehicle data from the VIN decode.
 */
export const decodeTradeInVin = async (vin: string): Promise<Partial<TradeInVehicleData>> => {
  return apiRequest<Partial<TradeInVehicleData>>(`/trade-in/decode/${vin}`);
};

/**
 * Request an in-person trade-in appraisal from the dealership.
 *
 * Sends trade-in vehicle details along with the customer's phone number so
 * the appraisal team can follow up.
 *
 * Maps to `POST /api/v1/trade-in/appraisal`.
 *
 * @param tradeInData - Trade-in vehicle details plus `customerPhone`.
 * @returns Success status and optional appointment ID.
 */
export const requestAppraisal = async (tradeInData: TradeInVehicleData & { customerPhone: string }): Promise<{ success: boolean; appointmentId?: string }> => {
  return apiRequest<{ success: boolean; appointmentId?: string }>('/trade-in/appraisal', {
    method: 'POST',
    body: JSON.stringify(tradeInData),
  });
};

// ============================================
// TRADE-IN PHOTO ANALYSIS
// ============================================

interface PhotoItem {
  id: string;
  data: string;  // Base64 encoded image
  mimeType?: string;
}

interface VehicleInfoForAnalysis {
  year?: string;
  make?: string;
  model?: string;
  mileage?: string;
}

interface ConditionIssue {
  location: string;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  estimatedImpact?: string;
}

interface PhotoAnalysisResult {
  photoId: string;
  category: string;
  issues: ConditionIssue[];
  positives: string[];
  notes: string;
}

export interface PhotoAnalysisResponse {
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor' | 'pending';
  conditionScore: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  summary: string;
  detectedMileage?: string;
  photoResults: PhotoAnalysisResult[];
  recommendations: string[];
  estimatedConditionAdjustment: string;
}

/**
 * Analyze trade-in photos using AI vision
 * FIX: Removed /v1 prefix - apiRequest already prepends API_BASE_URL which includes /v1
 */
export const analyzeTradeInPhotos = async (
  photos: PhotoItem[],
  vehicleInfo?: VehicleInfoForAnalysis
): Promise<PhotoAnalysisResponse> => {
  return apiRequest<PhotoAnalysisResponse>('/trade-in-photos/analyze', {
    method: 'POST',
    body: JSON.stringify({
      photos,
      vehicleInfo,
    }),
  });
};

// ============================================
// PAYMENT CALCULATION ENDPOINTS
// ============================================

/**
 * Calculate a monthly lease payment.
 *
 * Maps to `POST /api/v1/payments/lease`.
 *
 * @param params - Lease parameters: vehicle price, down payment, optional trade-in
 *                 value, term (months), money factor, and residual percentage.
 * @returns Calculated monthly payment, total cost, and term details.
 *
 * @example
 * ```ts
 * const result = await calculateLease({
 *   vehiclePrice: 45000, downPayment: 3000, term: 36,
 *   moneyFactor: 0.00125, residualPercent: 55
 * });
 * ```
 */
export const calculateLease = async (params: LeaseParams): Promise<PaymentResult> => {
  return apiRequest<PaymentResult>('/payments/lease', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

/**
 * Calculate a monthly finance (loan) payment.
 *
 * Maps to `POST /api/v1/payments/finance`.
 *
 * @param params - Finance parameters: vehicle price, down payment, optional
 *                 trade-in value, term (months), and APR.
 * @returns Calculated monthly payment, total cost, and term details.
 *
 * @example
 * ```ts
 * const result = await calculateFinance({
 *   vehiclePrice: 45000, downPayment: 5000, term: 72, apr: 6.9
 * });
 * ```
 */
export const calculateFinance = async (params: FinanceParams): Promise<PaymentResult> => {
  return apiRequest<PaymentResult>('/payments/finance', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

/**
 * Get current manufacturer rebates and incentives for a specific vehicle.
 *
 * Maps to `GET /api/v1/payments/rebates/{vehicleId}`.
 *
 * @param vehicleId - Vehicle stock number or identifier.
 * @returns Array of rebate objects with name and dollar amount.
 */
export const getRebates = async (vehicleId: string): Promise<Array<{ name: string; amount: number }>> => {
  return apiRequest<Array<{ name: string; amount: number }>>(`/payments/rebates/${vehicleId}`);
};

// ============================================
// LEAD / HANDOFF ENDPOINTS
// ============================================

/**
 * Submit a customer lead and trigger a notification to the sales team.
 *
 * This is used by the `CustomerHandoff` component when the customer is ready
 * to speak with a salesperson. Captures the customer's contact info, vehicle
 * interest, trade-in details, and payment preferences.
 *
 * Maps to `POST /api/v1/leads/handoff`.
 *
 * @param leadData - Customer lead data: name, phone, vehicle interest, etc.
 * @returns Success status and the generated lead ID.
 */
export const submitLead = async (leadData: LeadData): Promise<{ success: boolean; leadId?: string }> => {
  return apiRequest<{ success: boolean; leadId?: string }>('/leads/handoff', {
    method: 'POST',
    body: JSON.stringify(leadData),
  });
};

/**
 * Schedule a test drive appointment for a specific vehicle.
 *
 * Maps to `POST /api/v1/leads/test-drive`.
 *
 * @param appointmentData - Customer contact info, stock number, and preferred date/time.
 * @returns Success status and the generated appointment ID.
 */
export const scheduleTestDrive = async (appointmentData: TestDriveData): Promise<{ success: boolean; appointmentId?: string }> => {
  return apiRequest<{ success: boolean; appointmentId?: string }>('/leads/test-drive', {
    method: 'POST',
    body: JSON.stringify(appointmentData),
  });
};

/**
 * Send a deal summary (vehicle, payment, trade-in) to the customer via SMS.
 *
 * Maps to `POST /api/v1/leads/send-summary`.
 *
 * @param phone - Customer's phone number.
 * @param dealData - Deal details to include in the summary message.
 * @returns Success status.
 */
export const sendDealSummary = async (phone: string, dealData: Record<string, unknown>): Promise<{ success: boolean }> => {
  return apiRequest<{ success: boolean }>('/leads/send-summary', {
    method: 'POST',
    body: JSON.stringify({ phone, dealData }),
  });
};

// ============================================
// VEHICLE DATA ENDPOINTS
// ============================================

/**
 * Get the list of vehicle makes (manufacturers) available in inventory.
 *
 * Maps to `GET /api/v1/vehicles/makes`.
 *
 * @returns Array of make strings (e.g., `["Chevrolet"]`).
 */
export const getMakes = async (): Promise<string[]> => {
  return apiRequest<string[]>('/vehicles/makes');
};

/**
 * Get vehicle models available for a given make, optionally filtered by year.
 *
 * Maps to `GET /api/v1/inventory/models/{make}`.
 *
 * @param make - Vehicle manufacturer (e.g., `"Chevrolet"`).
 * @param year - Optional model year filter.
 * @returns Array of model name strings (e.g., `["Equinox", "Silverado 1500"]`).
 */
export const getModels = async (make: string, year?: string): Promise<string[]> => {
  const params = year ? `?year=${year}` : '';
  return apiRequest<string[]>(`/inventory/models/${make}${params}`);
};

/**
 * Get available trim levels for a specific make, model, and year.
 *
 * Maps to `GET /api/v1/vehicles/trims`.
 *
 * @param make  - Vehicle manufacturer (e.g., `"Chevrolet"`).
 * @param model - Vehicle model name (e.g., `"Silverado 1500"`).
 * @param year  - Model year.
 * @returns Array of trim strings (e.g., `["WT", "Custom", "LT", "RST", "LTZ", "High Country"]`).
 */
export const getTrims = async (make: string, model: string, year: number): Promise<string[]> => {
  return apiRequest<string[]>(`/vehicles/trims?make=${make}&model=${model}&year=${year}`);
};

// ============================================
// KIOSK UTILITIES
// ============================================

/**
 * Log a kiosk analytics event (fire-and-forget).
 *
 * Automatically includes the current session ID and timestamp. Failures are
 * silently caught so analytics never blocks the user experience.
 *
 * Maps to `POST /api/v1/kiosk/analytics`.
 *
 * @param event - Event name (e.g., `"vehicle_viewed"`, `"quiz_completed"`).
 * @param data  - Optional event payload with additional context.
 */
export const logAnalytics = async (event: string, data: Record<string, unknown> = {}): Promise<void> => {
  try {
    await apiRequest<void>('/kiosk/analytics', {
      method: 'POST',
      body: JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
        sessionId: getSessionId(),
      } as AnalyticsData),
    });
  } catch (error) {
    // Don't throw on analytics failures
    console.warn('Analytics logging failed:', error);
  }
};

/**
 * Export session ID getter for components
 */
export const getKioskSessionId = getSessionId;

/**
 * Health check
 * FIX: Backend health endpoint is at /api/health (not /api/v1/health)
 * Uses getBaseApiUrl() to strip the /v1 prefix
 */
export const healthCheck = async (): Promise<{ status: string }> => {
  const url = `${getBaseApiUrl()}/health`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return await response.json() as { status: string };
};

// ============================================
// TRAFFIC LOG ENDPOINTS
// ============================================

/**
 * Log or update a kiosk traffic session (fire-and-forget).
 *
 * Called by components as the customer navigates through the kiosk. Each call
 * upserts the session record with the latest customer data, selected vehicle,
 * budget, trade-in info, and chat history.
 *
 * Maps to `POST /api/v1/traffic/session`.
 *
 * @param sessionData - Partial session data to merge into the traffic log.
 */
export const logTrafficSession = async (sessionData: TrafficSessionData): Promise<void> => {
  try {
    await apiRequest<void>('/traffic/session', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: getSessionId(),
        ...sessionData,
      }),
    });
  } catch (error) {
    // Don't throw on traffic log failures
    console.warn('Traffic logging failed:', error);
  }
};

/**
 * Get traffic log entries (admin)
 * @param limit - Number of entries to return
 * @param offset - Pagination offset
 * @param filterToday - If true, filter to today's sessions only
 */
export const getTrafficLog = async (
  limit: number = 50, 
  offset: number = 0,
  filterToday: boolean = false
): Promise<TrafficLogResponse> => {
  const params = new URLSearchParams();
  params.append('limit', String(limit));
  params.append('offset', String(offset));
  if (filterToday) {
    params.append('filter_today', 'true');
  }
  return apiRequest<TrafficLogResponse>(`/traffic/log?${params.toString()}`);
};

/**
 * Get aggregate traffic statistics for the Sales Manager Dashboard.
 *
 * Returns today's session count, active sessions, conversion rate, and
 * breakdowns by path, vehicle selection, trade-in, and AI chat usage.
 *
 * Maps to `GET /api/v1/traffic/stats`.
 *
 * @returns Aggregate traffic statistics.
 */
export const getTrafficStats = async (): Promise<TrafficStats> => {
  return apiRequest<TrafficStats>('/traffic/stats');
};

/**
 * Get full details for a single kiosk traffic session.
 *
 * Used by the Sales Manager Dashboard to drill into a specific customer's
 * activity including their chat history, vehicle interest, and budget.
 *
 * Maps to `GET /api/v1/traffic/log/{sessionId}`.
 *
 * @param sessionId - The kiosk session ID.
 * @returns Full traffic log entry for the session.
 */
export const getTrafficSession = async (sessionId: string): Promise<TrafficLogEntry> => {
  return apiRequest<TrafficLogEntry>(`/traffic/log/${sessionId}`);
};

/**
 * Get active kiosk sessions for Sales Manager Dashboard
 * @param timeoutMinutes - Consider sessions active if updated within this many minutes (default 30)
 */
export const getActiveSessions = async (timeoutMinutes: number = 30): Promise<ActiveSessionsResponse> => {
  return apiRequest<ActiveSessionsResponse>(`/traffic/active?timeout_minutes=${timeoutMinutes}`);
};

/**
 * Get a single session formatted for the Sales Manager Dashboard view.
 *
 * Returns structured data suitable for the dashboard's customer detail panel,
 * including vehicle interest, budget, trade-in, and selected vehicle info.
 *
 * Maps to `GET /api/v1/traffic/dashboard/{sessionId}`.
 *
 * @param sessionId - The kiosk session ID.
 * @returns Session data formatted for dashboard consumption.
 */
export const getSessionForDashboard = async (sessionId: string): Promise<ActiveSession> => {
  return apiRequest<ActiveSession>(`/traffic/dashboard/${sessionId}`);
};

// ============================================
// AI ASSISTANT ENDPOINTS
// ============================================

/**
 * Chat with AI assistant for vehicle recommendations
 * Uses V3 intelligent AI with tools and persistent memory
 * FIX: Uses getBaseApiUrl() instead of duplicated /v1-stripping logic
 */
export const chatWithAI = async (request: AIChatRequest): Promise<AIChatResponse> => {
  // Build V3-compatible request with session_id
  const v3Request = {
    message: request.message,
    session_id: getSessionId(),
    conversation_history: request.conversationHistory.map(m => ({
      role: m.role,
      content: m.content
    })),
    customer_name: request.customerName || null
  };
  
  const url = `${getBaseApiUrl()}/v3/ai/chat`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(v3Request),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API Error: ${response.status}`);
  }
  
  return await response.json() as AIChatResponse;
};

/**
 * Chat with AI assistant using Server-Sent Events (SSE) streaming.
 * Provides real-time text deltas, tool execution events, and vehicle recommendations
 * as they are produced by the backend.
 *
 * @param message - The user's message text
 * @param sessionId - Current kiosk session ID
 * @param conversationHistory - Previous messages in the conversation
 * @param customerName - Optional customer name for personalization
 * @param onTextDelta - Called with each incremental text chunk from the AI
 * @param onVehicles - Called when vehicle recommendations are available
 * @param onToolStart - Called when the AI begins executing a tool
 * @param onWorksheet - Called when a Digital Worksheet is created
 * @param onDone - Called when the full response is complete, with metadata
 * @param onError - Called if an error occurs during streaming
 */
export const chatWithAIStream = async (
  message: string,
  sessionId: string,
  conversationHistory: Array<{ role: string; content: string }>,
  customerName: string | undefined,
  onTextDelta: (text: string) => void,
  onVehicles?: (vehicles: Array<{
    stock_number: string;
    model: string;
    price?: number;
  }>) => void,
  onToolStart?: (toolName: string) => void,
  onWorksheet?: (worksheetId: string) => void,
  onDone?: (metadata: Record<string, unknown>) => void,
  onError?: (error: string) => void,
): Promise<void> => {
  const url = `${getBaseApiUrl()}/v3/ai/chat/stream`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      conversation_history: conversationHistory.map(m => ({
        role: m.role,
        content: m.content,
      })),
      customer_name: customerName || null,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as Record<string, string>).detail || `Stream request failed: ${response.status}`
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body for streaming');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ') && eventType) {
          try {
            const data = JSON.parse(line.slice(6));
            switch (eventType) {
              case 'text_delta':
                onTextDelta(data.text);
                break;
              case 'vehicles':
                onVehicles?.(data.vehicles);
                break;
              case 'tool_start':
                onToolStart?.(data.tool);
                break;
              case 'worksheet':
                onWorksheet?.(data.worksheet_id);
                break;
              case 'done':
                onDone?.(data);
                break;
              case 'error':
                onError?.(data.error);
                break;
              // 'thinking' and 'tool_result' events are informational;
              // consumers can extend handling if needed
            }
          } catch {
            // Skip malformed SSE event data
          }
          eventType = '';
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
};

/**
 * Notify staff when customer requests assistance
 * Triggers Slack/SMS/Email notifications
 * FIX: Uses getBaseApiUrl() instead of duplicated /v1-stripping logic
 */
export interface NotifyStaffRequest {
  notification_type: 'sales' | 'vehicle_request' | 'appraisal' | 'finance';
  message: string;
  vehicle_stock?: string;
  vehicle_info?: {
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
    exteriorColor?: string;
    msrp?: number;
    salePrice?: number;
  };
}

export interface NotifyStaffResponse {
  success: boolean;
  slack_sent?: boolean;
  sms_sent?: boolean;
  email_sent?: boolean;
  errors?: string[];
}

export const notifyStaff = async (request: NotifyStaffRequest): Promise<NotifyStaffResponse> => {
  const url = `${getBaseApiUrl()}/v3/ai/notify-staff`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': getSessionId(),
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API Error: ${response.status}`);
  }
  
  return await response.json() as NotifyStaffResponse;
};

// ============================================
// TEXT-TO-SPEECH (ELEVENLABS)
// ============================================

export interface TTSStatusResponse {
  available: boolean;
  provider: 'elevenlabs' | 'browser';
  voice_id: string | null;
  voices: Record<string, string>;
}

export interface TTSRequest {
  text: string;
  voice_id?: string;
  stability?: number;
  similarity_boost?: number;
  style?: number;
}

/**
 * Check whether ElevenLabs text-to-speech is available and configured.
 *
 * If the ElevenLabs API key is not set on the backend, the response
 * indicates browser-based TTS as the fallback provider.
 *
 * Maps to `GET /api/v1/tts/status`.
 *
 * @returns TTS availability, active provider, voice ID, and available voices.
 */
export const getTTSStatus = async (): Promise<TTSStatusResponse> => {
  return apiRequest<TTSStatusResponse>('/tts/status');
};

/**
 * Convert text to speech audio using ElevenLabs.
 *
 * Returns the generated audio as a binary `Blob` suitable for playback via
 * `URL.createObjectURL()`. On failure, the thrown error includes a `fallback`
 * property indicating whether the caller should fall back to browser TTS.
 *
 * Maps to `POST /api/v1/tts/speak`.
 *
 * @param request - TTS parameters: text, optional voice ID, and voice settings.
 * @returns Audio blob (MP3/MPEG).
 * @throws {Error & { fallback?: boolean }} On API failure. Check `error.fallback`
 *         to decide whether to use browser speechSynthesis as a fallback.
 */
export const textToSpeech = async (request: TTSRequest): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/tts/speak`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.detail?.message || 'TTS request failed') as Error & { fallback?: boolean };
    error.fallback = errorData.detail?.fallback ?? true;
    throw error;
  }
  
  return response.blob();
};

/**
 * Get the list of available ElevenLabs voices and voice presets.
 *
 * Maps to `GET /api/v1/tts/voices`.
 *
 * @returns Availability flag, array of voice objects, and preset mappings.
 */
export const getTTSVoices = async (): Promise<{
  available: boolean;
  voices: Array<{ voice_id: string; name: string; category: string; preview_url?: string }>;
  presets: Record<string, string>;
}> => {
  return apiRequest('/tts/voices');
};

// ============================================
// EXPORT DEFAULT API OBJECT
// ============================================

const api = {
  // Generic HTTP methods
  post: <T = unknown>(endpoint: string, data?: unknown): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  get: <T = unknown>(endpoint: string): Promise<T> => {
    return apiRequest<T>(endpoint);
  },
  
  // Inventory
  getInventory,
  getVehicleByStock,
  getVehicleByVin,
  searchByPreferences,
  getInventoryStats,
  
  // Inventory Sync
  getSyncStatus,
  refreshInventory,
  getSyncHistory,
  
  // Trade-In
  getTradeInEstimate,
  decodeTradeInVin,
  requestAppraisal,
  analyzeTradeInPhotos,
  
  // Payments
  calculateLease,
  calculateFinance,
  getRebates,
  
  // Leads
  submitLead,
  scheduleTestDrive,
  sendDealSummary,
  
  // Vehicle Data
  getMakes,
  getModels,
  getTrims,
  
  // Utilities
  logAnalytics,
  healthCheck,
  getKioskSessionId,
  
  // Traffic Log
  logTrafficSession,
  getTrafficLog,
  getTrafficStats,
  getTrafficSession,
  
  // Sales Manager Dashboard
  getActiveSessions,
  getSessionForDashboard,
  
  // AI Assistant
  chatWithAI,
  chatWithAIStream,
  notifyStaff,
  
  // Text-to-Speech
  getTTSStatus,
  textToSpeech,
  getTTSVoices,
};

export default api;
