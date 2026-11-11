import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import Swal from 'sweetalert2';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
    getCustomerWalletInfo,
    payForDeliveryWithWallet,
    hasSufficientBalance,
    formatCurrency
} from '../services/customerWalletService';

// MapTiler API configuration
const MAPTILER_KEY = 'nRGZ9lGblbV9lFK2KclL';
const GO7_HUB_COORDINATES = { lat: 7.1475, lng: 3.3619 }; // Abeokuta center

/**
 * GoBuy Page - Personal shopping and delivery service
 * Allows customers to request items to be bought and delivered
 */
const GoBuyPage = () => {
    const navigate = useNavigate();
    const { user } = useAuthContext();

    // Form state
    const [formData, setFormData] = useState({
        itemName: '',
        itemBudget: '',
        deliveryAddress: '',
        uploadedPhoto: null
    });

    // Address autocomplete state
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedCoordinates, setSelectedCoordinates] = useState(null);
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);

    // Pricing state
    const [distanceData, setDistanceData] = useState({
        distanceKm: 0,
        deliveryFee: 300,
        mode: 'foot'
    });

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [walletInfo, setWalletInfo] = useState(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card'); // 'card' or 'wallet'

    // Refs
    const addressInputRef = useRef(null);
    const debounceTimerRef = useRef(null);

    // Constants
    const SERVICE_FEE = 200;

    /**
     * Load wallet info on mount and when user changes
     */
    useEffect(() => {
        const loadWalletInfo = async () => {
            if (!user?.uid) {
                console.log('❌ No user logged in');
                setWalletInfo(null);
                return;
            }
            
            try {
                console.log('👤 User logged in, loading wallet info...', user.uid);
                const info = await getCustomerWalletInfo(user.uid);
                console.log('✅ Wallet info loaded:', info);
                setWalletInfo(info);
            } catch (error) {
                console.error('❌ Error loading wallet:', error);
                setWalletInfo(null);
            }
        };

        loadWalletInfo();
    }, [user]);

    /**
     * Handle form input changes
     */
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear errors when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }

        // Handle address autocomplete
        if (field === 'deliveryAddress') {
            handleAddressSearch(value);
        }
    };

    /**
     * Address search with debouncing
     */
    const handleAddressSearch = (query) => {
        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Don't search for very short queries
        if (query.length < 3) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Debounce the search
        debounceTimerRef.current = setTimeout(() => {
            searchAddresses(query);
        }, 300);
    };

    /**
     * Search addresses using MapTiler Geocoding API
     */
    const searchAddresses = async (query) => {
        setIsLoadingAddress(true);

        try {
            const response = await fetch(
                `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${MAPTILER_KEY}&bbox=3.2,7.0,3.5,7.3&limit=5`
            );

            if (!response.ok) throw new Error('Geocoding request failed');

            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const suggestions = data.features.map(feature => ({
                    id: feature.id,
                    address: feature.place_name,
                    coordinates: {
                        lat: feature.center[1],
                        lng: feature.center[0]
                    }
                }));

                setAddressSuggestions(suggestions);
                setShowSuggestions(true);
            } else {
                setAddressSuggestions([]);
                setShowSuggestions(false);
            }
        } catch (error) {
            console.error('Address search error:', error);
            setAddressSuggestions([]);
            setShowSuggestions(false);
        }

        setIsLoadingAddress(false);
    };

    /**
     * Handle address selection from suggestions
     */
    const selectAddress = async (suggestion) => {
        setFormData(prev => ({ ...prev, deliveryAddress: suggestion.address }));
        setSelectedCoordinates(suggestion.coordinates);
        setShowSuggestions(false);

        // Calculate distance and delivery fee
        await calculateDistanceAndFee(suggestion.coordinates);
    };

    /**
     * Calculate distance and delivery fee using coordinates
     */
    const calculateDistanceAndFee = async (coordinates) => {
        try {
            // Calculate distance using Haversine formula (simpler approach)
            const distance = calculateHaversineDistance(
                GO7_HUB_COORDINATES.lat,
                GO7_HUB_COORDINATES.lng,
                coordinates.lat,
                coordinates.lng
            );

            // Determine delivery fee and mode based on distance
            let deliveryFee, mode;

            if (distance <= 2) {
                deliveryFee = 300;
                mode = 'foot';
            } else if (distance <= 5) {
                deliveryFee = 500;
                mode = 'bike';
            } else {
                deliveryFee = 800;
                mode = 'bike';
            }

            setDistanceData({
                distanceKm: distance,
                deliveryFee,
                mode
            });

        } catch (error) {
            console.error('Distance calculation error:', error);
            // Default values on error
            setDistanceData({
                distanceKm: 0,
                deliveryFee: 500,
                mode: 'bike'
            });
        }
    };

    /**
     * Haversine distance calculation
     */
    const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    /**
     * Handle photo upload
     */
    const handlePhotoUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setErrors(prev => ({ ...prev, photo: 'Please select a valid image file' }));
                return;
            }

            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, photo: 'Image must be less than 5MB' }));
                return;
            }

            setFormData(prev => ({ ...prev, uploadedPhoto: file }));
            setErrors(prev => ({ ...prev, photo: '' }));
        }
    };

    /**
     * Form validation
     */
    const validateForm = () => {
        const newErrors = {};

        if (!formData.itemName.trim()) {
            newErrors.itemName = 'Please describe what you want to buy';
        }

        if (!formData.itemBudget || parseFloat(formData.itemBudget) < 100) {
            newErrors.itemBudget = 'Budget must be at least ₦100';
        }

        if (!formData.deliveryAddress.trim()) {
            newErrors.deliveryAddress = 'Please enter your delivery address';
        }

        if (!selectedCoordinates) {
            newErrors.deliveryAddress = 'Please select an address from suggestions';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Calculate total cost
     */
    const calculateTotal = () => {
        const budget = parseFloat(formData.itemBudget) || 0;
        return budget + SERVICE_FEE + distanceData.deliveryFee;
    };

    /**
     * Handle payment with Paystack
     */
    const initiateCardPayment = () => {
        const total = calculateTotal();

        // Initialize Paystack payment
        const handler = window.PaystackPop.setup({
            key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_your_paystack_key',
            email: user?.email || 'customer@go7.ng',
            amount: total * 100, // Convert to kobo
            currency: 'NGN',
            ref: `gobuy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            metadata: {
                paymentType: 'service_payment',  // NOT a wallet top-up
                serviceType: 'gobuy',
                customerId: user?.uid || 'guest',
                custom_fields: [
                    {
                        display_name: "Item",
                        variable_name: "item_name",
                        value: formData.itemName
                    },
                    {
                        display_name: "Service Type",
                        variable_name: "service_type",
                        value: "GoBuy"
                    }
                ]
            },
            callback: function (response) {
                handlePaymentSuccess(response);
            },
            onClose: function () {
                console.log('Payment window closed');
                setIsSubmitting(false);
            }
        });

        handler.openIframe();
    };

    /**
     * Handle successful payment
     */
    const handlePaymentSuccess = async (paymentResponse) => {
        console.log('💳 Payment success callback triggered:', paymentResponse);
        
        try {
            console.log('📝 Creating order in Firebase...');
            
            // Save order to Firebase
            const orderData = {
                itemName: formData.itemName,
                itemBudget: parseFloat(formData.itemBudget),
                serviceFee: SERVICE_FEE,
                deliveryFee: distanceData.deliveryFee,
                totalPaid: calculateTotal(),
                mode: distanceData.mode,
                distanceKm: distanceData.distanceKm,
                customerAddress: formData.deliveryAddress,
                customerLat: selectedCoordinates.lat,
                customerLng: selectedCoordinates.lng,
                orderStatus: 'Pending',
                paymentMethod: 'card',
                paymentReference: paymentResponse.reference,
                customerId: user?.uid || 'guest',
                customerEmail: user?.email || '',
                customerName: user?.displayName || 'Guest',
                createdAt: serverTimestamp()
            };

            // Add to Firestore
            const docRef = await addDoc(collection(db, 'gobuy_orders'), orderData);
            console.log('✅ Order saved to Firebase with ID:', docRef.id);

            // Navigate to success page with order details
            console.log('🚀 Navigating to success page...');
            navigate('/gobuy-success', {
                state: {
                    orderDetails: {
                        orderId: docRef.id,
                        ...orderData,
                        paymentReference: paymentResponse.reference
                    }
                },
                replace: true  // Replace current history entry
            });

        } catch (error) {
            console.error('❌ Error saving order:', error);
            setIsSubmitting(false);

            Swal.fire({
                title: 'Order Processing Error',
                html: `
                    <p>Payment successful but there was an issue processing your order.</p>
                    <p><strong>Payment Reference:</strong> ${paymentResponse.reference}</p>
                    <p style="color: #E30613; margin-top: 10px;">Please save this reference and contact support.</p>
                `,
                icon: 'warning',
                confirmButtonColor: '#E30613'
            });
        }
    };

    /**
     * Handle payment with wallet
     */
    const initiateWalletPayment = async () => {
        console.log('💰 Starting wallet payment...');
        
        try {
            const total = calculateTotal();
            
            // Check if wallet has sufficient balance
            if (!hasSufficientBalance(walletInfo?.balance || 0, total)) {
                Swal.fire({
                    title: 'Insufficient Balance',
                    html: `
                        <div style="text-align: left; padding: 10px;">
                            <p><strong>Your Wallet Balance:</strong> ₦${(walletInfo?.balance || 0).toLocaleString()}</p>
                            <p><strong>Required Amount:</strong> ₦${total.toLocaleString()}</p>
                            <p style="color: #E30613; margin-top: 10px;">Please top up your wallet or use card payment.</p>
                        </div>
                    `,
                    icon: 'warning',
                    confirmButtonColor: '#E30613'
                });
                setIsSubmitting(false);
                return;
            }

            console.log('📝 Creating order in Firebase...');
            
            // Create order in Firebase first
            const orderData = {
                customerId: user?.uid || 'guest',
                customerEmail: user?.email || '',
                customerName: user?.displayName || 'Guest',
                itemName: formData.itemName,
                itemBudget: parseFloat(formData.itemBudget),
                serviceFee: SERVICE_FEE,
                deliveryFee: distanceData.deliveryFee,
                totalPaid: total,
                mode: distanceData.mode,
                distanceKm: distanceData.distanceKm,
                customerAddress: formData.deliveryAddress,
                customerLat: selectedCoordinates.lat,
                customerLng: selectedCoordinates.lng,
                orderStatus: 'Pending',
                paymentMethod: 'wallet',
                paymentStatus: 'pending',
                createdAt: serverTimestamp()
            };

            const orderRef = await addDoc(collection(db, 'gobuy_orders'), orderData);
            console.log('✅ Order saved with ID:', orderRef.id);

            console.log('💳 Processing wallet payment...');
            
            // Process wallet payment — mark paid only after debit succeeds
            try {
                const paymentResult = await payForDeliveryWithWallet(
                    user.uid,
                    orderRef.id,
                    total,
                    `GoBuy Order: ${formData.itemName}`
                );
                await updateDoc(doc(db, 'gobuy_orders', orderRef.id), {
                    paymentStatus: 'paid',
                    paymentReference: paymentResult?.transactionId || null,
                    updatedAt: serverTimestamp(),
                });
                console.log('✅ Wallet payment successful:', paymentResult);
            } catch (paymentError) {
                await updateDoc(doc(db, 'gobuy_orders', orderRef.id), {
                    paymentStatus: 'failed',
                    orderStatus: 'Cancelled',
                    updatedAt: serverTimestamp(),
                }).catch(() => {});
                throw paymentError;
            }

            // Show success
            await Swal.fire({
                title: 'Order Placed Successfully!',
                html: `
                    <div style="text-align: left; padding: 10px;">
                        <p><strong>✅ Payment:</strong> Deducted from wallet</p>
                        <p><strong>💰 Amount:</strong> ₦${total.toLocaleString()}</p>
                        <p><strong>💳 New Balance:</strong> ₦${(walletInfo.balance - total).toLocaleString()}</p>
                    </div>
                `,
                icon: 'success',
                confirmButtonColor: '#E30613',
                timer: 2000
            });

            console.log('🚀 Navigating to success page...');
            
            // Navigate to success page
            navigate('/gobuy-success', {
                state: {
                    orderDetails: {
                        orderId: orderRef.id,
                        ...orderData,
                        paymentStatus: 'paid',
                        paymentReference: null
                    }
                },
                replace: true  // Replace current history entry
            });

        } catch (error) {
            console.error('❌ Wallet payment error:', error);
            setIsSubmitting(false);
            
            Swal.fire({
                title: 'Payment Failed',
                text: error.message || 'There was an error processing your wallet payment. Please try again.',
                icon: 'error',
                confirmButtonColor: '#E30613'
            });
        }
    };

    /**
     * Handle form submission
     */
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!validateForm()) {
            // Show validation errors to user
            Swal.fire({
                title: 'Please Complete the Form',
                text: 'Fill in all required fields before placing your order.',
                icon: 'warning',
                confirmButtonColor: '#E30613'
            });
            return;
        }

        setIsSubmitting(true);

        const total = calculateTotal();
        const hasWallet = user && walletInfo;
        const hasSufficientFunds = hasWallet && hasSufficientBalance(walletInfo.balance || 0, total);

        console.log('🔍 Payment Method Selection:', {
            user: user ? 'Logged in' : 'Not logged in',
            userId: user?.uid,
            walletInfo: walletInfo ? 'Loaded' : 'Not loaded',
            walletBalance: walletInfo?.balance || 0,
            total: total,
            hasWallet: hasWallet,
            hasSufficientFunds: hasSufficientFunds
        });

        // Show payment method selection
        const { value: paymentMethod } = await Swal.fire({
            title: 'Choose Payment Method',
            html: `
                <div style="text-align: left; padding: 15px;">
                    <p><strong>Order Summary:</strong></p>
                    <p>🛒 <strong>Item:</strong> ${formData.itemName}</p>
                    <p>💰 <strong>Budget:</strong> ₦${parseFloat(formData.itemBudget).toLocaleString()}</p>
                    <p>📍 <strong>Delivery:</strong> ${formData.deliveryAddress}</p>
                    <p>🚚 <strong>Mode:</strong> ${distanceData.mode === 'foot' ? 'On Foot' : 'Bike'}</p>
                    <hr>
                    <p style="font-size: 18px;"><strong>💳 Total:</strong> ₦${total.toLocaleString()}</p>
                    ${hasWallet ? `<p style="color: #059669; margin-top: 10px;">💳 <strong>Wallet Balance:</strong> ₦${(walletInfo.balance || 0).toLocaleString()}</p>` : ''}
                </div>
            `,
            input: 'radio',
            inputOptions: hasWallet ? {
                'wallet': `Pay with Wallet ${hasSufficientFunds ? '✅' : '❌ (Insufficient balance)'}`,
                'card': 'Pay with Card (Paystack)'
            } : {
                'card': 'Pay with Card (Paystack)'
            },
            inputValue: hasSufficientFunds ? 'wallet' : 'card',
            inputValidator: (value) => {
                if (!value) {
                    return 'Please select a payment method';
                }
                if (value === 'wallet' && !hasSufficientFunds) {
                    return 'Insufficient wallet balance. Please choose card payment or top up your wallet.';
                }
            },
            showCancelButton: true,
            confirmButtonColor: '#E30613',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Proceed to Payment',
            cancelButtonText: 'Cancel'
        });

        if (paymentMethod === 'wallet') {
            initiateWalletPayment();
        } else if (paymentMethod === 'card') {
            initiateCardPayment();
        } else {
            setIsSubmitting(false);
        }
    };

    /**
     * Close suggestions when clicking outside
     */
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (addressInputRef.current && !addressInputRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                <svg className="w-8 h-8 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                                <span>GoBuy</span>
                            </h1>
                            <p className="text-gray-600 text-sm mt-1">
                                We'll Buy & Deliver For You
                            </p>
                        </div>
                        <button
                            onClick={() => navigate(-1)}
                            className="text-gray-500 hover:text-gray-700 flex items-center"
                        >
                            ← Back
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Item Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                        <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                                        </svg>
                                        What do you want us to buy?
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.itemName}
                                        onChange={(e) => handleInputChange('itemName', e.target.value)}
                                        placeholder="e.g., iPhone 15 Pro, Designer shoes, Groceries..."
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${errors.itemName ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.itemName && (
                                        <p className="text-red-500 text-sm mt-1">{errors.itemName}</p>
                                    )}
                                </div>

                                {/* Budget */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Your Budget (₦)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.itemBudget}
                                        onChange={(e) => handleInputChange('itemBudget', e.target.value)}
                                        placeholder="5000"
                                        min="100"
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${errors.itemBudget ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.itemBudget && (
                                        <p className="text-red-500 text-sm mt-1">{errors.itemBudget}</p>
                                    )}
                                    <p className="text-gray-500 text-xs mt-1">
                                        Minimum budget: ₦100
                                    </p>
                                </div>

                                {/* Delivery Address */}
                                <div className="relative" ref={addressInputRef}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                        <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Delivery Address
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.deliveryAddress}
                                        onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                                        placeholder="Start typing your address in Abeokuta..."
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${errors.deliveryAddress ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                    />
                                    {errors.deliveryAddress && (
                                        <p className="text-red-500 text-sm mt-1">{errors.deliveryAddress}</p>
                                    )}

                                    {/* Address Suggestions */}
                                    {showSuggestions && addressSuggestions.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {addressSuggestions.map((suggestion) => (
                                                <button
                                                    key={suggestion.id}
                                                    type="button"
                                                    onClick={() => selectAddress(suggestion)}
                                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                                >
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {suggestion.address}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {isLoadingAddress && (
                                        <div className="absolute right-3 top-11 text-gray-400">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                                        </div>
                                    )}
                                </div>

                                {/* Photo Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                        <svg className="w-5 h-5 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Photo (Optional)
                                    </label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-300 transition-colors">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            className="hidden"
                                            id="photo-upload"
                                        />
                                        <label htmlFor="photo-upload" className="cursor-pointer">
                                            {formData.uploadedPhoto ? (
                                                <div>
                                                    <div className="text-green-600 mb-2 flex items-center justify-center">
                                                        <svg className="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Photo selected
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        {formData.uploadedPhoto.name}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="text-gray-400 mb-2 flex justify-center">
                                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                        </svg>
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        Click to upload a reference photo
                                                    </div>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                    {errors.photo && (
                                        <p className="text-red-500 text-sm mt-1">{errors.photo}</p>
                                    )}
                                </div>

                                {/* Payment Notice */}
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-yellow-800">
                                                Prepaid Only
                                            </h3>
                                            <div className="text-sm text-yellow-700 mt-1">
                                                Payment is required upfront. We'll refund any unused budget after purchase.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Summary Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Order Summary
                            </h3>

                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Item Budget</span>
                                    <span className="font-medium">
                                        ₦{parseFloat(formData.itemBudget || 0).toLocaleString()}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-600">Service Fee</span>
                                    <span className="font-medium">₦{SERVICE_FEE}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        Delivery Fee
                                        {distanceData.distanceKm > 0 && (
                                            <span className="text-xs text-gray-500 block">
                                                {distanceData.distanceKm.toFixed(1)}km • {distanceData.mode}
                                            </span>
                                        )}
                                    </span>
                                    <span className="font-medium">₦{distanceData.deliveryFee}</span>
                                </div>

                                <hr className="my-4" />

                                <div className="flex justify-between text-lg font-bold text-red-600">
                                    <span>Total</span>
                                    <span>₦{calculateTotal().toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Distance & Mode Info */}
                            {selectedCoordinates && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-600">
                                        <div className="flex items-center justify-between">
                                            <span>Distance:</span>
                                            <span>{distanceData.distanceKm.toFixed(1)} km</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <span>Mode:</span>
                                            <span className="capitalize flex items-center">
                                                {distanceData.mode === 'foot' ? (
                                                    <>
                                                        <svg className="w-4 h-4 text-blue-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        On Foot
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                        Bike
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !formData.itemName || !formData.itemBudget || !selectedCoordinates}
                            className={`w-full mt-6 py-4 px-6 rounded-lg font-semibold text-white transition-all touch-manipulation ${isSubmitting || !formData.itemName || !formData.itemBudget || !selectedCoordinates
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 hover:shadow-lg active:bg-red-800'
                                }`}
                        >
                            {isSubmitting ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Processing...
                                </div>
                            ) : (
                                <div className="flex items-center justify-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                    Place Order
                                </div>
                            )}
                        </button>

                        {/* Debug Info - Remove after testing */}
                        {(!formData.itemName || !formData.itemBudget || !selectedCoordinates) && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                                <p className="text-yellow-800 font-semibold mb-2">Button disabled. Please complete:</p>
                                <ul className="text-yellow-700 space-y-1">
                                    {!formData.itemName && <li>• Enter item name</li>}
                                    {!formData.itemBudget && <li>• Enter budget amount</li>}
                                    {!selectedCoordinates && <li>• Select address from dropdown</li>}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoBuyPage;