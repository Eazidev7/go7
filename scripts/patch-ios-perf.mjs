import fs from 'fs';
import path from 'path';

const root = process.cwd();

function readEol(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return { text: raw.replace(/\r\n/g, '\n'), eol: raw.includes('\r\n') ? '\r\n' : '\n' };
}

function writeEol(filePath, text, eol) {
  fs.writeFileSync(filePath, eol === '\r\n' ? text.replace(/\n/g, '\r\n') : text);
}

const figmaPath = path.join(root, 'go7 figma', 'FigmaApp.tsx');
const { text: figma, eol: figmaEol } = readEol(figmaPath);
let f = figma;

if (f.includes("import { MessageCircle } from 'lucide-react';\n")) {
  f = f.replace("import { MessageCircle } from 'lucide-react';\n", '');
}

const eagerShellImports =
  "import { HomePage } from './components/HomePage';\n" +
  "import { BottomNav } from './components/BottomNav';\n" +
  "import { FloatingCartButton } from './components/FloatingCartButton';\n" +
  "import { SplashScreen } from './components/SplashScreen';\n";

if (f.includes(eagerShellImports)) {
  f = f.replace(eagerShellImports, '// Shell UI lazy-loaded for fast iOS/cellular boot\n');
}

if (!f.includes('const HomePage = lazy')) {
  f = f.replace(
    "const NotificationsPage = lazy(() => import('./components/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));\n",
    `const NotificationsPage = lazy(() => import('./components/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const HomePage = lazy(() => import('./components/HomePage').then((m) => ({ default: m.HomePage })));
const BottomNav = lazy(() => import('./components/BottomNav').then((m) => ({ default: m.BottomNav })));
const FloatingCartButton = lazy(() => import('./components/FloatingCartButton').then((m) => ({ default: m.FloatingCartButton })));
const SplashScreen = lazy(() => import('./components/SplashScreen').then((m) => ({ default: m.SplashScreen })));
`
  );
}

if (!f.includes('const OnboardingScreen = lazy')) {
  f = f.replace("import OnboardingScreen from '../src/screens/Onboarding/OnboardingScreen.jsx';\n\n", '');
  f = f.replace(
    'const BookDelivery = lazy(() => import(\'./pages/BookDelivery\'));\n',
    `const BookDelivery = lazy(() => import('./pages/BookDelivery'));
const OnboardingScreen = lazy(() => import('../src/screens/Onboarding/OnboardingScreen.jsx'));
const ExplorePage = lazy(() => import('./components/ExplorePage').then((m) => ({ default: m.ExplorePage })));
`
  );
}
if (f.includes("import { ExplorePage }")) {
  f = f.replace("import { ExplorePage } from './components/ExplorePage';\n", '');
}

if (f.includes('return <SplashScreen />;')) {
  f = f.replace(
    'return <SplashScreen />;',
    'return (\n      <Suspense fallback={<ScreenLoader />}>\n        <SplashScreen />\n      </Suspense>\n    );'
  );
}

if (f.includes('<FloatingCartButton\n') && !f.includes('<Suspense fallback={null}>\n        <FloatingCartButton')) {
  f = f.replace(
    `      {!['splash', 'onboarding', 'cart', 'checkout', 'tracking'].includes(currentScreen) && 
       cartCount > 0 && (
        <FloatingCartButton`,
    `      {!['splash', 'onboarding', 'cart', 'checkout', 'tracking'].includes(currentScreen) && 
       cartCount > 0 && (
        <Suspense fallback={null}>
        <FloatingCartButton`
  );
  f = f.replace(
    `          onClick={navigateToCart}
        />
      )}`,
    `          onClick={navigateToCart}
        />
        </Suspense>
      )}`
  );
}

if (f.includes('<BottomNav\n') && !f.includes('<Suspense fallback={<ScreenLoader />}>\n        <BottomNav')) {
  f = f.replace(
    `      {!['splash', 'checkout', 'tracking'].includes(currentScreen) && (
        <BottomNav`,
    `      {!['splash', 'checkout', 'tracking'].includes(currentScreen) && (
        <Suspense fallback={<ScreenLoader />}>
        <BottomNav`
  );
  f = f.replace(
    `          }}
        />
      )}`,
    `          }}
        />
        </Suspense>
      )}`
  );
}

