const https = require('https');

const data = JSON.stringify({
  data: {
    reference: '100033251031132723319200286223',
    userId: 'M8Gol8PxRJbvhVincONS8FJRdFE3'
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

console.log('🔄 Calling backfillPayment function...');
console.log('Reference: 100033251031132723319200286223');
console.log('User ID: M8Gol8PxRJbvhVincONS8FJRdFE3');

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
        console.log('\n✅ Payment credited successfully!');
        console.log(`💰 Amount: ₦${result.result.amount}`);
        console.log(`💵 New Balance: ₦${result.result.newBalance}`);
      }
    } catch (e) {
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error);
});

req.write(data);
req.end();
