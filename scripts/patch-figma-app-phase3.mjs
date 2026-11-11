import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'go7 figma', 'FigmaApp.tsx');
const raw = fs.readFileSync(file, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let c = raw.replace(/\r\n/g, '\n');

// Fix: when splash is skipped, start on home (explore -> HomePage) not default ExplorePage
c = c.replace(
  `  const [currentScreen, setCurrentScreen] = useState<AppScreen>('splash');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string>('');
  const skipSplash = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('go7_figma_seen') === '1';
  const [showSplash, setShowSplash] = useState(!skipSplash);`,
  `  const skipSplash = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('go7_figma_seen') === '1';
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(skipSplash ? 'explore' : 'splash');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string>('');
  const [showSplash, setShowSplash] = useState(!skipSplash);`
);

// Slightly longer splash on first visit
c = c.replace('      }, 600);', '      }, 1200);');

const navFile = path.join(process.cwd(), 'go7 figma', 'components', 'BottomNav.tsx');
let nav = fs.readFileSync(navFile, 'utf8').replace(/\r\n/g, '\n');
nav = nav.replace("{ id: 'explore', label: 'Explore Go7', icon: Home }", "{ id: 'explore', label: 'Home', icon: Home }");

const out = eol === '\r\n' ? c.replace(/\n/g, '\r\n') : c;
const navOut = eol === '\r\n' ? nav.replace(/\n/g, '\r\n') : nav;
fs.writeFileSync(file, out);
fs.writeFileSync(navFile, navOut);
console.log('FigmaApp splash/home patch OK');
