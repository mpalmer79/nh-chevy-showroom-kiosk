import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WelcomeScreen from '../components/WelcomeScreen';

// Mock the api module
jest.mock('../components/api', () => ({
  getInventoryStats: jest.fn(),
  logTrafficSession: jest.fn(),
}));

import api from '../components/api';

// Mock props
const mockNavigateTo = jest.fn();
const mockUpdateCustomerData = jest.fn();
const mockResetJourney = jest.fn();

const mockStats = {
  total: 250,
  byBodyStyle: {
    SUV: 112,
    Truck: 106,
  },
  priceRange: {
    min: 22000,
    max: 85000,
  },
};

const defaultProps = {
  navigateTo: mockNavigateTo,
  updateCustomerData: mockUpdateCustomerData,
  customerData: {},
  resetJourney: mockResetJourney,
};

const renderWelcomeScreen = (props = {}) => {
  return render(<WelcomeScreen {...defaultProps} {...props} />);
};

describe('WelcomeScreen Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.getInventoryStats as jest.Mock).mockResolvedValue(mockStats);
    (api.logTrafficSession as jest.Mock).mockResolvedValue(undefined);
  });

  // ===========================================================================
  // Phase 1: Name Capture Tests
  // ===========================================================================
  describe('Phase 1 - Name Capture', () => {
    test('displays Showroom AI assistant greeting', () => {
      renderWelcomeScreen();
      expect(screen.getByText(/Showroom AI/i)).toBeInTheDocument();
      expect(screen.getByText(/assistant/i)).toBeInTheDocument();
    });

    test('displays Welcome to New Hampshire Chevrolet subtitle', () => {
      renderWelcomeScreen();
      expect(screen.getByText(/Welcome to New Hampshire Chevrolet/i)).toBeInTheDocument();
    });

    test('displays first name input field', () => {
      renderWelcomeScreen();
      expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
    });

    test('displays phone number input field', () => {
      renderWelcomeScreen();
      expect(screen.getByPlaceholderText(/saves your progress/i)).toBeInTheDocument();
    });

    test('displays Continue button', () => {
      renderWelcomeScreen();
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    test('displays Skip for now button', () => {
      renderWelcomeScreen();
      expect(screen.getByText(/Skip for now/i)).toBeInTheDocument();
    });

    test('Continue button is disabled when name is empty', () => {
      renderWelcomeScreen();
      const continueBtn = screen.getByText('Continue');
      expect(continueBtn).toBeDisabled();
    });

    test('Continue button is enabled when name is entered', () => {
      renderWelcomeScreen();
      const nameInput = screen.getByPlaceholderText(/first name/i);
      fireEvent.change(nameInput, { target: { value: 'john' } });
      
      const continueBtn = screen.getByText('Continue');
      expect(continueBtn).not.toBeDisabled();
    });

    test('displays privacy note', () => {
      renderWelcomeScreen();
      expect(screen.getByText(/personalize your experience/i)).toBeInTheDocument();
    });

    test('entering name updates input value', () => {
      renderWelcomeScreen();
      const input = screen.getByPlaceholderText(/first name/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'john' } });
      expect(input.value).toBe('john');
    });

    test('entering phone formats as (xxx) xxx-xxxx', () => {
      renderWelcomeScreen();
      const input = screen.getByPlaceholderText(/saves your progress/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '6175551234' } });
      expect(input.value).toBe('(617) 555-1234');
    });

    test('phone input only accepts digits', () => {
      renderWelcomeScreen();
      const input = screen.getByPlaceholderText(/saves your progress/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'abc123def456' } });
      expect(input.value).toBe('(123) 456');
    });

    test('clicking Continue with name submits and advances to Phase 2', async () => {
      renderWelcomeScreen();
      
      const nameInput = screen.getByPlaceholderText(/first name/i);
      fireEvent.change(nameInput, { target: { value: 'john' } });
      
      const continueBtn = screen.getByText('Continue');
      fireEvent.click(continueBtn);

      await waitFor(() => {
        expect(mockUpdateCustomerData).toHaveBeenCalledWith(
          expect.objectContaining({
            customerName: 'John', // Should be capitalized
          })
        );
      });

      // Should advance to Phase 2
      await waitFor(() => {
        expect(screen.getByText(/How can I help you today/i)).toBeInTheDocument();
      });
    });

    test('name is properly capitalized on submit', async () => {
      renderWelcomeScreen();
      
      const nameInput = screen.getByPlaceholderText(/first name/i);
      fireEvent.change(nameInput, { target: { value: 'JOHN' } });
      
      const continueBtn = screen.getByText('Continue');
      fireEvent.click(continueBtn);

      await waitFor(() => {
        expect(mockUpdateCustomerData).toHaveBeenCalledWith(
          expect.objectContaining({
            customerName: 'John',
          })
        );
      });
    });

    test('clicking Continue with name and valid phone saves both', async () => {
      renderWelcomeScreen();
      
      const nameInput = screen.getByPlaceholderText(/first name/i);
      fireEvent.change(nameInput, { target: { value: 'john' } });
      
      const phoneInput = screen.getByPlaceholderText(/saves your progress/i);
      fireEvent.change(phoneInput, { target: { value: '6175551234' } });
      
      const continueBtn = screen.getByText('Continue');
      fireEvent.click(continueBtn);

      await waitFor(() => {
        expect(mockUpdateCustomerData).toHaveBeenCalledWith(
          expect.objectContaining({
            customerName: 'John',
            phone: '(617) 555-1234',
          })
        );
      });
    });

    test('incomplete phone number is not saved', async () => {
      renderWelcomeScreen();
      
      const nameInput = screen.getByPlaceholderText(/first name/i);
      fireEvent.change(nameInput, { target: { value: 'john' } });
      
      const phoneInput = screen.getByPlaceholderText(/saves your progress/i);
      fireEvent.change(phoneInput, { target: { value: '617555' } }); // Only 6 digits
      
      const continueBtn = screen.getByText('Continue');
      fireEvent.click(continueBtn);

      await waitFor(() => {
        expect(mockUpdateCustomerData).toHaveBeenCalledWith({
          customerName: 'John',
          phone: undefined,
          namePhaseCompleted: true,
        });
      });
    });

    test('clicking Skip advances to Phase 2 without saving data', async () => {
      renderWelcomeScreen();
      
      const skipBtn = screen.getByText(/Skip for now/i);
      fireEvent.click(skipBtn);

      await waitFor(() => {
        expect(screen.getByText(/How can I help you today/i)).toBeInTheDocument();
      });
    });

    test('clicking Skip sets namePhaseCompleted flag', async () => {
      renderWelcomeScreen();
      
      const skipBtn = screen.getByText(/Skip for now/i);
      fireEvent.click(skipBtn);

      await waitFor(() => {
        expect(mockUpdateCustomerData).toHaveBeenCalledWith({ namePhaseCompleted: true });
      });
    });

    test('logs session when name is submitted', async () => {
      renderWelcomeScreen();
      
      const nameInput = screen.getByPlaceholderText(/first name/i);
      fireEvent.change(nameInput, { target: { value: 'john' } });
      
      const continueBtn = screen.getByText('Continue');
      fireEvent.click(continueBtn);

      await waitFor(() => {
        expect(api.logTrafficSession).toHaveBeenCalledWith(
          expect.objectContaining({
            customerName: 'John',
            actions: ['entered_name'],
          })
        );
      });
    });

    test('logs session when skipped', async () => {
      renderWelcomeScreen();
      
      const skipBtn = screen.getByText(/Skip for now/i);
      fireEvent.click(skipBtn);

      await waitFor(() => {
        expect(api.logTrafficSession).toHaveBeenCalledWith(
          expect.objectContaining({
            actions: ['skipped_name'],
          })
        );
      });
    });

    test('pressing Enter in name input submits form', async () => {
      renderWelcomeScreen();
      
      const nameInput = screen.getByPlaceholderText(/first name/i);
      fireEvent.change(nameInput, { target: { value: 'john' } });
      fireEvent.keyPress(nameInput, { key: 'Enter', code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(screen.getByText(/How can I help you today/i)).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Phase 2: Path Selection Tests
  // ===========================================================================
  describe('Phase 2 - Path Selection', () => {
    const renderPhase2 = async (customerName?: string) => {
      const props = customerName 
        ? { customerData: { customerName } }
        : {};
      renderWelcomeScreen(props);
      
      // Skip to Phase 2
      if (!customerName) {
        const skipBtn = screen.getByText(/Skip for now/i);
        fireEvent.click(skipBtn);
        await waitFor(() => {
          expect(screen.getByText(/How can I help you today/i)).toBeInTheDocument();
        });
      }
    };

    test('displays personalized greeting when customer name provided', async () => {
      renderWelcomeScreen({ customerData: { customerName: 'John' } });
      
      await waitFor(() => {
        // The greeting is "Hi John, How can I help you today?" in a single h2
        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading).toHaveTextContent(/Hi.*John.*How can I help you today/i);
      });
    });

    test('displays generic greeting when no customer name', async () => {
      await renderPhase2();
      
      expect(screen.getByText(/How can I help you today/i)).toBeInTheDocument();
    });

    test('displays "I Have a Stock Number" path card', async () => {
      await renderPhase2();
      
      expect(screen.getByText(/I Have a Stock Number/i)).toBeInTheDocument();
      expect(screen.getByText(/Find the exact vehicle/i)).toBeInTheDocument();
    });

    test('displays "I Know What I Want" path card', async () => {
      await renderPhase2();
      
      expect(screen.getByText(/I Know What I Want/i)).toBeInTheDocument();
      expect(screen.getByText(/Browse by model & budget/i)).toBeInTheDocument();
    });

    test('displays "Chat with Showroom AI" path card', async () => {
      await renderPhase2();
      
      expect(screen.getByText(/Chat with Showroom AI/i)).toBeInTheDocument();
      expect(screen.getByText(/LET'S HAVE A CONVERSATION/i)).toBeInTheDocument();
    });

    test('clicking Stock Number card navigates to stockLookup', async () => {
      await renderPhase2();

      const card = screen.getByText(/I Have a Stock Number/i).closest('div');
      fireEvent.click(card!);

      await waitFor(() => {
        expect(mockNavigateTo).toHaveBeenCalledWith('stockLookup');
      });
    });

    test('clicking Model Budget card navigates to modelBudget', async () => {
      await renderPhase2();

      const card = screen.getByText(/I Know What I Want/i).closest('div');
      fireEvent.click(card!);

      await waitFor(() => {
        expect(mockNavigateTo).toHaveBeenCalledWith('modelBudget');
      });
    });

    test('clicking Chat with AI card navigates to aiAssistant', async () => {
      await renderPhase2();

      const card = screen.getByText(/Chat with Showroom AI/i).closest('div');
      fireEvent.click(card!);

      await waitFor(() => {
        expect(mockNavigateTo).toHaveBeenCalledWith('aiAssistant');
      });
    });

    test('clicking path card updates customer data with path', async () => {
      await renderPhase2();

      const card = screen.getByText(/Chat with Showroom AI/i).closest('div');
      fireEvent.click(card!);

      await waitFor(() => {
        expect(mockUpdateCustomerData).toHaveBeenCalledWith({ path: 'aiAssistant' });
      });
    });

    test('clicking path card logs traffic session', async () => {
      await renderPhase2();

      const card = screen.getByText(/I Have a Stock Number/i).closest('div');
      fireEvent.click(card!);

      await waitFor(() => {
        expect(api.logTrafficSession).toHaveBeenCalledWith(
          expect.objectContaining({
            path: 'stockLookup',
            actions: ['selected_stockLookup'],
          })
        );
      });
    });

    test('displays "browse all inventory" link', async () => {
      await renderPhase2();
      
      expect(screen.getByText(/browse all inventory/i)).toBeInTheDocument();
    });

    test('clicking browse all navigates to inventory', async () => {
      await renderPhase2();
      
      const browseLink = screen.getByText(/browse all inventory/i);
      fireEvent.click(browseLink);

      await waitFor(() => {
        expect(mockNavigateTo).toHaveBeenCalledWith('inventory');
      });
    });

    test('clicking browse all updates customer data', async () => {
      await renderPhase2();
      
      const browseLink = screen.getByText(/browse all inventory/i);
      fireEvent.click(browseLink);

      await waitFor(() => {
        expect(mockUpdateCustomerData).toHaveBeenCalledWith({ path: 'browse' });
      });
    });
  });

  // ===========================================================================
  // Stats Bar Tests
  // ===========================================================================
  describe('Stats Bar', () => {
    const renderWithStats = async () => {
      renderWelcomeScreen({ customerData: { customerName: 'John' } });
      await waitFor(() => {
        expect(api.getInventoryStats).toHaveBeenCalled();
      });
    };

    test('loads inventory stats on mount', async () => {
      renderWelcomeScreen();
      
      await waitFor(() => {
        expect(api.getInventoryStats).toHaveBeenCalledTimes(1);
      });
    });

    test('displays total vehicles count', async () => {
      await renderWithStats();
      
      await waitFor(() => {
        expect(screen.getByText('250')).toBeInTheDocument();
        expect(screen.getByText(/Vehicles In Stock/i)).toBeInTheDocument();
      });
    });

    test('displays SUV count', async () => {
      await renderWithStats();
      
      await waitFor(() => {
        expect(screen.getByText('112')).toBeInTheDocument();
        expect(screen.getByText(/SUVs/i)).toBeInTheDocument();
      });
    });

    test('displays Truck count', async () => {
      await renderWithStats();
      
      await waitFor(() => {
        expect(screen.getByText('106')).toBeInTheDocument();
        expect(screen.getByText(/Trucks/i)).toBeInTheDocument();
      });
    });

    test('displays starting price', async () => {
      await renderWithStats();
      
      await waitFor(() => {
        expect(screen.getByText(/\$22k\+/i)).toBeInTheDocument();
        expect(screen.getByText(/Starting At/i)).toBeInTheDocument();
      });
    });

    test('clicking SUV stat navigates to inventory with SUV filter', async () => {
      await renderWithStats();
      
      await waitFor(() => {
        expect(screen.getByText('112')).toBeInTheDocument();
      });

      const suvStat = screen.getByText('112').closest('button');
      fireEvent.click(suvStat!);

      await waitFor(() => {
        expect(mockNavigateTo).toHaveBeenCalledWith('inventory', { bodyStyle: 'SUV' });
      });
    });

    test('clicking Truck stat navigates to inventory with Truck filter', async () => {
      await renderWithStats();

      await waitFor(() => {
        expect(screen.getByText('106')).toBeInTheDocument();
      });

      const truckStat = screen.getByText('106').closest('button');
      fireEvent.click(truckStat!);

      await waitFor(() => {
        expect(mockNavigateTo).toHaveBeenCalledWith('inventory', { bodyStyle: 'Truck' });
      });
    });

    test('clicking SUV stat updates bodyStyleFilter in customer data', async () => {
      await renderWithStats();

      await waitFor(() => {
        expect(screen.getByText('112')).toBeInTheDocument();
      });

      const suvStat = screen.getByText('112').closest('button');
      fireEvent.click(suvStat!);

      await waitFor(() => {
        expect(mockUpdateCustomerData).toHaveBeenCalledWith({ bodyStyleFilter: 'SUV' });
      });
    });

    test('clicking total vehicles navigates to inventory without filter', async () => {
      await renderWithStats();

      await waitFor(() => {
        expect(screen.getByText('250')).toBeInTheDocument();
      });

      const totalStat = screen.getByText('250').closest('button');
      fireEvent.click(totalStat!);

      await waitFor(() => {
        expect(mockNavigateTo).toHaveBeenCalledWith('inventory');
      });
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================
  describe('Error Handling', () => {
    test('handles stats API error gracefully', async () => {
      (api.getInventoryStats as jest.Mock).mockRejectedValue(new Error('API Error'));
      
      renderWelcomeScreen({ customerData: { customerName: 'John' } });

      // Component should still render without stats bar
      await waitFor(() => {
        expect(screen.getByText(/How can I help you today/i)).toBeInTheDocument();
      });

      // Stats bar should not be present when API fails
      expect(screen.queryByText(/Vehicles In Stock/i)).not.toBeInTheDocument();
    });

    test('handles traffic log API error gracefully', async () => {
      (api.logTrafficSession as jest.Mock).mockRejectedValue(new Error('API Error'));
      
      renderWelcomeScreen();

      const skipBtn = screen.getByText(/Skip for now/i);
      fireEvent.click(skipBtn);

      // Should still advance to Phase 2 despite logging error
      await waitFor(() => {
        expect(screen.getByText(/How can I help you today/i)).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================
  describe('Accessibility', () => {
    test('name input has placeholder text for accessibility', () => {
      renderWelcomeScreen();
      const input = screen.getByPlaceholderText(/first name/i);
      expect(input).toBeInTheDocument();
    });

    test('Continue button is a button element', () => {
      renderWelcomeScreen();
      const btn = screen.getByText('Continue');
      expect(btn.tagName).toBe('BUTTON');
    });

    test('Skip button is a button element', () => {
      renderWelcomeScreen();
      const btn = screen.getByText(/Skip for now/i);
      expect(btn.tagName).toBe('BUTTON');
    });

    test('path cards are clickable', async () => {
      renderWelcomeScreen({ customerData: { customerName: 'John' } });
      
      const card = screen.getByText(/I Have a Stock Number/i).closest('div');
      expect(card).toHaveStyle({ cursor: 'pointer' });
    });

    test('stat buttons are button elements', async () => {
      renderWelcomeScreen({ customerData: { customerName: 'John' } });
      
      await waitFor(() => {
        expect(screen.getByText('250')).toBeInTheDocument();
      });

      const statBtn = screen.getByText('250').closest('button');
      expect(statBtn!.tagName).toBe('BUTTON');
    });
  });

  // ===========================================================================
  // Pre-filled Customer Data Tests
  // ===========================================================================
  describe('Pre-filled Customer Data', () => {
    test('skips Phase 1 when customerName already exists', () => {
      renderWelcomeScreen({ customerData: { customerName: 'John' } });
      
      // Should immediately show Phase 2
      expect(screen.getByText(/How can I help you today/i)).toBeInTheDocument();
      expect(screen.queryByText('Continue')).not.toBeInTheDocument();
    });

    test('skips Phase 1 when namePhaseCompleted is true (user skipped previously)', () => {
      renderWelcomeScreen({ customerData: { namePhaseCompleted: true } });
      
      // Should immediately show Phase 2 even without a name
      expect(screen.getByText(/How can I help you today/i)).toBeInTheDocument();
      expect(screen.queryByText('Continue')).not.toBeInTheDocument();
    });

    test('pre-fills name input if customerName exists but not submitted', () => {
      // This tests the initial state loading
      renderWelcomeScreen({ customerData: { customerName: '' } });
      
      // Should show Phase 1 since name is empty
      expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
    });

    test('pre-fills phone input from customerData', () => {
      renderWelcomeScreen({ customerData: { phone: '(617) 555-1234' } });
      
      const phoneInput = screen.getByPlaceholderText(/saves your progress/i) as HTMLInputElement;
      expect(phoneInput.value).toBe('(617) 555-1234');
    });
  });
});
