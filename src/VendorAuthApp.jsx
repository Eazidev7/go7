/**
 * Lightweight vendor auth shell — avoids loading the full App on login/register.
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PathNormalizer from './components/PathNormalizer.jsx';
import VendorLogin from './pages/VendorLogin.jsx';
import VendorRegister from './pages/VendorRegister.jsx';

export default function VendorAuthApp() {
  return (
    <BrowserRouter>
      <PathNormalizer>
        <div className="App min-h-screen overflow-x-hidden">
          <Toaster position="top-center" />
          <Routes>
            <Route path="/vendor/login" element={<VendorLogin />} />
            <Route path="/vendor/register" element={<VendorRegister />} />
            <Route path="*" element={<Navigate to="/vendor/login" replace />} />
          </Routes>
        </div>
      </PathNormalizer>
    </BrowserRouter>
  );
}
