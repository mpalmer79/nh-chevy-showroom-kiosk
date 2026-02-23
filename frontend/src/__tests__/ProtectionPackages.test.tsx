import { render, screen, fireEvent, RenderResult } from '@testing-library/react';
import ProtectionPackages from '../components/ProtectionPackages';

const mockNavigateTo = jest.fn();
const mockUpdateCustomerData = jest.fn();

interface MockVehicle {
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  msrp: number;
  salePrice: number;
  gradient: string;
}

const defaultVehicle: MockVehicle = {
  stockNumber: '24789',
  year: 2025,
  make: 'Chevrolet',
  model: 'Silverado 1500',
  trim: 'LT Crew Cab 4WD',
  msrp: 52995,
  salePrice: 47495,
  gradient: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
};

interface MockCustomerData {
  selectedVehicle: MockVehicle;
  customerName?: string;
}

const defaultCustomerData: MockCustomerData = {
  selectedVehicle: defaultVehicle,
};

interface RenderProps {
  customerData?: Partial<MockCustomerData>;
}

const renderProtectionPackages = (props: RenderProps = {}): RenderResult => {
  return render(
    <ProtectionPackages
      navigateTo={mockNavigateTo}
      updateCustomerData={mockUpdateCustomerData}
      customerData={{ ...defaultCustomerData, ...props.customerData }}
      {...props}
    />
  );
};

