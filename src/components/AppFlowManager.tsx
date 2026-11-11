import React, { useState, useEffect } from 'react';
import { SplashScreen } from '../../go7 figma/components/SplashScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import AppRouter from '../AppRouter';

type AppState = 'splash' | 'onboarding' | 'main';

interface AppFlowManagerProps {
  children?: React.ReactNode;
}

export default function AppFlowManager({ children }: AppFlowManagerProps) {
  const [appState, setAppState] = useState<AppState>('splash');
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if this is the first launch
    const hasSeenOnboarding = localStorage.getItem('go7_onboarding_completed');
    setIsFirstLaunch(!hasSeenOnboarding);
  }, []);

  const handleSplashComplete = () => {
    if (isFirstLaunch) {
      setAppState('onboarding');
    } else {
      setAppState('main');
    }
  };

  const handleOnboardingComplete = () => {
    // Mark onboarding as completed
    localStorage.setItem('go7_onboarding_completed', 'true');
    localStorage.setItem('go7_onboarding_date', new Date().toISOString());
    setIsFirstLaunch(false);
    setAppState('main');
  };

  // Note: Your existing OnboardingScreen handles its own navigation after login/signup
  // It will navigate to '/profile' or '/' (as guest) automatically

  // Show loading until we determine first launch status
  if (isFirstLaunch === null) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-red-600">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // Render based on current app state
  switch (appState) {
    case 'splash':
      return <SplashScreen onComplete={handleSplashComplete} />;
      
    case 'onboarding':
      // Your existing OnboardingScreen handles its own navigation flow
      // It includes login/signup and will redirect automatically
      return <OnboardingScreen />;
      
    case 'main':
      return children || <AppRouter />;
      
    default:
      return <AppRouter />;
  }
}

// Utility functions for managing onboarding state
export const AppFlowUtils = {
  // Check if user has completed onboarding
  hasCompletedOnboarding: (): boolean => {
    return localStorage.getItem('go7_onboarding_completed') === 'true';
  },

  // Reset onboarding (for testing)
  resetOnboarding: (): void => {
    localStorage.removeItem('go7_onboarding_completed');
    localStorage.removeItem('go7_onboarding_date');
  },

  // Get onboarding completion date
  getOnboardingDate: (): Date | null => {
    const dateStr = localStorage.getItem('go7_onboarding_date');
    return dateStr ? new Date(dateStr) : null;
  },

  // Force show onboarding (useful for settings)
  forceShowOnboarding: (): void => {
    localStorage.removeItem('go7_onboarding_completed');
    window.location.reload();
  }
};