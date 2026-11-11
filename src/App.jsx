import React, { useState, useEffect, lazy, Suspense } from 'react';
import { db } from './config/firebase';
import { subscribePricingSettings } from './utils/pricingSettings';
import { Routes, Route, useLocation, BrowserRouter, useParams, useNavigate, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Toaster as SonnerToaster } from 'sonner';
import { useMobileRedirect } from './hooks/useMobileRedirectFixed.js';

// 🚀 CONNECTION FIX: Import performance utilities
// import './utils/devMonitor.js'; // COMMENTED OUT - May cause loading issues
// import './utils/migrateToVendorPaths.js'; // 🔥 COMMENTED OUT - Migration causing loading issues
// import { safeImport } from './utils/importBatcher.js'; // Batch imports to prevent overload
// import './utils/autoFixVendors'; // Disabled — not needed on every page load
import { LocationProvider } from './contexts/LocationContext.jsx';
import { DeliveryProvider } from './contexts/DeliveryContext.jsx';
import { OrderProvider } from './contexts/OrderContext.jsx';
import { PointsProvider } from './contexts/PointsContext.jsx';
import { NotificationProvider } from './contexts/NotificationContext.jsx';
// import { initSentry } from './lib/sentry.js';
// import { NotificationPermissionBanner } from './hooks/useFCMNotifications.jsx'; // TEMPORARILY COMMENTED - FILE MISSING
// import './utils/pwaManager'; // COMMENTED OUT - FILE MISSING
import Home from './pages/Home.jsx';
import SimpleHome from './pages/SimpleHome.jsx';
import MobileHome from './pages/MobileHome.jsx'; // GO7 Figma mobile home
// Special test imports
// import HomeV2Test from './pages/HomeV2Test'; // COMMENTED OUT - FILE MISSING
// import MobileHomeTest from './pages/MobileHomeTest'; // COMMENTED OUT - FILE MISSING
import Navigation from './components/Navigation.jsx';
import BottomNav from './components/BottomNav.jsx'; // Mobile bottom navigation
import FloatingCartIcon from './components/FloatingCartIcon.jsx';
import ProductDebugger from './components/ProductDebugger.jsx';
import AutoProductFixer from './components/AutoProductFixer.jsx';

// Search and Explore pages
import SearchResults from './pages/SearchResults.jsx';
import ExploreAbeokuta from './pages/ExploreAbeokuta.jsx';

// Cart system components
import CartPage from './pages/CartPage.jsx';
import FloatingCartButton from './components/FloatingCartButton.jsx';
import VendorSwitchModal from './components/VendorSwitchModal.jsx';
import ErrorToast from './components/ErrorToast.jsx';

// Main navigation pages
import Orders from './pages/FigmaOrdersPage.jsx';
import Track from './pages/FigmaTrackPage.jsx';
import Chat from './pages/FigmaChatPage.jsx';
import Profile from './pages/Profile.jsx';
import FigmaProfilePage from './pages/FigmaProfilePage.jsx';
import FigmaOrdersPage from './pages/FigmaOrdersPage.jsx';
import FigmaTrackPage from './pages/FigmaTrackPage.jsx';
import FigmaChatPage from './pages/FigmaChatPage.jsx';
// import ProfileScreen from './screens/ProfileScreen.jsx'; // OLD - Legacy profile (removed)
import HistoryScreen from './screens/HistoryScreen.jsx'; // Unified transactions & orders history
import RecoverPayment from './pages/RecoverPayment.jsx'; // Payment recovery page
import TransactionDebugger from './pages/TransactionDebugger.jsx'; // Debug transactions and notifications
import AddPhoneModal from './components/AddPhoneModal.jsx'; // Phone number prompt for existing users
import OnboardingScreen from './screens/Onboarding/OnboardingScreen.jsx'; // Onboarding flow
import ProfileGuard from './components/auth/ProfileGuard.jsx'; // Profile access guard
import TestRoute from './pages/TestRoute.jsx';
import RoutesDebug from './pages/RoutesDebug.jsx';
// Updated import for new mobile homepage implementation
import MobileHomePage from './pages/MobileHome.jsx';
import HomePage from './pages/HomePage.jsx';
import HomeExact from './pages/HomeExact.jsx';
import HomePageTailwind from './pages/HomePageTailwind.jsx';
import HomeClean from './pages/HomeClean.tsx';
import SimpleMobilePage from './pages/SimpleMobilePage.jsx';

