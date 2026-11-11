import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TrackFab = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide on scroll down, show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleTrackClick = () => {
    navigate('/track');
  };

  return (
    <button
      onClick={handleTrackClick}
      className={`fixed bottom-20 right-4 w-14 h-14 bg-red-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 z-40 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
      style={{ 
        backgroundColor: '#E30613',
        boxShadow: '0 8px 25px rgba(227, 6, 19, 0.3)',
        marginBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
      title="Track Order"
    >
      <div className="flex items-center justify-center">
        {/* Scooter/Map Pin Icon */}
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
          />
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
          />
        </svg>
      </div>
      
      {/* Ripple effect on click */}
      <div className="absolute inset-0 rounded-full animate-ping bg-red-600 opacity-20 pointer-events-none" />
    </button>
  );
};

export default TrackFab;