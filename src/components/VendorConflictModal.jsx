import React from 'react';
import './VendorConflictModal.css';

const VendorConflictModal = ({ 
  isOpen, 
  currentVendor, 
  newVendor, 
  onClearCart, 
  onCancel 
}) => {
  if (!isOpen) return null;

  return (
    <div className="vendor-conflict-overlay">
      <div className="vendor-conflict-modal">
        <div className="conflict-icon">⚠️</div>
        
        <h3 className="conflict-title">Different Vendor</h3>
        
        <p className="conflict-message">
          You already have items from <strong>{currentVendor}</strong> in your cart. 
          You can only order from one vendor at a time.
        </p>
        
        <div className="vendor-info">
          <div className="vendor-change">
            <span className="vendor-label">Switch to:</span>
            <strong>{newVendor}</strong>
          </div>
        </div>
        
        <div className="conflict-actions">
          <button 
            className="btn-secondary"
            onClick={onCancel}
          >
            Continue with {currentVendor}
          </button>
          
          <button 
            className="btn-primary"
            onClick={onClearCart}
          >
            Clear Cart & Switch
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorConflictModal;