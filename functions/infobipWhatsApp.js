/**
 * 📱 INFOBIP WHATSAPP INTEGRATION
 * Handles WhatsApp notifications via Infobip API
 * Date: January 23, 2026
 */

const { defineString } = require('firebase-functions/params');
const functions = require('firebase-functions/v1');
// Use shared adminInit so OTP login tokens are always minted for go7-app-209e4
const admin = require('./adminInit');
const axios = require('axios');

const firestore = admin.firestore();

// Infobip credentials from params or environment
const INFOBIP_API_KEY = defineString('INFOBIP_API_KEY');
const INFOBIP_BASE_URL = defineString('INFOBIP_BASE_URL');
const INFOBIP_SENDER = defineString('INFOBIP_SENDER');
const INFOBIP_AUTH_TEMPLATE = defineString('INFOBIP_AUTH_TEMPLATE', { default: 'go7_auth_otp' });
const INFOBIP_ORDER_TEMPLATE = process.env.INFOBIP_ORDER_TEMPLATE || 'go7_order_update';

/**
 * Format phone number to international format (without +)
 * Infobip requires format: 234XXXXXXXXXX
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 234
  if (cleaned.startsWith('0')) {
    return `234${cleaned.slice(1)}`;
  }
  
  // If starts with 234, use as is
  if (cleaned.startsWith('234')) {
    return cleaned;
  }
  
  // If starts with +234, remove +
  if (cleaned.startsWith('+234')) {
    return cleaned.slice(1);
  }
  
  // Default: assume it's a local number without 0
  return `234${cleaned}`;
};

const formatLocalPhone = (phone) => {
  let cleaned = String(phone || '').replace(/\D/g, '');
  if (cleaned.startsWith('234')) {
    cleaned = '0' + cleaned.substring(3);
  }
  if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
};

const getInfobipConfig = () => ({
  apiKey: typeof INFOBIP_API_KEY?.value === 'function' ? INFOBIP_API_KEY.value() : INFOBIP_API_KEY,
  baseUrl: typeof INFOBIP_BASE_URL?.value === 'function' ? INFOBIP_BASE_URL.value() : INFOBIP_BASE_URL,
  sender: typeof INFOBIP_SENDER?.value === 'function' ? INFOBIP_SENDER.value() : INFOBIP_SENDER,
  authTemplate:
    typeof INFOBIP_AUTH_TEMPLATE?.value === 'function'
      ? INFOBIP_AUTH_TEMPLATE.value()
      : INFOBIP_AUTH_TEMPLATE || 'go7_auth_otp',
  orderTemplate:
    typeof INFOBIP_ORDER_TEMPLATE?.value === 'function'
      ? INFOBIP_ORDER_TEMPLATE.value()
      : INFOBIP_ORDER_TEMPLATE || 'vendor_v2',
});

async function findUserDocByPhone(phoneNumber) {
  const localPhone = formatLocalPhone(phoneNumber);
  const phoneFormats = [
    localPhone,
    localPhone.substring(1),
    '234' + localPhone.substring(1),
    '+234' + localPhone.substring(1),
  ];
  const phoneFields = ['phoneNumber', 'phone', 'mobile', 'whatsapp', 'contactPhone'];

  for (const format of phoneFormats) {
    for (const field of phoneFields) {
      const snapshot = await firestore
        .collection('users')
        .where(field, '==', format)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        return { userDoc: snapshot.docs[0], localPhone };
      }
    }
  }
  return { userDoc: null, localPhone };
}

function phoneFromUserData(userData, fallbackPhone) {
  const raw =
    userData?.phoneNumber ||
    userData?.phone ||
    userData?.verifiedPhone ||
    userData?.mobile ||
    userData?.whatsapp ||
    userData?.contactPhone ||
    fallbackPhone;
  return formatLocalPhone(raw);
}

async function deliverAuthOTP(phoneNumber, otp) {
  const { apiKey, baseUrl, sender, authTemplate } = getInfobipConfig();

  if (!apiKey || !sender || !baseUrl) {
    console.error('❌ Infobip credentials not configured');
    throw new functions.https.HttpsError('failed-precondition', 'WhatsApp service not configured');
  }

  const formattedPhone = formatPhoneNumber(phoneNumber);
  // Production Infobip WhatsApp AUTH template on this account is named `otp` (en_GB).
  const templateName = String(authTemplate || 'otp').trim() || 'otp';

  const response = await axios.post(
    `${baseUrl}/whatsapp/1/message/template`,
    {
      messages: [
        {
          from: sender,
          to: formattedPhone,
          content: {
            templateName,
            templateData: {
              body: {
                placeholders: [otp]
              },
              buttons: [{
                type: 'URL',
                parameter: otp
              }]
            },
            language: 'en_GB'
          }
        }
      ]
    },
    {
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  );

  const message = response.data?.messages?.[0];
  const statusName = message?.status?.name || '';
  const statusGroup = message?.status?.groupName || '';
  const statusDesc = message?.status?.description || '';

  console.log('📨 Infobip OTP response:', {
    to: formattedPhone,
    templateName,
    messageId: message?.messageId,
    statusName,
    statusGroup,
    statusDesc,
  });

  // Infobip often returns HTTP 200 even when WhatsApp rejects the message
  // (wrong template name/language). Treat non-accepted groups as failure.
  const rejected =
    /REJECT/i.test(statusGroup) ||
    /REJECT/i.test(statusName) ||
    /UNDELIVERABLE/i.test(statusGroup) ||
    /EXPIRED/i.test(statusName);

  if (rejected) {
    throw new functions.https.HttpsError(
      'internal',
      `WhatsApp rejected OTP (${statusName || statusGroup || 'unknown'}). Check Infobip template.`
    );
  }

  return {
    messageId: message?.messageId,
    status: statusName || statusGroup,
  };
}

/**
 * Send Custom Text Message (for 24-hour window)
 * Use this AFTER sending a template message to send any custom text
 */
