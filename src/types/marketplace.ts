/**
 * Vendor and Marketplace Types for Go7
 * Includes Vendor, Product, Order, PodLedger, and Payout models with Firestore converters
 */
import { 
  DocumentData, 
  FirestoreDataConverter, 
  QueryDocumentSnapshot, 
  SnapshotOptions, 
  Timestamp 
} from 'firebase/firestore';

/** Accept Firestore Timestamp, ISO string, number, or Date (migrated docs). */
function toJsDate(value: unknown, fallback: Date = new Date()): Date {
  if (value == null) return fallback;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value;
  }
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return fallback;
    }
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = Number((value as { seconds: number }).seconds);
    if (Number.isFinite(seconds)) return new Date(seconds * 1000);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? fallback : d;
  }
  return fallback;
}

/**
 * Vendor Model
 * Represents a merchant in the marketplace
 */
export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  coords: {
    lat: number;
    lng: number;
  };
  logoUrl?: string;
  active: boolean;
  isOnline?: boolean;
  createdAt: Date;
  // Additional fields
  description?: string;
  businessName?: string;
  businessType?: string;
  category?: string;
  pickupAddress?: string;
  pickupCoords?: {
    lat: number;
    lng: number;
  };
}

/**
 * Product Model
 * Represents a product offered by a vendor
 */
export interface Product {
  id: string;
  vendorId: string;
  title: string;
  desc?: string;
  price: number;
  imageUrl?: string;
  category: string;
  // Legacy options field (keep for backwards compatibility)
  options?: Array<{
    name: string;
    choices: string[];
    priceDelta?: number;
  }>;
  // New options field for variants
  productOptions?: Array<{
    name: string;
    values: string[];
  }>;
  // Variants for different combinations of options
  variants?: Array<{
    sku: string;
    optionCombo: Record<string, string>; // e.g. { "Size": "Small", "Color": "Red" }
    price: number;
    stock: number;
    available: boolean;
    key: string; // Unique identifier for the variant
    name: string; // Display name for the variant
  }>;
  available: boolean;
  stock?: number;
  createdAt: Date;
  hasVariants?: boolean; // Flag to indicate if product uses variants system
  additionalImages?: string[]; // Additional product images
}

/**
 * ProductVariant type for product option combinations
 */
export interface ProductVariant {
  sku: string;
  optionCombo: Record<string, string>;
  price: number;
  stock: number;
  available: boolean;
  key: string; // Unique identifier for the variant
  name: string; // Display name for the variant
}

/**
 * Order Model
 * Represents a customer order from a vendor
 */
export interface Order {
  id?: string;
  vendorId: string;
  items: Array<{
    productId: string;
    name: string;
    qty: number;
    price: number;
    variantKey?: string;
    variantName?: string;
    options?: Record<string, any>;
  }>;
  subtotal: number;
  deliveryFee: number;
  // Enhanced delivery fee breakdown
  deliveryBreakdown?: {
    baseFare: number;
    distanceFee: number;
    podFee: number;
    isFreeDelivery: boolean;
    distance: number; // in km
  };
  // Coupon information
  coupon?: {
    code: string;
    discount: number;
    type: 'percent' | 'flat';
    appliedAt: Date;
  };
  payment: {
    method: 'POD' | 'CARD';
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    reference?: string;
    gateway?: 'paystack' | 'flutterwave';
    verifiedAt?: Date;
  };
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  status: 'new' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled' | 'delivery_scheduled' | 'ready' | 'completed';
  areaFrom: string;
  areaTo: string;
  deliveryAddress?: string;
  notes?: string;
  cancelReason?: string;
  cancelledAt?: Date;
  refundedAt?: Date;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  
  // Legacy fields for backwards compatibility
  total?: number;
  pod?: boolean;
  jobId?: string;
  riderId?: string;
  customerName?: string;
  totalAmount?: number;
}

/**
 * PodLedger Model
 * Tracks Pay-on-Delivery payments for accounting
 */
