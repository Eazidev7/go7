const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * Cloud Function: createProduct
 * Validates vendor ownership and sanitizes product data before creation
 */
exports.createProduct = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { vendorId, name, desc, productType, basePrice, category, imageUrl, addons, variants } = data;
  const userId = context.auth.uid;

  try {
    // Validate vendor ownership
    const vendorDoc = await db.collection('vendors').doc(vendorId).get();
    if (!vendorDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Vendor not found');
    }

    const vendorData = vendorDoc.data();
    if (vendorData.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'User is not the owner of this vendor');
    }

    // Validate required fields
    if (!name || !desc || !productType || basePrice === undefined || !category) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    // Validate product type
    if (!['food', 'market'].includes(productType)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid product type');
    }

    // Validate price
    if (typeof basePrice !== 'number' || basePrice < 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid price');
    }

    // Sanitize and validate image URL
    let sanitizedImageUrl = null;
    if (imageUrl) {
      if (typeof imageUrl === 'string' && imageUrl.startsWith('https://')) {
        sanitizedImageUrl = imageUrl;
      }
    }

    // Validate and sanitize addons for food products
    let sanitizedAddons = [];
    if (productType === 'food' && addons && Array.isArray(addons)) {
      sanitizedAddons = addons.map(addon => ({
        id: addon.id || admin.firestore.collection('_').doc().id,
        name: String(addon.name).substring(0, 100),
        price: Math.max(0, Number(addon.price) || 0),
        imageUrl: addon.imageUrl && addon.imageUrl.startsWith('https://') ? addon.imageUrl : null,
        description: addon.description ? String(addon.description).substring(0, 500) : null,
        category: addon.category || null
      }));
    }

    // Validate and sanitize variants for market products
    let sanitizedVariants = [];
    if (productType === 'market' && variants && Array.isArray(variants)) {
      sanitizedVariants = variants.map(variant => ({
        id: variant.id || admin.firestore.collection('_').doc().id,
        name: String(variant.name).substring(0, 100),
        price: Math.max(0, Number(variant.price) || 0),
        imageUrl: variant.imageUrl && variant.imageUrl.startsWith('https://') ? variant.imageUrl : null,
        stock: variant.stock ? Math.max(0, Number(variant.stock)) : null,
        description: variant.description ? String(variant.description).substring(0, 500) : null
      }));
    }

    // Create product document
    const productData = {
      vendorId,
      name: String(name).substring(0, 200),
      desc: String(desc).substring(0, 1000),
      productType,
      basePrice,
      imageUrl: sanitizedImageUrl,
      category: String(category).substring(0, 100),
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Add type-specific fields
    if (productType === 'food') {
      productData.addons = sanitizedAddons;
      if (data.deliveryTimeMinutes) {
        productData.deliveryTimeMinutes = Math.max(0, Number(data.deliveryTimeMinutes));
      }
    } else if (productType === 'market') {
      productData.variants = sanitizedVariants;
    }

    // Create the product
    const productRef = await db.collection('products').add(productData);

    // Update vendor product count
    await db.collection('vendors').doc(vendorId).update({
      totalProducts: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { productId: productRef.id };
  } catch (error) {
    console.error('Error creating product:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create product');
  }
});

/**
 * Cloud Function: getProductsForExplore  
 * Get products for the explore page with location and category filtering
 */
exports.getProductsForExplore = functions.https.onCall(async (data, context) => {
  const { category, location, page = 0, limit = 20 } = data;

  try {
    let query = db.collection('products').where('active', '==', true);

    // Filter by category if provided
    if (category && category !== 'all') {
      query = query.where('category', '==', category);
    }

    // For location-based filtering, we would need to:
    // 1. Get vendors within radius using GeoFirestore or similar
    // 2. Filter products by those vendor IDs
    // For now, we'll just order by creation date

    query = query.orderBy('createdAt', 'desc').limit(limit).offset(page * limit);

    const snapshot = await query.get();
    const products = [];

    for (const doc of snapshot.docs) {
      const productData = { id: doc.id, ...doc.data() };
      
      // Get vendor information
      const vendorDoc = await db.collection('vendors').doc(productData.vendorId).get();
      if (vendorDoc.exists) {
        productData.vendor = {
          id: vendorDoc.id,
          name: vendorDoc.data().name,
          rating: vendorDoc.data().rating || 0,
          imageUrl: vendorDoc.data().imageUrl
        };
      }

      products.push(productData);
    }

    return { products, hasMore: products.length === limit };
  } catch (error) {
    console.error('Error getting products for explore:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get products');
  }
});

