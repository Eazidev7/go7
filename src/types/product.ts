// V2 Product System Type Definitions

export interface V2Addon {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  image?: File; // For file upload handling
  imagePreview?: string; // For preview URL before upload
  category?: string;
  isAvailable?: boolean;
  maxQuantity?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface V2Product {
  id: string;
  vendorId: string;
  name: string;
  description?: string;
  category: string;
  measurementType: 'unit' | 'portion' | 'bundle' | 'weight';
  basePrice: number;
  imageUrl?: string;
  addons?: V2Addon[];
  isAvailable?: boolean;
  isPopular?: boolean;
  preparationTime?: number; // in minutes
  tags?: string[];
  nutritionInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    allergens?: string[];
  };
  inventory?: {
    available: boolean;
    quantity?: number;
    lowStockThreshold?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductSearchFilters {
  category?: string;
  measurementType?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  isAvailable?: boolean;
  isPopular?: boolean;
  tags?: string[];
  searchTerm?: string;
}

export interface CartItem {
  product: V2Product;
  selectedAddons: V2Addon[];
  quantity: number;
  totalPrice: number;
  notes?: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  category: string;
  measurementType: 'unit' | 'portion' | 'bundle' | 'weight';
  basePrice: number;
  imageFile?: File;
  addons: V2Addon[];
  isAvailable: boolean;
  preparationTime?: number;
  tags: string[];
}

// Legacy V1 Product (for migration)
export interface V1MenuItem {
  id: string;
  vendorId: string;
  name: string;
  desc: string;
  price: number;
  category?: string;
  imageUrl?: string;
  addons?: Array<{
    name: string;
    price: number;
    description?: string;
  }>;
  createdAt?: any;
  updatedAt?: any;
}

// Migration interfaces
export interface MigrationResult {
  success: boolean;
  vendorId: string;
  migratedProducts: number;
  errors: string[];
  warnings: string[];
}

export interface MigrationSummary {
  totalVendors: number;
  successfulMigrations: number;
  failedMigrations: number;
  totalProductsMigrated: number;
  totalErrors: string[];
  duration: number; // in seconds
}