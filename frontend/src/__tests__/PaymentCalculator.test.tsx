import { render, screen, fireEvent, RenderResult } from '@testing-library/react';
import PaymentCalculator from '../components/PaymentCalculator';

const mockNavigateTo = jest.fn();
const mockUpdateCustomerData = jest.fn();

interface MockVehicle {
  salePrice: number;
  msrp: number;
  model: string;
  year: number;
}

const defaultVehicle: MockVehicle = {
  salePrice: 50000,
  msrp: 55000,
  model: 'Silverado 1500',
  year: 2025,
};

interface CustomerData {
  selectedVehicle: MockVehicle;
  tradeIn?: {
    estimatedValue: number;
    amountOwed?: number;
  };
}

const defaultCustomerData: CustomerData = {
  selectedVehicle: defaultVehicle,
};

interface RenderProps {
  customerData?: Partial<CustomerData>;
}

const renderPaymentCalculator = (props: RenderProps = {}): RenderResult => {
  return render(
    <PaymentCalculator
      navigateTo={mockNavigateTo}
      updateCustomerData={mockUpdateCustomerData}
      customerData={{ ...defaultCustomerData, ...props.customerData }}
      {...props}
    />
  );
};

describe('PaymentCalculator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    test('renders Payment Calculator title', () => {
      renderPaymentCalculator();
      expect(screen.getByText('Payment Calculator')).toBeInTheDocument();
    });

    test('displays selected vehicle info', () => {
      renderPaymentCalculator();
      expect(screen.getByText(/2025 Silverado 1500/i)).toBeInTheDocument();
      expect(screen.getByText(/\$50,000/)).toBeInTheDocument();
    });

    test('renders Lease and Finance columns', () => {
      renderPaymentCalculator();
      expect(screen.getByText('Lease')).toBeInTheDocument();
      expect(screen.getByText('Finance')).toBeInTheDocument();
    });

    test('renders back button', () => {
      renderPaymentCalculator();
      expect(screen.getByText('Back to Vehicle')).toBeInTheDocument();
    });

    test('uses default vehicle if none selected', () => {
      render(
        <PaymentCalculator
          navigateTo={mockNavigateTo}
          updateCustomerData={mockUpdateCustomerData}
          customerData={{}}
        />
      );
      expect(screen.getByText(/Silverado 1500/)).toBeInTheDocument();
    });
  });

  describe('Lease Calculator', () => {
    test('displays default 39-month term selected', () => {
      renderPaymentCalculator();
      const button39 = screen.getByText('39 mo');
      expect(button39).toHaveStyle({ background: '#22c55e' });
    });

    test('clicking different term updates selection', () => {
      renderPaymentCalculator();
      
      const button24 = screen.getByText('24 mo');
      fireEvent.click(button24);
      
      expect(button24).toHaveStyle({ background: '#22c55e' });
    });

    test('displays mileage options', () => {
      renderPaymentCalculator();
      expect(screen.getByText('10K')).toBeInTheDocument();
      expect(screen.getByText('12K')).toBeInTheDocument();
      expect(screen.getByText('15K')).toBeInTheDocument();
    });

    test('default mileage is 12K', () => {
      renderPaymentCalculator();
      const button12k = screen.getByText('12K');
      expect(button12k).toHaveStyle({ background: '#22c55e' });
    });

    test('displays Due at Signing', () => {
      renderPaymentCalculator();
      expect(screen.getByText('Due at Signing')).toBeInTheDocument();
    });

    test('displays Residual Value', () => {
      renderPaymentCalculator();
      expect(screen.getByText('Residual Value')).toBeInTheDocument();
    });

    test('Select Lease button is present', () => {
      renderPaymentCalculator();
      expect(screen.getByText('Select Lease')).toBeInTheDocument();
    });
  });

  describe('Finance Calculator', () => {
    test('displays finance term options', () => {
      renderPaymentCalculator();
      expect(screen.getByText('48 mo')).toBeInTheDocument();
      expect(screen.getByText('60 mo')).toBeInTheDocument();
      expect(screen.getByText('72 mo')).toBeInTheDocument();
      expect(screen.getByText('84 mo')).toBeInTheDocument();
    });

    test('default finance term is 72 months', () => {
      renderPaymentCalculator();
      const button72 = screen.getByText('72 mo');
      expect(button72).toHaveStyle({ background: '#22c55e' });
    });

    test('displays APR slider', () => {
      renderPaymentCalculator();
      expect(screen.getByText('Est. APR')).toBeInTheDocument();
    });

    test('displays Total Interest', () => {
      renderPaymentCalculator();
      expect(screen.getByText('Total Interest')).toBeInTheDocument();
    });

    test('Select Finance button is present', () => {
      renderPaymentCalculator();
      expect(screen.getByText('Select Finance')).toBeInTheDocument();
    });
  });

  describe('Down Payment Controls', () => {
    test('both calculators have down payment slider labels plus finance result row', () => {
      renderPaymentCalculator();
      const downPaymentLabels = screen.getAllByText('Down Payment');
      expect(downPaymentLabels.length).toBe(3);
    });

    test('sliders are present for user input', () => {
      renderPaymentCalculator();
      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBeGreaterThanOrEqual(2);
    });

    test('default down payment is $3,000', () => {
      renderPaymentCalculator();
      const values = screen.getAllByText('$3,000');
      expect(values.length).toBeGreaterThan(0);
    });
  });

  describe('Trade-In Section', () => {
    test('shows trade-in CTA when no trade value', () => {
      renderPaymentCalculator();
      expect(screen.getByText('Have a Trade-In?')).toBeInTheDocument();
    });

    test('shows trade-in banner when trade value exists', () => {
      renderPaymentCalculator({
        customerData: {
          selectedVehicle: defaultVehicle,
          tradeIn: { estimatedValue: 15000 },
        },
      });
      
      expect(screen.getByText('Trade-In Applied')).toBeInTheDocument();
      expect(screen.getByText(/\$15,000 equity/)).toBeInTheDocument();
    });

    test('trade-in edit button navigates to trade-in page', () => {
      renderPaymentCalculator({
        customerData: {
          selectedVehicle: defaultVehicle,
          tradeIn: { estimatedValue: 15000 },
        },
      });
      
      fireEvent.click(screen.getByText('Edit'));
      expect(mockNavigateTo).toHaveBeenCalledWith('tradeIn');
    });

    test('trade-in CTA navigates to trade-in page', () => {
      renderPaymentCalculator();
      
      fireEvent.click(screen.getByText('Have a Trade-In?'));
      expect(mockNavigateTo).toHaveBeenCalledWith('tradeIn');
    });
  });

  describe('Navigation', () => {
    test('back button navigates to vehicle detail', () => {
      renderPaymentCalculator();
      
      fireEvent.click(screen.getByText('Back to Vehicle'));
      expect(mockNavigateTo).toHaveBeenCalledWith('vehicleDetail');
    });
  });

  describe('Payment Selection', () => {
    test('selecting lease calls updateCustomerData and navigates', () => {
      renderPaymentCalculator();
      
      fireEvent.click(screen.getByText('Select Lease'));
      
      expect(mockUpdateCustomerData).toHaveBeenCalled();
      expect(mockNavigateTo).toHaveBeenCalledWith('handoff');
    });

    test('selecting finance calls updateCustomerData and navigates', () => {
      renderPaymentCalculator();
      
      fireEvent.click(screen.getByText('Select Finance'));
      
      expect(mockUpdateCustomerData).toHaveBeenCalled();
      expect(mockNavigateTo).toHaveBeenCalledWith('handoff');
    });

    test('lease selection includes payment data', () => {
      renderPaymentCalculator();
      
      fireEvent.click(screen.getByText('Select Lease'));
      
      const callArg = mockUpdateCustomerData.mock.calls[0][0];
      expect(callArg.paymentPreference.type).toBe('lease');
      expect(callArg.paymentPreference.term).toBe(39);
      expect(callArg.paymentPreference.milesPerYear).toBe(12000);
    });

    test('finance selection includes payment data', () => {
      renderPaymentCalculator();
      
      fireEvent.click(screen.getByText('Select Finance'));
      
      const callArg = mockUpdateCustomerData.mock.calls[0][0];
      expect(callArg.paymentPreference.type).toBe('finance');
      expect(callArg.paymentPreference.term).toBe(72);
      expect(callArg.paymentPreference.apr).toBe(6.9);
    });
  });

  describe('Comparison Banner', () => {
    test('displays monthly difference between lease and finance', () => {
      renderPaymentCalculator();
      expect(screen.getByText(/leasing saves you/i)).toBeInTheDocument();
    });

    test('displays annual savings calculation', () => {
      renderPaymentCalculator();
      expect(screen.getByText(/per year in your pocket/i)).toBeInTheDocument();
    });
  });
});