/**
 * Cloud Function: calculatePrice
 * Calculate final price server-side to prevent manipulation
 */
exports.calculatePrice = functions.https.onCall(async (data, context) => {
  const { productId, variantId, selectedAddons, quantity } = data;

  try {
    // Get product data
    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Product not found');
    }

    const product = productDoc.data();
    let basePrice = product.price;

    // Calculate variant price for market products
    if (product.productType === 'market' && variantId && product.variants) {
      const variant = product.variants.find(v => v.id === variantId);
      if (variant) {
        basePrice = variant.price;
      }
    }

    // Calculate addons price for food products
    let addonsPrice = 0;
    if (product.productType === 'food' && selectedAddons && product.addons) {
      for (const selectedAddon of selectedAddons) {
        const addon = product.addons.find(a => a.id === selectedAddon.id);
        if (addon) {
          addonsPrice += addon.price * (selectedAddon.qty || 1);
        }
      }
    }

    const itemPrice = basePrice + addonsPrice;
    const totalPrice = itemPrice * (quantity || 1);

    return {
      basePrice,
      addonsPrice,
      itemPrice,
      totalPrice,
      quantity: quantity || 1
    };
  } catch (error) {
    console.error('Error calculating price:', error);
    throw new functions.https.HttpsError('internal', 'Failed to calculate price');
  }
});

/**
 * Cloud Function: placeOrder
 * Create order and handle inventory management
 */
exports.placeOrder = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { 
    vendorId, 
    items, 
    deliveryAddress, 
    customerPhone, 
    customerName,
    paymentMethod,
    specialInstructions 
  } = data;
  const userId = context.auth.uid;

  try {
    // Validate vendor exists
    const vendorDoc = await db.collection('vendors').doc(vendorId).get();
    if (!vendorDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Vendor not found');
    }

    const vendor = vendorDoc.data();
    
    // Calculate prices server-side
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const priceResult = await exports.calculatePrice._handler({
        productId: item.productId,
        variantId: item.variantId,
        selectedAddons: item.selectedAddons,
        quantity: item.qty
      }, context);

      // Check stock for market products
      if (item.variantId) {
        const productDoc = await db.collection('products').doc(item.productId).get();
        const product = productDoc.data();
        
        if (product.productType === 'market' && product.variants) {
          const variant = product.variants.find(v => v.id === item.variantId);
          if (variant && variant.stock !== undefined && variant.stock < item.qty) {
            throw new functions.https.HttpsError('failed-precondition', 
              `Insufficient stock for ${item.name}. Available: ${variant.stock}, Requested: ${item.qty}`);
          }
        }
      }

      validatedItems.push({
        ...item,
        price: priceResult.itemPrice
      });

      subtotal += priceResult.totalPrice;
    }

    // Calculate fees
    const deliveryFee = 500; // Static for now, could be dynamic based on distance
    const serviceFee = Math.ceil(subtotal * 0.05); // 5% service fee
    const total = subtotal + deliveryFee + serviceFee;

    // Create order
    const orderData = {
      userId,
      vendorId,
      vendorName: vendor.name,
      items: validatedItems,
      subtotal,
      deliveryFee,
      serviceFee,
      total,
      status: 'pending',
      deliveryAddress,
      customerPhone,
      customerName,
      paymentMethod,
      paymentStatus: 'pending',
      specialInstructions: specialInstructions || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      trackingEvents: [{
        status: 'pending',
        message: 'Order placed successfully',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        actorRole: 'customer'
      }]
    };

    // Use transaction for order creation and stock updates
    const result = await db.runTransaction(async (transaction) => {
      const orderRef = db.collection('orders').doc();
      
      // Create order
      transaction.set(orderRef, orderData);

      // Update stock for market products
      for (const item of validatedItems) {
        if (item.variantId) {
          const productRef = db.collection('products').doc(item.productId);
          const productDoc = await transaction.get(productRef);
          const product = productDoc.data();
          
          if (product.productType === 'market' && product.variants) {
            const updatedVariants = product.variants.map(variant => {
              if (variant.id === item.variantId && variant.stock !== undefined) {
                return { ...variant, stock: variant.stock - item.qty };
              }
              return variant;
            });
            
            transaction.update(productRef, { variants: updatedVariants });
          }
        }
      }

      // Update vendor balance (add to pending)
      const vendorEarnings = total * 0.85; // Vendor gets 85%, platform keeps 15%
      const balanceQuery = db.collection('vendorBalances').where('vendorId', '==', vendorId);
      const balanceSnapshot = await balanceQuery.get();
      
      if (!balanceSnapshot.empty) {
        const balanceRef = balanceSnapshot.docs[0].ref;
        transaction.update(balanceRef, {
          pendingBalance: admin.firestore.FieldValue.increment(vendorEarnings),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      return orderRef.id;
    });

    return { orderId: result };
  } catch (error) {
    console.error('Error placing order:', error);
    throw new functions.https.HttpsError('internal', 'Failed to place order');
  }
});

