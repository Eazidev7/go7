import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import ExploreGo7 from '../pages/ExploreGo7';

/**
 * Visual Test Page for ExploreGo7 Homepage
 * 
 * This page demonstrates the full mobile homepage experience
 * in an isolated environment for testing and presentation.
 */
const ExploreGo7Demo = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* Demo Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 text-center">
          <p className="text-sm font-semibold">📱 DEMO MODE - Modern Homepage Experience</p>
          <p className="text-xs mt-1">Testing on 375×812 viewport (iPhone X/11/12)</p>
        </div>

        {/* Main Homepage */}
        <ExploreGo7 />

        {/* Demo Controls */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-3 flex items-center justify-around z-50">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-900"
          >
            🔄 Reload
          </button>
          <button
            onClick={() => {
              window.open('/explore-go7', '_blank');
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
          >
            🚀 Full Screen
          </button>
          <button
            onClick={() => {
              const guide = '/EXPLORE_GO7_GUIDE.md';
              window.open(guide, '_blank');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            📚 Guide
          </button>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default ExploreGo7Demo;
