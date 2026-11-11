const https = require('https');

// Manual payment recovery - provide your payment reference here
const paymentReference = process.argv[2] || 'UNKNOWN';
const userId = 'M8Gol8PxRJbvhVincONS8FJRdFE3';

console.log('🔍 Manual Payment Recovery');
console.log('Reference:', paymentReference);
console.log('User ID:', userId);

if (paymentReference === 'UNKNOWN') {
  console.log('❌ Please provide payment reference:');
  console.log('node manual-recovery.cjs YOUR_PAYMENT_REFERENCE');
  process.exit(1);
}

const data = JSON.stringify({
  data: {
    reference: paymentReference,
    userId: userId
  }
});

const options = {
  hostname: 'us-central1-go7-delivery.cloudfunctions.net',
  port: 443,
  path: '/backfillPayment',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('\n🔄 Calling backfillPayment function...');

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('\n📥 Response Status:', res.statusCode);
    try {
      const result = JSON.parse(responseData);
      console.log('📄 Response:', JSON.stringify(result, null, 2));
      
      if (result.result && result.result.success) {
        console.log('\n✅ Payment recovered successfully!');
        console.log(`💰 Amount: ₦${result.result.amount}`);
        console.log(`💵 New Balance: ₦${result.result.newBalance}`);
        console.log(`📝 Reference: ${result.result.reference}`);
      } else {
        console.log('\n❌ Payment recovery failed');
        console.log('Reason:', result.result?.message || 'Unknown error');
      }
    } catch (e) {
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
});

req.write(data);
req.end();