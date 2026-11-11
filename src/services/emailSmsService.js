/**
 * Go7 Email & SMS Notification Service
 * Handles delivery notifications via Resend (email) and Termii (SMS)
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Email configuration (Resend)
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'Go7 Logistics <notifications@go7.ng>';

// SMS configuration (Termii)
const TERMII_API_KEY = import.meta.env.VITE_TERMII_API_KEY;
const TERMII_API_URL = 'https://api.ng.termii.com/api/sms/send';
const TERMII_SENDER_ID = 'GO7';

/**
 * Send email notification using Resend
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!RESEND_API_KEY) {
    console.warn('⚠️ Resend API key not configured');
    return { success: false, error: 'API key missing' };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text: text || stripHtml(html)
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Email failed: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Email sent successfully:', { to, subject, id: data.id });
    return { success: true, data };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send SMS notification using Termii
 */
export const sendSMS = async (phone, message) => {
  if (!TERMII_API_KEY) {
    console.warn('⚠️ Termii API key not configured');
    return { success: false, error: 'API key missing' };
  }

  try {
    const formattedPhone = formatPhoneNumber(phone);

    const response = await fetch(TERMII_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: formattedPhone,
        from: TERMII_SENDER_ID,
        sms: message,
        type: 'plain',
        api_key: TERMII_API_KEY,
        channel: 'generic'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`SMS failed: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ SMS sent successfully:', { to: formattedPhone, messageId: data.message_id });
    return { success: true, data };
  } catch (error) {
    console.error('❌ SMS error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Log notification to Firestore
 */
const logNotification = async (notificationData) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log notification:', error);
  }
};

/**
 * Send booking confirmation notifications
 */
export const sendBookingNotification = async (bookingData) => {
  const { bookingId, pickup, dropoff, sender, recipient, fare, distance } = bookingData;

  console.log('📧 Sending booking notifications for:', bookingId);

  // Email content
  const emailSubject = `✅ Go7 Delivery #${bookingId} Confirmed`;
  const emailHtml = createBookingEmailTemplate(bookingData);

  // SMS content
  const smsMessage = `Go7: Delivery #${bookingId} confirmed! Pickup: ${pickup.address}. Dropoff: ${dropoff.address}. Fare: ₦${fare?.toLocaleString()}. Track: go7.ng/track/${bookingId}`;

  // Send to both sender and recipient
  const notifications = [];
  const recipients = [];

  // Send emails
  if (sender.email) {
    recipients.push(sender.email);
    notifications.push(sendEmail({ to: sender.email, subject: emailSubject, html: emailHtml }));
  }
  if (recipient.email && recipient.email !== sender.email) {
    recipients.push(recipient.email);
    notifications.push(sendEmail({ to: recipient.email, subject: emailSubject, html: emailHtml }));
  }

  // Send SMS
  if (sender.phone) {
    notifications.push(sendSMS(sender.phone, smsMessage));
  }
  if (recipient.phone && recipient.phone !== sender.phone) {
    notifications.push(sendSMS(recipient.phone, smsMessage));
  }

  const results = await Promise.allSettled(notifications);
  
  // Log to Firestore
  await logNotification({
    orderId: bookingId,
    type: 'booking_created',
    message: smsMessage,
    recipients,
    emailsSent: results.slice(0, recipients.length).filter(r => r.status === 'fulfilled').length,
    smsSent: results.slice(recipients.length).filter(r => r.status === 'fulfilled').length
  });

  console.log('📧 Booking notifications sent:', results);
  return results;
};

/**
 * Send pickup notification
 */
export const sendPickupNotification = async (bookingData) => {
  const { bookingId, sender, recipient, riderName, riderPhone } = bookingData;

  console.log('📧 Sending pickup notifications for:', bookingId);

  const emailSubject = `📦 Go7 Delivery #${bookingId} Picked Up`;
  const emailHtml = createPickupEmailTemplate(bookingData);
  const smsMessage = `Go7: Delivery #${bookingId} picked up by ${riderName || 'our rider'}. Track live: go7.ng/track/${bookingId}`;

  const notifications = [];
  const recipients = [];

  if (sender.email) {
    recipients.push(sender.email);
    notifications.push(sendEmail({ to: sender.email, subject: emailSubject, html: emailHtml }));
  }
  if (recipient.email && recipient.email !== sender.email) {
    recipients.push(recipient.email);
    notifications.push(sendEmail({ to: recipient.email, subject: emailSubject, html: emailHtml }));
  }
  if (sender.phone) notifications.push(sendSMS(sender.phone, smsMessage));
  if (recipient.phone && recipient.phone !== sender.phone) notifications.push(sendSMS(recipient.phone, smsMessage));

  const results = await Promise.allSettled(notifications);
  
  await logNotification({
    orderId: bookingId,
    type: 'picked_up',
    message: smsMessage,
    recipients,
    rider: riderName
  });

  return results;
};

/**
 * Send delivery completion notification
 */
export const sendDeliveryNotification = async (bookingData) => {
  const { bookingId, sender, recipient, fare } = bookingData;

  console.log('📧 Sending delivery completion notifications for:', bookingId);

  const emailSubject = `🎉 Go7 Delivery #${bookingId} Completed`;
  const emailHtml = createDeliveryEmailTemplate(bookingData);
  const smsMessage = `Go7: Delivery #${bookingId} completed successfully! Thank you for using Go7. Book again: go7.ng/book`;

  const notifications = [];
  const recipients = [];

  if (sender.email) {
    recipients.push(sender.email);
    notifications.push(sendEmail({ to: sender.email, subject: emailSubject, html: emailHtml }));
  }
  if (recipient.email && recipient.email !== sender.email) {
    recipients.push(recipient.email);
    notifications.push(sendEmail({ to: recipient.email, subject: emailSubject, html: emailHtml }));
  }
  if (sender.phone) notifications.push(sendSMS(sender.phone, smsMessage));
  if (recipient.phone && recipient.phone !== sender.phone) notifications.push(sendSMS(recipient.phone, smsMessage));

  const results = await Promise.allSettled(notifications);
  
  await logNotification({
    orderId: bookingId,
    type: 'delivered',
    message: smsMessage,
    recipients
  });

  return results;
};

// Email Templates
const createBookingEmailTemplate = ({ bookingId, pickup, dropoff, sender, recipient, fare, distance }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #E30613 0%, #8B0000 100%); color: white; padding: 40px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 10px 0 0; font-size: 18px; opacity: 0.9; }
    .content { padding: 30px; }
    .detail { background: #f9f9f9; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #E30613; }
    .detail-title { color: #E30613; font-weight: bold; margin-bottom: 10px; font-size: 16px; }
    .detail-content { color: #555; line-height: 1.8; }
    .button { display: inline-block; background: #E30613; color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; margin: 25px 0; font-weight: bold; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚚 Delivery Confirmed!</h1>
      <p>Booking ID: ${bookingId}</p>
    </div>
    <div class="content">
      <p style="font-size: 16px; margin-bottom: 20px;">Your Go7 delivery has been successfully booked and is being processed.</p>
      
      <div class="detail">
        <div class="detail-title">📍 Pickup Location</div>
        <div class="detail-content">
          <strong>${sender.name}</strong><br>
          📞 ${sender.phone}<br>
          📧 ${sender.email}<br>
          📍 ${pickup.address}
        </div>
      </div>
      
      <div class="detail">
        <div class="detail-title">🎯 Dropoff Location</div>
        <div class="detail-content">
          <strong>${recipient.name}</strong><br>
          📞 ${recipient.phone}<br>
          📧 ${recipient.email}<br>
          📍 ${dropoff.address}
        </div>
      </div>
      
      <div class="detail">
        <div class="detail-title">💰 Delivery Details</div>
        <div class="detail-content">
          <strong>Distance:</strong> ${distance?.toFixed(2) || 'Calculating...'} km<br>
          <strong>Fare:</strong> ₦${fare?.toLocaleString() || 'N/A'}
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="https://go7.ng/track/${bookingId}" class="button">Track Your Delivery</a>
      </div>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        We'll notify you when your package is picked up and when it's delivered.
      </p>
    </div>
    <div class="footer">
      <p><strong>Go7 Logistics</strong></p>
      <p>© ${new Date().getFullYear()} Go7. All rights reserved.</p>
      <p>Questions? Contact us at <a href="mailto:support@go7.ng">support@go7.ng</a></p>
    </div>
  </div>
</body>
</html>
`;

const createPickupEmailTemplate = ({ bookingId, riderName, riderPhone }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 40px 20px; text-align: center; }
    .content { padding: 30px; }
    .detail { background: #f0fdf4; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #16a34a; }
    .button { display: inline-block; background: #16a34a; color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Package Picked Up!</h1>
      <p>Booking ID: ${bookingId}</p>
    </div>
    <div class="content">
      <p style="font-size: 16px;">Your package has been picked up and is now on its way to the destination!</p>
      
      <div class="detail">
        <strong>🚴 Rider:</strong> ${riderName || 'Go7 Rider'}<br>
        ${riderPhone ? `<strong>📞 Contact:</strong> ${riderPhone}` : ''}
      </div>
      
      <div style="text-align: center;">
        <a href="https://go7.ng/track/${bookingId}" class="button">Track in Real-Time</a>
      </div>
      
      <p style="margin-top: 20px; font-size: 14px; color: #666;">
        You'll receive another notification when the delivery is completed.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Go7 Logistics</p>
    </div>
  </div>
</body>
</html>
`;

const createDeliveryEmailTemplate = ({ bookingId, recipient, fare }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 40px 20px; text-align: center; }
    .content { padding: 30px; }
    .success { background: #dcfce7; color: #166534; padding: 30px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #8b5cf6; color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Delivery Completed!</h1>
      <p>Booking ID: ${bookingId}</p>
    </div>
    <div class="content">
      <div class="success">
        <h2 style="margin: 0 0 10px;">✅ Successfully Delivered</h2>
        <p style="margin: 5px 0;"><strong>Delivered to:</strong> ${recipient.name}</p>
        <p style="margin: 5px 0; font-size: 20px; font-weight: bold;">Total: ₦${fare?.toLocaleString()}</p>
      </div>
      
      <p style="font-size: 16px; text-align: center;">Thank you for using Go7 Logistics! We hope to serve you again soon.</p>
      
      <div style="text-align: center;">
        <a href="https://go7.ng/book" class="button">Book Another Delivery</a>
      </div>
      
      <p style="margin-top: 20px; font-size: 14px; color: #666; text-align: center;">
        Have feedback? We'd love to hear from you at <a href="mailto:support@go7.ng">support@go7.ng</a>
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Go7 Logistics</p>
    </div>
  </div>
</body>
</html>
`;

// Helper functions
const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
  if (!cleaned.startsWith('234')) cleaned = '234' + cleaned;
  return cleaned;
};

const stripHtml = (html) => {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
};
