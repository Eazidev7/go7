/**
 * 📱 GO7 WHATSAPP CLOUD API NOTIFIER
 * Official WhatsApp Business Cloud API integration for Go7 delivery notifications
 * Location: Abeokuta, Nigeria
 * Date: October 23, 2025
 */

const axios = require('axios');
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

// Initialize Firestore (if not already initialized)
const db = admin.firestore();

// Environment variables - Load from process.env OR Firebase Functions config
// Priority: process.env (local .env) → functions.config() (Firebase production)
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN 
                               || functions.config().whatsapp?.access_token;

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID 
                                  || functions.config().whatsapp?.phone_id;

const GO7_SUPPORT_NUMBER = process.env.GO7_SUPPORT_NUMBER 
                           || functions.config().whatsapp?.support_number 
                           || '2348012345678'; // Default support number

// Template names from WhatsApp Business Manager
const TEMPLATE_CONFIRMED = process.env.TEMPLATE_CONFIRMED 
                           || functions.config().whatsapp?.template_confirmed 
                           || 'go7_confirmed';

const TEMPLATE_OUT_FOR_DELIVERY = process.env.TEMPLATE_OUT_FOR_DELIVERY 
                                   || functions.config().whatsapp?.template_out_for_delivery 
                                   || 'go7_out_for_delivery';

const TEMPLATE_DELIVERED = process.env.TEMPLATE_DELIVERED 
                           || functions.config().whatsapp?.template_delivered 
                           || 'go7_delivered';

/**
 * Format phone number to E.164 format required by WhatsApp
 * @param {string} phone - Phone number in various formats
 * @returns {string} - Formatted phone number (+234XXXXXXXXXX)
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle Nigerian numbers
  if (cleaned.startsWith('0')) {
    return `234${cleaned.slice(1)}`; // Remove leading 0, add 234
  }
  if (cleaned.startsWith('234')) {
    return cleaned; // Already has country code
  }
  // Assume local number without 0
  return `234${cleaned}`;
};

/**
 * Sleep utility for retry delay
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 📊 LOG NOTIFICATION TO FIRESTORE
 * Tracks every WhatsApp notification attempt for admin dashboard
 * @param {string} orderId - Order ID
 * @param {string} customerName - Customer name
 * @param {string} customerPhone - Customer phone number
 * @param {string} messageType - CONFIRMED, OUT_FOR_DELIVERY, DELIVERED
 * @param {string} status - SENT, FAILED, RETRIED
 * @param {string} details - Additional details or error message
 * @param {object} metadata - Optional metadata (messageId, attempt, etc.)
 */
