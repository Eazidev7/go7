// Firebase Cloud Messaging Service Worker for Go7
console.log('🔔 [firebase-messaging-sw.js] Service Worker loading...');

try {
  importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');
  console.log('✅ Firebase scripts imported successfully');
} catch (error) {
  console.error('❌ Failed to import Firebase scripts:', error);
}

const firebaseConfig = {
  apiKey: 'AIzaSyAApbZP6QnaeMWP19cfK_XXRLlXlS7cP5s',
  authDomain: 'go7-app-209e4.firebaseapp.com',
  projectId: 'go7-app-209e4',
  storageBucket: 'go7-app-209e4.firebasestorage.app',
  messagingSenderId: '64086226844',
  appId: '1:64086226844:web:cb8c67344e6241fe11fa59',
};

try {
  if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized in service worker');
  }
} catch (error) {
  console.error('❌ Firebase initialization error in service worker:', error);
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function buildNotification(payload) {
  const data = (payload && payload.data) || {};
  const note = (payload && payload.notification) || {};
  return {
    title: note.title || data.title || 'Go7',
    options: {
      body: note.body || data.body || 'You have a new update',
      icon: note.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || note.tag || 'go7-notification',
      renotify: true,
      data: {
        url: data.url || data.click_action || data.link || '/',
        ...data,
      },
    },
  };
}

let messaging = null;
try {
  if (typeof firebase !== 'undefined' && firebase.messaging) {
    messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      console.log('🔔 Received background message:', payload);
      const built = buildNotification(payload);
      return self.registration.showNotification(built.title, built.options);
    });
  }
} catch (error) {
  console.error('❌ Firebase messaging init failed:', error);
}

// Fallback push handler (helps some iOS / non-FCM payload shapes)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch (_) {
    payload = { notification: { body: event.data.text() } };
  }
  const built = buildNotification(payload);
  event.waitUntil(self.registration.showNotification(built.title, built.options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);
  event.notification.close();

  const targetUrl =
    (event.notification && event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          client.focus();
          if (client.navigate && targetUrl && targetUrl !== '/') {
            try {
              client.navigate(targetUrl);
            } catch (_) {}
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

console.log('✅ Firebase messaging service worker ready');
