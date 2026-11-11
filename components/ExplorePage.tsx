import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocationHeader } from './LocationHeader';
import { HeroPromoCard } from './HeroPromoCard';
import { CategoryGrid } from './CategoryGrid';
import { TrendingVendors } from './TrendingVendors';
import { ProductModal } from './ProductModal';
import { toast } from 'sonner';
import './ExplorePage.css';

interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  productType: 'food' | 'market';
  vendorId: string;
  vendorName: string;
  vendorRating: number;
  estimatedDeliveryTime: string;
  variants?: Variant[];
  addons?: AddOn[];
  isAvailable: boolean;
  category: string;
}

interface Vendor {
  id: string;
  name: string;
  imageUrl: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: number;
  isOpen: boolean;
  category: string;
  featuredProduct?: {
    name: string;
    price: number;
  };
}

interface Variant {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  stock?: number;
  isAvailable: boolean;
}

interface AddOn {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  countable: boolean;
  maxQuantity?: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isActive: boolean;
}

export const ExplorePage: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState('Victoria Island, Lagos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [trendingVendors, setTrendingVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for demo - replace with real API calls
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCategories([
        {
          id: '1',
          name: 'Restaurants',
          icon: '🍽️',
          color: '#FFEFE7', // peach
          isActive: true
        },
        {
          id: '2', 
          name: 'Groceries',
          icon: '🛒',
          color: '#A8E6C3', // mint
          isActive: true
        },
        {
          id: '3',
          name: 'Pharmacy',
          icon: '💊',
          color: '#E8F4FD', // light blue
          isActive: true
        },
        {
          id: '4',
          name: 'Errands',
          icon: '📦',
          color: '#FFF0F5', // light pink
          isActive: true
        }
      ]);

      setTrendingVendors([
        {
          id: '1',
          name: 'Mama Put Kitchen',
          imageUrl: '/api/placeholder/120/120',
          rating: 4.8,
          deliveryTime: '20-30 min',
          deliveryFee: 500,
          isOpen: true,
          category: 'food',
          featuredProduct: {
            name: 'Jollof Rice',
            price: 1500
          }
        },
        {
          id: '2',
          name: 'Fresh Mart',
          imageUrl: '/api/placeholder/120/120',
          rating: 4.6,
          deliveryTime: '15-25 min',
          deliveryFee: 300,
          isOpen: true,
          category: 'groceries',
          featuredProduct: {
            name: 'Fresh Vegetables',
            price: 800
          }
        }
      ]);
      
      setLoading(false);
    }, 1000);
  }, []);

  const handleLocationChange = (newLocation: string) => {
    setSelectedLocation(newLocation);
    // Trigger API call to update vendors/products for new location
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const navigate = useNavigate();

  const handleVendorTap = (vendor: Vendor) => {
    // Navigate to vendor detail page
    navigate(`/vendor/${vendor.id}`);
  };

  const handleCategorySelect = (category: Category) => {
    // Navigate to category page or filter current view
    console.log('Selected category:', category.id);
  };

  const handleNotificationTap = () => {
    // Open notifications panel
    console.log('Open notifications');
  };

  if (loading) {
    return (
      <div className="explore-page loading">
        <div className="loading-skeleton">
          <div className="skeleton-header"></div>
          <div className="skeleton-hero"></div>
          <div className="skeleton-categories"></div>
          <div className="skeleton-vendors"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="explore-page">
      <LocationHeader
        selectedLocation={selectedLocation}
        onLocationChange={handleLocationChange}
        onNotificationTap={handleNotificationTap}
        notificationCount={3}
      />

      <div className="explore-content">
        <HeroPromoCard
          title="Free Delivery on Orders ₦5,000+"
          subtitle="Get your favorite meals delivered fast"
          ctaText="ORDER NOW"
          onCtaTap={() => console.log('Navigate to restaurants')}
          backgroundImage="/api/placeholder/400/200"
        />

        <CategoryGrid
          categories={categories}
          onCategorySelect={handleCategorySelect}
        />

        <TrendingVendors
          title="Trending Near You"
          vendors={trendingVendors}
          onVendorTap={handleVendorTap}
          onProductTap={handleProductSelect}
        />

        {/* Additional sections can be added here */}
        <div className="explore-footer">
          <div className="section-spacer"></div>
        </div>
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          isOpen={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false);
            setSelectedProduct(null);
          }}
          onAddToCart={(product, selectedVariant, selectedAddons, quantity) => {
            console.log('Add to cart:', { product, selectedVariant, selectedAddons, quantity });
            
            // Calculate total price
            const variantPrice = selectedVariant?.price || 0;
            const addonsPrice = selectedAddons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
            const totalPrice = (product.price + variantPrice + addonsPrice) * quantity;
            
            // Show success notification
            toast.success(`${quantity}x ${product.name} added to cart!`);
            
            setIsProductModalOpen(false);
          }}
        />
      )}
    </div>
  );
};