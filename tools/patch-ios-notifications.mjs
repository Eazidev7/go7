import fs from 'fs';

const path = 'go7 figma/hooks/useNotifications.ts';
let s = fs.readFileSync(path, 'utf8');

const helperBlock = `function normalizeVapidKey(key: string | undefined) {
  if (!key) return '';
  const trimmed = String(key).trim();
  if (trimmed.length === 87 && !trimmed.endsWith('=')) return trimmed + '=';
  return trimmed;
}

function isIosDevice() {
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** iOS web push only works from an Add-to-Home-Screen PWA (iOS 16.4+) */
function isIosHomeScreenPwa() {
  const standalone =
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  return isIosDevice() && standalone;
}

`;

if (!s.includes('function isIosHomeScreenPwa')) {
  s = s.replace(
    'export function useNotifications(userId: string | undefined) {',
    helperBlock + 'export function useNotifications(userId: string | undefined) {'
  );
}

// Insert iOS gate after setIsInitializing(true);
if (!s.includes('Install Go7 for notifications')) {
  s = s.replace(
    'setIsInitializing(true);',
    `setIsInitializing(true);

      if (isIosDevice() && !isIosHomeScreenPwa()) {
        toast.error('Install Go7 for notifications', {
          description: 'On iPhone: Share → Add to Home Screen, open the icon, then enable notifications.',
          duration: 7000,
        });
        return false;
      }`
  );
}

// Prefer existing FCM SW + cache-busted register
s = s.replace(
  "const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');",
  `const buildId = (window as any).__GO7_RUNTIME__?.buildId || Date.now();
      const registration =
        (window as any).fcmSwRegistration ||
        (await navigator.serviceWorker.register(
          '/firebase-messaging-sw.js?v=' + encodeURIComponent(String(buildId)),
          { scope: '/' }
        ));
      (window as any).fcmSwRegistration = registration;
      await navigator.serviceWorker.ready;`
);

// Normalize vapid
s = s.replace(
  'const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;',
  'const vapidKey = normalizeVapidKey(import.meta.env.VITE_FIREBASE_VAPID_KEY);'
);

s = s.replace(
  'vapidKey: vapidKey,',
  'vapidKey,'
);

fs.writeFileSync(path, s);
console.log('ok');
console.log('has ios helper', s.includes('isIosHomeScreenPwa'));
console.log('has install toast', s.includes('Install Go7 for notifications'));
console.log('has fcmSw', s.includes('fcmSwRegistration'));
