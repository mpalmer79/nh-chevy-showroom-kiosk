import React, { useState, useEffect, useRef, KeyboardEvent, ChangeEvent, CSSProperties } from 'react';
import api from './api';
import GoogleReviews from './GoogleReviews';
import type { KioskComponentProps } from '../types';

interface InventoryStats { total?: number; byBodyStyle?: { SUV?: number; Truck?: number; [key: string]: number | undefined; }; priceRange?: { min?: number; max?: number; }; }
type PathId = 'stockLookup' | 'modelBudget' | 'aiAssistant';
type StatType = 'total' | 'suv' | 'truck' | 'price' | null;

const PATHS: Array<{ id: PathId; title: string; subtitle: string; description: string; gradient: string; iconPath: string }> = [
  { id: 'stockLookup', title: 'I Have a Stock Number', subtitle: 'Find the exact vehicle', description: 'Enter your stock number to view availability, pricing, and schedule a test drive.', gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', iconPath: 'M11 11m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0M21 21l-4.35-4.35M11 8v6M8 11h6' },
  { id: 'aiAssistant', title: 'Chat with Quirk AI', subtitle: "LET'S HAVE A CONVERSATION", description: "(BEST OPTION) Let's walk through this together and find the right vehicle that fits what you're looking for.", gradient: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', iconPath: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { id: 'modelBudget', title: 'I Know What I Want', subtitle: 'Browse by model & budget', description: 'Select your preferred model and set your budget to see matching inventory.', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', iconPath: 'M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17h-2v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5' },
];

const WelcomeScreen: React.FC<KioskComponentProps> = ({ navigateTo, updateCustomerData, customerData }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [hoveredStat, setHoveredStat] = useState<StatType>(null);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [customerName, setCustomerName] = useState(customerData?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(customerData?.phone || '');
  const [nameSubmitted, setNameSubmitted] = useState(!!customerData?.customerName || !!customerData?.namePhaseCompleted);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const formatPhoneNumber = (value: string): string => {
    const d = value.replace(/\D/g, '').slice(0, 10);
    if (d.length === 0) return '';
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };

  useEffect(() => {
    setIsVisible(true);
    api.getInventoryStats().then(data => setStats(data as InventoryStats)).catch(() => {});
    if (!nameSubmitted) setTimeout(() => nameInputRef.current?.focus(), 800);
  }, [nameSubmitted]);

  const logSession = async (name: string | null, phone: string | null, path?: string) => {
    try {
      await api.logTrafficSession({ customerName: name || undefined, phone: phone || undefined, path: path || 'welcome', currentStep: 'name_entered', actions: name ? ['entered_name'] : ['skipped_name'] });
    } catch {}
  };

  const handleNameSubmit = async () => {
    const trimmedName = customerName.trim();
    const phoneDigits = customerPhone.replace(/\D/g, '');
    const formattedPhone = phoneDigits.length === 10 ? customerPhone : null;
    if (trimmedName) {
      const formattedName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1).toLowerCase();
      updateCustomerData({ customerName: formattedName, phone: formattedPhone || undefined, namePhaseCompleted: true });
      setCustomerName(formattedName);
      await logSession(formattedName, formattedPhone);
    } else if (formattedPhone) {
      updateCustomerData({ phone: formattedPhone, namePhaseCompleted: true });
      await logSession(null, formattedPhone);
    }
    setNameSubmitted(true);
  };

  const handleSkipName = async () => { 
    updateCustomerData({ namePhaseCompleted: true }); 
    await logSession(null, null); 
    setNameSubmitted(true); 
  };

  const handlePathSelect = async (path: PathId) => {
    updateCustomerData({ path });
    try { await api.logTrafficSession({ customerName: customerName || undefined, phone: customerPhone || undefined, path, currentStep: path, actions: [`selected_${path}`] }); } catch {}
    navigateTo(path);
  };

  const handleBrowseAll = async () => {
    // Clear any existing filters when browsing all
    updateCustomerData({ 
      path: 'browse',
      bodyStyleFilter: undefined,
      selectedModel: undefined,
      selectedCab: undefined,
    });
    try { await api.logTrafficSession({ customerName: customerName || undefined, phone: customerPhone || undefined, path: 'browse', currentStep: 'inventory', actions: ['browse_all'] }); } catch {}
    navigateTo('inventory');
  };

  const handleStatClick = (statKey: StatType) => {
    // Clear any existing filters first
    updateCustomerData({ 
      path: 'browse',
      bodyStyleFilter: undefined,
      selectedModel: undefined,
      selectedCab: undefined,
    });
    switch (statKey) {
      case 'suv':
        updateCustomerData({ bodyStyleFilter: 'SUV' });
        navigateTo('inventory', { bodyStyle: 'SUV' });
        break;
      case 'truck':
        updateCustomerData({ bodyStyleFilter: 'Truck' });
        navigateTo('inventory', { bodyStyle: 'Truck' });
        break;
      case 'total':
        navigateTo('inventory');
        break;
      case 'price':
        navigateTo('inventory', { sortBy: 'priceLow' });
        break;
      default:
        navigateTo('inventory');
        break;
    }
  };

  const AvatarIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1.5" fill="#fff" stroke="none"/><circle cx="15" cy="10" r="1.5" fill="#fff" stroke="none"/><path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round"/>
    </svg>
  );

  // Phase 1: Name Capture with Google Reviews
  if (!nameSubmitted) {
    return (
      <div style={s.container}>
        <div style={s.bgImage} /><div style={s.bgOverlay} />
        
        <div className="welcome-two-column" style={{ ...s.twoColumnLayout, opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(20px)' }}>
          
          {/* Left Column - Name Capture */}
          <div className="welcome-capture-column" style={s.columnCard}>
            <div style={s.nameCaptureInner}>
              <div style={s.titleRow}>
                <div style={s.inlineAvatar}><AvatarIcon /></div>
                <h1 style={s.nameTitle}>Hi, I'm your <span style={s.highlight}>Quirk AI</span> assistant</h1>
              </div>
              <h2 style={s.nameSubtitle}>Welcome to Quirk Chevrolet!</h2>
              <p style={s.namePrompt}>What's your first name?</p>
              <div style={s.inputContainer}>
                <input ref={nameInputRef} type="text" style={s.nameInput} placeholder="Enter your first name" value={customerName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomerName(e.target.value)}
                  onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleNameSubmit()} maxLength={20} autoComplete="off" autoCapitalize="words" />
              </div>
              <p style={s.phonePrompt}>Enter Phone Number</p>
              <div style={s.inputContainer}>
                <input type="tel" style={s.phoneInput} placeholder="(Optional) This saves your progress" value={customerPhone}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomerPhone(formatPhoneNumber(e.target.value))} maxLength={14} autoComplete="off" />
              </div>
              <div style={s.nameActions}>
                <button style={{ ...s.continueBtn, opacity: customerName.trim() ? 1 : 0.5 }} onClick={handleNameSubmit} disabled={!customerName.trim()}>Continue</button>
                <button style={s.skipBtn} onClick={handleSkipName}>Skip for now</button>
              </div>
              <p style={s.privacyNote}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Your name is only used to personalize your experience today
              </p>
            </div>
          </div>
          
          {/* Right Column - Google Reviews */}
          <div className="welcome-reviews-column" style={s.columnCard}>
            <GoogleReviews rotationInterval={10000} />
          </div>
        </div>
        
        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
          input::placeholder { color: rgba(255,255,255,0.7) !important; }
          
          /* Mobile Portrait - Stack vertically with name capture on top */
          @media (max-width: 768px) and (orientation: portrait) {
            .welcome-two-column {
              flex-direction: column !important;
              gap: 24px !important;
              padding: 20px !important;
            }
            .welcome-two-column > div {
              flex: 1 1 auto !important;
              max-width: 100% !important;
              min-height: auto !important;
            }
            .welcome-reviews-column {
              max-height: 300px;
              overflow: hidden;
            }
          }
          
          /* Mobile Landscape - Side by side */
          @media (max-width: 900px) and (orientation: landscape) {
            .welcome-two-column {
              gap: 20px !important;
              padding: 10px !important;
            }
            .welcome-two-column > div {
              flex: 1 1 45% !important;
              min-height: auto !important;
            }
          }
          
          /* Tablet Portrait */
          @media (min-width: 769px) and (max-width: 1024px) and (orientation: portrait) {
            .welcome-two-column {
              flex-direction: column !important;
              gap: 30px !important;
            }
            .welcome-two-column > div {
              max-width: 600px !important;
            }
          }
        `}</style>
      </div>
    );
  }

  // Phase 2: Path Selection
  return (
    <div style={s.container}>
      <div style={s.bgImage} /><div style={s.bgOverlay} />
      <div style={{ ...s.heroSection, opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(20px)' }} className="hero-section">
        <h2 style={s.heroSubtitle}>{customerName ? <>Hi <span style={s.highlight}>{customerName}</span>, How can I help you today?</> : <>How can I help you today?</>}</h2>
        <p style={s.heroText}>Choose an option below to get started</p>
      </div>

      <div style={s.pathsContainer}>
        {PATHS.map((path) => {
          const isAICard = path.id === 'aiAssistant';
          const isHovered = hoveredPath === path.id;
          
          // Build card styles based on card type and hover state
          let cardBoxShadow: string;
          let cardBorder: string;
          let cardTransform: string;
          
          if (isAICard) {
            // Special styling for AI card - white glow effect with gold accent
            cardBoxShadow = isHovered 
              ? '0 20px 40px rgba(0,0,0,0.4), 0 0 30px rgba(212,175,55,0.4), 0 0 80px rgba(255,255,255,0.6)' 
              : '0 8px 32px rgba(0,0,0,0.3), 0 0 60px rgba(255,255,255,0.5), 0 0 100px rgba(255,255,255,0.3), 0 0 30px rgba(212,175,55,0.3)';
            cardBorder = '2px solid rgba(255,255,255,0.9)';
            cardTransform = isHovered ? 'scale(1.05) translateY(-10px)' : 'scale(1.02)';
          } else {
            // Regular card styling
            cardBoxShadow = isHovered 
              ? '0 20px 40px rgba(0,0,0,0.4), 0 0 30px rgba(74,222,128,0.2)' 
              : '0 8px 32px rgba(0,0,0,0.3)';
            cardBorder = `1px solid ${isHovered ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}`;
            cardTransform = isHovered ? 'scale(1.03) translateY(-8px)' : 'scale(1)';
          }
          
          return (
            <div key={path.id} style={{ 
              ...s.pathCard, 
              background: isHovered ? path.gradient : 'rgba(255,255,255,0.1)',
              border: cardBorder,
              boxShadow: cardBoxShadow,
              transform: cardTransform,
            }}
              onMouseEnter={() => setHoveredPath(path.id)} onMouseLeave={() => setHoveredPath(null)} onClick={() => handlePathSelect(path.id)}>
              <div style={{ ...s.pathIcon, background: isHovered ? 'rgba(255,255,255,0.2)' : path.gradient, boxShadow: isHovered ? 'none' : '0 8px 24px rgba(0,0,0,0.3)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={path.iconPath}/></svg>
              </div>
              <h3 style={s.pathTitle}>{path.title}</h3>
              <p style={s.pathSubtitle}>{path.subtitle}</p>
              <p style={s.pathDescription}>{path.description}</p>
              <div style={{ ...s.pathArrow, transform: isHovered ? 'translateX(4px)' : 'translateX(0)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          );
        })}
      </div>

      {stats && (
        <div style={s.statsBar} className="stats-bar">
          {[{ key: 'total' as StatType, value: stats.total || 0, label: 'Vehicles In Stock' },
            { key: 'suv' as StatType, value: stats.byBodyStyle?.SUV || 0, label: 'SUVs' },
            { key: 'truck' as StatType, value: stats.byBodyStyle?.Truck || 0, label: 'Trucks' },
            { key: 'price' as StatType, value: `$${stats.priceRange?.min ? Math.round(stats.priceRange.min / 1000) : 0}k+`, label: 'Starting At' }
          ].map((stat, i) => (
            <React.Fragment key={stat.key}>
              {i > 0 && <div style={s.statDivider} />}
              <button style={{ ...s.statBtn, ...(hoveredStat === stat.key ? s.statBtnHover : {}) }}
                onMouseEnter={() => setHoveredStat(stat.key)} onMouseLeave={() => setHoveredStat(null)} onClick={() => handleStatClick(stat.key)}>
                <div style={s.statItem}><span style={s.statNumber}>{stat.value}</span><span style={s.statLabel}>{stat.label}</span></div>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      <button style={s.browseLink} onClick={handleBrowseAll}>Or browse all inventory →</button>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }`}</style>
    </div>
  );
};

