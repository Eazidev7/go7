import fs from 'fs';

const path = 'go7 figma/components/TrackDeliveryPage.tsx';
let s = fs.readFileSync(path, 'utf8');

const importLine = "import { FloatingPinWidget } from './FloatingPinWidget';\r\n";
const importLineLf = "import { FloatingPinWidget } from './FloatingPinWidget';\n";
if (s.includes(importLine)) s = s.replace(importLine, '');
else if (s.includes(importLineLf)) s = s.replace(importLineLf, '');
else {
  console.error('import not found');
  process.exit(1);
}

fs.writeFileSync(path, s);
console.log('Removed unused FloatingPinWidget import');
