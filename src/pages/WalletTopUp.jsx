import React, { useState, useEffect } from 'react';
import { Wallet, Plus, CreditCard, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
// import { usePaystack } from '../hooks/usePaystack'; // Replaced with PaystackPopup
import PaystackPopup from '../components/PaystackPopup.jsx';
import '../components/PaystackButtonFix.css';

const WalletTopUp = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Debug: Check if PaystackPopup component and SDK are working
  useEffect(() => {
    console.log('💳 WalletTopUp page loaded');
    console.log('👤 User:', user);
    console.log('🔑 PaystackPop available:', !!window.PaystackPop);
    console.log('🔑 Paystack env var:', import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY ? 'Found' : 'Missing');
    
    // Check if PaystackPopup component imported correctly
    console.log('📦 PaystackPopup component:', PaystackPopup);
  }, [user]);

  // Predefined amounts for quick selection
  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  // Handle successful wallet top-up
  const handlePaymentSuccess = (response) => {
    setLoading(false); // Clear loading state
    console.log('✅ Wallet top-up successful:', response);
    
    // TODO: Call your backend to verify payment and credit wallet
    // fetch('/api/wallet/credit', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ reference: response.reference })
    // });
    
    alert(`🎉 Payment Successful!\\n\\nAmount: ₦${response.amount / 100}\\nReference: ${response.reference}\\n\\nYour wallet has been credited!`);
    setAmount(''); // Clear custom amount
    setTimeout(() => navigate('/profile'), 2000); // Navigate back after 2 seconds
  };

  // Handle payment start
  const handlePaymentStart = () => {
    setLoading(true); // Set loading state
    setError(null); // Clear any errors
    console.log('🔄 Payment starting...');
  };

  // Handle payment cancellation
  const handlePaymentClose = () => {
    setLoading(false); // Clear loading state
    console.log('💭 Payment cancelled by user');
    setError(null); // Clear any errors
  };

  const handleCustomAmount = (value) => {
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^\\d.]/g, '');
    setAmount(cleanValue);
    setError(null); // Clear errors when user types
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#E50914] to-red-700 text-white">
        <div className="px-4 py-6">
          <div className="flex items-center mb-4">
            <button
              onClick={() => navigate('/profile')}
              className="mr-3 p-2 rounded-full hover:bg-red-600 transition-colors"
              disabled={loading}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-semibold">Top Up Wallet</h1>
          </div>
          
          <div className="flex items-center bg-red-600 bg-opacity-30 rounded-lg p-4">
            <Wallet className="mr-3" size={24} />
            <div>
              <p className="text-sm opacity-90">Add money to your Go7 wallet</p>
              <p className="font-semibold">Quick & Secure Payment</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-700">⚠️ {error}</p>
          </div>
        )}

        {/* Quick Amount Selection */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Quick Select</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickAmounts.map((quickAmount) => (
              <div key={quickAmount} className="p-4 border-2 rounded-lg border-gray-200 bg-white">
                <div className="flex items-center justify-center mb-3">
                  <span className="text-sm">₦</span>
                  <span className="ml-1 text-lg font-semibold text-gray-700">{quickAmount.toLocaleString()}</span>
                </div>
                <PaystackPopup
                  amount={quickAmount}
                  email={user?.email || "user@go7.ng"}
                  buttonText="Pay Now"
                  onStart={handlePaymentStart}
                  onSuccess={handlePaymentSuccess}
                  onClose={handlePaymentClose}
                  metadata={{
                    "Payment Type": "Wallet Top-up",
                    "Amount": quickAmount.toString(),
                    "User ID": user?.uid || "guest"
                  }}
                  className="w-full payment-button-container debug-paystack-button"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Custom Amount</h2>
          <div className="space-y-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                ₦
              </span>
              <input
                type="text"
                value={amount}
                onChange={(e) => handleCustomAmount(e.target.value)}
                placeholder="Enter amount (min: ₦100)"
                disabled={loading}
                className={`w-full pl-8 pr-4 py-3 border-2 rounded-lg text-lg font-semibold ${
                  loading 
                    ? 'bg-gray-100 border-gray-200 cursor-not-allowed'
                    : 'border-gray-200 focus:border-red-500 focus:outline-none'
                }`}
              />
            </div>
            
            {amount && parseFloat(amount) >= 100 ? (
              <PaystackPopup
                amount={parseFloat(amount)}
                email={user?.email || "user@go7.ng"}
                buttonText={`Pay ₦${parseFloat(amount).toLocaleString()} with Paystack`}
                onStart={handlePaymentStart}
                onSuccess={handlePaymentSuccess}
                onClose={handlePaymentClose}
                metadata={{
                  "Payment Type": "Wallet Top-up (Custom)",
                  "Amount": amount,
                  "User ID": user?.uid || "guest"
                }}
                className="w-full"
              />
            ) : (
              <button
                disabled={true}
                className="w-full py-3 rounded-lg font-semibold bg-gray-200 text-gray-400 cursor-not-allowed"
              >
                <div className="flex items-center justify-center">
                  <CreditCard className="mr-2" size={20} />
                  Enter amount (min: ₦100)
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="bg-blue-500 rounded-full p-1 mr-3 mt-1">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-800 mb-1">Payment Information</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Minimum amount: ₦100</li>
                <li>• Maximum amount: ₦500,000</li>
                <li>• Secure payment via Paystack</li>
                <li>• Instant wallet credit</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Processing Payment</h3>
                <p className="text-gray-600">Please complete your payment in the Paystack popup</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletTopUp;