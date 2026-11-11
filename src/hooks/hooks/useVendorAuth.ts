import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { vendorDoc } from '../lib/vendorRefs';
import { Vendor } from '../types/marketplace';

interface VendorAuthState {
  loading: boolean;
  user: User | null;
  vendor: Vendor | null;
  isVendor: boolean;
}

export const useVendorAuth = (): VendorAuthState => {
  const [state, setState] = useState<VendorAuthState>({
    loading: true,
    user: null,
    vendor: null,
    isVendor: false
  });
  
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({
          loading: false,
          user: null,
          vendor: null,
          isVendor: false
        });
        return;
      }

      try {
        // Fetch vendor profile
        const vendorId = user.uid;
        const vendorSnapshot = await getDoc(vendorDoc(vendorId));
        
        if (vendorSnapshot.exists()) {
          const vendorData = vendorSnapshot.data();
          setState({
            loading: false,
            user,
            vendor: vendorData,
            isVendor: vendorData.active
          });
        } else {
          setState({
            loading: false,
            user,
            vendor: null,
            isVendor: false
          });
        }
      } catch (error) {
        console.error('Error fetching vendor data:', error);
        setState({
          loading: false,
          user,
          vendor: null,
          isVendor: false
        });
      }
    });

    return () => unsubscribe();
  }, [auth]);

  return state;
};

export default useVendorAuth;
