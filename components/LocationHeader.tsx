import React, { useState } from 'react';
import './LocationHeader.css';

interface LocationHeaderProps {
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  onNotificationTap: () => void;
  notificationCount?: number;
}

export const LocationHeader: React.FC<LocationHeaderProps> = ({
  selectedLocation,
  onLocationChange,
  onNotificationTap,
  notificationCount = 0
}) => {
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const handleLocationTap = () => {
    setIsLocationModalOpen(true);
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLoadingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get location name
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();
          
          const locationName = data.address?.suburb || 
                              data.address?.neighbourhood || 
                              data.address?.city || 
                              'Current Location';
          
          onLocationChange(`${locationName}, Lagos`);
          setIsLocationModalOpen(false);
        } catch (error) {
          console.error('Geocoding error:', error);
          onLocationChange('Current Location');
          setIsLocationModalOpen(false);
        } finally {
          setIsLoadingLocation(false);
        }
      },
      (error) => {
        setIsLoadingLocation(false);
        alert('Unable to retrieve your location. Please select manually.');
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const locations = [
    'Victoria Island, Lagos',
    'Ikoyi, Lagos', 
    'Lekki, Lagos',
    'Surulere, Lagos',
    'Ikeja, Lagos',
    'Maryland, Lagos'
  ];

  return (
    <>
      <header className="location-header">
        <div className="header-content">
          {/* Location Selector */}
          <button 
            className="location-selector"
            onClick={handleLocationTap}
            aria-label="Select delivery location"
          >
            <div className="location-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path 
                  d="M8 1C5.24 1 3 3.24 3 6c0 2.83 5 9 5 9s5-6.17 5-9c0-2.76-2.24-5-5-5zm0 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" 
                  fill="#E83A2E"
                />
              </svg>
            </div>
            <div className="location-text">
              <span className="location-label">Deliver to</span>
              <span className="location-name">{selectedLocation}</span>
            </div>
            <div className="location-chevron">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path 
                  d="M3 4.5L6 7.5L9 4.5" 
                  stroke="#666" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>

          {/* Notifications Bell */}
          <button 
            className="notification-bell"
            onClick={onNotificationTap}
            aria-label={`Notifications ${notificationCount > 0 ? `(${notificationCount})` : ''}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path 
                d="M12 2C13.1046 2 14 2.89543 14 4V4.52C16.3923 5.29 18 7.47 18 10V14L2 14V10C2 7.47 3.60771 5.29 6 4.52V4C6 2.89543 6.89543 2 8 2H12ZM10 21C10 22.1046 10.8954 23 12 23C13.1046 23 14 22.1046 14 21" 
                stroke="#202124" 
                strokeWidth="1.5" 
                strokeLinecap="round"
              />
            </svg>
            {notificationCount > 0 && (
              <div className="notification-badge">
                <span>{notificationCount > 9 ? '9+' : notificationCount}</span>
              </div>
            )}
          </button>
        </div>
      </header>

      {/* Location Selection Modal */}
      {isLocationModalOpen && (
        <div className="location-modal-overlay" onClick={() => setIsLocationModalOpen(false)}>
          <div className="location-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select Location</h3>
              <button 
                className="modal-close"
                onClick={() => setIsLocationModalOpen(false)}
                aria-label="Close"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path 
                    d="M18 6L6 18M6 6L18 18" 
                    stroke="#666" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            
            <div className="location-search">
              <input 
                type="text" 
                placeholder="Search for area, street name..."
                className="search-input"
              />
            </div>

            <div className="location-list">
              <div className="current-location">
                <button className="location-option current">
                  <div className="location-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path 
                        d="M10 2C6.6863 2 4 4.6863 4 8C4 12 10 18 10 18C10 18 16 12 16 8C16 4.6863 13.3137 2 10 2ZM10 10.5C8.6193 10.5 7.5 9.3807 7.5 8C7.5 6.6193 8.6193 5.5 10 5.5C11.3807 5.5 12.5 6.6193 12.5 8C12.5 9.3807 11.3807 10.5 10 10.5Z"
                        fill="#E83A2E"
                      />
                    </svg>
                  </div>
                  <span>Use current location</span>
                </button>
              </div>

              <div className="saved-locations">
                {locations.map((location, index) => (
                  <button
                    key={index}
                    className={`location-option ${selectedLocation === location ? 'selected' : ''}`}
                    onClick={() => {
                      onLocationChange(location);
                      setIsLocationModalOpen(false);
                    }}
                  >
                    <div className="location-icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path 
                          d="M8 1C5.24 1 3 3.24 3 6c0 2.83 5 9 5 9s5-6.17 5-9c0-2.76-2.24-5-5-5zm0 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" 
                          fill={selectedLocation === location ? "#E83A2E" : "#666"}
                        />
                      </svg>
                    </div>
                    <span>{location}</span>
                    {selectedLocation === location && (
                      <div className="selected-check">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path 
                            d="M13.5 4.5L6 12L2.5 8.5" 
                            stroke="#E83A2E" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};