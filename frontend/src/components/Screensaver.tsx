import React from 'react';
import { motion } from 'framer-motion';

interface ScreensaverProps {
  onTouch: () => void;
}

const Screensaver: React.FC<ScreensaverProps> = ({ onTouch }) => {
  return (
    <motion.div
      style={styles.container}
      onClick={onTouch}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div style={styles.background}>
        <div style={styles.backgroundImage} />
        <div style={styles.overlay} />
        <div style={styles.gradient1} />
        <div style={styles.gradient2} />
      </div>

      <motion.div
        style={styles.content}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div style={styles.logo}>
          <span style={styles.logoBrand}>NH CHEVY</span>
          <span style={styles.logoAI}>AI</span>
        </div>

        <h1 style={styles.headline}>Find Your Perfect Vehicle</h1>

        <p style={styles.subheadline}>
          Powered by AI recommendations tailored just for you
        </p>

        <motion.div
          style={styles.cta}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Touch anywhere to begin
        </motion.div>
      </motion.div>

      <div style={styles.footer}>
        <span style={styles.dealership}>New Hampshire Chevrolet</span>
        <span style={styles.divider}>&bull;</span>
        <span style={styles.tagline}>New England's #1 Dealer</span>
      </div>
    </motion.div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    cursor: 'pointer',
    overflow: 'hidden',
  },
  background: {
    position: 'absolute',
    inset: 0,
  },
  backgroundImage: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'url(/showroom.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
  },
  gradient1: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle at 30% 30%, rgba(26, 71, 42, 0.3) 0%, transparent 50%)',
    animation: 'rotate 20s linear infinite',
  },
  gradient2: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle at 70% 70%, rgba(201, 162, 39, 0.15) 0%, transparent 50%)',
    animation: 'rotate 25s linear infinite reverse',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '0 24px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
  },
  logoBrand: {
    fontSize: '4rem',
    fontWeight: 800,
    color: '#ffffff',
    textShadow: '2px 2px 8px rgba(0,0,0,0.5)',
  },
  logoAI: {
    fontSize: '4rem',
    fontWeight: 800,
    color: '#1a472a',
    background: '#ffffff',
    padding: '4px 16px',
    borderRadius: '12px',
    boxShadow: '2px 2px 12px rgba(0,0,0,0.3)',
  },
  headline: {
    fontSize: '3rem',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '16px',
    maxWidth: '600px',
    textShadow: '2px 2px 8px rgba(0,0,0,0.5)',
  },
  subheadline: {
    fontSize: '1.25rem',
    color: '#e0e0e0',
    marginBottom: '48px',
    maxWidth: '500px',
    textShadow: '1px 1px 4px rgba(0,0,0,0.5)',
  },
  cta: {
    fontSize: '1.5rem',
    color: '#c9a227',
    fontWeight: 500,
    textShadow: '1px 1px 4px rgba(0,0,0,0.5)',
  },
  footer: {
    position: 'absolute',
    bottom: '32px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#888888',
    fontSize: '1rem',
    textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
  },
  dealership: {
    fontWeight: 600,
    color: '#c0c0c0',
  },
  divider: {
    color: '#666666',
  },
  tagline: {
    fontStyle: 'italic',
  },
};

export default Screensaver;
