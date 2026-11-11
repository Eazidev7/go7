// 🔐 PAYSTACK CONFIGURATION
// Environment variables for Paystack integration

export const paystackConfig = {
  publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_your_public_key',
  secretKey: import.meta.env.VITE_PAYSTACK_SECRET_KEY || 'sk_test_your_secret_key',
  callbackUrl: import.meta.env.VITE_PAYSTACK_CALLBACK_URL || 'http://localhost:3000/payment/callback',
  webhookUrl: import.meta.env.VITE_PAYSTACK_WEBHOOK_URL || 'http://localhost:3000/api/paystack/webhook',
};

export const paystackEndpoints = {
  initialize: 'https://api.paystack.co/transaction/initialize',
  verify: 'https://api.paystack.co/transaction/verify',
};

// Order status flow
export const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  PROCESSING: 'processing',
  READY: 'ready',
  PICKED_UP: 'picked_up',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

// Payment status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

// Order expiry time (30 minutes for pending payment)
export const ORDER_EXPIRY_MINUTES = 30;
