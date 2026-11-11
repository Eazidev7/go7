import React from 'react';
import AppFlowManager from './components/AppFlowManager';
import AppRouter from './AppRouter';
import Header from './components/Header';

/**
 * Main App component with Splash → Onboarding → Main App flow
 */
function App() {
  return (
    <AppFlowManager>
      <div className="min-h-screen">
        <Header />
        <div className="pt-[70px]"> {/* Add padding to account for fixed header */}
          <AppRouter />
        </div>
      </div>
    </AppFlowManager>
  );
}

export default App;
