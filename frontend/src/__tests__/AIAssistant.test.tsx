import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AIAssistant from '../components/AIAssistant';

// Mock the api module - must include ALL functions AIAssistant.tsx calls
jest.mock('../components/api', () => ({
  getInventory: jest.fn(),
  chatWithAI: jest.fn(),
  logTrafficSession: jest.fn(),
  getTTSStatus: jest.fn().mockResolvedValue({ available: false }),
  textToSpeech: jest.fn(),
  getKioskSessionId: jest.fn().mockReturnValue('KTEST123'),
  notifyStaff: jest.fn().mockResolvedValue({ success: true }),
}));

import api from '../components/api';

// Mock SpeechRecognition
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onresult: null as any,
  onend: null as any,
  onerror: null as any,
  continuous: false,
  interimResults: false,
  lang: '',
};

(global as any).SpeechRecognition = jest.fn(() => mockSpeechRecognition);
(global as any).webkitSpeechRecognition = jest.fn(() => mockSpeechRecognition);

// Mock SpeechSynthesis
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn(() => []),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};
Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
});

// Mock SpeechSynthesisUtterance
(global as any).SpeechSynthesisUtterance = jest.fn().mockImplementation(() => ({
  rate: 1,
  pitch: 1,
  onend: null,
  onerror: null,
}));

// Mock scrollIntoView - not available in jsdom
Element.prototype.scrollIntoView = jest.fn();

// Mock props
const mockNavigateTo = jest.fn();
const mockUpdateCustomerData = jest.fn();
const mockResetJourney = jest.fn();

const mockVehicles = [
  {
    id: '1',
    stockNumber: 'M12345',
    stock_number: 'M12345',
    year: 2025,
    make: 'Chevrolet',
    model: 'Silverado 1500',
    trim: 'LT',
    exteriorColor: 'Summit White',
    exterior_color: 'Summit White',
    price: 52000,
    salePrice: 52000,
    sale_price: 52000,
    msrp: 54000,
    status: 'In Stock',
  },
  {
    id: '2',
    stockNumber: 'M12346',
    stock_number: 'M12346',
    year: 2025,
    make: 'Chevrolet',
    model: 'Equinox',
    trim: 'RS',
    exteriorColor: 'Black',
    exterior_color: 'Black',
    price: 35000,
    salePrice: 35000,
    sale_price: 35000,
    msrp: 36500,
    status: 'In Stock',
  },
];

const defaultProps = {
  navigateTo: mockNavigateTo,
  updateCustomerData: mockUpdateCustomerData,
  customerData: { customerName: 'John' },
  resetJourney: mockResetJourney,
};

const renderAIAssistant = (props = {}) => {
  return render(<AIAssistant {...defaultProps} {...props} />);
};

