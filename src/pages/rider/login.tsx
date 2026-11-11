'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier, Auth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

interface RiderLoginProps {}

const RiderLogin: React.FC<RiderLoginProps> = () => {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  useEffect(() => {
    // Check if rider is already logged in
    const riderId = localStorage.getItem('riderId');
    if (riderId) {
      router.push('/rider/dashboard');
    }

    // Initialize reCAPTCHA for phone auth
    if (loginMethod === 'phone' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        }
      });
    }
  }, [loginMethod, router]);

  const handlePhoneLogin = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Format phone number (ensure it starts with +234 for Nigeria)
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+234${phoneNumber.replace(/^0/, '')}`;

      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      
      setConfirmationResult(confirmation);
      setShowVerification(true);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Phone login error:', error);
      setError(error.message || 'Failed to send verification code');
      setIsLoading(false);
    }
  };

  const handleVerificationCode = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;
      
      // Check if user is a registered rider
      await verifyRiderStatus(user.uid);
      
    } catch (error: any) {
      console.error('Verification error:', error);
      setError('Invalid verification code');
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      
      // Check if user is a registered rider
      await verifyRiderStatus(user.uid);
      
    } catch (error: any) {
      console.error('Email login error:', error);
      setError(error.message || 'Failed to login');
      setIsLoading(false);
    }
  };

  const verifyRiderStatus = async (userId: string) => {
    try {
      // Check if user exists in riders collection
      const riderDoc = await getDoc(doc(db, 'riders', userId));
      
      if (riderDoc.exists()) {
        const riderData = riderDoc.data();
        
        // Store rider info in localStorage
        localStorage.setItem('riderId', userId);
        localStorage.setItem('riderName', riderData.name || 'Rider');
        localStorage.setItem('riderPhone', riderData.phone || '');
        
        console.log('✅ Rider login successful:', riderData);
        router.push('/rider/dashboard');
      } else {
        setError('Account not found. Please contact support to register as a rider.');
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Rider verification error:', error);
      setError('Failed to verify rider account');
      setIsLoading(false);
    }
  };

  if (showVerification) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #E30613 0%, #FF4444 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#1F2937',
              marginBottom: '8px'
            }}>
              Enter Verification Code
            </h1>
            <p style={{ color: '#6B7280', fontSize: '14px' }}>
              We sent a code to {phoneNumber}
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '18px',
                textAlign: 'center',
                border: '2px solid #E5E7EB',
                borderRadius: '12px',
                letterSpacing: '2px'
              }}
              maxLength={6}
            />
          </div>

          {error && (
            <div style={{
              background: '#FEE2E2',
              color: '#DC2626',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleVerificationCode}
            disabled={isLoading}
            style={{
              width: '100%',
              background: isLoading ? '#9CA3AF' : '#E30613',
              color: 'white',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginBottom: '16px'
            }}
          >
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </button>

          <button
            onClick={() => {
              setShowVerification(false);
              setVerificationCode('');
              setError('');
            }}
            style={{
              width: '100%',
              background: 'transparent',
              color: '#6B7280',
              padding: '12px',
              fontSize: '14px',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #E30613 0%, #FF4444 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: '#E30613',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '28px'
          }}>
            🏍️
          </div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: '#1F2937',
            marginBottom: '8px'
          }}>
            Go7 Rider Login
          </h1>
          <p style={{ color: '#6B7280', fontSize: '14px' }}>
            Sign in to start delivering
          </p>
        </div>

        {/* Login Method Toggle */}
        <div style={{
          display: 'flex',
          background: '#F3F4F6',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => setLoginMethod('phone')}
            style={{
              flex: 1,
              padding: '12px',
              background: loginMethod === 'phone' ? 'white' : 'transparent',
              color: loginMethod === 'phone' ? '#1F2937' : '#6B7280',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: loginMethod === 'phone' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            📱 Phone
          </button>
          <button
            onClick={() => setLoginMethod('email')}
            style={{
              flex: 1,
              padding: '12px',
              background: loginMethod === 'email' ? 'white' : 'transparent',
              color: loginMethod === 'email' ? '#1F2937' : '#6B7280',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: loginMethod === 'email' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            ✉️ Email
          </button>
        </div>

        {/* Phone Login Form */}
        {loginMethod === 'phone' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151' 
              }}>
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+234 901 234 5678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '16px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px'
                }}
              />
            </div>

            <button
              onClick={handlePhoneLogin}
              disabled={isLoading}
              style={{
                width: '100%',
                background: isLoading ? '#9CA3AF' : '#E30613',
                color: 'white',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '12px',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </div>
        )}

        {/* Email Login Form */}
        {loginMethod === 'email' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151' 
              }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="rider@go7.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '16px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151' 
              }}>
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '16px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '12px'
                }}
              />
            </div>

            <button
              onClick={handleEmailLogin}
              disabled={isLoading}
              style={{
                width: '100%',
                background: isLoading ? '#9CA3AF' : '#E30613',
                color: 'white',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '12px',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div style={{
            background: '#FEE2E2',
            color: '#DC2626',
            padding: '12px',
            borderRadius: '8px',
            marginTop: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* reCAPTCHA container */}
        <div id="recaptcha-container"></div>

        {/* Support Link */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
            Need help? Contact{' '}
            <a href="tel:+2349012345678" style={{ color: '#E30613', textDecoration: 'none' }}>
              support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RiderLogin;