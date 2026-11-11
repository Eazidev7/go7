import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
// Import fallback components
import BookDeliveryFallback from './pages/BookDeliveryFallback';
import RiderDashboardFallback from './pages/RiderDashboardFallback';
import { ServiceFallback } from './components/ServiceFallback';
import SearchResults from './pages/SearchResults';
import DeliveryMap from './components/DeliveryMap';
import LiveTrackingDemo from './pages/LiveTrackingDemo';
import GO7LiveTracking from './pages/GO7LiveTracking';
import MobileHomePage from './components/MobileHomePageEnhanced';
// Import RiderDashboard conditionally with error handling
const RiderDashboard = lazy(() => import('./pages/RiderDashboard')
  .catch(err => {
    console.error('Failed to load RiderDashboard:', err);
    return { default: RiderDashboardFallback };
  })
);
// Import BookDelivery conditionally with error handling
const BookDelivery = lazy(() => import('./pages/BookDelivery')
  .catch(err => {
    console.error('Failed to load BookDelivery:', err);
    return { default: BookDeliveryFallback };
  })
);
import HomeDebug from './pages/HomeDebug';
import HomeStepByStep from './pages/HomeStepByStep';
import HomeTestSimple from './pages/HomeTest-Simple';
import HomeTest from './pages/HomeTest';
import MinimalHome from './pages/MinimalHome';
import HomeMinimal from './pages/HomeMinimal';
import SafeHome from './pages/SafeHome';
import UltraMinimal from './pages/UltraMinimal';
import DiagnosticTest from './pages/DiagnosticTest';
import MapTest from './pages/MapTest';
import ImageTest from './pages/ImageTest';
import SimpleChatDemo from './pages/SimpleChatDemo';
import ChatDemo from './pages/ChatDemo';
import IconShowcase from './pages/IconShowcase';
import Login from './pages/Login';
import TrackPackage from './pages/TrackPackage';
import TrackOrder from './pages/TrackOrder';
import Dashboard from './pages/admin/Dashboard';
import Orders from './pages/admin/Orders';
import CategoryManagement from './pages/admin/CategoryManagement';
import OpsReconciliation from './pages/OpsReconciliation';
import RiderOrderDetail from './pages/rider/OrderDetail';
import RiderConsole from './pages/RiderConsole';
import VendorLogin from './pages/vendor/VendorLogin';
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorProducts from './pages/vendor/VendorProducts';
import VendorProductsPage from './pages/VendorProductsPage';
import VendorCategories from './pages/vendor/VendorCategories';
import VendorOrders from './pages/vendor/VendorOrders';
import VendorPOD from './pages/vendor/VendorPOD';
import VendorPayouts from './pages/vendor/VendorPayouts';
import VendorSettings from './pages/vendor/VendorSettings';
import ProductFormStepper from './components/vendor/products/ProductFormStepper';
import CategoriesPage from './components/vendor/categories/CategoriesPage';
import VendorAddonsDemo from './pages/VendorAddonsDemo';
import VendorShopPage from './pages/marketplace/VendorShopPage';
import ProductDetailPage from './pages/marketplace/ProductDetailPage';
import CheckoutPage from './pages/marketplace/CheckoutPage';
import OrderConfirmationPage from './pages/marketplace/OrderConfirmationPage';
import PaymentCallbackPage from './pages/marketplace/PaymentCallbackPage';
import VendorProfile from './pages/VendorProfile';
import VendorPage from './pages/VendorPage';
import AdminGuard from './components/AdminGuard';
import RiderGuard from './components/RiderGuard';
import VendorGuard from './components/guards/VendorGuard';
import NotFound from './pages/NotFound';
import GoBuyPage from './pages/GoBuyPage';
import GoBuySuccess from './pages/GoBuySuccess';
import RestaurantsPage from './pages/RestaurantsPage';
import ShopsPage from './pages/ShopsPage';
import PharmacyPage from './pages/PharmacyPage';
import MarketPage from './pages/MarketPage';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import { AppFlowUtils } from './components/AppFlowManager';
import OnboardingScreen from './screens/Onboarding/OnboardingScreen';

