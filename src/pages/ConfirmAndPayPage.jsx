import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Wallet, CreditCard, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { calculateFare as calculateServiceFare, formatNaira, getServiceDescription, generateOrderCode, notifyVendor } from '../utils/serviceFareCalculator';
import { calculateFare, getFareBreakdown } from '../utils/fareUtils';
import { buildParcelOrderPricing } from '../utils/orderPricing';
import { db } from '../config/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { payForDeliveryWithWallet } from '../services/customerWalletService';
import { subscribeToUnifiedWalletBalance } from '../utils/walletBalance';
import { usePaystackPayment } from 'react-paystack';
import Swal from 'sweetalert2';
import PaymentSuccessModal from '../components/PaymentSuccessModal';

/**
 * 💳 CONFIRM & PAY - Enhanced Checkout Page
 * Dynamic service-based checkout with Wallet and Paystack integration
 * Date: October 23, 2025
 */

const ConfirmAndPayPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  // Extract checkout data from navigation state
  const {
    serviceType = 'parcel',
    distance = 0,
    itemTotal = 0,
    items = [],
    vendor = null,
    pickup = null,
    dropoff = null,
    deliveryDetails = null,
    recipientInfo = null,
    packageDetails = null,
    calculatedFare = null, // 🎯 CRITICAL: Get the actual fare from BookDelivery
    pricingBreakdown = null // 🎯 CRITICAL: Get the pricing breakdown from BookDelivery
  } = location.state || {};

  const [fareData, setFareData] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderData, setOrderData] = useState(null);

  // Paystack configuration
  const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxx';

  // Calculate fare on mount using same system as BookDelivery
  useEffect(() => {
    console.log('📥 CONFIRM & PAY RECEIVED calculatedFare:', calculatedFare);
    console.log('📥 CONFIRM & PAY RECEIVED pricingBreakdown:', pricingBreakdown);
    console.log('📥 CONFIRM & PAY RECEIVED distance:', distance);
    
    // 🎯 CRITICAL FIX: Use the exact fare passed from BookDelivery instead of recalculating
    // Total always includes the admin-set platform fee (grandTotal), matching BookDelivery.
    if (calculatedFare && pricingBreakdown) {
      const pricing = buildParcelOrderPricing({ deliveryFee: calculatedFare, itemTotal: itemTotal || 0 });
      const passedFare = {
        deliveryFee: pricing.deliveryFee,
        packagingFee: 0,
        itemTotal: pricing.itemTotal,
        baseFee: pricingBreakdown.baseFee || 0,
        distanceFee: pricingBreakdown.distanceFee || 0,
        serviceFee: 0,
        packageSurcharge: pricingBreakdown.packageSurcharge || 0,
        platformFee: pricing.platformFee,
        subtotal: pricing.grandTotal,
        total: pricing.grandTotal
      };
      
      setFareData(passedFare);
      console.log('✅ Using EXACT fare from BookDelivery:', passedFare);
      console.log('✅ DISPLAY TOTAL:', passedFare.total);
    } else {
      // Fallback: Use the same fare calculation system as BookDelivery.jsx
      const totalFare = calculateFare(distance, 0); // distance in km, 0 minutes for now
      const pricing = buildParcelOrderPricing({ deliveryFee: totalFare, itemTotal: itemTotal || 0 });
      
      const fallbackFare = {
        deliveryFee: pricing.deliveryFee,
        packagingFee: 0,
        itemTotal: pricing.itemTotal,
        platformFee: pricing.platformFee,
        subtotal: pricing.grandTotal,
        total: pricing.grandTotal
      };
      
      setFareData(fallbackFare);
      console.log('⚠️ No fare passed, calculated using fareUtils:', fallbackFare);
    }
  }, [serviceType, distance, itemTotal, calculatedFare, pricingBreakdown]);

  // Load wallet balance (canonical wallets/{uid} + legacy users.walletBalance)
  useEffect(() => {
    if (!user?.uid) {
      setWalletBalance(0);
      setIsLoadingWallet(false);
      return;
    }
    setIsLoadingWallet(true);
    const unsub = subscribeToUnifiedWalletBalance(user.uid, (balance) => {
      setWalletBalance(balance);
      setIsLoadingWallet(false);
    });
    return unsub;
  }, [user]);

  // Paystack configuration
  const paystackConfig = {
    email: user?.email || 'guest@go7.ng',
    amount: fareData ? Math.round(fareData.total * 100) : 0, // Convert to kobo
    publicKey: paystackPublicKey,
    reference: `GO7_${Date.now()}_${user?.uid || 'guest'}`,
    metadata: {
      custom_fields: [
        {
          display_name: 'Service Type',
          variable_name: 'service_type',
          value: serviceType
        },
        {
          display_name: 'User ID',
          variable_name: 'user_id',
          value: user?.uid || 'guest'
        }
      ]
    }
  };

  const onPaystackSuccess = (reference) => {
    console.log('✅ Paystack payment successful:', reference);
    console.log('📦 Current fareData:', fareData);
    console.log('👤 Current user:', user);
    
    // Create order with the payment reference
    createOrder('paystack', reference.reference);
  };

  const onPaystackClose = () => {
    console.log('❌ Paystack payment closed');
    Swal.fire({
      icon: 'info',
      title: 'Payment Cancelled',
      text: 'You closed the payment window',
      confirmButtonColor: '#e61e25'
    });
  };

  const initializePaystackPayment = usePaystackPayment(paystackConfig);

  // Create order in Firebase
  const createOrder = async (paymentMethod, paymentReference = null) => {
    if (!user) {
      Swal.fire({
        icon: 'warning',
        title: 'Login Required',
        text: 'Please login to complete your order',
        confirmButtonColor: '#e61e25'
      });
      navigate('/login');
      return;
    }

    if (!fareData || !fareData.total) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Order details are incomplete. Please refresh and try again.',
        confirmButtonColor: '#e61e25'
      });
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🛒 Creating order with fareData:', fareData);
      console.log('💳 Payment method:', paymentMethod);
      console.log('📝 Payment reference:', paymentReference);
      
      // Prepare order data
      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        serviceType,
        status: 'Pending',
        paymentMethod,
        paymentStatus: paymentMethod === 'wallet' ? 'pending' : (paymentReference ? 'paid' : 'pending'),
        paymentReference,
        
        // Fare details
        deliveryFee: fareData.deliveryFee,
        packagingFee: fareData.packagingFee || 0,
        itemTotal: fareData.itemTotal || 0,
        subtotal: fareData.subtotal,
        total: fareData.total,
        distance: fareData.distance,
        
        // Items (for shopping services)
        items: items || [],
        
        // Location details
        pickup: pickup || null,
        dropoff: dropoff || null,
        
        // Additional details
        deliveryDetails: deliveryDetails || null,
        recipientInfo: recipientInfo || null,
        packageDetails: packageDetails || null,
        vendor: vendor || null,
        
        // Metadata
        fareBreakdown: fareData.breakdown,
        description: fareData.description,
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        date: new Date().toISOString()
      };

      // Create order document
      const ordersRef = collection(db, 'orders');
      const orderDoc = await addDoc(ordersRef, orderData);
      
      console.log('✅ Order created:', orderDoc.id);

      // If wallet payment, deduct then mark paid (never leave free "paid" orders)
      if (paymentMethod === 'wallet') {
        try {
          await deductWalletBalance(orderDoc.id);
          await updateDoc(doc(db, 'orders', orderDoc.id), {
            paymentStatus: 'paid',
            updatedAt: serverTimestamp(),
          });
        } catch (debitError) {
          await updateDoc(doc(db, 'orders', orderDoc.id), {
            paymentStatus: 'failed',
            status: 'Cancelled',
            updatedAt: serverTimestamp(),
          }).catch(() => {});
          throw debitError;
        }
      }

      // Log analytics event
      logCheckoutComplete(paymentMethod);

      // Generate order code
      const orderCode = generateOrderCode();

      // Prepare data for vendor notification
      const vendorNotificationData = {
        orderCode,
        serviceType,
        total: fareData.total,
        paymentMethod,
        vendor: vendor?.name || 'Go7',
        pickup: pickup?.address || 'N/A',
        dropoff: dropoff?.address || 'N/A'
      };

      // Notify vendor
      notifyVendor(vendorNotificationData);

      // Prepare success modal data
      const successData = {
        orderCode,
        orderId: orderDoc.id,
        serviceType,
        total: fareData.total,
        paymentMethod: paymentMethod === 'wallet' ? 'Go7 Wallet' : 'Paystack'
      };

      console.log('✅ Order created successfully:', successData);

      // Show success modal
      setOrderData(successData);
      setShowSuccessModal(true);

      // Also show a SweetAlert confirmation
      Swal.fire({
        icon: 'success',
        title: '✅ Payment Successful!',
        html: `
          <div class="text-center">
            <p class="text-lg font-bold mb-2">Order Code: ${orderCode}</p>
            <p class="text-sm text-gray-600">Total: ₦${fareData.total.toLocaleString()}</p>
            <p class="text-sm text-gray-600 mt-2">Your delivery has been booked successfully!</p>
          </div>
        `,
        confirmButtonText: 'View Order',
        confirmButtonColor: '#e61e25'
      });

      setIsProcessing(false);

    } catch (error) {
      console.error('❌ Error creating order:', error);
      Swal.fire({
        icon: 'error',
        title: 'Order Failed',
        text: error.message || 'Unable to process your order. Please try again.',
        confirmButtonColor: '#e61e25'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Deduct wallet balance via Cloud Function (client balance writes are blocked by rules)
  const deductWalletBalance = async (orderId) => {
    try {
      const amount = fareData.total;
      const result = await payForDeliveryWithWallet(
        user.uid,
        orderId,
        amount,
        fareData.description || 'Book Delivery'
      );
      if (!result?.success) {
        throw new Error(result?.message || 'Wallet debit failed');
      }
      setWalletBalance((prev) => Math.max(0, prev - amount));
      console.log('Wallet deducted successfully');
      return result;
    } catch (error) {
      console.error('Error deducting wallet:', error);
      throw error;
    }
  };

  // Handle wallet payment
  const handleWalletPayment = async () => {
    if (walletBalance < fareData.total) {
      Swal.fire({
        icon: 'warning',
        title: 'Insufficient Balance',
        html: `
          <div class="text-center">
            <p class="mb-2">Your wallet balance is insufficient</p>
            <p class="text-sm text-gray-600">
              Balance: <strong>₦${walletBalance.toLocaleString()}</strong><br>
              Required: <strong style="color: #e61e25;">₦${fareData.total.toLocaleString()}</strong>
            </p>
            <p class="text-sm mt-3">Please top up your wallet or use Paystack</p>
          </div>
        `,
        confirmButtonText: 'Top Up Wallet',
        showCancelButton: true,
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#e61e25',
        cancelButtonColor: '#6b7280'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/wallet-topup');
        }
      });
      return;
    }

    // Confirm wallet payment
    const result = await Swal.fire({
      icon: 'question',
      title: 'Confirm Payment',
      html: `
        <div class="text-center">
          <p class="mb-2">Pay with Go7 Wallet</p>
          <p class="text-3xl font-bold" style="color: #e61e25;">₦${fareData.total.toLocaleString()}</p>
          <p class="text-sm text-gray-600 mt-3">
            Your balance after payment: <strong>₦${(walletBalance - fareData.total).toLocaleString()}</strong>
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirm Payment',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#e61e25',
      cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed) {
      await createOrder('wallet');
    }
  };

  // Handle Paystack payment
  const handlePaystackPayment = () => {
    // Validate fareData is available
    if (!fareData || !fareData.total) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Unable to process payment. Please refresh the page and try again.',
        confirmButtonColor: '#e61e25'
      });
      return;
    }

    setSelectedPaymentMethod('paystack');
    initializePaystackPayment(onPaystackSuccess, onPaystackClose);
  };

  // Log analytics
  const logCheckoutComplete = (paymentMethod) => {
    try {
      // Log to console (replace with actual analytics service)
      console.log('📊 Analytics: checkout_complete', {
        userStatus: user ? 'auth' : 'guest',
        serviceType,
        total: fareData.total,
        paymentMethod,
        timestamp: new Date().toISOString()
      });

      // TODO: Add actual analytics integration (e.g., Firebase Analytics, Google Analytics)
    } catch (error) {
      console.error('Analytics logging failed:', error);
    }
  };

  // Redirect if no checkout data
  if (!location.state || !fareData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <AlertCircle size={64} className="text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Checkout Data</h2>
          <p className="text-gray-600 mb-6">Please start a new order to proceed</p>
          <button
            onClick={() => navigate('/')}
            className="bg-red-600 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-red-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const hasInsufficientBalance = walletBalance < fareData.total;

  return (
    <>
      <Helmet>
        <title>Confirm & Pay - {fareData?.description || serviceType || 'Delivery'} | Go7</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              disabled={isProcessing}
            >
              <ArrowLeft size={24} className="text-gray-900" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Confirm & Pay</h1>
              <p className="text-sm text-gray-600">{fareData.description}</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-32">
          {/* Service Summary */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 text-lg">Order Summary</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Service Type</span>
                <span className="font-semibold text-gray-900 capitalize">{serviceType}</span>
              </div>

              {fareData.distance > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Distance</span>
                  <span className="font-semibold text-gray-900">{fareData.distance} km</span>
                </div>
              )}

              {fareData.itemTotal > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Items Total</span>
                  <span className="font-semibold text-gray-900">₦{fareData.itemTotal.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-semibold text-gray-900">₦{fareData.deliveryFee.toLocaleString()}</span>
              </div>

              {fareData.packagingFee > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Packaging Fee</span>
                  <span className="font-semibold text-gray-900">₦{fareData.packagingFee.toLocaleString()}</span>
                </div>
              )}

              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-900">₦{fareData.subtotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-red-50 rounded-xl p-4 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold" style={{ color: '#e61e25' }}>
                    ₦{fareData.total.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Includes delivery & service fee
                </p>
              </div>
            </div>
          </div>

          {/* Wallet Balance Display */}
          {user && (
            <div className="bg-purple-50 rounded-2xl p-5 border-2 border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet size={20} className="text-purple-600" />
                  <span className="font-semibold text-gray-900">Wallet Balance</span>
                </div>
                {isLoadingWallet ? (
                  <Loader size={20} className="animate-spin text-purple-600" />
                ) : (
                  <span className="text-xl font-bold text-purple-600">
                    ₦{walletBalance.toLocaleString()}
                  </span>
                )}
              </div>
              {!isLoadingWallet && hasInsufficientBalance && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Insufficient balance for wallet payment
                </p>
              )}
            </div>
          )}

          {/* Payment Methods */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Select Payment Method</h3>
            
            <div className="space-y-3">
              {/* Wallet Payment */}
              <button
                onClick={handleWalletPayment}
                disabled={isProcessing || !user || isLoadingWallet || hasInsufficientBalance}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  hasInsufficientBalance || !user
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                    : 'border-gray-300 hover:border-purple-600 hover:bg-purple-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wallet size={24} className="text-purple-600" />
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Pay with Wallet</div>
                    <div className="text-xs text-gray-600">
                      {!user ? 'Login required' : hasInsufficientBalance ? 'Insufficient balance' : 'Instant payment'}
                    </div>
                  </div>
                </div>
                {!user && <span className="text-xs text-gray-500">Login first</span>}
              </button>

              {/* Paystack Payment */}
              <button
                onClick={handlePaystackPayment}
                disabled={isProcessing}
                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-red-600 bg-red-600 hover:bg-red-700 transition-all text-white"
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={24} />
                  <div className="text-left">
                    <div className="font-semibold">Pay with Paystack</div>
                    <div className="text-xs opacity-90">Card, Bank Transfer, USSD</div>
                  </div>
                </div>
                <span className="text-sm font-semibold">Recommended</span>
              </button>
            </div>
          </div>

          {/* Loading Overlay */}
          {isProcessing && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center">
                <Loader size={48} className="animate-spin text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Processing Payment</h3>
                <p className="text-sm text-gray-600">Please wait...</p>
              </div>
            </div>
          )}

          {/* Payment Success Modal */}
          <PaymentSuccessModal
            isOpen={showSuccessModal}
            onClose={() => {
              setShowSuccessModal(false);
              navigate('/');
            }}
            orderData={orderData}
            onTrackOrder={() => {
              setShowSuccessModal(false);
              navigate(`/track/${orderData?.orderId}`);
            }}
          />
        </div>
      </div>
    </>
  );
};

export default ConfirmAndPayPage;
