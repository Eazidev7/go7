/**
 * 🎯 GO7 AGENT LOGIN
 * Phone OTP verification for agent authentication
 * Matches the GO7 vendor/customer auth card style (Tailwind, brand red)
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';
import { sendOTP } from '../services/otpService';
import { getAgent } from '../services/agentEarningsService';
import toast from 'react-hot-toast';
import { Smartphone, Shield, Loader, ArrowLeft, TrendingUp } from 'lucide-react';

const functions = getFunctions(app);
const verifyPhoneOTP = httpsCallable(functions, 'verifyPhoneOTP');

const AgentLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: phone input, 2: OTP verification
  const [formData, setFormData] = useState({ phone: '' });
  const [otp, setOtp] = useState('');
  const [tempAgentId, setTempAgentId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Format phone number
  const formatPhoneNumber = (phone) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('234')) {
      cleaned = '0' + cleaned.substring(3);
    }
    if (!cleaned.startsWith('0')) {
      cleaned = '0' + cleaned;
    }
    return cleaned;
  };

  // Step 1: Send OTP to phone
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();

    if (!formData.phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Finding your account...');

    try {
      const formattedPhone = formatPhoneNumber(formData.phone);

      // Look up agent by phone via Cloud Function (Admin SDK) — agents
      // have no Firebase Auth session, so a direct client-side Firestore
      // query against `agents` would be blocked by security rules.
      const findAgentByPhone = httpsCallable(functions, 'findAgentByPhone');
      const lookup = await findAgentByPhone({ phone: formattedPhone });

      if (!lookup.data?.found) {
        toast.error(lookup.data?.error || 'No agent account found with this phone number. Please sign up first.', { id: loadingToast });
        setLoading(false);
        return;
      }

      const agentId = lookup.data.agentId;
      setTempAgentId(agentId);

      // Send OTP via WhatsApp
      const result = await sendOTP(agentId, formattedPhone, 'agent_login');

      if (result.success) {
        toast.success('📱 OTP sent to your WhatsApp!', { id: loadingToast });
        setStep(2);
      } else {
        throw new Error(result.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('❌ Phone login error:', error);
      toast.error(error.message || 'Failed to send OTP', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP via Cloud Function (Admin SDK — agents have no Firebase Auth)
  const handleOTPSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Verifying OTP...');

    try {
      const verifyResult = await verifyPhoneOTP({
        userId: tempAgentId,
        phoneNumber: formatPhoneNumber(formData.phone),
        code: String(otp).trim(),
      });

      if (!verifyResult.data?.success) {
        throw new Error(verifyResult.data?.message || 'Invalid OTP');
      }

      // Get agent data via Cloud Function (no Firebase Auth session to
      // satisfy the direct Firestore read rule for `agents`)
      const agentResult = await getAgent(tempAgentId);
      const agentData = agentResult?.agent || agentResult;

      // Store session
      localStorage.setItem('agentId', tempAgentId);
      localStorage.setItem('agentName', agentData?.name || 'Agent');

      toast.success(`✅ Welcome back, ${agentData?.name || 'Agent'}!`, { id: loadingToast });

      // Redirect to dashboard
      setTimeout(() => {
        navigate(`/agent/${tempAgentId}`);
      }, 500);

    } catch (error) {
      console.error('❌ OTP verification error:', error);
      let message = error.message || 'Invalid OTP. Please try again.';
      if (error.code === 'functions/not-found') {
        message = 'No OTP found. Please request a new code.';
      } else if (error.code === 'functions/deadline-exceeded') {
        message = 'OTP has expired. Please request a new code.';
      } else if (error.code === 'functions/permission-denied') {
        message = error.message || 'Invalid OTP code.';
      }
      toast.error(message, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (!tempAgentId) return;

    setLoading(true);
    const loadingToast = toast.loading('Resending OTP...');

    try {
      const formattedPhone = formatPhoneNumber(formData.phone);
      const result = await sendOTP(tempAgentId, formattedPhone, 'agent_login');

      if (result.success) {
        toast.success('📱 OTP sent again!', { id: loadingToast });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast.error('Failed to resend OTP', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <Link
          to="/"
          className="flex items-center space-x-2 text-gray-600 hover:text-red-500 mb-6 transition"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </Link>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === 1 && (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500 rounded-full mb-4">
                  <TrendingUp size={32} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Agent Login</h1>
                <p className="text-gray-600">Welcome back! Log in to access your earnings dashboard</p>
              </div>

              <form onSubmit={handlePhoneSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Smartphone size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ phone: e.target.value })}
                      placeholder="080 1234 5678"
                      maxLength="11"
                      required
                      autoFocus
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Enter your registered WhatsApp number</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader size={20} className="animate-spin" />
                      <span>Finding Account...</span>
                    </>
                  ) : (
                    <span>Continue</span>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  Don't have an account?{' '}
                  <Link to="/agent/signup" className="text-red-500 hover:text-red-600 font-semibold">
                    Sign up as Agent
                  </Link>
                </p>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                  <Shield size={32} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Number</h1>
                <p className="text-gray-600">
                  Enter the 6-digit code sent to<br />
                  <strong className="text-gray-900">{formData.phone}</strong>
                </p>
              </div>

              <form onSubmit={handleOTPSubmit} className="space-y-6">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength="6"
                  required
                  autoFocus
                  className="w-full text-center text-2xl font-bold tracking-[0.5em] font-mono py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader size={20} className="animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify &amp; Login</span>
                  )}
                </button>
              </form>

              <div className="mt-6 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-sm text-red-500 hover:text-red-600 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Didn't receive code? Resend
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Change phone number
                </button>
              </div>
            </>
          )}
        </div>

        {/* Earnings Preview Footer */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 text-center">💰 Agent Earnings</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-500 mb-1">₦3,000</div>
              <div className="text-xs text-gray-600">When vendor goes live</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-500 mb-1">₦1,500</div>
              <div className="text-xs text-gray-600">First order bonus</div>
            </div>
          </div>
          <p className="text-center text-sm text-gray-600">
            Minimum withdrawal: <strong className="text-red-500">₦5,000</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentLogin;
