import fs from 'fs';
const p = 'go7 figma/hooks/useNotifications.ts';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(
  /description: 'On iPhone:[\s\S]*?enable notifications\.'/,
  "description: 'On iPhone: Share > Add to Home Screen, open Go7, then enable notifications.'"
);
fs.writeFileSync(p, s);
console.log('toast text fixed');
