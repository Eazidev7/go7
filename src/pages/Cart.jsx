import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuthContext } from '../contexts/AuthContext';
import { calculateDeliveryFeeSplit } from '../utils/deliveryFeeSplit';
import { buildFoodOrderPricing } from '../utils/orderPricing';
import { 
  FiShoppingCart, 
  FiTrash2, 
  FiPlus, 
  FiMinus,
  FiArrowLeft,
  FiCreditCard,
  FiMapPin,
  FiClock,
  FiCheckCircle,
  FiChevronDown
} from 'react-icons/fi';

// Go7 Notification System
import {
  showGo7Success,
  showGo7Error,
  showGo7Toast,
  showGo7Warning
} from '../utils/go7Notifications';
import Swal from 'sweetalert2';

// Firestore
import { db } from '../config/firebase';
import { 
  doc, 
  collection, 
  addDoc, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';

const Cart = () => {
  const navigate = useNavigate();
  const { 
    cartItems, 
    cartTotal, 
    cartCount,
    loading: cartLoading,
    updateQuantity,
    removeItem,
    clearCart,
    hasMultipleVendors,
    itemsByVendor 
  } = useCart();
  
  const { currentUser } = useAuthContext();
  
  // State for checkout process
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [deliveryOption, setDeliveryOption] = useState('standard');
  const [couponCode, setCouponCode] = useState('');
  const [validCoupon, setValidCoupon] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState(5.99); // Default delivery charge
  
  // Initialize user information if logged in
  useEffect(() => {
    if (currentUser) {
      const fetchUserDetails = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setDeliveryAddress(userData.address || '');
            setPhoneNumber(userData.phone || '');
          }
        } catch (error) {
          console.error('Error fetching user details:', error);
        }
      };
      
      fetchUserDetails();
    }
  }, [currentUser]);
  
  // Apply coupon code
  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      showGo7Warning('Please enter a coupon code');
      return;
    }
    
    try {
      // Check coupon in Firestore
      const couponDoc = await getDoc(doc(db, 'coupons', couponCode.toUpperCase()));
      
      if (couponDoc.exists()) {
        const couponData = couponDoc.data();
        
        // Check if coupon is valid
        const now = new Date();
        if (couponData.expiresAt && couponData.expiresAt.toDate() < now) {
          showGo7Error('This coupon has expired');
          setValidCoupon(null);
          return;
        }
        
        // Check if minimum purchase is met
        if (couponData.minimumPurchase && cartTotal < couponData.minimumPurchase) {
          showGo7Error(`This coupon requires a minimum purchase of $${couponData.minimumPurchase}`);
          setValidCoupon(null);
          return;
        }
        
        // Check if vendor restrictions apply
        if (couponData.vendorId) {
          const vendorItems = cartItems.filter(item => item.vendorId === couponData.vendorId);
          if (vendorItems.length === 0) {
            showGo7Error('This coupon is only valid for specific vendors');
            setValidCoupon(null);
            return;
          }
        }
        
        // Valid coupon
        setValidCoupon(couponData);
        showGo7Success(`Coupon applied: ${couponData.description || 'Discount coupon'}`);
      } else {
        showGo7Error('Invalid coupon code');
        setValidCoupon(null);
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      showGo7Error('Error applying coupon');
    }
  };
  
  // Calculate discount amount
  const calculateDiscount = () => {
    if (!validCoupon) return 0;
    
    let discount = 0;
    
    if (validCoupon.type === 'percentage') {
      discount = (cartTotal * validCoupon.value) / 100;
    } else if (validCoupon.type === 'fixed') {
      discount = validCoupon.value;
    }
    
    // Check if there's a maximum discount
    if (validCoupon.maxDiscount && discount > validCoupon.maxDiscount) {
      discount = validCoupon.maxDiscount;
    }
    
    return discount;
  };
  
  // Calculate total with discounts, delivery, and platform fee
  const cartPricing = useMemo(() => {
    const delivery = deliveryOption === 'express' ? deliveryCharge * 2 : deliveryCharge;
    const itemTotal = Math.max(0, cartTotal - calculateDiscount());
    return buildFoodOrderPricing({ itemTotal, deliveryFee: delivery });
  }, [cartTotal, deliveryOption, deliveryCharge, validCoupon, couponCode]);

  const calculateTotal = () => cartPricing.grandTotal;
  
  // Handle checkout
  const handleCheckout = async () => {
    if (!currentUser) {
      // Redirect to login first
      Swal.fire({
        title: 'Login Required',
        text: 'Please login to checkout',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Login Now',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/login', { state: { returnPath: '/cart' } });
        }
      });
      return;
    }
    
    // Validate required fields
    if (!deliveryAddress) {
      showGo7Warning('Please enter your delivery address');
      return;
    }
    
    if (!phoneNumber) {
      showGo7Warning('Please enter your phone number');
      return;
    }
    
    // Show confirmation
    const result = await Swal.fire({
      title: 'Confirm Order',
      text: `Your order total is $${calculateTotal().toFixed(2)}. Proceed with checkout?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Place Order',
      cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
      try {
        setIsProcessing(true);
        
        // Group items by vendor
        const groupedItems = itemsByVendor();
        
        // Create orders in Firestore
        const orderIds = [];
        
        for (const vendorId in groupedItems) {
          const vendorGroup = groupedItems[vendorId];
          const vendorCount = Object.keys(groupedItems).length;
          const itemSubtotal = vendorGroup.items.reduce((sum, item) => sum + item.totalPrice, 0);
          const discountShare = validCoupon ? calculateDiscount() / vendorCount : 0;
          const deliveryShare = (deliveryOption === 'express' ? deliveryCharge * 2 : deliveryCharge) / vendorCount;
          const pricing = buildFoodOrderPricing({
            itemTotal: Math.max(0, itemSubtotal - discountShare),
            deliveryFee: deliveryShare,
          });

          const orderData = {
            customerId: currentUser.uid,
            customerName: currentUser.displayName || 'Customer',
            customerEmail: currentUser.email,
            customerPhone: phoneNumber,
            items: vendorGroup.items,
            vendorId,
            vendorName: vendorGroup.vendorName,
            status: 'pending',
            orderType: 'food',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            subtotal: itemSubtotal,
            itemTotal: pricing.itemTotal,
            discount: discountShare,
            deliveryFee: pricing.deliveryFee,
            deliveryCharge: pricing.deliveryFee,
            platformFee: pricing.platformFee,
            grandTotal: pricing.grandTotal,
            total: pricing.grandTotal,
            feeBreakdown: pricing.feeBreakdown,
            ...calculateDeliveryFeeSplit(pricing.deliveryFee),
            paymentMethod,
            deliveryOption,
            deliveryAddress,
            deliveryNotes,
            couponCode: validCoupon ? couponCode : null
          };
          
          const orderRef = await addDoc(collection(db, 'orders'), orderData);
          orderIds.push(orderRef.id);
        }
        
        // Clear cart after successful order
        clearCart();
        
        // Show success message
        Swal.fire({
          title: 'Order Placed!',
          text: `Your order has been placed successfully. ${orderIds.length > 1 ? `${orderIds.length} separate orders were created.` : ''}`,
          icon: 'success',
          confirmButtonText: 'View Orders'
        }).then(() => {
          navigate('/orders');
        });
      } catch (error) {
        console.error('Error placing order:', error);
        showGo7Error('Failed to place your order. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };
  
  // Handle quantity updates
  const handleQuantityChange = (index, newQuantity) => {
    if (newQuantity < 1) return;
    updateQuantity(index, newQuantity);
  };
  
  // Handle item removal
  const handleRemoveItem = (index) => {
    Swal.fire({
      title: 'Remove Item',
      text: 'Are you sure you want to remove this item from your cart?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove it',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        removeItem(index);
      }
    });
  };
  
  if (cartLoading) {
    return <div className="loading-container">Loading cart...</div>;
  }
  
  return (
    <div className="cart-page-container">
      <div className="page-header">
        <h1>
          <FiShoppingCart /> 
          Shopping Cart
          {cartCount > 0 && <span className="item-count">({cartCount})</span>}
        </h1>
      </div>
      
      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">
            <FiShoppingCart size={60} />
          </div>
          <h2>Your cart is empty</h2>
          <p>Add some delicious items to your cart and get started!</p>
          <Link to="/explore" className="browse-products-btn">
            Browse Products
          </Link>
        </div>
      ) : isCheckingOut ? (
        <div className="checkout-container">
          <button 
            className="back-to-cart"
            onClick={() => setIsCheckingOut(false)}
          >
            <FiArrowLeft /> Back to Cart
          </button>
          
          <div className="checkout-form">
            <h2>Checkout Details</h2>
            
            <div className="form-section">
              <h3>Delivery Information</h3>
              
              <div className="form-group">
                <label htmlFor="deliveryAddress">Delivery Address *</label>
                <div className="address-input">
                  <FiMapPin className="input-icon" />
                  <input
                    id="deliveryAddress"
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter your full delivery address"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number *</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="deliveryNotes">Delivery Notes (Optional)</label>
                <textarea
                  id="deliveryNotes"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Add any special instructions for delivery"
                  rows="3"
                />
              </div>
              
              <div className="form-group delivery-options">
                <label>Delivery Options</label>
                <div className="delivery-option-cards">
                  <div 
                    className={`delivery-option-card ${deliveryOption === 'standard' ? 'selected' : ''}`}
                    onClick={() => setDeliveryOption('standard')}
                  >
                    <div className="option-details">
                      <div className="option-header">
                        <div className="option-radio">
                          {deliveryOption === 'standard' && <div className="radio-selected" />}
                        </div>
                        <h4>Standard Delivery</h4>
                      </div>
                      <div className="option-description">
                        <FiClock /> 45-60 minutes
                      </div>
                      <div className="option-price">${deliveryCharge.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div 
                    className={`delivery-option-card ${deliveryOption === 'express' ? 'selected' : ''}`}
                    onClick={() => setDeliveryOption('express')}
                  >
                    <div className="option-details">
                      <div className="option-header">
                        <div className="option-radio">
                          {deliveryOption === 'express' && <div className="radio-selected" />}
                        </div>
                        <h4>Express Delivery</h4>
                      </div>
                      <div className="option-description">
                        <FiClock /> 20-30 minutes
                      </div>
                      <div className="option-price">${(deliveryCharge * 2).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="form-section">
              <h3>Payment Method</h3>
              <div className="payment-methods">
                <div 
                  className={`payment-method-card ${paymentMethod === 'cash' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <div className="payment-method-radio">
                    {paymentMethod === 'cash' && <div className="radio-selected" />}
                  </div>
                  <div className="payment-method-details">
                    <h4>Cash on Delivery</h4>
                    <div className="payment-description">Pay with cash when your order arrives</div>
                  </div>
                </div>
                
                <div 
                  className={`payment-method-card ${paymentMethod === 'card' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <div className="payment-method-radio">
                    {paymentMethod === 'card' && <div className="radio-selected" />}
                  </div>
                  <div className="payment-method-details">
                    <h4>Card Payment</h4>
                    <div className="payment-description">Pay now with your credit or debit card</div>
                    <div className="payment-icons">
                      <FiCreditCard />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="form-section">
              <h3>Promo Code</h3>
              <div className="promo-code-input">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter promo code"
                />
                <button 
                  onClick={applyCoupon}
                  className={validCoupon ? 'applied' : ''}
                >
                  {validCoupon ? 'Applied' : 'Apply'}
                </button>
              </div>
              
              {validCoupon && (
                <div className="coupon-applied">
                  <FiCheckCircle className="check-icon" />
                  <div className="coupon-details">
                    <div className="coupon-name">{validCoupon.description || 'Discount Coupon'}</div>
                    <div className="coupon-description">
                      {validCoupon.type === 'percentage' 
                        ? `${validCoupon.value}% off`
                        : `$${validCoupon.value} off`}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="order-summary-section">
              <h3>Order Summary</h3>
              <div className="summary-line">
                <span>Subtotal</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              
              {validCoupon && (
                <div className="summary-line discount">
                  <span>Discount</span>
                  <span>-${calculateDiscount().toFixed(2)}</span>
                </div>
              )}
              
              <div className="summary-line">
                <span>Delivery Fee</span>
                <span>${cartPricing.deliveryFee.toFixed(2)}</span>
              </div>

              {cartPricing.platformFee > 0 && (
                <div className="summary-line">
                  <span>Platform Fee ({Math.round(cartPricing.platformFeeRate * 100)}%)</span>
                  <span>${cartPricing.platformFee.toFixed(2)}</span>
                </div>
              )}
              
              <div className="summary-total">
                <span>Grand Total</span>
                <span>${cartPricing.grandTotal.toFixed(2)}</span>
              </div>
            </div>
            
            <button 
              className="place-order-btn"
              onClick={handleCheckout}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Place Order'}
            </button>
            
            {hasMultipleVendors() && (
              <div className="multiple-vendors-note">
                <p>
                  Note: Your items are from multiple vendors. 
                  Separate orders will be created for each vendor.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="cart-content">
          <div className="cart-items-container">
            <h2>Cart Items</h2>
            
            {hasMultipleVendors() && (
              <div className="vendor-notice">
                <p>Items in your cart are from multiple vendors and will be processed as separate orders.</p>
              </div>
            )}
            
            {Object.values(itemsByVendor()).map((vendorGroup, groupIndex) => (
              <div key={groupIndex} className="vendor-group">
                <div className="vendor-header">
                  <h3>{vendorGroup.vendorName || 'Unknown Vendor'}</h3>
                </div>
                
                {vendorGroup.items.map((item, itemIndex) => {
                  const index = cartItems.findIndex(cartItem => 
                    cartItem.id === item.id && JSON.stringify(cartItem.options) === JSON.stringify(item.options)
                  );
                  
                  return (
                    <div key={`${item.id}-${itemIndex}`} className="cart-item">
                      <div className="item-image">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} />
                        ) : (
                          <div className="placeholder-image">No Image</div>
                        )}
                      </div>
                      
                      <div className="item-details">
                        <h3>{item.name}</h3>
                        
                        {Object.keys(item.options || {}).length > 0 && (
                          <div className="item-options">
                            {Object.entries(item.options).map(([option, value]) => (
                              <div key={option} className="option-tag">
                                {option}: {value}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="item-price">${item.price.toFixed(2)}</div>
                      
                      <div className="item-quantity">
                        <button 
                          onClick={() => handleQuantityChange(index, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <FiMinus />
                        </button>
                        <input 
                          type="number" 
                          min="1" 
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                        />
                        <button onClick={() => handleQuantityChange(index, item.quantity + 1)}>
                          <FiPlus />
                        </button>
                      </div>
                      
                      <div className="item-total">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                      
                      <button 
                        className="remove-item"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
            
            <div className="cart-actions">
              <button className="continue-shopping" onClick={() => navigate('/explore')}>
                Continue Shopping
              </button>
              
              <button className="clear-cart" onClick={() => {
                Swal.fire({
                  title: 'Clear Cart',
                  text: 'Are you sure you want to remove all items from your cart?',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonText: 'Yes, clear cart',
                  cancelButtonText: 'Cancel'
                }).then((result) => {
                  if (result.isConfirmed) {
                    clearCart();
                  }
                });
              }}>
                Clear Cart
              </button>
            </div>
          </div>
          
          <div className="cart-summary">
            <h2>Order Summary</h2>
            
            <div className="summary-line">
              <span>Item Total</span>
              <span>${cartPricing.itemTotal.toFixed(2)}</span>
            </div>

            <div className="summary-line">
              <span>Delivery Fee</span>
              <span>${cartPricing.deliveryFee.toFixed(2)}</span>
            </div>

            {cartPricing.platformFee > 0 && (
              <div className="summary-line">
                <span>Platform Fee ({Math.round(cartPricing.platformFeeRate * 100)}%)</span>
                <span>${cartPricing.platformFee.toFixed(2)}</span>
              </div>
            )}
            
            <div className="summary-total">
              <span>Grand Total</span>
              <span>${cartPricing.grandTotal.toFixed(2)}</span>
            </div>
            
            <button 
              className="checkout-btn"
              onClick={() => setIsCheckingOut(true)}
            >
              Proceed to Checkout
            </button>
            
            <div className="delivery-info">
              <FiClock className="info-icon" />
              <div className="info-text">
                <p>Estimated Delivery Time</p>
                <p>45-60 minutes</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* CSS Styles */}
      <style jsx>{`
        .cart-page-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          padding-bottom: 100px;
        }
        
        .page-header {
          margin-bottom: 30px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eaeaea;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .page-header h1 {
          font-size: 24px;
          color: #333;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .item-count {
          font-size: 18px;
          color: #666;
          margin-left: 5px;
        }
        
        /* Empty Cart */
        .empty-cart {
          text-align: center;
          padding: 60px 20px;
          background: #f9f9f9;
          border-radius: 8px;
        }
        
        .empty-cart-icon {
          color: #999;
          margin-bottom: 20px;
        }
        
        .empty-cart h2 {
          font-size: 24px;
          color: #333;
          margin-bottom: 10px;
        }
        
        .empty-cart p {
          color: #666;
          margin-bottom: 30px;
        }
        
        .browse-products-btn {
          display: inline-block;
          padding: 12px 24px;
          background: #4caf50;
          color: white;
          border-radius: 4px;
          font-weight: 500;
          text-decoration: none;
          transition: background 0.3s;
        }
        
        .browse-products-btn:hover {
          background: #43a047;
        }
        
        /* Cart Content */
        .cart-content {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }
        
        .cart-items-container {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .cart-items-container h2 {
          font-size: 20px;
          margin-bottom: 20px;
          color: #333;
        }
        
        .vendor-notice {
          background: #fff8e1;
          border-left: 4px solid #ffc107;
          padding: 10px 15px;
          margin-bottom: 20px;
          border-radius: 0 4px 4px 0;
        }
        
        .vendor-notice p {
          margin: 0;
          font-size: 14px;
          color: #856404;
        }
        
        .vendor-group {
          margin-bottom: 20px;
        }
        
        .vendor-header {
          background: #f5f5f5;
          padding: 10px 15px;
          border-radius: 4px;
          margin-bottom: 10px;
        }
        
        .vendor-header h3 {
          font-size: 16px;
          margin: 0;
          color: #333;
        }
        
        .cart-item {
          display: grid;
          grid-template-columns: auto 2fr 1fr 1fr 1fr auto;
          align-items: center;
          gap: 15px;
          padding: 15px 0;
          border-bottom: 1px solid #eee;
        }
        
        .item-image {
          width: 80px;
          height: 80px;
          border-radius: 4px;
          overflow: hidden;
          background: #f5f5f5;
        }
        
        .item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .placeholder-image {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
          font-size: 12px;
        }
        
        .item-details h3 {
          font-size: 16px;
          margin: 0 0 5px;
          color: #333;
        }
        
        .item-options {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 5px;
        }
        
        .option-tag {
          background: #e3f2fd;
          color: #1976d2;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 3px;
        }
        
        .item-price {
          font-weight: 500;
          color: #333;
        }
        
        .item-quantity {
          display: flex;
          align-items: center;
        }
        
        .item-quantity button {
          width: 30px;
          height: 30px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
        }
        
        .item-quantity button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .item-quantity input {
          width: 40px;
          height: 30px;
          border-top: 1px solid #ddd;
          border-bottom: 1px solid #ddd;
          border-left: none;
          border-right: none;
          text-align: center;
          font-size: 14px;
        }
        
        .item-total {
          font-weight: 700;
          color: #333;
        }
        
        .remove-item {
          background: none;
          border: none;
          color: #f44336;
          cursor: pointer;
          font-size: 18px;
          padding: 5px;
        }
        
        .cart-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        
        .continue-shopping,
        .clear-cart {
          padding: 10px 15px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
        }
        
        .continue-shopping {
          background: #fff;
          color: #2196f3;
          border: 1px solid #2196f3;
        }
        
        .clear-cart {
          background: #fff;
          color: #f44336;
          border: 1px solid #f44336;
        }
        
        /* Cart Summary */
        .cart-summary {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          height: fit-content;
          position: sticky;
          top: 20px;
        }
        
        .cart-summary h2 {
          font-size: 20px;
          margin-bottom: 20px;
          color: #333;
        }
        
        .summary-line {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #eee;
          color: #666;
        }
        
        .summary-total {
          display: flex;
          justify-content: space-between;
          padding: 15px 0;
          margin-top: 10px;
          font-weight: 700;
          font-size: 18px;
          color: #333;
        }
        
        .checkout-btn {
          display: block;
          width: 100%;
          padding: 12px;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          margin-top: 20px;
          transition: background 0.3s;
        }
        
        .checkout-btn:hover {
          background: #43a047;
        }
        
        .delivery-info {
          display: flex;
          align-items: flex-start;
          margin-top: 20px;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 4px;
        }
        
        .info-icon {
          color: #2196f3;
          margin-right: 10px;
          margin-top: 3px;
          font-size: 18px;
        }
        
        .info-text p {
          margin: 0;
          font-size: 14px;
          color: #555;
        }
        
        .info-text p:first-child {
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        /* Checkout Container */
        .checkout-container {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .back-to-cart {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: none;
          border: none;
          color: #2196f3;
          cursor: pointer;
          padding: 5px 0;
          margin-bottom: 20px;
          font-weight: 500;
        }
        
        .checkout-form h2 {
          font-size: 22px;
          margin-bottom: 25px;
          color: #333;
        }
        
        .form-section {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        
        .form-section h3 {
          font-size: 18px;
          margin-bottom: 15px;
          color: #333;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #555;
        }
        
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .address-input {
          position: relative;
        }
        
        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #999;
        }
        
        .address-input input {
          padding-left: 40px;
        }
        
        .delivery-options {
          margin-top: 25px;
        }
        
        .delivery-option-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        
        .delivery-option-card {
          border: 2px solid #eee;
          border-radius: 8px;
          padding: 15px;
          cursor: pointer;
          transition: border-color 0.3s;
        }
        
        .delivery-option-card.selected {
          border-color: #2196f3;
        }
        
        .option-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        
        .option-radio {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid #ddd;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .delivery-option-card.selected .option-radio {
          border-color: #2196f3;
        }
        
        .radio-selected {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #2196f3;
        }
        
        .option-header h4 {
          margin: 0;
          font-size: 16px;
          color: #333;
        }
        
        .option-description {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 14px;
          color: #666;
          margin-bottom: 5px;
        }
        
        .option-price {
          font-weight: 500;
          color: #333;
        }
        
        .payment-methods {
          display: grid;
          gap: 15px;
        }
        
        .payment-method-card {
          display: flex;
          align-items: flex-start;
          padding: 15px;
          border: 2px solid #eee;
          border-radius: 8px;
          cursor: pointer;
          transition: border-color 0.3s;
        }
        
        .payment-method-card.selected {
          border-color: #2196f3;
        }
        
        .payment-method-radio {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid #ddd;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;
          margin-top: 3px;
        }
        
        .payment-method-card.selected .payment-method-radio {
          border-color: #2196f3;
        }
        
        .payment-method-details h4 {
          margin: 0 0 5px;
          font-size: 16px;
          color: #333;
        }
        
        .payment-description {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }
        
        .payment-icons {
          display: flex;
          gap: 8px;
          font-size: 20px;
          color: #555;
        }
        
        .promo-code-input {
          display: flex;
          gap: 10px;
        }
        
        .promo-code-input input {
          flex: 1;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .promo-code-input button {
          padding: 0 20px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
        }
        
        .promo-code-input button.applied {
          background: #4caf50;
        }
        
        .coupon-applied {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 15px;
          padding: 10px 15px;
          background: #e8f5e9;
          border-radius: 4px;
        }
        
        .check-icon {
          color: #4caf50;
          font-size: 20px;
        }
        
        .coupon-name {
          font-weight: 500;
          color: #2e7d32;
        }
        
        .coupon-description {
          font-size: 14px;
          color: #388e3c;
        }
        
        .order-summary-section {
          margin-top: 30px;
        }
        
        .summary-line.discount {
          color: #4caf50;
        }
        
        .place-order-btn {
          display: block;
          width: 100%;
          padding: 14px;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          margin-top: 30px;
          transition: background 0.3s;
        }
        
        .place-order-btn:hover {
          background: #43a047;
        }
        
        .place-order-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .multiple-vendors-note {
          margin-top: 20px;
          padding: 12px 15px;
          background: #fff8e1;
          border-left: 4px solid #ffc107;
          border-radius: 0 4px 4px 0;
          font-size: 14px;
          color: #856404;
        }
        
        .multiple-vendors-note p {
          margin: 0;
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
          .cart-content {
            grid-template-columns: 1fr;
          }
          
          .cart-item {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto auto auto;
            gap: 10px;
          }
          
          .item-image {
            grid-row: 1;
            grid-column: 1;
          }
          
          .item-details {
            grid-row: 1;
            grid-column: 2;
          }
          
          .item-price {
            grid-row: 2;
            grid-column: 1;
          }
          
          .item-quantity {
            grid-row: 2;
            grid-column: 2;
          }
          
          .item-total {
            grid-row: 3;
            grid-column: 1;
          }
          
          .remove-item {
            grid-row: 3;
            grid-column: 2;
            justify-self: end;
          }
          
          .delivery-option-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Cart;