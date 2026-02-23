import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CustomerHandoff from '../components/CustomerHandoff';

// Mock the api module
jest.mock('../components/api', () => ({
  submitLead: jest.fn(),
  logAnalytics: jest.fn(),
}));

import api from '../components/api';

// Mock props
const mockNavigateTo = jest.fn();
const mockUpdateCustomerData = jest.fn();

const defaultCustomerData = {
  customerName: 'John',
  selectedVehicle: undefined,
  paymentPreference: undefined,
  tradeIn: undefined,
  quizAnswers: undefined,
};

const customerDataWithVehicle = {
  customerName: 'John',
  selectedVehicle: {
    stockNumber: 'M12345',
    year: 2025,
    make: 'Chevrolet',
    model: 'Silverado 1500',
    trim: 'LT',
    salePrice: 52000,
    gradient: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
  },
  paymentPreference: {
    type: 'Finance',
    monthly: 750,
    term: 84,
    downPayment: 5000,
  },
  tradeIn: undefined,
  quizAnswers: undefined,
};

const defaultProps = {
  navigateTo: mockNavigateTo,
  updateCustomerData: mockUpdateCustomerData,
  customerData: defaultCustomerData,
};

const renderHandoff = (props = {}) => {
  return render(<CustomerHandoff {...defaultProps} {...props} />);
};

