import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VehicleComparison from '../components/VehicleComparison';
import api from '../components/api';

// Mock the API module
jest.mock('../components/api', () => ({
  __esModule: true,
  default: {
    getInventory: jest.fn(),
  },
}));

// Mock vehicle data
const mockVehicles = [
  {
    id: '1',
    stock_number: 'STK001',
    year: 2024,
    make: 'Chevrolet',
    model: 'Equinox',
    trim: 'LT',
    exterior_color: 'Blue',
    interior_color: 'Black',
    price: 32000,
    msrp: 34000,
    engine: '1.5L Turbo',
    transmission: 'Automatic',
    drivetrain: 'AWD',
    fuel_type: 'Gasoline',
    mpg_city: 26,
    mpg_highway: 31,
    body_style: 'SUV',
    doors: 4,
    status: 'In Stock',
    features: ['Apple CarPlay', 'Android Auto', 'Backup Camera'],
  },
  {
    id: '2',
    stock_number: 'STK002',
    year: 2024,
    make: 'Chevrolet',
    model: 'Blazer',
    trim: 'RS',
    exterior_color: 'Red',
    interior_color: 'Jet Black',
    price: 45000,
    msrp: 47000,
    engine: '3.6L V6',
    transmission: 'Automatic',
    drivetrain: 'AWD',
    fuel_type: 'Gasoline',
    mpg_city: 19,
    mpg_highway: 27,
    body_style: 'SUV',
    doors: 4,
    status: 'In Stock',
    features: ['Leather Seats', 'Sunroof', 'Bose Audio', 'Navigation'],
  },
  {
    id: '3',
    stock_number: 'STK003',
    year: 2024,
    make: 'Chevrolet',
    model: 'Silverado',
    trim: 'LTZ',
    exterior_color: 'White',
    interior_color: 'Brown',
    price: 55000,
    msrp: 58000,
    engine: '5.3L V8',
    transmission: 'Automatic',
    drivetrain: '4WD',
    fuel_type: 'Gasoline',
    mpg_city: 16,
    mpg_highway: 22,
    body_style: 'Truck',
    doors: 4,
    status: 'In Stock',
    features: ['Towing Package', 'Bed Liner', 'Heated Seats'],
  },
];

// Default props for the component
const defaultProps = {
  navigateTo: jest.fn(),
  resetJourney: jest.fn(),
  customerData: {},
  updateCustomerData: jest.fn(),
};

