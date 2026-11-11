import { readFileSync, writeFileSync } from 'fs';

const path = 'go7 figma/components/TrackDeliveryPage.tsx';
let s = readFileSync(path, 'utf8');

// Fix mojibake currency / symbols in user-visible sheet text
s = s.replace(/\{distanceRemaining\} km [^\n]+?\{riderProgress/g, '{distanceRemaining} km · {riderProgress');
s = s.replace(/>\s*[^\n<]*\{item\.price\.toLocaleString\(\)\}/g, '>{`\u20A6${item.price.toLocaleString()}`}');
// fallback if above too greedy - direct patterns
s = s.replace(/<span className="font-medium text-\[#121212\]">[^<]*\{item\.price\.toLocaleString\(\)\}<\/span>/,
  '<span className="font-medium text-[#121212]">{\u20A6}{item.price.toLocaleString()}</span>');
s = s.replace(/<span className="font-bold text-\[#E53935\]">[^<]*\{orderData\.totalPrice\.toLocaleString\(\)\}<\/span>/,
  '<span className="font-bold text-[#E53935]">{\u20A6}{orderData.totalPrice.toLocaleString()}</span>');

// Star rating — plain text (avoids encoding issues)
s = s.replace(/<div className="flex items-center gap-1 text-sm">\s*<span>[^<]*<\/span>\s*<span>\{orderData\.rider\.rating\}<\/span>/,
  `<div className="flex items-center gap-1 text-sm">
                  <span className="opacity-90">Rating</span>
                  <span>{orderData.rider.rating}</span>`);

// Back button — reliable close + prevent drag swallowing
s = s.replace(
  /<button \r?\n          onClick=\{onClose\}\r?\n          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"\r?\n        >/,
  `<button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors relative z-30"
        >`
);

// Clean status messages (no broken emoji bytes)
const statusFn = `  const getStatusMessage = (currentStatus: DeliveryStatus) => {
    switch (currentStatus) {
      case 'finding_shopper':
        return orderType === 'booking' ? 'Searching for riders near you...' : 'Finding a Go7 shopper...';
      case 'shopper-assigned':
        return 'Shopper assigned';
      case 'shopping':
        return 'Shopper is buying your items';
      case 'confirmed':
        return 'Order confirmed';
      case 'preparing':
        return 'Preparing your order';
      case 'ready-for-pickup':
        return 'Ready for pickup';
      case 'rider-assigned':
        return 'Rider assigned';
      case 'picked-up':
        return 'Order picked up';
      case 'on-the-way':
        return 'On the way to you';
      case 'nearby':
        return 'Rider is nearby';
      case 'delivered':
        return 'Order delivered';
      default:
        return 'Tracking your order';
    }
  };`;

s = s.replace(/  const getStatusMessage = \(currentStatus: DeliveryStatus\) => \{[\s\S]*?\n  \};/, statusFn);

// Toast strings without broken emoji
s = s.replace(/toast\.success\('Order delivered! [^']*'\)/g, "toast.success('Order delivered!')");
s = s.replace(/toast\.success\('Thanks for rating! [^']*'\)/g, "toast.success('Thanks for rating!')");
s = s.replace(/toast\.success\('Opening menu to reorder! [^']*'\)/g, "toast.success('Opening menu to reorder!')");

writeFileSync(path, s, 'utf8');
console.log('Fixed TrackDeliveryPage encoding and back button');
