const axios = require('axios');

const INFOBIP_API_KEY = '7922b0f6d5279e118dcfad0f186922d1-01b4e36e-49a3-4af1-8c89-9cb04f83a02a';
const INFOBIP_BASE_URL = 'https://m925r2.api.infobip.com';

async function checkSmsDelivery() {
  const messageId = '4695203634167951962868';
  
  console.log('📋 Checking SMS delivery status...\n');
  
  // Check delivery report
  try {
    const response = await axios.get(
      `${INFOBIP_BASE_URL}/sms/1/reports?messageId=${messageId}`,
      {
        headers: {
          'Authorization': `App ${INFOBIP_API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    console.log('📊 Delivery Report:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (e) {
    console.log('❌ Report error:', e.response?.data || e.message);
  }
  
  // Check account SMS capabilities
  console.log('\n📱 Checking SMS logs...');
  try {
    const logs = await axios.get(
      `${INFOBIP_BASE_URL}/sms/1/logs?limit=5`,
      {
        headers: {
          'Authorization': `App ${INFOBIP_API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    console.log('Recent SMS logs:');
    if (logs.data.results && logs.data.results.length > 0) {
      logs.data.results.forEach((msg, i) => {
        console.log(`\n${i + 1}. To: ${msg.to}`);
        console.log(`   Status: ${msg.status?.name} - ${msg.status?.description}`);
        console.log(`   Error: ${msg.error?.name || 'None'} - ${msg.error?.description || ''}`);
        console.log(`   Price: ${msg.price?.pricePerMessage} ${msg.price?.currency}`);
      });
    } else {
      console.log('No SMS logs found');
    }
  } catch (e) {
    console.log('❌ Logs error:', e.response?.data || e.message);
  }
}

checkSmsDelivery();
