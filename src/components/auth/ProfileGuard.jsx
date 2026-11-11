import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './ProfileGuard.css';

const ProfileGuard = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect while auth is loading
    if (loading) return;

    // Check if user is not authenticated
    if (!currentUser) {
      // Check if user is in guest mode
      const isGuestMode = localStorage.getItem('go7_guest_mode') === 'true';
      
      if (isGuestMode) {
        // If in guest mode, still redirect to onboarding to encourage signup
        navigate('/onboarding', { replace: true });
      } else {
        // Normal case - redirect to onboarding
        navigate('/onboarding', { replace: true });
      }
      return;
    }

    // If user is authenticated, let them proceed to profile
  }, [currentUser, loading, navigate]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="profile-guard-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, render the profile page
  if (currentUser) {
    return children;
  }

  // While redirecting, show loading
  return (
    <div className="profile-guard-loading">
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Redirecting...</p>
      </div>
    </div>
  );
};

export default ProfileGuard;