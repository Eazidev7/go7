import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { vendorDoc } from '../../lib/vendorRefs';
import { Vendor } from '../../types/marketplace';
import VendorLayout from '../../components/vendor/VendorLayout';
import Overview from '../../components/vendor/analytics/Overview';

const VendorDashboard = () => {
  const [vendor, setVendor] = useState<Vendor | null>(null);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
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
