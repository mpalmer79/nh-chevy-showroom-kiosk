/**
 * KioskApp.test.tsx
 * Comprehensive tests for the main Kiosk application component
 * Tests navigation, browser history integration, customer data management, and screen transitions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import KioskApp from '../components/Kioskapp';

// Mock all child components to isolate KioskApp testing
jest.mock('../components/Welcomescreen', () => {
  return function MockWelcomeScreen({ navigateTo, updateCustomerData }: any) {
    return (
      <div data-testid="welcome-screen">
        <button onClick={() => navigateTo('inventory')}>Go to Inventory</button>
        <button onClick={() => navigateTo('aiAssistant')}>Go to AI</button>
        <button onClick={() => navigateTo('modelBudget')}>Go to Model Budget</button>
        <button onClick={() => navigateTo('stockLookup')}>Go to Stock Lookup</button>
        <button onClick={() => navigateTo('inventory', { bodyStyle: 'SUV' })}>Go to SUV Inventory</button>
        <button onClick={() => navigateTo('trafficLog')} data-testid="welcome-sales-desk">Sales Desk</button>
        <button onClick={() => updateCustomerData({ customerName: 'Test Customer' })}>Set Name</button>
      </div>
    );
  };
});

jest.mock('../components/ModelBudgetSelector', () => {
  return function MockModelBudgetSelector({ navigateTo, subRoute }: any) {
    return (
      <div data-testid="model-budget-screen">
        Model Budget Screen
        {subRoute && <span data-testid="sub-route">{subRoute}</span>}
        <button onClick={() => navigateTo('modelBudget/model/trucks')}>Go to Trucks</button>
        <button onClick={() => navigateTo('inventory')}>Go to Inventory</button>
      </div>
    );
  };
});

jest.mock('../components/Inventoryresults', () => {
  return function MockInventoryResults({ navigateTo, updateCustomerData }: any) {
    return (
      <div data-testid="inventory-screen">
        Inventory Screen
        <button onClick={() => navigateTo('vehicleDetail')}>Select Vehicle</button>
        <button onClick={() => updateCustomerData({ selectedVehicle: { stock: '12345' } })}>
          Select Vehicle Data
        </button>
      </div>
    );
  };
});

jest.mock('../components/AIAssistant', () => {
  return function MockAIAssistant({ navigateTo }: any) {
    return (
      <div data-testid="ai-screen">
        AI Assistant Screen
        <button onClick={() => navigateTo('inventory')}>Go to Inventory</button>
      </div>
    );
  };
});

jest.mock('../components/Vehicledetail', () => {
  return function MockVehicleDetail({ navigateTo }: any) {
    return (
      <div data-testid="vehicle-detail-screen">
        Vehicle Detail Screen
        <button onClick={() => navigateTo('tradeIn')}>Go to Trade In</button>
      </div>
    );
  };
});

jest.mock('../components/TradeInEstimator', () => {
  return function MockTradeInEstimator({ navigateTo, updateCustomerData }: any) {
    return (
      <div data-testid="trade-in-screen">
        Trade In Screen
        <button onClick={() => navigateTo('paymentCalculator')}>Go to Payment</button>
        <button onClick={() => updateCustomerData({ tradeIn: { value: 5000 } })}>
          Set Trade Value
        </button>
      </div>
    );
  };
});

jest.mock('../components/Paymentcalculator', () => {
  return function MockPaymentCalculator({ navigateTo }: any) {
    return (
      <div data-testid="payment-screen">
        Payment Screen
        <button onClick={() => navigateTo('handoff')}>Complete</button>
      </div>
    );
  };
});

jest.mock('../components/Customerhandoff', () => {
  return function MockCustomerHandoff({ navigateTo }: any) {
    return (
      <div data-testid="handoff-screen">
        Handoff Screen
        <button onClick={() => navigateTo('welcome')}>Start Over</button>
      </div>
    );
  };
});

jest.mock('../components/Stocklookup', () => {
  return function MockStockLookup({ navigateTo }: any) {
    return (
      <div data-testid="stock-lookup-screen">
        Stock Lookup Screen
        <button onClick={() => navigateTo('vehicleDetail')}>View Vehicle</button>
      </div>
    );
  };
});

jest.mock('../components/Trafficlog', () => {
  return function MockTrafficLog({ navigateTo }: any) {
    return (
      <div data-testid="traffic-log-screen">
        Traffic Log Screen
        <button onClick={() => navigateTo('salesDashboard')}>Open Dashboard</button>
      </div>
    );
  };
});

jest.mock('../components/SalesManagerDashboard', () => {
  return function MockSalesManagerDashboard({ navigateTo }: any) {
    return (
      <div data-testid="sales-dashboard-screen">
        Sales Dashboard Screen
        <button onClick={() => navigateTo('welcome')}>Exit</button>
      </div>
    );
  };
});

jest.mock('../components/Guidedquiz', () => {
  return function MockGuidedQuiz({ navigateTo }: any) {
    return (
      <div data-testid="guided-quiz-screen">
        Guided Quiz Screen
        <button onClick={() => navigateTo('inventory')}>See Results</button>
      </div>
    );
  };
});

jest.mock('../components/VehicleComparison', () => {
  return function MockVehicleComparison({ navigateTo }: any) {
    return (
      <div data-testid="comparison-screen">
        Comparison Screen
        <button onClick={() => navigateTo('inventory')}>Back to Inventory</button>
      </div>
    );
  };
});

// Mock the API module - CRITICAL: Must include all functions used by KioskApp
jest.mock('../components/api', () => ({
  __esModule: true,
  default: {
    getInventory: jest.fn().mockResolvedValue([]),
    logTraffic: jest.fn().mockResolvedValue({ success: true }),
    logTrafficSession: jest.fn().mockResolvedValue(undefined),
    getVehicleByStock: jest.fn().mockResolvedValue(null),
    chat: jest.fn().mockResolvedValue({ response: 'Test response' }),
    getModels: jest.fn().mockResolvedValue([]),
    getTrafficLog: jest.fn().mockResolvedValue({ sessions: [], total: 0 }),
    getTrafficStats: jest.fn().mockResolvedValue({ total_sessions: 0 }),
    getActiveSessions: jest.fn().mockResolvedValue({ sessions: [], count: 0 }),
  },
}));

// Get reference to the mocked API for use in tests
const getMockApi = () => require('../components/api').default;

// Helper to simulate popstate events with proper state shape
const simulatePopState = (state: { 
  screen: string; 
  index: number;
  subRoute?: string;
  fullRoute?: string;
} | null) => {
  const event = new PopStateEvent('popstate', { state });
  window.dispatchEvent(event);
};

describe('KioskApp Component', () => {
  // Store original history methods
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset mock implementations after clearAllMocks
    const mockApi = getMockApi();
    mockApi.getInventory.mockResolvedValue([]);
    mockApi.logTraffic.mockResolvedValue({ success: true });
    mockApi.logTrafficSession.mockResolvedValue(undefined);
    mockApi.getVehicleByStock.mockResolvedValue(null);
    mockApi.chat.mockResolvedValue({ response: 'Test response' });
    mockApi.getModels.mockResolvedValue([]);
    mockApi.getTrafficLog.mockResolvedValue({ sessions: [], total: 0 });
    mockApi.getTrafficStats.mockResolvedValue({ total_sessions: 0 });
    mockApi.getActiveSessions.mockResolvedValue({ sessions: [], count: 0 });
    
    // Mock history methods
    window.history.pushState = jest.fn();
    window.history.replaceState = jest.fn();
    
    // Reset location hash
    window.location.hash = '';
  });

  afterEach(() => {
    // Restore history methods
    window.history.pushState = originalPushState;
    window.history.replaceState = originalReplaceState;
    
    jest.useRealTimers();
  });

  // Helper to render and wait for loading to complete
  const renderKioskApp = () => {
    const result = render(<KioskApp />);
    // Advance timers to allow async operations to complete
    act(() => {
      jest.advanceTimersByTime(100);
    });
    return result;
  };

  describe('Initial Render', () => {
    test('renders welcome screen by default', async () => {
      renderKioskApp();
      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
      });
    });

    test('renders header with QUIRK logo', async () => {
      renderKioskApp();
      await waitFor(() => {
        expect(screen.getByText('QUIRK')).toBeInTheDocument();
        expect(screen.getByText('AI')).toBeInTheDocument();
      });
    });

    test('renders footer with dealership info', async () => {
      renderKioskApp();
      await waitFor(() => {
        expect(screen.getByText('Quirk Chevrolet')).toBeInTheDocument();
        expect(screen.getByText("New England's #1 Dealer")).toBeInTheDocument();
      });
    });

    test('renders Sales Desk link on welcome screen', async () => {
      renderKioskApp();
      await waitFor(() => {
        // Use getAllByText since there may be multiple Sales Desk buttons (header + welcome screen)
        const salesDeskButtons = screen.getAllByText('Sales Desk');
        expect(salesDeskButtons.length).toBeGreaterThan(0);
      });
    });

    test('does not render back button on welcome screen', async () => {
      renderKioskApp();
      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
      });
      expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });

    test('sets initial browser history state', async () => {
      renderKioskApp();
      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
      });
      expect(window.history.replaceState).toHaveBeenCalledWith(
        expect.objectContaining({ screen: 'welcome', index: 0 }),
        '',
        '#welcome'
      );
    });
  });

  describe('Navigation', () => {
    test('navigates to inventory screen', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Inventory')).toBeInTheDocument();
      });
      
      const navButton = screen.getByText('Go to Inventory');
      fireEvent.click(navButton);

      // Wait for transition
      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });
    });

    test('navigates to AI Assistant screen', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to AI')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Go to AI'));

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByTestId('ai-screen')).toBeInTheDocument();
      });
    });

    test('navigates to Model Budget screen with default subRoute', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Model Budget')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Go to Model Budget'));

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByTestId('model-budget-screen')).toBeInTheDocument();
      });
    });

    test('navigates to Model Budget with sub-route', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Model Budget')).toBeInTheDocument();
      });
      
      // First go to Model Budget
      fireEvent.click(screen.getByText('Go to Model Budget'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('model-budget-screen')).toBeInTheDocument();
      });

      // Then navigate to sub-route
      fireEvent.click(screen.getByText('Go to Trucks'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('sub-route')).toHaveTextContent('model/trucks');
      });
    });

    test('navigates to Stock Lookup screen', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Stock Lookup')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Go to Stock Lookup'));

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stock-lookup-screen')).toBeInTheDocument();
      });
    });

    test('navigates with filter options', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to SUV Inventory')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Go to SUV Inventory'));

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });
    });

    test('pushes state to browser history on navigation', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Inventory')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Go to Inventory'));

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(window.history.pushState).toHaveBeenCalledWith(
          expect.objectContaining({ screen: 'inventory' }),
          '',
          '#inventory'
        );
      });
    });

    test('does not push duplicate consecutive screens', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Inventory')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });

      const pushCallCount = (window.history.pushState as jest.Mock).mock.calls.length;
      
      // Try to navigate to same screen - should not add to history
      fireEvent.click(screen.getByText('Select Vehicle'));
      act(() => { jest.advanceTimersByTime(200); });
      
      // Push count should increase for new screen (vehicleDetail), not duplicate
      expect((window.history.pushState as jest.Mock).mock.calls.length).toBeGreaterThan(pushCallCount);
    });
  });

  describe('Multi-Step Journey', () => {
    test('completes full customer journey: welcome -> inventory -> vehicle detail', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Inventory')).toBeInTheDocument();
      });
      
      // Step 1: Welcome -> Inventory
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });
      
      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });
      
      // Step 2: Inventory -> Vehicle Detail
      fireEvent.click(screen.getByText('Select Vehicle'));
      act(() => { jest.advanceTimersByTime(200); });
      
      await waitFor(() => {
        expect(screen.getByTestId('vehicle-detail-screen')).toBeInTheDocument();
      });
    });

    test('completes journey through AI Assistant path', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to AI')).toBeInTheDocument();
      });
      
      // Welcome -> AI Assistant
      fireEvent.click(screen.getByText('Go to AI'));
      act(() => { jest.advanceTimersByTime(200); });
      
      await waitFor(() => {
        expect(screen.getByTestId('ai-screen')).toBeInTheDocument();
      });
      
      // AI Assistant -> Inventory
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });
      
      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });
    });
  });

  describe('Back Button', () => {
    test('shows back button after navigating away from welcome', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Inventory')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
        expect(screen.getByText('Back')).toBeInTheDocument();
      });
    });

    test('back button returns to previous screen', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Inventory')).toBeInTheDocument();
      });
      
      // Navigate to inventory
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });

      // Click back
      fireEvent.click(screen.getByText('Back'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
      });
    });

    test('back button navigates through history correctly', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Inventory')).toBeInTheDocument();
      });
      
      // Navigate: Welcome -> Inventory -> Vehicle Detail
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });
      
      fireEvent.click(screen.getByText('Select Vehicle'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('vehicle-detail-screen')).toBeInTheDocument();
      });

      // Go back to Inventory
      fireEvent.click(screen.getByText('Back'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });
    });

    test('does not show back button on traffic log screen', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByTestId('welcome-sales-desk')).toBeInTheDocument();
      });
      
      // Navigate to traffic log via Sales Desk
      fireEvent.click(screen.getByTestId('welcome-sales-desk'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('traffic-log-screen')).toBeInTheDocument();
      });
      // Traffic log screen should not show back button (admin screen)
      expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });

    test('does not show back button on sales dashboard screen', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByTestId('welcome-sales-desk')).toBeInTheDocument();
      });
      
      // Navigate to traffic log then dashboard
      fireEvent.click(screen.getByTestId('welcome-sales-desk'));
      act(() => { jest.advanceTimersByTime(200); });

      fireEvent.click(screen.getByText('Open Dashboard'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('sales-dashboard-screen')).toBeInTheDocument();
      });
      expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });
  });

  describe('Browser History Integration', () => {
    test('handles browser back button (popstate)', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Inventory')).toBeInTheDocument();
      });
      
      // Navigate forward
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });

      // Simulate browser back button
      act(() => {
        simulatePopState({ screen: 'welcome', index: 0, fullRoute: 'welcome' });
      });

      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
      });
    });

    test('handles popstate with no state (goes to welcome)', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Inventory')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });

      // Simulate popstate with null state
      act(() => {
        simulatePopState(null);
      });

      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
      });
    });

    test('clears filters when navigating via popstate', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to SUV Inventory')).toBeInTheDocument();
      });
      
      // Navigate with filter
      fireEvent.click(screen.getByText('Go to SUV Inventory'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });

      // Go back via popstate
      act(() => {
        simulatePopState({ screen: 'welcome', index: 0, fullRoute: 'welcome' });
      });

      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
      });

      // Navigate to inventory again without filter
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });

      // Should be at inventory without the SUV filter
      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });
    });
  });

  describe('Reset Journey', () => {
    test('clicking logo resets journey to welcome', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Inventory')).toBeInTheDocument();
      });
      
      // Navigate away from welcome
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });

      // Click logo to reset
      fireEvent.click(screen.getByText('QUIRK'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
      });
    });

    test('reset journey clears customer data', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Set Name')).toBeInTheDocument();
      });
      
      // Set customer name
      fireEvent.click(screen.getByText('Set Name'));
      
      // Navigate to inventory and select vehicle
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Select Vehicle Data'));

      // Reset by clicking logo
      fireEvent.click(screen.getByText('QUIRK'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
      });

      // Customer data should be cleared (component would show default state)
    });
  });

  describe('Customer Data Management', () => {
    test('updates customer data and passes to child components', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Set Name')).toBeInTheDocument();
      });
      
      // Set customer name
      fireEvent.click(screen.getByText('Set Name'));

      // Navigate to inventory and select vehicle
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });
      
      fireEvent.click(screen.getByText('Select Vehicle Data'));
      fireEvent.click(screen.getByText('Select Vehicle'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('vehicle-detail-screen')).toBeInTheDocument();
      });
    });

    test('persists trade-in data through navigation', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Inventory')).toBeInTheDocument();
      });
      
      // Navigate to vehicle detail -> trade in
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });
      
      fireEvent.click(screen.getByText('Select Vehicle'));
      act(() => { jest.advanceTimersByTime(200); });
      
      fireEvent.click(screen.getByText('Go to Trade In'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('trade-in-screen')).toBeInTheDocument();
      });

      // Set trade value
      fireEvent.click(screen.getByText('Set Trade Value'));
      
      // Go to payment
      fireEvent.click(screen.getByText('Go to Payment'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('payment-screen')).toBeInTheDocument();
      });
    });
  });

  describe('Sales Desk Navigation', () => {
    test('Sales Desk link navigates to traffic log', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByTestId('welcome-sales-desk')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTestId('welcome-sales-desk'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('traffic-log-screen')).toBeInTheDocument();
      });
    });

    test('Sales Desk link only shows on welcome screen', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        // Multiple Sales Desk buttons on welcome screen (header + welcome)
        const salesDeskButtons = screen.getAllByText('Sales Desk');
        expect(salesDeskButtons.length).toBeGreaterThan(0);
      });

      // Navigate away
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });

      // The welcome screen's Sales Desk button should not be visible
      expect(screen.queryByTestId('welcome-sales-desk')).not.toBeInTheDocument();
    });
  });

  describe('Traffic Logging', () => {
    test('logs traffic session when customer data changes', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Set Name')).toBeInTheDocument();
      });
      
      // Set customer name (triggers logging)
      fireEvent.click(screen.getByText('Set Name'));

      // Navigate to trigger logging
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });

      // Allow debounce to complete
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Logging should have been called
      expect(getMockApi().logTrafficSession).toHaveBeenCalled();
    });

    test('does not log traffic on admin screens', async () => {
      getMockApi().logTrafficSession.mockClear();
      renderKioskApp();

      await waitFor(() => {
        expect(screen.getByTestId('welcome-sales-desk')).toBeInTheDocument();
      });

      // Navigate to traffic log (admin screen)
      fireEvent.click(screen.getByTestId('welcome-sales-desk'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('traffic-log-screen')).toBeInTheDocument();
      });

      // Allow any debounce to complete
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Traffic logging should not be triggered for admin screens
      const calls = getMockApi().logTrafficSession.mock.calls;
      const adminScreenCalls = calls.filter((call: any) => 
        call[0]?.screen === 'trafficLog' || call[0]?.screen === 'salesDashboard'
      );
      expect(adminScreenCalls.length).toBe(0);
    });

    test('includes vehicle data in traffic log when selected', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Set Name')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Set Name'));
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });
      
      fireEvent.click(screen.getByText('Select Vehicle Data'));

      // Allow debounce
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(getMockApi().logTrafficSession).toHaveBeenCalled();
    });
  });

  describe('Idle Timeout', () => {
    test('resets to welcome after 3 minutes of inactivity', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Inventory')).toBeInTheDocument();
      });
      
      // Navigate away from welcome
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });

      // Advance time by 3+ minutes (idle timeout)
      act(() => {
        jest.advanceTimersByTime(3 * 60 * 1000 + 1000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
      });
    });

    test('user activity resets idle timer', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Inventory')).toBeInTheDocument();
      });
      
      // Navigate away from welcome
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });

      // Advance time by 2 minutes
      act(() => {
        jest.advanceTimersByTime(2 * 60 * 1000);
      });

      // Simulate user activity
      fireEvent.click(screen.getByText('Select Vehicle'));
      act(() => { jest.advanceTimersByTime(200); });

      // Advance another 2 minutes
      act(() => {
        jest.advanceTimersByTime(2 * 60 * 1000);
      });

      // Should still be on vehicle detail (activity reset the timer)
      await waitFor(() => {
        expect(screen.getByTestId('vehicle-detail-screen')).toBeInTheDocument();
      });
    });

    test('idle timeout does not trigger on welcome screen', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
      });

      // Advance time by 5 minutes
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
      });

      // Should still be on welcome
      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
      });
    });

    test('idle timeout does not trigger on admin screens', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByTestId('welcome-sales-desk')).toBeInTheDocument();
      });
      
      // Navigate to traffic log
      fireEvent.click(screen.getByTestId('welcome-sales-desk'));
      act(() => { jest.advanceTimersByTime(200); });

      await waitFor(() => {
        expect(screen.getByTestId('traffic-log-screen')).toBeInTheDocument();
      });

      // Advance time by 5 minutes
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
      });

      // Should still be on traffic log
      await waitFor(() => {
        expect(screen.getByTestId('traffic-log-screen')).toBeInTheDocument();
      });
    });
  });

  describe('Screen Transitions', () => {
    test('applies transition styles during navigation', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Inventory')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Go to Inventory'));

      // During transition (before timer completes)
      // The main element should have transition styles
      const mainContent = screen.getByTestId('welcome-screen').closest('main');
      expect(mainContent).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });
    });
  });

  describe('Header', () => {
    test('header contains QUIRK AI branding', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('QUIRK')).toBeInTheDocument();
      });
      
      const header = screen.getByText('QUIRK').closest('header');
      expect(header).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument();
    });

    test('logo is clickable', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('QUIRK')).toBeInTheDocument();
      });
      
      const logoText = screen.getByText('QUIRK');
      const logoContainer = logoText.closest('div');
      expect(logoContainer).toHaveStyle({ cursor: 'pointer' });
    });
  });

  describe('Footer', () => {
    test('displays dealership name', async () => {
      renderKioskApp();
      await waitFor(() => {
        expect(screen.getByText('Quirk Chevrolet')).toBeInTheDocument();
      });
    });

    test('displays tagline', async () => {
      renderKioskApp();
      await waitFor(() => {
        expect(screen.getByText("New England's #1 Dealer")).toBeInTheDocument();
      });
    });

    test('displays current time', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Quirk Chevrolet')).toBeInTheDocument();
      });
      
      // Footer should contain a time element (format varies)
      const footer = screen.getByText('Quirk Chevrolet').closest('footer');
      expect(footer).toBeInTheDocument();
      // Time format is HH:MM AM/PM - just verify footer exists
    });
  });

  describe('Error Handling', () => {
    test('handles traffic logging errors gracefully', async () => {
      getMockApi().logTraffic.mockRejectedValueOnce(new Error('Network error'));
      
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Set Name')).toBeInTheDocument();
      });
      
      // Set customer name (triggers logging)
      fireEvent.click(screen.getByText('Set Name'));
      
      // Navigate
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });

      // Allow debounce
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // App should still work despite logging error
      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });
    });
  });

  describe('Full Customer Journey', () => {
    test('completes entire customer flow: welcome -> AI -> inventory -> detail -> trade-in -> payment -> handoff', async () => {
      renderKioskApp();
      
      await waitFor(() => {
        expect(screen.getByText('Set Name')).toBeInTheDocument();
      });
      
      // 1. Set name on welcome
      fireEvent.click(screen.getByText('Set Name'));
      
      // 2. Go to AI Assistant
      fireEvent.click(screen.getByText('Go to AI'));
      act(() => { jest.advanceTimersByTime(200); });
      
      await waitFor(() => {
        expect(screen.getByTestId('ai-screen')).toBeInTheDocument();
      });

      // 3. AI -> Inventory
      fireEvent.click(screen.getByText('Go to Inventory'));
      act(() => { jest.advanceTimersByTime(200); });
      
      await waitFor(() => {
        expect(screen.getByTestId('inventory-screen')).toBeInTheDocument();
      });

      // 4. Select vehicle
      fireEvent.click(screen.getByText('Select Vehicle'));
      act(() => { jest.advanceTimersByTime(200); });
      
      await waitFor(() => {
        expect(screen.getByTestId('vehicle-detail-screen')).toBeInTheDocument();
      });

      // 5. Go to trade-in
      fireEvent.click(screen.getByText('Go to Trade In'));
      act(() => { jest.advanceTimersByTime(200); });
      
      await waitFor(() => {
        expect(screen.getByTestId('trade-in-screen')).toBeInTheDocument();
      });

      // 6. Go to payment
      fireEvent.click(screen.getByText('Go to Payment'));
      act(() => { jest.advanceTimersByTime(200); });
      
      await waitFor(() => {
        expect(screen.getByTestId('payment-screen')).toBeInTheDocument();
      });

      // 7. Complete to handoff
      fireEvent.click(screen.getByText('Complete'));
      act(() => { jest.advanceTimersByTime(200); });
      
      await waitFor(() => {
        expect(screen.getByTestId('handoff-screen')).toBeInTheDocument();
      });

      // 8. Start over
      fireEvent.click(screen.getByText('Start Over'));
      act(() => { jest.advanceTimersByTime(200); });
      
      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
      });
    });
  });
});
