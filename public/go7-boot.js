/**
 * GO7 runtime bootstrap — runs before React loads.
 * Never purge hashed asset caches (kills cellular loads). Safe on iOS private mode.
 */
(function (global) {
  'use strict';

  function safeSessionGet(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }

  function safeSessionSet(key, val) {
    try { sessionStorage.setItem(key, val); return true; } catch (e) { return false; }
  }

  function safeLocalGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function safeLocalSet(key, val) {
    try { localStorage.setItem(key, val); return true; } catch (e) { return false; }
  }

  var BUILD_ID = '';
  try {
    var meta = document.querySelector('meta[name="go7-build-id"]');
    BUILD_ID = (meta && meta.getAttribute('content')) || '';
  } catch (e) { /* ignore */ }

  if (!BUILD_ID || BUILD_ID.indexOf('__GO7_') === 0) {
    BUILD_ID = 'dev';
  }

  // Very old iOS (iPad Mini 3 maxes at iOS 12) cannot run modern JS bundles.
  (function showUnsupportedOldIOS() {
    try {
      var ua = navigator.userAgent || '';
      var m = ua.match(/OS (\d+)[_ ]/);
      if (!m) return;
      var iosMajor = parseInt(m[1], 10);
      if (!(iosMajor > 0 && iosMajor < 13)) return;
      var root = document.getElementById('root');
      if (!root) return;
      root.innerHTML =
        '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#fff;padding:24px">' +
        '<div style="text-align:center;max-width:340px">' +
        '<p style="font-size:26px;font-weight:800;color:#ef4444;margin:0 0 10px">Go7</p>' +
        '<p style="margin:0 0 12px;font-size:16px;color:#111;font-weight:600">This device is too old for the Go7 app</p>' +
        '<p style="margin:0 0 18px;font-size:14px;color:#666;line-height:1.5">iPad Mini 3 and similar devices stop at iOS 12. Please open go7.ng on a newer phone or tablet (iOS 14+ / recent Android).</p>' +
        '</div></div>';
      root.setAttribute('data-go7-booted', '1');
    } catch (e) { /* never block modern browsers */ }
  })();

  var RELOAD_PREFIX = 'go7-heal-reload-';
  var STALE_PREFIX = 'go7-stale-reload-';

  function isMessagingWorker(reg) {
    try {
      var url = (reg && reg.active && reg.active.scriptURL) ||
        (reg && reg.installing && reg.installing.scriptURL) ||
        (reg && reg.waiting && reg.waiting.scriptURL) ||
        (reg && reg.scope) ||
        '';
      return String(url).indexOf('firebase-messaging-sw') !== -1;
    } catch (e) {
      return false;
    }
  }

  /** Unregister legacy/cache SWs only — keep FCM worker for iPhone/Android push */
  function unregisterLegacyServiceWorkers() {
    if (!('serviceWorker' in navigator)) return Promise.resolve();
    return navigator.serviceWorker.getRegistrations()
      .then(function (regs) {
        return Promise.all(regs.map(function (r) {
          if (isMessagingWorker(r)) return Promise.resolve();
          return r.unregister();
        }));
      })
      .catch(function () { return []; });
  }

  function hardReload() {
    try {
      var url = new URL(global.location.href);
      url.searchParams.set('_go7b', BUILD_ID || String(Date.now()));
      global.location.replace(url.toString());
    } catch (e) {
      global.location.reload();
    }
  }

  function reloadOnce(flagKey) {
    if (safeSessionGet(flagKey)) return false;
    safeSessionSet(flagKey, '1');
    unregisterLegacyServiceWorkers().finally(function () {
      hardReload();
    });
    return true;
  }

  function isStaleBundleMessage(msg) {
    if (!msg) return false;
    var s = String(msg);
    return (
      s.indexOf('Failed to fetch dynamically imported module') !== -1 ||
      s.indexOf('Importing a module script failed') !== -1 ||
      s.indexOf('error loading dynamically imported module') !== -1 ||
      s.indexOf('Loading chunk') !== -1 ||
      s.indexOf('ChunkLoadError') !== -1 ||
      s.indexOf('Unable to preload CSS') !== -1
    );
  }

  // New deploy landed in this HTML: drop legacy SWs (keep FCM)
  var lastVersion = safeLocalGet('go7-app-version');
  if (BUILD_ID !== 'dev' && lastVersion !== BUILD_ID) {
    safeLocalSet('go7-app-version', BUILD_ID);
    unregisterLegacyServiceWorkers().catch(function () { /* ignore */ });
  }

  global.addEventListener(
    'error',
    function (event) {
      var target = event.target;
      if (!target || target.tagName !== 'SCRIPT') return;
      var src = target.src || '';
      if (src.indexOf('/assets/') === -1) return;
      reloadOnce(STALE_PREFIX + BUILD_ID);
    },
    true
  );

  global.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    var msg = reason && (reason.message || String(reason));
    if (!isStaleBundleMessage(msg)) return;
    if (reloadOnce(STALE_PREFIX + BUILD_ID)) {
      event.preventDefault();
    }
  });

  // If still on the *static* HTML spinner after 45s, offer retry.
  // Never wipe a live React tree — slow cellular can exceed 20s while chunks load.
  global.setTimeout(function () {
    var root = document.getElementById('root');
    if (!root) return;
    if (root.getAttribute('data-go7-booted') === '1') return;
    try {
      if (document.body && document.body.classList.contains('go7-mobile-shell')) return;
      if (root.querySelector('.go7-app-shell, .go7-page-flow, [data-go7-react]')) return;
    } catch (e) { /* ignore */ }
    var text = root.textContent || '';
    // Only the pre-React index.html loader — not in-app Suspense "Loading…"
    if (text.indexOf('Loading GO7') === -1 && text.indexOf('Loading GO7…') === -1) return;
    root.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#fff;padding:24px">' +
      '<div style="text-align:center;max-width:320px">' +
      '<p style="font-size:26px;font-weight:800;color:#ef4444;margin:0 0 10px">Go7</p>' +
      '<p style="margin:0 0 18px;font-size:14px;color:#666;line-height:1.5">Taking longer than usual. Tap to try again.</p>' +
      '<button type="button" onclick="location.reload()" style="background:#ef4444;color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:600;width:100%">Try again</button>' +
      '</div></div>';
  }, 45000);

  // Long-lived tabs / iOS home-screen PWAs keep old JS until they check for a new build.
  var STALE_CHECK_KEY = 'go7-stale-check-';
  var PAYMENT_FLAG = 'go7-payment-in-flight';
  var checkingStaleness = false;

  // A Paystack payment popup may be open right now — reloading mid-payment
  // abandons the customer's checkout. Flag is set by usePaystack, timestamped,
  // and self-expires after 15 min so a killed tab never blocks healing forever.
  function paymentInFlight() {
    var ts = Number(safeSessionGet(PAYMENT_FLAG) || 0);
    return ts > 0 && (Date.now() - ts) < 15 * 60 * 1000;
  }
  function checkForNewVersionSilently() {
    if (checkingStaleness || BUILD_ID === 'dev') return;
    checkingStaleness = true;
    fetch('/index.html?_go7check=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' })
      .then(function (res) { return res.text(); })
      .then(function (html) {
        var match = /name="go7-build-id"\s+content="([^"]+)"/.exec(html);
        var liveBuildId = match && match[1];
        if (liveBuildId && liveBuildId.indexOf('__GO7_') !== 0 && liveBuildId !== BUILD_ID) {
          if (paymentInFlight()) {
            // Defer the heal — re-check in 60s once payment is done/cancelled.
            global.setTimeout(checkForNewVersionSilently, 60000);
            return;
          }
          safeLocalSet('go7-app-version', liveBuildId);
          reloadOnce(STALE_CHECK_KEY + liveBuildId);
        }
      })
      .catch(function () { /* offline — never disruptive */ })
      .finally(function () { checkingStaleness = false; });
  }

  global.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      checkForNewVersionSilently();
    }
  });
  document.addEventListener('resume', checkForNewVersionSilently, false);

  // iOS/Safari often restores pages from BFCache without re-running boot
  global.addEventListener('pageshow', function (event) {
    if (event && event.persisted) {
      checkForNewVersionSilently();
    }
  });

  // Catch deploys while the tab stays open (no need to close the browser)
  global.setTimeout(checkForNewVersionSilently, 2500);
  global.setInterval(checkForNewVersionSilently, 5 * 60 * 1000);

  global.__GO7_RUNTIME__ = {
    buildId: BUILD_ID,
    purgeClientCaches: unregisterLegacyServiceWorkers,
    isStaleBundleMessage: isStaleBundleMessage,
    reloadOnce: function () {
      return reloadOnce(STALE_PREFIX + BUILD_ID);
    },
    checkForNewVersion: checkForNewVersionSilently,
    markBooted: function () {
      var root = document.getElementById('root');
      if (root) root.setAttribute('data-go7-booted', '1');
    },
  };
})(window);
