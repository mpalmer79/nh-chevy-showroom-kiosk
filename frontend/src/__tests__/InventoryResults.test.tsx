import { render, screen, fireEvent, waitFor, RenderResult } from '@testing-library/react';
import InventoryResults from '../components/InventoryResults';

// Mock the api module
jest.mock('../components/api', () => ({
  getInventory: jest.fn(),
}));

import api from '../components/api';

// Mock window.open (kept for any remaining external link tests)
const mockWindowOpen = jest.fn();
window.open = mockWindowOpen;

const mockNavigateTo = jest.fn();
const mockUpdateCustomerData = jest.fn();

interface MockVehicle {
  id: string;
  stockNumber: string;
  year: number;
  model: string;
  trim: string;
  exteriorColor: string;
  price: number;
  msrp: number;
  status: string;
  matchScore: number;
  features: string[];
  vin: string;
}

const mockVehicles: MockVehicle[] = [
  {
    id: '1',
    stockNumber: 'A1234',
    year: 2025,
    model: 'Silverado 1500',
    trim: 'LT Crew Cab',
    exteriorColor: 'Summit White',
    price: 47495,
    msrp: 48969,
    status: 'In Stock',
    matchScore: 95,
    features: ['Trailering Package', 'Heated Seats', 'Apple CarPlay'],
    vin: '1GCUDDED5RZ123456',
  },
  {
    id: '2',
    stockNumber: 'B5678',
    year: 2025,
    model: 'Silverado 1500',
    trim: 'RST Crew Cab',
    exteriorColor: 'Black',
    price: 52995,
    msrp: 54634,
    status: 'In Stock',
    matchScore: 88,
    features: ['Sport Package', 'Sunroof'],
    vin: '1GCUDDED5RZ789012',
  },
  {
    id: '3',
    stockNumber: 'C9012',
    year: 2025,
    model: 'Tahoe',
    trim: 'Z71',
    exteriorColor: 'Red',
    price: 62995,
    msrp: 64943,
    status: 'In Transit',
    matchScore: 75,
    features: [],
    vin: '1GNSKCKD5RR123456',
  },
];

const defaultCustomerData: Record<string, unknown> = {};

interface RenderProps {
  customerData?: Record<string, unknown>;
}

const renderInventoryResults = (props: RenderProps = {}): RenderResult => {
  return render(
    <InventoryResults
      navigateTo={mockNavigateTo}
      updateCustomerData={mockUpdateCustomerData}
      customerData={{ ...defaultCustomerData, ...props.customerData }}
      {...props}
    />
  );
};

