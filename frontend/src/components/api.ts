/**
 * Quirk AI Kiosk - API Service Layer
 * Handles all communication between frontend components and FastAPI backend
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

// Helper function for API requests (uses API_BASE_URL which includes /v1)
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
 * Get base API URL without version prefix (/v1).
 * Used for endpoints not under /v1 (health check, v3 AI routes, etc.)
 * REACT_APP_API_URL already includes /v1, so this strips it.
 */
const getBaseApiUrl = (): string => {
  let base = API_BASE_URL;
  if (base.endsWith('/v1')) {
    base = base.slice(0, -3);
  }
  return base;
};

/**
 * Get or create session ID
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
 * Get all inventory with optional filters
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
 * Get vehicle by stock number
 */
export const getVehicleByStock = async (stockNumber: string): Promise<Vehicle> => {
  return apiRequest<Vehicle>(`/inventory/stock/${stockNumber}`);
};

/**
 * Get vehicle by VIN
 */
export const getVehicleByVin = async (vin: string): Promise<Vehicle> => {
  return apiRequest<Vehicle>(`/inventory/vin/${vin}`);
};

/**
 * Search inventory with quiz-based preferences
 */
export const searchByPreferences = async (preferences: Record<string, unknown>): Promise<Vehicle[]> => {
  return apiRequest<Vehicle[]>('/inventory/search', {
    method: 'POST',
    body: JSON.stringify(preferences),
  });
};

/**
 * Get inventory statistics
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
 * Get inventory sync status
 */
export const getSyncStatus = async (): Promise<SyncStatusResponse> => {
  return apiRequest<SyncStatusResponse>('/inventory/sync/status');
};

/**
 * Trigger manual inventory refresh
 */
export const refreshInventory = async (): Promise<RefreshResponse> => {
  return apiRequest<RefreshResponse>('/inventory/sync/refresh', {
    method: 'POST',
  });
};

/**
 * Get sync history
 */
export const getSyncHistory = async (): Promise<{ history: Array<Record<string, unknown>>; note: string }> => {
  return apiRequest<{ history: Array<Record<string, unknown>>; note: string }>('/inventory/sync/history');
};

// ============================================
// TRADE-IN ENDPOINTS
// ============================================

/**
 * Get trade-in estimate
 */
export const getTradeInEstimate = async (vehicleData: TradeInVehicleData): Promise<TradeInEstimate> => {
  return apiRequest<TradeInEstimate>('/trade-in/estimate', {
    method: 'POST',
    body: JSON.stringify(vehicleData),
  });
};

/**
 * Decode VIN for trade-in
 */
export const decodeTradeInVin = async (vin: string): Promise<Partial<TradeInVehicleData>> => {
  return apiRequest<Partial<TradeInVehicleData>>(`/trade-in/decode/${vin}`);
};

/**
 * Request in-person appraisal
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
 * Calculate lease payment
 */
export const calculateLease = async (params: LeaseParams): Promise<PaymentResult> => {
  return apiRequest<PaymentResult>('/payments/lease', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

/**
 * Calculate finance payment
 */
export const calculateFinance = async (params: FinanceParams): Promise<PaymentResult> => {
  return apiRequest<PaymentResult>('/payments/finance', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

/**
 * Get current rebates and incentives for a vehicle
 */
export const getRebates = async (vehicleId: string): Promise<Array<{ name: string; amount: number }>> => {
  return apiRequest<Array<{ name: string; amount: number }>>(`/payments/rebates/${vehicleId}`);
};

// ============================================
// LEAD / HANDOFF ENDPOINTS
// ============================================

/**
 * Submit customer lead and notify sales team
 */
export const submitLead = async (leadData: LeadData): Promise<{ success: boolean; leadId?: string }> => {
  return apiRequest<{ success: boolean; leadId?: string }>('/leads/handoff', {
    method: 'POST',
    body: JSON.stringify(leadData),
  });
};

/**
 * Schedule test drive
 */
export const scheduleTestDrive = async (appointmentData: TestDriveData): Promise<{ success: boolean; appointmentId?: string }> => {
  return apiRequest<{ success: boolean; appointmentId?: string }>('/leads/test-drive', {
    method: 'POST',
    body: JSON.stringify(appointmentData),
  });
};

/**
 * Send deal summary to customer
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
 * Get available makes
 */
export const getMakes = async (): Promise<string[]> => {
  return apiRequest<string[]>('/vehicles/makes');
};

/**
 * Get models for a make (optionally filtered by year)
 */
export const getModels = async (make: string, year?: string): Promise<string[]> => {
  const params = year ? `?year=${year}` : '';
  return apiRequest<string[]>(`/inventory/models/${make}${params}`);
};

/**
 * Get trims for a model
 */
export const getTrims = async (make: string, model: string, year: number): Promise<string[]> => {
  return apiRequest<string[]>(`/vehicles/trims?make=${make}&model=${model}&year=${year}`);
};

// ============================================
// KIOSK UTILITIES
// ============================================

/**
 * Log kiosk analytics event
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
 * Log or update a kiosk session
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
 * Get traffic statistics (admin)
 */
export const getTrafficStats = async (): Promise<TrafficStats> => {
  return apiRequest<TrafficStats>('/traffic/stats');
};

/**
 * Get single session details (admin)
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
 * Get single session formatted for dashboard 4-square view
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
 * Check if ElevenLabs TTS is available
 */
export const getTTSStatus = async (): Promise<TTSStatusResponse> => {
  return apiRequest<TTSStatusResponse>('/tts/status');
};

/**
 * Convert text to speech using ElevenLabs
 * Returns audio blob or throws error with fallback flag
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
 * Get available ElevenLabs voices
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
  notifyStaff,
  
  // Text-to-Speech
  getTTSStatus,
  textToSpeech,
  getTTSVoices,
};

export default api;
