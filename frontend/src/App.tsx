import React from 'react';
import KioskApp from './components/KioskApp';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <KioskApp />
    </ErrorBoundary>
  );
};

export default App;
