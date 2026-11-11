import fs from 'fs';

const path = 'src/pages/BookDelivery.jsx';
let s = fs.readFileSync(path, 'utf8');

const startMarker = '                    <div>\n                      <h3 className="text-lg font-medium mb-4 text-gray-900">Smart Address Fields</h3>';
const startMarkerCR = startMarker.replace(/\n/g, '\r\n');
const endMarker = '                    <div>\n                      <h3 className="text-lg font-medium mb-4 text-gray-900">Recipient Information</h3>';
const endMarkerCR = endMarker.replace(/\n/g, '\r\n');

let start = s.indexOf(startMarker);
let end = s.indexOf(endMarker);
let nl = '\n';
if (start < 0) {
  start = s.indexOf(startMarkerCR);
  end = s.indexOf(endMarkerCR);
  nl = '\r\n';
}
if (start < 0 || end < 0) {
  console.error('markers not found', { start, end });
  process.exit(1);
}

const oldBlock = s.slice(start, end);

// Extract pickup place suggestions + hybrid (between pickup input status and Use GPS / next section)
const pickupSlotStart = oldBlock.indexOf('{/* Enhanced Suggestions with Landmarks Priority */}');
const pickupGpsBtn = oldBlock.indexOf('onClick={() => useCurrentLocation(\'pickup\')}');
// Find the closing of the relative flex-1 div before GPS button — suggestions are inside flex-1
// We'll capture from first Enhanced Suggestions through end of HYBRID pickup block (before GPS button's parent close)

const pickupHybridEnd = oldBlock.indexOf('{/* Dropoff Address */}');
if (pickupSlotStart < 0 || pickupHybridEnd < 0) {
  console.error('pickup slot bounds missing', { pickupSlotStart, pickupHybridEnd });
  process.exit(1);
}

// Pickup suggestions live inside the pickup field's relative flex-1 — from Enhanced Suggestions
// through end of HYBRID Suggestions, before the GPS button wrapper closes.
// Simpler: grab both suggestion blocks by known comment markers for pickup and dropoff.

const extractBetween = (src, a, b) => {
  const i = src.indexOf(a);
  const j = src.indexOf(b, i + 1);
  if (i < 0 || j < 0) return null;
  return src.slice(i, j);
};

const pickupSlot = extractBetween(
  oldBlock,
  '{/* Enhanced Suggestions with Landmarks Priority */}',
  '                            </div>\n                            <button'
) || extractBetween(
  oldBlock,
  '{/* Enhanced Suggestions with Landmarks Priority */}',
  '                            </div>\r\n                            <button'
);

// For dropoff, first Enhanced Suggestions after Dropoff Address
const dropoffPart = oldBlock.slice(oldBlock.indexOf('{/* Dropoff Address */}'));
const dropoffSlot = extractBetween(
  dropoffPart,
  '{/* Enhanced Suggestions with Landmarks Priority */}',
  '                            </div>\n                          </div>\n                          {errors.dropoffAddress'
) || extractBetween(
  dropoffPart,
  '{/* Enhanced Suggestions with Landmarks Priority */}',
  '                            </div>\r\n                          </div>\r\n                          {errors.dropoffAddress'
);

if (!pickupSlot || !dropoffSlot) {
  console.error('failed to extract slots', {
    pickup: Boolean(pickupSlot),
    dropoff: Boolean(dropoffSlot),
    pickupLen: pickupSlot?.length,
    dropoffLen: dropoffSlot?.length,
  });
  // Dump nearby for debug
  const gpsIdx = oldBlock.indexOf('Use GPS');
  console.log('near GPS', JSON.stringify(oldBlock.slice(gpsIdx - 80, gpsIdx + 40)));
  process.exit(1);
}

