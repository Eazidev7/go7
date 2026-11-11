const functions = require('firebase-functions/v1');

/**
 * 📧 Brevo Email Service for Go7
 * Handles sending wallet credit notifications via Brevo API
 */

// Brevo API configuration
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_API_KEY = functions.config().brevo?.api_key; // Set with firebase functions:config:set brevo.api_key="your-api-key"

const sendBrevoEmail = async (emailData) => {
  try {
    const fetch = require('node-fetch');
    
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Brevo API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log('✅ Brevo email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Brevo API error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send wallet credit notification email via Brevo
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.userName - User's name
 * @param {number} options.amount - Credit amount
 * @param {string} options.reference - Payment reference
 * @param {string} options.paymentMethod - Payment method (card/bank_transfer)
 */
const sendWalletCreditEmail = async ({ to, userName, amount, reference, paymentMethod }) => {
  try {
    console.log('📧 Sending Brevo wallet credit email to:', to);
    
    if (!BREVO_API_KEY) {
      console.warn('⚠️ Brevo API key not configured');
      return { success: false, error: 'Brevo API key missing' };
    }
    
    const paymentMethodText = paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Card Payment';
    const emoji = paymentMethod === 'bank_transfer' ? '🏦' : '💳';
    
    const emailData = {
      sender: {
        name: 'Go7 Logistics',
        email: 'notifications@go7.ng'
      },
      to: [{ 
        email: to,
        name: userName || 'Valued Customer'
      }],
      subject: `💰 Wallet Credited - ₦${amount.toLocaleString()} Received`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #e53935, #d32f2f); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
            .content { padding: 30px; }
            .amount-box { background: #f0f8ff; border: 2px solid #4CAF50; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .amount { font-size: 36px; font-weight: bold; color: #4CAF50; margin: 0; }
            .details { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #666; font-weight: 500; }
            .detail-value { color: #333; font-weight: 600; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .logo { font-size: 24px; font-weight: bold; color: white; }
            .success-icon { font-size: 48px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Go7 Logistics</div>
              <div class="success-icon">✅</div>
              <h1>Payment Received!</h1>
            </div>
            
            <div class="content">
              <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                Hi <strong>${userName || 'Valued Customer'}</strong>,
              </p>
              
              <p style="color: #666; line-height: 1.6;">
                Great news! Your Go7 wallet has been successfully credited. You can now use this balance for deliveries, orders, and other services.
              </p>
              
              <div class="amount-box">
                <div class="amount">₦${amount.toLocaleString()}</div>
                <p style="margin: 10px 0 0 0; color: #666;">Added to your wallet</p>
              </div>
              
              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Payment Method:</span>
                  <span class="detail-value">${emoji} ${paymentMethodText}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Reference:</span>
                  <span class="detail-value">${reference}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${new Date().toLocaleString('en-GB', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://go7.ng/profile" style="background: #e53935; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                  View Wallet Balance
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Your wallet balance is now updated and ready to use. You can check your transaction history and current balance in the Go7 app.
              </p>
            </div>
            
            <div class="footer">
              <p>This email was sent automatically by Go7 Logistics.</p>
              <p>If you have any questions, contact us at support@go7.ng</p>
              <p style="margin-top: 10px;">
                <strong>Go7 Logistics</strong> • Fast, Reliable, Everywhere
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Go7 Wallet Credit Notification

Hi ${userName || 'Valued Customer'},

Your Go7 wallet has been successfully credited!

Amount: ₦${amount.toLocaleString()}
Payment Method: ${paymentMethodText}
Reference: ${reference}
Date: ${new Date().toLocaleString()}

You can now use this balance for deliveries and orders in the Go7 app.

Visit https://go7.ng/profile to view your updated wallet balance.

Best regards,
Go7 Logistics Team
      `
    };
    
    return await sendBrevoEmail(emailData);
    
  } catch (error) {
    console.error('❌ Failed to send wallet credit email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send wallet debit notification email
 * @param {Object} options - Email options
 */
const sendWalletDebitEmail = async ({ to, userName, amount, description, reference }) => {
  try {
    console.log('📧 Sending Brevo wallet debit email to:', to);
    
    if (!BREVO_API_KEY) {
      console.warn('⚠️ Brevo API key not configured');
      return { success: false, error: 'Brevo API key missing' };
    }
    
    const emailData = {
      sender: {
        name: 'Go7 Logistics',
        email: 'notifications@go7.ng'
      },
      to: [{ 
        email: to,
        name: userName || 'Valued Customer'
      }],
      subject: `💸 Payment Processed - ₦${amount.toLocaleString()} Deducted`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #e53935, #d32f2f); color: white; padding: 30px; text-align: center; }
            .amount-box { background: #fff5f5; border: 2px solid #f44336; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .amount { font-size: 36px; font-weight: bold; color: #f44336; margin: 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💸 Payment Processed</h1>
            </div>
            <div style="padding: 30px;">
              <p>Hi <strong>${userName || 'Valued Customer'}</strong>,</p>
              <p>A payment has been processed from your Go7 wallet.</p>
              <div class="amount-box">
                <div class="amount">₦${amount.toLocaleString()}</div>
                <p style="margin: 10px 0 0 0; color: #666;">${description}</p>
              </div>
              <p><strong>Reference:</strong> ${reference}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    return await sendBrevoEmail(emailData);
    
  } catch (error) {
    console.error('❌ Failed to send wallet debit email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendWalletCreditEmail,
  sendWalletDebitEmail
};