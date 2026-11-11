import React, { useState, useEffect } from 'react';

const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [errors, setErrors] = useState([]);
  const [allMessages, setAllMessages] = useState([]);

  const refreshErrors = () => {
    if (window.getMapErrors) {
      setErrors(window.getMapErrors());
    }
    if (window.getConsoleMessages) {
      setAllMessages(window.getConsoleMessages());
    }
  };

  useEffect(() => {
    // Refresh every 3 seconds
    const interval = setInterval(refreshErrors, 3000);
    refreshErrors(); // Initial load
    return () => clearInterval(interval);
  }, []);

  const clearAll = () => {
    if (window.clearConsoleMessages) {
      window.clearConsoleMessages();
    }
    setErrors([]);
    setAllMessages([]);
  };

  const mapErrors = errors.filter(e => e.type === 'error');
  const mapWarnings = errors.filter(e => e.type === 'warn');
  const networkErrors = allMessages.filter(e => e.type === 'network-error');

  return (
    <div style={{ position: 'fixed', bottom: '10px', left: '10px', zIndex: 10000 }}>
      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: mapErrors.length > 0 ? '#ff4444' : mapWarnings.length > 0 ? '#ffaa00' : '#44aa44',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
      >
        🐛 Debug ({mapErrors.length} errors, {mapWarnings.length} warnings)
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '35px',
          left: '0',
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '15px',
          width: '500px',
          maxHeight: '400px',
          overflow: 'auto',
          fontSize: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '14px' }}>Console Debug Panel</h3>
            <div>
              <button onClick={refreshErrors} style={{ marginRight: '5px', fontSize: '11px' }}>Refresh</button>
              <button onClick={clearAll} style={{ marginRight: '5px', fontSize: '11px' }}>Clear</button>
              <button onClick={() => setIsOpen(false)} style={{ fontSize: '11px' }}>✕</button>
            </div>
          </div>

          {/* Map Errors */}
          {mapErrors.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <h4 style={{ color: '#ff4444', margin: '0 0 5px 0', fontSize: '12px' }}>
                🔴 Map Errors ({mapErrors.length})
              </h4>
              {mapErrors.slice(-3).map((error, i) => (
                <div key={i} style={{ 
                  background: '#ffe6e6', 
                  padding: '5px', 
                  margin: '2px 0', 
                  borderRadius: '3px',
                  fontSize: '10px',
                  wordBreak: 'break-word'
                }}>
                  <strong>{error.timestamp.split('T')[1].split('.')[0]}:</strong> {error.message}
                </div>
              ))}
            </div>
          )}

          {/* Map Warnings */}
          {mapWarnings.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <h4 style={{ color: '#ffaa00', margin: '0 0 5px 0', fontSize: '12px' }}>
                🟡 Map Warnings ({mapWarnings.length})
              </h4>
              {mapWarnings.slice(-3).map((warning, i) => (
                <div key={i} style={{ 
                  background: '#fff5e6', 
                  padding: '5px', 
                  margin: '2px 0', 
                  borderRadius: '3px',
                  fontSize: '10px',
                  wordBreak: 'break-word'
                }}>
                  <strong>{warning.timestamp.split('T')[1].split('.')[0]}:</strong> {warning.message}
                </div>
              ))}
            </div>
          )}

          {/* Network Errors */}
          {networkErrors.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <h4 style={{ color: '#ff4444', margin: '0 0 5px 0', fontSize: '12px' }}>
                🌐 Network Errors ({networkErrors.length})
              </h4>
              {networkErrors.slice(-3).map((error, i) => (
                <div key={i} style={{ 
                  background: '#ffe6e6', 
                  padding: '5px', 
                  margin: '2px 0', 
                  borderRadius: '3px',
                  fontSize: '10px',
                  wordBreak: 'break-word'
                }}>
                  <strong>{error.timestamp.split('T')[1].split('.')[0]}:</strong> {error.message}
                </div>
              ))}
            </div>
          )}

          {/* Success State */}
          {mapErrors.length === 0 && mapWarnings.length === 0 && networkErrors.length === 0 && (
            <div style={{ color: '#44aa44', textAlign: 'center', padding: '20px' }}>
              ✅ No map-related console issues detected!
            </div>
          )}

          {/* Instructions */}
          <div style={{ 
            background: '#f5f5f5', 
            padding: '8px', 
            borderRadius: '4px', 
            fontSize: '10px',
            marginTop: '10px'
          }}>
            <strong>Console Commands:</strong><br/>
            • <code>window.getMapErrors()</code> - Show all map errors<br/>
            • <code>window.getConsoleMessages()</code> - Show all messages<br/>
            • <code>window.debugMaps()</code> - Run map diagnostics
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;