describe('ProtectionPackages Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    test('renders page title', () => {
      renderProtectionPackages();
      expect(screen.getByText('Protect Your Investment')).toBeInTheDocument();
    });

    test('renders personalized title when customer name provided', () => {
      renderProtectionPackages({
        customerData: { ...defaultCustomerData, customerName: 'John' }
      });
      expect(screen.getByText('John, protect your investment')).toBeInTheDocument();
    });

    test('renders vehicle context', () => {
      renderProtectionPackages();
      expect(screen.getByText('2025 Chevrolet Silverado 1500')).toBeInTheDocument();
      expect(screen.getByText('LT Crew Cab 4WD')).toBeInTheDocument();
    });

    test('renders back button', () => {
      renderProtectionPackages();
      expect(screen.getByText('Back')).toBeInTheDocument();
    });
  });

  describe('Protection Packages Display', () => {
    test('renders Service Contract package', () => {
      renderProtectionPackages();
      expect(screen.getByText('Service Contract')).toBeInTheDocument();
      expect(screen.getByText('Mechanical Breakdown Protection')).toBeInTheDocument();
      expect(screen.getByText('$2,295')).toBeInTheDocument();
    });

    test('renders Deficiency Balance Protection package', () => {
      renderProtectionPackages();
      expect(screen.getByText('Deficiency Balance Protection')).toBeInTheDocument();
      expect(screen.getByText('Loan/Lease Shortfall Coverage')).toBeInTheDocument();
      expect(screen.getByText('$595')).toBeInTheDocument();
    });

    test('renders Tire & Wheel Protection package', () => {
      renderProtectionPackages();
      expect(screen.getByText('Tire & Wheel Protection')).toBeInTheDocument();
      expect(screen.getByText('5 Years of Coverage')).toBeInTheDocument();
      expect(screen.getByText('$795')).toBeInTheDocument();
    });

    test('renders Add Protection buttons for all packages', () => {
      renderProtectionPackages();
      const addButtons = screen.getAllByText('Add Protection');
      expect(addButtons).toHaveLength(3);
    });

    test('renders Learn More buttons for all packages', () => {
      renderProtectionPackages();
      const learnMoreButtons = screen.getAllByText('Learn More');
      expect(learnMoreButtons).toHaveLength(3);
    });
  });

  describe('Package Selection', () => {
    test('toggles Service Contract selection', () => {
      renderProtectionPackages();
      
      const addButtons = screen.getAllByText('Add Protection');
      fireEvent.click(addButtons[0]);
      
      expect(screen.getByText('Added')).toBeInTheDocument();
      expect(screen.getByText('$2,295 total')).toBeInTheDocument();
    });

    test('shows correct total for multiple selections', () => {
      renderProtectionPackages();
      
      const addButtons = screen.getAllByText('Add Protection');
      
      fireEvent.click(addButtons[0]);
      expect(screen.getByText('$2,295 total')).toBeInTheDocument();
      
      fireEvent.click(addButtons[1]);
      expect(screen.getByText('$2,890 total')).toBeInTheDocument();
    });

    test('shows selection count', () => {
      renderProtectionPackages();
      
      const addButtons = screen.getAllByText('Add Protection');
      
      fireEvent.click(addButtons[0]);
      expect(screen.getByText('1 protection selected')).toBeInTheDocument();
      
      fireEvent.click(addButtons[1]);
      expect(screen.getByText('2 protections selected')).toBeInTheDocument();
    });

    test('deselects package when clicked again', () => {
      renderProtectionPackages();
      
      const addButtons = screen.getAllByText('Add Protection');
      
      fireEvent.click(addButtons[0]);
      expect(screen.getByText('Added')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Added'));
      expect(screen.queryByText('Added')).not.toBeInTheDocument();
      expect(screen.getByText('No protection packages selected')).toBeInTheDocument();
    });
  });

  describe('Learn More Functionality', () => {
    test('expands package details on Learn More click', () => {
      renderProtectionPackages();
      
      const learnMoreButtons = screen.getAllByText('Learn More');
      fireEvent.click(learnMoreButtons[0]);
      
      expect(screen.getByText(/Protect yourself from unexpected repair costs/)).toBeInTheDocument();
      expect(screen.getByText('Show Less')).toBeInTheDocument();
    });

    test('collapses package details on Show Less click', () => {
      renderProtectionPackages();
      
      const learnMoreButtons = screen.getAllByText('Learn More');
      fireEvent.click(learnMoreButtons[0]);
      
      fireEvent.click(screen.getByText('Show Less'));
      
      expect(screen.queryByText(/Protect yourself from unexpected repair costs/)).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    test('back button navigates to vehicle detail', () => {
      renderProtectionPackages();
      
      fireEvent.click(screen.getByText('Back'));
      expect(mockNavigateTo).toHaveBeenCalledWith('vehicleDetail');
    });

    test('No Thanks button navigates to handoff with empty packages', () => {
      renderProtectionPackages();
      
      fireEvent.click(screen.getByText('No Thanks, Continue'));
      
      expect(mockUpdateCustomerData).toHaveBeenCalledWith({
        protectionPackages: [],
        protectionTotal: 0,
      });
      expect(mockNavigateTo).toHaveBeenCalledWith('handoff');
    });

    test('Continue button saves selected packages and navigates', () => {
      renderProtectionPackages();
      
      const addButtons = screen.getAllByText('Add Protection');
      fireEvent.click(addButtons[0]);
      
      fireEvent.click(screen.getByText('Continue with Protection'));
      
      expect(mockUpdateCustomerData).toHaveBeenCalledWith({
        protectionPackages: [{
          id: 'serviceContract',
          name: 'Service Contract',
          price: 2295,
        }],
        protectionTotal: 2295,
      });
      expect(mockNavigateTo).toHaveBeenCalledWith('handoff');
    });
  });

  describe('Footer Display', () => {
    test('shows no selection message when nothing selected', () => {
      renderProtectionPackages();
      expect(screen.getByText('No protection packages selected')).toBeInTheDocument();
    });

    test('shows monthly estimate when packages selected', () => {
      renderProtectionPackages();
      
      const addButtons = screen.getAllByText('Add Protection');
      fireEvent.click(addButtons[0]);
      
      expect(screen.getByText('~$38/mo added to payment')).toBeInTheDocument();
    });
  });
});

describe('ProtectionPackages Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles missing vehicle data', () => {
    render(
      <ProtectionPackages
        navigateTo={mockNavigateTo}
        updateCustomerData={mockUpdateCustomerData}
        customerData={{ customerName: 'Test' }}
      />
    );
    
    expect(screen.getByText('Service Contract')).toBeInTheDocument();
  });

  test('selects all three packages and calculates total correctly', () => {
    renderProtectionPackages();
    
    const addButtons = screen.getAllByText('Add Protection');
    
    fireEvent.click(addButtons[0]);
    fireEvent.click(addButtons[1]);
    fireEvent.click(addButtons[2]);
    
    expect(screen.getByText('$3,685 total')).toBeInTheDocument();
    expect(screen.getByText('3 protections selected')).toBeInTheDocument();
  });
});

describe('ProtectionPackages Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('all buttons are accessible', () => {
    renderProtectionPackages();
    
    expect(screen.getByText('Back').tagName).toBe('BUTTON');
    expect(screen.getByText('No Thanks, Continue').tagName).toBe('BUTTON');
    
    const addButtons = screen.getAllByText('Add Protection');
    addButtons.forEach(btn => {
      expect(btn.tagName).toBe('BUTTON');
    });
  });

  test('package prices are visible', () => {
    renderProtectionPackages();
    
    expect(screen.getByText('$2,295')).toBeInTheDocument();
    expect(screen.getByText('$595')).toBeInTheDocument();
    expect(screen.getByText('$795')).toBeInTheDocument();
  });
});
