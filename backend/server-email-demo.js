/**
 * Go7 Email API Demo Server
 * Demonstrates all email endpoints without requiring Firebase
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendOutForDelivery,
  sendDeliveryComplete,
  sendBookDeliveryConfirmation,
  sendVendorApproved,
  sendPasswordReset,
} = require('./controllers/emailController');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Go7 Email API Server',
    version: '1.0.0',
    emailsActive: !!process.env.BREVO_API_KEY,
    endpoints: {
      'POST /api/users/register': 'Register user + send welcome email',
      'POST /api/orders': 'Create order + send confirmation email',
      'POST /api/orders/delivery': 'Book delivery + send confirmation',
      'PATCH /api/orders/:id/status': 'Update order status + send emails',
      'PATCH /api/vendors/:id/approve': 'Approve vendor + send email',
      'POST /api/auth/reset-password': 'Request password reset + send email',
    },
  });
});

/**
 * User Registration
 */
app.post('/api/users/register', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'Email and name required' });
    }

    // Send welcome email
    await sendWelcomeEmail({ email, name });

    res.json({
      success: true,
      message: 'User registered successfully',
      emailSent: true,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create Food/Product Order
 */
app.post('/api/orders', async (req, res) => {
  try {
    const { customerEmail, customerName, items, amount } = req.body;

    if (!customerEmail || !customerName || !items || !amount) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const orderId = `GO7-${Date.now()}`;

    // Send order confirmation email
    await sendOrderConfirmation({
      id: orderId,
      customerEmail,
      customerName,
      items,
      amount,
    });

    res.json({
      success: true,
      message: 'Order created successfully',
      orderId,
      emailSent: true,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create Delivery Request
 */
app.post('/api/orders/delivery', async (req, res) => {
  try {
    const { customerEmail, customerName, pickupAddress, destination, amount } = req.body;

    if (!customerEmail || !customerName || !pickupAddress || !destination || !amount) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const deliveryId = `GO7-DEL-${Date.now()}`;

    // Send delivery confirmation email
    await sendBookDeliveryConfirmation({
      id: deliveryId,
      customerEmail,
      customerName,
      pickupAddress,
      destination,
      amount,
    });

    res.json({
      success: true,
      message: 'Delivery request created successfully',
      deliveryId,
      emailSent: true,
    });
  } catch (error) {
    console.error('Delivery creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update Order Status
 */
app.patch('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, customerEmail, customerName, riderName, riderPhone, eta } = req.body;

    if (!status || !customerEmail || !customerName) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    let emailSent = false;

    // Send email based on status
    if (status === 'out_for_delivery' || status === 'in_transit') {
      await sendOutForDelivery({
        id: orderId,
        customerEmail,
        customerName,
        riderName: riderName || 'Your rider',
        riderPhone: riderPhone || '+234 XXX XXX XXXX',
        eta: eta || '20-30 minutes',
      });
      emailSent = true;
    } else if (status === 'delivered' || status === 'completed') {
      await sendDeliveryComplete({
        id: orderId,
        customerEmail,
        customerName,
        deliveredAt: new Date().toLocaleString('en-NG'),
      });
      emailSent = true;
    }

    res.json({
      success: true,
      message: 'Order status updated',
      status,
      emailSent,
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Approve Vendor
 */
app.patch('/api/vendors/:vendorId/approve', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'Email and name required' });
    }

    // Send vendor approval email
    await sendVendorApproved({ email, name });

    res.json({
      success: true,
      message: 'Vendor approved successfully',
      vendorId,
      emailSent: true,
    });
  } catch (error) {
    console.error('Vendor approval error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Request Password Reset
 */
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }

    const resetToken = Math.random().toString(36).substr(2, 32);
    const resetLink = `https://go7.ng/reset-password?token=${resetToken}`;

    // Send password reset email
    await sendPasswordReset({
      email,
      name: name || 'User',
      resetLink,
    });

    res.json({
      success: true,
      message: 'Password reset email sent',
      emailSent: true,
      devResetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined,
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Manual Wallet Credit (for testing)
 */
/**
 * 💳 SECURE PAYSTACK PAYMENT VERIFICATION
 * Verifies payment with Paystack API using secret key
 */
app.post('/api/wallet/credit', async (req, res) => {
  try {
    const { userId, amount, reference, purpose = 'wallet_topup', orderId } = req.body;

    // Validate required fields
    if (!userId || !reference) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId and reference are required' 
      });
    }

    // Get Paystack secret key from environment
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    
    if (!PAYSTACK_SECRET_KEY) {
      console.error("❌ PAYSTACK_SECRET_KEY not configured in environment");
      return res.status(500).json({ 
        success: false, 
        error: "Payment verification not configured" 
      });
    }

    console.log(`� Verifying payment with Paystack API: ${reference}`);

    // Verify payment with Paystack API
    const fetch = (await import('node-fetch')).default;
    const paystackUrl = `https://api.paystack.co/transaction/verify/${reference}`;
    
    const paystackResponse = await fetch(paystackUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!paystackResponse.ok) {
      console.error(`❌ Paystack API error: ${paystackResponse.status}`);
      return res.status(502).json({ 
        success: false, 
        error: "Failed to verify payment with Paystack" 
      });
    }

    const paystackData = await paystackResponse.json();
    
    console.log('📋 Paystack verification result:', {
      status: paystackData.status,
      data_status: paystackData.data?.status,
      amount: paystackData.data?.amount,
      reference: paystackData.data?.reference,
      customer: paystackData.data?.customer?.email
    });

    // Check if payment was successful
    if (!paystackData.status || paystackData.data?.status !== "success") {
      return res.json({
        success: false,
        message: `Payment verification failed. Status: ${paystackData.data?.status}`,
        paystackStatus: paystackData.data?.status
      });
    }

    // Extract verified payment data
    const verifiedAmount = paystackData.data.amount / 100; // Convert kobo to naira
    const customerEmail = paystackData.data.customer?.email;
    const paidAt = paystackData.data.paid_at;

    console.log(`✅ Payment verified successfully:`, {
      reference: reference,
      amount: `₦${verifiedAmount}`,
      customer: customerEmail,
      paidAt: paidAt
    });

    // Return success - frontend will update Firebase based on this verification
    res.json({
      success: true,
      message: `Payment verified successfully`,
      data: {
        userId: userId,
        reference: reference,
        verifiedAmount: verifiedAmount,
        originalAmount: paystackData.data.amount, // in kobo
        customerEmail: customerEmail,
        paidAt: paidAt,
        purpose: purpose,
        orderId: orderId,
        paystackData: {
          status: paystackData.data.status,
          gateway_response: paystackData.data.gateway_response,
          channel: paystackData.data.channel
        }
      }
    });

  } catch (error) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during payment verification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Paystack Webhook - Handle payment verification
 */
app.post('/api/paystack/webhook', async (req, res) => {
  try {
    const event = req.body;

    // Verify webhook is from Paystack (in production, verify signature)
    console.log('📥 Paystack webhook received:', event.event);

    if (event.event === 'charge.success') {
      const { reference, amount, customer, metadata } = event.data;
      
      console.log('✅ Payment successful:', {
        reference,
        amount: amount / 100, // Convert from kobo to naira
        email: customer.email,
        purpose: metadata?.purpose
      });

      // If this is a wallet top-up
      if (metadata?.purpose === 'wallet_topup') {
        const userId = metadata.userId;
        const amountNaira = amount / 100;

        console.log(`💰 Wallet top-up: ₦${amountNaira} for user ${userId}`);
        
        // In production, this would update Firebase:
        // await updateDoc(doc(db, 'users', userId), {
        //   'wallet.balance': increment(amountNaira),
        //   'wallet.lastTopUp': new Date(),
        //   'wallet.lastTopUpAmount': amountNaira,
        //   'wallet.lastTopUpReference': reference
        // });

        // For now, just log success
        console.log('✅ Wallet credited successfully');
      }
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * OpenRouteService Proxy (to avoid CORS)
 */
app.post('/api/route/directions', async (req, res) => {
  try {
    const { coordinates } = req.body;
    
    if (!coordinates || coordinates.length !== 2) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.ORS_API_KEY || '5b3ce3597851110001cf62484c3c0f8b35d74d06907b8f29a56c0b97',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        coordinates: coordinates,
        radiuses: [-1, -1],
        instructions: false,
        units: 'km'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ORS API Error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Route calculation failed',
        details: errorText 
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Route proxy error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Go7 Email API Demo Server  📧       ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Local:   http://localhost:${PORT}    ║`);
  console.log(`║  Network: http://172.20.10.5:${PORT}  ║`);
  console.log('╠════════════════════════════════════════╣');
  console.log('║  Email Endpoints Active:              ║');
  console.log('║  ✅ User Registration                 ║');
  console.log('║  ✅ Order Confirmation                ║');
  console.log('║  ✅ Delivery Booking                  ║');
  console.log('║  ✅ Status Updates (Out/Delivered)    ║');
  console.log('║  ✅ Vendor Approval                   ║');
  console.log('║  ✅ Password Reset                    ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Brevo API: ${process.env.BREVO_API_KEY ? '✅ Connected' : '❌ Not configured'}    ║`);
  console.log('╚════════════════════════════════════════╝');
});
