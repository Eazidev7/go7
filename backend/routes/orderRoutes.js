const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const {
  sendOrderConfirmation,
  sendOutForDelivery,
  sendDeliveryComplete,
  sendBookDeliveryConfirmation,
} = require('../controllers/emailController');

const db = admin.firestore();

/**
 * Create a new order (food/product delivery)
 * POST /api/orders
 */
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      customerName,
      customerEmail,
      customerPhone,
      items,
      totalAmount,
      deliveryAddress,
      restaurantId,
      restaurantName,
    } = req.body;

    // Validate required fields
    if (!customerEmail || !customerName || !items || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Generate order ID
    const orderId = `GO7-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create order object
    const orderData = {
      id: orderId,
      userId: userId || null,
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      items,
      totalAmount,
      deliveryAddress: deliveryAddress || null,
      restaurantId: restaurantId || null,
      restaurantName: restaurantName || null,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save to Firestore
    await db.collection('orders').doc(orderId).set(orderData);

    console.log(`✅ Order created: ${orderId}`);

    // Send order confirmation email
    try {
      await sendOrderConfirmation({
        id: orderId,
        customerEmail,
        customerName,
        items: typeof items === 'string' ? items : items.map(i => i.name || i.title).join(', '),
        amount: totalAmount,
      });
      console.log(`📧 Order confirmation email sent to ${customerEmail}`);
    } catch (emailError) {
      console.error('❌ Failed to send order confirmation email:', emailError);
      // Don't fail the order creation if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        id: orderId,
        ...orderData,
      },
    });
  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
    });
  }
});

/**
 * Create a delivery request (package/document delivery)
 * POST /api/orders/delivery
 */
router.post('/delivery', async (req, res) => {
  try {
    const {
      userId,
      customerName,
      customerEmail,
      customerPhone,
      pickupAddress,
      destination,
      packageDetails,
      amount,
    } = req.body;

    // Validate required fields
    if (!customerEmail || !customerName || !pickupAddress || !destination || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Generate delivery ID
    const deliveryId = `GO7-DEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create delivery object
    const deliveryData = {
      id: deliveryId,
      userId: userId || null,
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      pickupAddress,
      destination,
      packageDetails: packageDetails || '',
      amount,
      status: 'pending',
      type: 'delivery',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save to Firestore
    await db.collection('orders').doc(deliveryId).set(deliveryData);

    console.log(`✅ Delivery request created: ${deliveryId}`);

    // Send delivery confirmation email
    try {
      await sendBookDeliveryConfirmation({
        id: deliveryId,
        customerEmail,
        customerName,
        pickupAddress,
        destination,
        amount,
      });
      console.log(`📧 Delivery confirmation email sent to ${customerEmail}`);
    } catch (emailError) {
      console.error('❌ Failed to send delivery confirmation email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Delivery request created successfully',
      delivery: {
        id: deliveryId,
        ...deliveryData,
      },
    });
  } catch (error) {
    console.error('❌ Create delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create delivery request',
      error: error.message,
    });
  }
});

/**
 * Update order status
 * PATCH /api/orders/:orderId/status
 */
router.patch('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, riderName, riderPhone, eta } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    // Get order document
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const orderData = orderDoc.data();

    // Update order status
    const updates = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Add rider info if provided
    if (riderName) updates.riderName = riderName;
    if (riderPhone) updates.riderPhone = riderPhone;
    if (eta) updates.eta = eta;

    await orderRef.update(updates);

    console.log(`✅ Order ${orderId} status updated to: ${status}`);

    // Send appropriate email based on status
    try {
      if (status === 'out_for_delivery' || status === 'in_transit') {
        await sendOutForDelivery({
          id: orderId,
          customerEmail: orderData.customerEmail,
          customerName: orderData.customerName,
          riderName: riderName || 'Your rider',
          riderPhone: riderPhone || '',
          eta: eta || '20-30 minutes',
        });
        console.log(`📧 Out-for-delivery email sent to ${orderData.customerEmail}`);
      } else if (status === 'delivered' || status === 'completed') {
        await sendDeliveryComplete({
          id: orderId,
          customerEmail: orderData.customerEmail,
          customerName: orderData.customerName,
          deliveredAt: new Date().toLocaleString('en-NG', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        });
        console.log(`📧 Delivery complete email sent to ${orderData.customerEmail}`);
      }
    } catch (emailError) {
      console.error('❌ Failed to send status update email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order: {
        id: orderId,
        ...orderData,
        ...updates,
      },
    });
  } catch (error) {
    console.error('❌ Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message,
    });
  }
});

/**
 * Get order by ID
 * GET /api/orders/:orderId
 */
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderDoc = await db.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      order: {
        id: orderId,
        ...orderDoc.data(),
      },
    });
  } catch (error) {
    console.error('❌ Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order',
      error: error.message,
    });
  }
});

module.exports = router;
