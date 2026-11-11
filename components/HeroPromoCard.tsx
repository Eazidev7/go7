import React from 'react';
import './HeroPromoCard.css';

interface HeroPromoCardProps {
  title: string;
  subtitle: string;
  ctaText: string;
  onCtaTap: () => void;
  backgroundImage?: string;
  gradientOverlay?: boolean;
}

export const HeroPromoCard: React.FC<HeroPromoCardProps> = ({
  title,
  subtitle,
  ctaText,
  onCtaTap,
  backgroundImage,
  gradientOverlay = true
}) => {
  return (
    <div className="hero-promo-card">
      <div 
        className="hero-background"
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined
        }}
      >
        {gradientOverlay && <div className="hero-overlay"></div>}
      </div>
      
      <div className="hero-content">
        <div className="hero-text">
          <h2 className="hero-title">{title}</h2>
          <p className="hero-subtitle">{subtitle}</p>
        </div>
        
        <button 
          className="hero-cta"
          onClick={onCtaTap}
          aria-label={ctaText}
        >
          <span className="cta-text">{ctaText}</span>
          <div className="cta-arrow">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path 
                d="M6 4L10 8L6 12" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </button>
      </div>

      {/* Decorative elements */}
      <div className="hero-decoration">
        <div className="decoration-circle circle-1"></div>
        <div className="decoration-circle circle-2"></div>
        <div className="decoration-circle circle-3"></div>
      </div>
    </div>
  );
};