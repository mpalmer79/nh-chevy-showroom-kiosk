import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../api';
import type { Vehicle, KioskComponentProps } from '../../types';
import type { Message, ExtractedData } from './types';
import { styles } from './styles';
import { INITIAL_EXTRACTED_DATA } from './constants';
import { useSpeechRecognition, useTextToSpeech, useDataExtraction } from './hooks';
import {
  Header,
  MessageBubble,
  SuggestionChips,
  ObjectionPanel,
  ChatInput,
  LoadingIndicator,
} from './components';
import DigitalWorksheet from '../DigitalWorksheet';

const AIAssistant: React.FC<KioskComponentProps> = ({ 
  navigateTo, 
  updateCustomerData, 
  customerData,
  resetJourney 
}) => {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inventory, setInventory] = useState<Vehicle[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData>(INITIAL_EXTRACTED_DATA);
  const [showObjectionPanel, setShowObjectionPanel] = useState(false);
  const [suggestedFollowups, setSuggestedFollowups] = useState<string[]>([]);
  
  // Digital Worksheet state
  const [activeWorksheetId, setActiveWorksheetId] = useState<string | null>(null);
  const [showWorksheet, setShowWorksheet] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendMessageRef = useRef<(content: string) => void>();

  // Get session ID for worksheet - use shared kiosk session to match chatWithAI
  const sessionId = customerData?.selectedSessionId || api.getKioskSessionId();

  // Custom hooks
  const { extractDataFromMessage, detectObjection, detectHoursQuery } = useDataExtraction();
  const { isSpeaking, ttsAvailable, speakText, stopSpeaking } = useTextToSpeech({ enabled: audioEnabled });
  const { isListening, toggleListening } = useSpeechRecognition({
    onResult: (transcript) => {
      setInputValue(transcript);
      setTimeout(() => sendMessageRef.current?.(transcript), 100);
    },
  });

  // Load inventory on mount
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const response = await api.getInventory({});
        const vehicles = Array.isArray(response) ? response : response.vehicles || [];
        setInventory(vehicles);
      } catch (error) {
        console.error('Failed to load inventory:', error);
      }
    };
    loadInventory();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Log chat history to traffic session
  useEffect(() => {
    if (messages.length === 0) return;
    
    const logChatHistory = async () => {
      try {
        // Convert messages to chat history format
        const chatHistory = messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp?.toISOString()
        }));
        
        await api.logTrafficSession({
          path: 'aiAssistant',
          currentStep: 'ai_chat',
          customerName: customerData?.customerName || undefined,
          chatHistory,
          actions: [`ai_chat_${messages.length}_messages`]
        });
      } catch (error) {
        // Don't throw on traffic log failures
        console.warn('Failed to log chat history:', error);
      }
    };
    
    logChatHistory();
  }, [messages, customerData?.customerName]);

  // Search inventory helper - PRESERVED with colorKeywords and modelKeywords maps
  const searchInventory = useCallback((query: string): Vehicle[] => {
    const lowerQuery = query.toLowerCase();
    
    // Color keywords mapping
    const colorKeywords: Record<string, string[]> = {
      'red': ['red', 'cherry', 'crimson', 'radiant'],
      'blue': ['blue', 'navy', 'glacier', 'lakeshore'],
      'black': ['black', 'onyx', 'midnight'],
      'white': ['white', 'summit', 'pearl', 'arctic'],
      'silver': ['silver', 'metallic', 'sterling'],
      'gray': ['gray', 'grey', 'graphite', 'shadow'],
      'green': ['green', 'evergreen'],
    };
    
    // Model keywords mapping
    const modelKeywords: Record<string, string[]> = {
      'silverado': ['silverado', 'truck', 'pickup'],
      'colorado': ['colorado', 'midsize truck'],
      'tahoe': ['tahoe', 'full size suv'],
      'suburban': ['suburban', 'large suv'],
      'traverse': ['traverse', 'family suv', '3 row'],
      'equinox': ['equinox', 'compact suv'],
      'blazer': ['blazer', 'sporty suv'],
      'trax': ['trax', 'small suv'],
      'trailblazer': ['trailblazer'],
    };

    let results = inventory.filter(vehicle => {
      const searchText = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim} ${vehicle.exteriorColor}`.toLowerCase();
      
      // Check for color matches
      for (const [colorKey, keywords] of Object.entries(colorKeywords)) {
        if (keywords.some(k => lowerQuery.includes(k))) {
          // Check if vehicle has any of the color keywords
          if (!keywords.some(k => searchText.includes(k)) && !searchText.includes(colorKey)) {
            return false;
          }
        }
      }
      
      // Check for model matches
      for (const [modelKey, keywords] of Object.entries(modelKeywords)) {
        if (keywords.some(k => lowerQuery.includes(k))) {
          if (searchText.includes(modelKey)) {
            return true;
          }
        }
      }
      
      // General search
      return lowerQuery.split(' ').some(word => 
        word.length > 2 && searchText.includes(word)
      );
    });

    return results.slice(0, 6);
  }, [inventory]);

  // Build inventory context for AI
  const buildInventoryContext = useCallback(() => {
    const models = Array.from(new Set(inventory.map(v => v.model)));
    const priceRange = inventory.length > 0 
      ? { min: Math.min(...inventory.map(v => v.price || 0)), max: Math.max(...inventory.map(v => v.price || 0)) }
      : { min: 0, max: 0 };
    
    return {
      totalVehicles: inventory.length,
      models: models.slice(0, 10),
      priceRange,
    };
  }, [inventory]);

  // Send message handler
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    stopSpeaking();

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    // Extract data from user message
    const newExtractedData = extractDataFromMessage(content, extractedData);
    setExtractedData(newExtractedData);
    
    // Detect objections
    const objectionResult = detectObjection(content);
    if (objectionResult.category) {
      setSuggestedFollowups(objectionResult.followups);
    } else {
      setSuggestedFollowups([]);
    }

    try {
      const response = await api.chatWithAI({
        message: content,
        inventoryContext: JSON.stringify(buildInventoryContext()),
        conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
        customerName: customerData?.customerName,
      });

      // Check if AI created a Digital Worksheet
      if (response.worksheet_id) {
        setActiveWorksheetId(response.worksheet_id);
        setShowWorksheet(true);
      }

      // Use vehicles from V3 API response if available, otherwise fall back to local search
      let matchingVehicles: Vehicle[] = [];
      
      if (response.vehicles && response.vehicles.length > 0) {
        // V3 API returned vehicles - use these (they're already budget-qualified)
        // Map from API format to frontend Vehicle format
        matchingVehicles = response.vehicles.map((v: any) => {
          // Find full vehicle data from inventory by stock number
          const fullVehicle = inventory.find(
            inv => (inv.stockNumber || inv.stock_number) === v.stock_number
          );
          return fullVehicle || {
            stockNumber: v.stock_number,
            stock_number: v.stock_number,
            model: v.model,
            price: v.price,
            salePrice: v.price,
          } as Vehicle;
        }).filter(Boolean);
      }
      
      // Fall back to local search only if V3 didn't return vehicles
      if (matchingVehicles.length === 0) {
        matchingVehicles = searchInventory(content);
      }
      
      const isHoursQuery = detectHoursQuery(content);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        vehicles: matchingVehicles.length > 0 ? matchingVehicles : undefined,
        showDealerInfo: isHoursQuery,
        timestamp: new Date(),
        worksheetId: response.worksheet_id, // Store worksheet ID in message if created
      };

      setMessages([...newMessages, assistantMessage]);
      speakText(response.message);
      
    } catch (error) {
      console.error('AI Chat error:', error);
      
      const matchingVehicles = searchInventory(content);
      
      // Detect if user is speaking Spanish
      const spanishPatterns = /español|busco|quiero|necesito|camioneta|carro|¿|á|é|í|ó|ú|ñ/i;
      const isSpanish = spanishPatterns.test(content);
      
      let fallbackContent: string;
      if (matchingVehicles.length > 0) {
        fallbackContent = isSpanish
          ? `¡Encontré ${matchingVehicles.length} vehículos que podrían ser lo que busca! Écheles un vistazo.`
          : `I found ${matchingVehicles.length} vehicles that might match what you're looking for! Take a look below.`;
      } else {
        fallbackContent = isSpanish
          ? `¡Estaré encantado de ayudarle a encontrar el vehículo perfecto! ¿Podría contarme más sobre lo que está buscando?`
          : `I'd be happy to help you find the perfect vehicle. Could you tell me more about what you're looking for?`;
      }
      
      const fallbackMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: fallbackContent,
        vehicles: matchingVehicles.length > 0 ? matchingVehicles : undefined,
        timestamp: new Date(),
      };
      
      setMessages([...newMessages, fallbackMessage]);
    }

    setIsLoading(false);
  }, [messages, isLoading, extractedData, customerData, extractDataFromMessage, detectObjection, detectHoursQuery, searchInventory, buildInventoryContext, speakText, stopSpeaking, inventory]);

  // Store sendMessage in ref for speech recognition callback
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  // Handle vehicle click
  const handleVehicleClick = (vehicle: Vehicle) => {
    updateCustomerData({ selectedVehicle: vehicle });
    navigateTo('vehicleDetail');
  };

  // Handle start over
  const handleStartOver = () => {
    setMessages([]);
    setExtractedData(INITIAL_EXTRACTED_DATA);
    setSuggestedFollowups([]);
    setActiveWorksheetId(null);
    setShowWorksheet(false);
    resetJourney?.();
    navigateTo('welcome');
  };

  // Handle request for sales consultant (triggers Slack notification)
  const handleRequestConsultant = async () => {
    try {
      // Call the notify_staff endpoint
      await api.notifyStaff({
        notification_type: 'sales',
        message: 'Customer at kiosk requested to speak with a sales consultant',
        vehicle_stock: customerData?.selectedVehicle?.stockNumber
      });
      
      // Add a message to the chat confirming the request
      const confirmMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '✅ I\'ve notified our sales team that you\'d like to speak with someone. A sales consultant will be with you shortly! In the meantime, feel free to continue browsing or ask me any questions.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, confirmMessage]);
      
      // Speak the confirmation if audio is enabled
      if (audioEnabled && ttsAvailable) {
        speakText(confirmMessage.content);
      }
    } catch (error) {
      console.error('Failed to notify staff:', error);
      // Still show a message even if notification fails
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I\'m having trouble reaching our team right now. Please speak with any of our associates on the showroom floor, or I can continue helping you here!',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Handle worksheet ready (customer clicked "I'm Ready")
  const handleWorksheetReady = (_worksheetId: string) => {
    // Add confirmation message to chat
    const confirmMessage: Message = {
      id: `worksheet-ready-${Date.now()}`,
      role: 'assistant',
      content: '🎉 Great! A sales manager has been notified and will be with you shortly to finalize the details. Feel free to continue browsing while you wait!',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, confirmMessage]);
    
    if (audioEnabled && ttsAvailable) {
      speakText(confirmMessage.content);
    }
  };

  // Handle worksheet close
  const handleWorksheetClose = () => {
    setShowWorksheet(false);
    // Keep activeWorksheetId so customer can reopen if needed
  };

  // Toggle audio
  const toggleAudio = () => {
    if (audioEnabled) {
      stopSpeaking();
    }
    setAudioEnabled(!audioEnabled);
  };

  return (
    <div style={styles.container}>
      <Header
        customerName={customerData?.customerName}
        audioEnabled={audioEnabled}
        isSpeaking={isSpeaking}
        ttsAvailable={ttsAvailable}
        onToggleAudio={toggleAudio}
      />
      
      {showObjectionPanel && (
        <ObjectionPanel
          onSelectPrompt={sendMessage}
          onClose={() => setShowObjectionPanel(false)}
        />
      )}

      {/* Digital Worksheet Overlay */}
      {showWorksheet && activeWorksheetId && (
        <div style={worksheetOverlayStyles.overlay}>
          <div style={worksheetOverlayStyles.container}>
            <DigitalWorksheet
              worksheetId={activeWorksheetId}
              sessionId={sessionId}
              onReady={handleWorksheetReady}
              onClose={handleWorksheetClose}
            />
          </div>
        </div>
      )}

      {/* Worksheet Reopen Button (when worksheet exists but is minimized) */}
      {activeWorksheetId && !showWorksheet && (
        <button
          style={worksheetOverlayStyles.reopenButton}
          onClick={() => setShowWorksheet(true)}
        >
          📋 View Your Worksheet
        </button>
      )}

      {/* Messages */}
      <div style={styles.messagesContainer}>
        {messages.length === 0 && (
          <SuggestionChips onSelect={sendMessage} />
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onVehicleClick={handleVehicleClick}
          />
        ))}

        {isLoading && <LoadingIndicator />}

        {/* Suggested Followups */}
        {suggestedFollowups.length > 0 && !isLoading && (
          <div style={styles.followupsContainer}>
            <p style={styles.followupsLabel}>You might also want to ask:</p>
            <div style={styles.followupsGrid}>
              {suggestedFollowups.map((followup, idx) => (
                <button
                  key={idx}
                  style={styles.followupButton}
                  onClick={() => sendMessage(followup)}
                >
                  {followup}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={() => sendMessage(inputValue)}
        onMicClick={toggleListening}
        isListening={isListening}
        isLoading={isLoading}
        onStartOver={handleStartOver}
        onRequestConsultant={handleRequestConsultant}
      />

      {/* Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// Styles for worksheet overlay
const worksheetOverlayStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  container: {
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    borderRadius: '16px',
  },
  reopenButton: {
    position: 'fixed',
    bottom: '100px',
    right: '20px',
    backgroundColor: '#e94560',
    color: 'white',
    border: 'none',
    borderRadius: '25px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(233, 69, 96, 0.4)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
};

export default AIAssistant;
