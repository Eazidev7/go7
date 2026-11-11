import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Toaster as SonnerToaster } from 'sonner';
import { LocationProvider } from './contexts/LocationContext.jsx';
import { NotificationProvider } from './contexts/NotificationContext.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import AddToHomeScreenPrompt from './components/AddToHomeScreenPrompt.tsx';
import { useCustomerActivityNotifications } from './hooks/useCustomerActivityNotifications.js';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase/config';
import { subscribePricingSettings } from './utils/pricingSettings';
import { initNativePushNotifications } from './utils/nativePush';
import { requestNotificationPermission } from './utils/requestPermission';
import LocationPermissionDisclosure from './components/LocationPermissionDisclosure';
import AppUpdateGate from './components/AppUpdateGate';

const FigmaApp = React.lazy(() => import('../go7 figma/FigmaApp'));

/** Must render under AuthProvider — drives booking/enroute toasts app-wide. */
function ActivityNotificationsBridge() {
  useCustomerActivityNotifications();
  return null;
}

const SHELL_HEAL_KEY = 'go7-shell-suspense-heal';
/** Slow cellular can need 20–40s for FigmaApp chunks — do not auto-reload early. */
const SUSPENSE_WATCHDOG_MS = 40000;

function isChunkLoadError(error) {
  const runtime = window.__GO7_RUNTIME__;
  const msg = String(error?.message || error || '');
  if (typeof runtime?.isStaleBundleMessage === 'function') {
    return runtime.isStaleBundleMessage(msg);
  }
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Loading chunk') ||
    msg.includes('Unable to preload CSS')
  );
}

async function softHealOnce(sessionKey = SHELL_HEAL_KEY) {
  try {
    if (sessionStorage.getItem(sessionKey)) return false;
    sessionStorage.setItem(sessionKey, '1');
  } catch {
    /* private mode — still try once */
  }
  try {
    const runtime = window.__GO7_RUNTIME__;
    if (typeof runtime?.purgeClientCaches === 'function') {
      await runtime.purgeClientCaches();
    }
  } catch {
    /* ignore */
  }
  window.location.reload();
  return true;
}

class ShellErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      rootCause: '',
      showDetails: false,
      healing: false,
      autoRetried: false,
    };
  }

  static getDerivedStateFromError(error) {
    const message =
      (error?.message && String(error.message)) ||
      (typeof error === 'string' ? error : '') ||
      (error != null ? String(error) : 'Unknown render error');
    return {
      hasError: true,
      message,
    };
  }

  componentDidCatch(error, errorInfo) {
    const stack = errorInfo?.componentStack || '';
    console.error('Customer shell error:', error);
    if (stack) console.error('Customer shell componentStack:', stack);

    if (isChunkLoadError(error)) {
      this.setState({ healing: true });
      const runtime = window.__GO7_RUNTIME__;
      const tryHeal = async () => {
        if (typeof runtime?.reloadOnce === 'function' && runtime.reloadOnce()) return true;
        return softHealOnce();
      };
      tryHeal()
        .then((healed) => {
          if (!healed) this.setState({ healing: false });
        })
        .catch(() => this.setState({ healing: false }));
      return;
    }

    // Empty/"Uncaught" errors are often Vite HMR mid-update — soft retry once.
    const msg = String(error?.message || error || '');
    if (!this.state.autoRetried && (!msg || msg === 'Uncaught' || msg === 'Unknown render error')) {
      this.setState({ autoRetried: true });
      window.setTimeout(() => {
        this.setState({ hasError: false, message: '', rootCause: '', showDetails: false, healing: false });
      }, 50);
      return;
    }

    import('./utils/bootDiagnostics.js')
      .then(({ runBootDiagnostics }) => runBootDiagnostics(error))
      .then((report) => this.setState({ rootCause: report?.likelyRootCause || '' }))
      .catch((diagError) => console.error('Shell diagnostics failed:', diagError));
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '', rootCause: '', showDetails: false, healing: false, autoRetried: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.state.healing) {
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
            <p className="text-2xl font-extrabold text-red-600 mb-4">Go7</p>
            <div
              className="w-9 h-9 rounded-full border-2 border-red-100 border-t-red-500 animate-spin"
              aria-hidden
            />
            <p className="mt-4 text-sm text-gray-500">Refreshing…</p>
          </div>
        );
      }
      const isDev = typeof import.meta !== 'undefined' && !import.meta.env?.PROD;
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white px-6 text-center">
          <p className="text-2xl font-extrabold text-red-600">Go7</p>
          <p className="text-gray-700 text-sm">Something went wrong. Please try again.</p>
          {(isDev || this.state.showDetails) && this.state.message ? (
            <div className="text-xs text-gray-400 max-w-xs break-words">
              {this.state.rootCause ? <p className="font-semibold mb-1">{this.state.rootCause}</p> : null}
              <p>{this.state.message}</p>
            </div>
          ) : null}
          {!isDev && !this.state.showDetails ? (
            <button
              type="button"
              onClick={() => this.setState({ showDetails: true })}
              className="text-gray-300 text-[11px] underline"
            >
              Technical details
            </button>
          ) : null}
          <button
            type="button"
            onClick={this.handleRetry}
            className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold text-sm"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-gray-500 text-sm underline"
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Marks boot when FigmaApp mounts (shell also marks earlier — see CustomerMobileShell). */
function FigmaAppReady({ children }) {
  useEffect(() => {
    if (typeof window.__GO7_RUNTIME__?.markBooted === 'function') {
      window.__GO7_RUNTIME__.markBooted();
    }
  }, []);
  return children;
}

