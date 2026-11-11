import { readFileSync, writeFileSync } from 'fs';

const path = 'go7 figma/components/TrackDeliveryPage.tsx';
let s = readFileSync(path, 'utf8');

const re = /      <RiderChatModal\r?\n        isOpen=\{showChat\}\r?\n        onClose=\{\(\) => setShowChat\(false\)\}\r?\n        rider=\{orderData\.rider\}\r?\n        orderNumber=\{orderData\.orderNumber\}\r?\n      \/>/;

const neu = `      <RiderDeliveryChatModal
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        orderId={orderId}
        orderNumber={orderData.orderNumber}
        rider={orderData.rider}
        riderId={activeRiderId}
      />`;

if (!re.test(s)) {
  console.error('Pattern not found');
  process.exit(1);
}

writeFileSync(path, s.replace(re, neu));
console.log('Fixed RiderChatModal → RiderDeliveryChatModal');
