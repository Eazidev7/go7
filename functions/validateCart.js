// 🔒 SECURITY: Server-side cart validation
// Prevents price manipulation and fake product IDs
// Deploy: firebase deploy --only functions:validateCart

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { 
  requireAuth, 
  checkRateLimit 
} = require('./securityUtils');

exports.validateCart = functions.https.onCall(async (data, context) => {
  // Require authentication & rate limiting
  const userId = requireAuth(context);
  await checkRateLimit(userId, 'validate_cart', admin.firestore(), 20, 60000);

  const { cartItems } = data;
  
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Cart items must be a non-empty array'
    );
  }

  console.log(`🔍 Validating cart for user ${context.auth.uid}`);
  
  const db = admin.firestore();
  const validatedItems = [];
  const errors = [];

  for (const item of cartItems) {
    try {
      // Validate required fields
      if (!item.productId || !item.vendorId || !item.quantity) {
        errors.push({
          productId: item.productId,
          error: 'Missing required fields'
        });
        continue;
      }

      // Sanitize quantity
      const quantity = parseInt(item.quantity);
      if (isNaN(quantity) || quantity < 1 || quantity > 100) {
        errors.push({
          productId: item.productId,
          error: 'Invalid quantity (must be 1-100)'
        });
        continue;
      }

      // Fetch real product data from Firestore
      const productRef = db.collection('vendors').doc(item.vendorId)
        .collection('products').doc(item.productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        errors.push({
          productId: item.productId,
          error: 'Product not found'
        });
        continue;
      }

      const productData = productDoc.data();

      // Check if product is available
      if (!productData.active && !productData.isActive && !productData.available) {
        errors.push({
          productId: item.productId,
          error: 'Product is no longer available'
        });
        continue;
      }

      // Get actual price from database
      const actualPrice = productData.price || productData.basePrice || 0;

      // Validate client-submitted price (allow 5% tolerance for race conditions)
      const submittedPrice = parseFloat(item.price);
      const priceDifference = Math.abs(submittedPrice - actualPrice);
      const priceVariance = (priceDifference / actualPrice) * 100;

      if (priceVariance > 5) {
        console.warn(`⚠️ Price mismatch detected:`, {
          productId: item.productId,
          submitted: submittedPrice,
          actual: actualPrice,
          variance: priceVariance.toFixed(2) + '%'
        });
        
        errors.push({
          productId: item.productId,
          error: `Price mismatch. Expected ₦${actualPrice}, got ₦${submittedPrice}`,
          actualPrice: actualPrice
        });
        continue;
      }

      // Validate addons if present
      let validatedAddons = [];
      let addonsTotal = 0;

      if (item.options?.addons) {
        const addonsList = item.options.addons.split(', ');
        
        for (const addonStr of addonsList) {
          // Parse addon name and quantity
          const match = addonStr.match(/(.+) \(x(\d+)\)/);
          if (match) {
            const [, addonName, addonQty] = match;
            
            // Fetch addon from database
            const addonsSnapshot = await productRef.collection('addons')
              .where('name', '==', addonName.trim())
              .limit(1)
              .get();

            if (!addonsSnapshot.empty) {
              const addonData = addonsSnapshot.docs[0].data();
              const addonPrice = addonData.price || 0;
              const qty = parseInt(addonQty);
              
              validatedAddons.push({
                name: addonName,
                price: addonPrice,
                quantity: qty
              });
              
              addonsTotal += addonPrice * qty;
            }
          }
        }
      }

      // Calculate correct total
      const baseTotal = actualPrice * quantity;
      const correctTotal = baseTotal + (addonsTotal * quantity);

      // Create validated item
      validatedItems.push({
        productId: item.productId,
        vendorId: item.vendorId,
        title: productData.name,
        price: actualPrice,
        quantity: quantity,
        addons: validatedAddons,
        itemTotal: correctTotal,
        imageUrl: productData.imageUrl || productData.image
      });

    } catch (error) {
      console.error(`Error validating product ${item.productId}:`, error);
      errors.push({
        productId: item.productId,
        error: 'Validation failed: ' + error.message
      });
    }
  }

  // Calculate final totals
  const subtotal = validatedItems.reduce((sum, item) => sum + item.itemTotal, 0);

  console.log(`✅ Validated ${validatedItems.length}/${cartItems.length} items`);
  
  return {
    success: true,
    validatedItems,
    errors: errors.length > 0 ? errors : null,
    subtotal,
    itemCount: validatedItems.length,
    originalItemCount: cartItems.length,
    warnings: errors.length > 0 
      ? `${errors.length} item(s) could not be validated` 
      : null
  };
});
