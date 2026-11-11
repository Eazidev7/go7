import React, { useState, useEffect, useReducer } from 'react';
import { useCart } from '../contexts/CartContext';
import { showGo7Success } from '../utils/go7Notifications';
import './PremiumAddonModal.scss';

// Simple cart reducer for addon quantities
const addonReducer = (state, action) => {
  switch (action.type) {
    case 'INITIALIZE_ADDONS':
      return action.payload.reduce((acc, addon) => ({
        ...acc,
        [addon.id]: { ...addon, selectedQty: 0 }
      }), {});
    
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        [action.addonId]: {
          ...state[action.addonId],
          selectedQty: Math.max(0, (state[action.addonId]?.selectedQty || 0) + action.delta)
        }
      };
    
    case 'RESET_QUANTITIES':
      return Object.keys(state).reduce((acc, key) => ({
        ...acc,
        [key]: { ...state[key], selectedQty: 0 }
      }), {});
    
    default:
      return state;
  }
};

const PremiumAddonModal = ({ 
  open, 
  onClose, 
  product, 
  addons: initialAddons = [], 
  onAddToCart 
}) => {
  const [addonState, dispatch] = useReducer(addonReducer, {});
  const { addToCart } = useCart();

  // Initialize addons when modal opens or product changes
  useEffect(() => {
    if (!open || !product) return;
    
    // Get addons from product (support both addons and addOns fields)
    const productAddons = Array.isArray(product.addons) 
      ? product.addons 
      : Array.isArray(product.addOns) 
      ? product.addOns 
      : initialAddons;

    // Normalize addon data structure
    const normalizedAddons = productAddons.map(addon => {
      const imageUrl = addon.imageUrl || addon.image || addon.img || addon.addonImageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMTIiIGZpbGw9IiNmM2Y0ZjYiLz4KPGNpcmNsZSBjeD0iMjQiIGN5PSIxOCIgcj0iNSIgZmlsbD0iIzljYTNhZiIvPgo8cGF0aCBkPSJNMTQgMzRjMC01LjUgNC41LTEwIDEwLTEwczEwIDQuNSAxMCAxMEgxNHoiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+';
      
      console.log('🖼️ Addon Image Debug:', {
        name: addon.name || addon.title,
        originalAddon: addon,
        resolvedImageUrl: imageUrl
      });
      
      return {
        id: addon.id || `addon-${Math.random().toString(36).substr(2, 9)}`,
        name: addon.name || addon.title,
        title: addon.name || addon.title,
        unitLabel: addon.unitLabel || 'each',
        price: addon.price || 0,
        imageUrl: imageUrl,
        category: addon.category || 'default'
      };
    });

    dispatch({ type: 'INITIALIZE_ADDONS', payload: normalizedAddons });
  }, [open, product, initialAddons]);

  if (!open || !product) return null;

  // Calculate totals
  const basePrice = product.price || 0;
  const selectedAddons = Object.values(addonState).filter(addon => addon.selectedQty > 0);
  const addonsTotal = selectedAddons.reduce((sum, addon) => sum + (addon.selectedQty * addon.price), 0);
  const grandTotal = basePrice + addonsTotal;

  // Handle quantity changes
  const handleQuantityChange = (addonId, delta) => {
    dispatch({ type: 'UPDATE_QUANTITY', addonId, delta });
  };

  // Handle add to cart
  const handleAddToCart = () => {
    const cartItem = {
      id: product.id,
      name: product.name,
      price: basePrice,
      image: product.image || product.imageUrl,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
      quantity: 1,
      addOns: selectedAddons.map(addon => ({
        id: addon.id,
        name: addon.name,
        price: addon.price,
        qty: addon.selectedQty
      }))
    };

    addToCart(cartItem);
    showGo7Success(`${product.name} added to cart!`);
    
    // Call custom onAddToCart if provided
    if (onAddToCart) {
      onAddToCart(cartItem);
    }
    
    // Reset quantities and close modal
    dispatch({ type: 'RESET_QUANTITIES' });
    onClose();
  };

  // Handle swipe to dismiss (basic touch support)
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    e.currentTarget.touchStartY = touch.clientY;
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const deltaY = touch.clientY - e.currentTarget.touchStartY;
    if (deltaY > 100) { // Swipe down threshold
      onClose();
    }
  };

  // Handle keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  return (
    <div 
      className="premium-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="premium-modal-card"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Close Button */}
        <button 
          className="premium-modal__close"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>

        {/* Product Image */}
        <div 
          className="premium-modal__image"
          style={{ backgroundImage: `url(${product.image || product.imageUrl})` }}
          role="img"
          aria-label={product.name}
        />

        {/* Modal Body */}
        <div className="premium-modal__body">
          {/* Product Info */}
          <div className="premium-modal__header">
            <h2 id="modal-title" className="premium-modal__title">
              {product.name}
            </h2>
            <p className="premium-modal__subtitle">
              {product.vendorName} • ⭐ {product.rating || '4.5'}
            </p>
          </div>

          {/* Addons List */}
          <div className="premium-modal__addons" role="list">
            {Object.keys(addonState).length === 0 ? (
              <div className="premium-modal__no-addons">
                <div className="premium-modal__empty-state">
                  <span className="premium-modal__empty-icon">🍽️</span>
                  <p>No add-ons available for this item</p>
                </div>
              </div>
            ) : (
              Object.values(addonState).map((addon) => (
                <div key={addon.id} className="premium-modal__addon-row" role="listitem">
                  {/* Addon Image */}
                  <div className="premium-modal__addon-image">
                    <img 
                      src={addon.imageUrl} 
                      alt={addon.title}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMTIiIGZpbGw9IiNmM2Y0ZjYiLz4KPGNpcmNsZSBjeD0iMjQiIGN5PSIxOCIgcj0iNSIgZmlsbD0iIzljYTNhZiIvPgo8cGF0aCBkPSJNMTQgMzRjMC01LjUgNC41LTEwIDEwLTEwczEwIDQuNSAxMCAxMEgxNHoiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+';
                      }}
                    />
                  </div>

                  {/* Addon Info */}
                  <div className="premium-modal__addon-info">
                    <h4 className="premium-modal__addon-name">{addon.title}</h4>
                    <div className="premium-modal__addon-details">
                      <span className="premium-modal__unit-label">{addon.unitLabel}</span>
                      <span className="premium-modal__addon-price">₦{addon.price.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="premium-modal__quantity-controls">
                    <button 
                      className="premium-modal__qty-btn premium-modal__qty-btn--minus"
                      onClick={() => handleQuantityChange(addon.id, -1)}
                      disabled={addon.selectedQty === 0}
                      aria-label={`Decrease ${addon.title} quantity`}
                    >
                      −
                    </button>
                    <span className="premium-modal__qty-display">
                      {addon.selectedQty || 0}
                    </span>
                    <button 
                      className="premium-modal__qty-btn premium-modal__qty-btn--plus"
                      onClick={() => handleQuantityChange(addon.id, 1)}
                      aria-label={`Increase ${addon.title} quantity`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="premium-modal__footer">
            <div className="premium-modal__total">
              Total ₦{grandTotal.toLocaleString()}
            </div>
            <button 
              className="premium-modal__add-to-cart"
              onClick={handleAddToCart}
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PremiumAddonModal;