describe('PaymentCalculator Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles zero MSRP gracefully', () => {
    render(
      <PaymentCalculator
        navigateTo={mockNavigateTo}
        updateCustomerData={mockUpdateCustomerData}
        customerData={{
          selectedVehicle: {
            salePrice: 50000,
            msrp: 0,
            model: 'Test',
            year: 2025,
          },
        }}
      />
    );
    
    expect(screen.getByText('Payment Calculator')).toBeInTheDocument();
  });

  test('handles trade-in with amount owed', () => {
    render(
      <PaymentCalculator
        navigateTo={mockNavigateTo}
        updateCustomerData={mockUpdateCustomerData}
        customerData={{
          selectedVehicle: defaultVehicle,
          tradeIn: { estimatedValue: 15000, amountOwed: 5000 },
        }}
      />
    );
    
    expect(screen.getByText('Trade-In Applied')).toBeInTheDocument();
  });
});

describe('PaymentCalculator Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sliders have associated labels', () => {
    render(
      <PaymentCalculator
        navigateTo={mockNavigateTo}
        updateCustomerData={mockUpdateCustomerData}
        customerData={defaultCustomerData}
      />
    );
    
    expect(screen.getByText('Est. APR')).toBeInTheDocument();
    expect(screen.getAllByText('Down Payment').length).toBe(3);
  });

  test('all action buttons are accessible', () => {
    render(
      <PaymentCalculator
        navigateTo={mockNavigateTo}
        updateCustomerData={mockUpdateCustomerData}
        customerData={defaultCustomerData}
      />
    );
    
    expect(screen.getByText('Select Lease').tagName).toBe('BUTTON');
    expect(screen.getByText('Select Finance').tagName).toBe('BUTTON');
    expect(screen.getByText('Back to Vehicle').tagName).toBe('BUTTON');
  });
});
