import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { Capacitor } from '@capacitor/core';
import { installLowNetworkFetch } from './utils/lowNetworkFetch.js';
import { initCapacitorSafeArea } from './utils/capacitorSafeArea.js';
import { setupProcessErrorHandling } from './utils/listenerManager.js';
import { isMobileOrTablet } from './utils/deviceClass.js';
import UpdateAvailableToast from './components/UpdateAvailableToast.jsx';
import './index.css';
import { soundService } from './services/soundService.js';

// Make network calls resilient on slow/unstable connections (timeout + retry).
installLowNetworkFetch();

// Prime notification audio on the first user gesture. Browsers block sound until
// the document has user activation, which is why no tone was ever audible.
soundService.installUnlock();

if (Capacitor.isNativePlatform()) {
  initCapacitorSafeArea();
}

if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

document.addEventListener('touchstart', function () {}, { passive: true });
setupProcessErrorHandling();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const isProd = import.meta.env.PROD;
const runtime = window.__GO7_RUNTIME__ || {};

function currentPath() {
  return (location.pathname || '').replace(/\/+$/, '') || '/';
}

function isVendorAuthLitePage() {
  if (window.__GO7_VENDOR_ENTRY__) return true;
  return /^\/vendor\/(login|register)$/i.test(currentPath());
}

function isVendorDashboardPage() {
  const path = currentPath();
  return (
    /^\/vendor\/dashboard/i.test(path) ||
    /^\/vendor\/[^/]+\/profile$/i.test(path)
  );
}

function isMobileDevice() {
  // Phones + tablets (iPad Mini, Android tabs) get the lite shell.
  // True desktop/laptop browsers keep the full desktop site.
  return isMobileOrTablet();
}

function shouldUseMobileShell() {
  const path = currentPath();

  const fullAppPrefixes = [
    '/vendor',
    '/agent',
    '/admin',
    '/partner',
    '/rider',
    '/book-delivery',
    '/book',
    '/debug',
    '/test',
    '/firebase',
    '/paystack',
    '/wallet',
  ];

  // Full-app routes always bypass the shell — including on localhost, so the
  // real pages can be QA'd/previewed locally just like on a real device.
  if (fullAppPrefixes.some(
    (prefix) => path === prefix || path.startsWith(prefix + '/')
  )) {
    return false;
  }

  // Local preview: always use the customer Figma shell so Bills / Home tiles
  // work in desktop Chrome without needing device-mode every time.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return true;
  }
  if (!isMobileDevice()) return false;

  return true;
}

/** Only failed chunk/network loads — never code bugs */
function isChunkLoadError(error) {
  const msg = String(error?.message || error || '');
  if (typeof runtime.isStaleBundleMessage === 'function') {
    return runtime.isStaleBundleMessage(msg);
  }
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Loading chunk')
  );
}

/** Silent reload once — no "Updating GO7" screen */
async function silentHealOnce() {
  if (typeof runtime.reloadOnce === 'function' && runtime.reloadOnce()) {
    return true;
  }
  const key = 'go7-main-heal';
  if (sessionStorage.getItem(key)) return false;
  sessionStorage.setItem(key, '1');
  try {
    if (typeof runtime.purgeClientCaches === 'function') {
      await runtime.purgeClientCaches();
    }
  } catch {
    /* ignore */
  }
  window.location.reload();
  return true;
}

