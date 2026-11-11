import { Navigate, useSearchParams } from 'react-router-dom';

/** Redirect /tracking?orderId=... to /track-order/:id */
export default function TrackingQueryRedirect() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId')?.trim();

  if (orderId) {
    return <Navigate to={`/track-order/${encodeURIComponent(orderId)}`} replace />;
  }

  return <Navigate to="/track" replace />;
}
