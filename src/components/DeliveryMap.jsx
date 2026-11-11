import React from 'react';
import { useNavigate } from 'react-router-dom';
import MapBase from './shared/MapBase';

export default function DeliveryMap() {
  console.log('🚗 DeliveryMap component mounted');
  const navigate = useNavigate();

  const handleZoneClick = (zone) => {
    navigate(`/vendors?zone=${zone.name.toLowerCase()}`);
  };

  console.log('🔗 Rendering MapBase with props...');
  
  return (
    <MapBase
      onZoneClick={handleZoneClick}
      showRider={true}
      showZones={true}
      showBanner={true}
      bannerText="📍 Click on any zone to explore restaurants & vendors"
    />
  );
}