import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { sendOTP, verifyOTP } from '../services/otpService';

/**
 * 🔐 OTP Verification Modal using WhatsApp (Infobip)
 * 
 * Beautiful futuristic OTP input with:
 * - 6-digit input boxes
 * - Countdown timer
 * - Resend code functionality
 * - Real WhatsApp OTP integration
 */
export default function OTPModal({ isOpen, onClose, onVerified, purpose = 'wallet_action' }) {
  const { user } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Send OTP on modal open
  useEffect(() => {
    if (isOpen) {
      sendOTPCode();
    }
  }, [isOpen]);

  const sendOTPCode = async () => {
    if (!user?.phoneNumber) {
      toast.error('Phone number not found. Please update your profile.');
      return;
    }

    setSending(true);
    setTimeLeft(60);
    setCanResend(false);
    setError('');

    try {
      const result = await sendOTP(user.uid, user.phoneNumber, purpose);

      if (result.success) {
        toast.success('OTP sent successfully! 📱', {
          style: {
            background: '#1a1a1a',
            color: '#00ff99',
            border: '1px solid #00ff99',
          },
        });

        // Focus first input
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setError(result.message);
        toast.error(result.message);
      }

    } catch (error) {
      console.error('Error sending OTP:', error);
      const errorMessage = error.message || 'Failed to send OTP. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits entered
    if (newOtp.every(digit => digit !== '') && index === 5) {
      verifyOTPCode(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setOtp(newOtp);

    // Focus last filled input or verify if complete
    if (pastedData.length === 6) {
      verifyOTPCode(pastedData);
    } else {
      inputRefs.current[pastedData.length]?.focus();
    }
  };

  const verifyOTPCode = async (code) => {
    if (!user?.uid) {
      toast.error('User not authenticated');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await verifyOTP(user.uid, code);

      if (result.success) {
        // Success animation
        toast.success('✅ Verified Successfully!', {
          style: {
            background: '#1a1a1a',
            color: '#00ff99',
            border: '1px solid #00ff99',
          },
          duration: 2000,
        });

        setTimeout(() => {
          onVerified();
          onClose();
        }, 500);
      } else {
        // Show specific error from Termi
        setError(result.message);
        toast.error(result.message, {
          style: {
            background: '#1a1a1a',
            color: '#ff4444',
            border: '1px solid #e53935',
          },
        });
        
        // Clear OTP inputs on error
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }

    } catch (error) {
      console.error('OTP verification error:', error);
      const errorMessage = error.message || 'Network error. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage, {
        style: {
          background: '#1a1a1a',
          color: '#ff4444',
          border: '1px solid #e53935',
        },
      });
      
      // Clear OTP inputs on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setOtp(['', '', '', '', '', '']);
    sendOTP();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(229, 57, 53, 0.5); }
          50% { box-shadow: 0 0 40px rgba(229, 57, 53, 0.8); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
        .pulse-glow {
          animation: pulse-glow 2s infinite;
        }
      `}</style>

      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 border-2 border-red-600 rounded-3xl p-8 max-w-md w-full animate-slideUp pulse-glow">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            VERIFY YOUR IDENTITY
          </h2>
          <p className="text-gray-400 text-sm">
            Enter the 6-digit code sent to your WhatsApp
          </p>
        </div>

        {/* OTP Inputs */}
        <div className="flex justify-center space-x-2 mb-6" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={loading}
              className={`w-12 h-14 text-center text-2xl font-bold bg-black border-2 rounded-lg text-white transition-all duration-200 ${
                digit
                  ? 'border-green-500 shadow-lg shadow-green-500/50'
                  : 'border-red-600/50 hover:border-red-600'
              } ${
                loading ? 'opacity-50 cursor-not-allowed' : 'focus:border-red-600 focus:ring-2 focus:ring-red-600/50'
              }`}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-600 rounded-lg">
            <p className="text-red-400 text-sm text-center font-medium">{error}</p>
          </div>
        )}

        {/* Timer */}
        <div className="text-center mb-6">
          {timeLeft > 0 ? (
            <p className="text-gray-400 text-sm">
              Code expires in{' '}
              <span className="text-red-500 font-bold">{timeLeft}s</span>
            </p>
          ) : (
            <p className="text-yellow-500 text-sm font-semibold">⚠️ Code expired</p>
          )}
        </div>

        {/* Resend Button */}
        <button
          onClick={handleResend}
          disabled={!canResend || sending}
          className={`w-full mb-4 py-3 rounded-xl font-semibold transition-all ${
            canResend && !sending
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {sending ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              SENDING...
            </span>
          ) : (
            'RESEND CODE'
          )}
        </button>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all"
        >
          CANCEL
        </button>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center">
            <div className="text-center">
              <svg className="animate-spin h-12 w-12 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-green-500 font-semibold">Verifying...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}