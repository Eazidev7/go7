import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Import existing working components
import Home from './pages/Home';

// Lazy load other components
const BookDelivery = React.lazy(() => import('./pages/BookDelivery').catch(() => ({ default: () => <div className="p-8 text-center">Book Delivery Page Coming Soon</div> })));
const TrackPackage = React.lazy(() => import('./pages/TrackPackage').catch(() => ({ default: () => <div className="p-8 text-center">Track Package Page Coming Soon</div> })));

function SimpleRouter() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-go7-primary"></div>
      </div>
    }>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/book-delivery" element={<BookDelivery />} />
        <Route path="/track" element={<TrackPackage />} />
        <Route path="/track-package" element={<TrackPackage />} />
        
        {/* Catch all route */}
        <Route path="*" element={
          <div className="flex flex-col items-center justify-center min-h-screen text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
            <p className="text-gray-600 mb-8">Page not found</p>
            <a href="/" className="bg-go7-primary text-white px-6 py-3 rounded-lg hover:bg-go7-primary/90">
              Go Home
            </a>
          </div>
        } />
      </Routes>
    </Suspense>
  );
}

export default SimpleRouter;