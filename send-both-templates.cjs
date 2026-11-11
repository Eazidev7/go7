const axios = require('axios');

const INFOBIP_API_KEY = '7922b0f6d5279e118dcfad0f186922d1-01b4e36e-49a3-4af1-8c89-9cb04f83a02a';
const INFOBIP_BASE_URL = 'https://m925r2.api.infobip.com';
const INFOBIP_SENDER = '447860015662';

async function sendBothTemplates() {
  const phone = '2348166205600';
  const otp = '999777';
  
  console.log('📤 Sending BOTH templates to compare...\n');
  
  // Send ORDER template (which works)
  console.log('1️⃣ Sending ORDER template...');
  try {
    const orderResponse = await axios.post(
      `${INFOBIP_BASE_URL}/whatsapp/1/message/template`,
      {
        messages: [{
          from: INFOBIP_SENDER,
          to: phone,
          content: {
            templateName: 'order',
            templateData: {
              body: {
                placeholders: ['Test User', 'OTP-' + otp]
              }
            },
            language: 'en'
          }
        }]
      },
      {
        headers: {
          'Authorization': `App ${INFOBIP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('   ✅ ORDER sent:', orderResponse.data.messages[0].status.groupName);
  } catch (e) {
    console.log('   ❌ ORDER failed:', e.response?.data);
  }
  
  // Wait 3 seconds
  await new Promise(r => setTimeout(r, 3000));
  
  // Send OTP template
  console.log('\n2️⃣ Sending OTP template...');
  try {
    const otpResponse = await axios.post(
      `${INFOBIP_BASE_URL}/whatsapp/1/message/template`,
      {
        messages: [{
          from: INFOBIP_SENDER,
          to: phone,
          content: {
            templateName: 'otp',
            templateData: {
              body: {
                placeholders: [otp]
              }
            },
            language: 'en_GB'
          }
        }]
      },
      {
        headers: {
          'Authorization': `App ${INFOBIP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('   ✅ OTP sent:', otpResponse.data.messages[0].status.groupName);
  } catch (e) {
    console.log('   ❌ OTP failed:', e.response?.data);
  }
  
  console.log('\n✅ Both messages sent! Check WhatsApp for:');
  console.log('   - ORDER message with "OTP-' + otp + '"');
  console.log('   - OTP message with "' + otp + '"');
}

sendBothTemplates();
