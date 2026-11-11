import React from 'react';

/**
 * ExploreGo7Minimal - Ultra minimal test version
 * No dependencies, no contexts, just pure React + Tailwind
 */
const ExploreGo7Minimal = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h1 className="text-3xl font-bold text-red-600 mb-2">
            🛵 Go7 Modern Homepage
          </h1>
          <p className="text-gray-600">
            Minimal version - No Firebase, No Contexts
          </p>
        </div>

        {/* Categories */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h2 className="text-xl font-bold mb-4">Categories</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2">
                <span className="text-3xl">🍔</span>
              </div>
              <p className="text-sm">Fast Food</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2">
                <span className="text-3xl">🛒</span>
              </div>
              <p className="text-sm">Groceries</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2">
                <span className="text-3xl">🏃</span>
              </div>
              <p className="text-sm">Errands</p>
            </div>
          </div>
        </div>

        {/* Promo */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow-lg p-6 mb-4 text-white">
          <h3 className="text-2xl font-bold mb-2">₦200 OFF</h3>
          <p>Your first delivery order</p>
        </div>

        {/* Vendors */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Popular Vendors</h2>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-bold">KFC</h3>
              <p className="text-sm text-gray-600">Fast Food • ⭐ 4.5</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-bold">Domino's Pizza</h3>
              <p className="text-sm text-gray-600">Pizza • ⭐ 4.7</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-bold">ShopRite</h3>
              <p className="text-sm text-gray-600">Groceries • ⭐ 4.3</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-6 p-4 bg-green-100 rounded-lg text-center">
          <p className="text-green-800 font-bold">
            ✅ Minimal Version Working!
          </p>
          <p className="text-sm text-green-700 mt-2">
            If you see this, routing works. The issue is in the full components.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExploreGo7Minimal;
