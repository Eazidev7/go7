import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePaystack } from '../hooks/usePaystack';
import { CreditCard, MapPin, Package, Clock } from 'lucide-react';

/**
 * Example component showing how to use Paystack for order payments
 * This demonstrates the "Book Delivery" use case
 */
const BookDeliveryPayment = ({ 
  orderData = {
    id: 'order_12345',
    pickupAddress: 'Sample Pickup Location',
    deliveryAddress: 'Sample Delivery Location', 
    totalAmount: 2500,
    description: 'Food Delivery'
  }
}) => {
  const { user } = useAuth();
  const { initializePayment, loading, error } = usePaystack();
  const [paymentComplete, setPaymentComplete] = useState(false);

  const handleOrderPayment = () => {
    console.log('🚀 Starting order payment:', orderData);

    if (!user?.email) {
      alert('Please log in to complete payment');
      return;
    }

    initializePayment({
      amount: orderData.totalAmount,
      email: user.email,
      userId: user.uid,
      purpose: 'order_payment',
      orderId: orderData.id,
      onSuccess: (result) => {
        console.log('✅ Order payment successful:', result);
        setPaymentComplete(true);
        alert(`Order payment successful! \\nOrder ID: ${result.orderId}\\nAmount: ₦${result.amount}\\nReference: ${result.reference}`);
      },
      onError: (error) => {
        console.error('❌ Order payment failed:', error);
        alert(`Payment failed: ${error.message}`);
      },
      onClose: () => {
        console.log('💭 Order payment popup closed');
      }
    });
  };

  if (paymentComplete) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-green-800 mb-2">Payment Complete!</h2>
          <p className="text-green-600 mb-4">Your delivery order has been confirmed and payment processed.</p>
          <div className="bg-white rounded border p-3 text-left">
            <p className="text-sm"><strong>Order ID:</strong> {orderData.id}</p>
            <p className="text-sm"><strong>Amount:</strong> ₦{orderData.totalAmount.toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Package className="mr-2" />
        Confirm Delivery Order
      </h2>

      {/* Order Details */}
      <div className="space-y-4 mb-6">
        <div className="flex items-start space-x-3">
          <MapPin className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Pickup</p>
            <p className="text-gray-600 text-sm">{orderData.pickupAddress}</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <MapPin className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Delivery</p>
            <p className="text-gray-600 text-sm">{orderData.deliveryAddress}</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <Package className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Description</p>
            <p className="text-gray-600 text-sm">{orderData.description}</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded">
          <p className="text-red-700 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* Payment Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total Amount</span>
          <span className="text-xl font-bold">₦{orderData.totalAmount.toLocaleString()}</span>
        </div>
      </div>

      {/* Payment Button */}
      <button
        onClick={handleOrderPayment}
        disabled={loading}
        className={`w-full py-3 rounded-lg font-semibold transition-all ${
          loading 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing Payment...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <CreditCard className="mr-2" size={20} />
            Pay ₦{orderData.totalAmount.toLocaleString()} with Paystack
          </div>
        )}
      </button>

      {/* Payment Info */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Secure payment powered by Paystack • Your order will be processed immediately after payment
        </p>
      </div>
    </div>
  );
};

export default BookDeliveryPayment;