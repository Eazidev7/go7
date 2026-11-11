// 🚀 GO7 VENDOR CARD COMPONENT — Nov 2025
// Displays individual vendor with online/offline status

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, MapPin } from 'lucide-react';
import './VendorCard.css';
import { resolveVendorImage } from '../utils/vendorImage';
import { getVendorPlaceholder } from '../utils/placeholderImages';

export default function VendorCard({ vendor, showStatus = true, showProductCount = false, productCount = 0 }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/vendor/${vendor.id}`);
  };

  const imageSrc = resolveVendorImage(vendor) || getVendorPlaceholder();

  const formatDeliveryTime = (time) => {
    if (!time) return 'N/A';
    return `${time} min`;
  };

  return (
    <div
      className={`vendor-card ${!vendor.isOnline ? 'offline' : ''}`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Vendor Image */}
      <div className="vendor-image-container">
        <img
          src={imageSrc}
          alt={vendor.name}
          className="vendor-image"
          onError={(e) => {
            e.currentTarget.src = getVendorPlaceholder();
          }}
        />
        {!vendor.isOnline && (
          <div className="offline-overlay">
            <span className="offline-badge">Closed</span>
          </div>
        )}
        {vendor.isOnline && showStatus && (
          <div className="online-badge">Open</div>
        )}
      </div>

      {/* Vendor Info */}
      <div className="vendor-info">
        <h3 className="vendor-name">{vendor.businessName || vendor.name}</h3>

        {/* Rating & Delivery Time */}
        <div className="vendor-meta">
          {vendor.rating && (
            <div className="vendor-rating">
              <Star size={14} fill="#FFD700" color="#FFD700" />
              <span>{vendor.rating.toFixed(1)}</span>
            </div>
          )}

          {vendor.deliveryTime && (
            <div className="vendor-delivery-time">
              <Clock size={14} />
              <span>{formatDeliveryTime(vendor.deliveryTime)}</span>
            </div>
          )}
        </div>

        {/* Location */}
        {vendor.location && (
          <div className="vendor-location">
            <MapPin size={12} />
            <span>{vendor.location}</span>
          </div>
        )}

        {/* Category Badge */}
        {vendor.vendorType && (
          <div className="vendor-category-badge">
            {vendor.vendorType}
          </div>
        )}

        {/* Product Count Badge (V2 System) */}
        {showProductCount && productCount > 0 && (
          <div className="vendor-products-badge">
            {productCount} product{productCount !== 1 ? 's' : ''}
          </div>
        )}

        {/* Offline Button */}
        {!vendor.isOnline && (
          <button className="unavailable-btn" disabled>
            Currently Unavailable
          </button>
        )}
      </div>
    </div>
  );
}
