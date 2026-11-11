import { readFileSync, writeFileSync } from 'fs';

const path = 'go7 figma/components/TrackDeliveryPage.tsx';
let s = readFileSync(path, 'utf8');
const naira = '\u20A6';

// Fix broken price spans from prior patch
s = s.replace(
  /<span className="font-medium text-\[#121212\]">\{`[^`]*`\}<\/span>/g,
  `<span className="font-medium text-[#121212]">${naira}{item.price.toLocaleString()}</span>`
);
s = s.replace(
  /<span className="font-bold text-\[#E53935\]">\{[^}]*\}\{orderData\.totalPrice\.toLocaleString\(\)\}<\/span>/g,
  `<span className="font-bold text-[#E53935]">${naira}{orderData.totalPrice.toLocaleString()}</span>`
);

// Fix km bullet (middle dot)
s = s.replace(
  /\{distanceRemaining\} km . \{riderProgress/g,
  '{distanceRemaining} km · {riderProgress'
);

writeFileSync(path, s, 'utf8');
console.log('Fixed currency and bullet in TrackDeliveryPage');
