import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import OTPModal from './OTPModal';
import toast from 'react-hot-toast';

/**
 * 💸 Wallet Withdrawal Component
 * 
 * Allows users to withdraw funds with WhatsApp OTP verification
 */
export default function WalletWithdrawal({ balance, onClose }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountName: ''
  });
  const [showOTP, setShowOTP] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleWithdrawal = () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > balance) {
      toast.error('Insufficient balance');
      return;
    }

    if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountName) {
      toast.error('Please fill in all bank details');
      return;
    }

    // Show OTP modal for verification
    setShowOTP(true);
  };

  const handleOTPVerified = async () => {
    setProcessing(true);

    try {
      // Here you would call your withdrawal processing function
      // For now, just show success message
      
      toast.success(`₦${parseFloat(amount).toLocaleString()} withdrawal initiated!`, {
        style: {
          background: '#1a1a1a',
          color: '#00ff99',
          border: '1px solid #00ff99',
        },
      });

      // Reset form
      setAmount('');
      setBankDetails({ bankName: '', accountNumber: '', accountName: '' });
      
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Withdrawal failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 border-2 border-red-600 rounded-3xl p-6 neon-glow">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            💸 WITHDRAW FUNDS
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Available Balance */}
        <div className="bg-black/50 rounded-xl p-4 border border-red-900/30 mb-6">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Available Balance</p>
          <p className="text-white text-3xl font-bold">₦{balance.toLocaleString()}</p>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="text-gray-400 text-sm font-semibold mb-2 block">Amount to Withdraw</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full bg-black border-2 border-red-600/50 rounded-xl px-4 py-3 text-white text-lg font-semibold focus:border-red-600 focus:ring-2 focus:ring-red-600/50 transition-all"
          />
        </div>

        {/* Bank Details */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-gray-400 text-sm font-semibold mb-2 block">Bank Name</label>
            <input
              type="text"
              value={bankDetails.bankName}
              onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
              placeholder="e.g. GTBank"
              className="w-full bg-black border-2 border-red-600/50 rounded-xl px-4 py-3 text-white focus:border-red-600 focus:ring-2 focus:ring-red-600/50 transition-all"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm font-semibold mb-2 block">Account Number</label>
            <input
              type="text"
              value={bankDetails.accountNumber}
              onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
              placeholder="0123456789"
              maxLength={10}
              className="w-full bg-black border-2 border-red-600/50 rounded-xl px-4 py-3 text-white focus:border-red-600 focus:ring-2 focus:ring-red-600/50 transition-all"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm font-semibold mb-2 block">Account Name</label>
            <input
              type="text"
              value={bankDetails.accountName}
              onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
              placeholder="John Doe"
              className="w-full bg-black border-2 border-red-600/50 rounded-xl px-4 py-3 text-white focus:border-red-600 focus:ring-2 focus:ring-red-600/50 transition-all"
            />
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4 mb-6">
          <p className="text-red-400 text-sm flex items-start">
            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>
              <strong>Security:</strong> You'll receive a verification code via WhatsApp to confirm this withdrawal.
            </span>
          </p>
        </div>

        {/* Withdraw Button */}
        <button
          onClick={handleWithdrawal}
          disabled={processing}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black text-lg py-4 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-red-600/50 relative overflow-hidden group"
        >
          <span className="relative z-10 flex items-center justify-center space-x-2">
            {processing ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>PROCESSING...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>WITHDRAW NOW</span>
              </>
            )}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
        </button>
      </div>

      {/* OTP Modal */}
      <OTPModal
        isOpen={showOTP}
        onClose={() => setShowOTP(false)}
        onVerified={handleOTPVerified}
        purpose="withdrawal"
      />
    </>
  );
}