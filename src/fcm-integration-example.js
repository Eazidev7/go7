// Example integration in your src/index.js or src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import FCMInitializer from './fcmInitializer';

// Initialize FCM
FCMInitializer.initialize()
  .then(success => {
    console.log('FCM initialization result:', success ? 'success' : 'failed');
  })
  .catch(error => {
    console.error('Error during FCM initialization:', error);
  });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);