import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'go7 figma', 'FigmaApp.tsx');
const raw = fs.readFileSync(file, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let c = raw.replace(/\r\n/g, '\n');

if (c.includes('Heavy screens — lazy loaded')) {
  console.log('FigmaApp already patched');
  process.exit(0);
}

c = c.replace(
  "import React, { useState, useEffect } from 'react';",
  "import React, { useState, useEffect, Suspense, lazy } from 'react';"
);

c = c.replace("import { CheckoutPage } from './components/CheckoutPage';\n", '');
c = c.replace("import { TrackDeliveryPage } from './components/TrackDeliveryPage';\n", '');
c = c.replace("import { TrackPage } from './components/TrackPage';\n", '');

const lazyBlock = `
// Heavy screens — lazy loaded (RiderJobMap, BookDelivery, etc.)
const CheckoutPage = lazy(() => import('./components/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const TrackDeliveryPage = lazy(() => import('./components/TrackDeliveryPage').then((m) => ({ default: m.TrackDeliveryPage })));
const TrackPage = lazy(() => import('./components/TrackPage').then((m) => ({ default: m.TrackPage })));
const BookDelivery = lazy(() => import('./pages/BookDelivery'));

function ScreenLoader() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Loading…</p>
    </div>
  );
}
`;

c = c.replace(
  "import OnboardingScreen from '../src/screens/Onboarding/OnboardingScreen.jsx';\n\n// Book Delivery from Figma pages\nimport BookDelivery from './pages/BookDelivery';\n\ninterface Vendor",
  `import OnboardingScreen from '../src/screens/Onboarding/OnboardingScreen.jsx';\n${lazyBlock}\ninterface Vendor`
);

c = c.replace(
  `  const [showSplash, setShowSplash] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Hide splash after 2 seconds and show explore page
  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        setCurrentScreen('explore');
      }, 2000);`,
  `  const skipSplash = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('go7_figma_seen') === '1';
  const [showSplash, setShowSplash] = useState(!skipSplash);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        setCurrentScreen('explore');
        try { sessionStorage.setItem('go7_figma_seen', '1'); } catch (_) {}
      }, 600);`
);

c = c.replace(
  /case 'checkout':[\s\S]*?return \(\s*\n\s*<CheckoutPage/,
  (m) => m.replace('return (\n          <CheckoutPage', 'return (\n          <Suspense fallback={<ScreenLoader />}>\n          <CheckoutPage')
);

c = c.replace(
  /(<CheckoutPage[\s\S]*?onOrderPlaced=\{[\s\S]*?\}\s*\/>\s*)\);(\s*case 'tracking':)/,
  '$1</Suspense>\n        );$2'
);

c = c.replace(
  /case 'tracking':\s*return \(\s*\n\s*<TrackDeliveryPage/,
  "case 'tracking':\n        return (\n          <Suspense fallback={<ScreenLoader />}>\n          <TrackDeliveryPage"
);

c = c.replace(
  /(<TrackDeliveryPage[\s\S]*?onClose=\{navigateBack\}\s*\/>\s*)\);(\s*case 'profile':)/,
  '$1</Suspense>\n        );$2'
);

c = c.replace(
  /case 'bookdelivery':\s*return <BookDelivery onBack=\{navigateBack\} \/>;/,
  `case 'bookdelivery':
        return (
          <Suspense fallback={<ScreenLoader />}>
            <BookDelivery onBack={navigateBack} />
          </Suspense>
        );`
);

c = c.replace(
  /case 'track':\s*return \(\s*\n\s*<TrackPage/,
  "case 'track':\n        return (\n          <Suspense fallback={<ScreenLoader />}>\n          <TrackPage"
);

c = c.replace(
  /(<TrackPage[\s\S]*?\/>\s*)\);(\s*case 'chat':)/,
  '$1</Suspense>\n        );$2'
);

const ok = c.includes('Heavy screens') && c.includes('Suspense fallback={<ScreenLoader />}');
console.log('patched:', ok);
if (!ok) process.exit(1);

const out = eol === '\r\n' ? c.replace(/\n/g, '\r\n') : c;
fs.writeFileSync(file, out);
console.log('FigmaApp patched OK');
