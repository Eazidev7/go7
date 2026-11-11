/**
 * Boot diagnostics — runs when the app fails to start.
 *
 * Goal: never show a generic "check your connection" message without knowing
 * WHY. This probes network, Firebase config, Firestore, Auth, and Cloud
 * Functions independently so we can tell customers vs developers apart:
 *  - Console gets the full technical report (always, including production).
 *  - sessionStorage keeps the last report so support/devs can ask the user
 *    to open devtools -> Application -> Session Storage -> go7_last_boot_diagnostics.
 *  - The retry screen can show a togglable "Technical details" panel built
 *    from this report instead of a blind "check your connection" message.
 */

const FETCH_TIMEOUT_MS = 6000;

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function timedFetch(url, options, label) {
  const started = performance.now();
  try {
    const res = await withTimeout(fetch(url, { cache: 'no-store', ...options }), FETCH_TIMEOUT_MS, label);
    return {
      ok: true,
      status: res.status,
      statusText: res.statusText,
      ms: Math.round(performance.now() - started),
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      error: error?.message || String(error),
      // A bare TypeError from fetch (no status, no CORS-visible reason) is the
      // classic signature of either total network loss, a DNS failure, or a
      // CORS preflight rejection — the browser deliberately hides which.
      likelyCause:
        error?.name === 'TypeError'
          ? 'network-unreachable-or-cors'
          : error?.message?.includes('timed out')
          ? 'timeout'
          : 'unknown',
      ms: Math.round(performance.now() - started),
    };
  }
}

/** Is the device actually online, and can it reach the open internet at all? */
async function checkNetwork() {
  const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // no-cors so this works even if the target blocks CORS — we only care
  // whether the network layer could complete a round trip.
  const internet = await timedFetch(
    'https://www.gstatic.com/generate_204',
    { mode: 'no-cors' },
    'internet reachability'
  );

  const ownHost = await timedFetch(`${location.origin}/favicon.ico?_diag=${Date.now()}`, {}, 'own host');

  return {
    browserReportsOnline: browserOnline,
    canReachInternet: internet.ok,
    internet,
    canReachOwnHost: ownHost.ok,
    ownHost,
  };
}

/** Are the Firebase env vars actually present in this build? */
function checkEnvVars(firebaseConfig) {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missing = requiredFields.filter((f) => !firebaseConfig?.[f]);
  return {
    ok: missing.length === 0,
    missing,
    projectId: firebaseConfig?.projectId || null,
    authDomain: firebaseConfig?.authDomain || null,
    mode: import.meta.env.MODE,
    environment: import.meta.env.VITE_ENVIRONMENT || 'production',
  };
}

/**
 * Hit Firestore's REST endpoint directly (bypassing the SDK) so we can tell
 * apart: DNS/network failure vs CORS block vs 403 permission-denied vs a
 * genuinely missing/misconfigured project.
 */
async function checkFirestore(projectId) {
  if (!projectId) return { ok: false, reason: 'no-project-id' };
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/health_checks/connection_test`;
  const result = await timedFetch(url, {}, 'Firestore REST');
  return {
    ...result,
    // 403/401 means we reached Google's servers and hit security rules —
    // that is a PERMISSIONS problem, not a network problem.
    interpretation:
      result.status === 403 || result.status === 401
        ? 'reachable-permission-denied'
        : result.status === 404
        ? 'reachable-doc-missing (fine, project + endpoint are healthy)'
        : result.ok
        ? 'reachable'
        : result.likelyCause === 'network-unreachable-or-cors'
        ? 'unreachable-network-or-cors'
        : 'unreachable',
  };
}

/** Hit the Identity Toolkit (Firebase Auth) REST endpoint to validate the API key itself. */
async function checkAuth(apiKey) {
  if (!apiKey) return { ok: false, reason: 'no-api-key' };
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
  const result = await timedFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }, 'Auth REST');
  // Google always replies 400 MISSING_ID_TOKEN here when the key is valid and
  // reachable — that is a SUCCESS signal for this probe, not a failure.
  return {
    ...result,
    interpretation:
      result.status === 400
        ? 'api-key-valid-and-reachable'
        : result.status === 403
        ? 'api-key-invalid-or-restricted'
        : result.ok
        ? 'reachable'
        : result.likelyCause === 'network-unreachable-or-cors'
        ? 'unreachable-network-or-cors'
        : 'unreachable',
  };
}

/** Cloud Functions reachability — GET only (OPTIONS often false-alarms CORS). */
async function checkFunctions(projectId) {
  if (!projectId) return { ok: false, reason: 'no-project-id' };
  const region = 'us-central1';
  const url = `https://${region}-${projectId}.cloudfunctions.net/verifyPayment`;
  const result = await timedFetch(url, { method: 'GET' }, 'Cloud Functions');
  // 404 = function not deployed on this project (common after Firebase project switch).
  // CORS TypeError with no status usually means the same on HTTP functions that don't exist.
  let interpretation = 'unreachable';
  if (result.status === 404) {
    interpretation = 'not-deployed (404)';
  } else if (result.ok || result.status) {
    interpretation = 'reachable';
  } else if (result.likelyCause === 'network-unreachable-or-cors') {
    interpretation = 'probe-inconclusive-or-not-deployed (CORS hides 404)';
  }
  return {
    ...result,
    interpretation,
  };
}

