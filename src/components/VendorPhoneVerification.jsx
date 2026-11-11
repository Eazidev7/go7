/**
 * Vendor contact confirmation — WhatsApp OTP (email fallback if Functions down)
 */

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../firebase/config';
import { sendVendorPhoneOTP, verifyVendorPhone, submitVendorPhoneForAdminReview } from '../services/vendorAuthService';
import './VendorPhoneVerification.css';

const VendorPhoneVerification = ({ vendorId, phoneNumber, onVerificationSuccess, onSkip }) => {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phoneInput, setPhoneInput] = useState(phoneNumber || '');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [otpSentTo, setOtpSentTo] = useState('');
  const [otpChannel, setOtpChannel] = useState('whatsapp');
  const [allowAdminReview, setAllowAdminReview] = useState(false);
  const otpInputRef = useRef(null);
  const accountEmail = auth?.currentUser?.email || '';

  const toDisplayPhone = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '');
    const local = digits.startsWith('234') ? digits.slice(3) : digits.replace(/^0+/, '');
    return local.slice(0, 10);
  };

  const toE164ish = (display) => {
    const digits = String(display || '').replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
    return digits ? `+234${digits}` : '';
  };

  useEffect(() => {
    if (phoneNumber) {
      setPhoneInput(toE164ish(toDisplayPhone(phoneNumber)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneNumber]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  const handleSendOTP = async () => {
    if (!phoneInput.trim()) {
      setMessage('Please enter your phone number');
      setMessageType('error');
      return;
    }

    setIsSending(true);
    setMessage('');

    try {
      const result = await sendVendorPhoneOTP(vendorId, phoneInput.trim());

      if (result.success) {
        const channel = result.channel || 'whatsapp';
        setOtpChannel(channel);
        setOtpSentTo(
          channel === 'email'
            ? (result.email || accountEmail || 'your email')
            : (result.phone || phoneInput.trim())
        );
        setStep('otp');
        setCountdown(120);
        setAllowAdminReview(false);
      } else {
        const detail = result.message || 'Failed to send verification code';
        setMessage(
          result.code === 'OTP_DELIVERY_UNAVAILABLE'
            ? `${detail} You can confirm your number manually to continue.`
            : detail
        );
        setMessageType('error');
        if (result.code === 'OTP_DELIVERY_UNAVAILABLE') {
          setAllowAdminReview(true);
        }
      }
    } catch (error) {
      setMessage(error.message || 'Failed to send code. Please try again.');
      setMessageType('error');
      setAllowAdminReview(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmitForAdminReview = async () => {
    if (!phoneInput.trim()) {
      setMessage('Please enter your phone number');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');
    try {
      const result = await submitVendorPhoneForAdminReview(vendorId, phoneInput.trim());
      if (result.success) {
        setMessage(result.message);
        setMessageType('success');
        setTimeout(() => {
          onVerificationSuccess?.();
        }, 1200);
      } else {
        setMessage(result.message);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(error.message || 'Could not submit phone. Please try again.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!otpCode || otpCode.length !== 6) {
      setMessage('Please enter the 6-digit code');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const result = await verifyVendorPhone(vendorId, otpCode);

      if (result.success) {
        setMessage(result.message);
        setMessageType('success');

        setTimeout(() => {
          onVerificationSuccess?.();
        }, 1500);
      } else {
        setMessage(result.message);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Verification failed. Please try again.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isSending) return;
    setOtpCode('');
    await handleSendOTP();
  };

  const handleOTPChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setOtpCode(value);
    }
  };

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="vpv-page">
      <div className="vpv-card">
        <div className="vpv-brand">
          <img src="/go7-logo.png" alt="GO7" className="vpv-logo" />
          <span className="vpv-brand-name">GO7 Vendor</span>
        </div>

        {step === 'phone' ? (
          <>
            <h1 className="vpv-title">Verify your phone number</h1>
            <p className="vpv-subtitle">
              Customers and riders use this number to reach you on WhatsApp.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendOTP();
              }}
            >
              <label className="vpv-label" htmlFor="vendorPhoneInput">
                Phone number
              </label>
              <div className="vpv-phone-row">
                <span className="vpv-prefix">+234</span>
                <input
                  id="vendorPhoneInput"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={toDisplayPhone(phoneInput)}
                  onChange={(e) => setPhoneInput(toE164ish(e.target.value))}
                  placeholder="801 234 5678"
                  className="vpv-input"
                  disabled={isSending}
                />
              </div>

              {message && (
                <div className={`vpv-message ${messageType}`}>{message}</div>
              )}

              <button
                type="submit"
                disabled={isSending || isLoading}
                className="vpv-btn"
              >
                {isSending ? 'Sending code…' : 'Send code'}
              </button>

              {allowAdminReview && (
                <button
                  type="button"
                  onClick={handleSubmitForAdminReview}
                  disabled={isLoading}
                  className="vpv-link-btn"
                >
                  Can&apos;t receive the code? Confirm number manually
                </button>
              )}
            </form>
          </>
        ) : (
          <>
            <h1 className="vpv-title">Enter verification code</h1>
            <p className="vpv-subtitle">
              {otpChannel === 'email' ? (
                <>We sent a 6-digit code to <strong>{otpSentTo}</strong> — check your email.</>
              ) : (
                <>We sent a 6-digit code to <strong>{otpSentTo}</strong> on WhatsApp.</>
              )}
            </p>

            <form onSubmit={handleVerifyOTP}>
              <label className="vpv-label" htmlFor="otpCode">
                6-digit code
              </label>
              <input
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                id="otpCode"
                value={otpCode}
                onChange={handleOTPChange}
                placeholder="000000"
                maxLength={6}
                className="vpv-otp"
                disabled={isLoading}
              />

              {message && (
                <div className={`vpv-message ${messageType}`}>{message}</div>
              )}

              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="vpv-btn"
              >
                {isLoading ? 'Verifying…' : 'Verify'}
              </button>
            </form>

            <div className="vpv-footer-links">
              {countdown > 0 ? (
                <span className="vpv-timer">Resend code in {formatCountdown(countdown)}</span>
              ) : (
                <button type="button" onClick={handleResend} className="vpv-link-btn">
                  Resend code
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtpCode('');
                  setCountdown(0);
                  setMessage('');
                }}
                className="vpv-link-btn"
              >
                Change number
              </button>
              {allowAdminReview && (
                <button
                  type="button"
                  onClick={handleSubmitForAdminReview}
                  disabled={isLoading}
                  className="vpv-link-btn"
                >
                  Confirm number manually
                </button>
              )}
            </div>
          </>
        )}

        {onSkip && step === 'phone' && (
          <button type="button" onClick={onSkip} className="vpv-skip">
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
};

export default VendorPhoneVerification;
