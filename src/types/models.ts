/**
 * Type definitions for Go7 Delivery App
 * Includes core data models and Firestore converters
 */
import { 
  DocumentData, 
  FirestoreDataConverter, 
  QueryDocumentSnapshot, 
  SnapshotOptions, 
  Timestamp 
} from 'firebase/firestore';
import { toJsDate } from '../utils/firestoreDate';

/**
 * Customer Delivery Model
 * Represents a delivery request from a customer
 */
export interface CustomerDelivery {
  id: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  pickup: {
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    notes?: string;
  };
  dropoff: {
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    recipientName: string;
    recipientPhone: string;
    notes?: string;
  };
  pricing: {
    base: number;
    distance: number;
    priority: number;
    total: number;
    currency: string;
    paymentMethod: 'cash' | 'card' | 'transfer';
    isPaid: boolean;
  };
  packageDetails?: {
    size: 'small' | 'medium' | 'large';
    weight?: number;
    description?: string;
  };
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Delivery Live Model
 * Represents the live state of a delivery in progress
 */
export interface DeliveryLive {
  id: string;
  jobId: string; // References CustomerDelivery.id
  rider: {
    id: string;
    name: string;
    phone: string;
    vehicleType?: string;
    vehicleNumber?: string;
  };
  status: 'assigned' | 'accepted' | 'pickup' | 'in_transit' | 'delivered' | 'cancelled';
  distanceKm: number;
  durationMin: number;
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: Date;
  };
  route?: {
    points: Array<[number, number]>; // Array of [lat, lng] coordinates
    encodedPolyline?: string;
  };
  events: DeliveryEvent[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Delivery Event Model
 * Represents an event during the delivery process
 */
export interface DeliveryEvent {
  ts: Date;
  status: 'assigned' | 'accepted' | 'pickup' | 'in_transit' | 'delivered' | 'cancelled' | 'note';
  note?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

/**
 * Firestore converter for CustomerDelivery
 * Handles date conversions between Firestore and our app model
 */
export const customerDeliveryConverter: FirestoreDataConverter<CustomerDelivery> = {
  toFirestore(delivery: CustomerDelivery): DocumentData {
    return {
      customer: delivery.customer,
      pickup: delivery.pickup,
      dropoff: delivery.dropoff,
      pricing: delivery.pricing,
      packageDetails: delivery.packageDetails || null,
      createdAt: Timestamp.fromDate(delivery.createdAt),
      updatedAt: delivery.updatedAt ? Timestamp.fromDate(delivery.updatedAt) : null
    };
  },
  
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions
  ): CustomerDelivery {
    const data = snapshot.data(options);
    
    return {
      id: snapshot.id,
      customer: data.customer,
      pickup: data.pickup,
      dropoff: data.dropoff,
      pricing: data.pricing,
      packageDetails: data.packageDetails || undefined,
      createdAt: toJsDate(data.createdAt),
      updatedAt: data.updatedAt ? toJsDate(data.updatedAt) : undefined
    };
  }
};

/**
 * Firestore converter for DeliveryLive
 * Handles date and event array conversions
 */
export const deliveryLiveConverter: FirestoreDataConverter<DeliveryLive> = {
  toFirestore(deliveryLive: DeliveryLive): DocumentData {
    return {
      jobId: deliveryLive.jobId,
      rider: deliveryLive.rider,
      status: deliveryLive.status,
      distanceKm: deliveryLive.distanceKm,
      durationMin: deliveryLive.durationMin,
      currentLocation: deliveryLive.currentLocation ? {
        lat: deliveryLive.currentLocation.lat,
        lng: deliveryLive.currentLocation.lng,
        updatedAt: Timestamp.fromDate(deliveryLive.currentLocation.updatedAt)
      } : null,
      route: deliveryLive.route || null,
      events: deliveryLive.events.map(event => ({
        ts: Timestamp.fromDate(event.ts),
        status: event.status,
        note: event.note || null,
        location: event.location || null
      })),
      createdAt: Timestamp.fromDate(deliveryLive.createdAt),
      updatedAt: Timestamp.fromDate(deliveryLive.updatedAt)
    };
  },
  
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions
  ): DeliveryLive {
    const data = snapshot.data(options);
    
    return {
      id: snapshot.id,
      jobId: data.jobId,
      rider: data.rider,
      status: data.status,
      distanceKm: data.distanceKm,
      durationMin: data.durationMin,
      currentLocation: data.currentLocation ? {
        lat: data.currentLocation.lat,
        lng: data.currentLocation.lng,
        updatedAt: toJsDate(data.currentLocation.updatedAt)
      } : undefined,
      route: data.route || undefined,
      events: (data.events || []).map((event: any) => ({
        ts: toJsDate(event.ts),
        status: event.status,
        note: event.note || undefined,
        location: event.location || undefined
      })),
      createdAt: toJsDate(data.createdAt),
      updatedAt: toJsDate(data.updatedAt)
    };
  }
};

/**
 * Helper to create a DeliveryEvent
 */
export const createDeliveryEvent = (
  status: DeliveryEvent['status'],
  note?: string,
  location?: { lat: number; lng: number }
): DeliveryEvent => {
  return {
    ts: new Date(),
    status,
    note,
    location
  };
};

/**
 * Helper to add an event to a DeliveryLive object
 */
export const addDeliveryEvent = (
  deliveryLive: DeliveryLive,
  event: DeliveryEvent
): DeliveryLive => {
  return {
    ...deliveryLive,
    events: [...deliveryLive.events, event],
    updatedAt: new Date()
  };
};

/**
 * Product Model - Extended version for vendor products
 * Structure: vendors/{vendorId}/products/{productId}
 */
export interface Product {
  id: string;
  vendorId: string; // Required - links product to vendor
  name: string; // Changed from 'title' to match service layer
  basePrice: number; // Changed from 'price' to match service layer - Base price in kobo
  desc?: string; // Changed from 'description' to match service layer
  category: string; // Changed from 'categoryId' to match service layer
  active: boolean; // Changed from 'available' to match service layer
  stock?: number;
  imageUrl?: string; // Changed from 'images' array to single URL to match service layer
  productType: 'food' | 'market'; // Added to match service layer
  deliveryTimeMinutes?: number; // Added for food products
  variants?: ProductVariant[];
  options?: ProductOption[];
  createdAt: Date;
  updatedAt: Date;
  