// Home handles mobile vs desktop layout internally.
const ResponsiveHome = () => <Home />;

// Removed duplicate: import SimpleHome from './pages/SimpleHome.jsx';
import BurgerIconTest from './pages/BurgerIconTest.jsx';
import AddOnSystemDemo from './pages/AddOnSystemDemo.jsx';
import VendorAddOnPortal from './pages/VendorAddOnPortal.jsx';
import VendorAddonsPage from './pages/VendorAddonsPage.jsx';
import PremiumModalDemo from './pages/PremiumModalDemo.jsx';
import VendorProductManagement from './pages/VendorProductManagement.tsx';
import DeliveryDemo from './pages/DeliveryDemo.jsx'; // 🚀 DEMO: Complete delivery system demonstration
import TransitProgressDemo from './pages/TransitProgressDemo.jsx'; // 🎯 DEMO: Transit progress bar component
import TrackingSimulation from './pages/TrackingSimulation.jsx'; // 🧪 LAB: Advanced tracking simulation & optimization

import MobileTest from './pages/MobileTest.jsx';
// import HomeFixed from './pages/HomeFixed'; // TEMPORARILY COMMENTED - FILE MISSING
// import HomeSimple from './pages/HomeSimple'; // TEMPORARILY COMMENTED - FILE MISSING
// import HomeTest from './pages/HomeTest'; // TEMPORARILY COMMENTED - FILE MISSING
const ReferralLanding = lazy(() => import('./pages/ReferralLanding.jsx'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.jsx'));
const PartnerDashboard = lazy(() => import('./pages/PartnerDashboard.jsx'));
const MealBundlesPage = lazy(() => import('./pages/MealBundlesPage.jsx'));
const BookDelivery = lazy(() => import('./pages/BookDelivery.jsx'));
const BookDeliveryAIChat = lazy(() => import('./features/bookDeliveryAI/DeliveryChat.jsx'));
const AdminDashboardNew = lazy(() => import('./pages/AdminDashboardNew.jsx'));
// import BookDeliverySimple from './pages/BookDeliverySimple'; // TEMPORARILY COMMENTED - FILE MISSING
// import BookDeliveryWithAutoDispatch from './pages/BookDeliveryWithAutoDispatch.jsx'; // TEMPORARILY COMMENTED - IMPORT ISSUES
// REMOVED DUPLICATE IMPORTS
// import TrackPackage from './pages/TrackPackage'; // TEMPORARILY COMMENTED - FILE MISSING
// import TrackPageFirebase from './pages/TrackPage.tsx'; // TEMPORARILY COMMENTED - FILE MISSING
// import TrackPageNew from './pages/TrackPageNew.tsx'; // TEMPORARILY COMMENTED - FILE MISSING
const LiveDeliveryTrackingPage = lazy(() => import('./pages/LiveDeliveryTrackingPage.jsx'));
const BillsPage = lazy(() => import('./pages/BillsPage.jsx'));
const FuelOrderPage = lazy(() => import('./pages/FuelOrderPage.jsx'));
const TrackOrder = lazy(() => import('./pages/TrackOrder.jsx'));
// import TrackOrderNew from './pages/TrackOrderNew.jsx'; // TEMPORARILY COMMENTED - FILE MISSING // New Firestore tracking page
// import TrackForm from './pages/TrackForm.jsx'; // TEMPORARILY COMMENTED - FILE MISSING // Track ID entry form
import DeliveryTrackingPage from './pages/DeliveryTrackingPage.jsx'; // New Real-time delivery tracking page
import DeliveryTrackingPageNew from './pages/DeliveryTrackingPageNew.tsx'; // Enhanced MapTiler delivery tracking
import TrackDelivery from './pages/TrackDelivery.jsx'; // Uber-style OSRM tracking with Firebase real-time updates
import TrackDeliveryProduction from './components/TrackDelivery.jsx'; // Production real-time delivery tracking with Google Maps + Firebase
import DeliveryTrackingDemo from './pages/DeliveryTrackingDemo.jsx'; // Demo page for testing production tracking system
import Go7UberTracking from './pages/Go7UberTracking.jsx'; // Uber-style live tracking with chat
import SimpleTracking from './pages/SimpleTracking.jsx'; // Simple working map
import TestPage from './pages/TestPage.jsx'; // Test routing
import Go7GoogleTracking from './pages/Go7GoogleTracking.jsx'; // Google Maps tracking
import WorkingTracking from './pages/WorkingTracking.jsx'; // Working tracking page
import Go7ChatPage from './pages/Go7ChatPage.jsx'; // Real-time chat with Firebase
import Go7RiderChat from './pages/Go7RiderChat.jsx'; // Rider chat synced with customer
import Go7PointsPage from './pages/Go7PointsPage.jsx'; // Go7 Points management page
import WalletTopUp from './pages/WalletTopUp.jsx'; // Wallet top-up with Paystack
import PaystackTestPage from './pages/PaystackTestPage.jsx'; // Paystack payment testing
import PaystackDebug from './components/PaystackDebug.jsx'; // Paystack debug tool
import PaystackDebugPage from './pages/PaystackDebugPage.jsx'; // Comprehensive Paystack SDK debug
import WalletDebugTest from './pages/WalletDebugTest.jsx'; // Wallet payment debug test
import PaymentFlowTest from './pages/PaymentFlowTest.jsx'; // Payment flow test with proper metadata
import ProfileAddMoneyDebug from './pages/ProfileAddMoneyDebug.jsx'; // Profile add money debug test
import FirestoreDebug from './pages/FirestoreDebug.jsx'; // Firestore connection debugger
import FirebaseEnvDebug from './components/FirebaseEnvDebug.jsx'; // Firebase environment debugger
import FirebaseAuthDebug from './components/FirebaseAuthDebug.jsx'; // Firebase authentication debugger
import CustomerOrderChatRoute from './pages/CustomerOrderChatRoute.jsx';
import MobileLiveTracking from './pages/MobileLiveTracking.jsx'; // Mobile-optimized live tracking (exact UI match)
import SmartTrackingRouter from './components/SmartTrackingRouter.jsx'; // Universal tracking router with device detection
// import TestPage from './pages/TestPage'; // TEMPORARILY COMMENTED - FILE MISSING
// import MapDemo from './pages/MapDemo'; // TEMPORARILY COMMENTED - FILE MISSING
import StyledMapDemo from './pages/StyledMapDemo.jsx';
import Go7MapDemo from './pages/Go7MapDemo.jsx';
import Go7MapTest from './pages/Go7MapTest.jsx';
import SimpleMapTest from './components/SimpleMapTest.jsx';
import Go7MapSimple from './components/Go7MapSimple.jsx';
import MapNavigation from './pages/MapNavigation.jsx';
import SimpleMap from './pages/SimpleMap.jsx';
// import TestDeliveryCreator from './pages/TestDeliveryCreator.jsx'; // TEMPORARILY COMMENTED - FILE MISSING
// import Reconciliation from './pages/ops/Reconciliation.tsx'; // TEMPORARILY COMMENTED - FILE MISSING
// import OpsReconciliation from './pages/ops/OpsReconciliation.jsx'; // TEMPORARILY COMMENTED - FILE MISSING
// import OpsBoard from './pages/OpsBoard.jsx'; // TEMPORARILY COMMENTED - FILE MISSING
// import Dispatch from './pages/ops/Dispatch.tsx'; // TEMPORARILY COMMENTED - FILE MISSING
// import MaskedContactDemo from './pages/MaskedContactDemo.jsx'; // TEMPORARILY COMMENTED - FILE MISSING
// import RiderInterface from './pages/RiderInterface.jsx'; // TEMPORARILY COMMENTED - SYNTAX ERRORS
import RiderAdmin from './pages/RiderAdmin.jsx';
import SimpleRider from './pages/SimpleRider.jsx';
import Rider from './pages/Rider.jsx'; // Enhanced rider page
import RiderSimple from './pages/RiderSimple.jsx';
import RiderConsole from './pages/RiderConsole.tsx'; // New Firestore-based rider console
// import RiderPage from './pages/RiderPage.jsx'; // TEMPORARILY COMMENTED - FIREBASE CONFIG ISSUES
import AdminDashboardPage from './pages/AdminDashboard.jsx'; // New unified admin dashboard
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminSetup from './pages/admin/AdminSetup.jsx';
import DashboardWithTabs from './pages/admin/DashboardWithTabs.jsx'; // Admin dashboard with category tabs
import CategoryManagement from './pages/admin/CategoryManagement.jsx'; // Category management for admin
import AdminOrders from './pages/admin/Orders.jsx'; // Admin orders management
import AdminDeliveries from './pages/admin/Deliveries.jsx'; // Admin deliveries management
import AdminRiders from './pages/admin/Riders.jsx'; // Admin riders management
import WhatsAppNotificationsPage from './pages/admin/WhatsAppNotificationsPage.jsx'; // WhatsApp notification logs
import FCMBroadcastPage from './pages/admin/FCMBroadcastPage.jsx'; // FCM push broadcast
// Test data panel removed - using real products from database
import VendorWallet from './pages/VendorWallet.jsx'; // Vendor wallet and payout system
// import CustomerTracking from './pages/CustomerTracking.jsx'; // TEMPORARILY COMMENTED - SYNTAX ERRORS
// import VendorDashboard from './pages/vendor/VendorDashboard.tsx'; // TEMPORARILY COMMENTED - FILE MISSING
// import AutoDispatchRider from './pages/AutoDispatchRider.jsx'; // TEMPORARILY COMMENTED - FILE MISSING
// import AutoDispatchDashboard from './pages/AutoDispatchDashboard.jsx'; // TEMPORARILY COMMENTED - FILE MISSING
// import AutoDispatchOrderForm from './pages/AutoDispatchOrderForm.jsx'; // TEMPORARILY COMMENTED - FILE MISSING
// import SeedPage from './pages/ops/SeedPage.jsx'; // TEMPORARILY COMMENTED - FILE MISSING
// import SeedData from './ops/SeedData.jsx'; // TEMPORARILY COMMENTED - FILE MISSING
// import OrdersApiDemo from './pages/OrdersApiDemo.jsx'; // TEMPORARILY COMMENTED - FILE MISSING
// import PaymentVerifyPage from './pages/PaymentVerifyPage.jsx'; // TEMPORARILY COMMENTED - FILE MISSING
import CustomerDashboard from './pages/CustomerDashboard.jsx'; // Customer dashboard with wallet integration
import TrackingQueryRedirect from './components/TrackingQueryRedirect.jsx';
import MapTrackingTest from './pages/MapTrackingTest.jsx'; // Live tracking demo and test page
import ReactTest from './pages/ReactTest.jsx'; // Basic React rendering test
// import { WalletManagement } from './components/wallet'; // TEMPORARILY COMMENTED - WALLET SERVICE MISSING
import { RidersProvider } from './state/state/ridersStore'; // Enhanced riders state
// import { VendorProvider } from './contexts/VendorContext'; // TEMPORARILY COMMENTED - FILE MISSING
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
// Old cart provider replaced with Zustand store
// CartDrawer and CheckoutBar removed - replaced with new cart system
// Removed duplicate: import { NotificationProvider } from './contexts/NotificationContext.jsx';
const Cart = lazy(() => import('./pages/Cart.jsx'));
import FoodCheckout from './pages/FoodCheckout.jsx'; // Food checkout with wallet & Paystack integration
import OrderSuccess from './pages/OrderSuccess.jsx'; // Order confirmation page
import Checkout from './pages/Checkout.jsx'; // New checkout page
import CartPaystack from './pages/CartPaystack.jsx'; // Modern cart with Paystack integration
import VendorsExplore from './pages/VendorsExplore.jsx'; // Auto-listing vendors explore page
import VendorSections from './components/VendorSections.jsx'; // Auto-populated vendor sections for homepage
// import AddToHomeScreenPrompt from './components/AddToHomeScreenPrompt.tsx'; // TEMPORARILY COMMENTED - FILE MISSING
import MobileNavBar from './components/MobileNavBar.jsx'; // Go7 mobile bottom navigation - light theme

import RouteDebugger from './pages/RouteDebugger.jsx';
import RouteDiagnostic from './pages/RouteDiagnostic.jsx';
import TestOrders from './pages/TestOrders.jsx';
import TestChat from './pages/TestChat.jsx';
import TestProfile from './pages/TestProfile.jsx';
import FirebaseDebug from './pages/FirebaseDebug.jsx'; // Firebase API key debug tool
import NotificationSettings from './components/NotificationSettings.jsx'; // FCM notification settings

// Rider dashboard pages
import RiderOrders from './pages/rider/Orders.jsx'; // Rider order management
import OrderDetail from './pages/rider/OrderDetail.jsx'; // Rider order detail with status updates
import RiderNavigationMap from './pages/RiderNavigationMap.jsx'; // Rider navigation with live location upload

// Vendor pages
import VendorRegister from './pages/VendorRegister.jsx'; // Vendor registration
import VendorLogin from './pages/VendorLogin.jsx'; // Vendor login
import VendorDashboard from './pages/VendorDashboard.jsx'; // Vendor dashboard with orders management
import VendorDashboardV2 from './pages/VendorDashboardV2.jsx'; // Enhanced V2 vendor dashboard with analytics
import VendorDashboardAlerts from './components/VendorDashboardAlerts.jsx'; // Vendor order alerts and status management
import VendorDebugPage from './pages/VendorDebugPage.jsx'; // Vendor registration debugging tool

// Agent pages
import AgentLogin from './pages/AgentLogin.jsx'; // Agent login
import AgentSignup from './pages/AgentSignup.jsx'; // Agent signup/registration
import AgentEarningsDemo from './pages/AgentEarningsDemo.jsx'; // Agent onboarding and earnings demo
import AgentDashboard from './components/AgentDashboard.jsx'; // Agent dashboard
import AdminEarningsPanel from './components/AdminEarningsPanel.jsx'; // Admin agent earnings management

// Route guards
import AdminGuard from './components/AdminGuard.jsx'; // Protects admin routes
import RiderGuard from './components/RiderGuard.jsx'; // Protects rider routes
import VendorGuard from './components/guards/VendorGuard.jsx'; // Protects vendor routes
import PathNormalizer from './components/PathNormalizer.jsx';
import NotFound from './pages/NotFound.jsx';

// Agent dashboard redirect: reads localStorage agentId and redirects
const AgentDashboardRedirect = () => {
  const storedId = localStorage.getItem('agentId');
  if (storedId) {
    return <Navigate to={`/agent/${storedId}`} replace />;
  }
  return <Navigate to="/agent/login" replace />;
};

// Mobile app pages
import OrdersPage from './pages/OrdersPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import MarketPage from './pages/MarketPage.tsx'; // Local markets page
import PharmacyPage from './pages/PharmacyPage.tsx'; // Pharmacy page
import SimpleModalDemo from './pages/SimpleModalDemo.jsx'; // Modal system demo page
import CleanModalDemo from './pages/CleanModalDemo.jsx'; // Clean modal demo page
import UnifiedDeliveryDemo from './pages/UnifiedDeliveryDemo.jsx'; // Unified delivery system demo
import Explore from './pages/Explore.jsx'; // Product exploration page
// SearchResults already imported above at line 28
import FareCalculatorDemo from './pages/FareCalculatorDemo.jsx'; // Go7 Smart Fare Calculator demo
import TestModal from './pages/TestModal.jsx'; // Test modal page
import RoutesList from './pages/RoutesList.jsx'; // Routes list page
import DebugPage from './pages/DebugPage.jsx'; // Debug page for troubleshooting
import FirebaseTest from './pages/FirebaseTest.jsx'; // Firebase connectivity test
import FirebaseAuthTest from './pages/FirebaseAuthTest.jsx'; // Firebase Auth Test Page
import SuperSimple from './pages/SuperSimple.jsx'; // Super simple test
import DeliveryReplay from './pages/DeliveryReplay.jsx'; // Delivery route replay system
import DeliveryReplayTest from './pages/DeliveryReplayTest.jsx'; // Delivery replay test page
import AdminReplayDashboard from './pages/admin/AdminReplayDashboard.jsx'; // Admin replay management
import DownloadRider from './pages/DownloadRider.jsx'; // Rider APK download page

// GoBuy pages
import GoBuyPage from './pages/GoBuyPage.jsx'; // Personal shopping service
import GoBuyOrders from './pages/GoBuyOrders.jsx'; // GoBuy orders list
import GoBuyTracker from './pages/GoBuyTracker.jsx'; // GoBuy order tracking
import GoBuySuccess from './pages/GoBuySuccess.jsx'; // GoBuy success page

// Service Pages - Unified Pricing System
import RestaurantsPage from './pages/RestaurantsPage.jsx'; // Restaurant food delivery
import ShopsPage from './pages/ShopsPage.jsx'; // Retail shopping service
import CustomerMarketplace from './pages/CustomerMarketplace.jsx'; // Customer marketplace - browse ALL vendor products
import CheckoutPage from './pages/CheckoutPage.jsx'; // Unified checkout for all services
import ConfirmAndPayPage from './pages/ConfirmAndPayPage.jsx'; // Enhanced checkout with dynamic pricing

// Go7 Vendor Management System
// VendorDashboard already imported from './pages/VendorDashboard.jsx' on line 170
import VendorOrders from './components/VendorOrders.jsx'; // Vendor orders management
import VendorOrdersLive from './components/VendorOrdersLive.jsx'; // Live order tracking
import Earnings from './components/Earnings.jsx'; // Vendor earnings dashboard
import VendorProducts from './pages/VendorProducts.jsx'; // Product management with Firebase
import VendorPage from './pages/VendorPage.jsx'; // Individual vendor page with products
import VendorProfile from './pages/VendorProfile.jsx'; // Vendor profile page
// VendorLogin and VendorRegister already imported from './pages/' on lines 168-169
import VendorRegistrationSuccess from './pages/vendor/VendorRegistrationSuccess.jsx'; // Registration success page
import VendorAccountCleanup from './pages/VendorAccountCleanup.jsx'; // Admin vendor account cleanup utility
import AdminCleanup from './pages/AdminCleanup.jsx'; // Admin orphaned account cleanup utility

// Go7 Admin Control Panel
import AdminDashboardComponent from './components/AdminDashboard.jsx'; // Admin dashboard with rider sync
import RiderApp from './components/RiderApp.jsx'; // Rider location tracking app

// Go7 Notification Demo
// import Go7NotificationDemo from './components/Go7NotificationDemo.jsx'; // TEMPORARILY COMMENTED - FILE MISSING
import RouteDebugPage from './pages/RouteDebugPage.jsx'; // Route debugging tool

// Authentication
import Login from './pages/Login.jsx'; // Customer/User login

// Rider System
import RiderLogin from './pages/rider/RiderLogin.jsx'; // Rider authentication
import RiderRegister from './pages/rider/RiderRegister.jsx'; // Rider application & document upload
import RiderDashboard from './pages/rider/RiderDashboard.jsx'; // Rider dashboard with jobs
import RiderJob from './pages/rider/RiderJob.jsx'; // Active job tracking with OTP
import RiderEarnings from './pages/rider/RiderEarnings.jsx'; // Earnings and statistics
import RiderSystemTest from './pages/RiderSystemTest.jsx'; // Test panel for seeding data

// Delivery Integration Testing
import DeliveryTestPage from './pages/DeliveryTestPage.jsx'; // Delivery calculation testing
import OrderTrackingPage from './pages/OrderTrackingPage.jsx'; // Live order tracking
import LiveTrackingTestPage from './pages/LiveTrackingTestPage.jsx'; // Live tracking test environment

// Modern Homepage
import ExploreGo7 from './pages/ExploreGo7.jsx'; // Modern mobile homepage with categories, promos, vendors
import ExploreGo7Demo from './pages/ExploreGo7Demo.jsx'; // Demo page for testing
import ExploreGo7Test from './pages/ExploreGo7Test.jsx'; // Simple test page
import ExploreGo7Simple from './pages/ExploreGo7Simple.jsx'; // Ultra simple test
import ExploreGo7Minimal from './pages/ExploreGo7Minimal.jsx'; // No contexts, no Firebase

// Debugging Components
import WalletDebugger from './components/WalletDebugger.jsx'; // Wallet balance debugging tool
import SimpleWalletDebug from './components/SimpleWalletDebug.jsx'; // Simple wallet debug without Firebase functions
import ErrorBoundary from './components/ErrorBoundary.jsx'; // Error boundary to catch JavaScript errors

// Wallet Components
import WalletComponent from './components/WalletComponent.jsx'; // Full wallet with DVA integration
import WalletAutoSetup from './components/WalletAutoSetup.jsx'; // Auto-creates virtual accounts for users
import SignupWithWallet from './components/SignupWithWallet.jsx'; // Signup with auto wallet creation

// Initialize Sentry monitoring
// initSentry();

// Component to render phone prompt inside AuthProvider
const PhonePromptWrapper = () => {
  const location = useLocation();
  const { showPhonePrompt, isLoggedIn, isGuestMode } = useAuth();
  
  // Don't show phone prompt on vendor pages
  const isVendorPage = location.pathname.startsWith('/vendor');
  const shouldShowPhonePrompt = showPhonePrompt && isLoggedIn && !isGuestMode() && !isVendorPage;
  
  if (!shouldShowPhonePrompt) return null;
  
  return <AddPhoneModal onClose={() => {}} />;
};

function AppContent() {
  const location = useLocation();

  // Sync launch/standard fares from admin before any booking page mounts
  useEffect(() => {
    return subscribePricingSettings(db);
  }, []);

  console.log('🚀 App rendering, location:', location.pathname);

  return (
    <AuthProvider>
      <WalletAutoSetup>
      <NotificationProvider>
        <OrderProvider>
          <PointsProvider>
            <LocationProvider>
              <ErrorBoundary>
                <div className="App">
                  <Toaster 
                    position="top-center"
                    containerStyle={{
                      zIndex: 99999,
                    }}
                    toastOptions={{
                      duration: 4000,
                      style: {
                        maxWidth: '500px',
                        padding: '16px',
                        fontSize: '15px',
                        zIndex: 99999,
                      },
                      success: {
                        duration: 5000,
                        style: {
                          background: '#10b981',
                          color: '#fff',
                        },
                      },
                      error: {
                        style: {
                          background: '#ef4444',
                          color: '#fff',
                        },
                      },
                    }}
                  />
                  <SonnerToaster
                    position="top-center"
                    theme="light"
                    closeButton
                    expand
                    visibleToasts={3}
                    offset="calc(env(safe-area-inset-top, 0px) + 12px)"
                    toastOptions={{
                      duration: 4200,
                      classNames: {
                        toast: 'go7-sonner-toast',
                        title: 'go7-sonner-title',
                        description: 'go7-sonner-description',
                      },
                    }}
                  />
                  <Suspense fallback={
                    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-600"></div>
                      <p className="text-sm text-gray-500">Loading page…</p>
                    </div>
                  }>
                  <Routes>
                    <Route path="/" element={<ResponsiveHome />} />
                    <Route path="/r/:code" element={<ReferralLanding />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/partner" element={<PartnerDashboard />} />
                    <Route path="/meal-plans" element={<MealBundlesPage />} />
                    <Route path="/mobile" element={<HomePageTailwind />} />
                    <Route path="/desktop" element={<Home />} />
                    <Route path="/search" element={<SearchResults />} />
                    <Route path="/explore" element={<VendorsExplore />} />
                    <Route path="/explore/map" element={<ExploreAbeokuta />} />
                    <Route path="/go-buy" element={<GoBuyPage />} />
                    <Route path="/book-delivery" element={<BookDeliveryAIChat />} />
                    <Route path="/book-delivery/ai" element={<BookDeliveryAIChat />} />
                    <Route path="/book-delivery/manual" element={<BookDelivery />} />
                    <Route path="/download-rider" element={<DownloadRider />} />
                    <Route path="/onboarding" element={<OnboardingScreen />} />
                    <Route path="/login" element={<OnboardingScreen />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/track" element={<Track />} />
                    <Route path="/track/:orderId" element={<LiveDeliveryTrackingPage />} />
                    <Route path="/track-order/:orderId" element={<LiveDeliveryTrackingPage />} />
                    <Route path="/tracking" element={<TrackingQueryRedirect />} />
                    <Route path="/tracking/:orderId" element={<LiveDeliveryTrackingPage />} />
                    <Route path="/mobile-tracking/:orderId" element={<LiveDeliveryTrackingPage />} />
                    <Route path="/smart-tracking/:orderId" element={<LiveDeliveryTrackingPage />} />
                    <Route path="/bills" element={<BillsPage />} />
                    <Route path="/fuel-order" element={<FuelOrderPage />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/chat/:orderId" element={<CustomerOrderChatRoute />} />
                    <Route path="/profile" element={<FigmaProfilePage />} />
                    <Route path="/profile/:section" element={<FigmaProfilePage />} />
                    
                    {/* Vendor Routes — case/trailing-slash variants are normalized by PathNormalizer before Routes evaluates, so no aliases needed here (React Router matches case-insensitively and a redundant alias route would win the tie and render nothing) */}
                    <Route path="/vendor/login" element={<VendorLogin />} />
                    <Route path="/vendor/register" element={<VendorRegister />} />
                    <Route path="/vendor/:id" element={<VendorPage />} />
                    {/* Vendor protected routes */}
                    <Route element={<VendorGuard />}>
                      <Route path="/vendor/dashboard" element={<VendorDashboard />} />
                      <Route path="/vendor/dashboard/:vendorId" element={<VendorDashboard />} />
                      <Route path="/vendor/:vendorId/profile" element={<VendorProfile />} />
                    </Route>
                    
                    {/* Agent Routes */}
                    <Route path="/agent/login" element={<AgentLogin />} />
                    <Route path="/agent/signup" element={<AgentSignup />} />
                    <Route path="/agent/onboard" element={<AgentEarningsDemo />} />
                    <Route path="/agent/dashboard" element={<AgentDashboardRedirect />} />
                    <Route path="/agent/:agentId" element={<AgentDashboard />} />
                    
                    {/* Admin Login + Setup - public (no guard) */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin/setup" element={<AdminSetup />} />

                    {/* Admin Routes - Protected by AdminGuard */}
                    <Route element={<AdminGuard />}>
                      <Route path="/admin" element={<AdminDashboardNew />} />
                      <Route path="/admin/dashboard" element={<AdminDashboardNew />} />
                      <Route path="/admin/tabs" element={<DashboardWithTabs />} />
                      <Route path="/admin/orders" element={<AdminDashboardNew />} />
                      <Route path="/admin/bookings" element={<AdminDashboardNew />} />
                      <Route path="/admin/gobuy" element={<AdminDashboardNew />} />
                      <Route path="/admin/customers" element={<AdminDashboardNew />} />
                      <Route path="/admin/deliveries" element={<AdminDeliveries />} />
                      <Route path="/admin/riders" element={<AdminDashboardNew />} />
                      <Route path="/admin/vendors" element={<AdminDashboardNew />} />
                      <Route path="/admin/pricing" element={<AdminDashboardNew />} />
                      <Route path="/admin/promos" element={<AdminDashboardNew />} />
                    <Route path="/admin/growth" element={<AdminDashboardNew />} />
                      <Route path="/admin/payments" element={<AdminDashboardNew />} />
                      <Route path="/admin/whatsapp" element={<WhatsAppNotificationsPage />} />
                      <Route path="/admin/fcm-broadcast" element={<FCMBroadcastPage />} />
                      <Route path="/admin/categories" element={<CategoryManagement />} />
                      <Route path="/admin/analytics" element={<AdminDashboardNew />} />
                      <Route path="/admin/agent-earnings" element={<AdminDashboardNew />} />
                      <Route path="/admin/replay" element={<AdminReplayDashboard />} />
                    </Route>
                    
                    {/* Rider Routes - Protected */}
                    <Route path="/rider/login" element={<RiderLogin />} />
                    <Route path="/rider/register" element={<RiderRegister />} />
                    <Route element={<RiderGuard />}>
                      <Route path="/rider" element={<RiderDashboard />} />
                      <Route path="/rider/dashboard" element={<RiderDashboard />} />
                      <Route path="/rider/job" element={<RiderJob />} />
                      <Route path="/rider/job/:orderId" element={<RiderJob />} />
                      <Route path="/rider/earnings" element={<RiderEarnings />} />
                    </Route>
                    
                    {/* GO7 Figma Routes */}
                    <Route path="/GO7Onboarding" element={<OnboardingScreen />} />
                    <Route path="/GO7Profile" element={<FigmaProfilePage />} />
                    <Route path="/GO7Home" element={<MobileHome />} />
                    <Route path="/GO7Explore" element={<VendorsExplore />} />
                    <Route path="/GO7Orders" element={<Orders />} />
                    <Route path="/GO7Cart" element={<CartPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  </Suspense>
                </div>
              </ErrorBoundary>
              
              {/* Auto-fix removed - was blocking the UI */}
              {/* <AutoProductFixer /> */}
            </LocationProvider>
          </PointsProvider>
        </OrderProvider>
      </NotificationProvider>
      </WalletAutoSetup>
    </AuthProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <PathNormalizer>
        <AppContent />
      </PathNormalizer>
    </BrowserRouter>
  );
}

export default App;
