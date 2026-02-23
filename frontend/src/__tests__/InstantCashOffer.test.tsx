import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InstantCashOffer from '../components/InstantCashOffer';

// Mock clipboard API
const mockClipboard = {
  writeText: jest.fn().mockResolvedValue(undefined),
};
Object.assign(navigator, { clipboard: mockClipboard });

// Mock window.print
const mockPrint = jest.fn();
window.print = mockPrint;

const mockVehicle = {
  year: '2021',
  make: 'Chevrolet',
  model: 'Equinox',
  trim: 'LT AWD',
  mileage: '45,000',
  vin: '1GNAXKEV1MZ123456',
  condition: 'good',
};

const mockOnClose = jest.fn();
const mockOnAccept = jest.fn();
const mockOnDecline = jest.fn();

const defaultProps = {
  vehicle: mockVehicle,
  estimatedValue: 22000,
  onClose: mockOnClose,
  onAccept: mockOnAccept,
  onDecline: mockOnDecline,
  customerName: 'John Smith',
  customerPhone: '555-123-4567',
};

const renderInstantCashOffer = (props = {}) => {
  return render(<InstantCashOffer {...defaultProps} {...props} />);
};

describe('InstantCashOffer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Render', () => {
    test('displays offer header', () => {
      renderInstantCashOffer();
      
      expect(screen.getByText(/INSTANT CASH OFFER/)).toBeInTheDocument();
      expect(screen.getByText("We'll Buy Your Vehicle!")).toBeInTheDocument();
    });

    test('displays vehicle information', () => {
      renderInstantCashOffer();
      
      expect(screen.getByText('2021 Chevrolet Equinox')).toBeInTheDocument();
      expect(screen.getByText(/45,000 miles/)).toBeInTheDocument();
    });

    test('displays calculated offer amount', () => {
      renderInstantCashOffer();
      
      // With "good" condition (0.90 multiplier), $22,000 * 0.90 = $19,800
      // Rounded to nearest $50 = $19,800
      expect(screen.getByText(/\$19,800/)).toBeInTheDocument();
    });

    test('displays offer ID', () => {
      renderInstantCashOffer();
      
      expect(screen.getByText('Offer ID')).toBeInTheDocument();
      expect(screen.getByText(/QCO-/)).toBeInTheDocument();
    });

    test('displays expiration countdown', () => {
      renderInstantCashOffer();
      
      expect(screen.getByText(/Expires in/)).toBeInTheDocument();
    });

    test('displays what is included section', () => {
      renderInstantCashOffer();
      
      expect(screen.getByText("What's Included:")).toBeInTheDocument();
      expect(screen.getByText('Free vehicle inspection')).toBeInTheDocument();
      expect(screen.getByText('Same-day payment available')).toBeInTheDocument();
      expect(screen.getByText('We handle all paperwork')).toBeInTheDocument();
      expect(screen.getByText('Payoff handled directly')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    test('displays accept button', () => {
      renderInstantCashOffer();
      
      expect(screen.getByText('Accept This Offer')).toBeInTheDocument();
    });

    test('displays manager review button', () => {
      renderInstantCashOffer();
      
      expect(screen.getByText('Request Manager Review')).toBeInTheDocument();
    });

    test('displays decline button', () => {
      renderInstantCashOffer();
      
      expect(screen.getByText('No Thanks, Continue Shopping')).toBeInTheDocument();
    });

    test('close button calls onClose', () => {
      renderInstantCashOffer();
      
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons[0]; // First button is close
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Copy Offer ID', () => {
    test('copy button copies offer ID to clipboard', async () => {
      renderInstantCashOffer();
      
      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      
      await waitFor(() => {
        expect(screen.getByText('✓ Copied')).toBeInTheDocument();
      });
    });
  });

  describe('Accept Flow', () => {
    test('clicking accept shows contact form', () => {
      renderInstantCashOffer();
      
      fireEvent.click(screen.getByText('Accept This Offer'));
      
      expect(screen.getByText('Almost Done!')).toBeInTheDocument();
      expect(screen.getByText('Full Name *')).toBeInTheDocument();
      expect(screen.getByText('Phone Number *')).toBeInTheDocument();
      expect(screen.getByText('Email Address')).toBeInTheDocument();
    });

    test('contact form pre-fills customer name', () => {
      renderInstantCashOffer();
      
      fireEvent.click(screen.getByText('Accept This Offer'));
      
      const nameInput = screen.getByPlaceholderText('John Smith');
      expect(nameInput).toHaveValue('John Smith');
    });

    test('contact form pre-fills customer phone', () => {
      renderInstantCashOffer();
      
      fireEvent.click(screen.getByText('Accept This Offer'));
      
      const phoneInput = screen.getByPlaceholderText('(555) 123-4567');
      expect(phoneInput).toHaveValue('555-123-4567');
    });

    test('back button returns to offer view', () => {
      renderInstantCashOffer();
      
      fireEvent.click(screen.getByText('Accept This Offer'));
      fireEvent.click(screen.getByText('← Back to Offer'));
      
      expect(screen.getByText("We'll Buy Your Vehicle!")).toBeInTheDocument();
    });

    test('submitting contact form shows confirmation', async () => {
      renderInstantCashOffer();
      
      fireEvent.click(screen.getByText('Accept This Offer'));
      
      // Fill out form
      const emailInput = screen.getByPlaceholderText('john@example.com');
      fireEvent.change(emailInput, { target: { value: 'john@test.com' } });
      
      fireEvent.click(screen.getByText('Confirm & Lock In Offer'));
      
      // Wait for async submission
      await waitFor(() => {
        expect(screen.getByText('Offer Locked In!')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Manager Review Flow', () => {
    test('clicking manager review shows confirmation', async () => {
      renderInstantCashOffer();
      
      fireEvent.click(screen.getByText('Request Manager Review'));
      
      await waitFor(() => {
        expect(screen.getByText('Manager Review Requested')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Decline Flow', () => {
    test('clicking decline calls onDecline and onClose', () => {
      renderInstantCashOffer();
      
      fireEvent.click(screen.getByText('No Thanks, Continue Shopping'));
      
      expect(mockOnDecline).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accepted State', () => {
    test('shows next steps after accepting', async () => {
      renderInstantCashOffer();
      
      fireEvent.click(screen.getByText('Accept This Offer'));
      fireEvent.click(screen.getByText('Confirm & Lock In Offer'));
      
      await waitFor(() => {
        expect(screen.getByText('Next Steps:')).toBeInTheDocument();
        expect(screen.getByText('Bring your vehicle and title')).toBeInTheDocument();
        expect(screen.getByText('Quick inspection')).toBeInTheDocument();
        expect(screen.getByText('Get paid!')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('print button calls window.print', async () => {
      renderInstantCashOffer();
      
      fireEvent.click(screen.getByText('Accept This Offer'));
      fireEvent.click(screen.getByText('Confirm & Lock In Offer'));
      
      await waitFor(() => {
        expect(screen.getByText('🖨️ Print Offer')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      fireEvent.click(screen.getByText('🖨️ Print Offer'));
      expect(mockPrint).toHaveBeenCalled();
    });

    test('calls onAccept with offer data', async () => {
      renderInstantCashOffer();
      
      fireEvent.click(screen.getByText('Accept This Offer'));
      fireEvent.click(screen.getByText('Confirm & Lock In Offer'));
      
      await waitFor(() => {
        expect(mockOnAccept).toHaveBeenCalled();
      }, { timeout: 3000 });
      
      const acceptedOffer = mockOnAccept.mock.calls[0][0];
      expect(acceptedOffer.offerId).toMatch(/^QCO-/);
      expect(acceptedOffer.status).toBe('accepted');
    });
  });

  describe('Condition Multipliers', () => {
    test('excellent condition gives higher offer', () => {
      renderInstantCashOffer({
        vehicle: { ...mockVehicle, condition: 'excellent' },
      });
      
      // $22,000 * 0.95 = $20,900
      expect(screen.getByText(/\$20,900/)).toBeInTheDocument();
    });

    test('fair condition gives lower offer', () => {
      renderInstantCashOffer({
        vehicle: { ...mockVehicle, condition: 'fair' },
      });
      
      // $22,000 * 0.82 = $18,040, rounded to $18,050
      expect(screen.getByText(/\$18,0/)).toBeInTheDocument();
    });

    test('poor condition gives lowest offer', () => {
      renderInstantCashOffer({
        vehicle: { ...mockVehicle, condition: 'poor' },
      });
      
      // $22,000 * 0.70 = $15,400
      expect(screen.getByText(/\$15,400/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('form inputs have labels', () => {
      renderInstantCashOffer();
      
      fireEvent.click(screen.getByText('Accept This Offer'));
      
      expect(screen.getByText('Full Name *')).toBeInTheDocument();
      expect(screen.getByText('Phone Number *')).toBeInTheDocument();
      expect(screen.getByText('Email Address')).toBeInTheDocument();
    });

    test('required inputs are marked', () => {
      renderInstantCashOffer();
      
      fireEvent.click(screen.getByText('Accept This Offer'));
      
      const nameInput = screen.getByPlaceholderText('John Smith');
      expect(nameInput).toHaveAttribute('required');
      
      const phoneInput = screen.getByPlaceholderText('(555) 123-4567');
      expect(phoneInput).toHaveAttribute('required');
    });
  });

  describe('Fine Print', () => {
    test('displays terms and conditions', () => {
      renderInstantCashOffer();
      
      expect(screen.getByText(/Offer valid for 7 days/)).toBeInTheDocument();
      expect(screen.getByText(/Final amount subject to vehicle inspection/)).toBeInTheDocument();
    });
  });

  describe('Without Customer Info', () => {
    test('renders without pre-filled customer data', () => {
      renderInstantCashOffer({
        customerName: undefined,
        customerPhone: undefined,
      });
      
      fireEvent.click(screen.getByText('Accept This Offer'));
      
      const nameInput = screen.getByPlaceholderText('John Smith');
      expect(nameInput).toHaveValue('');
      
      const phoneInput = screen.getByPlaceholderText('(555) 123-4567');
      expect(phoneInput).toHaveValue('');
    });
  });
});
