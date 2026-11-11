import fs from 'fs';
const path = 'go7 figma/components/Go7ComboRush.tsx';
let s = fs.readFileSync(path, 'utf8');
const a = "import { toast } from 'sonner';\r\n";
const b = "import { toast } from 'sonner';\n";
if (s.includes(a)) s = s.replace(a, '');
else if (s.includes(b)) s = s.replace(b, '');
else {
  console.error('toast import missing');
  process.exit(1);
}
fs.writeFileSync(path, s);
console.log('removed unused toast import');
