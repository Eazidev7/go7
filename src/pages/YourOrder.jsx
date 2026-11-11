import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import CheckoutProgress from '../components/CheckoutProgress';
import VendorConflictModal from '../components/VendorConflictModal';
import './YourOrder.css';

const YourOrder = () => {
  const navigate = useNavigate();
  const { 
    cartItems, 
    cartTotal, 
    cartCount,
    updateQuantity, 
    removeItem,
    showVendorConflict,
    conflictData,
    forceAddToCart,
    dismissVendorConflict,
    getCurrentVendor
  } = useCart();
  
  const [noteForRider, setNoteForRider] = useState('');
  const [editingItem, setEditingItem] = useState(null);

  const currentVendor = getCurrentVendor();

  const handleQuantityChange = (index, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(index);
    } else {
      updateQuantity(index, newQuantity);
    }
  };

  const handleEditSelections = (item, index) => {
    setEditingItem({ item, index });
    // In a real app, this would open a modal to edit add-ons
    console.log('Edit selections for:', item);
  };

  const handleContinueToPayment = () => {
    if (cartItems.length === 0) return;
    
    // Store note for rider in session/local storage
    sessionStorage.setItem('go7_rider_note', noteForRider);
    
    navigate('/checkout/payment');
  };

  const formatPrice = (price) => {
    return `₦${parseFloat(price || 0).toLocaleString()}`;
  };

  if (cartItems.length === 0) {
    return (
      <div className="your-order-page">
        <CheckoutProgress currentStep={1} />
        <div className="empty-cart">
          <div className="empty-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Add some delicious items to get started!</p>
          <button 
            className="btn-primary"
            onClick={() => navigate('/explore')}
          >
            Start Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="your-order-page">
      <CheckoutProgress currentStep={1} />
      
      <div className="order-content">
        {/* Vendor Header */}
        {currentVendor && (
          <div className="vendor-header">
            <div className="vendor-info">
              <div className="vendor-avatar">
                {(currentVendor.businessName || currentVendor.name).charAt(0)}
              </div>
              <div className="vendor-details">
                <h2 className="vendor-name">{currentVendor.businessName || currentVendor.name}</h2>
                <p className="items-summary">{cartCount} item{cartCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        )}

        {/* Order Items List */}
        <div className="order-items">
          <h3 className="section-title">Your Order</h3>
          
          {cartItems.map((item, index) => (
            <div key={`${item.id}-${index}`} className="order-item">
              <div className="item-image">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} />
                ) : (
                  <div className="image-placeholder">
                    {item.name.charAt(0)}
                  </div>
                )}
              </div>
              
              <div className="item-details">
                <h4 className="item-name">{item.name}</h4>
                
                {/* Add-ons/Options */}
                {item.options && Object.keys(item.options).length > 0 && (
                  <div className="item-selections">
                    <p className="selections-label">Your Selections:</p>
                    {Object.entries(item.options).map(([optionName, optionValue]) => (
                      <div key={optionName} className="selection-item">
                        <span>{optionName}: {optionValue}</span>
                        {item.optionPrices && item.optionPrices[optionName] && (
                          <span className="selection-price">
                            +{formatPrice(item.optionPrices[optionName])}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Item Actions */}
                <div className="item-actions">
                  <button 
                    className="edit-btn"
                    onClick={() => handleEditSelections(item, index)}
                  >
                    ✏️ Edit selections
                  </button>
                  
                  <button 
                    className="delete-btn"
                    onClick={() => removeItem(index)}
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
              
              <div className="item-controls">
                <div className="quantity-controls">
                  <button 
                    className="qty-btn"
                    onClick={() => handleQuantityChange(index, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="quantity">{item.quantity}</span>
                  <button 
                    className="qty-btn"
                    onClick={() => handleQuantityChange(index, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                
                <div className="item-total">
                  {formatPrice(item.totalPrice)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Note for Rider */}
        <div className="rider-note-section">
          <label className="section-title" htmlFor="riderNote">
            Note for Rider (Optional)
          </label>
          <textarea
            id="riderNote"
            className="rider-note-input"
            placeholder="Any special instructions for delivery..."
            value={noteForRider}
            onChange={(e) => setNoteForRider(e.target.value)}
            maxLength={200}
          />
          <div className="char-count">{noteForRider.length}/200</div>
        </div>

        {/* Order Summary */}
        <div className="order-summary">
          <div className="summary-row">
            <span>Subtotal ({cartCount} item{cartCount !== 1 ? 's' : ''})</span>
            <span className="summary-price">{formatPrice(cartTotal)}</span>
          </div>
        </div>

        {/* Continue Button */}
        <div className="checkout-actions">
          <button 
            className="continue-btn"
            onClick={handleContinueToPayment}
            disabled={cartItems.length === 0}
          >
            Continue to Delivery & Payment
          </button>
        </div>
      </div>

      {/* Vendor Conflict Modal */}
      <VendorConflictModal
        isOpen={showVendorConflict}
        currentVendor={conflictData?.currentVendor}
        newVendor={conflictData?.newVendor}
        onClearCart={() => conflictData && forceAddToCart(conflictData.newProduct)}
        onCancel={dismissVendorConflict}
      />
    </div>
  );
};

export default YourOrder;