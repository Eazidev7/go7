// Legacy cleanup service worker — uninstalls itself and clears all caches.
// Replaces old workers that cached JS bundles and caused "before initialization" crashes.
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(names.map(function (n) { return caches.delete(n); }));
      })
      .then(function () {
        return self.clients.claim();
      })
      .then(function () {
        return self.registration.unregister();
      })
      .catch(function () { return self.registration.unregister(); })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Do not intercept any fetches — network only
self.addEventListener('fetch', function () {});
