const axios = require('axios');

const INFOBIP_API_KEY = '7922b0f6d5279e118dcfad0f186922d1-01b4e36e-49a3-4af1-8c89-9cb04f83a02a';
const INFOBIP_BASE_URL = 'https://m925r2.api.infobip.com';

async function checkAccount() {
  console.log('🔍 Checking Infobip Account Status...\n');
  
  // Check account info
  try {
    const response = await axios.get(
      `${INFOBIP_BASE_URL}/account/1/balance`,
      {
        headers: {
          'Authorization': `App ${INFOBIP_API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    console.log('💰 Account Balance:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('Balance check error:', error.response?.status, error.response?.data?.requestError?.serviceException?.text);
  }

  // Check WhatsApp sender status
  console.log('\n📱 Checking WhatsApp Sender Status...\n');
  try {
    const response = await axios.get(
      `${INFOBIP_BASE_URL}/whatsapp/1/senders`,
      {
        headers: {
          'Authorization': `App ${INFOBIP_API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    console.log('Senders:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('Sender check error:', error.response?.status, error.response?.data?.requestError?.serviceException?.text);
  }
  
  // Try the OMS API for delivery reports
  console.log('\n📊 Checking OMS delivery reports...\n');
  try {
    const response = await axios.get(
      `${INFOBIP_BASE_URL}/oms/1/reports`,
      {
        headers: {
          'Authorization': `App ${INFOBIP_API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    console.log('OMS Reports:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('OMS check error:', error.response?.status);
  }
}

checkAccount();
