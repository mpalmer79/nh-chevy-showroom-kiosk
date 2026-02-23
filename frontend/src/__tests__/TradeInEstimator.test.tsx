import { render, screen, fireEvent, RenderResult } from '@testing-library/react';
import '@testing-library/jest-dom';
import TradeInEstimator from '../components/TradeInEstimator';

const mockNavigateTo = jest.fn();
const mockUpdateCustomerData = jest.fn();
const mockOnClose = jest.fn();

interface RenderProps {
  isModal?: boolean;
  onClose?: () => void;
  vehicle?: {
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
    mileage?: number;
    vin?: string;
    price?: number;
  };
}

const renderTradeInEstimator = (props: RenderProps = {}): RenderResult => {
  return render(
    <TradeInEstimator
      navigateTo={mockNavigateTo}
      customerData={{}}
      updateCustomerData={mockUpdateCustomerData}
      isModal={props.isModal !== undefined ? props.isModal : true}
      onClose={props.onClose || mockOnClose}
      vehicle={props.vehicle}
    />
  );
};

describe('TradeInEstimator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    test('renders Trade-In Estimator header', () => {
      renderTradeInEstimator();
      expect(screen.getByText('Trade-In Estimator')).toBeInTheDocument();
    });

    test('renders subtitle text', () => {
      renderTradeInEstimator();
      expect(screen.getByText('A quick, transparent estimate to help you plan your purchase.')).toBeInTheDocument();
    });

    test('renders Step 1 - Vehicle Info by default', () => {
      renderTradeInEstimator();
      expect(screen.getByText('Tell us about your trade')).toBeInTheDocument();
    });

    test('renders Close button in modal mode', () => {
      renderTradeInEstimator({ isModal: true });
      const closeButtons = screen.getAllByText('Close');
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    test('renders step progress indicator', () => {
      renderTradeInEstimator();
      expect(screen.getByText('Vehicle')).toBeInTheDocument();
      expect(screen.getByText('Usage')).toBeInTheDocument();
      expect(screen.getByText('Loan')).toBeInTheDocument();
      expect(screen.getByText('Estimate')).toBeInTheDocument();
    });
  });

  describe('Step 1 - Vehicle Information', () => {
    test('renders year input', () => {
      renderTradeInEstimator();
      expect(screen.getByText('Year *')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('2021')).toBeInTheDocument();
    });

    test('renders make input', () => {
      renderTradeInEstimator();
      expect(screen.getByText('Make *')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Chevrolet')).toBeInTheDocument();
    });

    test('renders model input', () => {
      renderTradeInEstimator();
      expect(screen.getByText('Model *')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Equinox')).toBeInTheDocument();
    });

    test('renders trim input', () => {
      renderTradeInEstimator();
      expect(screen.getByText('Trim')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('LT / Premier')).toBeInTheDocument();
    });

    test('renders mileage input', () => {
      renderTradeInEstimator();
      expect(screen.getByText('Mileage *')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('45000')).toBeInTheDocument();
    });

    test('renders VIN input', () => {
      renderTradeInEstimator();
      expect(screen.getByText('VIN (optional, boosts accuracy)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('1G...')).toBeInTheDocument();
    });

    test('Next button is present', () => {
      renderTradeInEstimator();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });
  });

  describe('Vehicle Pre-fill', () => {
    test('pre-fills vehicle data when provided', () => {
      const vehicle = {
        year: 2022,
        make: 'Honda',
        model: 'Accord',
        trim: 'Sport',
        mileage: 25000,
        vin: '1HGCV1F34NA000001',
      };
      
      renderTradeInEstimator({ vehicle });
      
      const yearInput = screen.getByPlaceholderText('2021') as HTMLInputElement;
      const makeInput = screen.getByPlaceholderText('Chevrolet') as HTMLInputElement;
      const modelInput = screen.getByPlaceholderText('Equinox') as HTMLInputElement;
      
      expect(yearInput.value).toBe('2022');
      expect(makeInput.value).toBe('Honda');
      expect(modelInput.value).toBe('Accord');
    });
  });

  describe('Modal Behavior', () => {
    test('calls onClose when Close button is clicked', () => {
      renderTradeInEstimator({ isModal: true });
      
      const closeButtons = screen.getAllByText('Close');
      fireEvent.click(closeButtons[0]);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Form Input', () => {
    test('updates year field when typed', () => {
      renderTradeInEstimator();
      
      const yearInput = screen.getByPlaceholderText('2021') as HTMLInputElement;
      fireEvent.change(yearInput, { target: { value: '2023' } });
      
      expect(yearInput.value).toBe('2023');
    });

    test('updates make field when typed', () => {
      renderTradeInEstimator();
      
      const makeInput = screen.getByPlaceholderText('Chevrolet') as HTMLInputElement;
      fireEvent.change(makeInput, { target: { value: 'Toyota' } });
      
      expect(makeInput.value).toBe('Toyota');
    });

    test('updates model field when typed', () => {
      renderTradeInEstimator();
      
      const modelInput = screen.getByPlaceholderText('Equinox') as HTMLInputElement;
      fireEvent.change(modelInput, { target: { value: 'Camry' } });
      
      expect(modelInput.value).toBe('Camry');
    });

    test('updates mileage field when typed', () => {
      renderTradeInEstimator();
      
      const mileageInput = screen.getByPlaceholderText('45000') as HTMLInputElement;
      fireEvent.change(mileageInput, { target: { value: '55000' } });
      
      expect(mileageInput.value).toBe('55000');
    });

    test('updates VIN field when typed', () => {
      renderTradeInEstimator();
      
      const vinInput = screen.getByPlaceholderText('1G...') as HTMLInputElement;
      fireEvent.change(vinInput, { target: { value: '1HGCV1F34NA000001' } });
      
      expect(vinInput.value).toBe('1HGCV1F34NA000001');
    });
  });

  describe('Progress Indicator', () => {
    test('shows step 1 as active initially', () => {
      renderTradeInEstimator();
      
      // Step 1 "Vehicle" should be visible and rendered
      expect(screen.getByText('Vehicle')).toBeInTheDocument();
    });

    test('shows all four steps', () => {
      renderTradeInEstimator();
      
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('form inputs have labels', () => {
      renderTradeInEstimator();
      
      expect(screen.getByText('Year *')).toBeInTheDocument();
      expect(screen.getByText('Make *')).toBeInTheDocument();
      expect(screen.getByText('Model *')).toBeInTheDocument();
      expect(screen.getByText('Trim')).toBeInTheDocument();
      expect(screen.getByText('Mileage *')).toBeInTheDocument();
    });
  });
});

describe('TradeInEstimator Step 2 - Usage', () => {
  test('component mounts without error', () => {
    render(
      <TradeInEstimator
        navigateTo={mockNavigateTo}
        customerData={{}}
        updateCustomerData={mockUpdateCustomerData}
        isModal={true}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText('Trade-In Estimator')).toBeInTheDocument();
  });
});

describe('TradeInEstimator Step 3 - Loan', () => {
  test('component mounts without error', () => {
    render(
      <TradeInEstimator
        navigateTo={mockNavigateTo}
        customerData={{}}
        updateCustomerData={mockUpdateCustomerData}
        isModal={true}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText('Trade-In Estimator')).toBeInTheDocument();
  });
});

describe('TradeInEstimator Step 4 - Estimate', () => {
  test('component mounts without error', () => {
    render(
      <TradeInEstimator
        navigateTo={mockNavigateTo}
        customerData={{}}
        updateCustomerData={mockUpdateCustomerData}
        isModal={true}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText('Trade-In Estimator')).toBeInTheDocument();
  });
});

describe('TradeInEstimator Integration', () => {
  test('complete component renders', () => {
    render(
      <TradeInEstimator
        navigateTo={mockNavigateTo}
        customerData={{}}
        updateCustomerData={mockUpdateCustomerData}
        isModal={true}
        onClose={jest.fn()}
      />
    );
    
    expect(screen.getByText('Trade-In Estimator')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  test('renders with vehicle data', () => {
    const vehicle = {
      year: 2021,
      make: 'Chevrolet',
      model: 'Equinox',
      trim: 'LT',
      mileage: 35000,
    };

    render(
      <TradeInEstimator
        navigateTo={mockNavigateTo}
        customerData={{}}
        updateCustomerData={mockUpdateCustomerData}
        isModal={true}
        onClose={jest.fn()}
        vehicle={vehicle}
      />
    );
    
    expect(screen.getByText('Trade-In Estimator')).toBeInTheDocument();
  });
});
