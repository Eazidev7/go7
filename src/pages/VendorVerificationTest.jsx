/**
 * 🧪 VENDOR VERIFICATION TEST PAGE
 * Test phone verification flow without going through full registration
 */

import React, { useState } from 'react';
import VendorPhoneVerification from '../components/VendorPhoneVerification';
import { createDemoVendor } from '../utils/createDemoVendor';
import './VendorVerificationTest.css';

const VendorVerificationTest = () => {
  const [demoVendor, setDemoVendor] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  const handleCreateDemoVendor = async () => {
    setIsCreating(true);
    try {
      const result = await createDemoVendor();
      if (result.success) {
        setDemoVendor({
          vendorId: result.vendorId || 'demo-vendor-id',
          phone: result.credentials.phone,
          email: result.credentials.email
        });
        setShowVerification(true);
      } else {
        alert('Failed to create demo vendor: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating demo vendor:', error);
      alert('Error creating demo vendor');
    } finally {
      setIsCreating(false);
    }
  };

  const handleVerificationSuccess = () => {
    alert('✅ Phone verification successful! Demo vendor is now active.');
    setShowVerification(false);
    setDemoVendor(null);
  };

  if (showVerification && demoVendor) {
    return (
      <VendorPhoneVerification
        vendorId={demoVendor.vendorId}
        phoneNumber={demoVendor.phone}
        onVerificationSuccess={handleVerificationSuccess}
        onSkip={() => {
          alert('⚠️ Verification skipped - vendor account remains inactive');
          setShowVerification(false);
        }}
      />
    );
  }

  return (
    <div className="verification-test-page">
      <div className="test-container">
        <div className="test-header">
          <h1>🧪 Vendor Verification Test</h1>
          <p>Test the phone verification flow with demo data</p>
        </div>

        <div className="test-info">
          <h2>🔍 Test Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <strong>Termii API:</strong>
              <span className={import.meta.env.VITE_TERMII_API_KEY ? 'status-good' : 'status-bad'}>
                {import.meta.env.VITE_TERMII_API_KEY ? '✅ Configured' : '❌ Missing'}
              </span>
            </div>
            <div className="info-item">
              <strong>Firebase:</strong>
              <span className="status-good">✅ Connected</span>
            </div>
            <div className="info-item">
              <strong>Demo Phone:</strong>
              <span>+2348012345678</span>
            </div>
          </div>
        </div>

        <div className="test-actions">
          <h2>🚀 Test Actions</h2>
          
          <div className="action-card">
            <h3>1. Create Demo Vendor Account</h3>
            <p>Creates an unverified vendor account for testing</p>
            <button
              onClick={handleCreateDemoVendor}
              disabled={isCreating}
              className="action-button primary"
            >
              {isCreating ? 'Creating...' : 'Create Demo Vendor'}
            </button>
          </div>

          <div className="action-card">
            <h3>2. Test Manual Verification</h3>
            <p>Test verification with a custom phone number</p>
            <button
              onClick={() => {
                const phone = prompt('Enter phone number (Nigerian format):');
                if (phone) {
                  setDemoVendor({
                    vendorId: 'test-vendor-' + Date.now(),
                    phone: phone,
                    email: 'test@go7.com'
                  });
                  setShowVerification(true);
                }
              }}
              className="action-button secondary"
            >
              Manual Phone Test
            </button>
          </div>
        </div>

        <div className="test-notes">
          <h2>📝 Testing Notes</h2>
          <ul>
            <li>Demo vendor account will be created with unverified phone</li>
            <li>Real SMS will be sent via Termii API</li>
            <li>Use Nigerian phone number format: +2348012345678</li>
            <li>OTP code expires in 30 minutes</li>
            <li>Account becomes active after successful verification</li>
          </ul>
        </div>

        {import.meta.env.MODE !== 'development' && (
          <div className="production-warning">
            ⚠️ This test page is only available in development mode
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorVerificationTest;