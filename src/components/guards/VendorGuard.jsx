import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const VendorGuard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isVendor, setIsVendor] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsVendor(false);
        setIsLoading(false);
        return;
      }

      try {
        // Raw doc — avoid converters that assume Timestamp.toDate() on migrated fields
        const vendorId = user.uid;
        const vendorSnapshot = await getDoc(doc(db, 'vendors', vendorId));
        const data = vendorSnapshot.exists() ? vendorSnapshot.data() : null;

        // Any registered vendor profile — including pending phone verification
        const hasVendorProfile = Boolean(
          vendorSnapshot.exists() &&
          (data?.userId === vendorId || data?.vendorId === vendorId || data?.email)
        );

        setIsVendor(hasVendorProfile);
      } catch (error) {
        console.error('Error verifying vendor status:', error);
        setIsVendor(false);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return isVendor ? <Outlet /> : <Navigate to="/vendor/login" />;
};

export default VendorGuard;
