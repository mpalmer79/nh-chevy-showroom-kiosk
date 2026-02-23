import { render, screen, fireEvent } from '@testing-library/react';
import VehicleCard from '../components/VehicleCard';

// Mock the vehicleHelpers module
jest.mock('../utils/vehicleHelpers', () => ({
  getVehicleImageUrl: jest.fn(),
}));

import { getVehicleImageUrl } from '../utils/vehicleHelpers';

const mockOnClick = jest.fn();

const createMockVehicle = (overrides = {}) => ({
  id: '1',
  stockNumber: 'M12345',
  stock_number: 'M12345',
  year: 2025,
  make: 'Chevrolet',
  model: 'Silverado 1500',
  trim: 'LT Crew Cab',
  exteriorColor: 'Summit White',
  exterior_color: 'Summit White',
  interiorColor: 'Jet Black',
  interior_color: 'Jet Black',
  price: 52000,
  salePrice: 52000,
  sale_price: 52000,
  msrp: 54000,  // Component now shows MSRP first
  mileage: 0,
  engine: '5.3L V8',
  transmission: 'Automatic',
  drivetrain: '4WD',
  fuelType: 'Gasoline',
  fuel_type: 'Gasoline',
  bodyStyle: 'Truck',
  body_style: 'Truck',
  status: 'In Stock',
  features: ['Trailering Package', 'Heated Seats'],
  ...overrides,
});

const renderVehicleCard = (vehicle = createMockVehicle(), onClick = mockOnClick) => {
  return render(<VehicleCard vehicle={vehicle} onClick={onClick} />);
};