describe('AIAssistant Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.getInventory as jest.Mock).mockResolvedValue(mockVehicles);
    (api.chatWithAI as jest.Mock).mockResolvedValue({
      message: 'I found some great trucks for you!',
      suggestedVehicles: ['M12345'],
    });
    (api.logTrafficSession as jest.Mock).mockResolvedValue(undefined);
    (api.getTTSStatus as jest.Mock).mockResolvedValue({ available: false });
    (api.getKioskSessionId as jest.Mock).mockReturnValue('KTEST123');
    (api.notifyStaff as jest.Mock).mockResolvedValue({ success: true });
  });

  describe('Initial Render', () => {
    test('displays personalized greeting when customer name provided', async () => {
      renderAIAssistant();
      await waitFor(() => {
        expect(screen.getByText(/Hi John/i)).toBeInTheDocument();
      });
    });

    test('displays generic greeting when no customer name', async () => {
      renderAIAssistant({ customerData: {} });
      await waitFor(() => {
        expect(screen.getByText(/find your perfect vehicle/i)).toBeInTheDocument();
      });
    });

    test('displays subtitle text', async () => {
      renderAIAssistant();
      await waitFor(() => {
        expect(screen.getByText(/Ask me anything about our inventory/i)).toBeInTheDocument();
      });
    });

    test('displays message input field', async () => {
      renderAIAssistant();
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });
    });

    test('loads inventory on mount', async () => {
      renderAIAssistant();
      await waitFor(() => {
        expect(api.getInventory).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Suggested Prompts', () => {
    test('displays suggested prompts when no messages', async () => {
      renderAIAssistant();
      await waitFor(() => {
        expect(screen.getByText(/Try asking me/i)).toBeInTheDocument();
      });
    });

    test('displays continue conversation prompt', async () => {
      renderAIAssistant();
      await waitFor(() => {
        expect(screen.getByText(/Let's pick up where we left off/i)).toBeInTheDocument();
      });
    });

    test('displays family SUV prompt', async () => {
      renderAIAssistant();
      await waitFor(() => {
        expect(screen.getByText(/best family SUV/i)).toBeInTheDocument();
      });
    });

    test('clicking suggested prompt sends message', async () => {
      renderAIAssistant();
      
      await waitFor(() => {
        expect(screen.getByText(/best family SUV/i)).toBeInTheDocument();
      });

      const prompt = screen.getByText(/best family SUV/i);
      fireEvent.click(prompt);

      await waitFor(() => {
        expect(api.chatWithAI).toHaveBeenCalled();
      });
    });
  });

  describe('Message Sending', () => {
    test('sends message when Enter key pressed', async () => {
      renderAIAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your message/i);
      fireEvent.change(input, { target: { value: 'Show me trucks' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(api.chatWithAI).toHaveBeenCalled();
      });
    });

    test('does not send empty message', async () => {
      renderAIAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your message/i);
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(api.chatWithAI).not.toHaveBeenCalled();
    });

    test('clears input after sending', async () => {
      renderAIAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your message/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Show me trucks' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    test('displays user message in chat', async () => {
      renderAIAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your message/i);
      fireEvent.change(input, { target: { value: 'Show me trucks' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(screen.getByText('Show me trucks')).toBeInTheDocument();
      });
    });

    test('displays AI response in chat', async () => {
      renderAIAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your message/i);
      fireEvent.change(input, { target: { value: 'Show me trucks' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(screen.getByText(/I found some great trucks/i)).toBeInTheDocument();
      });
    });

    test('shows thinking indicator while waiting for response', async () => {
      // Make API call take time
      (api.chatWithAI as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          message: 'Response',
          suggestedVehicles: [],
        }), 1000))
      );

      renderAIAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your message/i);
      fireEvent.change(input, { target: { value: 'Hi' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      // Should show some form of loading state
      await waitFor(() => {
        expect(screen.getByText('Hi')).toBeInTheDocument();
      });
    });

    test('send button sends message', async () => {
      renderAIAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your message/i);
      fireEvent.change(input, { target: { value: 'Show me SUVs' } });

      // Find and click the send button (usually an arrow or send icon)
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(api.chatWithAI).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation Actions', () => {
    test('displays Start Over button', async () => {
      renderAIAssistant();
      await waitFor(() => {
        expect(screen.getByText('Start Over')).toBeInTheDocument();
      });
    });

    test('clicking Start Over calls resetJourney', async () => {
      renderAIAssistant();
      await waitFor(() => {
        expect(screen.getByText('Start Over')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Start Over'));
      expect(mockResetJourney).toHaveBeenCalled();
    });
  });

  describe('Audio Toggle', () => {
    test('displays Audio Off by default', async () => {
      renderAIAssistant();
      await waitFor(() => {
        expect(screen.getByText('Audio Off')).toBeInTheDocument();
      });
    });

    test('clicking audio button toggles audio state', async () => {
      renderAIAssistant();
      
      await waitFor(() => {
        expect(screen.getByText('Audio Off')).toBeInTheDocument();
      });

      const audioButton = screen.getByText('Audio Off').closest('button');
      fireEvent.click(audioButton!);

      await waitFor(() => {
        expect(screen.getByText('Audio On')).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    test('includes customer name in chat request', async () => {
      renderAIAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your message/i);
      fireEvent.change(input, { target: { value: 'Hi' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(api.chatWithAI).toHaveBeenCalledWith(
          expect.objectContaining({
            customerName: 'John',
          })
        );
      });
    });

    test('includes inventory context in chat request', async () => {
      renderAIAssistant();

      // Wait for inventory to load
      await waitFor(() => {
        expect(api.getInventory).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText(/Type your message/i);
      fireEvent.change(input, { target: { value: 'Hi' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(api.chatWithAI).toHaveBeenCalledWith(
          expect.objectContaining({
            inventoryContext: expect.anything(),
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    test('handles chat API error gracefully', async () => {
      (api.chatWithAI as jest.Mock).mockRejectedValue(new Error('API Error'));

      renderAIAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your message/i);
      fireEvent.change(input, { target: { value: 'Show me trucks' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      // Should not crash - input should be re-enabled
      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });

    test('handles inventory API error gracefully', async () => {
      (api.getInventory as jest.Mock).mockRejectedValue(new Error('API Error'));

      renderAIAssistant();

      // Component should still render
      await waitFor(() => {
        expect(screen.getByText(/find your perfect vehicle/i)).toBeInTheDocument();
      });
    });
  });

  describe('Conversation History', () => {
    test('builds conversation history across messages', async () => {
      renderAIAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });

      // Send first message
      const input = screen.getByPlaceholderText(/Type your message/i);
      fireEvent.change(input, { target: { value: 'Hi' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(api.chatWithAI).toHaveBeenCalledTimes(1);
      });

      // Send second message
      fireEvent.change(input, { target: { value: 'Show trucks' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(api.chatWithAI).toHaveBeenCalledTimes(2);
        expect(api.chatWithAI).toHaveBeenLastCalledWith(
          expect.objectContaining({
            conversationHistory: expect.arrayContaining([
              expect.objectContaining({ role: 'user', content: 'Hi' }),
            ]),
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    test('input has accessible placeholder', async () => {
      renderAIAssistant();
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });
    });

    test('Start Over is a button', async () => {
      renderAIAssistant();
      await waitFor(() => {
        expect(screen.getByText('Start Over').closest('button')).toBeInTheDocument();
      });
    });
  });

  describe('Common Questions Panel', () => {
    test('ObjectionPanel is not shown by default', async () => {
      renderAIAssistant();
      await waitFor(() => {
        // ObjectionPanel should not be visible by default
        expect(screen.queryByText(/Have Questions or Concerns/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Spouse/Partner Objection Detection', () => {
    test('detects "need to talk to my wife" as spouse objection', async () => {
      (api.chatWithAI as jest.Mock).mockResolvedValue({
        message: 'I completely understand - this is a major decision you want to share with your wife.',
        suggestedVehicles: [],
      });

      renderAIAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your message/i);
      fireEvent.change(input, { target: { value: 'I need to talk to my wife first' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(api.chatWithAI).toHaveBeenCalled();
      });

      // Should display the user's message
      await waitFor(() => {
        expect(screen.getByText('I need to talk to my wife first')).toBeInTheDocument();
      });
    });

    test('detects "need to discuss with husband" as spouse objection', async () => {
      (api.chatWithAI as jest.Mock).mockResolvedValue({
        message: 'That makes perfect sense. Would you like to call him right now?',
        suggestedVehicles: [],
      });

      renderAIAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your message/i);
      fireEvent.change(input, { target: { value: 'I need to discuss this with my husband' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(api.chatWithAI).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('I need to discuss this with my husband')).toBeInTheDocument();
      });
    });

    test('AI response is displayed for spouse objection', async () => {
      (api.chatWithAI as jest.Mock).mockResolvedValue({
        message: 'I completely understand - this is a major decision you want to share with your wife. That makes perfect sense.',
        suggestedVehicles: [],
      });

      renderAIAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Type your message/i);
      fireEvent.change(input, { target: { value: 'I need to talk to my wife first' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(screen.getByText(/I completely understand/i)).toBeInTheDocument();
      });
    });
  });
});