// Normalize main shell Suspense (never leave mismatched tags)
f = f.replace(
  /<div className="flex-1 overflow-y-auto overflow-x-hidden">[\s\S]*?\{renderCurrentScreen\(\)\}[\s\S]*?<\/div>(?=\s*\n\s*\{\/\* Floating Cart Button)/,
  `<div className="flex-1 overflow-y-auto overflow-x-hidden">
        <Suspense fallback={<ScreenLoader />}>
          <ScreenErrorBoundary>
            {renderCurrentScreen()}
          </ScreenErrorBoundary>
        </Suspense>
      </div>`
);

writeEol(figmaPath, f, figmaEol);

// BottomNav: never overwrite (keep Figma UI as-is)

const homePath = path.join(root, 'go7 figma', 'components', 'HomePage.tsx');
let { text: h, eol: homeEol } = readEol(homePath);
if (!h.includes('lazy(() => import')) {
  h = h.replace(
    "import { LocationSelector } from './LocationSelector';\nimport { SearchBar } from './SearchBar';\nimport { PromoBanner } from './PromoBanner';\nimport { Categories } from './Categories';\nimport { Go7ComboRush } from './Go7ComboRush';\nimport { FavoritesWidget } from './FavoritesWidget';\nimport { TrendingVendors } from './TrendingVendors';\nimport { PharmacyVendors } from './PharmacyVendors';\nimport { LocalMarketVendors } from './LocalMarketVendors';\n",
    `import { lazy, Suspense } from 'react';
import { LocationSelector } from './LocationSelector';
import { SearchBar } from './SearchBar';
import { PromoBanner } from './PromoBanner';
import { Categories } from './Categories';

const Go7ComboRush = lazy(() => import('./Go7ComboRush').then((m) => ({ default: m.Go7ComboRush })));
const FavoritesWidget = lazy(() => import('./FavoritesWidget').then((m) => ({ default: m.FavoritesWidget })));
const TrendingVendors = lazy(() => import('./TrendingVendors').then((m) => ({ default: m.TrendingVendors })));
const PharmacyVendors = lazy(() => import('./PharmacyVendors').then((m) => ({ default: m.PharmacyVendors })));
const LocalMarketVendors = lazy(() => import('./LocalMarketVendors').then((m) => ({ default: m.LocalMarketVendors })));

function SectionFallback() {
  return <div className="px-4 py-6"><div className="h-24 bg-gray-100 rounded-2xl animate-pulse" /></div>;
}
`
  );
  h = h.replace('<Go7ComboRush', '<Suspense fallback={<SectionFallback />}><Go7ComboRush');
  h = h.replace('/>\n\n      <FavoritesWidget', '/></Suspense>\n\n      <Suspense fallback={<SectionFallback />}><FavoritesWidget');
  h = h.replace('/>\n\n      <div className="px-4" id="trending-vendors">', '/></Suspense>\n\n      <div className="px-4" id="trending-vendors">');
  h = h.replace('<TrendingVendors onVendorClick={onVendorClick} />', '<Suspense fallback={<SectionFallback />}><TrendingVendors onVendorClick={onVendorClick} /></Suspense>');
  h = h.replace('<PharmacyVendors onVendorClick={onVendorClick} />', '<Suspense fallback={<SectionFallback />}><PharmacyVendors onVendorClick={onVendorClick} /></Suspense>');
  h = h.replace('<LocalMarketVendors onVendorClick={onVendorClick} />', '<Suspense fallback={<SectionFallback />}><LocalMarketVendors onVendorClick={onVendorClick} /></Suspense>');
  if (!h.includes('import React')) {
    h = h.replace('import { lazy', "import React, { lazy");
  }
}
writeEol(homePath, h, homeEol);

console.log('iOS perf patches applied');
