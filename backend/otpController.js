const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  try {
    // Try to use service account key file
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized with service account');
  } catch (error) {
    // Fallback: use default credentials or environment variables
    try {
      admin.initializeApp();
      console.log('✅ Firebase Admin initialized with default credentials');
    } catch (fallbackError) {
      console.warn('⚠️ Firebase Admin initialization failed. Some features may not work.');
      console.warn('   Please add serviceAccountKey.json or configure GOOGLE_APPLICATION_CREDENTIALS');
    }
  }
}

const db = admin.apps.length > 0 ? admin.firestore() : null;

// WhatsApp Cloud API Configuration
const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Generate a random 6-digit OTP
 * @returns {string} 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via WhatsApp Cloud API
 * @param {string} phoneNumber - Recipient's phone number (E.164 format)
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<object>} API response
 */
async function sendWhatsAppOTP(phoneNumber, otp) {
  try {
    // Ensure phone number is in E.164 format
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    
    const response = await axios.post(
      WHATSAPP_API_URL,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: 'go7_otp_verification', // Your approved template name
          language: {
            code: 'en'
          },
          components: [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: otp
                }
              ]
            }
          ]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ WhatsApp OTP sent successfully:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ WhatsApp API Error:', error.response?.data || error.message);
    throw new Error('Failed to send WhatsApp OTP');
  }
}

/**
 * Send OTP and store in Firestore
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function sendOtp(req, res) {
  try {
    const { phoneNumber, email } = req.body;

    // Validate input
    if (!phoneNumber && !email) {
      return res.status(400).json({
        success: false,
        message: 'Phone number or email is required'
      });
    }

    // Check if Firebase is available
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Database service unavailable. Please configure Firebase.'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const identifier = phoneNumber || email;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Store OTP in Firestore
    await db.collection('otps').doc(identifier).set({
      otp,
      phoneNumber: phoneNumber || null,
      email: email || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      verified: false,
      attempts: 0
    });

    // Send OTP via WhatsApp if phone number provided
    if (phoneNumber) {
      try {
        await sendWhatsAppOTP(phoneNumber, otp);
      } catch (whatsappError) {
        console.error('WhatsApp send failed, but OTP stored:', whatsappError);
        // Continue even if WhatsApp fails - OTP is still stored
      }
    }

    // For development/testing - log OTP (REMOVE IN PRODUCTION)
    console.log(`🔐 OTP for ${identifier}: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn: 300, // 5 minutes in seconds
      // REMOVE IN PRODUCTION:
      devOtp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('❌ Send OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    });
  }
}

/**
 * Verify OTP
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function verifyOtp(req, res) {
  try {
    const { phoneNumber, email, otp } = req.body;

    // Validate input
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
    }

    if (!phoneNumber && !email) {
      return res.status(400).json({
        success: false,
        message: 'Phone number or email is required'
      });
    }

    // Check if Firebase is available
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Database service unavailable. Please configure Firebase.'
      });
    }

    const identifier = phoneNumber || email;

    // Get OTP document from Firestore
    const otpDoc = await db.collection('otps').doc(identifier).get();

    if (!otpDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'OTP not found. Please request a new one.'
      });
    }

    const otpData = otpDoc.data();

    // Check if already verified
    if (otpData.verified) {
      return res.status(400).json({
        success: false,
        message: 'OTP already used'
      });
    }

    // Check expiration
    const now = new Date();
    if (now > otpData.expiresAt.toDate()) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please request a new one.'
      });
    }

    // Check attempts (max 3 attempts)
    if (otpData.attempts >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      // Increment failed attempts
      await db.collection('otps').doc(identifier).update({
        attempts: admin.firestore.FieldValue.increment(1)
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        attemptsLeft: 3 - (otpData.attempts + 1)
      });
    }

    // OTP is valid - mark as verified
    await db.collection('otps').doc(identifier).update({
      verified: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ OTP verified for ${identifier}`);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      user: {
        phoneNumber: otpData.phoneNumber,
        email: otpData.email,
        verified: true
      }
    });

  } catch (error) {
    console.error('❌ Verify OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: error.message
    });
  }
}

/**
 * Resend OTP (with rate limiting)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function resendOtp(req, res) {
  try {
    const { phoneNumber, email } = req.body;
    const identifier = phoneNumber || email;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Phone number or email is required'
      });
    }

    // Check if previous OTP exists
    const otpDoc = await db.collection('otps').doc(identifier).get();

    if (otpDoc.exists) {
      const otpData = otpDoc.data();
      const timeSinceCreation = Date.now() - otpData.createdAt.toMillis();

      // Rate limit: minimum 60 seconds between requests
      if (timeSinceCreation < 60000) {
        return res.status(429).json({
          success: false,
          message: 'Please wait before requesting a new OTP',
          retryAfter: Math.ceil((60000 - timeSinceCreation) / 1000)
        });
      }
    }

    // Reuse sendOtp logic
    await sendOtp(req, res);

  } catch (error) {
    console.error('❌ Resend OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP',
      error: error.message
    });
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
  resendOtp,
  generateOTP
};