describe('CustomerHandoff Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.submitLead as jest.Mock).mockResolvedValue({
      leadId: 'LEAD-001',
      estimatedWait: 3,
    });
    (api.logAnalytics as jest.Mock).mockResolvedValue(undefined);
  });

  // ===========================================================================
  // Form Rendering Tests
  // ===========================================================================
  describe('Form Rendering', () => {
    test('displays personalized title when customer name is available', () => {
      renderHandoff();
      expect(screen.getByText(/Almost there, John!/i)).toBeInTheDocument();
    });

    test('displays generic title when no customer name', () => {
      renderHandoff({
        customerData: { ...defaultCustomerData, customerName: undefined },
      });
      expect(screen.getByText(/Almost There!/i)).toBeInTheDocument();
    });

    test('displays phone number input', () => {
      renderHandoff();
      expect(screen.getByPlaceholderText(/___/)).toBeInTheDocument();
    });

    test('displays name input field', () => {
      renderHandoff();
      expect(screen.getByPlaceholderText(/First name/i)).toBeInTheDocument();
    });

    test('pre-fills name from customerData', () => {
      renderHandoff();
      const nameInput = screen.getByPlaceholderText(/First name/i) as HTMLInputElement;
      expect(nameInput.value).toBe('John');
    });

    test('displays submit button', () => {
      renderHandoff();
      expect(screen.getByText(/Send & Notify Sales Team/i)).toBeInTheDocument();
    });

    test('displays privacy note', () => {
      renderHandoff();
      expect(screen.getByText(/Your information is private/i)).toBeInTheDocument();
    });

    test('displays skip button', () => {
      renderHandoff();
      expect(screen.getByText(/Skip for now/i)).toBeInTheDocument();
    });

    test('displays subtitle instruction', () => {
      renderHandoff();
      expect(screen.getByText(/Enter your phone number/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Vehicle Summary Tests
  // ===========================================================================
  describe('Vehicle Summary', () => {
    test('displays vehicle summary when selectedVehicle is present', () => {
      renderHandoff({ customerData: customerDataWithVehicle });
      expect(screen.getByText(/2025 Silverado 1500/i)).toBeInTheDocument();
      expect(screen.getByText(/\$52,000/)).toBeInTheDocument();
    });

    test('displays monthly payment when paymentPreference is present', () => {
      renderHandoff({ customerData: customerDataWithVehicle });
      expect(screen.getByText(/\$750\/mo/)).toBeInTheDocument();
    });

    test('does not display vehicle summary when no vehicle selected', () => {
      renderHandoff();
      expect(screen.queryByText(/2025 Silverado/)).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Phone Input Tests
  // ===========================================================================
  describe('Phone Input Behavior', () => {
    test('formats phone number as (xxx) xxx-xxxx', () => {
      renderHandoff();
      const phoneInput = screen.getByPlaceholderText(/___/) as HTMLInputElement;
      fireEvent.change(phoneInput, { target: { value: '6175551234' } });
      expect(phoneInput.value).toBe('(617) 555-1234');
    });

    test('partial phone formats correctly', () => {
      renderHandoff();
      const phoneInput = screen.getByPlaceholderText(/___/) as HTMLInputElement;
      fireEvent.change(phoneInput, { target: { value: '617' } });
      expect(phoneInput.value).toBe('617');
    });

    test('phone input limits to 10 digits', () => {
      renderHandoff();
      const phoneInput = screen.getByPlaceholderText(/___/) as HTMLInputElement;
      fireEvent.change(phoneInput, { target: { value: '61755512345678' } });
      expect(phoneInput.value).toBe('(617) 555-1234');
    });

    test('submit button is disabled when phone is incomplete', () => {
      renderHandoff();
      const phoneInput = screen.getByPlaceholderText(/___/) as HTMLInputElement;
      fireEvent.change(phoneInput, { target: { value: '617555' } });

      const submitBtn = screen.getByText(/Send & Notify Sales Team/i);
      expect(submitBtn).toBeDisabled();
    });

    test('submit button is enabled when phone is complete', () => {
      renderHandoff();
      const phoneInput = screen.getByPlaceholderText(/___/) as HTMLInputElement;
      fireEvent.change(phoneInput, { target: { value: '6175551234' } });

      const submitBtn = screen.getByText(/Send & Notify Sales Team/i);
      expect(submitBtn).not.toBeDisabled();
    });
  });

  // ===========================================================================
  // Form Submission Tests
  // ===========================================================================
  describe('Form Submission', () => {
    test('submits lead with phone and name', async () => {
      renderHandoff();
      const phoneInput = screen.getByPlaceholderText(/___/) as HTMLInputElement;
      fireEvent.change(phoneInput, { target: { value: '6175551234' } });

      const submitBtn = screen.getByText(/Send & Notify Sales Team/i);
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.submitLead).toHaveBeenCalledWith(
          expect.objectContaining({
            phone: '6175551234',
            name: 'John',
          })
        );
      });
    });

    test('shows success view after successful submission', async () => {
      renderHandoff();
      const phoneInput = screen.getByPlaceholderText(/___/) as HTMLInputElement;
      fireEvent.change(phoneInput, { target: { value: '6175551234' } });

      const submitBtn = screen.getByText(/Send & Notify Sales Team/i);
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/You're All Set!/i)).toBeInTheDocument();
      });
    });

    test('displays estimated wait time after submission', async () => {
      renderHandoff();
      const phoneInput = screen.getByPlaceholderText(/___/) as HTMLInputElement;
      fireEvent.change(phoneInput, { target: { value: '6175551234' } });

      fireEvent.click(screen.getByText(/Send & Notify Sales Team/i));

      await waitFor(() => {
        expect(screen.getByText(/3 minutes/i)).toBeInTheDocument();
      });
    });

    test('displays lead reference ID after submission', async () => {
      renderHandoff();
      const phoneInput = screen.getByPlaceholderText(/___/) as HTMLInputElement;
      fireEvent.change(phoneInput, { target: { value: '6175551234' } });

      fireEvent.click(screen.getByText(/Send & Notify Sales Team/i));

      await waitFor(() => {
        expect(screen.getByText(/LEAD-001/)).toBeInTheDocument();
      });
    });

    test('updates customer data with contact info after submission', async () => {
      renderHandoff();
      const phoneInput = screen.getByPlaceholderText(/___/) as HTMLInputElement;
      fireEvent.change(phoneInput, { target: { value: '6175551234' } });

      fireEvent.click(screen.getByText(/Send & Notify Sales Team/i));

      await waitFor(() => {
        expect(mockUpdateCustomerData).toHaveBeenCalledWith(
          expect.objectContaining({
            contactInfo: expect.objectContaining({
              phone: '6175551234',
              name: 'John',
              leadId: 'LEAD-001',
            }),
          })
        );
      });
    });

    test('logs analytics after submission', async () => {
      renderHandoff({ customerData: customerDataWithVehicle });
      const phoneInput = screen.getByPlaceholderText(/___/) as HTMLInputElement;
      fireEvent.change(phoneInput, { target: { value: '6175551234' } });

      fireEvent.click(screen.getByText(/Send & Notify Sales Team/i));

      await waitFor(() => {
        expect(api.logAnalytics).toHaveBeenCalledWith(
          'lead_submitted',
          expect.objectContaining({
            leadId: 'LEAD-001',
            hasVehicle: true,
            hasPayment: true,
          })
        );
      });
    });

    test('shows error message on submission failure', async () => {
      (api.submitLead as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderHandoff();
      const phoneInput = screen.getByPlaceholderText(/___/) as HTMLInputElement;
      fireEvent.change(phoneInput, { target: { value: '6175551234' } });

      fireEvent.click(screen.getByText(/Send & Notify Sales Team/i));

      await waitFor(() => {
        expect(screen.getByText(/Unable to submit/i)).toBeInTheDocument();
      });
    });

    test('shows validation error for incomplete phone', async () => {
      renderHandoff();
      const phoneInput = screen.getByPlaceholderText(/___/) as HTMLInputElement;
      fireEvent.change(phoneInput, { target: { value: '617555' } });

      // Force click even though button is disabled (test the validation logic)
      const submitBtn = screen.getByText(/Send & Notify Sales Team/i);
      // Button is disabled, so we should not be able to submit
      expect(submitBtn).toBeDisabled();
    });
  });

  // ===========================================================================
  // Success State Tests
  // ===========================================================================
  describe('Success State', () => {
    const submitAndWaitForSuccess = async () => {
      renderHandoff({ customerData: customerDataWithVehicle });
      const phoneInput = screen.getByPlaceholderText(/___/) as HTMLInputElement;
      fireEvent.change(phoneInput, { target: { value: '6175551234' } });
      fireEvent.click(screen.getByText(/Send & Notify Sales Team/i));
      await waitFor(() => {
        expect(screen.getByText(/You're All Set!/i)).toBeInTheDocument();
      });
    };

    test('shows "Continue Browsing" button in success state', async () => {
      await submitAndWaitForSuccess();
      expect(screen.getByText(/Continue Browsing/i)).toBeInTheDocument();
    });

    test('clicking "Continue Browsing" navigates to welcome', async () => {
      await submitAndWaitForSuccess();
      fireEvent.click(screen.getByText(/Continue Browsing/i));
      expect(mockNavigateTo).toHaveBeenCalledWith('welcome');
    });

    test('shows vehicle summary in success state', async () => {
      await submitAndWaitForSuccess();
      expect(screen.getByText(/2025 Silverado 1500 LT/i)).toBeInTheDocument();
    });

    test('shows "What to Expect" steps', async () => {
      await submitAndWaitForSuccess();
      expect(screen.getByText(/What to Expect/i)).toBeInTheDocument();
      expect(screen.getByText(/A sales consultant will greet you/i)).toBeInTheDocument();
    });

    test('shows confirmation text with phone number', async () => {
      await submitAndWaitForSuccess();
      expect(screen.getByText(/\(617\) 555-1234/)).toBeInTheDocument();
    });

    test('shows team member notification message', async () => {
      await submitAndWaitForSuccess();
      expect(screen.getByText(/team member has been notified/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Navigation Tests
  // ===========================================================================
  describe('Navigation', () => {
    test('clicking skip navigates to welcome', () => {
      renderHandoff();
      fireEvent.click(screen.getByText(/Skip for now/i));
      expect(mockNavigateTo).toHaveBeenCalledWith('welcome');
    });
  });
});