const indent = '                    ';
const newBlock = `${indent}<BookDeliveryAddressPanel
${indent}  scenario={addressScenario}
${indent}  onScenarioChange={handleAddressScenarioChange}
${indent}  pickupAddress={formData.pickupAddress}
${indent}  dropoffAddress={formData.dropoffAddress}
${indent}  pickupCoords={pickupCoords}
${indent}  dropoffCoords={dropoffCoords}
${indent}  pickupCoordsConfirmed={pickupCoordsConfirmed}
${indent}  dropoffCoordsConfirmed={dropoffCoordsConfirmed}
${indent}  errors={errors}
${indent}  hasHome={Boolean(findSavedAddressByKind('home'))}
${indent}  hasWork={Boolean(findSavedAddressByKind('work'))}
${indent}  onPickupChange={(value) => handleAddressInput('pickupAddress', value)}
${indent}  onDropoffChange={(value) => handleAddressInput('dropoffAddress', value)}
${indent}  onPickupKeyDown={(e) => {
${indent}    if (e.key === 'Enter') {
${indent}      e.preventDefault();
${indent}      handleAddressSubmit('pickupAddress', formData.pickupAddress);
${indent}    }
${indent}  }}
${indent}  onDropoffKeyDown={(e) => {
${indent}    if (e.key === 'Enter') {
${indent}      e.preventDefault();
${indent}      handleAddressSubmit('dropoffAddress', formData.dropoffAddress);
${indent}    }
${indent}  }}
${indent}  onPickupBlur={() => {
${indent}    setTimeout(() => {
${indent}      if (
${indent}        formData.pickupAddress &&
${indent}        !pickupCoordsConfirmed &&
${indent}        !isSelectingRef.current
${indent}      ) {
${indent}        handleAddressSubmit('pickupAddress', formData.pickupAddress);
${indent}      }
${indent}    }, 400);
${indent}  }}
${indent}  onDropoffBlur={() => {
${indent}    setTimeout(() => {
${indent}      if (
${indent}        formData.dropoffAddress &&
${indent}        !dropoffCoordsConfirmed &&
${indent}        !isSelectingRef.current
${indent}      ) {
${indent}        handleAddressSubmit('dropoffAddress', formData.dropoffAddress);
${indent}      }
${indent}    }, 400);
${indent}  }}
${indent}  onPickupFocus={() => {
${indent}    if (formData.pickupAddress.length >= 3) {
${indent}      if (autocompleteService && activeField === 'pickup') {
${indent}        setShowPlaceSuggestions(true);
${indent}      } else {
${indent}        setShowPickupSuggestions(true);
${indent}      }
${indent}    }
${indent}  }}
${indent}  onDropoffFocus={() => {
${indent}    if (formData.dropoffAddress.length >= 3) {
${indent}      if (autocompleteService && activeField === 'dropoff') {
${indent}        setShowPlaceSuggestions(true);
${indent}      } else {
${indent}        setShowDropoffSuggestions(true);
${indent}      }
${indent}    }
${indent}  }}
${indent}  onGps={useCurrentLocation}
${indent}  onSwap={swapAddresses}
${indent}  onQuickAction={handleAddressQuickAction}
${indent}  coordinatesError={errors.coordinates || null}
${indent}  routeSummary={
${indent}    routeInfo.distance
${indent}      ? \`Route: \${routeInfo.distance} • \${routeInfo.duration}\${
${indent}          routeInfo.eta ? \` • ETA \${routeInfo.eta}\` : ''
${indent}        }\`
${indent}      : null
${indent}  }
${indent}  pickupSuggestionsSlot={(
${indent}    <>
${pickupSlot}
${indent}    </>
${indent}  )}
${indent}  dropoffSuggestionsSlot={(
${indent}    <>
${dropoffSlot}
${indent}    </>
${indent}  )}
${indent}/>
${nl}`;

s = s.slice(0, start) + newBlock + s.slice(end);
fs.writeFileSync(path, s);
console.log('Address panel wired', {
  oldLen: oldBlock.length,
  newLen: newBlock.length,
  pickupSlot: pickupSlot.length,
  dropoffSlot: dropoffSlot.length,
});
