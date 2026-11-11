import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import VendorLayout from '../components/vendor/VendorLayout.tsx';
import VendorAddons from '../components/vendor/VendorAddons.jsx';
import { VendorService } from '../services/VendorService.ts';
import { Helmet } from 'react-helmet-async';

/**
 * Vendor Add-ons Management Page
 * Integrates VendorAddons component into the main vendor dashboard layout
 */
const VendorAddonsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadVendorData = async () => {
      if (!user) {
        console.log('❌ User not authenticated, redirecting to login...');
        // Instead of showing error, redirect to vendor login
        navigate('/vendor/login');
        return;
      }

      try {
        console.log('🔍 Loading vendor data for user:', user.uid);
        const vendorData = await VendorService.getVendorByUserId(user.uid);
        
        if (!vendorData) {
          console.log('⚠️ No vendor account found for user:', user.uid);
          // User is authenticated but not a vendor - try using user.uid as vendor ID directly
          setVendor({ id: user.uid, name: 'Vendor' });
          setLoading(false);
          return;
        }

        console.log('✅ Vendor data loaded:', vendorData.name);
        setVendor(vendorData);
      } catch (err) {
        console.error('❌ Error loading vendor data:', err);
        // Fallback: use user.uid as vendor ID
        console.log('⚠️ Using fallback vendor ID:', user.uid);
        setVendor({ id: user.uid, name: 'Vendor' });
      } finally {
        setLoading(false);
      }
    };

    loadVendorData();
  }, [user, navigate]);

  if (loading) {
    return (
      <VendorLayout vendor={null} title="Add-ons Management">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your vendor account...</p>
          </div>
        </div>
      </VendorLayout>
    );
  }

  if (error) {
    return (
      <VendorLayout vendor={null} title="Add-ons Management">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.href = '/vendor/register'}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Register as Vendor
            </button>
          </div>
        </div>
      </VendorLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Add-ons Management | {vendor?.name || 'Vendor'} | Go7 Marketplace</title>
        <meta name="description" content="Manage your product add-ons and increase your revenue with Go7's comprehensive add-on system." />
      </Helmet>

      <VendorLayout vendor={vendor} title="Add-ons Management">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Add-ons Management</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Create and manage add-ons for your products to increase revenue and provide more options to customers.
                </p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  🎯 Revenue Boost
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  📸 Image Upload
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">+</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Add-ons</dt>
                      <dd className="text-lg font-medium text-gray-900">Coming Soon</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">📈</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Revenue from Add-ons</dt>
                      <dd className="text-lg font-medium text-gray-900">₦0.00</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">⭐</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Most Popular</dt>
                      <dd className="text-lg font-medium text-gray-900">-</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Add-ons Component */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Your Add-ons
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Manage your product add-ons, upload images, and set pricing to maximize your revenue.
              </p>
            </div>
            
            <div className="p-6">
              {vendor && (
                <VendorAddons vendorId={vendor.id} />
              )}
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold">💡</span>
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Tips for Successful Add-ons
                </h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• <strong>High-quality images:</strong> Upload clear, appetizing photos to increase selection rates</li>
                  <li>• <strong>Competitive pricing:</strong> Price add-ons reasonably to encourage customer purchases</li>
                  <li>• <strong>Clear descriptions:</strong> Write detailed descriptions that highlight the value</li>
                  <li>• <strong>Popular items:</strong> Create add-ons for your most popular products first</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </VendorLayout>
    </>
  );
};

export default VendorAddonsPage;