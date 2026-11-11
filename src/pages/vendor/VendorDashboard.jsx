import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { vendorDoc } from '../../lib/vendorRefs';
import VendorLayout from '../../components/vendor/VendorLayout';
import Overview from '../../components/vendor/analytics/Overview';
import VendorPhoneVerification from '../../components/VendorPhoneVerification';

const VendorDashboard = () => {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        const user = auth.currentUser;
        
        if (!user) {
          navigate('/vendor/login');
          return;
        }
        
        const vendorId = user.uid;
        const vendorSnapshot = await getDoc(vendorDoc(vendorId));
        
        if (!vendorSnapshot.exists()) {
          console.error('No vendor profile found');
          auth.signOut();
          navigate('/vendor/login');
          return;
        }
        
        setVendor(vendorSnapshot.data());
        setLoading(false);
      } catch (error) {
        console.error('Error fetching vendor data:', error);
        setLoading(false);
      }
    };
    
    fetchVendorData();
  }, [auth, navigate]);

  // Check if vendor needs phone verification
  const needsVerification = vendor && (
    !vendor.phoneVerified ||
    vendor.accountStatus === 'pending_phone_verification' ||
    !vendor.registrationComplete
  );

  // Debug logging
  console.log('🔍 Vendor Dashboard Debug:', {
    vendor: vendor ? {
      phoneVerified: vendor.phoneVerified,
      accountStatus: vendor.accountStatus,
      registrationComplete: vendor.registrationComplete,
      canReceiveOrders: vendor.canReceiveOrders,
      isActive: vendor.isActive
    } : 'No vendor',
    needsVerification,
    shouldShowVerificationScreen: needsVerification
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // Show phone verification modal if needed
  if (needsVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <span className="text-3xl">📱</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Phone Verification Required
            </h1>
            <p className="text-gray-600 mb-6">
              To start receiving orders and accessing your vendor dashboard, 
              you must verify your phone number via WhatsApp OTP.
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Your account is inactive</strong><br/>
                You cannot receive orders until phone verification is complete.
              </p>
            </div>
          </div>

          <VendorPhoneVerification
            vendorId={vendor.vendorId || auth.currentUser.uid}
            phoneNumber={vendor.phone}
            onVerificationSuccess={() => {
              // Refresh vendor data
              window.location.reload();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <VendorLayout vendor={vendor} title="Dashboard">
      <Overview />
    </VendorLayout>
  );
};

export default VendorDashboard;