export interface PodLedger {
  id: string;
  vendorId: string;
  orderId: string;
  amount: number;
  state: 'to_collect' | 'collected' | 'remitted';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payout Model
 * Represents payments to vendors
 */
export interface Payout {
  id: string;
  vendorId: string;
  amount: number;
  period: string; // e.g., "2025-09-01_2025-09-15"
  status: 'pending' | 'paid';
  createdAt: Date;
}

/**
 * Firestore converter for Vendor
 */
export const vendorConverter: FirestoreDataConverter<Vendor> = {
  toFirestore(vendor: Vendor): DocumentData {
    return {
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      coords: vendor.coords,
      logoUrl: vendor.logoUrl || null,
      active: vendor.active,
      description: vendor.description || null,
      businessName: vendor.businessName || null,
      businessType: vendor.businessType || null,
      category: vendor.category || null,
      pickupAddress: vendor.pickupAddress || null,
      pickupCoords: vendor.pickupCoords || null,
      createdAt: Timestamp.fromDate(vendor.createdAt)
    };
  },
  
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions
  ): Vendor {
    const data = snapshot.data(options);
    
    return {
      id: snapshot.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      coords: data.coords,
      logoUrl: data.logoUrl || undefined,
      active: data.active,
      description: data.description || undefined,
      businessName: data.businessName || undefined,
      businessType: data.businessType || undefined,
      category: data.category || undefined,
      pickupAddress: data.pickupAddress || undefined,
      pickupCoords: data.pickupCoords || undefined,
      createdAt: toJsDate(data.createdAt),
      // Preserve identity fields used by VendorGuard / dashboard
      ...(data.userId ? { userId: data.userId } : {}),
      ...(data.vendorId ? { vendorId: data.vendorId } : {}),
    } as Vendor;
  }
};

/**
 * Firestore converter for Product
 */
export const productConverter: FirestoreDataConverter<Product> = {
  toFirestore(product: Product): DocumentData {
    return {
      vendorId: product.vendorId,
      title: product.title,
      desc: product.desc || null,
      price: product.price,
      imageUrl: product.imageUrl || null,
      category: product.category,
      options: product.options || null,
      productOptions: product.productOptions || null,
      variants: product.variants || null,
      available: product.available,
      stock: product.stock || null,
      hasVariants: product.hasVariants || false,
      additionalImages: product.additionalImages || null,
      createdAt: Timestamp.fromDate(product.createdAt)
    };
  },
  
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions
  ): Product {
    const data = snapshot.data(options);
    
    return {
      id: snapshot.id,
      vendorId: data.vendorId,
      title: data.title,
      desc: data.desc || undefined,
      price: data.price,
      imageUrl: data.imageUrl || undefined,
      category: data.category,
      options: data.options || undefined,
      productOptions: data.productOptions || undefined,
      variants: data.variants || undefined,
      available: data.available,
      stock: data.stock || undefined,
      hasVariants: data.hasVariants || false,
      additionalImages: data.additionalImages || undefined,
      createdAt: toJsDate(data.createdAt)
    };
  }
};

/**
 * Firestore converter for Order
 */
export const orderConverter: FirestoreDataConverter<Order> = {
  toFirestore(order: Order): DocumentData {
    return {
      vendorId: order.vendorId,
      items: order.items,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      deliveryBreakdown: order.deliveryBreakdown || null,
      coupon: order.coupon || null,
      payment: order.payment,
      customer: order.customer,
      status: order.status,
      areaFrom: order.areaFrom,
      areaTo: order.areaTo,
      deliveryAddress: order.deliveryAddress || null,
      notes: order.notes || null,
      cancelReason: order.cancelReason || null,
      cancelledAt: order.cancelledAt ? Timestamp.fromDate(order.cancelledAt) : null,
      refundedAt: order.refundedAt ? Timestamp.fromDate(order.refundedAt) : null,
      total: order.total || null,
      pod: order.pod || null,
      jobId: order.jobId || null,
      riderId: order.riderId || null,
      customerName: order.customerName || null,
      totalAmount: order.totalAmount || null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt || null
    };
  },
  
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions
  ): Order {
    const data = snapshot.data(options);
    
    return {
      id: snapshot.id,
      vendorId: data.vendorId,
      items: data.items,
      subtotal: data.subtotal,
      deliveryFee: data.deliveryFee,
      deliveryBreakdown: data.deliveryBreakdown || undefined,
      coupon: data.coupon || undefined,
      payment: data.payment,
      customer: data.customer,
      status: data.status,
      areaFrom: data.areaFrom,
      areaTo: data.areaTo,
      deliveryAddress: data.deliveryAddress || undefined,
      notes: data.notes || undefined,
      cancelReason: data.cancelReason || undefined,
      cancelledAt: data.cancelledAt ? toJsDate(data.cancelledAt) : undefined,
      refundedAt: data.refundedAt ? toJsDate(data.refundedAt) : undefined,
      total: data.total || undefined,
      pod: data.pod || undefined,
      jobId: data.jobId || undefined,
      riderId: data.riderId || undefined,
      customerName: data.customerName || undefined,
      totalAmount: data.totalAmount || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt || undefined
    };
  }
};

