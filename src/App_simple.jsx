import React, { useState, useEffect } from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import SimpleMobilePage from './pages/SimpleMobilePage.jsx';
import Home from './pages/Home.jsx';

// Simple responsive component that works on iOS
const ResponsiveHome = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth <= 768 || 
                   /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  // Use SimpleMobilePage for iOS compatibility
  return isMobile ? <SimpleMobilePage /> : <Home />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ResponsiveHome />} />
        <Route path="/mobile" element={<SimpleMobilePage />} />
        <Route path="/desktop" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;