import React from 'react';
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthSheet from '../../components/auth/AuthSheet';
import deliveryRiderImage from '../../assets/onboarding/go7-delivery-rider.png';
import './OnboardingScreen.css';

const OnboardingScreen = ({ onComplete, initialAuthMode = null }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [authMode, setAuthMode] = useState('signup'); // 'signup' or 'login'

  useEffect(() => {
    const from = location.state?.from;
    if (from) {
      setAuthMode('login');
      setShowAuthSheet(true);
      return;
    }
    // Profile / signed-out entry: open login sheet immediately (skip welcome gate)
    if (initialAuthMode === 'login' || initialAuthMode === 'signup') {
      setAuthMode(initialAuthMode);
      setShowAuthSheet(true);
    }
  }, [location.state?.from, initialAuthMode]);

  const handleGetStarted = () => {
    setAuthMode('signup');
    setShowAuthSheet(true);
  };

  const handleLogin = () => {
    setAuthMode('login');
    setShowAuthSheet(true);
  };

  const handleContinueAsGuest = () => {
    // Set guest mode and redirect to homepage
    localStorage.setItem('go7_guest_mode', 'true');
    if (onComplete) onComplete();
  };

  const handleAuthSuccess = () => {
    setShowAuthSheet(false);
    const returnTo = location.state?.from;
    if (returnTo) {
      navigate(returnTo, { replace: true });
      return;
    }
    if (onComplete) onComplete();
  };

  return (
    <div className="onboarding-screen">
      {/* Header Row */}
      <div className="onboarding-header">
        <div className="logo-section">
          <span className="go7-logo">Go7</span>
        </div>
        <button 
          className="guest-button"
          onClick={handleContinueAsGuest}
        >
          Continue as guest
        </button>
      </div>

      {/* Main Content */}
      <div className="onboarding-content">
        {/* Onboarding Image */}
        <div className="image-container">
          {/* Beautiful Go7 delivery illustration with animated rider */}
          <div className="onboarding-illustration">
            <div className="delivery-graphic">
              <div className="phone-mockup">
                <div className="screen">
                  <div className="go7-app">
                    <div className="app-header">Go7</div>
                    <div className="delivery-items">
                      <div className="item">🍕</div>
                      <div className="item">🥗</div>
                      <div className="item">🍔</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Go7 Delivery Rider Image with animation */}
              <div className="delivery-rider animated">
                <img 
                  src={deliveryRiderImage} 
                  alt="Go7 Delivery Rider" 
                  className="rider-image"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="text-content">
          <h1 className="main-title">
            Go7 gets it to you — fast and easy.
          </h1>
          <p className="sub-text">
            From meals to errands, Go7 brings it right to your doorstep.
          </p>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="action-buttons">
        <button 
          type="button"
          className="get-started-btn"
          onClick={handleGetStarted}
        >
          Get Started
        </button>
        <button 
          type="button"
          className="login-link"
          onClick={handleLogin}
        >
          Already have an account? Log in
        </button>
      </div>

      {/* Auth Sheet Modal */}
      {showAuthSheet && (
        <AuthSheet
          mode={authMode}
          onClose={() => setShowAuthSheet(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
};

export default OnboardingScreen;
