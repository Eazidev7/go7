import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';

// Test with simple Hero component instead
import HeroSimple from '../components/home/HeroSimple';

const HomeStepByStep = () => {
  console.log('🔍 HomeStepByStep component rendering...');
  
  return (
    <>
      <Helmet>
        <title>GO7 Delivery - Step by Step Debug</title>
      </Helmet>

      <main className="relative">
        {/* Step 1: Test Simple Hero component */}
        <HeroSimple />
        
        {/* Add basic content to confirm page is working */}
        <div className="bg-gray-100 py-8">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">🔍 Step-by-Step Component Testing</h2>
            <p className="text-gray-600">Currently testing: Simple Hero component</p>
            <p className="text-sm text-gray-500 mt-2">
              If you see this section, Simple Hero component loaded successfully!
            </p>
          </div>
        </div>
      </main>
    </>
  );
};

export default HomeStepByStep;