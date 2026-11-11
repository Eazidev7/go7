import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

// Import the AppRouter instead of just Home page
import AppRouter from './AppRouter';

// App component that uses full routing system
function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="App">
            <AppRouter />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </HelmetProvider>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);