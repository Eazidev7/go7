import React, { useState } from 'react';
import { PaystackButton } from 'react-paystack';
import './PaystackPayment.css';

const PaystackPayment = ({ 
  amount, 
  email, 
  orderData, 
  onSuccess, 
  onClose, 
  disabled = false 
}) => {
  const [loading, setLoading] = useState(false);

  // Paystack configuration
  const publicKey = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || 'pk_test_your_key_here';
  
  // Convert amount to kobo (Paystack expects amount in kobo)
  const amountInKobo = Math.round(amount * 100);
  
  // Generate unique reference
  const reference = `GO7_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const componentProps = {
    email,
    amount: amountInKobo,
    publicKey,
    text: loading ? 'Processing...' : `Pay ₦${amount.toLocaleString()}`,
    reference,
    currency: 'NGN',
    channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
    metadata: {
      orderData,
      custom_fields: [
        {
          display_name: "Order Type",
          variable_name: "order_type",
          value: "GO7 Food Delivery"
        }
      ]
    },
    onSuccess: (response) => {
      setLoading(false);
      console.log('Payment successful:', response);
      onSuccess({
        ...response,
        amount: amount,
        orderData
      });
    },
    onClose: () => {
      setLoading(false);
      console.log('Payment closed');
      onClose && onClose();
    }
  };

  const handlePaymentStart = () => {
    setLoading(true);
  };

  const formatAmount = (amount) => {
    return `₦${parseFloat(amount || 0).toLocaleString()}`;
  };

  return (
    <div className="paystack-payment">
      <div className="payment-info">
        <div className="amount-display">
          <span className="amount-label">Total Amount</span>
          <span className="amount-value">{formatAmount(amount)}</span>
        </div>
        
        <div className="payment-security">
          <span className="security-icon">🔒</span>
          <span className="security-text">Secured by Paystack</span>
        </div>
      </div>

      <PaystackButton 
        {...componentProps}
        className={`paystack-button ${disabled ? 'disabled' : ''} ${loading ? 'loading' : ''}`}
        disabled={disabled || loading}
        onClick={handlePaymentStart}
      />
      
      <div className="payment-methods-info">
        <p className="methods-title">Accepted Payment Methods:</p>
        <div className="methods-list">
          <span className="method-item">💳 Debit/Credit Cards</span>
          <span className="method-item">🏦 Bank Transfer</span>
          <span className="method-item">📱 USSD</span>
          <span className="method-item">📱 Mobile Money</span>
        </div>
      </div>

      <div className="payment-note">
        <p>
          <strong>Note:</strong> Pay on Delivery is not available. 
          Payment must be completed before your order can be processed.
        </p>
      </div>
    </div>
  );
};

// Alternative component for when Paystack is not available
export const MockPaystackPayment = ({ 
  amount, 
  onSuccess, 
  disabled = false 
}) => {
  const [loading, setLoading] = useState(false);

  const handleMockPayment = async () => {
    setLoading(true);
    
    // Simulate payment processing
    setTimeout(() => {
      const mockResponse = {
        reference: `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'success',
        transaction: Date.now(),
        amount: amount * 100, // In kobo
        currency: 'NGN'
      };
      
      setLoading(false);
      onSuccess(mockResponse);
    }, 3000);
  };

  return (
    <div className="paystack-payment mock-payment">
      <div className="payment-info">
        <div className="amount-display">
          <span className="amount-label">Total Amount</span>
          <span className="amount-value">₦{amount.toLocaleString()}</span>
        </div>
        
        <div className="payment-security">
          <span className="security-icon">🔒</span>
          <span className="security-text">Mock Payment (Demo Mode)</span>
        </div>
      </div>

      <button 
        className={`paystack-button mock ${disabled ? 'disabled' : ''} ${loading ? 'loading' : ''}`}
        disabled={disabled || loading}
        onClick={handleMockPayment}
      >
        {loading ? (
          <div className="button-content">
            <span className="loading-spinner"></span>
            Processing Payment...
          </div>
        ) : (
          `Pay ₦${amount.toLocaleString()} (Demo)`
        )}
      </button>
      
      <div className="mock-note">
        <p>
          <strong>Demo Mode:</strong> This is a mock payment for testing. 
          No actual charge will be made.
        </p>
      </div>
    </div>
  );
};

export default PaystackPayment;