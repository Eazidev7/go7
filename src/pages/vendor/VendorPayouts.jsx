import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { vendorDoc } from '../../lib/vendorRefs';
import VendorLayout from '../../components/vendor/VendorLayout';

const VendorPayouts = () => {
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
    <VendorLayout vendor={vendor} title="Payouts">
      <div className="mb-8">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Payout Summary</h3>
        <p className="mt-1 text-sm text-gray-500">
          Track your earnings and payment history
        </p>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Balance Summary</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Available Balance</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">₦0.00</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Pending Balance</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">₦0.00</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Total Paid Out</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">₦0.00</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Payout Method</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {vendor?.payoutDetails?.bankName ? 
                  `${vendor.payoutDetails.bankName} - ${vendor.payoutDetails.accountNumber}` : 
                  'No payout method set up'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Payout History</h3>
      </div>
      
      <div className="flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      No payout history found
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

export default VendorPayouts;
