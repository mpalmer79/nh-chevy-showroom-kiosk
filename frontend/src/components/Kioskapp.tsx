import React, { useState, useCallback, useEffect, useRef, CSSProperties, ReactNode } from 'react';

// Import all customer journey components (matching actual filenames - case sensitive)
import WelcomeScreen from './Welcomescreen';
import StockLookup from './Stocklookup';
import ModelBudgetSelector from './ModelBudgetSelector';
import GuidedQuiz from './Guidedquiz';
import InventoryResults from './Inventoryresults';
import VehicleDetail from './Vehicledetail';
import VehicleComparison from './VehicleComparison';
import VirtualTestDrive from './VirtualTestDrive';
import PaymentCalculator from './Paymentcalculator';
import TradeInEstimator from './TradeInEstimator';
import CustomerHandoff from './Customerhandoff';
import ProtectionPackages from './Protectionpackages';
import TrafficLog from './Trafficlog';
import AIAssistant from './AIAssistant';
import SalesManagerDashboard from './SalesManagerDashboard';
import InventorySyncDashboard from './InventorySyncDashboard';
import ErrorBoundary from './Errorboundary';
import api from './api';

import type { CustomerData, KioskComponentProps } from '../types';

// Screen names type
type ScreenName = 
  | 'welcome'
  | 'stockLookup'
  | 'modelBudget'
  | 'guidedQuiz'
  | 'aiAssistant'
  | 'inventory'
  | 'vehicleDetail'
  | 'vehicleComparison'
  | 'virtualTestDrive'
  | 'paymentCalculator'
  | 'tradeIn'
  | 'handoff'
  | 'protectionPackages'
  | 'trafficLog'
  | 'salesDashboard'
  | 'inventorySync';

// Navigation options for filtering
interface NavigationOptions {
  bodyStyle?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
}

// Screen error boundary props
interface ScreenErrorBoundaryProps {
  children: ReactNode;
  onReset: () => void;
  screenName: string;
}

