/**
 * Sales Manager Dashboard - Constants
 */

export const STEP_LABELS: Record<string, string> = {
  welcome: 'Welcome Screen',
  category: 'Selecting Category',
  model: 'Selecting Model',
  cab: 'Selecting Cab',
  colors: 'Choosing Colors',
  budget: 'Setting Budget',
  tradeIn: 'Trade-In Info',
  'trade-in': 'Trade-In Info',
  inventory: 'Browsing Inventory',
  vehicleDetail: 'Viewing Vehicle',
  handoff: 'Ready for Handoff',
  aiChat: 'AI Assistant Chat',
  aiAssistant: 'AI Assistant Chat',
  modelBudget: 'Model & Budget Flow',
  stockLookup: 'Stock Lookup',
  guidedQuiz: 'Guided Quiz',
  browse: 'Browsing',
  browsing: 'Browsing',
  name_entered: 'Just Started',
};

export const DEFAULT_FINANCE_TERMS = [36, 48, 60, 72, 84];
export const DEFAULT_LEASE_TERMS = [24, 36, 39, 48];

export const DEFAULT_OVERRIDES = {
  salePrice: null,
  tradeACV: null,
  downPayment: null,
  adminFee: 499,
  financeTerm: 60,
  financeAPR: 6.9,
  leaseTerm: 36,
  leaseMoneyFactor: 0.00125,
  leaseResidual: 0.55,
};

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

export const REFRESH_INTERVAL = 5000; // 5 seconds
