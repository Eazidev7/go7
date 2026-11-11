import React from 'react';
import WalletTopUp from '../pages/WalletTopUp';
import BookDeliveryPayment from '../components/BookDeliveryPayment';

/**
 * Test page to verify Paystack payment integration
 * Navigate to /payment-test to see this page
 */
const PaymentTestPage = () => {
  const sampleOrder = {
    id: 'order_test_' + Date.now(),
    pickupAddress: '123 Main Street, Victoria Island, Lagos',
    deliveryAddress: '456 Oak Avenue, Lekki Phase 1, Lagos',
    totalAmount: 2500,
    description: 'Restaurant delivery - Jollof Rice & Chicken'
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Paystack Payment Test</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Wallet Top-Up Test */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-red-500 text-white p-4">
              <h2 className="text-xl font-semibold">💰 Wallet Top-Up</h2>
              <p className="text-sm opacity-90">Test wallet credit functionality</p>
            </div>
            <div className="p-6">
              <WalletTopUp />
            </div>
          </div>

          {/* Order Payment Test */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-green-500 text-white p-4">
              <h2 className="text-xl font-semibold">🚚 Order Payment</h2>
              <p className="text-sm opacity-90">Test delivery order payment</p>
            </div>
            <div className="p-6">
              <BookDeliveryPayment orderData={sampleOrder} />
            </div>
          </div>
        </div>

        {/* Status Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-800 mb-2">🔧 Test Instructions</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Both components use the same `usePaystack` hook</li>
            <li>• Payments are processed with Paystack Inline SDK</li>
            <li>• Success callbacks update Firestore (wallet/orders)</li>
            <li>• Backend verification via localhost:5000</li>
            <li>• All amounts are converted naira → kobo automatically</li>
            <li>• Loading states prevent duplicate transactions</li>
            <li>• Proper error handling with user feedback</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaymentTestPage;