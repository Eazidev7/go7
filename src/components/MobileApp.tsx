import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';

// Context Providers from backend (updated paths)
import { AuthProvider } from './contexts/backend/AuthContext';
import { CartProvider } from './contexts/backend/CartContext';
import { OrderProvider } from './contexts/backend/OrderContext';
import { TrackingProvider } from './contexts/backend/TrackingContext';

// Figma UI Components
import { ExplorePage } from './components/ExplorePage';
import { VendorPage } from './components/VendorPage';
import { CartViewPage } from './components/CartViewPage';
import { CheckoutPage } from './components/CheckoutPage';
import { TrackDeliveryPage } from './components/TrackDeliveryPage';
import { ProfilePage } from '../../go7 figma/components/ProfilePage';
import { OrdersPage } from './components/OrdersPage';
import { FavoritesPage } from './components/FavoritesPage';
import { LuckyWeekPage } from './components/LuckyWeekPage';
import { GamificationPage } from './components/GamificationPage';
import { DailyStreakPage } from './components/DailyStreakPage';
import { BottomNav } from './components/BottomNav';
import { SearchResultsPage } from './components/SearchResultsPage';
import { NotificationsPage } from './components/NotificationsPage';
import { TransactionHistoryPage } from './components/TransactionHistoryPage';
import { AddressManagementPage } from './components/AddressManagementPage';
import { SplashScreen } from './components/SplashScreen';

// Book Delivery from Figma pages
import BookDelivery from './pages/BookDelivery';

// Backend services for app initialization
import { useAuth } from './contexts/backend/AuthContext';
import { useCart } from './contexts/backend/CartContext';

interface Vendor {
  id: string;
  name: string;
  image: string;
  rating: number;
  deliveryTime: string;
  category: string;
  distance?: string;
  tags?: string[];
  deliveryFee?: number;
  minOrder?: number;
  isPopular?: boolean;
  hasPromo?: boolean;
}

type AppScreen = 
  | 'splash'
  | 'explore' 
  | 'vendor' 
  | 'cart' 
  | 'checkout' 
  | 'tracking' 
  | 'profile'
  | 'orders'
  | 'favorites'
  | 'luckyweek'
  | 'gamification'
  | 'streak'
  | 'bookdelivery'
  | 'search'
  | 'notifications'
  | 'transactions'
  | 'addresses';

function FigmaAppContent() {
  const authContext = useAuth();
  const currentUser = authContext?.currentUser || null;
  const cartState = useCart();
  
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('splash');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string>('');
  const [showSplash, setShowSplash] = useState(true);

  // Hide splash after 3 seconds and show explore page
  React.useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        setCurrentScreen('explore');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // Navigation functions
  const navigateToVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setCurrentScreen('vendor');
  };

  const navigateToCart = () => {
    setCurrentScreen('cart');
  };

  const navigateToCheckout = () => {
    setCurrentScreen('checkout');
  };

  const navigateToTracking = (orderId: string) => {
    setTrackingOrderId(orderId);
    setCurrentScreen('tracking');
  };

  const navigateToProfile = () => {
    setCurrentScreen('profile');
  };

  const navigateToOrders = () => {
    setCurrentScreen('orders');
  };

  const navigateToBookDelivery = () => {
    window.location.assign('/book-delivery');
  };

  const navigateBack = () => {
    setCurrentScreen('explore');
    setSelectedVendor(null);
  };

  // Show splash screen
  if (showSplash) {
    return <SplashScreen />;
  }

  // Main app content
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'explore':
        return (
          <ExplorePage 
            onBack={() => {}} 
            onVendorClick={navigateToVendor}
          />
        );
      
      case 'vendor':
        return selectedVendor ? (
          <VendorPage 
            vendor={selectedVendor}
            onBack={navigateBack}
            onCheckout={navigateToCheckout}
          />
        ) : null;
      
      case 'cart':
        return (
          <CartViewPage
            cart={cartState?.items || []}
            vendorName={null}
            onBack={navigateBack}
            onRemoveItem={(itemId) => {
              console.log('🗑️ MobileApp onRemoveItem called with itemId:', itemId);
              console.log('🗑️ Current cart items:', cartState?.items);
              const items = cartState?.items || [];
              const itemIndex = items.findIndex(item => {
                console.log('Comparing item.id:', item.id, 'with itemId:', itemId);
                return item.id === itemId;
              });
              console.log('🗑️ Found item at index:', itemIndex);
              if (itemIndex !== -1 && cartState?.removeItem) {
                console.log('🗑️ Calling removeItem with index:', itemIndex);
                cartState.removeItem(itemIndex);
                console.log('✅ Item removed');
              } else {
                console.error('❌ Item not found or removeItem not available');
              }
            }}
            onClearCart={() => {
              console.log('🗑️ MobileApp onClearCart called');
              if (cartState?.clearCart) {
                cartState.clearCart();
                console.log('✅ Cart cleared');
              } else {
                console.error('❌ clearCart not available');
              }
            }}
            onCheckout={navigateToCheckout}
          />
        );
      
      case 'checkout':
        return (
          <CheckoutPage
            cart={cartState?.items || []}
            subtotal={0}
            itemDiscounts={0}
            promoDiscount={0}
            deliveryFee={500}
            totalPrice={0}
            totalSavings={0}
            onBack={() => setCurrentScreen('cart')}
            onOrderPlaced={() => navigateToTracking('order-123')}
          />
        );
      
      case 'tracking':
        return (
          <TrackDeliveryPage
            orderId={trackingOrderId}
            onClose={navigateBack}
          />
        );
      
      case 'profile':
        return (
          <ProfilePage
            onTrackOrder={() => navigateToTracking('order-active')}
          />
        );
      
      case 'orders':
        return (
          <OrdersPage
            onBack={navigateBack}
          />
        );
      
      case 'favorites':
        return (
          <FavoritesPage
            onBack={navigateBack}
          />
        );
      
      case 'luckyweek':
        return (
          <LuckyWeekPage
            onBack={navigateBack}
          />
        );
      
      case 'gamification':
        return (
          <GamificationPage
            onBack={navigateBack}
          />
        );
      
      case 'streak':
        return (
          <DailyStreakPage
            onBack={navigateBack}
          />
        );
      
      case 'bookdelivery':
        return <BookDelivery />;
      
      case 'search':
        return (
          <SearchResultsPage
            onBack={navigateBack}
          />
        );
      
      case 'notifications':
        return (
          <NotificationsPage
            onBack={navigateBack}
          />
        );
      
      case 'transactions':
        return (
          <TransactionHistoryPage
            onBack={navigateBack}
          />
        );
      
      case 'addresses':
        return (
          <AddressManagementPage
            onBack={navigateBack}
          />
        );
      
      default:
        return (
          <ExplorePage 
            onBack={() => {}} 
            onVendorClick={navigateToVendor}
          />
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {renderCurrentScreen()}
      </div>

      {/* Bottom Navigation */}
      {!['splash', 'checkout', 'tracking'].includes(currentScreen) && (
        <BottomNav
          activeTab={currentScreen === 'explore' ? 'home' : 
                    currentScreen === 'bookdelivery' ? 'delivery' :
                    currentScreen === 'orders' ? 'orders' :
                    currentScreen === 'profile' ? 'profile' : 'home'}
          onTabChange={(tab) => {
            switch (tab) {
              case 'home':
                setCurrentScreen('explore');
                break;
              case 'delivery':
                window.location.assign('/book-delivery');
                break;
              case 'orders':
                setCurrentScreen('orders');
                break;
              case 'profile':
                setCurrentScreen('profile');
                break;
            }
          }}
        />
      )}
    </div>
  );
}

/**
 * MobileApp - Mobile Figma App without Router (for use within ResponsiveRoot)
 */
function MobileApp() {
  return (
    <AuthProvider>
      <CartProvider>
        <OrderProvider>
          <TrackingProvider>
            <FigmaAppContent />
          </TrackingProvider>
        </OrderProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default MobileApp;