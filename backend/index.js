const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK FIRST
let firebaseInitialized = false;
try {
  // Try to load serviceAccountKey.json
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  firebaseInitialized = true;
  console.log('✅ Firebase Admin initialized with serviceAccountKey.json');
} catch (error) {
  // If serviceAccountKey.json doesn't exist, try environment variables
  try {
    if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      firebaseInitialized = true;
      console.log('✅ Firebase Admin initialized with environment variables');
    } else {
      console.log('⚠️  Firebase Admin not initialized - Firebase features disabled');
      console.log('   Email system will work without Firebase');
    }
  } catch (envError) {
    console.log('⚠️  Firebase initialization failed - continuing without Firebase');
  }
}

// Import OTP controller (after Firebase init)
const { sendOtp, verifyOtp, resendOtp } = require('./otpController');

// Import routes (after Firebase init)
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const authRoutes = require('./routes/authRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:9999', 'http://172.20.10.5:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Go7 API Server is running',
    version: '2.0.0',
    endpoints: {
      otp: [
        'POST /api/send-otp',
        'POST /api/verify-otp',
        'POST /api/resend-otp'
      ],
      users: [
        'POST /api/users/register'
      ],
      orders: [
        'POST /api/orders',
        'POST /api/orders/delivery',
        'PATCH /api/orders/:id/status',
        'GET /api/orders/:id'
      ],
      vendors: [
        'POST /api/vendors/register',
        'PATCH /api/vendors/:id/status',
        'GET /api/vendors/:id'
      ],
      auth: [
        'POST /api/auth/reset-password',
        'GET /api/auth/verify-reset-token/:token',
        'POST /api/auth/confirm-reset-password'
      ]
    }
  });
});

// API Routes
app.post('/api/send-otp', sendOtp);
app.post('/api/verify-otp', verifyOtp);
app.post('/api/resend-otp', resendOtp);

// Mount route modules
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     Go7 API Server Started  📧        ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Local:   http://localhost:${PORT}       ║`);
  console.log(`║  Network: http://0.0.0.0:${PORT}         ║`);
  console.log('╠════════════════════════════════════════╣');
  console.log('║  Routes Active:                       ║');
  console.log('║  ✅ OTP Authentication                ║');
  console.log('║  ✅ User Registration (+ Email)       ║');
  console.log('║  ✅ Orders (+ Email)                  ║');
  console.log('║  ✅ Deliveries (+ Email)              ║');
  console.log('║  ✅ Vendor Management (+ Email)       ║');
  console.log('║  ✅ Password Reset (+ Email)          ║');
  console.log('╠════════════════════════════════════════╣');
  console.log('║  Email System: Brevo API Active       ║');
  console.log('╚════════════════════════════════════════╝');
});

module.exports = app;
