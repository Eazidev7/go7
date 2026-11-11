import React from 'react';
import { useCartStore } from '../store/cartStore';

const VendorSwitchModal = () => {
  const { 
    isVendorModalOpen, 
    vendorInfo, 
    confirmVendorSwitch, 
    cancelVendorSwitch 
  } = useCartStore();

  if (!isVendorModalOpen || !vendorInfo?.pendingProduct) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
      }}>
        <h2 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#1a1a1a',
          textAlign: 'center'
        }}>
          Switch Vendor?
        </h2>
        
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '14px',
          color: '#666',
          textAlign: 'center',
          lineHeight: '1.5'
        }}>
          You already have items from <strong>{vendorInfo.currentVendor}</strong>.
          <br />
          Clear cart to order from <strong>{vendorInfo.newVendor}</strong>?
        </p>

        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={cancelVendorSwitch}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: 'white',
              color: '#666',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#f5f5f5';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'white';
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={confirmVendorSwitch}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#E0001B',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#c8001a';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#E0001B';
            }}
          >
            Clear & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorSwitchModal;