/**
 * Low-network fetch wrapper.
 *
 * Wraps window.fetch globally (once) to make the app behave on slow or
 * unstable connections:
 *   - Adds a timeout so requests never hang forever.
 *   - Retries GET requests on transient failures (network errors / 5xx)
 *     with a small backoff.
 *   - Leaves POST/PUT/DELETE untouched apart from the timeout (no auto-retry
 *     on mutating requests to avoid duplicate side effects).
 */

const DEFAULT_TIMEOUT_MS = 20000;
const RETRYABLE_STATUS = [408, 429, 500, 502, 503, 504];
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 800;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build a signal that aborts on timeout but also respects any caller-supplied
 * signal (aborts when the caller aborts too).
 */
function makeTimeoutSignal(timeoutMs, existingSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (existingSignal) {
    if (existingSignal.aborted) {
      controller.abort();
    } else {
    existingSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  return { controller, timer };
}

export function installLowNetworkFetch() {
  if (typeof window === 'undefined' || window.__GO7_LOW_NETWORK_FETCH__) return;

  const originalFetch = window.fetch.bind(window);
  window.__GO7_LOW_NETWORK_FETCH__ = true;

  window.fetch = async (input, init = {}) => {
    const method = (init.method || 'GET').toUpperCase();
    const isGet = method === 'GET';
    const timeoutMs = init.timeoutMs || DEFAULT_TIMEOUT_MS;

    const attempt = async (retryCount) => {
      const { controller, timer } = makeTimeoutSignal(timeoutMs, init.signal);
      try {
        const response = await originalFetch(input, { ...init, signal: controller.signal });

        // Retry GET on server-side transient failures.
        if (isGet && retryCount < MAX_RETRIES && RETRYABLE_STATUS.includes(response.status)) {
          try { response.body?.cancel?.(); } catch (_) {}
          clearTimeout(timer);
          await delay(RETRY_BASE_DELAY_MS * (retryCount + 1));
          return attempt(retryCount + 1);
        }
        return response;
      } catch (err) {
        const timedOut = err?.name === 'AbortError' && controller.signal.aborted;
        // Retry GET on network-level failures (connection reset, refused, DNS),
        // but not on an explicit timeout (the network is too slow to be worth retrying).
        if (isGet && retryCount < MAX_RETRIES && !timedOut) {
          clearTimeout(timer);
          await delay(RETRY_BASE_DELAY_MS * (retryCount + 1));
          return attempt(retryCount + 1);
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    };

    return attempt(0);
  };
}
