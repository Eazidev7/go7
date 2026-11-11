import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={`bg-red-50 border border-red-200 rounded-lg p-6 text-center ${this.props.className || ''}`}>
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h3>
          
          <p className="text-red-600 mb-4">
            We encountered an error while loading this component.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="text-left mb-4">
              <summary className="text-sm text-red-700 cursor-pointer mb-2">
                Error Details (Development Only)
              </summary>
              <pre className="text-xs bg-red-100 p-3 rounded border text-red-800 overflow-auto">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional component version using error boundary hook
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}