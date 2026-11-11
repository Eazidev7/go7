import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CustomerLiveTrackingScreen from './CustomerLiveTrackingScreen';
import { FigmaProviders } from '../components/FigmaProviders';

// Scoped error boundary so a crash inside tracking (bad map data, etc.)
// only breaks the tracking screen — not the whole app — and lets the
// customer get back to a safe screen instead of a full reload.
class TrackingErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Tracking screen crashed:', error?.message || error, errorInfo?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white p-6 text-center">
          <div>
            <p className="text-gray-600 mb-4">
              We hit a snag loading live tracking. Your order is safe — you can find it under Orders.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={this.props.onGoBack}
                className="border-2 border-red-600 text-red-600 px-5 py-3 rounded-full font-medium"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-5 py-3 rounded-full font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LiveDeliveryTrackingContent() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6 text-center">
        <div>
          <p className="text-gray-600 mb-4">No tracking ID provided.</p>
          <button
            type="button"
            onClick={() => navigate('/track')}
            className="bg-red-600 text-white px-6 py-3 rounded-full font-medium"
          >
            Enter tracking ID
          </button>
        </div>
      </div>
    );
  }

  return (
    <TrackingErrorBoundary onGoBack={() => navigate('/track', { replace: true })}>
      <CustomerLiveTrackingScreen
        orderId={decodeURIComponent(orderId)}
        onClose={() => navigate('/track', { replace: true })}
      />
    </TrackingErrorBoundary>
  );
}

export default function LiveDeliveryTrackingPage() {
  return (
    <FigmaProviders includeAuth>
      <div className="go7-tracking-screen">
        <LiveDeliveryTrackingContent />
      </div>
    </FigmaProviders>
  );
}
