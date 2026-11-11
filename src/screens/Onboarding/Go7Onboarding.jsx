import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthSheet from '../../components/auth/AuthSheet';
import './OnboardingScreen.css';
import Go7OnboardImg from '../../assets/onboarding/go7_onboarding.png';

const Go7Onboarding = () => {
  const navigate = useNavigate();
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [authMode, setAuthMode] = useState('signup');

  const handleGetStarted = () => {
    setAuthMode('signup');
    setShowAuthSheet(true);
  };

  const handleLogin = () => {
    setAuthMode('login');
    setShowAuthSheet(true);
  };

  const handleContinueAsGuest = () => {
    localStorage.setItem('go7_guest_mode', 'true');
    navigate('/');
  };

  const handleAuthSuccess = (user) => {
    setShowAuthSheet(false);
    // After successful authentication, redirect to profile
    navigate('/profile');
  };

  return (
    <div className="onboarding-screen">
      <div className="onboarding-header">
        <div className="logo-section">
          <span className="go7-logo">Go7</span>
        </div>
        <button className="guest-button" onClick={handleContinueAsGuest}>
          Continue as guest
        </button>
      </div>

      <div className="onboarding-content">
        <div className="image-container">
          {Go7OnboardImg ? (
            <img src={Go7OnboardImg} alt="Go7 Onboarding" className="onboarding-image" />
          ) : (
            <div className="image-fallback">
              <div className="fallback-icon">📦</div>
              <p>Go7</p>
            </div>
          )}
        </div>

        <div className="text-content">
          <h1 className="main-title">Go7 gets it to you — fast and easy.</h1>
          <p className="sub-text">From meals to errands, Go7 brings it right to your doorstep.</p>
        </div>
      </div>

      <div className="action-buttons">
        <button className="get-started-btn" onClick={handleGetStarted}>Get Started</button>
        <button className="login-link" onClick={handleLogin}>Already have an account? Log in</button>
      </div>

      {showAuthSheet && (
        <AuthSheet mode={authMode} onClose={() => setShowAuthSheet(false)} onSuccess={handleAuthSuccess} />
      )}
    </div>
  );
};

export default Go7Onboarding;
