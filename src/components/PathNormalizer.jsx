import { useLocation, Navigate } from 'react-router-dom';

const KNOWN_SEGMENTS = new Set([
  'vendor', 'agent', 'admin', 'rider', 'book', 'track', 'profile',
  'cart', 'mobile', 'orders', 'chat', 'explore', 'search', 'login',
]);

/**
 * Redirects mistyped paths like /Vendor/login or /vendor/login/ → /vendor/login
 * Runs during render (not useEffect) so Hostinger deep links never show a blank page.
 */
export default function PathNormalizer({ children }) {
  const location = useLocation();
  let pathname = location.pathname;

  if (pathname.length > 1 && pathname.endsWith('/')) {
    return (
      <Navigate
        to={pathname.slice(0, -1) + location.search + location.hash}
        replace
      />
    );
  }

  const parts = pathname.split('/');
  const segment = parts[1];
  if (segment) {
    const lower = segment.toLowerCase();
    if (segment !== lower && KNOWN_SEGMENTS.has(lower)) {
      parts[1] = lower;
      return (
        <Navigate
          to={parts.join('/') + location.search + location.hash}
          replace
        />
      );
    }
  }

  return children;
}
