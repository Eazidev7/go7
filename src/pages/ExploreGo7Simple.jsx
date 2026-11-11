import React from 'react';

const ExploreGo7Simple = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-8">
      <div className="max-w-md mx-auto">
        {/* Test Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-red-600 mb-2">
            🎉 Go7 Mobile Homepage
          </h1>
          <p className="text-gray-600">Modern delivery app experience</p>
        </div>

        {/* Status Check */}
        <div className="space-y-4">
          <div className="bg-green-100 border-2 border-green-500 rounded-xl p-4">
            <p className="font-bold text-green-800">✅ React Working</p>
            <p className="text-sm text-green-700">Page is rendering correctly</p>
          </div>

          <div className="bg-blue-100 border-2 border-blue-500 rounded-xl p-4">
            <p className="font-bold text-blue-800">📱 Components Ready:</p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• HomeHeader (sticky nav)</li>
              <li>• CategoryCarousel (5 icons)</li>
              <li>• PromoBanner (auto-slide)</li>
              <li>• VendorList (from Firestore)</li>
              <li>• FABMenu (floating button)</li>
            </ul>
          </div>

          <div className="bg-yellow-100 border-2 border-yellow-500 rounded-xl p-4">
            <p className="font-bold text-yellow-800">⚠️ Known Issues:</p>
            <ul className="text-sm text-yellow-700 mt-2 space-y-1">
              <li>• Google Fonts 503 (using system fonts)</li>
              <li>• Google Maps 503 (not needed on homepage)</li>
            </ul>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="mt-6 space-y-3">
          <button
            onClick={() => window.location.href = '/explore-test'}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition-colors"
          >
            🧪 Basic Test Page
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gray-600 text-white py-4 rounded-xl font-semibold shadow-lg hover:bg-gray-700 transition-colors"
          >
            🏠 Original Home
          </button>

          <button
            onClick={() => window.location.href = '/mobile'}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-semibold shadow-lg hover:bg-red-700 transition-colors"
          >
            📱 Mobile Home
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 bg-white rounded-xl p-4 border-2 border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            If you see this page, React is working!
            <br />
            The ExploreGo7 components may have dependency issues.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExploreGo7Simple;
