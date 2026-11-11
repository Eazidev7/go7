/**
 * Category Navigation Utilities
 * Based on CATEGORY_NAVIGATION_GUIDE.md
 */

export type VendorType = 
  | 'restaurant'
  | 'fast_food'
  | 'cafe'
  | 'bakery'
  | 'pharmacy'
  | 'supermarket'
  | 'market'
  | 'grocery'
  | 'shop'
  | 'electronics'
  | 'fashion'
  | 'home_decor';

export type CategoryType = 'food' | 'pharmacy' | 'markets' | 'gobuy' | 'courier';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  description: string;
  subcategories?: SubCategory[];
}

export interface SubCategory {
  id: string;
  name: string;
  vendorTypes: VendorType[];
}

/**
 * Main categories as per CATEGORY_NAVIGATION_GUIDE.md
 */
export const categories: Category[] = [
  {
    id: 'food',
    name: 'Food',
    icon: '🍔',
    color: 'from-orange-500 to-red-500',
    type: 'food',
    description: 'Restaurants, fast food, cafes & bakeries',
    subcategories: [
      {
        id: 'restaurants',
        name: 'Restaurants',
        vendorTypes: ['restaurant']
      },
      {
        id: 'fast-food',
        name: 'Fast Food',
        vendorTypes: ['fast_food']
      },
      {
        id: 'cafes',
        name: 'Cafés & Bakeries',
        vendorTypes: ['cafe', 'bakery']
      }
    ]
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    icon: '💊',
    color: 'from-green-500 to-teal-500',
    type: 'pharmacy',
    description: 'Pharmacies & health products',
    subcategories: [
      {
        id: 'all-pharmacies',
        name: 'All Pharmacies',
        vendorTypes: ['pharmacy']
      }
    ]
  },
  {
    id: 'markets',
    name: 'Markets',
    icon: '🛒',
    color: 'from-blue-500 to-indigo-500',
    type: 'markets',
    description: 'Supermarkets, groceries & local markets',
    subcategories: [
      {
        id: 'supermarkets',
        name: 'Supermarkets',
        vendorTypes: ['supermarket']
      },
      {
        id: 'markets',
        name: 'Markets',
        vendorTypes: ['market']
      },
      {
        id: 'groceries',
        name: 'Groceries',
        vendorTypes: ['grocery']
      }
    ]
  },
  {
    id: 'gobuy',
    name: 'GoBuy',
    icon: '🛍️',
    color: 'from-purple-500 to-pink-500',
    type: 'gobuy',
    description: 'Shop anything from verified stores',
    subcategories: [
      {
        id: 'electronics',
        name: 'Electronics',
        vendorTypes: ['electronics', 'shop']
      },
      {
        id: 'fashion',
        name: 'Fashion',
        vendorTypes: ['fashion', 'shop']
      },
      {
        id: 'home',
        name: 'Home & Decor',
        vendorTypes: ['home_decor', 'shop']
      },
      {
        id: 'all-shops',
        name: 'All Shops',
        vendorTypes: ['shop']
      }
    ]
  },
  {
    id: 'courier',
    name: 'Courier',
    icon: '📦',
    color: 'from-yellow-500 to-orange-500',
    type: 'courier',
    description: 'Send packages & documents',
    subcategories: []
  }
];

/**
 * Get category by ID
 */
export const getCategoryById = (id: string): Category | undefined => {
  return categories.find(cat => cat.id === id);
};

/**
 * Get category by type
 */
export const getCategoryByType = (type: CategoryType): Category | undefined => {
  return categories.find(cat => cat.type === type);
};

/**
 * Get subcategory by ID within a category
 */
export const getSubCategory = (categoryId: string, subCategoryId: string): SubCategory | undefined => {
  const category = getCategoryById(categoryId);
  return category?.subcategories?.find(sub => sub.id === subCategoryId);
};

/**
 * Get all vendor types for a category
 */
export const getVendorTypesForCategory = (categoryId: string, subCategoryId?: string): VendorType[] => {
  const category = getCategoryById(categoryId);
  
  if (!category) return [];
  
  // If subcategory specified, return its vendor types
  if (subCategoryId) {
    const subCategory = getSubCategory(categoryId, subCategoryId);
    return subCategory?.vendorTypes || [];
  }
  
  // Otherwise, return all vendor types for this category
  const allTypes = category.subcategories?.flatMap(sub => sub.vendorTypes) || [];
  return [...new Set(allTypes)]; // Remove duplicates
};

/**
 * Build explore route for a category
 */
export const getCategoryRoute = (categoryId: string, subCategoryId?: string): string => {
  if (categoryId === 'courier') {
    return '/book-delivery';
  }
  
  const baseRoute = `/explore?type=${categoryId}`;
  return subCategoryId ? `${baseRoute}&subtype=${subCategoryId}` : baseRoute;
};

/**
 * Parse category from URL search params
 */
export const parseCategoryFromUrl = (searchParams: URLSearchParams): { 
  categoryId?: string; 
  subCategoryId?: string;
  vendorTypes: VendorType[];
} => {
  const type = searchParams.get('type');
  const subtype = searchParams.get('subtype');
  
  if (!type) {
    return { vendorTypes: [] };
  }
  
  const vendorTypes = getVendorTypesForCategory(type, subtype || undefined);
  
  return {
    categoryId: type,
    subCategoryId: subtype || undefined,
    vendorTypes
  };
};

/**
 * Filter vendors by category
 */
export const filterVendorsByCategory = (
  vendors: any[], 
  categoryId: string, 
  subCategoryId?: string
): any[] => {
  const vendorTypes = getVendorTypesForCategory(categoryId, subCategoryId);
  
  if (vendorTypes.length === 0) return vendors;
  
  return vendors.filter(vendor => 
    vendorTypes.includes(vendor.type as VendorType) ||
    vendorTypes.includes(vendor.businessType as VendorType)
  );
};

/**
 * Get category color classes
 */
export const getCategoryColorClass = (categoryId: string): string => {
  const category = getCategoryById(categoryId);
  return category?.color || 'from-gray-500 to-gray-600';
};

/**
 * Get category display name
 */
export const getCategoryDisplayName = (categoryId: string, subCategoryId?: string): string => {
  const category = getCategoryById(categoryId);
  
  if (!category) return 'Unknown';
  
  if (subCategoryId) {
    const subCategory = getSubCategory(categoryId, subCategoryId);
    return subCategory ? `${category.name} - ${subCategory.name}` : category.name;
  }
  
  return category.name;
};