/**
 * Only mounts while Suspense is pending — timer cancels when FigmaApp loads.
 * After ~40s show Try again. Do not auto-reload (reloads reset slow cellular progress).
 */
function BootShell() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) setStuck(true);
    }, SUSPENSE_WATCHDOG_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (stuck) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <p className="text-2xl font-extrabold text-red-600 mb-3">Go7</p>
        <p className="text-sm text-gray-600 mb-5 max-w-xs leading-relaxed">
          Taking longer than usual. Tap to try again — no need to close the app.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold text-sm w-full max-w-xs"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <p className="text-2xl font-extrabold text-red-600 mb-4">Go7</p>
      <div
        className="w-9 h-9 rounded-full border-2 border-red-100 border-t-red-500 animate-spin"
        aria-hidden
      />
      <p className="mt-4 text-sm text-gray-500">Loading…</p>
    </div>
  );
}

export default function CustomerMobileShell() {
  useEffect(() => {
    document.body.classList.add('go7-mobile-shell');
    // Prevent go7-boot from wiping the React tree while FigmaApp chunks load
    if (typeof window.__GO7_RUNTIME__?.markBooted === 'function') {
      window.__GO7_RUNTIME__.markBooted();
    }
    return () => {
      document.body.classList.remove('go7-mobile-shell');
    };
  }, []);

  // Keep food checkout on the same live fares as Book Delivery
  useEffect(() => {
    if (!db) return undefined;
    return subscribePricingSettings(db);
  }, []);

  // Native FCM on Capacitor Android (Play Store builds)
  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (user) => {
      if (user?.uid) {
        initNativePushNotifications(user.uid).catch(() => {});
      }
    });
  }, []);

  // Prompt for notification permission once on first app open
  useEffect(() => {
    try {
      if (localStorage.getItem('go7_first_permissions_asked')) return;
      localStorage.setItem('go7_first_permissions_asked', '1');
      requestNotificationPermission().catch(() => {});
    } catch {
      // private mode / restricted storage — permissions will be asked on first use
    }
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <ActivityNotificationsBridge />
        <BrowserRouter>
          <LocationProvider>
            <ShellErrorBoundary>
              <Suspense fallback={<BootShell />}>
                <FigmaAppReady>
                  <FigmaApp />
                </FigmaAppReady>
                <LocationPermissionDisclosure />
                <AppUpdateGate />
              </Suspense>
              <AddToHomeScreenPrompt />
              <Toaster
                position="top-center"
                containerStyle={{ zIndex: 100001 }}
                toastOptions={{
                  duration: 4000,
                  style: {
                    maxWidth: '500px',
                    padding: '16px',
                    fontSize: '15px',
                    zIndex: 100001,
                  },
                }}
              />
              {/* Figma UI uses sonner — branded white-card toasts (2026) */}
              <SonnerToaster
                position="top-center"
                theme="light"
                closeButton
                expand
                visibleToasts={3}
                offset="calc(env(safe-area-inset-top, 0px) + 12px)"
                toastOptions={{
                  duration: 4200,
                  classNames: {
                    toast: 'go7-sonner-toast',
                    title: 'go7-sonner-title',
                    description: 'go7-sonner-description',
                  },
                }}
              />
            </ShellErrorBoundary>
          </LocationProvider>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