// Onboarding utility components
const OnboardingReset = () => {
  const handleReset = () => {
    AppFlowUtils.resetOnboarding();
    alert('Onboarding reset! Refresh the page to see the onboarding flow again.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Onboarding Reset</h1>
        <p className="text-gray-600 mb-6">
          This will reset the onboarding status and show the onboarding screens again on next app launch.
        </p>
        <button
          onClick={handleReset}
          className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
        >
          Reset Onboarding
        </button>
        <div className="mt-4">
          <a href="/" className="text-blue-600 hover:underline">← Back to Home</a>
        </div>
      </div>
    </div>
  );
};

const OnboardingDemo = () => {
  const [showDemo, setShowDemo] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {showDemo ? (
        <OnboardingScreen />
      ) : (
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Onboarding Demo</h1>
            <p className="text-gray-600 mb-6">
              Preview your existing onboarding flow with login/signup functionality.
            </p>
            <button
              onClick={() => setShowDemo(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors mr-4"
            >
              Show Onboarding
            </button>
            <div className="mt-4">
              <a href="/" className="text-blue-600 hover:underline">← Back to Home</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function AppRouter() {
  // Loading fallback UI for lazy-loaded components
  const LoadingFallback = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f9f9f9'
    }}>
      <div style={{
        padding: '20px',
        borderRadius: '8px',
        backgroundColor: 'white',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <h3 style={{ color: '#e53e3e' }}>Loading...</h3>
        <p>Please wait while we set things up for you.</p>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #f3f3f3',
          borderTop: '5px solid #e53e3e',
          borderRadius: '50%',
          margin: '20px auto',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );

  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/book" element={
            <Suspense fallback={<LoadingFallback />}>
              <BookDelivery />
            </Suspense>
          } />
          <Route path="/book-delivery" element={
            <Suspense fallback={<LoadingFallback />}>
              <BookDelivery />
            </Suspense>
          } />
          <Route path="/zones" element={<DeliveryMap />} />
          <Route path="/live-tracking" element={<LiveTrackingDemo />} />
          <Route path="/go7-tracking" element={<GO7LiveTracking />} />
          <Route path="/tracking" element={<GO7LiveTracking />} />
          <Route path="/rider" element={
            <Suspense fallback={<LoadingFallback />}>
              <RiderDashboard />
            </Suspense>
          } />
          <Route path="/debug" element={<HomeDebug />} />
          <Route path="/step" element={<HomeStepByStep />} />
          <Route path="/safe" element={<SafeHome />} />
          <Route path="/diag" element={<DiagnosticTest />} />
          <Route path="/map-test" element={<MapTest />} />
          <Route path="/image-test" element={<ImageTest />} />
          <Route path="/chat-demo" element={<SimpleChatDemo />} />
          <Route path="/chat-test" element={<ChatDemo />} />
          <Route path="/icons" element={<IconShowcase />} />
          <Route path="/ultra" element={<UltraMinimal />} />
          <Route path="/minimal" element={<HomeMinimal />} />
          <Route path="/test-simple" element={<HomeTestSimple />} />
          <Route path="/test" element={<HomeTest />} />
          <Route path="/vendor-addons-demo" element={<VendorAddonsDemo />} />
          <Route path="/login" element={<Login />} />
          <Route path="/track/:code?" element={<TrackPackage />} />
          <Route path="/track-order/:jobId" element={<TrackOrder />} />
          <Route path="/rider-console" element={<RiderConsole />} />
          <Route path="/mobile" element={<MobileHomePage />} />
          <Route path="/gobuy" element={<GoBuyPage />} />
          <Route path="/gobuy-success" element={<GoBuySuccess />} />
          
          {/* Service Routes */}
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="/shops" element={<ShopsPage />} />
          <Route path="/pharmacy" element={<PharmacyPage />} />
          <Route path="/markets" element={<MarketPage />} />

          {/* Marketplace Routes */}
          <Route path="/shop/:vendorId" element={<VendorShopPage />} />
          <Route path="/product/:vendorId/:productId" element={<ProductDetailPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders/:orderId" element={<OrderConfirmationPage />} />
          <Route path="/payment/callback" element={<PaymentCallbackPage />} />
          
          {/* Public Vendor Profile */}
          <Route path="/vendor/:vendorId" element={<VendorProfile />} />
          
          {/* New Vendor Page with Product Debugging */}
          <Route path="/vendor-debug/:id" element={<VendorPage />} />

          {/* Vendor Routes */}
          <Route path="/vendor/login" element={<VendorLogin />} />

          {/* Protected Vendor Routes */}
          <Route element={<VendorGuard />}>
            <Route path="/vendor/dashboard" element={<VendorDashboard />} />
            <Route path="/vendor/products" element={<VendorProducts />} />
            <Route path="/vendor/products/new" element={<ProductFormStepper />} />
            <Route path="/vendor/products/:id" element={<ProductFormStepper />} />
            <Route path="/vendor/:vendorId/products" element={<VendorProductsPage />} />
            <Route path="/vendor/categories" element={<CategoriesPage />} />
            <Route path="/vendor/orders" element={<VendorOrders />} />
            <Route path="/vendor/pod" element={<VendorPOD />} />
            <Route path="/vendor/payouts" element={<VendorPayouts />} />
            <Route path="/vendor/settings" element={<VendorSettings />} />
            {/* Add more vendor routes here in the future */}
          </Route>

          {/* Protected Admin Routes */}
          <Route element={<AdminGuard />}>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/orders" element={<Orders />} />
            <Route path="/admin/categories" element={<CategoryManagement />} />
            <Route path="/ops/recon" element={<OpsReconciliation />} />
          </Route>

          {/* Protected Rider Routes */}
          <Route element={<RiderGuard />}>
            <Route path="/rider" element={<RiderDashboard />} />
            <Route path="/rider/:orderId" element={<RiderOrderDetail />} />
          </Route>

          {/* Onboarding Utilities (for testing/settings) */}
          <Route path="/onboarding/reset" element={<OnboardingReset />} />
          <Route path="/onboarding/demo" element={<OnboardingDemo />} />
          
          {/* 404 Not Found */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}

export default AppRouter;
