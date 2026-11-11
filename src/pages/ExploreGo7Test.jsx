import React from 'react';

const ExploreGo7Test = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          🎉 ExploreGo7 Test Page
        </h1>
        
        <div className="space-y-4">
          <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4">
            <p className="font-semibold text-green-800">✅ React is working!</p>
            <p className="text-sm text-green-700">If you see this, the page is loading correctly.</p>
          </div>
          
          <div className="bg-blue-100 border-2 border-blue-500 rounded-lg p-4">
            <p className="font-semibold text-blue-800">📱 Mobile Homepage Components:</p>
            <ul className="list-disc list-inside text-sm text-blue-700 mt-2">
              <li>HomeHeader</li>
              <li>CategoryCarousel</li>
              <li>PromoBanner</li>
              <li>VendorList</li>
              <li>FABMenu</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <a 
              href="/explore-go7" 
              className="block w-full bg-red-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Load Full Homepage
            </a>
            
            <a 
              href="/" 
              className="block w-full bg-gray-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Go to Original Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExploreGo7Test;
