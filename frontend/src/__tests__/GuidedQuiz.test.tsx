import { render, screen, fireEvent, waitFor, RenderResult } from '@testing-library/react';
import GuidedQuiz from '../components/GuidedQuiz';

const mockNavigateTo = jest.fn();
const mockUpdateCustomerData = jest.fn();
const defaultCustomerData = {};

interface RenderProps {
  customerData?: Record<string, unknown>;
}

const renderGuidedQuiz = (props: RenderProps = {}): RenderResult => {
  return render(
    <GuidedQuiz
      navigateTo={mockNavigateTo}
      updateCustomerData={mockUpdateCustomerData}
      customerData={defaultCustomerData}
      {...props}
    />
  );
};

describe('GuidedQuiz Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    test('renders first question on mount', () => {
      renderGuidedQuiz();
      expect(screen.getByText(/What will you primarily use this vehicle for/i)).toBeInTheDocument();
    });

    test('displays progress indicator as Question 1', () => {
      renderGuidedQuiz();
      expect(screen.getByText(/Question 1 of/i)).toBeInTheDocument();
    });

    test('renders all primary use options', () => {
      renderGuidedQuiz();
      expect(screen.getByText('Daily Commute')).toBeInTheDocument();
      expect(screen.getByText('Family Hauling')).toBeInTheDocument();
      expect(screen.getByText('Work & Towing')).toBeInTheDocument();
      expect(screen.getByText('Weekend Fun')).toBeInTheDocument();
      expect(screen.getByText('All of the Above')).toBeInTheDocument();
    });

    test('Previous button is disabled on first question', () => {
      renderGuidedQuiz();
      const prevButton = screen.getByText('Previous');
      expect(prevButton).toBeDisabled();
    });
  });

  describe('Question Navigation', () => {
    test('selecting an option advances to next question', async () => {
      renderGuidedQuiz();
      
      fireEvent.click(screen.getByText('Daily Commute'));
      
      await waitFor(() => {
        expect(screen.getByText(/How many passengers/i)).toBeInTheDocument();
      });
    });

    test('Previous button navigates back', async () => {
      renderGuidedQuiz();
      
      fireEvent.click(screen.getByText('Daily Commute'));
      
      await waitFor(() => {
        expect(screen.getByText(/How many passengers/i)).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Previous'));
      
      await waitFor(() => {
        expect(screen.getByText(/What will you primarily use/i)).toBeInTheDocument();
      });
    });

    test('progress bar updates with each question', async () => {
      renderGuidedQuiz();
      
      expect(screen.getByText(/Question 1 of 10/i)).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Daily Commute'));
      
      await waitFor(() => {
        expect(screen.getByText(/Question 2 of 10/i)).toBeInTheDocument();
      });
    });
  });

  describe('Option Selection', () => {
    test('selected option shows visual feedback', () => {
      renderGuidedQuiz();
      
      const option = screen.getByText('Daily Commute').closest('button') as HTMLButtonElement;
      fireEvent.click(option);
      
      expect(option).toHaveStyle({ borderColor: '#22c55e' });
    });
  });

  describe('Lease vs Finance Help Modal', () => {
    const navigateToPaymentQuestion = async () => {
      renderGuidedQuiz();
      
      // Q1: Primary Use
      fireEvent.click(screen.getByText('Daily Commute'));
      await waitFor(() => {
        expect(screen.getByText(/How many passengers/i)).toBeInTheDocument();
      });
      
      // Q2: Passengers
      fireEvent.click(screen.getByText('Just Me'));
      await waitFor(() => {
        expect(screen.getByText(/How many miles/i)).toBeInTheDocument();
      });
      
      // Q3: Mileage
      fireEvent.click(screen.getByText('Under 10,000'));
      await waitFor(() => {
        expect(screen.getByText(/Do you have a vehicle to trade/i)).toBeInTheDocument();
      });
      
      // Q4: Trade-in
      fireEvent.click(screen.getByText('No'));
      await waitFor(() => {
        expect(screen.getByText(/lease or finance/i)).toBeInTheDocument();
      });
    };

    test('selecting "Help Me Decide" shows lease comparison modal', async () => {
      await navigateToPaymentQuestion();
      
      fireEvent.click(screen.getByText('Help Me Decide'));
      
      await waitFor(() => {
        expect(screen.getByText(/Lease vs. Finance/i)).toBeInTheDocument();
      });
    });

    test('lease modal shows AI recommendation based on mileage', async () => {
      await navigateToPaymentQuestion();
      
      fireEvent.click(screen.getByText('Help Me Decide'));
      
      await waitFor(() => {
        expect(screen.getByText(/AI Recommendation/i)).toBeInTheDocument();
      });
    });

    test('clicking "I\'ll Lease" closes modal and continues', async () => {
      await navigateToPaymentQuestion();
      
      fireEvent.click(screen.getByText('Help Me Decide'));
      
      await waitFor(() => {
        expect(screen.getByText(/Lease vs. Finance/i)).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText("I'll Lease"));
      
      await waitFor(() => {
        expect(screen.getByText(/monthly payment/i)).toBeInTheDocument();
      });
    });

    test('back to quiz button returns to question', async () => {
      await navigateToPaymentQuestion();
      
      fireEvent.click(screen.getByText('Help Me Decide'));
      
      await waitFor(() => {
        expect(screen.getByText('← Back to question')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('← Back to question'));
      
      await waitFor(() => {
        expect(screen.getByText(/lease or finance/i)).toBeInTheDocument();
      });
    });
  });
});

describe('GuidedQuiz Accessibility', () => {
  test('options are keyboard accessible', () => {
    renderGuidedQuiz();
    
    const option = screen.getByText('Daily Commute').closest('button') as HTMLButtonElement;
    expect(option.tagName).toBe('BUTTON');
  });

  test('navigation buttons are focusable', () => {
    renderGuidedQuiz();
    
    const prevButton = screen.getByText('Previous') as HTMLButtonElement;
    expect(prevButton.tagName).toBe('BUTTON');
  });
});