  // Analytics fields from service layer
  orderCount?: number;
  rating?: number;
  reviews?: number;
  
  // Optional fields for advanced features
  sku?: string;
  weight?: number; // in grams
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  tags?: string[];
  seoSlug?: string;
}

/**
 * Product Variant Model
 * Represents different versions of a product (e.g., size, color combinations)
 */
export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number; // Price in kobo
  stock: number;
  available: boolean;
  optionCombination: Record<string, string>; // e.g., { "size": "large", "color": "red" }
  images?: string[]; // Variant-specific images
  weight?: number;
  barcode?: string;
}

/**
 * Product Option Model
 * Represents selectable options for a product (e.g., Size, Color)
 */
export interface ProductOption {
  id: string;
  name: string; // e.g., "Size", "Color", "Flavor"
  type: 'single' | 'multiple'; // Single selection or multiple selection
  required: boolean;
  displayOrder: number;
  values: ProductOptionValue[];
}

/**
 * Product Option Value Model
 * Represents individual values within an option (e.g., "Small", "Red")
 */
export interface ProductOptionValue {
  id: string;
  value: string; // e.g., "Small", "Red", "Spicy"
  priceModifier: number; // Additional price in kobo (can be negative)
  available: boolean;
  displayOrder: number;
}

/**
 * Vendor Category Model
 * Structure: vendors/{vendorId}/categories/{categoryId}
 */