function friendlyMessageFor(rootCause) {
  if (rootCause === 'device-offline') {
    return 'You appear to be offline. Please check your connection and try again.';
  }
  if (rootCause?.startsWith('cannot-reach-go7-hosting')) {
    return "We couldn't reach Go7's servers. Please check your connection and try again.";
  }
  if (
    rootCause?.startsWith('firestore-') ||
    rootCause?.startsWith('firebase-') ||
    rootCause?.startsWith('cloud-functions-') ||
    rootCause === 'authentication-token-issue (from thrown error)' ||
    rootCause === 'cors-blocked (from thrown error)'
  ) {
    return "We're having trouble reaching Go7's services right now. Please try again in a moment.";
  }
  return 'Something went wrong while loading Go7. Please try again.';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showRetryScreen(report) {
  const rootCause = report?.likelyRootCause || 'unknown';
  const message = friendlyMessageFor(rootCause);
  const isDevBuild = !isProd;
  const errorMessage = report?.error?.message || 'No error captured';
  const detailsJson = report ? escapeHtml(JSON.stringify(report, null, 2)) : 'No diagnostics available';

  rootElement.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;background:#fafafa;padding:24px">
      <div style="background:white;padding:32px 28px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08);text-align:center;max-width:420px;width:100%">
        <p style="font-size:28px;font-weight:800;color:#ef4444;margin:0 0 12px">Go7</p>
        <h2 style="color:#111;margin:0 0 8px;font-size:17px">Having trouble loading</h2>
        <p style="color:#666;margin:0 0 20px;font-size:14px;line-height:1.5">${escapeHtml(message)}</p>
        <button onclick="location.reload()" style="background:#ef4444;color:white;border:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;width:100%">Try again</button>
        <details style="margin-top:16px;text-align:left;${isDevBuild ? '' : 'display:none;'}">
          <summary style="cursor:pointer;font-size:12px;color:#999">Technical details</summary>
          <p style="font-size:12px;color:#333;margin:8px 0 4px;font-weight:600">Root cause: ${escapeHtml(rootCause)}</p>
          <p style="font-size:12px;color:#333;margin:0 0 8px">Error: ${escapeHtml(errorMessage)}</p>
          <pre style="font-size:10px;color:#444;background:#f5f5f5;padding:8px;border-radius:6px;max-height:200px;overflow:auto;text-align:left;white-space:pre-wrap;word-break:break-all">${detailsJson}</pre>
        </details>
        <p style="margin-top:14px;font-size:11px;color:#bbb">Tap 5 times on "Go7" above to reveal technical details.</p>
      </div>
    </div>
  `;

  if (!isDevBuild) {
    let taps = 0;
    const heading = rootElement.querySelector('p');
    const detailsEl = rootElement.querySelector('details');
    if (heading && detailsEl) {
      heading.addEventListener('click', () => {
        taps += 1;
        if (taps >= 5) detailsEl.style.display = '';
      });
    }
  }
}

function renderApp(tree) {
  const root = ReactDOM.createRoot(rootElement);
  const withUpdateToast = (
    <>
      {tree}
      <UpdateAvailableToast />
    </>
  );
  if (isProd) {
    root.render(<HelmetProvider>{withUpdateToast}</HelmetProvider>);
  } else {
    root.render(
      <React.StrictMode>
        <HelmetProvider>{withUpdateToast}</HelmetProvider>
      </React.StrictMode>
    );
  }
}

function registerPushWorkerLater() {
  if (!isProd || window.__GO7_LITE_PAGE__) return;
  if (!('serviceWorker' in navigator)) return;

  const host = location.hostname;
  const isProdHost =
    host === 'go7-delivery.web.app' ||
    host === 'go7-delivery.firebaseapp.com' ||
    host === 'go7-app-209e4.web.app' ||
    host === 'go7-app-209e4.firebaseapp.com' ||
    host === 'go7.ng' ||
    host.endsWith('.go7.ng');
  if (!isProdHost) return;

  const buildId = runtime.buildId || Date.now();
  const register = () => {
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js?v=' + encodeURIComponent(buildId), { scope: '/' })
      .then((registration) => {
        window.fcmSwRegistration = registration;
        // Pick up SW updates without waiting for a full browser close
        if (registration.update) {
          registration.update().catch(() => {});
        }
      })
      .catch(() => { /* non-fatal */ });
  };

  // Register sooner so iPhone PWA can enable push without a long wait
  if ('requestIdleCallback' in window) {
    requestIdleCallback(register, { timeout: 4000 });
  } else {
    setTimeout(register, 2000);
  }
}

async function bootstrap() {
  try {
    if (isVendorAuthLitePage()) {
      const { default: VendorAuthApp } = await import('./VendorAuthApp.jsx');
      renderApp(<VendorAuthApp />);
      return;
    }

    if (isVendorDashboardPage()) {
      const { default: VendorDashboardApp } = await import('./VendorDashboardApp.jsx');
      renderApp(<VendorDashboardApp />);
      return;
    }

    if (shouldUseMobileShell()) {
      const { default: CustomerMobileShell } = await import('./CustomerMobileShell.jsx');
      // markBooted runs after FigmaApp mounts (CustomerMobileShell FigmaAppReady)
      renderApp(<CustomerMobileShell />);
      registerPushWorkerLater();
      return;
    }

    const { default: App } = await import('./App.jsx');
    renderApp(<App />);
    registerPushWorkerLater();
  } catch (error) {
    console.error('Bootstrap failed:', error);
    if (isChunkLoadError(error)) {
      const healed = await silentHealOnce();
      if (healed) return;
      const report = await runDiagnosticsSafely(error);
      showRetryScreen(report);
      return;
    }
    const report = await runDiagnosticsSafely(error);
    showRetryScreen(report);
  }
}

async function runDiagnosticsSafely(error) {
  try {
    const { runBootDiagnostics } = await import('./utils/bootDiagnostics.js');
    return await runBootDiagnostics(error);
  } catch (diagError) {
    console.error('Boot diagnostics failed to run:', diagError);
    return { likelyRootCause: 'diagnostics-failed', error: { message: error?.message, stack: error?.stack } };
  }
}

bootstrap();

// Do NOT wipe the app with "Updating GO7" on runtime errors — log only.
// Chunk failures are handled silently by go7-boot.js before React loads.
