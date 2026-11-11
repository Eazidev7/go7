import React from 'react';
import './VendorCardSkeleton.css';

const VendorCardSkeleton = () => {
  return (
    <div className="vendor-card-skeleton">
      <div className="skeleton-image"></div>
      <div className="skeleton-content">
        <div className="skeleton-title"></div>
        <div className="skeleton-meta">
          <div className="skeleton-rating"></div>
          <div className="skeleton-time"></div>
        </div>
        <div className="skeleton-location"></div>
        <div className="skeleton-category"></div>
      </div>
    </div>
  );
};

export default VendorCardSkeleton;
