import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuthContext } from '../contexts/AuthContext';
import CheckoutProgress from '../components/CheckoutProgress';
import AddressManager from '../components/AddressManager';
import SendAsGift from '../components/SendAsGift';
import PaymentSummary from '../components/PaymentSummary';
import PaystackPayment from '../components/PaystackPayment';
import './DeliveryPayment.css';

const DeliveryPayment = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, getCurrentVendor } = useCart();
  const { currentUser } = useAuthContext();
  
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [giftData, setGiftData] = useState({ enabled: false });
  const [promoCode, setPromoCode] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processing, setProcessing] = useState(false);
  
  // Get rider note from previous step
  const riderNote = sessionStorage.getItem('go7_rider_note') || '';
  
  // Calculate fees
  const currentVendor = getCurrentVendor();
  const deliveryFee = 200; // Default delivery fee
  const serviceFee = Math.round(cartTotal * 0.05); // 5% service fee
  
  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems.length, navigate]);

  const handleAddressSelect = (address) => {
    setSelectedAddress(address);
    setShowAddressModal(false);
  };

  const handlePaymentSuccess = async (paymentData) => {
    try {
      setProcessing(true);
      
      // Here you would create the order in your backend
      const orderData = {
        items: cartItems,
        vendorId: currentVendor?.id,
        vendorName: currentVendor?.name,
        subtotal: cartTotal,
        deliveryFee,
        serviceFee,
        promoDiscount: promoCode?.discount || 0,
        totalAmount: cartTotal + deliveryFee + serviceFee - (promoCode?.discount || 0),
        deliveryAddress: selectedAddress,
        riderNote,
        giftDetails: giftData.enabled ? giftData : null,
        paymentReference: paymentData.reference,
        paymentMethod,
        status: 'pending'
      };
      
      console.log('Order created:', orderData);
      
      // Navigate to success page
      navigate('/checkout/success', { 
        state: { 
          orderData,
          paymentData 
        } 
      });
      
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order. Please contact support.');
    } finally {
      setProcessing(false);
    }
  };

  if (cartItems.length === 0) {
    return null; // Will redirect in useEffect
  }

  const finalTotal = cartTotal + deliveryFee + serviceFee - (promoCode?.discount || 0);

  return (
    <div className="delivery-payment-page">
      <CheckoutProgress currentStep={2} />
      
      <div className="checkout-content">
        {/* Delivery Address Section */}
        <div className="checkout-section">
          <h3 className="section-title">Delivery Address</h3>
          
          {selectedAddress ? (
            <div className="selected-address">
              <div className="address-card">
                <div className="address-header">
                  <span className="address-label">
                    {selectedAddress.label === 'Home' && '🏠'}
                    {selectedAddress.label === 'Work' && '🏢'}
                    {selectedAddress.label === 'Other' && '📍'}
                    {selectedAddress.label}
                  </span>
                  <button 
                    className="change-btn"
                    onClick={() => setShowAddressModal(true)}
                  >
                    Change
                  </button>
                </div>
                <div className="address-details">
                  <p>{selectedAddress.street}</p>
                  <p>{selectedAddress.city}, {selectedAddress.state}</p>
                  {selectedAddress.phone && (
                    <p className="phone">📱 {selectedAddress.phone}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="no-address">
              <div className="address-prompt">
                <div className="prompt-icon">📍</div>
                <div className="prompt-text">
                  <h4>Add Delivery Address</h4>
                  <p>Please select or add a delivery address to continue</p>
                </div>
                <button 
                  className="add-address-btn"
                  onClick={() => setShowAddressModal(true)}
                >
                  Add Address
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Send as Gift Section */}
        <div className="checkout-section">
          <SendAsGift
            giftData={giftData}
            onGiftDataChange={setGiftData}
          />
        </div>

        {/* Payment Summary Section */}
        <div className="checkout-section">
          <PaymentSummary
            deliveryFee={deliveryFee}
            serviceFee={serviceFee}
            promoCode={promoCode}
            onPromoCodeChange={setPromoCode}
          />
        </div>

        {/* Payment Methods Section */}
        <div className="checkout-section">
          <h3 className="section-title">Payment Method</h3>
          
          <div className="payment-methods">
            <div className="payment-option">
              <label className="payment-label">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div className="payment-content">
                  <span className="payment-icon">💳</span>
                  <div className="payment-info">
                    <span className="payment-name">Debit/Credit Card</span>
                    <span className="payment-desc">Pay with your card via Paystack</span>
                  </div>
                </div>
              </label>
            </div>

            <div className="payment-option">
              <label className="payment-label">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank"
                  checked={paymentMethod === 'bank'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div className="payment-content">
                  <span className="payment-icon">🏦</span>
                  <div className="payment-info">
                    <span className="payment-name">Bank Transfer</span>
                    <span className="payment-desc">Pay via bank transfer</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Payment Button */}
          <div className="payment-action">
            <PaystackPayment
              amount={finalTotal}
              email={currentUser?.email || 'guest@go7.com'}
              orderData={{
                items: cartItems,
                address: selectedAddress,
                giftData: giftData.enabled ? giftData : null
              }}
              onSuccess={handlePaymentSuccess}
              onClose={() => console.log('Payment closed')}
              disabled={!selectedAddress || processing}
            />
          </div>
        </div>
      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <AddressManager
          selectedAddress={selectedAddress}
          onSelectAddress={handleAddressSelect}
          onClose={() => setShowAddressModal(false)}
          showAsModal={true}
        />
      )}
    </div>
  );
};

export default DeliveryPayment;