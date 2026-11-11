/**
 * Lightweight vendor dashboard shell — avoids loading the full customer App (~1MB).
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PathNormalizer from './components/PathNormalizer.jsx';
import VendorGuard from './components/guards/VendorGuard.jsx';
import VendorDashboard from './pages/VendorDashboard.jsx';
import VendorProfile from './pages/VendorProfile.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';

export default function VendorDashboardApp() {
  return (
    <BrowserRouter>
      <PathNormalizer>
        <AuthProvider>
        <div className="App min-h-screen overflow-x-hidden">
          <Toaster position="top-center" />
          <Routes>
            <Route element={<VendorGuard />}>
              <Route path="/vendor/dashboard" element={<VendorDashboard />} />
              <Route path="/vendor/dashboard/:vendorId" element={<VendorDashboard />} />
              <Route path="/vendor/:vendorId/profile" element={<VendorProfile />} />
            </Route>
            <Route path="*" element={<Navigate to="/vendor/login" replace />} />
          </Routes>
        </div>
        </AuthProvider>
      </PathNormalizer>
    </BrowserRouter>
  );
}
