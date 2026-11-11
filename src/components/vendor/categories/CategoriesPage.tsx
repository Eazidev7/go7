import React from 'react';
import { useVendor } from '../../../contexts/VendorContext';
import { getAuth } from 'firebase/auth';
// import VendorCategoriesManager from '../VendorCategoriesManager';

const CategoriesPage: React.FC = () => {
  const { vendorId } = useVendor();
  const auth = getAuth();
  const currentVendorId = vendorId || auth.currentUser?.uid;

  console.log('🏪 CategoriesPage loaded:', { vendorId, currentVendorId });

  if (!currentVendorId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Please log in to manage categories</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Categories Management</h1>
      <p>Vendor ID: {currentVendorId}</p>
      <p>Coming soon: Full category management interface</p>
      {/* <VendorCategoriesManager vendorId={currentVendorId} /> */}
    </div>
  );
};

export default CategoriesPage;