// Screen-level error boundary with recovery option
const ScreenErrorBoundary: React.FC<ScreenErrorBoundaryProps> = ({ children, onReset, screenName }) => {
  return (
    <ErrorBoundary
      fallback={
        <div style={screenErrorStyles.container}>
          <div style={screenErrorStyles.icon}>⚠️</div>
          <h2 style={screenErrorStyles.title}>This screen encountered an error</h2>
          <p style={screenErrorStyles.text}>
            We had trouble loading {screenName || 'this screen'}. 
            Let's get you back on track.
          </p>
          <div style={screenErrorStyles.buttons}>
            <button style={screenErrorStyles.primaryBtn} onClick={onReset}>
              Return to Start
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

const screenErrorStyles: Record<string, CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    textAlign: 'center',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '12px',
  },
  text: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '28px',
    maxWidth: '400px',
  },
  buttons: {
    display: 'flex',
    gap: '16px',
  },
  primaryBtn: {
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

// Initial customer data state
const initialCustomerData: CustomerData = {
  customerName: undefined,
  namePhaseCompleted: undefined,
  path: undefined,
  stockNumber: undefined,
  selectedModel: undefined,
  budgetRange: { min: 300, max: 800 },
  downPayment: 3000,
  quizAnswers: {},
  selectedVehicle: undefined,
  tradeIn: undefined,
  paymentPreference: undefined,
  contactInfo: undefined,
  // Filter state for inventory
  bodyStyleFilter: undefined,
};

// Helper to extract base screen name from navigation path
// e.g., 'modelBudget/model/trucks' → 'modelBudget'
const getBaseScreen = (path: string): ScreenName => {
  return path.split('/')[0] as ScreenName;
};

// Main Kiosk Application - Customer Journey Controller
const KioskApp: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('welcome');
  const [customerData, setCustomerData] = useState<CustomerData>(initialCustomerData);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [modelBudgetSubRoute, setModelBudgetSubRoute] = useState<string>('category');
  
  // Track navigation history for back button support (stores full paths including sub-routes)
  const navigationHistoryRef = useRef<string[]>(['welcome']);
  const isPopStateNavigationRef = useRef<boolean>(false);

  const updateCustomerData = useCallback((updates: Partial<CustomerData>): void => {
    setCustomerData(prev => ({ ...prev, ...updates }));
  }, []);

  // Navigate to a new screen with browser history support
  // Supports sub-routes for modelBudget (e.g., 'modelBudget/model/trucks')
  // Now accepts optional navigation options for filtering
  const navigateTo = useCallback((screen: string, options?: NavigationOptions): void => {
    const screenName = getBaseScreen(screen);
    
    // Handle modelBudget sub-routes
    if (screen.startsWith('modelBudget/')) {
      setModelBudgetSubRoute(screen.substring('modelBudget/'.length));
    } else if (screenName === 'modelBudget') {
      setModelBudgetSubRoute('category');
    }
    
    // Don't push duplicate consecutive paths (compare full path, not just screen name)
    const currentHistory = navigationHistoryRef.current;
    if (currentHistory[currentHistory.length - 1] === screen && !options) {
      return;
    }
    
    // Apply filter options to customer data if provided
    if (options) {
      setCustomerData(prev => ({
        ...prev,
        bodyStyleFilter: options.bodyStyle || undefined,
        selectedModel: options.model || prev.selectedModel,
        budgetRange: options.minPrice && options.maxPrice 
          ? { min: options.minPrice, max: options.maxPrice }
          : prev.budgetRange,
      }));
    } else if (screenName === 'inventory') {
      // Clear filters when navigating to inventory without options
      setCustomerData(prev => ({
        ...prev,
        bodyStyleFilter: undefined,
      }));
    }
    
    setIsTransitioning(true);
    
    setTimeout(() => {
      // If this navigation is triggered by popstate (back button), don't push to history
      if (!isPopStateNavigationRef.current) {
        // Add full path to navigation history
        navigationHistoryRef.current = [...navigationHistoryRef.current, screen];
        
        // Push state to browser history (store both base screen and full path)
        window.history.pushState(
          { screen: screenName, fullPath: screen, index: navigationHistoryRef.current.length - 1 },
          '',
          `#${screen}`
        );
      }
      
      isPopStateNavigationRef.current = false;
      setCurrentScreen(screenName);
      setIsTransitioning(false);
    }, 150);
  }, []);

  // Go back to previous screen
  const goBack = useCallback((): void => {
    const currentHistory = navigationHistoryRef.current;
    
    // If we're at welcome or only have one screen, can't go back further
    if (currentHistory.length <= 1 || currentScreen === 'welcome') {
      return;
    }
    
    // Remove current screen from history
    const newHistory = currentHistory.slice(0, -1);
    navigationHistoryRef.current = newHistory;
    
    // Get the previous full path and extract base screen name
    const previousPath = newHistory[newHistory.length - 1];
    const previousScreen = getBaseScreen(previousPath);
    
    // Restore modelBudget sub-route if going back to a modelBudget step
    if (previousPath.startsWith('modelBudget/')) {
      setModelBudgetSubRoute(previousPath.substring('modelBudget/'.length));
    } else if (previousScreen === 'modelBudget') {
      setModelBudgetSubRoute('category');
    }
    
    // Clear filters when going back
    setCustomerData(prev => ({
      ...prev,
      bodyStyleFilter: undefined,
    }));
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentScreen(previousScreen);
      setIsTransitioning(false);
    }, 150);
  }, [currentScreen]);

  const resetJourney = useCallback((): void => {
    // Clear navigation history and reset to welcome
    navigationHistoryRef.current = ['welcome'];
    
    // Replace current history state with welcome
    window.history.replaceState(
      { screen: 'welcome', index: 0 },
      '',
      '#welcome'
    );
    
    setModelBudgetSubRoute('category');
    setCustomerData(initialCustomerData);
    setCurrentScreen('welcome');
  }, []);

  // Initialize browser history state on mount
  useEffect(() => {
    // Set initial state in browser history
    window.history.replaceState(
      { screen: 'welcome', index: 0 },
      '',
      '#welcome'
    );
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent): void => {
      // Prevent default browser behavior of leaving the page
      const state = event.state;
      
      if (state && state.screen) {
        // Browser back/forward to a known screen
        const targetScreen = state.screen as ScreenName;
        const targetIndex = state.index as number;
        
        // Update our navigation history to match
        navigationHistoryRef.current = navigationHistoryRef.current.slice(0, targetIndex + 1);
        
        // Mark this as a popstate navigation so navigateTo doesn't push to history
        isPopStateNavigationRef.current = true;
        
        // Restore modelBudget sub-route if applicable
        if (state.fullPath && state.fullPath.startsWith('modelBudget/')) {
          setModelBudgetSubRoute(state.fullPath.substring('modelBudget/'.length));
        } else if (targetScreen === 'modelBudget') {
          setModelBudgetSubRoute('category');
        }
        
        // Clear filters when navigating via back/forward
        setCustomerData(prev => ({
          ...prev,
          bodyStyleFilter: undefined,
        }));
        
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentScreen(targetScreen);
          setIsTransitioning(false);
          isPopStateNavigationRef.current = false;
        }, 150);
      } else {
        // No state - user is trying to go before our app started
        // Push them back to welcome and make it the backstop
        window.history.pushState(
          { screen: 'welcome', index: 0 },
          '',
          '#welcome'
        );
        
        navigationHistoryRef.current = ['welcome'];
        setCurrentScreen('welcome');
        setCustomerData(initialCustomerData);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Prevent leaving the app when on welcome screen
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      // Only show warning if user has progressed beyond welcome
      if (currentScreen !== 'welcome' && navigationHistoryRef.current.length > 1) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentScreen]);

  // Idle timeout - return to welcome after 3 minutes of inactivity
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const resetTimer = (): void => {
      clearTimeout(timeout);
      if (currentScreen !== 'welcome' && currentScreen !== 'trafficLog' && currentScreen !== 'salesDashboard') {
        timeout = setTimeout(() => {
          resetJourney();
        }, 180000); // 3 minutes
      }
    };

    const events: string[] = ['touchstart', 'click', 'mousemove', 'keypress'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [currentScreen, resetJourney]);

  // Traffic logging - log session on key customer data changes
  useEffect(() => {
    // Skip logging for admin screens
    if (currentScreen === 'trafficLog' || currentScreen === 'salesDashboard') return;
    
    // Only log if we have some meaningful data
    const hasData = customerData.customerName || 
                    customerData.path || 
                    customerData.selectedVehicle || 
                    customerData.tradeIn ||
                    customerData.contactInfo ||
                    customerData.conversationLog;
    
    if (!hasData) return;

    // Build session data for logging
    const sessionData: Record<string, unknown> = {
      customerName: customerData.customerName,
      phone: customerData.contactInfo?.phone,
      path: customerData.path,
      vehicleRequested: !!customerData.vehicleRequested,
      actions: [currentScreen],
    };

    // Add vehicle if selected
    if (customerData.selectedVehicle) {
      const vehicle = customerData.selectedVehicle;
      sessionData.vehicle = {
        stockNumber: vehicle.stockNumber || vehicle.stock_number,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
        msrp: vehicle.msrp,
        salePrice: vehicle.salePrice || vehicle.sale_price,
      };
    }

    // Add trade-in if provided
    if (customerData.tradeIn) {
      const tradeIn = customerData.tradeIn;
      sessionData.tradeIn = {
        year: tradeIn.year,
        make: tradeIn.make,
        model: tradeIn.model,
        mileage: tradeIn.mileage,
        condition: tradeIn.condition,
        estimatedValue: tradeIn.estimatedValue,
      };
    }

    // Add payment preference if set
    if (customerData.paymentPreference) {
      const payment = customerData.paymentPreference;
      sessionData.payment = {
        type: payment.type,
        monthly: payment.monthly,
        term: payment.term,
        downPayment: payment.downPayment,
      };
    }

    // Add AI conversation log if present
    if (customerData.conversationLog && customerData.conversationLog.length > 0) {
      sessionData.conversationLog = customerData.conversationLog;
    }

    // Log to traffic API (fire and forget)
    api.logTrafficSession(sessionData).catch(() => {
      // Silent fail - don't disrupt user experience
    });
  }, [
    currentScreen,
    customerData.customerName,
    customerData.path,
    customerData.selectedVehicle,
    customerData.tradeIn,
    customerData.paymentPreference,
    customerData.contactInfo,
    customerData.conversationLog,
    customerData,
  ]);

  // Screen components map
  const screens: Record<ScreenName, React.FC<KioskComponentProps>> = {
    welcome: WelcomeScreen,
    stockLookup: StockLookup,
    modelBudget: ModelBudgetSelector,
    guidedQuiz: GuidedQuiz,
    aiAssistant: AIAssistant,
    inventory: InventoryResults,
    vehicleDetail: VehicleDetail,
    vehicleComparison: VehicleComparison,
    virtualTestDrive: VirtualTestDrive,
    paymentCalculator: PaymentCalculator,
    tradeIn: TradeInEstimator,
    handoff: CustomerHandoff,
    protectionPackages: ProtectionPackages,
    trafficLog: TrafficLog,
    salesDashboard: SalesManagerDashboard,
    inventorySync: InventorySyncDashboard,
  };

  const CurrentScreenComponent = screens[currentScreen] || WelcomeScreen;

  // Check if we can go back (not on welcome and have history)
  const canGoBack = currentScreen !== 'welcome' && 
                    currentScreen !== 'trafficLog' && 
                    currentScreen !== 'salesDashboard' &&
                    currentScreen !== 'inventorySync' &&
                    navigationHistoryRef.current.length > 1;

  // Props passed to all screen components
  const screenProps: KioskComponentProps = {
    customerData,
    updateCustomerData,
    navigateTo,
    resetJourney,
  };

  return (
    <div style={{
      ...styles.container,
      ...(currentScreen === 'aiAssistant' ? {
        backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.35), rgba(15, 23, 42, 0.4)), url(/showroom3.jfif)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      } : {})
    }}>
      {/* Header */}
      <header style={{
        ...styles.header,
        ...(currentScreen === 'inventory' ? {
          background: '#ffffff',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
        } : {}),
        ...(currentScreen === 'modelBudget' ? {
          background: 'transparent',
          borderBottom: 'none',
        } : {}),
        ...(currentScreen === 'aiAssistant' ? {
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
        } : {})
      }}>
        {/* Left spacer for centering */}
        <div style={styles.headerLeft}>
          {currentScreen !== 'welcome' && currentScreen !== 'trafficLog' && currentScreen !== 'salesDashboard' && canGoBack && (
            <button style={styles.backButton} onClick={goBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
          )}
        </div>
        
        {/* Centered Logo */}
        <div style={styles.logoContainer}>
          <div style={{
            ...styles.logo,
            ...(currentScreen === 'inventory' ? {
              background: 'rgba(30, 41, 59, 0.95)',
              padding: '10px 20px',
              borderRadius: '12px',
            } : {})
          }} onClick={resetJourney}>
            <span style={styles.logoText}>QUIRK</span>
            <span style={styles.logoAI}>AI</span>
          </div>
        </div>
        
        {/* Right side */}
        <div style={styles.headerRight}>
          {currentScreen === 'welcome' && (
            <button 
              className="sales-desk-btn"
              style={styles.salesDeskLink} 
              onClick={() => navigateTo('trafficLog')}
            >
              Sales Desk
            </button>
          )}
        </div>
      </header>

      {/* Sales Consultant Button - shown on inventory and related screens */}
      {['inventory', 'vehicleDetail', 'vehicleComparison', 'paymentCalculator'].includes(currentScreen) && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '12px 20px',
          background: 'rgba(30, 41, 59, 0.95)',
        }}>
          <button
            onClick={async () => {
              try {
                await api.notifyStaff({
                  notification_type: 'sales',
                  message: 'Customer at kiosk requested to speak with a sales consultant',
                  vehicle_stock: customerData.selectedVehicle?.stockNumber
                });
                alert('✅ A sales consultant has been notified and will be with you shortly!');
              } catch (error) {
                console.error('Failed to notify staff:', error);
                alert('Please speak with any of our associates on the showroom floor.');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: '#4b5563',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#374151')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#4b5563')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Speak with a sales consultant
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{
        ...styles.main,
        opacity: isTransitioning ? 0 : 1,
        transform: isTransitioning ? 'translateY(10px)' : 'translateY(0)',
      }}>
        <ScreenErrorBoundary onReset={resetJourney} screenName={currentScreen}>
          {currentScreen === 'modelBudget' 
            ? <ModelBudgetSelector {...screenProps} subRoute={modelBudgetSubRoute} />
            : <CurrentScreenComponent {...screenProps} />
          }
        </ScreenErrorBoundary>
      </main>

      {/* Footer */}
      <footer style={{
        ...styles.footer,
        ...(currentScreen === 'inventory' ? {
          background: '#ffffff',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          color: '#1e293b',
        } : {})
      }}>
        <span>Quirk Chevrolet</span>
        <span style={{
          ...styles.footerDot,
          ...(currentScreen === 'inventory' ? { color: 'rgba(0,0,0,0.3)' } : {})
        }}>•</span>
        <span>New England's #1 Dealer</span>
        <span style={{
          ...styles.footerDot,
          ...(currentScreen === 'inventory' ? { color: 'rgba(0,0,0,0.3)' } : {})
        }}>•</span>
        <span style={styles.footerTime}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </footer>

      {/* Google Font Import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Montserrat', 'Segoe UI', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        input, select, button {
          font-family: inherit;
        }
        
        input:focus, select:focus, button:focus {
          outline: none;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }
        
        /* Hide Sales Desk button on mobile */
        @media (max-width: 768px) {
          .sales-desk-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundImage: 'linear-gradient(135deg, #1a2520 0%, #243028 50%, #1e2a22 100%)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    fontFamily: '"Montserrat", "Segoe UI", sans-serif',
    color: '#ffffff',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.3)',
    backdropFilter: 'blur(10px)',
    zIndex: 100,
  },
  headerLeft: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-start',
    minWidth: '120px',
  },
  logoContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
  },
  logoText: {
    fontSize: '32px',
    fontWeight: '800',
    letterSpacing: '2px',
    color: '#ffffff',
  },
  logoAI: {
    fontSize: '20px',
    fontWeight: '700',
    background: '#22c55e',
    color: '#ffffff',
    padding: '4px 12px',
    borderRadius: '6px',
  },
  headerRight: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '16px',
    minWidth: '120px',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#ffffff',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  salesDeskLink: {
    background: 'rgba(27, 115, 64, 0.2)',
    border: '1px solid rgba(27, 115, 64, 0.4)',
    color: '#4ade80',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '8px 14px',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  },
  adminLink: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '8px 12px',
    transition: 'color 0.2s ease',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    overflowX: 'hidden',
    minHeight: 0,
    transition: 'opacity 0.15s ease, transform 0.15s ease',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    fontSize: '14px',
    color: '#fff',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.3)',
  },
  footerDot: {
    color: '#22c55e',
  },
  footerTime: {
    fontWeight: '600',
    color: '#fff',
  },
};

export default KioskApp;
