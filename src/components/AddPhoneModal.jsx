import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { sendOTP } from '../services/otpService';
import { formatPhoneNumber, isValidNigerianPhone } from '../utils/phoneUtils';
import './AddPhoneModal.css';

const AddPhoneModal = ({ onClose }) => {
  const { updateUserPhone, user } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState({ valid: null, message: '' });
  const [otpError, setOtpError] = useState('');

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setPhone(value);

    if (!value.trim()) {
      setValidation({ valid: null, message: '' });
      return;
    }

    if (isValidNigerianPhone(value)) {
      setValidation({ valid: true, message: '✓ Valid phone number' });
    } else {
      setValidation({ valid: false, message: 'Enter a valid Nigerian phone number (e.g., 08012345678)' });
    }
  };

  const getErrorMessage = (error) => {
    return (
      error?.message ||
      error?.details?.message ||
      error?.code?.replace('functions/', '').replace(/-/g, ' ') ||
      'Something went wrong. Please try again.'
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user?.uid) {
      toast.error('Please log in first');
      return;
    }

    const normalized = formatPhoneNumber(phone);

    if (step === 'phone') {
      if (!phone.trim()) {
        toast.error('Please enter your phone number');
        return;
      }

      if (!isValidNigerianPhone(phone)) {
        toast.error('Please enter a valid Nigerian phone number');
        return;
      }

      setLoading(true);
      setOtpError('');

      try {
        const result = await sendOTP(user.uid, normalized, 'add_phone_verification');

        if (!result.success) {
          throw new Error(result.message || 'Failed to send OTP');
        }

        toast.success('OTP sent to your WhatsApp! 📱');
        if (result.devOtp) {
          toast.success(`Test OTP: ${result.devOtp}`, { duration: 12000 });
        }
        setStep('otp');
      } catch (error) {
        console.error('Error sending OTP:', error);
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    } else {
      if (!otp.trim() || otp.length !== 6) {
        toast.error('Please enter the 6-digit OTP');
        return;
      }

      setLoading(true);
      setOtpError('');

      try {
        const functions = getFunctions();
        const verifyPhoneOTP = httpsCallable(functions, 'verifyPhoneOTP');

        const result = await verifyPhoneOTP({
          code: otp.trim(),
        });

        if (!result.data?.success) {
          throw new Error(result.data?.message || 'Invalid OTP');
        }

        await updateUserPhone(normalized);
        toast.success('Phone number verified successfully! 🎉');
        onClose && onClose();
      } catch (error) {
        console.error('Error verifying OTP:', error);
        const message = getErrorMessage(error);
        setOtpError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResendOtp = async () => {
    if (!user?.uid || loading) return;

    setLoading(true);
    setOtpError('');

    try {
      const normalized = formatPhoneNumber(phone);
      const result = await sendOTP(user.uid, normalized, 'add_phone_verification');

      if (!result.success) {
        throw new Error(result.message || 'Failed to resend OTP');
      }

      toast.success('New OTP sent to your WhatsApp!');
      if (result.devOtp) {
        toast.success(`Test OTP: ${result.devOtp}`, { duration: 12000 });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-phone-modal-overlay">
      <div className="add-phone-modal">
        <div className="modal-header">
          <h2>📱 {step === 'phone' ? 'Add Your Phone Number' : 'Verify WhatsApp Code'}</h2>
          <p>
            {step === 'phone'
              ? 'We need your phone number to complete your profile and enable deliveries'
              : `Enter the 6-digit code sent to ${formatPhoneNumber(phone)} on WhatsApp`}
          </p>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {step === 'phone' ? (
            <>
              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="08012345678"
                  className={validation.valid === false ? 'error' : validation.valid === true ? 'success' : ''}
                  autoFocus
                  disabled={loading}
                />
                {validation.message && (
                  <div className={`validation-message ${validation.valid ? 'success' : 'error'}`}>
                    {validation.message}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || validation.valid !== true}
                >
                  {loading ? 'Sending OTP...' : 'Send WhatsApp OTP'}
                </button>
              </div>
            </>
          ) : (
            <>
              {otpError && (
                <div className="validation-message error" style={{ marginBottom: '12px' }}>
                  {otpError}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="otp">Enter OTP *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength="6"
                  autoFocus
                  disabled={loading}
                  className="otp-input"
                />
                <p className="otp-hint">Open WhatsApp and enter the 6-digit code</p>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setOtpError('');
                  }}
                  disabled={loading}
                >
                  Change Number
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleResendOtp}
                  disabled={loading}
                >
                  Resend OTP
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify & Save'}
                </button>
              </div>
            </>
          )}
        </form>

        <div className="modal-note">
          <svg className="lock-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>Your information is secure and private</span>
        </div>
      </div>
    </div>
  );
};

export default AddPhoneModal;
