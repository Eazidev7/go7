import fs from 'fs';

const trackPath = 'go7 figma/components/TrackDeliveryPage.tsx';
let s = fs.readFileSync(trackPath, 'utf8');
let changes = 0;

function replaceOnce(label, from, to) {
  const idx = s.indexOf(from);
  if (idx === -1) {
    console.error('MISSING:', label);
    console.error('Tried:', JSON.stringify(from.slice(0, 80)));
    process.exit(1);
  }
  s = s.slice(0, idx) + to + s.slice(idx + from.length);
  changes += 1;
  console.log('OK:', label);
}

replaceOnce(
  'setStatus(tracking.status)',
  'setStatus(tracking.status);',
  "setStatus(mapLiveStatusToUI(String(tracking.status || '')));"
);

replaceOnce(
  'pickupCoords fallback',
  'pickupCoords: booking.pickup?.coords || null,\r\n                dropoffCoords: booking.dropoff?.coords || null,',
  `pickupCoords: (booking.pickup?.coords?.lat != null
                  ? booking.pickup.coords
                  : getPickupCoords(booking.raw || booking)),
                dropoffCoords: (booking.dropoff?.coords?.lat != null
                  ? booking.dropoff.coords
                  : getDropoffCoords(booking.raw || booking)),`
);

replaceOnce(
  'status fallback',
  `status: booking.status === 'pending' || booking.status === 'searching_rider'\r\n                  ? 'finding_shopper'\r\n                  : booking.status,`,
  "status: mapLiveStatusToUI(String(booking.status || '')),"
);

fs.writeFileSync(trackPath, s);
console.log('TrackDeliveryPage changes:', changes);

const ctxPath = 'go7 figma/contexts/backend/TrackingContext.jsx';
let c = fs.readFileSync(ctxPath, 'utf8');
let ctxChanges = 0;

if (!c.includes('extractRiderLocation')) {
  const from = "import { db } from '../../../src/firebase/config';";
  const to =
    "import { db } from '../../../src/firebase/config';\r\nimport { extractRiderLocation } from '../../../src/utils/trackingStatusUtils';";
  if (!c.includes(from)) {
    // try LF-only file
    const fromLf = from;
    if (!c.includes(fromLf)) {
      console.error('MISSING: TrackingContext db import');
      process.exit(1);
    }
  }
  c = c.replace(
    "import { db } from '../../../src/firebase/config';",
    "import { db } from '../../../src/firebase/config';\nimport { extractRiderLocation } from '../../../src/utils/trackingStatusUtils';"
  );
  ctxChanges += 1;
  console.log('OK: TrackingContext import');
}

function replaceCtx(label, from, to) {
  let idx = c.indexOf(from);
  let used = from;
  if (idx === -1) {
    const alt = from.replace(/\n/g, '\r\n');
    idx = c.indexOf(alt);
    used = alt;
  }
  if (idx === -1) {
    console.error('MISSING:', label);
    process.exit(1);
  }
  c = c.slice(0, idx) + to + c.slice(idx + used.length);
  ctxChanges += 1;
  console.log('OK:', label);
}

replaceCtx(
  'deliveryTracking loc',
  `          const loc = data.currentLocation || data.riderLocation;
          if (loc) {
            setRiderLocation(loc);
          }`,
  `          const loc = extractRiderLocation({
            riderLocation: data.riderLocation || data.currentLocation,
            currentLocation: data.currentLocation,
          });
          if (loc) {
            setRiderLocation(loc);
          }`
);

replaceCtx(
  'riderLocations loc',
  '            setRiderLocation(riderData.location);',
  `            const loc = extractRiderLocation({
              riderLocation: riderData.location || riderData,
              currentLocation: riderData,
            });
            if (loc) setRiderLocation(loc);`
);

fs.writeFileSync(ctxPath, c);
console.log('TrackingContext changes:', ctxChanges);
