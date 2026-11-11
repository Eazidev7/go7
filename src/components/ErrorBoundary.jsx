import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      error: error
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error only once - DON'T call setState here (causes infinite loop)
    if (!this.hasLogged) {
      console.error('🚨 ErrorBoundary:', error.message || error.toString());
      this.hasLogged = true;
    }
    
    // Store errorInfo in a ref instead of state to avoid triggering updates
    this.errorInfo = errorInfo;
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const errorInfo = this.errorInfo;
      
      // Fallback UI
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚠️</div>
          <h1 style={{ color: '#e60023', marginBottom: '10px' }}>Something went wrong</h1>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            {error && error.message && error.message.includes('removeChild') 
              ? 'React encountered a DOM manipulation error. Please reload the page.'
              : 'The application encountered an unexpected error.'}
          </p>
          <details style={{ whiteSpace: 'pre-wrap', background: '#fff', padding: '15px', borderRadius: '8px', maxWidth: '600px', overflow: 'auto', border: '1px solid #ddd' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '10px', fontWeight: 'bold' }}>Error Details</summary>
            <pre style={{ fontSize: '12px', margin: 0 }}>
              <strong>Error:</strong> {error && error.toString()}
              <br />
              <strong>Stack:</strong> {errorInfo && errorInfo.componentStack}
            </pre>
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              backgroundColor: '#5c6ac4',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;