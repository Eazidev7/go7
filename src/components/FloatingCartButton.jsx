import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';

const FloatingCartButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getItemCount } = useCartStore();
  
  const [itemCount, setItemCount] = useState(0);
  const [animate, setAnimate] = useState(false);

  // Hide FAB on checkout page
  const shouldHide = location.pathname === '/cart' || location.pathname === '/checkout';

  // Subscribe to cart changes
  useEffect(() => {
    const unsubscribe = useCartStore.subscribe((state) => {
      const newCount = state.getItemCount();
      
      // Trigger animation when items are added
      if (newCount > itemCount) {
        setAnimate(true);
        setTimeout(() => setAnimate(false), 300);
      }
      
      setItemCount(newCount);
    });

    // Initial count
    setItemCount(getItemCount());

    return unsubscribe;
  }, [itemCount, getItemCount]);

  if (shouldHide || itemCount === 0) {
    return null;
  }

  const handleClick = () => {
    navigate('/cart');
  };

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: '100px', // Above bottom nav
        right: '20px',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: '#E0001B',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(224, 0, 27, 0.4)',
        zIndex: 1000,
        transition: 'all 0.3s ease',
        transform: animate ? 'scale(1.2)' : 'scale(1)'
      }}
      onMouseOver={(e) => {
        if (!animate) {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.backgroundColor = '#c8001a';
        }
      }}
      onMouseOut={(e) => {
        if (!animate) {
          e.target.style.transform = 'scale(1)';
          e.target.style.backgroundColor = '#E0001B';
        }
      }}
    >
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Cart icon */}
        <span style={{
          fontSize: '24px',
          color: 'white'
        }}>
          🛒
        </span>
        
        {/* Item count badge */}
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          backgroundColor: 'white',
          color: '#E0001B',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: '600',
          border: '2px solid #E0001B'
        }}>
          {itemCount}
        </div>
      </div>
    </button>
  );
};

export default FloatingCartButton;