export interface VendorCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  description?: string;
  imageUrl?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Firestore converter for Product
 */
export const productConverter: FirestoreDataConverter<Product> = {
  toFirestore(product: Product): DocumentData {
    return {
      title: product.title,
      price: product.price,
      description: product.description || null,
      categoryId: product.categoryId,
      available: product.available,
      stock: product.stock,
      images: product.images,
      variants: product.variants,
      options: product.options,
      sku: product.sku || null,
      weight: product.weight || null,
      dimensions: product.dimensions || null,
      tags: product.tags || [],
      seoSlug: product.seoSlug || null,
      createdAt: Timestamp.fromDate(product.createdAt),
      updatedAt: Timestamp.fromDate(product.updatedAt)
    };
  },
  
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions
  ): Product {
    const data = snapshot.data(options);
    
    return {
      id: snapshot.id,
      title: data.title,
      price: data.price,
      description: data.description || undefined,
      categoryId: data.categoryId,
      available: data.available,
      stock: data.stock,
      images: data.images || [],
      variants: data.variants || [],
      options: data.options || [],
      sku: data.sku || undefined,
      weight: data.weight || undefined,
      dimensions: data.dimensions || undefined,
      tags: data.tags || [],
      seoSlug: data.seoSlug || undefined,
      createdAt: toJsDate(data.createdAt),
      updatedAt: toJsDate(data.updatedAt)
    };
  }
};

/**
 * Firestore converter for VendorCategory
 */
export const vendorCategoryConverter: FirestoreDataConverter<VendorCategory> = {
  toFirestore(category: VendorCategory): DocumentData {
    return {
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder,
      description: category.description || null,
      imageUrl: category.imageUrl || null,
      active: category.active,
      createdAt: Timestamp.fromDate(category.createdAt),
      updatedAt: Timestamp.fromDate(category.updatedAt)
    };
  },
  
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions
  ): VendorCategory {
    const data = snapshot.data(options);
    
    return {
      id: snapshot.id,
      name: data.name,
      slug: data.slug,
      sortOrder: data.sortOrder,
      description: data.description || undefined,
      imageUrl: data.imageUrl || undefined,
      active: data.active,
      createdAt: toJsDate(data.createdAt),
      updatedAt: toJsDate(data.updatedAt)
    };
  }
};

/**
 * Helper functions for working with products
 */

/**
 * Calculate the effective price of a product variant including option modifiers
 */
export const calculateVariantPrice = (
  basePrice: number,
  variant: ProductVariant,
  selectedOptions: Record<string, string[]>,
  productOptions: ProductOption[]
): number => {
  let totalPrice = variant.price || basePrice;
  
  // Add price modifiers from selected options
  Object.entries(selectedOptions).forEach(([optionId, values]) => {
    const option = productOptions.find(opt => opt.id === optionId);
    if (option) {
      values.forEach(value => {
        const optionValue = option.values.find(val => val.value === value);
        if (optionValue) {
          totalPrice += optionValue.priceModifier;
        }
      });
    }
  });
  
  return totalPrice;
};

/**
 * Generate a SKU for a product variant
 */
export const generateVariantSku = (
  productId: string,
  variantName: string
): string => {
  const cleanVariantName = variantName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const productPrefix = productId.substring(0, 8).toUpperCase();
  return `${productPrefix}-${cleanVariantName}`;
};

/**
 * Check if a product variant is available based on stock and availability
 */
export const isVariantAvailable = (variant: ProductVariant): boolean => {
  return variant.available && variant.stock > 0;
};

/**
 * Create a default product variant for simple products
 */
export const createDefaultVariant = (product: Product): ProductVariant => {
  return {
    id: 'default',
    name: 'Default',
    sku: product.sku || generateVariantSku(product.id, 'default'),
    price: product.price,
    stock: product.stock,
    available: product.available,
    optionCombination: {},
    images: product.images
  };
};
