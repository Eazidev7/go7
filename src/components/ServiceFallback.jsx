import React from 'react';

// A higher-order component that wraps components that depend on potentially
// unavailable services with a fallback UI in case of errors
export function withServiceFallback(Component, serviceName) {
  return class WithServiceFallback extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        hasError: false,
        error: null
      };
    }

    static getDerivedStateFromError(error) {
      return {
        hasError: true,
        error
      };
    }

    componentDidCatch(error, errorInfo) {
      console.error(`Error in ${serviceName} component:`, error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return (
          <div style={{
            padding: '15px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeeba',
            borderRadius: '4px',
            color: '#856404',
            margin: '10px 0'
          }}>
            <h4 style={{ margin: '0 0 10px' }}>Service Temporarily Unavailable</h4>
            <p style={{ margin: 0 }}>
              The {serviceName} feature is currently unavailable. 
              We're working to restore full functionality soon.
            </p>
          </div>
        );
      }

      return <Component {...this.props} />;
    }
  };
}

// A component that provides a standard fallback UI for any component
export function ServiceFallback({ serviceName, message }) {
  return (
    <div style={{
      padding: '15px',
      backgroundColor: '#fff3cd',
      border: '1px solid #ffeeba',
      borderRadius: '4px',
      color: '#856404',
      margin: '10px 0'
    }}>
      <h4 style={{ margin: '0 0 10px' }}>Service Temporarily Unavailable</h4>
      <p style={{ margin: 0 }}>
        {message || `The ${serviceName} feature is currently unavailable. We're working to restore full functionality soon.`}
      </p>
    </div>
  );
}

export default { withServiceFallback, ServiceFallback };