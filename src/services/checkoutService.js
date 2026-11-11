/**
 * 💳 CHECKOUT SERVICE
 * Handles order creation and payment initialization
 * SECURITY: Server-side price validation, no client tampering
 */

import { collection, doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { paystackConfig, paystackEndpoints, ORDER_STATUS, PAYMENT_STATUS, ORDER_EXPIRY_MINUTES } from '../config/paystackConfig';

class CheckoutService {
  /**
   * Calculate total order price server-side
   * Prevents client tampering
   */
  async calculateOrderTotal(cartItems, vendorId) {
    let subtotal = 0;
    const itemsWithPrices = [];

    for (const item of cartItems) {
      // Fetch fresh product data from Firestore
      const productRef = doc(db, 'vendors', vendorId, 'products', item.productId);
      const productDoc = await getDoc(productRef);

      if (!productDoc.exists()) {
        throw new Error(`Product ${item.productId} not found`);
      }

      const productData = productDoc.data();
      const productPrice = Number(productData.price);

      if (!productPrice || productPrice <= 0) {
        throw new Error(`Invalid price for product: ${productData.name}`);
      }

      // Calculate item total
      let itemTotal = productPrice * item.quantity;

      // Calculate add-ons total (server-side validation)
      let addonsTotal = 0;
      const validatedAddons = [];

      if (item.addons && item.addons.length > 0) {
        for (const addon of item.addons) {
          // Fetch addon price from Firestore
          const addonRef = doc(db, 'vendors', vendorId, 'products', item.productId, 'addons', addon.id);
          const addonDoc = await getDoc(addonRef);

          if (!addonDoc.exists()) {
            console.warn(`Addon ${addon.id} not found, skipping`);
            continue;
          }

          const addonData = addonDoc.data();
          const addonPrice = Number(addonData.price || addonData.addonPrice);

          if (!addonPrice || addonPrice <= 0) {
            throw new Error(`Invalid price for addon: ${addonData.name}`);
          }

          const addonItemTotal = addonPrice * item.quantity;
          addonsTotal += addonItemTotal;

          validatedAddons.push({
            id: addon.id,
            name: addonData.name || addonData.title,
            price: addonPrice,
            quantity: item.quantity,
            total: addonItemTotal,
          });
        }
      }

      itemTotal += addonsTotal;
      subtotal += itemTotal;

      itemsWithPrices.push({
        productId: item.productId,
        productName: productData.name,
        productPrice: productPrice,
        quantity: item.quantity,
        addons: validatedAddons,
        itemTotal: itemTotal,
      });
    }

    return {
      items: itemsWithPrices,
      subtotal: subtotal,
    };
  }

  /**
   * Create order in Firestore
   * orderStatus: "pending_payment"
   * paymentStatus: "pending"
   */
  async createOrder({ userId, vendorId, cartItems, deliveryAddress, deliveryFee, deliveryInstructions }) {
    if (!userId) {
      throw new Error('User must be logged in to place order');
    }

    if (!vendorId) {
      throw new Error('Vendor ID is required');
    }

    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    if (!deliveryAddress || !deliveryAddress.coordinates) {
      throw new Error('Delivery address is required');
    }

    // Calculate server-side totals
    const { items, subtotal } = await this.calculateOrderTotal(cartItems, vendorId);

    const deliveryFeeCost = Number(deliveryFee) || 0;
    const totalAmount = subtotal + deliveryFeeCost;

    // Generate order ID
    const orderRef = doc(collection(db, 'orders'));
    const orderId = orderRef.id;

    // Calculate expiry time (30 minutes from now)
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + ORDER_EXPIRY_MINUTES);

    // Create order document
    const orderData = {
      orderId: orderId,
      userId: userId,
      vendorId: vendorId,
      
      // Items with validated prices
      items: items,
      
      // Pricing (server-calculated)
      subtotal: subtotal,
      deliveryFee: deliveryFeeCost,
      totalAmount: totalAmount,
      
      // Delivery info
      deliveryAddress: {
        fullAddress: deliveryAddress.fullAddress,
        coordinates: deliveryAddress.coordinates,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
      },
      deliveryInstructions: deliveryInstructions || '',
      
      // Order status
      orderStatus: ORDER_STATUS.PENDING_PAYMENT,
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentMethod: 'paystack',
      
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiryTime),
      
      // Payment tracking (will be set by webhook)
      paystackReference: null,
      paymentVerifiedAt: null,
    };

    // Save to Firestore
    await setDoc(orderRef, orderData);

    console.log('✅ Order created:', orderId);
    return {
      orderId: orderId,
      totalAmount: totalAmount,
      orderData: orderData,
    };
  }

  /**
   * Initialize Paystack payment
   * Returns authorization URL for redirect
   */
  async initializePayment({ orderId, email, amount }) {
    try {
      const response = await fetch(paystackEndpoints.initialize, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackConfig.publicKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          amount: Math.round(amount * 100), // Paystack uses kobo (₦1 = 100 kobo)
          reference: orderId, // Use orderId as payment reference
          callback_url: `${paystackConfig.callbackUrl}?orderId=${orderId}`,
          metadata: {
            orderId: orderId,
            custom_fields: [
              {
                display_name: 'Order ID',
                variable_name: 'order_id',
                value: orderId,
              },
            ],
          },
        }),
      });

      const data = await response.json();

      if (!data.status) {
        throw new Error(data.message || 'Payment initialization failed');
      }

      console.log('✅ Payment initialized:', data.data.reference);
      return {
        authorizationUrl: data.data.authorization_url,
        reference: data.data.reference,
        accessCode: data.data.access_code,
      };
    } catch (error) {
      console.error('❌ Payment initialization error:', error);
      throw new Error(`Failed to initialize payment: ${error.message}`);
    }
  }

  /**
   * Complete checkout flow
   * 1. Create order
   * 2. Initialize payment
   * 3. Return payment URL
   */
  async checkout({ userId, email, vendorId, cartItems, deliveryAddress, deliveryFee, deliveryInstructions }) {
    try {
      // Step 1: Create order
      const { orderId, totalAmount } = await this.createOrder({
        userId,
        vendorId,
        cartItems,
        deliveryAddress,
        deliveryFee,
        deliveryInstructions,
      });

      // Step 2: Initialize payment
      const paymentData = await this.initializePayment({
        orderId,
        email,
        amount: totalAmount,
      });

      // Step 3: Update order with payment reference
      const orderRef = doc(db, 'orders', orderId);
      await setDoc(orderRef, {
        paystackReference: paymentData.reference,
        paystackAccessCode: paymentData.accessCode,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      return {
        orderId: orderId,
        totalAmount: totalAmount,
        paymentUrl: paymentData.authorizationUrl,
        reference: paymentData.reference,
      };
    } catch (error) {
      console.error('❌ Checkout error:', error);
      throw error;
    }
  }

  /**
   * Verify payment status
   * Called from callback page
   */
  async verifyPayment(reference) {
    try {
      const response = await fetch(`${paystackEndpoints.verify}/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackConfig.secretKey}`,
        },
      });

      const data = await response.json();

      if (!data.status) {
        throw new Error('Payment verification failed');
      }

      return {
        status: data.data.status,
        amount: data.data.amount / 100, // Convert from kobo to naira
        reference: data.data.reference,
        paidAt: data.data.paid_at,
        metadata: data.data.metadata,
      };
    } catch (error) {
      console.error('❌ Payment verification error:', error);
      throw error;
    }
  }
}

export default new CheckoutService();
