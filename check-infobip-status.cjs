const axios = require('axios');

const INFOBIP_API_KEY = '7922b0f6d5279e118dcfad0f186922d1-01b4e36e-49a3-4af1-8c89-9cb04f83a02a';
const INFOBIP_BASE_URL = 'https://m925r2.api.infobip.com';

async function checkDeliveryStatus() {
  // First, let's get the list of all templates to see what's available
  console.log('📋 Getting list of templates...\n');
  
  try {
    const templatesResponse = await axios.get(
      `${INFOBIP_BASE_URL}/whatsapp/2/senders/447860015662/templates`,
      {
        headers: {
          'Authorization': `App ${INFOBIP_API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('Available Templates:');
    console.log('====================');
    
    if (templatesResponse.data.templates) {
      templatesResponse.data.templates.forEach(t => {
        console.log(`\nName: ${t.name}`);
        console.log(`  Status: ${t.status}`);
        console.log(`  Category: ${t.category}`);
        console.log(`  Language: ${t.language}`);
        if (t.structure?.body) {
          console.log(`  Body: ${t.structure.body.text}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error getting templates:', error.response?.data || error.message);
  }
  
  // Now check recent message logs
  console.log('\n\n📊 Checking recent message logs...\n');
  
  try {
    const logsResponse = await axios.get(
      `${INFOBIP_BASE_URL}/whatsapp/1/logs?limit=10`,
      {
        headers: {
          'Authorization': `App ${INFOBIP_API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('Recent Messages:');
    console.log('================');
    
    if (logsResponse.data.results) {
      logsResponse.data.results.forEach((msg, i) => {
        console.log(`\n[${i + 1}] Message ID: ${msg.messageId}`);
        console.log(`    To: ${msg.to}`);
        console.log(`    Status: ${msg.status?.name} (${msg.status?.groupName})`);
        console.log(`    Description: ${msg.status?.description}`);
        console.log(`    Sent At: ${msg.sentAt}`);
        if (msg.error) {
          console.log(`    ERROR: ${msg.error.name} - ${msg.error.description}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error getting logs:', error.response?.data || error.message);
  }
}

checkDeliveryStatus();
