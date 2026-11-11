import fs from 'fs';

const path = 'go7 figma/components/TrackDeliveryPage.tsx';
let s = fs.readFileSync(path, 'utf8');

const old = `      {/* Floating PIN Widget */}
      <FloatingPinWidget
        orderId={orderId}
        isVisible={!!verificationCode && (shouldShowDeliveryPin(status) || ['nearby','on-the-way','rider-assigned','picked-up','shopper-assigned','shopping'].includes(status)) && !showPinScreen}
        onExpand={() => setShowPinScreen(true)}
        position="top"
      />`;

// Keep PIN in the bottom sheet only — floating card was covering the live map.
const neu = `      {/* PIN stays in bottom sheet only (floating widget covered the map) */}`;

const variants = [old, old.replace(/\n/g, '\r\n')];
let applied = false;
for (const v of variants) {
  if (s.includes(v)) {
    s = s.replace(v, neu);
    applied = true;
    break;
  }
}

if (!applied) {
  // Fallback: force isVisible false if block format drifted
  const needle = 'position="top"\r\n      />';
  const needleLf = 'position="top"\n      />';
  if (s.includes('FloatingPinWidget') && (s.includes(needle) || s.includes(needleLf))) {
    s = s.replace(
      /isVisible=\{!!verificationCode && \(shouldShowDeliveryPin\(status\) \|\| \[[^\]]+\]\.includes\(status\)\) && !showPinScreen\}/,
      'isVisible={false}'
    );
    applied = true;
    console.log('Fallback: forced FloatingPinWidget isVisible=false');
  }
}

if (!applied) {
  console.error('FloatingPinWidget block not found');
  process.exit(1);
}

fs.writeFileSync(path, s);
console.log('TrackDeliveryPage: removed floating PIN overlay');