exports.sendWhatsAppText = functions.https.onCall(async (data, context) => {
  const { phoneNumber, message } = data;
  
  if (!phoneNumber || !message) {
    throw new functions.https.HttpsError('invalid-argument', 'Phone number and message are required');
  }
  
  const formattedPhone = formatPhoneNumber(phoneNumber);

  if (!formattedPhone) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid phone number format');
  }

  const cfg = getInfobipConfig();
  try {
    const response = await axios.post(
      `${cfg.baseUrl}/whatsapp/1/message/text`,
      {
        messages: [
          {
            from: cfg.sender,
            to: formattedPhone,
            messageId: `text-${Date.now()}`,
            content: {
              text: message
            }
          }
        ]
      },
      {
        headers: {
          'Authorization': `App ${cfg.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('✅ WhatsApp text sent to', formattedPhone);
    console.log('Full response:', JSON.stringify(response.data, null, 2));
    
    return { 
      success: true,
      messageId: response.data.messages?.[0]?.messageId,
      status: response.data.messages?.[0]?.status,
      fullResponse: response.data
    };
    
  } catch (error) {
    console.error('❌ WhatsApp text error:', JSON.stringify(error.response?.data || error.message, null, 2));
    throw new functions.https.HttpsError('internal', error.response?.data?.requestError?.serviceException?.text || 'Failed to send message');
  }
});

/**
 * Send Authentication OTP via Infobip WhatsApp
 * Uses the "otp" template with button parameter
 */
exports.sendAuthOTP = functions.https.onCall(async (data, context) => {
  const { phoneNumber, otp } = data;
  
  console.log('📱 Sending WhatsApp OTP to:', phoneNumber);
  
  if (!phoneNumber || !otp) {
    throw new functions.https.HttpsError('invalid-argument', 'Phone number and OTP required');
  }
  
  try {
    const result = await deliverAuthOTP(phoneNumber, otp);
    
    console.log('✅ Infobip WhatsApp OTP sent successfully:', {
      phone: formatPhoneNumber(phoneNumber),
      messageId: result.messageId,
      status: result.status
    });
    
    return { 
      success: true, 
      messageId: result.messageId,
      status: result.status
    };
    
  } catch (error) {
    console.error('❌ Infobip WhatsApp OTP error:', {
      phone: formatPhoneNumber(phoneNumber),
      error: error.response?.data || error.message
    });

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal', 
      'Failed to send OTP',
      error.response?.data
    );
  }
});

/**
 * HTTP + CORS variant of sendAuthOTP.
 * Use when callable preflight fails (503/500 without ACAO looks like a browser CORS error).
 */
exports.sendAuthOTPHttp = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const body = req.body?.data && typeof req.body.data === 'object' ? req.body.data : req.body;
    const phoneNumber = body?.phoneNumber;
    const otp = body?.otp;

    if (!phoneNumber || !otp) {
      res.status(400).json({ success: false, message: 'Phone number and OTP required' });
      return;
    }

    const result = await deliverAuthOTP(phoneNumber, otp);
    console.log('✅ sendAuthOTPHttp success:', {
      phone: formatPhoneNumber(phoneNumber),
      messageId: result.messageId,
      status: result.status,
    });

    res.status(200).json({
      success: true,
      messageId: result.messageId,
      status: result.status,
    });
  } catch (error) {
    console.error('❌ sendAuthOTPHttp error:', error.response?.data || error.message);
    const statusCode = error?.code === 'failed-precondition' ? 503 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to send OTP',
      details: error.response?.data || null,
    });
  }
});

/**
 * Generate, store, and send OTP for login/signup (server-side — no client Firestore write)
 */
exports.requestPhoneOTP = functions.https.onCall(async (data, context) => {
  const { userId, phoneNumber, purpose = 'verification' } = data;

  if (!userId || !phoneNumber) {
    throw new functions.https.HttpsError('invalid-argument', 'userId and phoneNumber are required');
  }

  const localPhone = formatLocalPhone(phoneNumber);
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + (30 * 60 * 1000);

  await firestore.collection('otp_codes').doc(userId).set({
    code: otpCode,
    phone: localPhone,
    purpose,
    expiresAt,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    verified: false,
    attempts: 0
  });

  try {
    const delivery = await deliverAuthOTP(localPhone, otpCode);
    console.log('✅ requestPhoneOTP sent:', { userId, phone: localPhone, purpose });

    return {
      success: true,
      message: 'OTP sent to your WhatsApp',
      messageId: delivery.messageId,
      status: delivery.status
    };
  } catch (error) {
    await firestore.collection('otp_codes').doc(userId).delete().catch(() => {});
    throw error;
  }
});

/**
 * Customer login OTP — finds user by phone with Admin SDK (client list queries are blocked
 * for unauthenticated users), then sends WhatsApp OTP.
 */
exports.requestLoginOTP = functions.https.onCall(async (data) => {
  const phoneNumber = data?.phoneNumber;
  if (!phoneNumber) {
    throw new functions.https.HttpsError('invalid-argument', 'Phone number is required');
  }

  const { userDoc, localPhone: typedPhone } = await findUserDocByPhone(phoneNumber);
  if (!userDoc) {
    throw new functions.https.HttpsError(
      'not-found',
      'No account found with this phone number. Please sign up first.'
    );
  }

  const userId = userDoc.id;
  
  // Rate limiting: Check recent OTP requests for this phone number
  const rateLimitDoc = await firestore.collection('rate_limits').doc('login_' + phoneNumber).get();
  if (rateLimitDoc.exists) {
    const rateData = rateLimitDoc.data();
    const requestCount = rateData.count || 0;
    const lastRequestTime = rateData.lastRequestTime?.toMillis() || 0;
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Allow max 5 login OTP requests per hour per phone number
    if (requestCount >= 5 && lastRequestTime > oneHourAgo) {
      throw new functions.https.HttpsError('resource-exhausted', 'Too many login attempts. Please try again later.');
    }
    
    // Reset count if more than 1 hour has passed
    if (lastRequestTime <= oneHourAgo) {
      await firestore.collection('rate_limits').doc('login_' + phoneNumber).set({
        count: 1,
        lastRequestTime: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Increment count
      await firestore.collection('rate_limits').doc('login_' + phoneNumber).update({
        count: admin.firestore.FieldValue.increment(1),
        lastRequestTime: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  } else {
    // First request
    await firestore.collection('rate_limits').doc('login_' + phoneNumber).set({
      count: 1,
      lastRequestTime: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  const firebasePhone = phoneFromUserData(userDoc.data(), typedPhone);
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + (30 * 60 * 1000);
  const purpose = data?.purpose || 'customer_login';

  const otpPayload = {
    code: otpCode,
    phone: firebasePhone,
    purpose,
    expiresAt,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    verified: false,
    attempts: 0,
  };

  await firestore.collection('otp_codes').doc(userId).set(otpPayload);
  await firestore.collection('otps').doc(userId).set(otpPayload).catch(() => {});

  try {
    const delivery = await deliverAuthOTP(firebasePhone, otpCode);
    console.log('✅ requestLoginOTP sent:', { userId, phone: firebasePhone });

    return {
      success: true,
      message: 'OTP sent to your WhatsApp',
      userId,
      phone: firebasePhone,
      messageId: delivery.messageId,
      status: delivery.status,
    };
  } catch (error) {
    await firestore.collection('otp_codes').doc(userId).delete().catch(() => {});
    await firestore.collection('otps').doc(userId).delete().catch(() => {});
    console.error('❌ requestLoginOTP Infobip error:', error.response?.data || error.message);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send WhatsApp OTP. Please try again.'
    );
  }
});

/**
 * Customer signup OTP — checks phone is free with Admin SDK (client /users list
 * queries are blocked when logged out), then sends WhatsApp OTP.
 */
exports.requestSignupOTP = functions.https.onCall(async (data) => {
  const phoneNumber = data?.phoneNumber;
  if (!phoneNumber) {
    throw new functions.https.HttpsError('invalid-argument', 'Phone number is required');
  }

  // Rate limiting: Check recent signup OTP requests for this phone number
  const rateLimitDoc = await firestore.collection('rate_limits').doc('signup_' + phoneNumber).get();
  if (rateLimitDoc.exists) {
    const rateData = rateLimitDoc.data();
    const requestCount = rateData.count || 0;
    const lastRequestTime = rateData.lastRequestTime?.toMillis() || 0;
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Allow max 5 signup OTP requests per hour per phone number
    if (requestCount >= 5 && lastRequestTime > oneHourAgo) {
      throw new functions.https.HttpsError('resource-exhausted', 'Too many signup attempts. Please try again later.');
    }
    
    // Reset count if more than 1 hour has passed
    if (lastRequestTime <= oneHourAgo) {
      await firestore.collection('rate_limits').doc('signup_' + phoneNumber).set({
        count: 1,
        lastRequestTime: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Increment count
      await firestore.collection('rate_limits').doc('signup_' + phoneNumber).update({
        count: admin.firestore.FieldValue.increment(1),
        lastRequestTime: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  } else {
    // First request
    await firestore.collection('rate_limits').doc('signup_' + phoneNumber).set({
      count: 1,
      lastRequestTime: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  const { userDoc, localPhone } = await findUserDocByPhone(phoneNumber);
  if (userDoc) {
    throw new functions.https.HttpsError(
      'already-exists',
      'This phone number is already registered. Try logging in instead.'
    );
  }

  // Stable doc id so resend + verify always hit the same OTP (no lost random session id)
  const userId = `signup_${localPhone}`;
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + (30 * 60 * 1000);
  const purpose = data?.purpose || 'customer_signup_verification';

  const otpPayload = {
    code: otpCode,
    phone: localPhone,
    purpose,
    expiresAt,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    verified: false,
    attempts: 0,
  };

  await firestore.collection('otp_codes').doc(userId).set(otpPayload);
  await firestore.collection('otps').doc(userId).set(otpPayload).catch(() => {});

  try {
    const delivery = await deliverAuthOTP(localPhone, otpCode);
    console.log('✅ requestSignupOTP sent:', { userId, phone: localPhone });

    return {
      success: true,
      message: 'OTP sent to your WhatsApp',
      userId,
      phone: localPhone,
      messageId: delivery.messageId,
      status: delivery.status,
    };
  } catch (error) {
    await firestore.collection('otp_codes').doc(userId).delete().catch(() => {});
    await firestore.collection('otps').doc(userId).delete().catch(() => {});
    console.error('❌ requestSignupOTP Infobip error:', error.response?.data || error.message);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send WhatsApp OTP. Please try again.'
    );
  }
});

/**
 * Send Order Update via Infobip WhatsApp Template
 */
exports.sendOrderUpdate = functions.https.onCall(async (data, context) => {
  const { 
    phoneNumber, 
    customerName, 
    orderNumber, 
    status, 
    message
  } = data;
  
  console.log('📱 Sending order update to:', phoneNumber, 'Order:', orderNumber);
  
  if (!phoneNumber || !orderNumber) {
    throw new functions.https.HttpsError('invalid-argument', 'Phone number and order number required');
  }
  
  if (!INFOBIP_API_KEY || !INFOBIP_SENDER) {
    console.error('❌ Infobip credentials not configured');
    throw new functions.https.HttpsError('failed-precondition', 'WhatsApp service not configured');
  }
  
  const formattedPhone = formatPhoneNumber(phoneNumber);
  const cfg = getInfobipConfig();
  const templateName = functions.config().infobip?.order_template || 'order';
  
  try {
    const response = await axios.post(
      `${cfg.baseUrl}/whatsapp/1/message/template`,
      {
        messages: [
          {
            from: cfg.sender,
            to: formattedPhone,
            messageId: `order-${orderNumber}-${Date.now()}`,
            content: {
              templateName: templateName,
              templateData: {
                body: {
                  placeholders: [
                    customerName || 'Customer',           // {{1}}
                    orderNumber                           // {{2}}
                  ]
                }
              },
              language: 'en'
            }
          }
        ]
      },
      {
        headers: {
          'Authorization': `App ${cfg.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('✅ Infobip order update sent successfully:', {
      phone: formattedPhone,
      order: orderNumber,
      messageId: response.data.messages?.[0]?.messageId
    });
    
    return { 
      success: true, 
      messageId: response.data.messages?.[0]?.messageId,
      status: response.data.messages?.[0]?.status?.name
    };
    
  } catch (error) {
    console.error('❌ Infobip order update error:', {
      phone: formattedPhone,
      order: orderNumber,
      error: error.response?.data || error.message
    });
    
    throw new functions.https.HttpsError(
      'internal', 
      'Failed to send order update',
      error.response?.data
    );
  }
});

/**
 * Auto-trigger WhatsApp notification when order is created
 * Uses template: "Hi {{1}}, your Go7 order {{2}} has been received. We'll notify you when a rider is assigned."
 */
exports.onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    
    console.log('🔔 New order created:', {
      orderId: context.params.orderId
    });
    
    // Skip if no phone number — check all field shapes (commerce orders use userPhone)
    const phone = order.customerPhone || order.deliveryAddress?.phoneNumber || order.userPhone || order.recipientInfo?.phone;
    if (!phone) {
      console.warn('⚠️ No customer phone number found');
      return null;
    }

    const cfg = getInfobipConfig();
    // Skip notification if credentials not configured
    if (!cfg.apiKey || !cfg.sender) {
      console.warn('⚠️ Infobip not configured, skipping notification');
      return null;
    }

    const formattedPhone = formatPhoneNumber(phone);
    const templateName = functions.config().infobip?.order_template || 'order';
    
    try {
      const response = await axios.post(
        `${cfg.baseUrl}/whatsapp/1/message/template`,
        {
          messages: [
            {
              from: cfg.sender,
              to: formattedPhone,
              messageId: `order-${context.params.orderId}-${Date.now()}`,
              content: {
                templateName: templateName,
                templateData: {
                  body: {
                    placeholders: [
                      order.customerName || 'Customer',    // {{1}}
                      order.orderNumber || context.params.orderId.slice(-6).toUpperCase()  // {{2}}
                    ]
                  }
                },
                language: 'en'
              }
            }
          ]
        },
        {
          headers: {
            'Authorization': `App ${cfg.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log('✅ Order notification sent:', {
        orderId: context.params.orderId,
        phone: formattedPhone,
        messageId: response.data.messages?.[0]?.messageId
      });
      
      // Log notification to order document
      await snap.ref.update({
        'notifications.whatsapp': admin.firestore.FieldValue.arrayUnion({
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          type: 'order_received',
          messageId: response.data.messages?.[0]?.messageId,
          success: true
        })
      });
      
      return null;
      
    } catch (error) {
      console.error('❌ Order notification error:', {
        orderId: context.params.orderId,
        error: error.response?.data || error.message
      });
      
      // Log failed notification
      try {
        await snap.ref.update({
          'notifications.whatsapp': admin.firestore.FieldValue.arrayUnion({
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            type: 'order_received',
            success: false,
            error: error.message
          })
        });
      } catch (logError) {
        console.error('Failed to log notification error:', logError);
      }
      
      return null;
    }
  });

/**
 * Test function - Send WhatsApp message using template
 */
exports.testInfobipWhatsApp = functions.https.onCall(async (data, context) => {
  const { phoneNumber, customerName, orderNumber } = data;
  
  const config = getInfobipConfig();
  if (!config.apiKey || !config.baseUrl || !config.sender) {
    throw new functions.https.HttpsError('failed-precondition', 'Infobip not configured');
  }
  
  const formattedPhone = formatPhoneNumber(phoneNumber);
  const cfg = getInfobipConfig();
  const templateName = config.orderTemplate;
  
  try {
    const response = await axios.post(
      `${config.baseUrl}/whatsapp/1/message/template`,
      {
        messages: [
          {
            from: config.sender,
            to: formattedPhone,
            messageId: `test-${Date.now()}`,
            content: {
              templateName: templateName,
              templateData: {
                body: {
                  placeholders: [
                    customerName || 'Test Vendor',
                    orderNumber || 'TEST123',
                    '1x Test Item',
                    '1,500 NGN'
                  ]
                }
              },
              language: 'en'
            }
          }
        ]
      },
      {
        headers: {
          'Authorization': `App ${config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('✅ Test message sent');
    console.log('Full API Response:', JSON.stringify(response.data, null, 2));
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    
    return { 
      success: true, 
      status: response.status,
      messageId: response.data.messages?.[0]?.messageId,
      fullResponse: response.data
    };
    
  } catch (error) {
    console.error('❌ Test message error:', JSON.stringify(error.response?.data || error.message, null, 2));
    console.error('Error status:', error.response?.status);
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || null,
    };
  }
});

/**
 * Send Rider Assignment Notification
 * Template: "Hi {{1}}, a rider has been assigned to deliver your order {{2}}. Your food will arrive soon."
 */
exports.sendRiderAssignment = functions.https.onCall(async (data, context) => {
  const { phoneNumber, customerName, orderNumber } = data;
  
  if (!phoneNumber || !customerName || !orderNumber) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }
  
  const formattedPhone = formatPhoneNumber(phoneNumber);
  const cfg = getInfobipConfig();
  const templateName = functions.config().infobip?.rider_template || 'order_rider';
  
  try {
    const response = await axios.post(
      `${cfg.baseUrl}/whatsapp/1/message/template`,
      {
        messages: [
          {
            from: cfg.sender,
            to: formattedPhone,
            messageId: `rider-${Date.now()}`,
            content: {
              templateName: templateName,
              templateData: {
                body: {
                  placeholders: [
                    customerName,      // {{1}}
                    orderNumber        // {{2}}
                  ]
                }
              },
              language: 'en'
            }
          }
        ]
      },
      {
        headers: {
          'Authorization': `App ${cfg.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('✅ Rider assignment notification sent:', formattedPhone);
    
    return { 
      success: true,
      messageId: response.data.messages?.[0]?.messageId,
      status: response.data.messages?.[0]?.status
    };
    
  } catch (error) {
    console.error('❌ Rider assignment error:', error.response?.data || error.message);
    throw new functions.https.HttpsError('internal', 'Failed to send notification', error.response?.data);
  }
});

/**
 * Send Delivery Confirmation
 * Template: "Hi {{1}}, your order {{2}} was delivered successfully. You can manage your order below."
 */
exports.sendDeliveryConfirmation = functions.https.onCall(async (data, context) => {
  const { phoneNumber, customerName, orderNumber } = data;
  
  if (!phoneNumber || !customerName || !orderNumber) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }
  
  const formattedPhone = formatPhoneNumber(phoneNumber);
  const cfg = getInfobipConfig();
  const templateName = functions.config().infobip?.delivery_template || 'delivery_confirmation_1';
  
  try {
    const response = await axios.post(
      `${cfg.baseUrl}/whatsapp/1/message/template`,
      {
        messages: [
          {
            from: cfg.sender,
            to: formattedPhone,
            messageId: `delivered-${Date.now()}`,
            content: {
              templateName: templateName,
              templateData: {
                body: {
                  placeholders: [
                    customerName,      // {{1}}
                    orderNumber        // {{2}}
                  ]
                }
              },
              language: 'en'
            }
          }
        ]
      },
      {
        headers: {
          'Authorization': `App ${cfg.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('✅ Delivery confirmation sent:', formattedPhone);
    
    return { 
      success: true,
      messageId: response.data.messages?.[0]?.messageId,
      status: response.data.messages?.[0]?.status
    };
    
  } catch (error) {
    console.error('❌ Delivery confirmation error:', error.response?.data || error.message);
    throw new functions.https.HttpsError('internal', 'Failed to send notification', error.response?.data);
  }
});

/**
 * Send Order Shipping/On the Way Notification
 * Template: "Hi {{1}}, your Go7 order {{2}} is on the way. Thank you for choosing Go7."
 */
exports.sendOrderShipping = functions.https.onCall(async (data, context) => {
  const { phoneNumber, customerName, orderNumber } = data;
  
  if (!phoneNumber || !customerName || !orderNumber) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }
  
  const formattedPhone = formatPhoneNumber(phoneNumber);
  const cfg = getInfobipConfig();
  const templateName = functions.config().infobip?.shipping_template || 'ordershipping';
  
  try {
    const response = await axios.post(
      `${cfg.baseUrl}/whatsapp/1/message/template`,
      {
        messages: [
          {
            from: cfg.sender,
            to: formattedPhone,
            messageId: `shipping-${Date.now()}`,
            content: {
              templateName: templateName,
              templateData: {
                body: {
                  placeholders: [
                    customerName,      // {{1}}
                    orderNumber        // {{2}}
                  ]
                }
              },
              language: 'en'
            }
          }
        ]
      },
      {
        headers: {
          'Authorization': `App ${cfg.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('✅ Order shipping notification sent:', formattedPhone);
    
    return { 
      success: true,
      messageId: response.data.messages?.[0]?.messageId,
      status: response.data.messages?.[0]?.status
    };
    
  } catch (error) {
    console.error('❌ Order shipping error:', error.response?.data || error.message);
    throw new functions.https.HttpsError('internal', 'Failed to send notification', error.response?.data);
  }
});

/**
 * Auto-trigger: Rider Assignment Notification
 * Triggers when riderId is added to an order
 */
exports.onRiderAssigned = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Only trigger if rider was just assigned
    if (before.riderId || !after.riderId) {
      return null;
    }
    
    console.log('🏍️ Rider assigned to order:', {
      orderId: context.params.orderId,
      riderId: after.riderId
    });
    
    // Skip if no phone number — check all field shapes (commerce orders use userPhone)
    const phone = after.customerPhone || after.deliveryAddress?.phoneNumber || after.userPhone || after.recipientInfo?.phone;
    if (!phone) {
      console.warn('⚠️ No customer phone number found');
      return null;
    }

    const cfg = getInfobipConfig();
    // Skip if Infobip not configured
    if (!cfg.apiKey || !cfg.sender) {
      console.warn('⚠️ Infobip not configured, skipping notification');
      return null;
    }

    const formattedPhone = formatPhoneNumber(phone);
    const templateName = functions.config().infobip?.rider_template || 'order_rider';
    
    try {
      const response = await axios.post(
        `${cfg.baseUrl}/whatsapp/1/message/template`,
        {
          messages: [
            {
              from: cfg.sender,
              to: formattedPhone,
              messageId: `rider-auto-${Date.now()}`,
              content: {
                templateName: templateName,
                templateData: {
                  body: {
                    placeholders: [
                      after.customerName || 'Customer',
                      after.orderNumber || context.params.orderId.slice(-6).toUpperCase()
                    ]
                  }
                },
                language: 'en'
              }
            }
          ]
        },
        {
          headers: {
            'Authorization': `App ${cfg.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log('✅ Rider assignment notification sent:', {
        orderId: context.params.orderId,
        phone: formattedPhone,
        messageId: response.data.messages?.[0]?.messageId
      });
      
      // Log notification
      await change.after.ref.update({
        'notifications.whatsapp': admin.firestore.FieldValue.arrayUnion({
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          type: 'rider_assigned',
          messageId: response.data.messages?.[0]?.messageId,
          success: true
        })
      });
      
      return null;
      
    } catch (error) {
      console.error('❌ Rider assignment notification error:', error.response?.data || error.message);
      return null;
    }
  });

/**
 * Auto-trigger: Order Shipping Notification
 * Fires when rider is heading to customer (canonical rider statuses + legacy out_for_delivery).
 */
exports.onOrderShipping = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const orderId = context.params.orderId;

    const shippingStatuses = new Set([
      'out_for_delivery',
      'enroute_dropoff',
      'enroute',
      'in_transit',
      'picked_up',
    ]);
    const beforeStatus = String(before.status || before.orderStatus || '').toLowerCase();
    const afterStatus = String(after.status || after.orderStatus || '').toLowerCase();

    if (!shippingStatuses.has(afterStatus) || shippingStatuses.has(beforeStatus)) {
      return null;
    }
    if (after.shippingWhatsAppNotifiedAt) {
      return null;
    }

    console.log('🚚 Order out for delivery:', { orderId, afterStatus });
    
    // Skip if no phone number — check all field shapes (commerce orders use userPhone)
    const phone = after.customerPhone || after.deliveryAddress?.phoneNumber || after.phone || after.userPhone || after.recipientInfo?.phone;
    if (!phone) {
      console.warn('⚠️ No customer phone number found');
      return null;
    }

    const cfg = getInfobipConfig();
    // Skip if Infobip not configured
    if (!cfg.apiKey || !cfg.sender) {
      console.warn('⚠️ Infobip not configured, skipping notification');
      return null;
    }
    const formattedPhone = formatPhoneNumber(phone);
    const templateName = functions.config().infobip?.shipping_template || 'ordershipping';
    
    try {
      const response = await axios.post(
        `${cfg.baseUrl}/whatsapp/1/message/template`,
        {
          messages: [
            {
              from: cfg.sender,
              to: formattedPhone,
              messageId: `shipping-auto-${Date.now()}`,
              content: {
                templateName: templateName,
                templateData: {
                  body: {
                    placeholders: [
                      after.customerName || 'Customer',
                      after.orderNumber || after.orderCode || orderId.slice(-6).toUpperCase()
                    ]
                  }
                },
                language: 'en'
              }
            }
          ]
        },
        {
          headers: {
            'Authorization': `App ${cfg.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      await change.after.ref.set(
        { shippingWhatsAppNotifiedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      ).catch(() => {});

      console.log('✅ Order shipping notification sent:', formattedPhone, response.data?.messages?.[0]?.messageId);
      return { success: true };
    } catch (error) {
      console.error('❌ Order shipping error:', error.response?.data || error.message);
      return null;
    }
  });

/**
 * Auto-trigger: Delivery Confirmation Notification
 * Triggers when order status changes to 'delivered'
 */
exports.onOrderDelivered = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Only trigger if status just changed to delivered
    if (before.status === 'delivered' || after.status !== 'delivered') {
      return null;
    }
    
    console.log('✅ Order delivered:', {
      orderId: context.params.orderId
    });
    
    // Skip if no phone number — check all field shapes (commerce orders use
    // userPhone, bookings use recipientInfo.phone / deliveryAddress.phoneNumber)
    const phone = after.customerPhone
                  || after.deliveryAddress?.phoneNumber
                  || after.userPhone
                  || after.recipientInfo?.phone;
    if (!phone) {
      console.warn('⚠️ No customer phone number found');
      return null;
    }

    const { apiKey: cfgKey, sender: cfgSender } = getInfobipConfig();
    if (!cfgKey || !cfgSender) {
      console.warn('⚠️ Infobip not configured, skipping notification');
      return null;
    }
    const formattedPhone = formatPhoneNumber(phone);
    const templateName = functions.config().infobip?.delivery_template || 'delivery_confirmation_1';
    
    const { baseUrl: infobipBase } = getInfobipConfig();
    try {
      const response = await axios.post(
        `${infobipBase}/whatsapp/1/message/template`,
        {
          messages: [
            {
              from: cfgSender,
              to: formattedPhone,
              messageId: `delivered-auto-${Date.now()}`,
              content: {
                templateName: templateName,
                templateData: {
                  body: {
                    placeholders: [
                      after.customerName || 'Customer',
                      after.orderNumber || context.params.orderId.slice(-6).toUpperCase()
                    ]
                  }
                },
                language: 'en'
              }
            }
          ]
        },
        {
          headers: {
            'Authorization': `App ${cfgKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log('✅ Delivery confirmation sent:', {
        orderId: context.params.orderId,
        phone: formattedPhone,
        messageId: response.data.messages?.[0]?.messageId
      });
      
      // Log notification
      await change.after.ref.update({
        'notifications.whatsapp': admin.firestore.FieldValue.arrayUnion({
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          type: 'delivered',
          messageId: response.data.messages?.[0]?.messageId,
          success: true
        })
      });
      
      return null;
      
    } catch (error) {
      console.error('❌ Delivery confirmation error:', error.response?.data || error.message);
      return null;
    }
  });
