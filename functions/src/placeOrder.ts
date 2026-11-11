import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// TypeScript Interfaces
interface CartItem {
  productId: string;
  productName: string;
  productType: 'food' | 'market';
  basePrice: number;
  selectedVariant?: {
    id: string;
    name: string;
    price: number;
    sku?: string;
  };
  selectedAddons: Array<{
    id: string;
    name: string;
    price: number;
    category?: string;
  }>;
  quantity: number;
  vendorId: string;
  vendorName: string;
  notes?: string;
}

interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  instructions?: string;
}

interface PlaceOrderRequest {
  items: CartItem[];
  deliveryAddress: DeliveryAddress;
  paymentMethod: 'card' | 'cash' | 'mobile-money' | 'crypto';
  paymentReference?: string;
  deliveryType: 'standard' | 'express' | 'pickup';
  promoCode?: string;
  userDetails: {
    name: string;
    email: string;
    phone: string;
  };
}

interface PlaceOrderResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  total?: number;
  estimatedDelivery?: string;
  message: string;
  errors?: string[];
}

interface VendorOrder {
  vendorName: string;
  vendorPhone: string;
  status: string;
  items: any[];
  subtotal: number;
  deliveryFee: number;
  vendorTotal: number;
  vendorEarnings: number;
  platformFee: number;
  estimatedPreparation: number;
  preparationStatus: string;
}

// Validation helpers
function validateCoordinates(raw: any, label: string): { lat: number; lng: number } {
  const lat = Number(raw && (raw.lat !== undefined ? raw.lat : raw.latitude));
  const lng = Number(raw && (raw.lng !== undefined ? raw.lng : raw.longitude));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`${label} coordinates must be finite numbers`);
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error(`${label} coordinates are out of range`);
  }
  const isZeroPlaceholder = Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001;
  if (isZeroPlaceholder) {
    throw new Error(`${label} is a 0,0 placeholder — not a real location`);
  }
  return { lat, lng };
}

function validateOrderRequest(data: PlaceOrderRequest): string[] {
  const errors: string[] = [];
  
  if (!data.items || data.items.length === 0) {
    errors.push('Order must contain at least one item');
  }
  
  if (!data.deliveryAddress) {
    errors.push('Delivery address is required');
  } else {
    if (!data.deliveryAddress.street?.trim()) errors.push('Street address is required');
    if (!data.deliveryAddress.city?.trim()) errors.push('City is required');
    if (!data.deliveryAddress.state?.trim()) errors.push('State is required');
    if (!data.deliveryAddress.country?.trim()) errors.push('Country is required');
    
    if (data.deliveryAddress.coordinates) {
      try {
        validateCoordinates(data.deliveryAddress.coordinates, 'delivery address');
      } catch (err: any) {
        errors.push(err.message || 'Invalid delivery coordinates');
      }
    }
  }
  
  if (!data.paymentMethod || !['card', 'cash', 'mobile-money', 'crypto'].includes(data.paymentMethod)) {
    errors.push('Valid payment method is required');
  }
  
  if (data.paymentMethod !== 'cash' && !data.paymentReference?.trim()) {
    errors.push('Payment reference is required for non-cash payments');
  }
  
  if (!data.deliveryType || !['standard', 'express', 'pickup'].includes(data.deliveryType)) {
    errors.push('Valid delivery type is required');
  }
  
  if (!data.userDetails) {
    errors.push('User details are required');
  } else {
    if (!data.userDetails.name?.trim()) errors.push('User name is required');
    if (!data.userDetails.email?.trim()) errors.push('User email is required');
    if (!data.userDetails.phone?.trim()) errors.push('User phone is required');
  }
  
  return errors;
}

function validateCartItems(items: CartItem[]): string[] {
  const errors: string[] = [];
  
  items.forEach((item, index) => {
    if (!item.productId?.trim()) {
      errors.push(`Item ${index + 1}: Product ID is required`);
    }
    if (!item.vendorId?.trim()) {
      errors.push(`Item ${index + 1}: Vendor ID is required`);
    }
    if (!item.quantity || item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
    }
    if (item.quantity > 20) {
      errors.push(`Item ${index + 1}: Maximum quantity is 20`);
    }
    if (!item.productType || !['food', 'market'].includes(item.productType)) {
      errors.push(`Item ${index + 1}: Invalid product type`);
    }
  });
  
  return errors;
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `GO7-${timestamp.slice(-6)}${random}`;
}