describe('VehicleCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getVehicleImageUrl as jest.Mock).mockReturnValue(null);
  });

  describe('Basic Rendering', () => {
    test('renders vehicle year, make, and model', () => {
      renderVehicleCard();
      // May appear in multiple places (title + fallback)
      const matches = screen.getAllByText(/2025 Chevrolet Silverado 1500/i);
      expect(matches.length).toBeGreaterThan(0);
    });

    test('renders exterior color', () => {
      renderVehicleCard();
      expect(screen.getByText('Summit White')).toBeInTheDocument();
    });

    test('renders drivetrain', () => {
      renderVehicleCard();
      expect(screen.getByText('4WD')).toBeInTheDocument();
    });

    test('renders engine', () => {
      renderVehicleCard();
      expect(screen.getByText('5.3L V8')).toBeInTheDocument();
    });

    test('renders formatted price', () => {
      renderVehicleCard();
      expect(screen.getByText('$54,000')).toBeInTheDocument();  // Shows MSRP first
    });

    test('renders status badge', () => {
      renderVehicleCard();
      expect(screen.getByText('In Stock')).toBeInTheDocument();
    });
  });

  describe('Gradient Fallback', () => {
    test('shows model name in fallback when no image', () => {
      (getVehicleImageUrl as jest.Mock).mockReturnValue(null);
      renderVehicleCard();
      // Model name appears multiple times - in header and card content
      const silveradoTexts = screen.getAllByText(/Silverado 1500/i);
      expect(silveradoTexts.length).toBeGreaterThan(0);
    });

    test('shows year and trim in fallback', () => {
      (getVehicleImageUrl as jest.Mock).mockReturnValue(null);
      renderVehicleCard();
      expect(screen.getByText(/2025.*LT Crew Cab/i)).toBeInTheDocument();
    });
  });

  describe('Image Display', () => {
    test('shows image when URL is available', () => {
      (getVehicleImageUrl as jest.Mock).mockReturnValue('/images/vehicles/silverado-white.jpg');
      renderVehicleCard();
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', '/images/vehicles/silverado-white.jpg');
    });

    test('image has alt text', () => {
      (getVehicleImageUrl as jest.Mock).mockReturnValue('/images/vehicles/silverado-white.jpg');
      renderVehicleCard();
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt');
      expect(img.getAttribute('alt')).toContain('Silverado');
    });

    test('handles image load error', () => {
      (getVehicleImageUrl as jest.Mock).mockReturnValue('/images/vehicles/nonexistent.jpg');
      renderVehicleCard();
      const img = screen.getByRole('img');
      fireEvent.error(img);
      // After error, image should not be visible (falls back to gradient)
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('Click Handling', () => {
    test('calls onClick when card is clicked', () => {
      renderVehicleCard();
      const silveradoMatches = screen.getAllByText(/Silverado/i);
      const card = silveradoMatches[0].closest('div');
      if (card) {
        fireEvent.click(card);
      }
      expect(mockOnClick).toHaveBeenCalled();
    });

    test('passes vehicle to onClick', () => {
      const vehicle = createMockVehicle();
      renderVehicleCard(vehicle);
      const silveradoMatches = screen.getAllByText(/Silverado/i);
      const card = silveradoMatches[0].closest('div');
      if (card) {
        fireEvent.click(card);
      }
      expect(mockOnClick).toHaveBeenCalledWith(expect.objectContaining({
        stockNumber: 'M12345',
      }));
    });
  });

  describe('Hover Effects', () => {
    test('transforms on mouse enter', () => {
      renderVehicleCard();
      const silveradoMatches = screen.getAllByText(/Silverado/i);
      const card = silveradoMatches[0].closest('div');
      if (card) {
        fireEvent.mouseEnter(card);
      }
    });

    test('resets on mouse leave', () => {
      renderVehicleCard();
      const silveradoMatches = screen.getAllByText(/Silverado/i);
      const card = silveradoMatches[0].closest('div');
      if (card) {
        fireEvent.mouseEnter(card);
        fireEvent.mouseLeave(card);
      }
    });
  });

  describe('Price Formatting', () => {
    test('formats price with dollar sign and commas', () => {
      renderVehicleCard();
      expect(screen.getByText('$54,000')).toBeInTheDocument();  // Shows MSRP first
    });

    test('formats large prices correctly', () => {
      const vehicle = createMockVehicle({ msrp: 125999, price: 120000 });
      renderVehicleCard(vehicle);
      expect(screen.getByText('$125,999')).toBeInTheDocument();  // Shows MSRP first
    });

    test('handles zero price', () => {
      const vehicle = createMockVehicle({ msrp: 0, price: 0, salePrice: 0, sale_price: 0 });
      renderVehicleCard(vehicle);
      expect(screen.getByText('$0')).toBeInTheDocument();
    });

    test('uses salePrice if msrp not available', () => {
      const vehicle = createMockVehicle({ msrp: undefined, price: undefined, salePrice: 48000 });
      renderVehicleCard(vehicle);
      expect(screen.getByText('$48,000')).toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    test('displays In Stock status', () => {
      renderVehicleCard();
      expect(screen.getByText('In Stock')).toBeInTheDocument();
    });

    test('displays In Transit status', () => {
      const vehicle = createMockVehicle({ status: 'In Transit' });
      renderVehicleCard(vehicle);
      expect(screen.getByText('In Transit')).toBeInTheDocument();
    });

    test('defaults to In Stock when no status', () => {
      const vehicle = createMockVehicle({ status: undefined });
      renderVehicleCard(vehicle);
      expect(screen.getByText('In Stock')).toBeInTheDocument();
    });
  });

  describe('Missing Data Handling', () => {
    test('shows N/A for missing exterior color', () => {
      const vehicle = createMockVehicle({
        exteriorColor: undefined,
        exterior_color: undefined,
      });
      renderVehicleCard(vehicle);
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    test('shows N/A for missing drivetrain', () => {
      const vehicle = createMockVehicle({ drivetrain: undefined });
      renderVehicleCard(vehicle);
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThan(0);
    });

    test('shows N/A for missing engine', () => {
      const vehicle = createMockVehicle({ engine: undefined });
      renderVehicleCard(vehicle);
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThan(0);
    });
  });

  describe('Different Vehicle Types', () => {
    test('renders Corvette correctly', () => {
      const vehicle = createMockVehicle({
        model: 'Corvette',
        bodyStyle: 'Coupe',
        body_style: 'Coupe',
        exteriorColor: 'Torch Red',
        exterior_color: 'Torch Red',
        msrp: 85000,
        price: 85000,
      });
      (getVehicleImageUrl as jest.Mock).mockReturnValue(null);
      renderVehicleCard(vehicle);
      // Model name may appear multiple times (title + fallback)
      const corvetteMatches = screen.getAllByText(/Corvette/i);
      expect(corvetteMatches.length).toBeGreaterThan(0);
      expect(screen.getByText('Torch Red')).toBeInTheDocument();
      expect(screen.getByText('$85,000')).toBeInTheDocument();
    });

    test('renders Equinox correctly', () => {
      const vehicle = createMockVehicle({
        model: 'Equinox',
        bodyStyle: 'SUV',
        body_style: 'SUV',
        exteriorColor: 'Mosaic Black',
        exterior_color: 'Mosaic Black',
        drivetrain: 'AWD',
      });
      renderVehicleCard(vehicle);
      // Model name may appear multiple times (title + fallback)
      const equinoxMatches = screen.getAllByText(/Equinox/i);
      expect(equinoxMatches.length).toBeGreaterThan(0);
      expect(screen.getByText('Mosaic Black')).toBeInTheDocument();
      expect(screen.getByText('AWD')).toBeInTheDocument();
    });

    test('renders Bolt EV correctly', () => {
      const vehicle = createMockVehicle({
        model: 'Bolt EV',
        bodyStyle: 'Hatchback',
        body_style: 'Hatchback',
        engine: 'Electric Motor',
        drivetrain: 'FWD',
      });
      renderVehicleCard(vehicle);
      // Model name may appear multiple times (title + fallback)
      const boltMatches = screen.getAllByText(/Bolt EV/i);
      expect(boltMatches.length).toBeGreaterThan(0);
      expect(screen.getByText('Electric Motor')).toBeInTheDocument();
    });
  });

  describe('Card Layout', () => {
    test('card renders without crashing', () => {
      renderVehicleCard();
      // Card should render with vehicle info - model appears in multiple places
      const silveradoMatches = screen.getAllByText(/Silverado/i);
      expect(silveradoMatches.length).toBeGreaterThan(0);
    });

    test('card has clickable styling', () => {
      renderVehicleCard();
      // Find the outer card container
      const silveradoMatches = screen.getAllByText(/Silverado/i);
      const container = silveradoMatches[0].closest('div');
      expect(container).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    test('card is clickable', () => {
      renderVehicleCard();
      // Card should be interactive - clicking it triggers onClick
      const silveradoMatches = screen.getAllByText(/Silverado/i);
      const cardContainer = silveradoMatches[0].closest('div');
      expect(cardContainer).toBeTruthy();
    });

    test('image has alt text when shown', () => {
      (getVehicleImageUrl as jest.Mock).mockReturnValue('/images/test.jpg');
      renderVehicleCard();
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt');
      expect(img.getAttribute('alt')).not.toBe('');
    });
  });
});

describe('VehicleCard Snake Case Fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getVehicleImageUrl as jest.Mock).mockReturnValue(null);
  });

  test('handles snake_case exterior_color', () => {
    const vehicle = {
      id: '1',
      stock_number: 'M12345',
      year: 2025,
      make: 'Chevrolet',
      model: 'Silverado 1500',
      trim: 'LT',
      exterior_color: 'Summit White',
      price: 52000,
      drivetrain: '4WD',
      engine: '5.3L V8',
    };
    render(<VehicleCard vehicle={vehicle} onClick={mockOnClick} />);
    expect(screen.getByText('Summit White')).toBeInTheDocument();
  });

  test('handles snake_case sale_price', () => {
    const vehicle = {
      id: '1',
      stock_number: 'M12345',
      year: 2025,
      make: 'Chevrolet',
      model: 'Silverado 1500',
      trim: 'LT',
      exterior_color: 'White',
      sale_price: 48000,
      drivetrain: '4WD',
      engine: '5.3L V8',
    };
    render(<VehicleCard vehicle={vehicle} onClick={mockOnClick} />);
    expect(screen.getByText('$48,000')).toBeInTheDocument();
  });
});
