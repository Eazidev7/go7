import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';

function MinimalApp() {
  console.log('🔍 MinimalApp rendering...');
  
  return (
    <AuthProvider>
      <div className="App">
        <h1>Minimal Go7 App</h1>
        <p>Testing basic functionality...</p>
        
        <Routes>
          <Route path="/" element={
            <div>
              <h2>Home Page</h2>
              <p>Welcome to Go7!</p>
            </div>
          } />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default MinimalApp;