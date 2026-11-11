// 🎠 VENDOR CAROUSEL COMPONENT — Horizontal scroll (Nov 2025)

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Star, Clock, Bike } from 'lucide-react';
import './VendorCarousel.css';

export default function VendorCarousel({ title, vendors, viewAllLink }) {
  const navigate = useNavigate();

  if (!vendors || vendors.length === 0) return null;

  const handleVendorClick = (vendor) => {
    if (vendor.isOnline) {
      navigate(`/vendor/${vendor.id}`);
    }
  };

  return (
    <div className="carousel-section">
      <div className="carousel-header">
        <h2>{title}</h2>
        {viewAllLink && (
          <button
            className="view-all-link"
            onClick={() => navigate(viewAllLink)}
          >
            See all
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      <div className="carousel-container">
        {vendors.map((vendor) => (
          <div
            key={vendor.id}
            className={`vendor-carousel-card ${!vendor.isOnline ? 'offline' : ''}`}
            onClick={() => handleVendorClick(vendor)}
          >
            {/* Image */}
            <div className="vendor-carousel-image">
              <img src={vendor.image || '/placeholder-vendor.png'} alt={vendor.businessName || vendor.name} />
              {!vendor.isOnline && (
                <div className="offline-overlay">
                  <span className="closed-badge">Closed</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="vendor-carousel-info">
              <h3 className="vendor-carousel-name">{vendor.businessName || vendor.name}</h3>
              
              {/* Rating & Delivery Time */}
              <div className="vendor-carousel-meta">
                {vendor.rating && (
                  <div className="vendor-rating-badge">
                    <Star size={12} fill="#FFD700" color="#FFD700" />
                    <span>{vendor.rating.toFixed(1)}</span>
                  </div>
                )}
                
                {vendor.deliveryTime && (
                  <div className="vendor-time-badge">
                    <Clock size={12} />
                    <span>{vendor.deliveryTime} min</span>
                  </div>
                )}
              </div>

              {/* Delivery Fee */}
              {vendor.deliveryFee !== undefined && (
                <div className="vendor-delivery-fee">
                  <Bike size={12} />
                  <span>
                    {vendor.deliveryFee === 0
                      ? 'Free delivery'
                      : `₦${vendor.deliveryFee.toLocaleString()}`}
                  </span>
                </div>
              )}

              {/* Category Badge */}
              {vendor.vendorType && (
                <div className="vendor-type-badge">
                  {vendor.vendorType}
                </div>
              )}

              {/* Unavailable Button */}
              {!vendor.isOnline && (
                <button className="unavailable-badge" disabled>
                  Unavailable
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
