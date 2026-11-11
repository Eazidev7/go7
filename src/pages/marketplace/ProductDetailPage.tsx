import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Product, Vendor, ProductVariant } from '../../types/marketplace';
import CartButton from '../../components/marketplace/CartButton';
import { ChevronLeftIcon, StarIcon } from '@heroicons/react/24/solid';
import { useCart } from '../../contexts/CartContext';
import { VendorProductService } from '../../services/vendorProductService';

const ProductDetailPage: React.FC = () => {
  const { vendorId, productId } = useParams<{ vendorId: string; productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // For product variants selection
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  // For image gallery
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const { addToCart, openCart } = useCart();

  // Fetch product and vendor data
  useEffect(() => {
    const fetchData = async () => {
      if (!vendorId || !productId) return;
      
      try {
        setLoading(true);
        
        // Fetch product details
        const productRef = doc(db, `vendors/${vendorId}/products/${productId}`);
        const productSnap = await getDoc(productRef);
        
        if (!productSnap.exists()) {
          setError('Product not found');
          setLoading(false);
          return;
        }
        
        const productData = productSnap.data();
        
        // Validate price
        const validatedPrice = typeof productData.price === 'number' && !isNaN(productData.price)
          ? productData.price
          : parseFloat(String(productData.price)) || 0;
        
        // Validate variant prices if present
        const validatedVariants = productData.variants?.map((v: any) => ({
          ...v,
          price: typeof v.price === 'number' && !isNaN(v.price)
            ? v.price
            : parseFloat(String(v.price)) || 0
        }));
        
        const processedProduct = {
          ...productData,
          title: productData.title || productData.name || 'Unnamed Product',
          desc: productData.desc || productData.description || '',
          imageUrl: productData.imageUrl || productData.image || '',
          price: validatedPrice,
          variants: validatedVariants
        } as Product;
        
        // Check if product is available
        if (!processedProduct.available) {
          setError('This product is currently unavailable');
          setLoading(false);
          return;
        }
        
        const fullProduct = {
          ...processedProduct,
          id: productSnap.id
        };
        
        setProduct(fullProduct);
        
        // Set default selected variant if applicable
        if (fullProduct.hasVariants && fullProduct.variants && fullProduct.variants.length > 0) {
          setSelectedVariant(fullProduct.variants[0]);
        }
        
        // Fetch vendor details
        const vendorRef = doc(db, `vendors/${vendorId}`);
        const vendorSnap = await getDoc(vendorRef);
        
        if (vendorSnap.exists()) {
          const vendorData = vendorSnap.data() as Vendor;
          setVendor({
            ...vendorData,
            id: vendorSnap.id
          });
        }
      } catch (err) {
        console.error('Error fetching product data:', err);
        setError('Failed to load product data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [vendorId, productId]);

  // Handle quantity change
  const handleQuantityChange = (value: number) => {
    setQuantity(Math.max(1, Math.min(10, value))); // Min 1, Max 10
  };

  // Handle variant selection
  const handleVariantChange = (variant: ProductVariant) => {
    setSelectedVariant(variant);
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (!product || !vendorId) return;
    
    try {
      // Determine price and variant info
      const variantKey = product.hasVariants && selectedVariant 
        ? selectedVariant.key 
        : undefined;
      
      const price = product.hasVariants && selectedVariant 
        ? selectedVariant.price 
        : product.price;
      
      // Add item to cart
      addToCart({
        vendorId,
        productId: product.id,
        variantKey,
        qty: quantity,
        product: {
          title: product.title,
          imageUrl: product.imageUrl,
          price,
          variantName: selectedVariant?.name
        }
      });
      
      // Open cart drawer
      openCart();
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add item to cart. Please try again.');
    }
  };

  // Get current image URL
  const getCurrentImage = () => {
    if (!product) return '';
    
    if (product.additionalImages && product.additionalImages.length > 0) {
      const allImages = [product.imageUrl, ...product.additionalImages];
      return allImages[currentImageIndex] || product.imageUrl;
    }
    
    return product.imageUrl;
  };

  // Get all images
  const getAllImages = () => {
    if (!product) return [];
    
    if (product.additionalImages && product.additionalImages.length > 0) {
      return [product.imageUrl, ...product.additionalImages];
    }
    
    return [product.imageUrl];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
        <p className="text-gray-600">{error || 'Product not found'}</p>
        <Link to="/" className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700">
          Go Back Home
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Header with back button and cart */}
      <div className="bg-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(`/shop/${vendorId}`)}
              className="inline-flex items-center p-2 rounded-md text-white hover:bg-red-700"
            >
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
              <span className="ml-1">Back</span>
            </button>
            <CartButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
          {/* Product gallery */}
          <div className="lg:max-w-lg lg:self-start">
            <div className="aspect-w-1 aspect-h-1 rounded-lg overflow-hidden">
              <img
                src={getCurrentImage() || '/placeholder.png'}
                alt={product.title}
                className="w-full h-full object-center object-cover"
              />
            </div>

            {/* Image thumbnails */}
            {getAllImages().length > 1 && (
              <div className="mt-4 grid grid-cols-6 gap-2">
                {getAllImages().map((image, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`relative aspect-w-1 aspect-h-1 rounded-md overflow-hidden ${
                      currentImageIndex === idx 
                        ? 'ring-2 ring-offset-2 ring-red-500' 
                        : 'ring-1 ring-gray-200'
                    }`}
                  >
                    <img 
                      src={image} 
                      alt={`Product thumbnail ${idx + 1}`}
                      className="w-full h-full object-center object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product details */}
          <div className="mt-10 lg:mt-0 lg:col-start-2 lg:row-span-2 lg:self-start">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
              {vendor && (
                <Link 
                  to={`/shop/${vendorId}`}
                  className="text-sm font-medium text-red-600 hover:text-red-800"
                >
                  {vendor.name}
                </Link>
              )}
            </div>

            {/* Price */}
            <div className="mt-4">
              <h2 className="sr-only">Product price</h2>
              <p className="text-2xl font-bold text-gray-900">
                {product.hasVariants && selectedVariant
                  ? VendorProductService.formatPrice(selectedVariant.price, 'NGN')
                  : VendorProductService.formatPrice(product.price, 'NGN')
                }
              </p>
            </div>

            {/* Description */}
            {product.desc && (
              <div className="mt-4">
                <h2 className="text-sm font-medium text-gray-900">Description</h2>
                <div className="mt-2 prose prose-sm text-gray-500">
                  <p>{product.desc}</p>
                </div>
              </div>
            )}

            {/* Variants */}
            {product.hasVariants && product.variants && product.variants.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-medium text-gray-900">Options</h2>
                <div className="mt-2">
                  <div className="grid grid-cols-3 gap-3">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.key}
                        type="button"
                        onClick={() => handleVariantChange(variant)}
                        className={`relative border rounded-md py-3 px-4 flex items-center justify-center text-sm font-medium uppercase focus:outline-none ${
                          selectedVariant?.key === variant.key
                            ? 'bg-red-600 text-white border-transparent'
                            : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {variant.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quantity selector */}
            <div className="mt-6">
              <div className="flex items-center">
                <h2 className="text-sm font-medium text-gray-900 mr-4">Quantity</h2>
                <div className="flex rounded-md border border-gray-300">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    className="p-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <span className="sr-only">Decrease quantity</span>
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <input
                    type="text"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) handleQuantityChange(val);
                    }}
                    aria-label="Quantity"
                    title="Quantity"
                    className="p-2 w-12 text-center focus:outline-none focus:ring-red-500 focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    className="p-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <span className="sr-only">Increase quantity</span>
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Add to cart button */}
            <div className="mt-8">
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full bg-red-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
