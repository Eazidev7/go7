import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDoc, collection, query, where, getDocs, doc, limit, startAfter, orderBy, DocumentData } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Product, Vendor } from '../../types/marketplace';
import CartButton from '../../components/marketplace/CartButton';
import { StarIcon, MagnifyingGlassIcon as SearchIcon, FunnelIcon as FilterIcon } from '@heroicons/react/24/solid';
import { useCart } from '../../contexts/CartContext';
import { VendorProductService } from '../../services/vendorProductService';

const VendorShopPage: React.FC = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageSize] = useState(20);
  
  // Filter and search state
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  
  const { openCart } = useCart();

  // Fetch vendor data
  useEffect(() => {
    const fetchVendorData = async () => {
      if (!vendorId) return;
      
      try {
        setLoading(true);
        
        // Fetch vendor details
        const vendorRef = doc(db, `vendors/${vendorId}`);
        const vendorSnap = await getDoc(vendorRef);
        
        if (!vendorSnap.exists()) {
          setError('Vendor not found');
          setLoading(false);
          return;
        }
        
        const vendorData = vendorSnap.data() as Vendor;
        setVendor({
          ...vendorData,
          id: vendorSnap.id
        });
        
        // Fetch categories
        const categoriesRef = collection(db, `vendors/${vendorId}/categories`);
        const categoriesSnapshot = await getDocs(categoriesRef);
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || doc.id
        }));
        setCategories(categoriesData);
        
        // Fetch products (first batch)
        await fetchProducts(true);
      } catch (err) {
        console.error('Error fetching vendor data:', err);
        setError('Failed to load vendor data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVendorData();
  }, [vendorId]);

  // Fetch products with optional reset for pagination
  const fetchProducts = async (reset: boolean = false) => {
    if (!vendorId) return;
    
    try {
      setLoadingMore(true);
      
      // Base query
      let productsQuery = query(
        collection(db, `vendors/${vendorId}/products`),
        where('available', '==', true),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
      
      // Apply category filter if set
      if (filterCategory) {
        productsQuery = query(
          collection(db, `vendors/${vendorId}/products`),
          where('available', '==', true),
          where('category', '==', filterCategory),
          orderBy('createdAt', 'desc'),
          limit(pageSize)
        );
      }
      
      // For pagination, start after the last document
      if (!reset && lastVisible) {
        productsQuery = query(productsQuery, startAfter(lastVisible));
      }
      
      const productsSnapshot = await getDocs(productsQuery);
      
      // Handle pagination state
      if (productsSnapshot.empty) {
        setHasMore(false);
      } else {
        setLastVisible(productsSnapshot.docs[productsSnapshot.docs.length - 1]);
        setHasMore(productsSnapshot.docs.length >= pageSize);
      }
      
      // Transform products data with price validation
      const productsData = productsSnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Debug: Log raw Firestore data for first product
        if (reset && doc === productsSnapshot.docs[0]) {
          console.log('🔍 First product raw data from Firestore:', {
            id: doc.id,
            hasName: !!data.name,
            hasTitle: !!data.title,
            hasDescription: !!data.description,
            hasDesc: !!data.desc,
            hasImage: !!data.image,
            hasImageUrl: !!data.imageUrl,
            priceType: typeof data.price,
            priceValue: data.price,
            allFields: Object.keys(data)
          });
        }
        
        // Validate and convert price to number
        const validatedPrice = typeof data.price === 'number' && !isNaN(data.price)
          ? data.price
          : parseFloat(String(data.price)) || 0;
        
        // Validate variant prices if present
        const validatedVariants = data.variants?.map((v: any) => ({
          ...v,
          price: typeof v.price === 'number' && !isNaN(v.price)
            ? v.price
            : parseFloat(String(v.price)) || 0
        }));
        
        // Normalize field names: handle both 'name' and 'title', 'desc' and 'description'
        const normalized = {
          ...data,
          id: doc.id,
          title: data.title || data.name || 'Unnamed Product',
          desc: data.desc || data.description || '',
          price: validatedPrice,
          variants: validatedVariants,
          imageUrl: data.imageUrl || data.image || ''
        } as Product;
        
        // Debug: Log normalized data for first product
        if (reset && doc === productsSnapshot.docs[0]) {
          console.log('✅ After normalization:', {
            title: normalized.title,
            desc: normalized.desc?.substring(0, 30),
            price: normalized.price,
            imageUrl: normalized.imageUrl?.substring(0, 50)
          });
        }
        
        return normalized;
      });
      
      // Update products state (append or reset)
      setProducts(prev => reset ? productsData : [...prev, ...productsData]);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Client-side filtering (could be replaced with server search)
  };

  // Handle category filter change
  const handleCategoryChange = (categoryId: string) => {
    setFilterCategory(categoryId === filterCategory ? '' : categoryId);
    setLastVisible(null);
    fetchProducts(true);
  };

  // Filter products based on search text (client-side)
  const filteredProducts = products.filter(product => {
    if (!searchText) return true;
    
    const searchLower = searchText.toLowerCase();
    const title = product.title || '';
    const desc = product.desc || '';
    
    return (
      title.toLowerCase().includes(searchLower) ||
      desc.toLowerCase().includes(searchLower)
    );
  });

  // Format price for display with robust validation
  const formatPrice = (product: Product) => {
    // Handle variants
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      const validPrices = product.variants
        .map(v => typeof v.price === 'number' && !isNaN(v.price) ? v.price : parseFloat(String(v.price)) || 0)
        .filter(p => p > 0);
      
      if (validPrices.length === 0) {
        return '₦0';
      }
      
      const minPrice = Math.min(...validPrices);
      const maxPrice = Math.max(...validPrices);
      
      if (minPrice === maxPrice) {
        return VendorProductService.formatPrice(minPrice, 'NGN');
      }
      
      return `${VendorProductService.formatPrice(minPrice, 'NGN')} - ${VendorProductService.formatPrice(maxPrice, 'NGN')}`;
    }
    
    // Handle single price with validation
    const price = typeof product.price === 'number' && !isNaN(product.price)
      ? product.price
      : parseFloat(String(product.price)) || 0;
    
    return VendorProductService.formatPrice(price, 'NGN');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
        <p className="text-gray-600">{error || 'Vendor not found'}</p>
        <Link to="/" className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700">
          Go Back Home
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Vendor header */}
      <div className="bg-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{vendor.name}</h1>
              {vendor.description && (
                <p className="text-red-100 mt-1">{vendor.description}</p>
              )}
            </div>
            <CartButton />
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                name="search"
                value={searchText}
                onChange={handleSearchChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="Search products"
              />
            </form>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                <FilterIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                Categories
              </span>
              
              <button
                onClick={() => handleCategoryChange('')}
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  filterCategory === '' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    filterCategory === category.id 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-lg font-medium text-gray-900">No products found</h2>
            <p className="mt-1 text-sm text-gray-500">
              Try changing your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                to={`/product/${vendorId}/${product.id}`}
                className="group relative bg-white border-2 border-gray-200 rounded-xl flex flex-col overflow-hidden hover:border-red-500 hover:shadow-xl transition-all duration-300"
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={product.imageUrl || '/placeholder.png'}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.png';
                    }}
                  />
                  
                  {/* Available Badge */}
                  {product.available && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 shadow-sm">
                        ✓ Available
                      </span>
                    </div>
                  )}
                  
                  {/* Stock Badge */}
                  {product.stock !== undefined && product.stock <= 5 && product.stock > 0 && (
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 shadow-sm">
                        {product.stock} left
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Product Info */}
                <div className="flex-1 p-4 space-y-2 flex flex-col">
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors">
                    {product.title}
                  </h3>
                  
                  {product.desc && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {product.desc}
                    </p>
                  )}
                  
                  <div className="flex-1 flex flex-col justify-end pt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-red-600">
                        {formatPrice(product)}
                      </p>
                      {product.hasVariants && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          Options
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Load more button */}
        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => fetchProducts()}
              disabled={loadingMore}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-300"
            >
              {loadingMore ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                'Load More Products'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorShopPage;
