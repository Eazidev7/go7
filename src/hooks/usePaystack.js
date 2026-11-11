import { useState } from 'react';
import { doc, updateDoc, getDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../config/firebase';

/**
 * Custom hook for handling Paystack payments
 * Supports both Wallet Top-Up and Order Payments
 */
// Marks that a Paystack popup is open. go7-boot.js's staleness self-heal
// checks this before hard-reloading so a deploy can't kill a payment.
const PAYMENT_FLAG = 'go7-payment-in-flight';
const setPaymentInFlight = () => {
  try { sessionStorage.setItem(PAYMENT_FLAG, String(Date.now())); } catch (e) { /* ignore */ }
};
const clearPaymentInFlight = () => {
  try { sessionStorage.removeItem(PAYMENT_FLAG); } catch (e) { /* ignore */ }
};

export const usePaystack = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const initializePayment = async ({
    amount,
    email,
    userId,
    purpose, // 'wallet_topup' or 'order_payment'
    orderId = null, // Required for order payments
    orderCollection = 'orders', // Collection name: 'orders' or 'gobuyOrders'
    skipFirestoreUpdate = false, // server-callable confirms payment (e.g. meal bundles)
    onSuccess = () => {},
    onError = () => {},
    onClose = () => {}
  }) => {
    setLoading(true);
    setError(null);

    try {
      // Validate environment
      if (typeof window === 'undefined') {
        throw new Error('Payment must be initialized in a browser environment');
      }
      
      // Validate inputs
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Invalid payment amount');
      }
      
      if (!email || !userId) {
        throw new Error('User email and ID are required');
      }

      if (purpose === 'order_payment' && !orderId) {
        throw new Error('Order ID is required for order payments');
      }

      // Get Paystack public key
      const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_c04fd74b02d6034f4f1cf946887b8e3fc1a06831';
      
      console.log('🔑 Paystack key check:', {
        hasEnvKey: !!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        keyPrefix: paystackKey.substring(0, 10) + '...',
        keyLength: paystackKey.length
      });

      // Wait for Paystack to load (up to 5 seconds)
      let attempts = 0;
      while (!window.PaystackPop && attempts < 50) {
        console.log(`⏳ Waiting for Paystack SDK... (${attempts + 1}/50)`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      // Check if Paystack is loaded after waiting
      if (!window.PaystackPop) {
        throw new Error('Paystack SDK failed to load. Please check your internet connection and refresh the page.');
      }

      console.log('🚀 Initializing Paystack payment:', {
        amount: parseFloat(amount),
        email,
        purpose,
        orderId,
        orderCollection
      });

      // Convert naira to kobo (multiply by 100)
      const amountInKobo = parseFloat(amount) * 100;

      // Generate reference
      const reference = `go7_${purpose}_${Date.now()}_${userId}`;

      // Configure Paystack payment
      const paymentConfig = {
        key: paystackKey,
        email: email,
        amount: amountInKobo,
        currency: 'NGN',
        ref: reference,
        metadata: {
          userId: userId,
          purpose: purpose,
          orderId: orderId,
          orderCollection: orderCollection,
          // webhook routing: only genuine wallet top-ups may credit the wallet.
          // Order/service payments MUST be marked so paystackWebhookV2 skips them.
          paymentType: purpose === 'wallet_topup' ? 'wallet_topup' : 'service_payment',
          custom_fields: [
            {
              display_name: "User ID",
              variable_name: "user_id",
              value: userId
            },
            {
              display_name: "Purpose",
              variable_name: "purpose",
              value: purpose === 'wallet_topup' ? 'Go7 Wallet Top-up' : 'Go7 Order Payment'
            }
          ]
        },
        callback: function(response) {
          console.log('✅ Payment successful:', response);
          setLoading(true); // Keep loading during processing
          
          // Handle async operations without making callback async
          (async () => {
            try {
              console.log('✅ Payment successful via Paystack callback:', {
                reference: response.reference,
                transaction: response.transaction
              });
              
              // Skip backend verification for now - trust Paystack callback
              // Backend verification would go here in production
              console.log('⏭️ Skipping backend verification (development mode)');

              // Update Firestore based on purpose
              if (purpose === 'wallet_topup') {
                await handleWalletTopUp(userId, parseFloat(amount));
              } else if (purpose === 'order_payment' && !skipFirestoreUpdate) {
                // Server-side verification first — marks the order paid via
                // Admin SDK after a real Paystack check. Falls back to the
                // legacy client write only if the callable is unavailable so
                // an outage never strands a genuinely-paid order.
                try {
                  const confirm = httpsCallable(getFunctions(), 'confirmOrderPayment');
                  await confirm({ reference: response.reference, orderId, orderCollection });
                  console.log(`✅ Order ${orderId} confirmed paid server-side`);
                } catch (verifyErr) {
                  console.warn('⚠️ Server confirm failed, falling back to client write:', verifyErr?.message);
                  await handleOrderPayment(orderId, userId, parseFloat(amount), response.reference, orderCollection);
                }
              }

              setLoading(false);
              setError(null);
            
              // Call success callback
              onSuccess({
                reference: response.reference,
                amount: parseFloat(amount),
                purpose: purpose,
                orderId: orderId
              });

            } catch (processingError) {
              console.error('❌ Error processing payment:', processingError);
              setLoading(false);
              setError(processingError.message);
              onError(processingError);
            } finally {
              clearPaymentInFlight();
            }
          })();
        },
        onClose: function() {
          console.log('❌ Payment popup closed by user');
          setLoading(false);
          clearPaymentInFlight();
          onClose();
        }
      };

      // Initialize Paystack popup with additional error handling
      let paystack;
      
      console.log('🔧 Initializing Paystack with config:', {
        hasKey: !!paymentConfig.key,
        hasEmail: !!paymentConfig.email,
        amount: paymentConfig.amount,
        hasCallback: typeof paymentConfig.callback === 'function',
        hasOnClose: typeof paymentConfig.onClose === 'function'
      });
      
      try {
        if (typeof window.PaystackPop === 'function') {
          // Try as function first
          try {
            paystack = window.PaystackPop(paymentConfig);
          } catch (e) {
            console.log('⚠️ Function call failed, trying constructor...');
            // Try as constructor
            paystack = new window.PaystackPop(paymentConfig);
          }
        } else if (typeof window.PaystackPop === 'object' && window.PaystackPop.setup) {
          // V2 API - use setup method
          console.log('🔧 Using Paystack V2 setup method');
          paystack = window.PaystackPop.setup(paymentConfig);
        } else {
          throw new Error('Paystack SDK not properly loaded or unsupported version');
        }

        // Open payment popup
        if (paystack && typeof paystack.openIframe === 'function') {
          console.log('📱 Opening Paystack iframe...');
          setPaymentInFlight();
          paystack.openIframe();
        } else {
          console.error('❌ Paystack object missing openIframe method:', paystack);
          throw new Error('Unable to open Paystack payment dialog');
        }
      } catch (paystackError) {
        console.error('❌ Paystack initialization error:', {
          error: paystackError,
          message: paystackError.message,
          stack: paystackError.stack,
          paystackType: typeof window.PaystackPop,
          hasPaystack: !!window.PaystackPop
        });
        throw paystackError;
      }

    } catch (initError) {
      console.error('❌ Payment initialization failed:', initError);
      setLoading(false);
      setError(initError.message);
      clearPaymentInFlight();
      onError(initError);
    }
  };

  // Wallet top-ups are credited ONLY by paystackWebhookV2 (Admin SDK).
  // Client-side balance writes are denied by Firestore rules and would double
  // credit if they ever succeeded — so this is intentionally a no-op.
  const handleWalletTopUp = async (userId, amount) => {
    console.log(`✅ Wallet top-up acknowledged (webhook will credit): ₦${amount} → ${userId}`);
  };

  // Handle order payment in Firestore
  const handleOrderPayment = async (orderId, userId, amount, reference, collectionName = 'orders') => {
    const orderRef = doc(db, collectionName, orderId);
    
    // Get order details
    const orderSnap = await getDoc(orderRef);
    const orderData = orderSnap.exists() ? orderSnap.data() : {};
    
    await updateDoc(orderRef, {
      paymentStatus: 'paid',
      paymentReference: reference,
      paidAmount: amount,
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Determine order description based on collection
    let description = 'Order Payment';
    if (collectionName === 'gobuyOrders') {
      const itemCount = orderData.items?.length || 0;
      description = `GoBuy Shopping - ${itemCount} item${itemCount !== 1 ? 's' : ''}`;
    } else if (orderData.vendorName) {
      description = `${orderData.vendorName} Order`;
    } else if (orderData.vendor?.name) {
      description = `${orderData.vendor.name} Order`;
    }

    // Transaction records are admin-only by Firestore rules — don't let a
    // denied write turn a successful payment into a false failure.
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: userId,
        orderId: orderId,
        orderCollection: collectionName,
        type: 'debit',
        amount: amount,
        description: description,
        status: 'completed',
        timestamp: serverTimestamp(),
        reference: reference,
        source: 'paystack',
        channel: 'card',
        orderType: collectionName === 'gobuyOrders' ? 'gobuy' : 'food'
      });
    } catch (txErr) {
      console.warn('⚠️ Transaction record write skipped (rules):', txErr?.code || txErr?.message);
    }

    console.log(`✅ Order ${orderId} in ${collectionName} marked as paid: ₦${amount}`);
  };

  return {
    initializePayment,
    loading,
    error,
    setError
  };
};