describe('InventoryResults Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.getInventory as jest.Mock).mockResolvedValue(mockVehicles);
  });

  describe('Loading State', () => {
    test('displays loading text while fetching', async () => {
      // Delay resolution to catch loading state
      (api.getInventory as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockVehicles), 100))
      );
      
      renderInventoryResults();
      
      // Component should show loading immediately (loading defaults to true)
      expect(screen.getByText('Loading inventory...')).toBeInTheDocument();
      
      // Wait for load to complete - use getAllByText since there are 2 Silverados
      await waitFor(() => {
        expect(screen.getAllByText('2025 Silverado 1500').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error State', () => {
    test('displays error message when API fails', async () => {
      (api.getInventory as jest.Mock).mockRejectedValue(new Error('Network error'));
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText('Unable to load inventory. Please try again.')).toBeInTheDocument();
      });
    });

    test('displays retry button on error', async () => {
      (api.getInventory as jest.Mock).mockRejectedValue(new Error('Network error'));
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    test('displays error icon on error', async () => {
      (api.getInventory as jest.Mock).mockRejectedValue(new Error('Network error'));
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText('⚠️')).toBeInTheDocument();
      });
    });
  });

  describe('Successful Data Load', () => {
    test('displays vehicles after loading', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getAllByText('2025 Silverado 1500').length).toBeGreaterThan(0);
      });
    });

    test('displays vehicle count', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText(/\(3\)/)).toBeInTheDocument();
      });
    });

    test('displays stock numbers', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText('STK# A1234')).toBeInTheDocument();
        expect(screen.getByText('STK# B5678')).toBeInTheDocument();
      });
    });

    test('displays vehicle trims', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText('LT Crew Cab')).toBeInTheDocument();
        expect(screen.getByText('RST Crew Cab')).toBeInTheDocument();
      });
    });

    test('displays vehicle prices (Your Price)', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText('$47,495')).toBeInTheDocument();
        expect(screen.getByText('$52,995')).toBeInTheDocument();
      });
    });

    test('displays MSRP values', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText('$48,969')).toBeInTheDocument();
        expect(screen.getByText('$54,634')).toBeInTheDocument();
      });
    });

    test('displays MSRP and Your Price labels', async () => {
      renderInventoryResults();

      await waitFor(() => {
        const msrpLabels = screen.getAllByText('MSRP');
        const yourPriceLabels = screen.getAllByText('Your Price');
        expect(msrpLabels.length).toBeGreaterThan(0);
        expect(yourPriceLabels.length).toBeGreaterThan(0);
      });
    });

    test('displays exterior colors', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText('Summit White')).toBeInTheDocument();
        expect(screen.getByText('Black')).toBeInTheDocument();
      });
    });

    test('displays vehicle status', async () => {
      renderInventoryResults();

      await waitFor(() => {
        const inStockElements = screen.getAllByText('In Stock');
        expect(inStockElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Page Title', () => {
    test('displays "All Inventory" for browse path', async () => {
      renderInventoryResults({
        customerData: { path: 'browse' },
      });

      await waitFor(() => {
        expect(screen.getByText(/All Inventory/)).toBeInTheDocument();
      });
    });

    test('displays "Recommended For You" when quiz answers exist', async () => {
      renderInventoryResults({
        customerData: { quizAnswers: { primaryUse: 'commute' } },
      });

      await waitFor(() => {
        expect(screen.getByText(/Recommended For You/)).toBeInTheDocument();
      });
    });

    test('displays model-specific title when model selected', async () => {
      renderInventoryResults({
        customerData: { selectedModel: 'Silverado 1500' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Silverado 1500 Inventory/)).toBeInTheDocument();
      });
    });

    test('displays "SUVs" title when bodyStyleFilter is SUV', async () => {
      renderInventoryResults({
        customerData: { bodyStyleFilter: 'SUV' },
      });

      await waitFor(() => {
        expect(screen.getByText(/SUVs/)).toBeInTheDocument();
      });
    });

    test('displays "Trucks" title when bodyStyleFilter is Truck', async () => {
      renderInventoryResults({
        customerData: { bodyStyleFilter: 'Truck' },
      });

      await waitFor(() => {
        expect(screen.getByText(/Trucks/)).toBeInTheDocument();
      });
    });
  });

  describe('Match Score Display', () => {
    test('displays match scores when quiz answers exist', async () => {
      renderInventoryResults({
        customerData: { quizAnswers: { primaryUse: 'commute' } },
      });

      await waitFor(() => {
        // Use getAllByText since multiple vehicles may have scores displayed
        const scoreElements = screen.getAllByText(/\d+%/);
        expect(scoreElements.length).toBeGreaterThan(0);
      });
    });

    test('displays match label with score', async () => {
      renderInventoryResults({
        customerData: { quizAnswers: { primaryUse: 'commute' } },
      });

      await waitFor(() => {
        // Find elements that contain exactly "Match" (not "Best Match")
        const matchLabels = screen.getAllByText((content, element) => {
          return element?.tagName.toLowerCase() === 'span' && 
                 content === 'Match';
        });
        expect(matchLabels.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Features Display', () => {
    test('displays vehicle features as tags', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText('Trailering Package')).toBeInTheDocument();
        expect(screen.getByText('Heated Seats')).toBeInTheDocument();
      });
    });

    test('displays up to 3 features per vehicle', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText('Trailering Package')).toBeInTheDocument();
        expect(screen.getByText('Heated Seats')).toBeInTheDocument();
        expect(screen.getByText('Apple CarPlay')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    test('displays sort dropdown with default value', async () => {
      renderInventoryResults();

      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select).toBeInTheDocument();
        expect(select.value).toBe('recommended');
      });
    });

    test('displays all sort options', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText('Best Match')).toBeInTheDocument();
        expect(screen.getByText('Price: Low to High')).toBeInTheDocument();
        expect(screen.getByText('Price: High to Low')).toBeInTheDocument();
        expect(screen.getByText('Newest First')).toBeInTheDocument();
      });
    });

    test('changing sort updates selection without refetching', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const initialCallCount = (api.getInventory as jest.Mock).mock.calls.length;
      
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'priceLow' } });

      expect(select.value).toBe('priceLow');
      // Verify no additional API call was made (client-side sort)
      expect((api.getInventory as jest.Mock).mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('Vehicle Card Interactions', () => {
    test('View Details button navigates to vehicle detail page', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByText('View Details')[0]);

      // Should navigate to vehicleDetail page
      expect(mockNavigateTo).toHaveBeenCalledWith('vehicleDetail');
    });

    test('View Details button updates customer data with selected vehicle', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByText('View Details')[0]);

      // Should update customer data with the selected vehicle
      expect(mockUpdateCustomerData).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedVehicle: expect.objectContaining({
            stockNumber: 'A1234',
            model: 'Silverado 1500',
          }),
        })
      );
    });

    test('clicking vehicle card navigates to vehicle detail page', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText('LT Crew Cab')).toBeInTheDocument();
      });

      // Click the card (parent of trim text)
      const trim = screen.getByText('LT Crew Cab');
      const card = trim.closest('div[style*="cursor"]');
      fireEvent.click(card!);

      expect(mockNavigateTo).toHaveBeenCalledWith('vehicleDetail');
    });

    test('selected vehicle includes gradient and rebates', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByText('View Details')[0]);

      expect(mockUpdateCustomerData).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedVehicle: expect.objectContaining({
            gradient: expect.any(String),
            rebates: expect.arrayContaining([
              expect.objectContaining({ name: 'Customer Cash', amount: 3000 }),
              expect.objectContaining({ name: 'Bonus Cash', amount: 1000 }),
            ]),
          }),
        })
      );
    });
  });

  describe('Model Filtering', () => {
    test('filters vehicles by selected model', async () => {
      renderInventoryResults({
        customerData: { selectedModel: 'Silverado 1500' },
      });

      await waitFor(() => {
        expect(screen.getAllByText(/Silverado 1500/).length).toBeGreaterThan(0);
      });

      expect(screen.queryByText('2025 Tahoe')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('displays no results message when no vehicles match', async () => {
      (api.getInventory as jest.Mock).mockResolvedValue([]);
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText('No vehicles match your criteria')).toBeInTheDocument();
      });
    });

    test('displays search icon and suggestion in empty state', async () => {
      (api.getInventory as jest.Mock).mockResolvedValue([]);
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText('🔍')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your filters or preferences')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    test('Start Over button clears filters and navigates to welcome', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText('Start Over')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Start Over'));
      expect(mockUpdateCustomerData).toHaveBeenCalledWith({
        selectedModel: undefined,
        bodyStyleFilter: undefined,
        selectedCab: undefined,
      });
      expect(mockNavigateTo).toHaveBeenCalledWith('welcome');
    });

    test('Compare button navigates to vehicleComparison', async () => {
      renderInventoryResults();

      await waitFor(() => {
        expect(screen.getByText('Compare')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Compare'));
      expect(mockNavigateTo).toHaveBeenCalledWith('vehicleComparison');
    });
  });
});

