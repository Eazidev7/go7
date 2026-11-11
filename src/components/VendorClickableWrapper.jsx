import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * VendorClickableWrapper - Universal wrapper for all vendor cards
 * Makes any vendor card clickable and navigates to vendor detail page
 * 
 * @param {Object} vendor - Vendor object with vendorId or id
 * @param {React.ReactNode} children - The vendor card UI to wrap
 * @param {string} className - Optional additional CSS classes
 */
const VendorClickableWrapper = ({ vendor, children, className = '' }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const vendorId = vendor?.vendorId || vendor?.id;
    
    if (!vendorId) {
      console.warn('⚠️ VendorClickableWrapper: No vendorId found in vendor object:', vendor);
      return;
    }
    
    console.log('🔗 Navigating to vendor:', vendorId);
    navigate(`/vendor/${vendorId}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer ${className}`.trim()}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </div>
  );
};

export default VendorClickableWrapper;