function calculateDeliveryTime(vendorOrders: Record<string, VendorOrder>, deliveryType: string): string {
  const maxPreparationTime = Math.max(
    ...Object.values(vendorOrders).map(vo => vo.estimatedPreparation)
  );
  
  const deliveryTime = deliveryType === 'express' ? 15 : 30;
  const totalTime = maxPreparationTime + deliveryTime;
  
  return `${totalTime}-${totalTime + 15} minutes`;
}

const PLATFORM_FEE_RATE_FOOD = 0.1;
const VENDOR_COMMISSION_RATE = 0.08;

function roundNaira(amount: number): number {
  return Math.round(Math.max(0, Number(amount) || 0));
}

// Main Cloud Function
export const placeOrder = functions.https.onCall(async (
  data: PlaceOrderRequest,
  context: functions.https.CallableContext
): Promise<PlaceOrderResponse> => {
  try {
    // 1. Verify authentication
    if (!context.auth) {
      return {
        success: false,
        message: 'Authentication required to place orders'
      };
    }

    const userId = context.auth.uid;
    
    // 2. Validate request data
    const validationErrors = [
      ...validateOrderRequest(data),
      ...validateCartItems(data.items)
    ];
    
    if (validationErrors.length > 0) {
      return {
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      };
    }

    // 3. Process order in transaction for atomicity
    const result = await db.runTransaction(async (transaction) => {
      const vendorOrders: Record<string, VendorOrder> = {};
      let subtotal = 0;
      let totalDeliveryFee = 0;
      const processedItems: any[] = [];

      // 4. Validate each item and calculate server-side pricing
      for (const item of data.items) {
        // Get product data
        const productRef = db.collection('products').doc(item.productId);
        const productDoc = await transaction.get(productRef);
        
        if (!productDoc.exists) {
          throw new Error(`Product ${item.productId} not found`);
        }

        const product = productDoc.data()!;
        
        // Verify product availability
        if (!product.isAvailable) {
          throw new Error(`Product "${product.name}" is currently unavailable`);
        }

        // Verify vendor match
        if (product.vendorId !== item.vendorId) {
          throw new Error(`Invalid vendor for product "${product.name}"`);
        }

        // Calculate server-side price (anti-tampering)
        let itemPrice = product.price;
        let selectedVariant = null;

        // Handle market product variants
        if (product.productType === 'market') {
          if (!item.selectedVariant) {
            throw new Error(`Variant selection required for "${product.name}"`);
          }
          
          const variant = product.variants?.find((v: any) => v.id === item.selectedVariant!.id);
          if (!variant) {
            throw new Error(`Selected variant not found for "${product.name}"`);
          }
          
          if (!variant.isAvailable) {
            throw new Error(`Selected variant "${variant.name}" is not available`);
          }
          
          // Check and decrement stock atomically
          if (variant.stock < item.quantity) {
            throw new Error(`Insufficient stock for "${variant.name}". Available: ${variant.stock}`);
          }
          
          itemPrice = variant.price;
          selectedVariant = {
            id: variant.id,
            name: variant.name,
            price: variant.price,
            sku: variant.sku
          };
          
          // Update stock
          const newStock = variant.stock - item.quantity;
          const updatedVariants = product.variants.map((v: any) => 
            v.id === variant.id ? { ...v, stock: newStock } : v
          );
          
          transaction.update(productRef, { 
            variants: updatedVariants,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        // Handle food product add-ons
        let addonsPrice = 0;
        const validatedAddons: any[] = [];
        
        if (product.productType === 'food' && item.selectedAddons.length > 0) {
          for (const selectedAddon of item.selectedAddons) {
            const addon = product.addons?.find((a: any) => a.id === selectedAddon.id);
            if (!addon) {
              throw new Error(`Selected add-on not found for "${product.name}"`);
            }
            if (!addon.isAvailable) {
              throw new Error(`Add-on "${addon.name}" is not available`);
            }
            
            // Use server-side addon price (prevent tampering)
            addonsPrice += addon.price;
            validatedAddons.push({
              id: addon.id,
              name: addon.name,
              price: addon.price,
              category: addon.category
            });
          }
        }

        const itemTotal = (itemPrice + addonsPrice) * item.quantity;
        subtotal += itemTotal;

        // Update product stats
        transaction.update(productRef, {
          totalOrders: admin.firestore.FieldValue.increment(item.quantity),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Group items by vendor
        if (!vendorOrders[item.vendorId]) {
          // Get vendor data
          const vendorRef = db.collection('vendors').doc(item.vendorId);
          const vendorDoc = await transaction.get(vendorRef);
          
          if (!vendorDoc.exists) {
            throw new Error(`Vendor ${item.vendorId} not found`);
          }

          const vendor = vendorDoc.data()!;
          
          if (!vendor.isActive) {
            throw new Error(`Vendor "${vendor.businessName}" is currently inactive`);
          }

          const vendorDeliveryFee = vendor.deliveryFee || 500;
          totalDeliveryFee += vendorDeliveryFee;

          vendorOrders[item.vendorId] = {
            vendorName: vendor.businessName,
            vendorPhone: vendor.phone || '',
            status: 'confirmed',
            items: [],
            subtotal: 0,
            deliveryFee: vendorDeliveryFee,
            vendorTotal: 0,
            vendorEarnings: 0,
            platformFee: 0,
            estimatedPreparation: product.productType === 'food' ? 
              (product.preparationTime || 15) : 5,
            preparationStatus: 'pending'
          };
        }

        // Add processed item to vendor order
        const processedItem = {
          productId: item.productId,
          productName: product.name,
          productImage: product.imageUrl,
          productType: product.productType,
          basePrice: itemPrice,
          selectedVariant,
          selectedAddons: validatedAddons,
          quantity: item.quantity,
          itemTotal,
          notes: item.notes || '',
          addedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        vendorOrders[item.vendorId].items.push(processedItem);
        vendorOrders[item.vendorId].subtotal += itemTotal;
        processedItems.push(processedItem);
      }

      // 5. Calculate vendor earnings and platform fees
      let totalVendorEarnings = 0;
      let totalPlatformFee = 0;

      for (const vendorId in vendorOrders) {
        const vendorOrder = vendorOrders[vendorId];
        vendorOrder.vendorTotal = vendorOrder.subtotal + vendorOrder.deliveryFee;
        
        // Vendor commission on food subtotal (8% to Go7, 92% to vendor)
        vendorOrder.vendorEarnings = roundNaira(vendorOrder.subtotal * (1 - VENDOR_COMMISSION_RATE));
        vendorOrder.platformFee = vendorOrder.subtotal - vendorOrder.vendorEarnings;
        
        totalVendorEarnings += vendorOrder.vendorEarnings;
        totalPlatformFee += vendorOrder.platformFee;

        // Update vendor balance (add to pending)
        const vendorRef = db.collection('vendors').doc(vendorId);
        transaction.update(vendorRef, {
          'balance.pending': admin.firestore.FieldValue.increment(vendorOrder.vendorEarnings),
          'balance.total': admin.firestore.FieldValue.increment(vendorOrder.vendorEarnings),
          totalOrders: admin.firestore.FieldValue.increment(vendorOrder.items.length),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // 6. Calculate order totals — customer platform fee is 10% of food subtotal
      const customerPlatformFee = roundNaira(subtotal * PLATFORM_FEE_RATE_FOOD);
      const grandTotal = subtotal + totalDeliveryFee + customerPlatformFee;
      const orderNumber = generateOrderNumber();

      // 7. Create order document
      const orderData = {
        orderNumber,
        userId,
        orderType: 'food',
        userDetails: {
          name: data.userDetails.name.trim(),
          email: data.userDetails.email.trim(),
          phone: data.userDetails.phone.trim()
        },
        status: 'confirmed',
        paymentStatus: data.paymentMethod === 'cash' ? 'pending' : 'paid',
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference || null,
        deliveryAddress: data.deliveryAddress,
        deliveryType: data.deliveryType,
        estimatedDeliveryTime: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + (data.deliveryType === 'express' ? 45 : 75) * 60 * 1000)
        ),
        vendorOrders,
        itemTotal: subtotal,
        deliveryFee: totalDeliveryFee,
        platformFee: customerPlatformFee,
        grandTotal,
        feeBreakdown: {
          itemTotal: subtotal,
          deliveryFee: totalDeliveryFee,
          platformFee: customerPlatformFee,
          platformFeeRate: PLATFORM_FEE_RATE_FOOD,
          platformFeeBasis: 'food_subtotal',
          grandTotal,
          pricingVersion: 1,
          calculatedAt: new Date().toISOString(),
        },
        totals: {
          subtotal,
          itemTotal: subtotal,
          totalDeliveryFee,
          deliveryFee: totalDeliveryFee,
          platformFee: customerPlatformFee,
          serviceFee: customerPlatformFee,
          total: grandTotal,
          grandTotal,
          totalVendorEarnings,
          totalVendorCommission: totalPlatformFee,
          vendorCommissions: totalPlatformFee,
        },
        delivery: {
          riderId: null,
          riderName: null,
          riderPhone: null,
          riderRating: null,
          vehicleType: null,
          plateNumber: null,
          pickupTime: null,
          deliveryTime: null,
          trackingEvents: [
            {
              status: 'order_placed',
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              message: 'Order placed successfully'
            },
            {
              status: 'payment_confirmed',
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              message: data.paymentMethod === 'cash' ? 'Cash payment pending' : 'Payment confirmed'
            },
            {
              status: 'vendor_confirmed',
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              message: 'Vendors confirmed your order'
            }
          ]
        },
        platformVersion: '2.1.0',
        orderSource: 'mobile_app',
        promoCode: data.promoCode || null,
        discount: 0, // TODO: Implement promo code logic
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const orderRef = db.collection('orders').doc();
      transaction.set(orderRef, orderData);

      // 8. Clear user's cart
      const cartRef = db.collection('carts').doc(userId);
      transaction.delete(cartRef);

      return {
        orderId: orderRef.id,
        orderNumber,
        total: grandTotal,
        estimatedDelivery: calculateDeliveryTime(vendorOrders, data.deliveryType)
      };
    });

    // 9. Log successful order
    functions.logger.info('Order placed successfully', {
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      userId,
      total: result.total,
      itemCount: data.items.length,
      vendorCount: [...new Set(data.items.map(item => item.vendorId))].length
    });

    return {
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      total: result.total,
      estimatedDelivery: result.estimatedDelivery,
      message: 'Order placed successfully'
    };

  } catch (error) {
    functions.logger.error('Error placing order:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: context.auth?.uid,
      itemCount: data.items?.length
    });
    
    return {
      success: false,
      message: error instanceof Error ? error.message || 'Failed to place order. Please try again.' : String(error) || 'Failed to place order. Please try again.'
    };
  }
});

// Helper function to update order status
export const updateOrderStatus = functions.https.onCall(async (
  data: { 
    orderId: string; 
    newStatus: string; 
    vendorId?: string;
    message?: string;
  },
  context: functions.https.CallableContext
) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(data.newStatus)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid order status');
    }

    const orderRef = db.collection('orders').doc(data.orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Order not found');
    }

    const order = orderDoc.data()!;
    
    // Check permissions
    const isCustomer = order.userId === context.auth.uid;
    const isVendor = data.vendorId && order.vendorOrders[data.vendorId];
    
    if (!isCustomer && !isVendor) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized to update this order');
    }

    // Update order status
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (data.vendorId && isVendor) {
      // Update vendor-specific status
      updateData[`vendorOrders.${data.vendorId}.status`] = data.newStatus;
      updateData[`vendorOrders.${data.vendorId}.preparationStatus`] = 
        data.newStatus === 'preparing' ? 'in_progress' : 
        data.newStatus === 'ready' ? 'completed' : 'pending';
    } else {
      // Update overall order status
      updateData.status = data.newStatus;
    }

    // Add tracking event
    const trackingEvent = {
      status: data.newStatus,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message: data.message || `Order ${data.newStatus}`,
      updatedBy: context.auth.uid
    };

    updateData['delivery.trackingEvents'] = admin.firestore.FieldValue.arrayUnion(trackingEvent);

    await orderRef.update(updateData);

    functions.logger.info('Order status updated', {
      orderId: data.orderId,
      newStatus: data.newStatus,
      vendorId: data.vendorId,
      updatedBy: context.auth.uid
    });

    return {
      success: true,
      message: 'Order status updated successfully'
    };

  } catch (error) {
    functions.logger.error('Error updating order status:', error);
    throw error;
  }
});

// Get order details with real-time pricing validation
export const getOrderDetails = functions.https.onCall(async (
  data: { orderId: string },
  context: functions.https.CallableContext
) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const orderRef = db.collection('orders').doc(data.orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Order not found');
    }

    const order = orderDoc.data()!;
    
    // Check permissions
    if (order.userId !== context.auth.uid) {
      // Check if user is a vendor for this order
      const userVendors = await db.collection('vendors')
        .where('userId', '==', context.auth.uid)
        .get();
      
      const vendorIds = userVendors.docs.map(doc => doc.id);
      const hasVendorAccess = vendorIds.some(id => order.vendorOrders[id]);
      
      if (!hasVendorAccess) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized to view this order');
      }
    }

    return {
      success: true,
      order: {
        ...order,
        id: data.orderId
      }
    };

  } catch (error) {
    functions.logger.error('Error getting order details:', error);
    throw error;
  }
});