/**
 * Scheduled function to process automatic payouts
 */
exports.autoPayoutWorker = functions.pubsub.schedule('every day 02:00').onRun(async (context) => {
  console.log('Starting auto payout worker...');
  
  try {
    // Get all vendor balances eligible for payout
    const balancesSnapshot = await db.collection('vendorBalances')
      .where('availableBalance', '>=', 10000) // Minimum ₦10,000
      .get();

    const payoutPromises = [];

    for (const balanceDoc of balancesSnapshot.docs) {
      const balance = balanceDoc.data();
      
      // Check payout schedule
      const shouldPayout = await shouldProcessPayout(balance);
      
      if (shouldPayout) {
        payoutPromises.push(processPayout(balance.vendorId, balance.availableBalance));
      }
    }

    await Promise.all(payoutPromises);
    
    console.log(`Processed ${payoutPromises.length} payouts`);
  } catch (error) {
    console.error('Error in auto payout worker:', error);
  }
});

/**
 * Check if vendor should receive payout based on schedule
 */
async function shouldProcessPayout(balance) {
  const now = new Date();
  const lastPayout = balance.lastPayoutAt ? balance.lastPayoutAt.toDate() : new Date(0);
  
  switch (balance.payoutSchedule) {
    case 'weekly': {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return lastPayout < weekAgo;
    }
    case 'monthly': {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return lastPayout < monthAgo;
    }
    
    case 'on-demand':
      return false; // Manual payouts only
    
    default:
      return false;
  }
}

/**
 * Process payout for a vendor
 */
async function processPayout(vendorId, amount) {
  try {
    // Get vendor payout details
    const vendorDoc = await db.collection('vendors').doc(vendorId).get();
    const vendor = vendorDoc.data();
    
    if (!vendor.payoutAccount) {
      console.log(`Vendor ${vendorId} has no payout account configured`);
      return;
    }

    // Here you would integrate with payment provider (Paystack, Flutterwave, etc.)
    // For now, we'll simulate the payout
    
    const payout = {
      vendorId,
      amount,
      currency: 'NGN',
      payoutAccount: vendor.payoutAccount,
      status: 'processing',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      reference: `payout_${vendorId}_${Date.now()}`
    };

    // Create payout record
    await db.collection('payouts').add(payout);

    // Update vendor balance
    const balanceQuery = db.collection('vendorBalances').where('vendorId', '==', vendorId);
    const balanceSnapshot = await balanceQuery.get();
    
    if (!balanceSnapshot.empty) {
      const balanceRef = balanceSnapshot.docs[0].ref;
      await balanceRef.update({
        availableBalance: 0,
        lastPayoutAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log(`Payout processed for vendor ${vendorId}: ₦${amount}`);
  } catch (error) {
    console.error(`Error processing payout for vendor ${vendorId}:`, error);
  }
}