import React, { useState, useEffect } from 'react';

const ErrorReporter = () => {
  const [errors, setErrors] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check for errors every 2 seconds
    const interval = setInterval(() => {
      if (window.getMapErrors) {
        const mapErrors = window.getMapErrors();
        if (mapErrors.length > 0) {
          setErrors(mapErrors);
          setIsVisible(true);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible || errors.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#ff4444',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 10000,
      maxWidth: '400px',
      fontSize: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <strong>Map Console Errors ({errors.length})</strong>
        <button 
          onClick={() => setIsVisible(false)}
          style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
        >
          ×
        </button>
      </div>
      {errors.slice(-3).map((error, index) => (
        <div key={index} style={{ 
          background: 'rgba(0,0,0,0.2)', 
          padding: '5px', 
          margin: '2px 0', 
          borderRadius: '3px',
          fontSize: '11px'
        }}>
          <strong>{error.type.toUpperCase()}:</strong> {error.message.substring(0, 100)}...
        </div>
      ))}
      <div style={{ marginTop: '5px', fontSize: '10px' }}>
        Open browser console and run <code>window.getMapErrors()</code> for full details
      </div>
    </div>
  );
};

export default ErrorReporter;