/**
 * Firestore converter for PodLedger
 */
export const podLedgerConverter: FirestoreDataConverter<PodLedger> = {
  toFirestore(podLedger: PodLedger): DocumentData {
    return {
      vendorId: podLedger.vendorId,
      orderId: podLedger.orderId,
      amount: podLedger.amount,
      state: podLedger.state,
      createdAt: Timestamp.fromDate(podLedger.createdAt),
      updatedAt: Timestamp.fromDate(podLedger.updatedAt)
    };
  },
  
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions
  ): PodLedger {
    const data = snapshot.data(options);
    
    return {
      id: snapshot.id,
      vendorId: data.vendorId,
      orderId: data.orderId,
      amount: data.amount,
      state: data.state,
      createdAt: toJsDate(data.createdAt),
      updatedAt: toJsDate(data.updatedAt)
    };
  }
};

/**
 * Firestore converter for Payout
 */
export const payoutConverter: FirestoreDataConverter<Payout> = {
  toFirestore(payout: Payout): DocumentData {
    return {
      vendorId: payout.vendorId,
      amount: payout.amount,
      period: payout.period,
      status: payout.status,
      createdAt: Timestamp.fromDate(payout.createdAt)
    };
  },
  
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions
  ): Payout {
    const data = snapshot.data(options);
    
    return {
      id: snapshot.id,
      vendorId: data.vendorId,
      amount: data.amount,
      period: data.period,
      status: data.status,
      createdAt: toJsDate(data.createdAt)
    };
  }
};

/**
 * Helper functions to create and convert vendor-related documents
 */

/**
 * Create a new vendor with default values
 */
export const createNewVendor = (
  name: string,
  email: string,
  phone: string,
  address: string,
  coords: { lat: number; lng: number },
  logoUrl?: string
): Vendor => {
  return {
    id: '', // Will be set by Firestore
    name,
    email,
    phone,
    address,
    coords,
    logoUrl,
    active: true,
    createdAt: new Date()
  };
};

/**
 * Create a new product with default values
 */
export const createNewProduct = (
  vendorId: string,
  title: string,
  price: number,
  category: string,
  options?: Array<{
    name: string;
    choices: string[];
    priceDelta?: number;
  }>,
  desc?: string,
  imageUrl?: string,
  stock?: number
): Product => {
  return {
    id: '', // Will be set by Firestore
    vendorId,
    title,
    desc,
    price,
    imageUrl,
    category,
    options,
    available: true,
    stock,
    createdAt: new Date()
  };
};

/**
 * Create a new order with calculated totals
 */
export const createNewOrder = (
  vendorId: string,
  items: Array<{
    productId: string;
    name: string;
    qty: number;
    price: number;
    variantKey?: string;
    variantName?: string;
    options?: Record<string, any>;
  }>,
  deliveryFee: number,
  customer: { name: string; phone: string; email?: string; address?: string },
  paymentMethod: 'POD' | 'CARD',
  areaFrom: string,
  areaTo: string
): Order => {
  // Calculate subtotal
  const subtotal = items.reduce((total, item) => total + (item.price * item.qty), 0);
  
  // Calculate total
  const total = subtotal + deliveryFee;
  
  return {
    id: '', // Will be set by Firestore
    vendorId,
    items,
    subtotal,
    deliveryFee,
    total,
    pod: paymentMethod === 'POD',
    payment: {
      status: 'pending',
      method: paymentMethod
    },
    customer,
    status: 'new',
    areaFrom,
    areaTo,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
};
