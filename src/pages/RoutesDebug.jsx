import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function RoutesDebug() {
  const location = useLocation();

  const routes = [
    { path: '/', name: 'Home' },
    { path: '/orders', name: 'Orders' },
    { path: '/track', name: 'Track' },
    { path: '/chat', name: 'Chat' },
    { path: '/profile', name: 'Profile' },
    { path: '/book-delivery', name: 'Book Delivery' },
    { path: '/market', name: 'Market' },
    { path: '/pharmacy', name: 'Pharmacy' },
    { path: '/gobuy', name: 'GoBuy' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">🔍 Routes Debugger</h1>
          <p className="text-sm text-gray-600 mb-4">
            Current Path: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{location.pathname}</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Available Routes:</h2>
          <div className="space-y-2">
            {routes.map((route) => (
              <Link
                key={route.path}
                to={route.path}
                className={`block p-4 rounded-lg transition-all ${
                  location.pathname === route.path
                    ? 'bg-red-50 border-2 border-red-500 text-red-700'
                    : 'bg-gray-50 border-2 border-gray-200 hover:border-red-300 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{route.name}</span>
                    <span className="ml-2 text-sm text-gray-500 font-mono">{route.path}</span>
                  </div>
                  {location.pathname === route.path && (
                    <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">Current</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mt-6">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Click any route to navigate. If you see a 404, there's a routing configuration issue.
          </p>
        </div>
      </div>
    </div>
  );
}
