import React from 'react';
import VendorAddons from '../components/vendor/VendorAddons';
import { ToastContainer, useToasts } from '../components/addons/ToastNotifications';

const VendorAddonsDemo = () => {
  // Mock vendor ID - in a real app, this would come from auth context or route params
  const vendorId = "demo-vendor-123";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Vendor Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your restaurant add-ons and extras</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Vendor ID: {vendorId}</span>
              <div className="h-8 w-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">GO</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <VendorAddons vendorId={vendorId} />
      </div>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default VendorAddonsDemo;