import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VirtualTestDrive from '../components/VirtualTestDrive';

// Mock props
const mockNavigateTo = jest.fn();
const mockUpdateCustomerData = jest.fn();

const mockVehicle = {
  id: '1',
  stockNumber: 'STK001',
  stock_number: 'STK001',
  year: 2025,
  make: 'Chevrolet',
  model: 'Equinox',
  trim: 'RS AWD',
  exteriorColor: 'Radiant Red',
  exterior_color: 'Radiant Red',
  msrp: 34000,
  salePrice: 32000,
};

const mockCustomerData = {
  selectedVehicle: mockVehicle,
};

const renderVirtualTestDrive = (props: { customerData?: Record<string, unknown> } = {}) => {
  return render(
    <VirtualTestDrive
      navigateTo={mockNavigateTo}
      updateCustomerData={mockUpdateCustomerData}
      customerData={{ ...mockCustomerData, ...props.customerData }}
      resetJourney={jest.fn()}
      {...props}
    />
  );
};

describe('VirtualTestDrive Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component with vehicle info', () => {
      renderVirtualTestDrive();
      
      expect(screen.getByText('Virtual Experience')).toBeInTheDocument();
      expect(screen.getByText(/2025 Chevrolet Equinox RS AWD/)).toBeInTheDocument();
    });

    it('displays vehicle price', () => {
      renderVirtualTestDrive();
      
      expect(screen.getByText('$32,000')).toBeInTheDocument();
    });

    it('displays stock number', () => {
      renderVirtualTestDrive();
      
      expect(screen.getByText('Stock #STK001')).toBeInTheDocument();
    });

    it('renders all video category tabs', () => {
      renderVirtualTestDrive();
      
      // Use getAllByText since some text appears multiple times
      expect(screen.getAllByText('360° Walkaround').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Interior Tour').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Tech & Features').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Test Drive').length).toBeGreaterThan(0);
      expect(screen.getAllByText('vs Competition').length).toBeGreaterThan(0);
    });

    it('renders back button', () => {
      renderVirtualTestDrive();
      
      expect(screen.getByText('Back to Details')).toBeInTheDocument();
    });
  });

  describe('Category Selection', () => {
    it('selects walkaround category by default', () => {
      renderVirtualTestDrive();
      
      // The description for walkaround should be visible
      expect(screen.getByText('Full exterior tour showing every angle')).toBeInTheDocument();
    });

    it('changes category when Interior Tour is clicked', () => {
      renderVirtualTestDrive();
      
      // Click the first Interior Tour element (the tab)
      const interiorTabs = screen.getAllByText('Interior Tour');
      fireEvent.click(interiorTabs[0]);
      
      expect(screen.getByText('Detailed cabin walkthrough and features')).toBeInTheDocument();
    });

    it('changes category when Tech & Features is clicked', () => {
      renderVirtualTestDrive();
      
      const techTabs = screen.getAllByText('Tech & Features');
      fireEvent.click(techTabs[0]);
      
      expect(screen.getByText('Technology, safety & convenience features')).toBeInTheDocument();
    });

    it('changes category when Test Drive is clicked', () => {
      renderVirtualTestDrive();
      
      const driveTabs = screen.getAllByText('Test Drive');
      fireEvent.click(driveTabs[0]);
      
      expect(screen.getByText('Real driving footage and performance')).toBeInTheDocument();
    });

    it('changes category when vs Competition is clicked', () => {
      renderVirtualTestDrive();
      
      const compTabs = screen.getAllByText('vs Competition');
      fireEvent.click(compTabs[0]);
      
      expect(screen.getByText('How it stacks up against competitors')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates back to vehicle detail when back button is clicked', () => {
      renderVirtualTestDrive();
      
      fireEvent.click(screen.getByText('Back to Details'));
      
      expect(mockNavigateTo).toHaveBeenCalledWith('vehicleDetail');
    });

    it('navigates to vehicle detail when See It In Person is clicked', () => {
      renderVirtualTestDrive();
      
      fireEvent.click(screen.getByText('See It In Person'));
      
      expect(mockNavigateTo).toHaveBeenCalledWith('vehicleDetail');
    });

    it('navigates to vehicle comparison when Compare Vehicles is clicked', () => {
      renderVirtualTestDrive();
      
      fireEvent.click(screen.getByText('Compare Vehicles'));
      
      expect(mockNavigateTo).toHaveBeenCalledWith('vehicleComparison');
    });
  });

  describe('Model-specific Content', () => {
    it('displays Equinox competitors', () => {
      renderVirtualTestDrive();
      
      expect(screen.getByText('Honda CR-V')).toBeInTheDocument();
      expect(screen.getByText('Toyota RAV4')).toBeInTheDocument();
      expect(screen.getByText('Ford Escape')).toBeInTheDocument();
    });

    it('displays Equinox category keywords', () => {
      renderVirtualTestDrive();
      
      expect(screen.getByText('compact SUV')).toBeInTheDocument();
      expect(screen.getByText('crossover')).toBeInTheDocument();
      expect(screen.getByText('family SUV')).toBeInTheDocument();
    });

    it('displays different competitors for Silverado', () => {
      const silveradoVehicle = {
        ...mockVehicle,
        model: 'Silverado 1500',
        trim: 'LT',
      };
      
      renderVirtualTestDrive({
        customerData: { selectedVehicle: silveradoVehicle },
      });
      
      // Use flexible text matching for competitors
      expect(screen.getByText((content, element) => 
        element?.tagName.toLowerCase() === 'span' && content === 'Ford F-150'
      )).toBeInTheDocument();
      expect(screen.getByText((content, element) => 
        element?.tagName.toLowerCase() === 'span' && content === 'Ram 1500'
      )).toBeInTheDocument();
      expect(screen.getByText((content, element) => 
        element?.tagName.toLowerCase() === 'span' && content === 'Toyota Tundra'
      )).toBeInTheDocument();
    });

    it('displays Tahoe competitors', () => {
      const tahoeVehicle = {
        ...mockVehicle,
        model: 'Tahoe',
        trim: 'Z71',
      };
      
      renderVirtualTestDrive({
        customerData: { selectedVehicle: tahoeVehicle },
      });
      
      expect(screen.getByText((content, element) => 
        element?.tagName.toLowerCase() === 'span' && content === 'Ford Expedition'
      )).toBeInTheDocument();
      expect(screen.getByText((content, element) => 
        element?.tagName.toLowerCase() === 'span' && content === 'Toyota Sequoia'
      )).toBeInTheDocument();
    });
  });

  describe('Suggested Searches', () => {
    it('renders suggested search links', () => {
      renderVirtualTestDrive();
      
      expect(screen.getByText('Owner Reviews')).toBeInTheDocument();
      expect(screen.getByText('Known Issues')).toBeInTheDocument();
      expect(screen.getByText('Off-Road Capability')).toBeInTheDocument();
      expect(screen.getByText('Towing & Hauling')).toBeInTheDocument();
    });

    it('suggested search links have correct href format', () => {
      renderVirtualTestDrive();
      
      const ownerReviewsLink = screen.getByText('Owner Reviews');
      expect(ownerReviewsLink).toHaveAttribute('href');
      expect(ownerReviewsLink.getAttribute('href')).toContain('youtube.com');
      expect(ownerReviewsLink.getAttribute('href')).toContain('owner%20review');
    });
  });

  describe('YouTube Integration', () => {
    it('renders YouTube iframe', () => {
      renderVirtualTestDrive();
      
      const iframe = document.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
    });

    it('iframe has correct title based on category and vehicle', () => {
      renderVirtualTestDrive();
      
      const iframe = document.querySelector('iframe');
      expect(iframe).toHaveAttribute('title', '360° Walkaround - 2025 Chevrolet Equinox');
    });

    it('iframe src contains search query with vehicle info', () => {
      renderVirtualTestDrive();
      
      const iframe = document.querySelector('iframe');
      const src = iframe?.getAttribute('src') || '';
      
      expect(src).toContain('youtube.com');
      expect(src).toContain('2025');
      expect(src).toContain('Chevrolet');
      expect(src).toContain('Equinox');
    });

    it('More Videos link opens YouTube search', () => {
      renderVirtualTestDrive();
      
      const moreVideosLink = screen.getByText('More Videos');
      expect(moreVideosLink).toHaveAttribute('target', '_blank');
      expect(moreVideosLink).toHaveAttribute('href');
      expect(moreVideosLink.getAttribute('href')).toContain('youtube.com/results');
    });
  });

  describe('Vehicle Card', () => {
    it('displays vehicle name in sidebar', () => {
      renderVirtualTestDrive();
      
      // There are multiple instances, find in sidebar context
      const vehicleNames = screen.getAllByText('2025 Chevrolet Equinox');
      expect(vehicleNames.length).toBeGreaterThan(0);
    });

    it('displays trim in sidebar', () => {
      renderVirtualTestDrive();
      
      const trims = screen.getAllByText('RS AWD');
      expect(trims.length).toBeGreaterThan(0);
    });

    it('displays exterior color in sidebar', () => {
      renderVirtualTestDrive();
      
      const colors = screen.getAllByText('Radiant Red');
      expect(colors.length).toBeGreaterThan(0);
    });
  });

  describe('Footer Tips', () => {
    it('displays video source disclaimer', () => {
      renderVirtualTestDrive();
      
      expect(screen.getByText(/Videos are sourced from YouTube/)).toBeInTheDocument();
    });

    it('displays sales consultant availability message', () => {
      renderVirtualTestDrive();
      
      expect(screen.getByText(/sales consultant is available/)).toBeInTheDocument();
    });
  });

  describe('Default Vehicle Handling', () => {
    it('renders with demo vehicle when no vehicle selected', () => {
      render(
        <VirtualTestDrive
          navigateTo={mockNavigateTo}
          updateCustomerData={mockUpdateCustomerData}
          customerData={{}}
          resetJourney={jest.fn()}
        />
      );
      
      // Should still render with default/demo vehicle
      expect(screen.getByText('Virtual Experience')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('all category tabs are buttons', () => {
      renderVirtualTestDrive();
      
      // Use getAllByText since text appears in both tab and description
      const walkaroundElements = screen.getAllByText('360° Walkaround');
      const walkaroundTab = walkaroundElements.find(el => el.closest('button'));
      expect(walkaroundTab?.closest('button')).toBeInTheDocument();
    });

    it('CTA buttons are accessible', () => {
      renderVirtualTestDrive();
      
      expect(screen.getByText('See It In Person').closest('button')).toBeInTheDocument();
      expect(screen.getByText('Compare Vehicles').closest('button')).toBeInTheDocument();
    });

    it('external links open in new tab', () => {
      renderVirtualTestDrive();
      
      const externalLinks = screen.getAllByRole('link');
      externalLinks.forEach(link => {
        if (link.getAttribute('href')?.includes('youtube.com')) {
          expect(link).toHaveAttribute('target', '_blank');
          expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        }
      });
    });
  });
});

describe('VirtualTestDrive Model Hints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testModels = [
    { model: 'Blazer', competitors: ['Ford Edge', 'Hyundai Santa Fe'] },
    { model: 'Traverse', competitors: ['Honda Pilot', 'Toyota Highlander'] },
    { model: 'Trax', competitors: ['Honda HR-V', 'Toyota Corolla Cross'] },
    { model: 'Colorado', competitors: ['Ford Ranger', 'Toyota Tacoma'] },
  ];

  testModels.forEach(({ model, competitors }) => {
    it(`displays correct competitors for ${model}`, () => {
      const vehicle = {
        ...mockVehicle,
        model,
      };
      
      render(
        <VirtualTestDrive
          navigateTo={mockNavigateTo}
          updateCustomerData={mockUpdateCustomerData}
          customerData={{ selectedVehicle: vehicle }}
          resetJourney={jest.fn()}
        />
      );
      
      competitors.forEach(competitor => {
        expect(screen.getByText(competitor)).toBeInTheDocument();
      });
    });
  });
});
