import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrackPage } from '../../go7 figma/components/TrackPage';
import { FigmaProviders } from '../components/FigmaProviders';
import MobileNavBar from '../components/MobileNavBar';

export default function FigmaTrackPage() {
  const navigate = useNavigate();

  return (
    <FigmaProviders includeAuth>
      <div className="min-h-screen bg-gray-50 page-with-bottom-nav">
        <TrackPage
          onTrackOrder={(orderId) => {
            navigate(`/track-order/${encodeURIComponent(orderId)}`);
          }}
        />
        <MobileNavBar />
      </div>
    </FigmaProviders>
  );
}
