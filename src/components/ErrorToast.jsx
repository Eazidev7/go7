import React, { useState, useEffect } from 'react';
import { useCartStore } from '../store/cartStore';

const ErrorToast = () => {
  const { error, clearError } = useCartStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setVisible(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(clearError, 300); // Clear after fade out
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  if (!error || !visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#ff4444',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 9998,
        maxWidth: '90vw',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: '500',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <span>⚠️ {error}</span>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(clearError, 300);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '16px',
          padding: '0 4px'
        }}
      >
        ×
      </button>
    </div>
  );
};

export default ErrorToast;