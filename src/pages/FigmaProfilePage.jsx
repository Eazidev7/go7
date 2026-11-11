import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfilePage } from '../../go7 figma/components/ProfilePage';
import { FigmaProviders } from '../components/FigmaProviders';
import ProfileGuard from '../components/auth/ProfileGuard.jsx';

export default function FigmaProfilePage() {
  const navigate = useNavigate();

  const onTrackOrder = useCallback((orderId) => {
    navigate(`/track-order/${encodeURIComponent(orderId)}`);
  }, [navigate]);

  const onBack = useCallback(() => {
    localStorage.removeItem('go7_onboarding_complete');
    navigate('/onboarding');
  }, [navigate]);

  return (
    <ProfileGuard>
      <FigmaProviders>
        <ProfilePage onTrackOrder={onTrackOrder} onBack={onBack} />
      </FigmaProviders>
    </ProfileGuard>
  );
}
