import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';

const HomeDebug = () => {
  console.log('🐛 HomeDebug component rendering...');
  
  return (
    <>
      <Helmet>
        <title>GO7 Delivery - Debug Mode</title>
      </Helmet>

      <main className="relative">
        {/* Test with just basic content first */}
        <div className="min-h-screen bg-white">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-center text-gray-900 mb-8">
              🐛 GO7 Debug Mode
            </h1>
            <div className="text-center">
              <p className="text-lg text-gray-600 mb-4">
                ✅ Basic React Component Working
              </p>
              <p className="text-sm text-gray-500">
                No complex components loaded - testing basic functionality.
              </p>
              <div className="mt-8 p-4 bg-gray-100 rounded">
                <h3 className="font-semibold mb-2">Debug Info:</h3>
                <p>Time: {new Date().toLocaleTimeString()}</p>
                <p>Component: HomeDebug</p>
                <p>Status: Rendering successfully</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default HomeDebug;