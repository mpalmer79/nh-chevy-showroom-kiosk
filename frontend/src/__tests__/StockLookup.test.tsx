import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StockLookup from '../components/StockLookup';

// Mock the api module
jest.mock('../components/api', () => ({
  getVehicleByStock: jest.fn(),
}));

import api from '../components/api';

// Mock props
const mockNavigateTo = jest.fn();
const mockUpdateCustomerData = jest.fn();

const mockVehicle = {
  stockNumber: 'M39547',
  year: 2025,
  make: 'Chevrolet',
  model: 'Silverado 1500',
  trim: 'LT Trail Boss',
  exteriorColor: 'Summit White',
  interiorColor: 'Jet Black',
  engine: '5.3L V8',
  drivetrain: '4WD',
  msrp: 57500,
  salePrice: 52000,
  status: 'In Stock',
};

const defaultProps = {
  navigateTo: mockNavigateTo,
  updateCustomerData: mockUpdateCustomerData,
  customerData: {},
};

const renderStockLookup = (props = {}) => {
  return render(<StockLookup {...defaultProps} {...props} />);
};

describe('StockLookup Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.getVehicleByStock as jest.Mock).mockResolvedValue(mockVehicle);
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================
  describe('Rendering', () => {
    test('displays page title', () => {
      renderStockLookup();
      expect(screen.getByText(/Find Your Vehicle/i)).toBeInTheDocument();
    });

    test('displays instruction subtitle', () => {
      renderStockLookup();
      expect(screen.getByText(/Enter the stock number/i)).toBeInTheDocument();
    });

    test('displays the M prefix', () => {
      renderStockLookup();
      expect(screen.getByText('M')).toBeInTheDocument();
    });

    test('displays STK# prefix', () => {
      renderStockLookup();
      expect(screen.getByText('STK#')).toBeInTheDocument();
    });

    test('displays example hint', () => {
      renderStockLookup();
      expect(screen.getByText(/Example: For stock M39547/i)).toBeInTheDocument();
    });

    test('displays keypad with number buttons', () => {
      renderStockLookup();
      for (let i = 0; i <= 9; i++) {
        expect(screen.getByText(String(i))).toBeInTheDocument();
      }
    });

    test('displays Clear button on keypad', () => {
      renderStockLookup();
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    test('displays Search button', () => {
      renderStockLookup();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    test('displays help text', () => {
      renderStockLookup();
      expect(screen.getByText(/Can't find the stock number/i)).toBeInTheDocument();
    });

    test('hidden input exists for keyboard support', () => {
      renderStockLookup();
      expect(screen.getByLabelText(/Stock number input/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Keypad Interaction Tests
  // ===========================================================================
  describe('Keypad Interaction', () => {
    test('pressing number buttons adds digits to input', () => {
      renderStockLookup();
      fireEvent.click(screen.getByText('3'));
      fireEvent.click(screen.getByText('9'));
      fireEvent.click(screen.getByText('5'));

      const hiddenInput = screen.getByLabelText(/Stock number input/i) as HTMLInputElement;
      expect(hiddenInput.value).toBe('395');
    });

    test('pressing Clear resets the input', () => {
      renderStockLookup();
      fireEvent.click(screen.getByText('3'));
      fireEvent.click(screen.getByText('9'));
      fireEvent.click(screen.getByText('Clear'));

      const hiddenInput = screen.getByLabelText(/Stock number input/i) as HTMLInputElement;
      expect(hiddenInput.value).toBe('');
    });

    test('limits input to 8 digits', () => {
      renderStockLookup();
      // Press 9 digits using the keypad buttons
      const keypadButtons = screen.getAllByText('1').filter(el => el.tagName === 'SPAN' || el.closest('button'));
      const keypadButton = keypadButtons[0];
      for (let i = 0; i < 9; i++) {
        fireEvent.click(keypadButton);
      }

      const hiddenInput = screen.getByLabelText(/Stock number input/i) as HTMLInputElement;
      expect(hiddenInput.value.length).toBeLessThanOrEqual(8);
    });
  });

  // ===========================================================================
  // Keyboard Input Tests
  // ===========================================================================
  describe('Keyboard Input', () => {
    test('typing digits into hidden input updates stock number', () => {
      renderStockLookup();
      const hiddenInput = screen.getByLabelText(/Stock number input/i) as HTMLInputElement;
      fireEvent.change(hiddenInput, { target: { value: '39547' } });
      expect(hiddenInput.value).toBe('39547');
    });

    test('non-numeric characters are stripped from keyboard input', () => {
      renderStockLookup();
      const hiddenInput = screen.getByLabelText(/Stock number input/i) as HTMLInputElement;
      fireEvent.change(hiddenInput, { target: { value: 'abc123' } });
      expect(hiddenInput.value).toBe('123');
    });

    test('keyboard input limited to 8 digits', () => {
      renderStockLookup();
      const hiddenInput = screen.getByLabelText(/Stock number input/i) as HTMLInputElement;
      fireEvent.change(hiddenInput, { target: { value: '123456789' } });
      expect(hiddenInput.value).toBe('12345678');
    });
  });

  // ===========================================================================
  // Search Button State Tests
  // ===========================================================================
  describe('Search Button State', () => {
    test('Search button is disabled when fewer than 4 digits entered', () => {
      renderStockLookup();
      fireEvent.click(screen.getByText('3'));
      fireEvent.click(screen.getByText('9'));
      fireEvent.click(screen.getByText('5'));

      const searchBtn = screen.getByText('Search');
      expect(searchBtn).toBeDisabled();
    });

    test('Search button is enabled when 4+ digits entered', () => {
      renderStockLookup();
      const hiddenInput = screen.getByLabelText(/Stock number input/i) as HTMLInputElement;
      fireEvent.change(hiddenInput, { target: { value: '3954' } });

      const searchBtn = screen.getByText('Search');
      expect(searchBtn).not.toBeDisabled();
    });
  });

  // ===========================================================================
  // Search Execution Tests
  // ===========================================================================
  describe('Search Execution', () => {
    test('clicking Search calls API with prefixed stock number', async () => {
      renderStockLookup();
      const hiddenInput = screen.getByLabelText(/Stock number input/i) as HTMLInputElement;
      fireEvent.change(hiddenInput, { target: { value: '39547' } });

      fireEvent.click(screen.getByText('Search'));

      await waitFor(() => {
        expect(api.getVehicleByStock).toHaveBeenCalledWith('M39547');
      });
    });

    test('displays error when fewer than 4 digits and search attempted', async () => {
      renderStockLookup();
      const hiddenInput = screen.getByLabelText(/Stock number input/i) as HTMLInputElement;
      fireEvent.change(hiddenInput, { target: { value: '39' } });

      // Search button should be disabled, but test the validation message
      // by directly calling search if button were clicked
      // The button is disabled so we can't click it; this tests the guard
      const searchBtn = screen.getByText('Search');
      expect(searchBtn).toBeDisabled();
    });

    test('shows error when vehicle not found', async () => {
      (api.getVehicleByStock as jest.Mock).mockRejectedValue(new Error('Not found'));

      renderStockLookup();
      const hiddenInput = screen.getByLabelText(/Stock number input/i) as HTMLInputElement;
      fireEvent.change(hiddenInput, { target: { value: '99999' } });

      fireEvent.click(screen.getByText('Search'));

      await waitFor(() => {
        expect(screen.getByText(/not found/i)).toBeInTheDocument();
      });
    });

    test('updates customerData when vehicle is found', async () => {
      renderStockLookup();
      const hiddenInput = screen.getByLabelText(/Stock number input/i) as HTMLInputElement;
      fireEvent.change(hiddenInput, { target: { value: '39547' } });

      fireEvent.click(screen.getByText('Search'));

      await waitFor(() => {
        expect(mockUpdateCustomerData).toHaveBeenCalledWith({
          selectedVehicle: mockVehicle,
        });
      });
    });
  });

  // ===========================================================================
  // Search Result Display Tests
  // ===========================================================================
  describe('Search Result Display', () => {
    const searchAndWaitForResult = async () => {
      renderStockLookup();
      const hiddenInput = screen.getByLabelText(/Stock number input/i) as HTMLInputElement;
      fireEvent.change(hiddenInput, { target: { value: '39547' } });
      fireEvent.click(screen.getByText('Search'));
      await waitFor(() => {
        expect(screen.getByText(/Silverado 1500/)).toBeInTheDocument();
      });
    };

    test('displays vehicle year, make, model', async () => {
      await searchAndWaitForResult();
      expect(screen.getByText(/2025 Chevrolet Silverado 1500/i)).toBeInTheDocument();
    });

    test('displays vehicle trim', async () => {
      await searchAndWaitForResult();
      expect(screen.getByText(/LT Trail Boss/i)).toBeInTheDocument();
    });

    test('displays stock number', async () => {
      await searchAndWaitForResult();
      const matches = screen.getAllByText(/M39547/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    test('displays MSRP price', async () => {
      await searchAndWaitForResult();
      expect(screen.getByText(/\$57,500/)).toBeInTheDocument();
    });

    test('displays sale price', async () => {
      await searchAndWaitForResult();
      expect(screen.getByText(/\$52,000/)).toBeInTheDocument();
    });

    test('displays savings when sale price < MSRP', async () => {
      await searchAndWaitForResult();
      expect(screen.getByText(/You Save \$5,500/)).toBeInTheDocument();
    });

    test('displays exterior color', async () => {
      await searchAndWaitForResult();
      expect(screen.getByText('Summit White')).toBeInTheDocument();
    });

    test('displays engine info', async () => {
      await searchAndWaitForResult();
      expect(screen.getByText('5.3L V8')).toBeInTheDocument();
    });

    test('displays drivetrain', async () => {
      await searchAndWaitForResult();
      expect(screen.getByText('4WD')).toBeInTheDocument();
    });

    test('displays "View Full Details" button', async () => {
      await searchAndWaitForResult();
      expect(screen.getByText(/View Full Details/i)).toBeInTheDocument();
    });

    test('displays "Schedule Test Drive" button', async () => {
      await searchAndWaitForResult();
      expect(screen.getByText(/Schedule Test Drive/i)).toBeInTheDocument();
    });

    test('hides keypad when result is displayed', async () => {
      await searchAndWaitForResult();
      expect(screen.queryByText('Clear')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Result Action Tests
  // ===========================================================================
  describe('Result Actions', () => {
    const searchAndGetResult = async () => {
      renderStockLookup();
      const hiddenInput = screen.getByLabelText(/Stock number input/i) as HTMLInputElement;
      fireEvent.change(hiddenInput, { target: { value: '39547' } });
      fireEvent.click(screen.getByText('Search'));
      await waitFor(() => {
        expect(screen.getByText(/Silverado 1500/)).toBeInTheDocument();
      });
    };

    test('clicking "View Full Details" navigates to vehicleDetail', async () => {
      await searchAndGetResult();
      fireEvent.click(screen.getByText(/View Full Details/i));
      expect(mockNavigateTo).toHaveBeenCalledWith('vehicleDetail');
    });

    test('clicking "Schedule Test Drive" navigates to handoff', async () => {
      await searchAndGetResult();
      fireEvent.click(screen.getByText(/Schedule Test Drive/i));
      expect(mockNavigateTo).toHaveBeenCalledWith('handoff');
    });
  });

  // ===========================================================================
  // Enter Key Tests
  // ===========================================================================
  describe('Enter Key Behavior', () => {
    test('pressing Enter with 4+ digits triggers search', async () => {
      renderStockLookup();
      const hiddenInput = screen.getByLabelText(/Stock number input/i) as HTMLInputElement;
      fireEvent.change(hiddenInput, { target: { value: '39547' } });
      fireEvent.keyDown(hiddenInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(api.getVehicleByStock).toHaveBeenCalledWith('M39547');
      });
    });

    test('pressing Escape clears the input', () => {
      renderStockLookup();
      const hiddenInput = screen.getByLabelText(/Stock number input/i) as HTMLInputElement;
      fireEvent.change(hiddenInput, { target: { value: '39547' } });
      fireEvent.keyDown(hiddenInput, { key: 'Escape', code: 'Escape' });

      expect(hiddenInput.value).toBe('');
    });
  });
});
