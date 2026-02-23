import React from 'react';
import KioskApp from './components/Kioskapp';
import ErrorBoundary from './components/Errorboundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <KioskApp />
    </ErrorBoundary>
  );
};

export default App;
