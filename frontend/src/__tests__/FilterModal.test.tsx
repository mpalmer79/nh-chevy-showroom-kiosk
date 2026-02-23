import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FilterModal from '../components/FilterModal';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: {
      div: React.forwardRef(({ children, ...props }: any, ref: any) => (
        <div ref={ref} {...props}>
          {children}
        </div>
      )),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock props
const mockOnClose = jest.fn();
const mockOnApply = jest.fn();

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  onApply: mockOnApply,
  currentFilters: {},
};

const renderFilterModal = (props = {}) => {
  return render(<FilterModal {...defaultProps} {...props} />);
};

describe('FilterModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================
  describe('Rendering', () => {
    test('renders when isOpen is true', () => {
      renderFilterModal();
      expect(screen.getByText('Filter Vehicles')).toBeInTheDocument();
    });

    test('does not render when isOpen is false', () => {
      renderFilterModal({ isOpen: false });
      expect(screen.queryByText('Filter Vehicles')).not.toBeInTheDocument();
    });

    test('displays close button', () => {
      renderFilterModal();
      expect(screen.getByText('\u2715')).toBeInTheDocument();
    });

    test('displays "Apply Filters" button', () => {
      renderFilterModal();
      expect(screen.getByText('Apply Filters')).toBeInTheDocument();
    });

    test('displays "Clear All" button', () => {
      renderFilterModal();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Body Style Section Tests
  // ===========================================================================
  describe('Body Style Section', () => {
    test('displays Body Style section title', () => {
      renderFilterModal();
      expect(screen.getByText('Body Style')).toBeInTheDocument();
    });

    test('displays all body style options', () => {
      renderFilterModal();
      expect(screen.getByText('All Types')).toBeInTheDocument();
      expect(screen.getByText('SUV')).toBeInTheDocument();
      expect(screen.getByText('Truck')).toBeInTheDocument();
      expect(screen.getByText('Sedan')).toBeInTheDocument();
      expect(screen.getByText('Coupe')).toBeInTheDocument();
      expect(screen.getByText('Van')).toBeInTheDocument();
      expect(screen.getByText('Convertible')).toBeInTheDocument();
    });

    test('clicking a body style selects it', () => {
      renderFilterModal();
      const suvButton = screen.getByText('SUV').closest('button');
      fireEvent.click(suvButton!);

      // Apply and check the filter
      fireEvent.click(screen.getByText('Apply Filters'));
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({ bodyStyle: 'SUV' })
      );
    });

    test('clicking "All Types" clears body style filter', () => {
      renderFilterModal({ currentFilters: { bodyStyle: 'SUV' } });
      const allTypesButton = screen.getByText('All Types').closest('button');
      fireEvent.click(allTypesButton!);

      fireEvent.click(screen.getByText('Apply Filters'));
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({ bodyStyle: '' })
      );
    });
  });

  // ===========================================================================
  // Fuel Type Section Tests
  // ===========================================================================
  describe('Fuel Type Section', () => {
    test('displays Fuel Type section title', () => {
      renderFilterModal();
      expect(screen.getByText('Fuel Type')).toBeInTheDocument();
    });

    test('displays all fuel type options', () => {
      renderFilterModal();
      expect(screen.getByText('All Fuel Types')).toBeInTheDocument();
      expect(screen.getByText('Gasoline')).toBeInTheDocument();
      expect(screen.getByText('Electric')).toBeInTheDocument();
      expect(screen.getByText('Hybrid')).toBeInTheDocument();
    });

    test('clicking Electric selects it', () => {
      renderFilterModal();
      const electricButton = screen.getByText('Electric').closest('button');
      fireEvent.click(electricButton!);

      fireEvent.click(screen.getByText('Apply Filters'));
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({ fuelType: 'Electric' })
      );
    });
  });

  // ===========================================================================
  // Price Range Section Tests
  // ===========================================================================
  describe('Price Range Section', () => {
    test('displays Price Range section title', () => {
      renderFilterModal();
      expect(screen.getByText('Price Range')).toBeInTheDocument();
    });

    test('displays all price range options', () => {
      renderFilterModal();
      expect(screen.getByText('Any Price')).toBeInTheDocument();
      expect(screen.getByText('Under $40,000')).toBeInTheDocument();
      expect(screen.getByText('$40,000 - $60,000')).toBeInTheDocument();
      expect(screen.getByText('$60,000 - $80,000')).toBeInTheDocument();
      expect(screen.getByText('Over $80,000')).toBeInTheDocument();
    });

    test('selecting "Under $40,000" sets correct min/max prices', () => {
      renderFilterModal();
      const under40Button = screen.getByText('Under $40,000');
      fireEvent.click(under40Button);

      fireEvent.click(screen.getByText('Apply Filters'));
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({
          priceRange: 'under40',
          minPrice: null,
          maxPrice: 40000,
        })
      );
    });

    test('selecting "$40,000 - $60,000" sets correct min/max', () => {
      renderFilterModal();
      fireEvent.click(screen.getByText('$40,000 - $60,000'));

      fireEvent.click(screen.getByText('Apply Filters'));
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({
          priceRange: '40to60',
          minPrice: 40000,
          maxPrice: 60000,
        })
      );
    });

    test('selecting "$60,000 - $80,000" sets correct min/max', () => {
      renderFilterModal();
      fireEvent.click(screen.getByText('$60,000 - $80,000'));

      fireEvent.click(screen.getByText('Apply Filters'));
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({
          priceRange: '60to80',
          minPrice: 60000,
          maxPrice: 80000,
        })
      );
    });

    test('selecting "Over $80,000" sets correct min/max', () => {
      renderFilterModal();
      fireEvent.click(screen.getByText('Over $80,000'));

      fireEvent.click(screen.getByText('Apply Filters'));
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({
          priceRange: 'over80',
          minPrice: 80000,
          maxPrice: null,
        })
      );
    });

    test('selecting "Any Price" clears price range', () => {
      renderFilterModal({ currentFilters: { priceRange: 'under40' } });
      fireEvent.click(screen.getByText('Any Price'));

      fireEvent.click(screen.getByText('Apply Filters'));
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({
          priceRange: '',
          minPrice: null,
          maxPrice: null,
        })
      );
    });
  });

  // ===========================================================================
  // Drivetrain Section Tests
  // ===========================================================================
  describe('Drivetrain Section', () => {
    test('displays Drivetrain section title', () => {
      renderFilterModal();
      expect(screen.getByText('Drivetrain')).toBeInTheDocument();
    });

    test('displays all drivetrain options', () => {
      renderFilterModal();
      expect(screen.getByText('All Drivetrains')).toBeInTheDocument();
      expect(screen.getByText('4WD')).toBeInTheDocument();
      expect(screen.getByText('AWD')).toBeInTheDocument();
      expect(screen.getByText('FWD')).toBeInTheDocument();
      expect(screen.getByText('RWD')).toBeInTheDocument();
    });

    test('clicking 4WD selects it', () => {
      renderFilterModal();
      fireEvent.click(screen.getByText('4WD'));

      fireEvent.click(screen.getByText('Apply Filters'));
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({ drivetrain: '4WD' })
      );
    });
  });

  // ===========================================================================
  // Combined Filter Tests
  // ===========================================================================
  describe('Combined Filters', () => {
    test('can select multiple filters at once', () => {
      renderFilterModal();

      // Select SUV
      fireEvent.click(screen.getByText('SUV').closest('button')!);
      // Select Electric
      fireEvent.click(screen.getByText('Electric').closest('button')!);
      // Select price range
      fireEvent.click(screen.getByText('$40,000 - $60,000'));
      // Select AWD
      fireEvent.click(screen.getByText('AWD'));

      fireEvent.click(screen.getByText('Apply Filters'));
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({
          bodyStyle: 'SUV',
          fuelType: 'Electric',
          priceRange: '40to60',
          drivetrain: 'AWD',
          minPrice: 40000,
          maxPrice: 60000,
        })
      );
    });
  });

  // ===========================================================================
  // Clear All Tests
  // ===========================================================================
  describe('Clear All', () => {
    test('clicking "Clear All" resets all filters', () => {
      renderFilterModal({
        currentFilters: {
          bodyStyle: 'SUV',
          fuelType: 'Electric',
          priceRange: 'under40',
          drivetrain: '4WD',
        },
      });

      fireEvent.click(screen.getByText('Clear All'));

      // After clearing and applying
      fireEvent.click(screen.getByText('Apply Filters'));
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({
          bodyStyle: '',
          fuelType: '',
          priceRange: '',
          drivetrain: '',
        })
      );
    });
  });

  // ===========================================================================
  // Close Behavior Tests
  // ===========================================================================
  describe('Close Behavior', () => {
    test('clicking close button calls onClose', () => {
      renderFilterModal();
      fireEvent.click(screen.getByText('\u2715'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('clicking overlay calls onClose', () => {
      const { container } = renderFilterModal();
      // The overlay is the outermost div (rendered by the motion.div mock)
      // It has onClick={onClose}, the inner modal div has stopPropagation
      const overlay = container.firstElementChild;
      if (overlay) {
        fireEvent.click(overlay);
      }
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('Apply Filters calls both onApply and onClose', () => {
      renderFilterModal();
      fireEvent.click(screen.getByText('Apply Filters'));

      expect(mockOnApply).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Pre-filled Filter Tests
  // ===========================================================================
  describe('Pre-filled Filters', () => {
    test('initializes with currentFilters values', () => {
      renderFilterModal({
        currentFilters: {
          bodyStyle: 'Truck',
          fuelType: 'Gasoline',
          drivetrain: '4WD',
        },
      });

      // Apply without changing anything to verify initial state
      fireEvent.click(screen.getByText('Apply Filters'));
      expect(mockOnApply).toHaveBeenCalledWith(
        expect.objectContaining({
          bodyStyle: 'Truck',
          fuelType: 'Gasoline',
          drivetrain: '4WD',
        })
      );
    });
  });
});
