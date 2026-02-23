import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    this.setState({ errorInfo });
    this.logErrorToBackend(error, errorInfo);
  }

  logErrorToBackend = async (error: Error, errorInfo: ErrorInfo): Promise<void> => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

      await fetch(`${API_BASE_URL}/api/v1/analytics/interaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'error_boundary_caught',
          eventData: {
            error: error.toString(),
            componentStack: errorInfo?.componentStack,
            url: window.location.href,
            userAgent: navigator.userAgent,
          },
          sessionId: sessionStorage.getItem('kiosk_session_id') || 'unknown',
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.warn('Failed to log error to backend:', e);
    }
  };

  handleRestart = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleFullRestart = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div style={styles.container}>
          <div style={styles.content}>
            <div style={styles.iconContainer}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <circle cx="12" cy="16" r="0.5" fill="#ef4444" />
              </svg>
            </div>

            <h1 style={styles.title}>Something went wrong</h1>
            <p style={styles.subtitle}>
              We encountered an unexpected error. Don't worry - your information is safe.
            </p>

            <div style={styles.buttonGroup}>
              <button style={styles.primaryButton} onClick={this.handleRestart}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                Try Again
              </button>
              <button style={styles.secondaryButton} onClick={this.handleFullRestart}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Start Over
              </button>
            </div>

            <details style={styles.details}>
              <summary style={styles.summary}>Technical Details</summary>
              <div style={styles.errorDetails}>
                <p style={styles.errorText}>
                  <strong>Error:</strong> {error?.toString()}
                </p>
                {errorInfo?.componentStack && (
                  <pre style={styles.stackTrace}>
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </details>

            <p style={styles.helpText}>
              If this problem persists, please notify a sales associate.
            </p>
          </div>
        </div>
      );
    }

    return children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
    padding: '40px',
    boxSizing: 'border-box',
  },
  content: {
    maxWidth: '500px',
    textAlign: 'center' as const,
  },
  iconContainer: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 12px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.6)',
    margin: '0 0 32px 0',
    lineHeight: '1.5',
  },
  buttonGroup: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap' as const,
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  secondaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 28px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  details: {
    marginBottom: '24px',
    textAlign: 'left' as const,
  },
  summary: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    padding: '8px 0',
  },
  errorDetails: {
    marginTop: '12px',
    padding: '16px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    fontSize: '13px',
    color: '#ef4444',
    margin: '0 0 12px 0',
    wordBreak: 'break-word' as const,
  },
  stackTrace: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    margin: 0,
    padding: '12px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '200px',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  helpText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    margin: 0,
  },
};

export default ErrorBoundary;