const s: Record<string, CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative', fontFamily: "'Montserrat', sans-serif", boxSizing: 'border-box' },
  bgImage: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'url("/showroom.jpg")', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 },
  bgOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(15,25,20,0.85) 100%)', zIndex: 1 },
  
  // Two Column Layout for Phase 1
  twoColumnLayout: { display: 'flex', gap: '40px', maxWidth: '1150px', width: '100%', alignItems: 'stretch', justifyContent: 'center', position: 'relative', zIndex: 2, transition: 'all 0.6s ease' },
  columnCard: { flex: '1 1 520px', maxWidth: '540px', minHeight: '480px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  nameCaptureInner: { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.2)', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' },
  
  titleRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' },
  inlineAvatar: { width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 32px rgba(34,197,94,0.5), 0 0 20px rgba(34,197,94,0.3)' },
  nameTitle: { fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.5)' },
  nameSubtitle: { fontSize: '20px', fontWeight: 600, color: '#fff', margin: '0 0 24px 0', textShadow: '0 2px 8px rgba(0,0,0,0.5)' },
  namePrompt: { fontSize: '16px', color: '#fff', margin: '0 0 10px 0', fontWeight: 600 },
  phonePrompt: { fontSize: '16px', color: '#fff', margin: '0 0 10px 0', fontWeight: 600 },
  inputContainer: { position: 'relative', width: '100%', maxWidth: '380px', marginBottom: '16px' },
  nameInput: { width: '100%', padding: '16px 20px', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '12px', color: '#fff', fontSize: '18px', fontWeight: 600, textAlign: 'center', backdropFilter: 'blur(12px)', boxSizing: 'border-box', transition: 'all 0.2s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', outline: 'none' },
  phoneInput: { width: '100%', padding: '16px 20px', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '12px', color: '#fff', fontSize: '16px', fontWeight: 500, textAlign: 'center', backdropFilter: 'blur(12px)', boxSizing: 'border-box', transition: 'all 0.2s ease', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', outline: 'none' },
  nameActions: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', width: '100%', maxWidth: '380px' },
  continueBtn: { width: '100%', padding: '16px 32px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 32px rgba(34,197,94,0.4), 0 0 20px rgba(34,197,94,0.2)', transition: 'all 0.2s ease' },
  skipBtn: { background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', padding: '10px', transition: 'color 0.2s ease' },
  privacyNote: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0 },
  highlight: { color: '#4ade80', textShadow: '0 0 20px rgba(74,222,128,0.5)' },
  
  // Phase 2 Styles
  heroSection: { textAlign: 'center', marginBottom: '52px', marginTop: '24px', transition: 'all 0.6s ease', position: 'relative', zIndex: 2 },
  heroSubtitle: { fontSize: '48px', fontWeight: 800, color: '#fff', margin: '0 0 16px 0', letterSpacing: '-1px', textShadow: '0 4px 16px rgba(0,0,0,0.5)' },
  heroText: { fontSize: '20px', color: 'rgba(255,255,255,0.85)', margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.5)' },
  pathsContainer: { display: 'flex', gap: '28px', marginBottom: '44px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '1200px', position: 'relative', zIndex: 2 },
  pathCard: { flex: '1 1 320px', maxWidth: '380px', minHeight: '300px', padding: '36px', borderRadius: '24px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)' },
  pathIcon: { width: '88px', height: '88px', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: '22px', transition: 'all 0.35s ease' },
  pathTitle: { fontSize: '24px', fontWeight: 700, color: '#fff', margin: '0 0 6px 0' },
  pathSubtitle: { fontSize: '14px', fontWeight: 600, color: '#4ade80', margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '1.5px' },
  pathDescription: { fontSize: '15px', color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.6, flex: 1 },
  pathArrow: { marginTop: '22px', color: 'rgba(255,255,255,0.6)', transition: 'transform 0.3s ease' },
  statsBar: { display: 'flex', alignItems: 'center', gap: '10px', padding: '20px 32px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', marginBottom: '28px', position: 'relative', zIndex: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)' },
  statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' },
  statBtn: { background: 'transparent', border: 'none', padding: '14px 28px', borderRadius: '14px', cursor: 'pointer', transition: 'all 0.25s ease' },
  statBtnHover: { background: 'linear-gradient(135deg, rgba(74,222,128,0.2) 0%, rgba(34,197,94,0.15) 100%)', transform: 'scale(1.05)', boxShadow: '0 0 24px rgba(74,222,128,0.25)' },
  statNumber: { fontSize: '36px', fontWeight: 700, color: '#4ade80', textShadow: '0 0 24px rgba(74,222,128,0.4)' },
  statLabel: { fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '1px' },
  statDivider: { width: '1px', height: '48px', background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)' },
  browseLink: { background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: '16px', fontWeight: 600, cursor: 'pointer', padding: '16px 32px', borderRadius: '12px', position: 'relative', zIndex: 2, backdropFilter: 'blur(12px)', transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' },
};

export default WelcomeScreen;