async function logNotification(orderId, customerName, customerPhone, messageType, status, details = '', metadata = {}) {
  try {
    const notificationData = {
      orderId,
      customerName: customerName || 'Unknown',
      customerPhone,
      messageType, // CONFIRMED, OUT_FOR_DELIVERY, DELIVERED
      status, // SENT, FAILED, RETRIED
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      // Additional metadata
      messageId: metadata.messageId || null,
      attempt: metadata.attempt || 1,
      maxAttempts: metadata.maxAttempts || 3,
      errorCode: metadata.errorCode || null,
      formattedPhone: metadata.formattedPhone || customerPhone,
      // Auto-retry tracking
      retryCount: metadata.retryCount || 0,
      lastRetry: metadata.lastRetry || null
    };

    // Add to notifications collection
    const notificationRef = await db.collection('notifications').add(notificationData);
    
    console.log(`📊 Notification logged: ${notificationRef.id} - ${status} - ${messageType} for order ${orderId}`);
    
    return { success: true, notificationId: notificationRef.id };
  } catch (error) {
    console.error('❌ Failed to log notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send WhatsApp message with retry logic
 * @param {string} customerPhone - Customer phone number
 * @param {string} orderStatus - Order status (CONFIRMED, OUT_FOR_DELIVERY, DELIVERED)
 * @param {string} orderId - Order ID
 * @param {object} orderData - Additional order data (optional)
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<object>} - Result object with success status
 */
async function sendWhatsApp(customerPhone, orderStatus, orderId, orderData = {}, maxRetries = 3) {
  // Validate credentials
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.error('❌ WhatsApp credentials not configured');
    return { success: false, error: 'Missing WhatsApp credentials' };
  }

  // Format phone number
  const formattedPhone = formatPhoneNumber(customerPhone);
  if (!formattedPhone) {
    console.error('❌ Invalid phone number:', customerPhone);
    return { success: false, error: 'Invalid phone number' };
  }

  // Map status to template
  const templates = {
    CONFIRMED: TEMPLATE_CONFIRMED,
    OUT_FOR_DELIVERY: TEMPLATE_OUT_FOR_DELIVERY,
    DELIVERED: TEMPLATE_DELIVERED
  };

  const templateName = templates[orderStatus];
  if (!templateName) {
    console.error(`❌ Invalid order status: ${orderStatus}`);
    return { success: false, error: 'Invalid order status' };
  }

  // Build message payload
  const payload = buildMessagePayload(formattedPhone, templateName, orderId, orderData);

  // Retry logic
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 Attempt ${attempt}/${maxRetries}: Sending WhatsApp to ${formattedPhone}`);

      // Log attempt (RETRIED status for attempts > 1)
      if (attempt > 1) {
        await logNotification(
          orderId,
          orderData.customerName,
          formattedPhone,
          orderStatus,
          'RETRIED',
          `Retry attempt ${attempt}/${maxRetries}`,
          { attempt, maxAttempts: maxRetries, formattedPhone }
        );
      }

      const response = await axios.post(
        `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      // Success - Log to notifications collection
      const messageId = response.data.messages?.[0]?.id;
      
      await logNotification(
        orderId,
        orderData.customerName,
        formattedPhone,
        orderStatus,
        'SENT',
        `Message sent successfully on attempt ${attempt}`,
        { messageId, attempt, maxAttempts: maxRetries, formattedPhone }
      );

      console.log(`✅ WhatsApp sent successfully for order ${orderId}`, response.data);
      
      return {
        success: true,
        messageId,
        phone: formattedPhone,
        status: orderStatus,
        attempt
      };

    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed:`, error.response?.data || error.message);

      // If not last attempt, wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await sleep(delayMs);
      }
    }
  }

  // All retries failed - Log final failure
  const errorMessage = lastError?.response?.data?.error?.message 
                       || lastError?.message 
                       || 'Unknown error';
  
  const errorCode = lastError?.response?.data?.error?.code 
                    || lastError?.response?.status 
                    || 'UNKNOWN';

  await logNotification(
    orderId,
    orderData.customerName,
    formattedPhone,
    orderStatus,
    'FAILED',
    `All ${maxRetries} attempts failed: ${errorMessage}`,
    { 
      attempt: maxRetries, 
      maxAttempts: maxRetries, 
      formattedPhone,
      errorCode,
      errorDetails: lastError?.response?.data 
    }
  );

  console.error(`❌ All ${maxRetries} attempts failed for order ${orderId}`);
  
  return {
    success: false,
    error: errorMessage,
    errorCode,
    phone: formattedPhone,
    status: orderStatus,
    attempts: maxRetries
  };
}

/**
 * Build WhatsApp message payload with template and buttons
 * @param {string} phone - Formatted phone number
 * @param {string} templateName - WhatsApp template name
 * @param {string} orderId - Order ID
 * @param {object} orderData - Additional order data
 * @returns {object} - WhatsApp API payload
 */
function buildMessagePayload(phone, templateName, orderId, orderData) {
  const { customerName, orderType, orderAmount } = orderData;

  // Base payload
  const payload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      components: []
    }
  };

  // Body parameters (varies by template)
  const bodyParams = [];
  
  // Template-specific parameters
  switch (templateName) {
    case TEMPLATE_CONFIRMED:
      // Template: "Hi {{1}}, your order {{2}} has been confirmed..."
      if (customerName) bodyParams.push({ type: "text", text: customerName });
      bodyParams.push({ type: "text", text: orderId });
      break;
      
    case TEMPLATE_OUT_FOR_DELIVERY:
      // Template: "Your order {{1}} is on the way..."
      bodyParams.push({ type: "text", text: orderId });
      break;
      
    case TEMPLATE_DELIVERED:
      // Template: "Order {{1}} has been delivered successfully..."
      bodyParams.push({ type: "text", text: orderId });
      break;
  }

  // Add body component if parameters exist
  if (bodyParams.length > 0) {
    payload.template.components.push({
      type: "body",
      parameters: bodyParams
    });
  }

  // Add button components (Track Order + Contact Support)
  // Button 1: Track Order (dynamic URL with order ID)
  payload.template.components.push({
    type: "button",
    sub_type: "url",
    index: 0,
    parameters: [
      {
        type: "text",
        text: orderId // This appends to the base URL defined in template
      }
    ]
  });

  // Button 2: Contact Support
  // Note: Support button URL is static in template, no dynamic parameter needed
  // If your template has a second button, you can add it here
  // For now, keeping it simple with just Track Order button

  return payload;
}

/**
 * Send bulk WhatsApp notifications to multiple customers
 * @param {Array} notifications - Array of {phone, status, orderId, orderData}
 * @returns {Promise<object>} - Summary of results
 */
async function sendBulkWhatsApp(notifications) {
  console.log(`📨 Sending ${notifications.length} WhatsApp notifications...`);

  const results = await Promise.allSettled(
    notifications.map(({ phone, status, orderId, orderData }) =>
      sendWhatsApp(phone, status, orderId, orderData)
    )
  );

  const summary = {
    total: notifications.length,
    successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
    failed: results.filter(r => r.status === 'rejected' || !r.value.success).length,
    results: results.map((r, i) => ({
      orderId: notifications[i].orderId,
      phone: notifications[i].phone,
      success: r.status === 'fulfilled' && r.value.success,
      error: r.value?.error || r.reason
    }))
  };

  console.log(`📊 Bulk send complete: ${summary.successful}/${summary.total} successful`);
  return summary;
}

/**
 * Validate WhatsApp configuration
 * @returns {object} - Validation result
 */
function validateConfig() {
  const issues = [];

  if (!WHATSAPP_ACCESS_TOKEN) issues.push('WHATSAPP_ACCESS_TOKEN not set');
  if (!WHATSAPP_PHONE_NUMBER_ID) issues.push('WHATSAPP_PHONE_NUMBER_ID not set');
  if (!TEMPLATE_CONFIRMED) issues.push('TEMPLATE_CONFIRMED not set');
  if (!TEMPLATE_OUT_FOR_DELIVERY) issues.push('TEMPLATE_OUT_FOR_DELIVERY not set');
  if (!TEMPLATE_DELIVERED) issues.push('TEMPLATE_DELIVERED not set');

  return {
    valid: issues.length === 0,
    issues,
    config: {
      hasAccessToken: !!WHATSAPP_ACCESS_TOKEN,
      hasPhoneId: !!WHATSAPP_PHONE_NUMBER_ID,
      templates: {
        confirmed: TEMPLATE_CONFIRMED,
        outForDelivery: TEMPLATE_OUT_FOR_DELIVERY,
        delivered: TEMPLATE_DELIVERED
      },
      supportNumber: GO7_SUPPORT_NUMBER
    }
  };
}

/**
 * Test WhatsApp integration
 * @param {string} testPhone - Test phone number
 * @returns {Promise<object>} - Test result
 */
async function testWhatsAppIntegration(testPhone) {
  console.log('🧪 Testing WhatsApp integration...');
  
  const validation = validateConfig();
  if (!validation.valid) {
    console.error('❌ Configuration invalid:', validation.issues);
    return { success: false, validation };
  }

  console.log('✅ Configuration valid');
  
  // Send test message
  const result = await sendWhatsApp(
    testPhone,
    'CONFIRMED',
    'TEST-' + Date.now(),
    {
      customerName: 'Test Customer',
      orderType: 'Parcel',
      orderAmount: 1500
    }
  );

  return {
    success: result.success,
    validation,
    testResult: result
  };
}

// Export functions
module.exports = {
  sendWhatsApp,
  sendBulkWhatsApp,
  validateConfig,
  testWhatsAppIntegration,
  formatPhoneNumber,
  logNotification
};
