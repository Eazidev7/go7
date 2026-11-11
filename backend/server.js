/**
 * 🚀 GO7 BACKEND SERVER
 * Express server for handling Paystack webhooks and payment processing
 * 
 * Features:
 * - Paystack webhook handling
 * - Payment verification
 * - Order status updates
 * - Expired order cleanup
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json'); // Download from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// For Paystack webhook - must use raw body
app.use('/api/paystack/webhook', bodyParser.raw({ type: 'application/json' }));

// For other routes - use JSON parser
app.use(bodyParser.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import webhook router
const paystackWebhookRouter = require('./paystackWebhook');
app.use('/api/paystack', paystackWebhookRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GO7 Backend Server running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/api/paystack/webhook`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});
