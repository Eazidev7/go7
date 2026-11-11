/**
 * 🚫 VENDOR VERIFICATION GUARD
 * Prevents unverified vendors from accessing protected features
 */

import React from 'react';
import VendorPhoneVerification from '../components/VendorPhoneVerification';

/**
 * Higher-order component that guards vendor features behind phone verification
 * @param {React.Component} WrappedComponent - Component to protect
 * @returns {React.Component} Protected component
 */
export const withVendorVerification = (WrappedComponent) => {
  return function VerificationGuard(props) {
    const { vendor } = props;

    // Check if vendor needs verification
    const needsVerification = (
      !vendor?.phoneVerified ||
      vendor?.accountStatus === 'pending_phone_verification' ||
      !vendor?.registrationComplete ||
      !vendor?.canReceiveOrders ||
      vendor?.isActive === false
    );

    if (needsVerification && vendor?.phone) {
      return (
        <div className="verification-guard">
          <div className="guard-overlay">
            <div className="guard-content">
              <h2>🔒 Verification Required</h2>
              <p>
                You must verify your phone number before accessing vendor features.
                This ensures the security and trust of the GO7 platform.
              </p>
              
              <VendorPhoneVerification
                vendorId={vendor.vendorId || vendor.id}
                phoneNumber={vendor.phone}
                onVerificationSuccess={() => {
                  // Refresh the page or update vendor state
                  window.location.reload();
                }}
                onSkip={null} // No skip option for protected features
              />
            </div>
          </div>
        </div>
      );
    }

    // If verification not needed or vendor doesn't exist, render normally
    return <WrappedComponent {...props} />;
  };
};

/**
 * Hook to check vendor verification status
 * @param {Object} vendor - Vendor object
 * @returns {Object} Verification status
 */
export const useVendorVerification = (vendor) => {
  const isVerified = Boolean(
    vendor?.phoneVerified &&
    vendor?.accountStatus === 'active' &&
    vendor?.registrationComplete &&
    vendor?.canReceiveOrders &&
    vendor?.isActive !== false
  );

  const needsVerification = !isVerified && Boolean(vendor?.phone);
  
  const canAccessFeatures = isVerified;
  
  const verificationStatus = {
    isVerified,
    needsVerification,
    canAccessFeatures,
    phoneVerified: vendor?.phoneVerified || false,
    accountStatus: vendor?.accountStatus || 'unknown',
    registrationComplete: vendor?.registrationComplete || false,
    canReceiveOrders: vendor?.canReceiveOrders || false
  };

  return verificationStatus;
};

/**
 * Verification status component to show current verification state
 */
export const VendorVerificationStatus = ({ vendor }) => {
  const status = useVendorVerification(vendor);

  if (status.isVerified) {
    return (
      <div className="verification-status verified">
        <span className="status-icon">✅</span>
        <span>Verified Vendor</span>
      </div>
    );
  }

  if (status.needsVerification) {
    return (
      <div className="verification-status needs-verification">
        <span className="status-icon">⚠️</span>
        <span>Phone Verification Required</span>
      </div>
    );
  }

  return (
    <div className="verification-status unknown">
      <span className="status-icon">❓</span>
      <span>Verification Status Unknown</span>
    </div>
  );
};

/**
 * Component to block features for unverified vendors
 */
export const VerificationBlocker = ({ vendor, children, fallback }) => {
  const { canAccessFeatures } = useVendorVerification(vendor);

  if (!canAccessFeatures) {
    return fallback || (
      <div className="verification-blocker">
        <div className="blocker-content">
          <h3>📱 Phone Verification Required</h3>
          <p>
            This feature is only available to verified vendors. 
            Please complete phone verification to continue.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default {
  withVendorVerification,
  useVendorVerification,
  VendorVerificationStatus,
  VerificationBlocker
};