function getAuthTokenState() {
  try {
    const session = localStorage.getItem('go7_user_session');
    return {
      hasStoredSession: !!session,
      guestMode: localStorage.getItem('go7_guest_mode') === 'true',
    };
  } catch (e) {
    return { hasStoredSession: null, guestMode: null, error: e?.message };
  }
}

/**
 * Run the full diagnostic sweep and log a real, actionable report.
 * Safe to call in production — no secrets are logged (API key never fully printed).
 */
export async function runBootDiagnostics(error) {
  const report = {
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : null,
    buildId: (typeof window !== 'undefined' && window.__GO7_RUNTIME__?.buildId) || 'unknown',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    error: error
      ? {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack,
        }
      : null,
    authToken: getAuthTokenState(),
    checks: {},
  };

  let firebaseConfig = null;
  try {
    const mod = await import('../firebase/config.js');
    firebaseConfig = mod.firebaseConfig || null;
  } catch (importError) {
    report.firebaseConfigImportError = importError?.message;
  }

  const [network, env, firestore, auth, functionsCheck] = await Promise.all([
    checkNetwork().catch((e) => ({ ok: false, error: e?.message })),
    Promise.resolve(checkEnvVars(firebaseConfig)),
    checkFirestore(firebaseConfig?.projectId).catch((e) => ({ ok: false, error: e?.message })),
    checkAuth(firebaseConfig?.apiKey).catch((e) => ({ ok: false, error: e?.message })),
    checkFunctions(firebaseConfig?.projectId).catch((e) => ({ ok: false, error: e?.message })),
  ]);

  report.checks = { network, env, firestore, auth, functions: functionsCheck };

  // Best-effort root-cause summary so a developer can scan one line and know
  // where to look, instead of reading five nested objects.
  report.likelyRootCause = determineRootCause(report.checks, error);

  try {
    // eslint-disable-next-line no-console
    console.groupCollapsed(
      `%cGO7 boot diagnostics — likely cause: ${report.likelyRootCause}`,
      'color:#ef4444;font-weight:bold;font-size:12px'
    );
    console.error('Original bootstrap error:', error);
    console.table({
      'network.canReachInternet': network.canReachInternet,
      'network.canReachOwnHost': network.canReachOwnHost,
      'env.ok': env.ok,
      'firestore.interpretation': firestore.interpretation,
      'auth.interpretation': auth.interpretation,
      'functions.interpretation': functionsCheck.interpretation,
    });
    console.log('Full report (safe to share with support):', report);
    console.groupEnd();
  } catch {
    /* console may be unavailable in some embedded webviews */
  }

  try {
    sessionStorage.setItem('go7_last_boot_diagnostics', JSON.stringify(report));
  } catch {
    /* ignore storage quota/private-mode errors */
  }

  try {
    if (typeof window !== 'undefined' && window.Sentry?.captureException && error) {
      window.Sentry.captureException(error, { extra: { bootDiagnostics: report } });
    }
  } catch {
    /* ignore */
  }

  return report;
}

function determineRootCause(checks, error) {
  const msg = String(error?.message || '').toLowerCase();
  const name = String(error?.name || '');

  // Prefer the thrown error when it's clearly app code (TDZ, TypeError, etc.).
  // Diagnostic probes must not override an obvious ReferenceError.
  if (
    name === 'ReferenceError' ||
    msg.includes('before initialization') ||
    msg.includes('is not defined') ||
    (name === 'TypeError' && msg.includes('is not a function'))
  ) {
    return 'app-code-error (see error.stack — not network/Firebase)';
  }

  if (!checks.network?.canReachInternet && !checks.network?.browserReportsOnline) {
    return 'device-offline';
  }
  if (!checks.network?.canReachOwnHost) {
    return 'cannot-reach-go7-hosting (DNS/CDN/network issue, not app code)';
  }
  if (!checks.env?.ok) {
    return `missing-firebase-env-vars: ${checks.env.missing.join(', ')}`;
  }
  if (checks.firestore?.interpretation === 'unreachable-network-or-cors') {
    return 'firestore-unreachable (network or CORS block)';
  }
  if (checks.firestore?.interpretation === 'reachable-permission-denied') {
    return 'firestore-permission-denied (security rules or auth token issue)';
  }
  if (checks.auth?.interpretation === 'api-key-invalid-or-restricted') {
    return 'firebase-api-key-invalid-or-restricted';
  }
  if (checks.auth?.interpretation === 'unreachable-network-or-cors') {
    return 'firebase-auth-unreachable (network or CORS block)';
  }
  if (checks.functions?.interpretation === 'unreachable-network-or-cors') {
    return 'cloud-functions-unreachable (network or CORS block)';
  }
  if (msg.includes('permission-denied') || msg.includes('permission_denied')) {
    return 'firestore-permission-denied (from thrown error)';
  }
  if (msg.includes('auth') && (msg.includes('token') || msg.includes('unauthorized'))) {
    return 'authentication-token-issue (from thrown error)';
  }
  if (msg.includes('cors')) {
    return 'cors-blocked (from thrown error)';
  }
  return 'app-code-error (not network/backend — see error.stack)';
}

/** Read the last saved report (for a "Technical details" UI or support requests). */
export function getLastBootDiagnostics() {
  try {
    const raw = sessionStorage.getItem('go7_last_boot_diagnostics');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