describe('InventoryResults Vehicle Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.getInventory as jest.Mock).mockResolvedValue(mockVehicles);
  });

  test('selecting vehicle stores all original vehicle properties', async () => {
    renderInventoryResults();

    await waitFor(() => {
      expect(screen.getAllByText('View Details')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('View Details')[0]);

    expect(mockUpdateCustomerData).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedVehicle: expect.objectContaining({
          id: '1',
          stockNumber: 'A1234',
          year: 2025,
          model: 'Silverado 1500',
          trim: 'LT Crew Cab',
          exteriorColor: 'Summit White',
          price: 47495,
          msrp: 48969,
          vin: '1GCUDDED5RZ123456',
        }),
      })
    );
  });

  test('selecting different vehicles updates customer data', async () => {
    renderInventoryResults();

    await waitFor(() => {
      expect(screen.getAllByText('View Details').length).toBeGreaterThan(1);
    });

    // Click second vehicle
    fireEvent.click(screen.getAllByText('View Details')[1]);

    expect(mockUpdateCustomerData).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedVehicle: expect.objectContaining({
          stockNumber: 'B5678',
          trim: 'RST Crew Cab',
        }),
      })
    );
  });
});

describe('InventoryResults API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls API once on mount', async () => {
    (api.getInventory as jest.Mock).mockResolvedValue(mockVehicles);
    renderInventoryResults();

    await waitFor(() => {
      expect(screen.getAllByText('2025 Silverado 1500').length).toBeGreaterThan(0);
    });

    expect(api.getInventory).toHaveBeenCalledTimes(1);
  });

  test('passes model filter to API', async () => {
    (api.getInventory as jest.Mock).mockResolvedValue(mockVehicles);
    renderInventoryResults({
      customerData: { selectedModel: 'Silverado 1500' },
    });

    await waitFor(() => {
      expect(api.getInventory).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'Silverado 1500' })
      );
    });
  });

  test('passes cab type filter to API', async () => {
    (api.getInventory as jest.Mock).mockResolvedValue(mockVehicles);
    renderInventoryResults({
      customerData: { selectedCab: 'Crew Cab' },
    });

    await waitFor(() => {
      expect(api.getInventory).toHaveBeenCalledWith(
        expect.objectContaining({ cabType: 'Crew Cab' })
      );
    });
  });

  test('passes body style filter to API', async () => {
    (api.getInventory as jest.Mock).mockResolvedValue(mockVehicles);
    renderInventoryResults({
      customerData: { bodyStyleFilter: 'SUV' },
    });

    await waitFor(() => {
      expect(api.getInventory).toHaveBeenCalledWith(
        expect.objectContaining({ body_style: 'SUV' })
      );
    });
  });

  test('handles API response with vehicles property', async () => {
    (api.getInventory as jest.Mock).mockResolvedValue({ vehicles: mockVehicles });
    renderInventoryResults();

    await waitFor(() => {
      expect(screen.getAllByText('2025 Silverado 1500').length).toBeGreaterThan(0);
    });
  });
});

describe('InventoryResults Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.getInventory as jest.Mock).mockResolvedValue(mockVehicles);
  });

  test('interactive elements are proper buttons', async () => {
    renderInventoryResults();

    await waitFor(() => {
      expect(screen.getByText('Start Over').tagName).toBe('BUTTON');
      screen.getAllByText('View Details').forEach(btn => {
        expect(btn.tagName).toBe('BUTTON');
      });
    });
  });

  test('sort dropdown is accessible', async () => {
    renderInventoryResults();

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });
});
