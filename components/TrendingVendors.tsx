import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import './TrendingVendors.css';

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  rating: number;
  vendorId: string;
  description?: string;
  isAvailable: boolean;
  category: string;
}

interface Vendor {
  id: string;
  vendorId: string;
  name: string;
  profileImage: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: number;
  isOnline?: boolean;
  categories?: string[];
}

interface TrendingVendorsProps {
  title: string;
  vendors: Vendor[];
  onVendorTap?: (vendor: Vendor) => void;
  onProductTap?: (product: Product) => void;
}

export const TrendingVendors: React.FC<TrendingVendorsProps> = ({
  title,
  vendors,
  onVendorTap,
  onProductTap
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // No useEffect needed since vendors are passed as props

  const handleVendorClick = (vendor: Vendor) => {
    if (onVendorTap) {
      onVendorTap(vendor);
    }
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -280, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    }
  };



  if (loading) {
    return (
      <div className="trending-vendors">
        <div className="trending-header">
          <h3 className="section-title">{title}</h3>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Loading trending products...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trending-vendors">
        <div className="trending-header">
          <h3 className="section-title">{title}</h3>
        </div>
        <div className="error-state">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="trending-vendors">
        <div className="trending-header">
          <h3 className="section-title">{title}</h3>
        </div>
        <div className="empty-state">
          <span>No trending vendors available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="trending-vendors">
      <div className="trending-header">
        <h3 className="section-title">{title}</h3>
        <div className="scroll-controls">
          <button 
            className="scroll-btn scroll-left"
            onClick={scrollLeft}
            aria-label="Scroll left"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path 
                d="M10 12L6 8L10 4" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button 
            className="scroll-btn scroll-right"
            onClick={scrollRight}
            aria-label="Scroll right"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path 
                d="M6 4L10 8L6 12" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="vendors-scroll" ref={scrollRef}>
        <div className="vendors-list">
          {vendors.map((vendor) => {
            // Validate vendor has required fields before rendering
            if (!vendor.name || !vendor.profileImage) {
              return null;
            }
            
            return (
              <div
                key={vendor.vendorId || vendor.id}
                className={`vendor-card ${!vendor.isOnline ? 'closed' : ''}`}
                onClick={() => handleVendorClick(vendor)}
              >
                {/* Vendor Image */}
                <div className="vendor-image">
                  <img 
                    src={vendor.profileImage} 
                    alt={vendor.name}
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-vendor.jpg';
                    }}
                  />
                  
                  {/* Rating Badge */}
                  <div className="rating-badge">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path 
                        d="M6 1L7.545 4.13L11 4.635L8.5 7.07L9.09 10.5L6 8.885L2.91 10.5L3.5 7.07L1 4.635L4.455 4.13L6 1Z" 
                        fill="#FFD700"
                      />
                    </svg>
                    <span>{vendor.rating.toFixed(1)}</span>
                  </div>

                  {/* Offline Overlay */}
                  {!vendor.isOnline && (
                    <div className="closed-overlay">
                      <span>Offline</span>
                    </div>
                  )}
                </div>

                {/* Vendor Info */}
                <div className="vendor-info">
                  <div className="vendor-header">
                    <h4 className="vendor-name">{vendor.name}</h4>
                  </div>
                  
                  {/* Delivery Info */}
                  <div className="delivery-info">
                    <div className="delivery-time">
                      <span>{vendor.deliveryTime}</span>
                    </div>
                    <div className="delivery-fee">
                      <span>₦{vendor.deliveryFee}</span>
                    </div>
                  </div>
                  
                  {/* Categories */}
                  {vendor.categories && vendor.categories.length > 0 && (
                    <div className="vendor-categories">
                      <span>{vendor.categories[0]}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* See All Card */}
          <div className="vendor-card see-all-card">
            <div className="see-all-content">
              <div className="see-all-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14" stroke="#E83A2E" strokeWidth="2"/>
                  <path 
                    d="M12 16H20M16 12V20" 
                    stroke="#E83A2E" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="see-all-text">See All</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};