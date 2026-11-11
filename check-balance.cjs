const https = require('https');

console.log('💰 Checking wallet balance and recent transactions...');

// Simple Firebase REST API call to check wallet
const checkWallet = () => {
  const options = {
    hostname: 'firestore.googleapis.com',
    port: 443,
    path: '/v1/projects/go7-delivery/databases/(default)/documents/wallets/M8Gol8PxRJbvhVincONS8FJRdFE3',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + (process.env.FIREBASE_TOKEN || 'none')
    }
  };

  console.log('📍 Checking wallet document...');
  
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      if (res.statusCode === 200) {
        try {
          const wallet = JSON.parse(data);
          console.log('\n💰 Wallet Data:');
          if (wallet.fields) {
            console.log('Balance:', wallet.fields.balance?.doubleValue || wallet.fields.balance?.integerValue || '0');
            console.log('Last Topup Amount:', wallet.fields.lastTopupAmount?.doubleValue || '0');
            console.log('Last Topup Reference:', wallet.fields.lastTopupReference?.stringValue || 'None');
            console.log('Updated At:', wallet.fields.updatedAt?.timestampValue || 'Never');
          } else {
            console.log('No wallet data found');
          }
        } catch (e) {
          console.log('Parse error:', e.message);
          console.log('Raw:', data);
        }
      } else {
        console.log('Error response:', data);
      }
      
      // Also check webhook transactions
      checkWebhookTransactions();
    });
  });
  
  req.on('error', err => {
    console.error('Request error:', err.message);
    checkWebhookTransactions();
  });
  
  req.end();
};

const checkWebhookTransactions = () => {
  console.log('\n🔍 Checking webhook transactions for reference...');
  
  const options = {
    hostname: 'firestore.googleapis.com',
    port: 443,
    path: '/v1/projects/go7-delivery/databases/(default)/documents/webhook_transactions/TEST-1761945429402-M8Gol8',
    method: 'GET'
  };
  
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Webhook Transaction Status:', res.statusCode);
      if (res.statusCode === 200) {
        try {
          const webhookTx = JSON.parse(data);
          console.log('✅ Webhook transaction found:');
          if (webhookTx.fields) {
            console.log('User ID:', webhookTx.fields.userId?.stringValue);
            console.log('Amount:', webhookTx.fields.amount?.doubleValue || webhookTx.fields.amount?.integerValue);
            console.log('Processed At:', webhookTx.fields.processedAt?.timestampValue);
            console.log('Type:', webhookTx.fields.type?.stringValue || 'charge.success');
          }
        } catch (e) {
          console.log('Parse error:', e.message);
        }
      } else {
        console.log('❌ No webhook transaction found for this reference');
        console.log('This means the webhook never processed the payment');
      }
      
      console.log('\n📝 Summary:');
      console.log('- Payment reference: TEST-1761945429402-M8Gol8');
      console.log('- BackfillPayment says: Already processed');
      console.log('- Check wallet balance in your profile to see if it updated');
      console.log('- If balance is wrong, there may be a display issue');
    });
  });
  
  req.on('error', err => {
    console.error('Webhook check error:', err.message);
  });
  
  req.end();
};

// Start the check
checkWallet();