import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { vendorDoc } from '../../lib/vendorRefs';
import VendorLayout from '../../components/vendor/VendorLayout';

const VendorPOD = () => {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <VendorLayout vendor={vendor} title="Proof of Delivery">
      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900">Proof of Delivery Records</h3>
        <p className="mt-1 text-sm text-gray-500">
          Review delivery confirmations for your orders
        </p>
      </div>
      
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Order ID
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Delivery Date
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Rider
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Recipient
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  <tr>
                    <td colSpan={6} className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-500 sm:pl-6 text-center">
                      No POD records found.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorPOD;
