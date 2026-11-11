import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'go7 figma', 'FigmaApp.tsx');
const raw = fs.readFileSync(file, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let c = raw.replace(/\r\n/g, '\n');

const lazyNames = [
  ['VendorPage', 'VendorPage'],
  ['CartViewPage', 'CartViewPage'],
  ['ProfilePage', 'ProfilePage'],
  ['OrdersPage', 'OrdersPage'],
  ['FavoritesPage', 'FavoritesPage'],
  ['LuckyWeekPage', 'LuckyWeekPage'],
  ['GamificationPage', 'GamificationPage'],
  ['DailyStreakPage', 'DailyStreakPage'],
  ['GobuyPage', 'GobuyPage'],
  ['TransactionHistoryPage', 'TransactionHistoryPage'],
  ['AddressManagementPage', 'AddressManagementPage'],
  ['ChatPage', 'ChatPage'],
  ['SearchResultsPage', 'SearchResultsPage'],
  ['NotificationsPage', 'NotificationsPage'],
];

for (const [name] of lazyNames) {
  c = c.replace(new RegExp(`import \\{ ${name} \\} from '\\./components/${name}';\\n`), '');
}

const extraLazy = lazyNames
  .map(([name, exportName]) => {
    if (c.includes(`const ${name} = lazy`)) return '';
    return `const ${name} = lazy(() => import('./components/${name}').then((m) => ({ default: m.${exportName} })));`;
  })
  .filter(Boolean)
  .join('\n');

if (extraLazy) {
  c = c.replace(
    'const BookDelivery = lazy(() => import(\'./pages/BookDelivery\'));\n',
    `const BookDelivery = lazy(() => import('./pages/BookDelivery'));\n${extraLazy}\n`
  );
}

// Guard: never nest another Suspense around renderCurrentScreen if one already exists nearby.
if (!/Suspense[\s\S]{0,200}\{renderCurrentScreen\(\)\}/.test(c)) {
  c = c.replace(
    '{renderCurrentScreen()}',
    '<Suspense fallback={<ScreenLoader />}>\n          {renderCurrentScreen()}\n        </Suspense>'
  );
}

if (!c.includes('const GobuyPage = lazy')) {
  console.error('GobuyPage lazy patch failed');
  process.exit(1);
}

const out = eol === '\r\n' ? c.replace(/\n/g, '\r\n') : c;
fs.writeFileSync(file, out);
console.log('FigmaApp phase-2 lazy patch OK');

// Fix AuthContext imports in figma components
const authFixes = [
  ['go7 figma/components/ProfilePage.tsx', "../../src/contexts/AuthContext.jsx", "../contexts/backend/AuthContext.jsx"],
  ['go7 figma/components/LuckyWeekPage.tsx', "../../src/contexts/AuthContext", "../contexts/backend/AuthContext.jsx"],
  ['go7 figma/components/TransactionHistoryPage.tsx', "../../src/contexts/AuthContext", "../contexts/backend/AuthContext.jsx"],
];

for (const [rel, from, to] of authFixes) {
  const p = path.join(process.cwd(), rel);
  if (!fs.existsSync(p)) continue;
  let t = fs.readFileSync(p, 'utf8');
  if (t.includes(from)) {
    t = t.split(from).join(to);
    fs.writeFileSync(p, t);
    console.log('Fixed auth import:', rel);
  }
}