describe('VehicleComparison Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.getInventory as jest.Mock).mockResolvedValue(mockVehicles);
  });

  describe('Rendering', () => {
    it('renders the comparison title', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      expect(screen.getByText('Vehicle Comparison')).toBeInTheDocument();
    });

    it('renders the subtitle instruction', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      expect(screen.getByText('Select up to 3 vehicles to compare side-by-side')).toBeInTheDocument();
    });

    it('displays loading state initially', () => {
      render(<VehicleComparison {...defaultProps} />);
      
      expect(screen.getByText('Loading inventory...')).toBeInTheDocument();
    });

    it('displays vehicles after loading', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2024 Chevrolet Equinox')).toBeInTheDocument();
        expect(screen.getByText('2024 Chevrolet Blazer')).toBeInTheDocument();
        expect(screen.getByText('2024 Chevrolet Silverado')).toBeInTheDocument();
      });
    });

    it('displays search bar', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search by year, make, model/i)).toBeInTheDocument();
      });
    });
  });

  describe('Vehicle Selection', () => {
    it('allows selecting a vehicle', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2024 Chevrolet Equinox')).toBeInTheDocument();
      });
      
      // Click on the first vehicle card
      const vehicleCards = screen.getAllByText(/2024 Chevrolet/);
      fireEvent.click(vehicleCards[0].closest('div[style*="cursor"]') as Element);
      
      // Should show selection pill
      await waitFor(() => {
        expect(screen.getByText('2024 Equinox')).toBeInTheDocument();
      });
    });

    it('shows "2 more available" after selecting 1 vehicle', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2024 Chevrolet Equinox')).toBeInTheDocument();
      });
      
      // Click on a vehicle
      const vehicleCards = screen.getAllByText(/2024 Chevrolet/);
      fireEvent.click(vehicleCards[0].closest('div[style*="cursor"]') as Element);
      
      await waitFor(() => {
        expect(screen.getByText('2 more available')).toBeInTheDocument();
      });
    });

    it('shows "Compare Now" button after selecting 2 vehicles', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2024 Chevrolet Equinox')).toBeInTheDocument();
      });
      
      // Select first vehicle
      const vehicleCards = screen.getAllByText(/2024 Chevrolet/);
      fireEvent.click(vehicleCards[0].closest('div[style*="cursor"]') as Element);
      
      // Select second vehicle
      fireEvent.click(vehicleCards[1].closest('div[style*="cursor"]') as Element);
      
      await waitFor(() => {
        expect(screen.getByText(/Compare Now/)).toBeInTheDocument();
      });
    });

    it('allows deselecting a vehicle via remove button', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2024 Chevrolet Equinox')).toBeInTheDocument();
      });
      
      // Select a vehicle
      const vehicleCards = screen.getAllByText(/2024 Chevrolet/);
      fireEvent.click(vehicleCards[0].closest('div[style*="cursor"]') as Element);
      
      // Wait for pill to appear
      await waitFor(() => {
        expect(screen.getByText('2024 Equinox')).toBeInTheDocument();
      });
      
      // Click remove button
      const removeBtn = screen.getByText('×');
      fireEvent.click(removeBtn);
      
      // Pill should be removed
      await waitFor(() => {
        expect(screen.queryByText('2 more available')).not.toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters vehicles by search term', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2024 Chevrolet Equinox')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search by year, make, model/i);
      fireEvent.change(searchInput, { target: { value: 'Silverado' } });
      
      await waitFor(() => {
        expect(screen.getByText('2024 Chevrolet Silverado')).toBeInTheDocument();
        expect(screen.queryByText('2024 Chevrolet Equinox')).not.toBeInTheDocument();
      });
    });

    it('shows clear button when search has value', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2024 Chevrolet Equinox')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search by year, make, model/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      // Clear button should appear (×)
      const clearButtons = screen.getAllByText('×');
      expect(clearButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Comparison View', () => {
    it('shows comparison table after clicking Compare Now', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2024 Chevrolet Equinox')).toBeInTheDocument();
      });
      
      // Select two vehicles
      const vehicleCards = screen.getAllByText(/2024 Chevrolet/);
      fireEvent.click(vehicleCards[0].closest('div[style*="cursor"]') as Element);
      fireEvent.click(vehicleCards[1].closest('div[style*="cursor"]') as Element);
      
      // Click Compare Now
      await waitFor(() => {
        expect(screen.getByText(/Compare Now/)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText(/Compare Now/));
      
      // Should show comparison specs
      await waitFor(() => {
        expect(screen.getByText('Price')).toBeInTheDocument();
        expect(screen.getByText('Engine')).toBeInTheDocument();
        expect(screen.getByText('Drivetrain')).toBeInTheDocument();
      });
    });

    it('shows "Modify Selection" button in comparison view', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2024 Chevrolet Equinox')).toBeInTheDocument();
      });
      
      // Select and compare
      const vehicleCards = screen.getAllByText(/2024 Chevrolet/);
      fireEvent.click(vehicleCards[0].closest('div[style*="cursor"]') as Element);
      fireEvent.click(vehicleCards[1].closest('div[style*="cursor"]') as Element);
      
      await waitFor(() => {
        expect(screen.getByText(/Compare Now/)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText(/Compare Now/));
      
      await waitFor(() => {
        expect(screen.getByText('← Modify Selection')).toBeInTheDocument();
      });
    });

    it('shows View Details button for each vehicle', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2024 Chevrolet Equinox')).toBeInTheDocument();
      });
      
      // Select and compare
      const vehicleCards = screen.getAllByText(/2024 Chevrolet/);
      fireEvent.click(vehicleCards[0].closest('div[style*="cursor"]') as Element);
      fireEvent.click(vehicleCards[1].closest('div[style*="cursor"]') as Element);
      
      await waitFor(() => {
        expect(screen.getByText(/Compare Now/)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText(/Compare Now/));
      
      await waitFor(() => {
        const viewDetailsBtns = screen.getAllByText('View Details');
        expect(viewDetailsBtns.length).toBe(2);
      });
    });
  });

  describe('Navigation', () => {
    it('calls navigateTo when clicking View Details', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2024 Chevrolet Equinox')).toBeInTheDocument();
      });
      
      // Select and compare
      const vehicleCards = screen.getAllByText(/2024 Chevrolet/);
      fireEvent.click(vehicleCards[0].closest('div[style*="cursor"]') as Element);
      fireEvent.click(vehicleCards[1].closest('div[style*="cursor"]') as Element);
      
      await waitFor(() => {
        expect(screen.getByText(/Compare Now/)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText(/Compare Now/));
      
      await waitFor(() => {
        const viewDetailsBtns = screen.getAllByText('View Details');
        fireEvent.click(viewDetailsBtns[0]);
      });
      
      expect(defaultProps.navigateTo).toHaveBeenCalledWith('vehicleDetail');
    });

    it('calls navigateTo when clicking Browse More Vehicles', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2024 Chevrolet Equinox')).toBeInTheDocument();
      });
      
      // Select and compare
      const vehicleCards = screen.getAllByText(/2024 Chevrolet/);
      fireEvent.click(vehicleCards[0].closest('div[style*="cursor"]') as Element);
      fireEvent.click(vehicleCards[1].closest('div[style*="cursor"]') as Element);
      
      await waitFor(() => {
        expect(screen.getByText(/Compare Now/)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText(/Compare Now/));
      
      await waitFor(() => {
        expect(screen.getByText('Browse More Vehicles')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Browse More Vehicles'));
      
      expect(defaultProps.navigateTo).toHaveBeenCalledWith('inventory');
    });
  });

  describe('Price Formatting', () => {
    it('displays formatted prices correctly', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2024 Chevrolet Equinox')).toBeInTheDocument();
      });
      
      // Should show formatted MSRP on vehicle card (component shows MSRP first)
      expect(screen.getByText('$34,000')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles API error gracefully', async () => {
      (api.getInventory as jest.Mock).mockRejectedValue(new Error('API Error'));
      
      render(<VehicleComparison {...defaultProps} />);
      
      // Should not crash and eventually finish loading
      await waitFor(() => {
        expect(screen.queryByText('Loading inventory...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has clickable vehicle cards', async () => {
      render(<VehicleComparison {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('2024 Chevrolet Equinox')).toBeInTheDocument();
      });
      
      const vehicleCards = screen.getAllByText(/2024 Chevrolet/);
      vehicleCards.forEach(card => {
        const clickableParent = card.closest('div[style*="cursor"]');
        expect(clickableParent).toBeInTheDocument();
      });
    });
  });
});
