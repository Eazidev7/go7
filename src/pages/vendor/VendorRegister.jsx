import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';
import { fixVendorAccountByEmail } from '../../utils/vendorAccountFixer';

const VendorRegister = () => {
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: 'Abeokuta',
    state: 'Ogun',
    businessType: 'restaurant',
    description: '',
    acceptTerms: false
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Multi-step form
  const navigate = useNavigate();
  const auth = getAuth();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateStep1 = () => {
    if (!formData.businessName.trim()) {
      setError('Business name is required');
      return false;
    }
    if (!formData.ownerName.trim()) {
      setError('Owner name is required');
      return false;
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Valid email is required');
      return false;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      setError('Valid phone number is required');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!formData.address.trim()) {
      setError('Business address is required');
      return false;
    }
    if (!formData.acceptTerms) {
      setError('Please accept the terms and conditions');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateStep2()) {
      return;
    }

    setLoading(true);
    let userCreated = null;

    try {
      console.log('🏪 Creating vendor account...');

      // Create Firebase Authentication user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;
      userCreated = user; // Store reference in case we need to rollback

      // Update user profile with display name
      await updateProfile(user, {
        displayName: formData.businessName
      });

      console.log('✅ Firebase Auth user created:', user.uid);

      // Create vendor document in Firestore
      const vendorData = {
        uid: user.uid,
        businessName: formData.businessName,
        ownerName: formData.ownerName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        businessType: formData.businessType,
        description: formData.description || '',
        active: false, // Requires admin approval
        approved: false,
        rating: 0,
        totalOrders: 0,
        revenue: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        coordinates: {
          lat: 7.1475, // Default Abeokuta coordinates
          lng: 3.3619
        },
        settings: {
          acceptingOrders: false,
          minimumOrder: 0,
          deliveryFee: 0,
          estimatedPreparationTime: 30
        }
      };

      try {
        await setDoc(doc(db, 'vendors', user.uid), vendorData);
        console.log('✅ Vendor document created in Firestore');
      } catch (firestoreError) {
        console.error('❌ Firestore write failed:', firestoreError);
        
        // Rollback: Delete the auth user since vendor doc creation failed
        if (userCreated) {
          console.log('🔄 Rolling back - deleting auth user...');
          await userCreated.delete();
        }
        
        throw new Error('Failed to create vendor profile. Please try again.');
      }

      console.log('✅ FIX 3: Vendor registration completed successfully');
      console.log('📝 Vendor data saved to Firestore');
      console.log('📝 Vendor ID:', user.uid);

      // Show success message
      toast.success('Registration successful! Redirecting to dashboard...');

      // Store vendor ID for later use
      localStorage.setItem('pendingVendorId', user.uid);

      // Wait for Firestore to propagate before navigating
      setTimeout(() => {
        navigate(`/vendor/dashboard/${user.uid}`);
        setLoading(false);
      }, 2000);

    } catch (error) {
      console.error('❌ Registration error:', error);

      // Handle "email already in use" - try to fix orphaned account
      if (error.code === 'auth/email-already-in-use') {
        console.log('🔧 Email already in use - attempting to fix orphaned account...');
        
        try {
          toast.loading('Checking account status...', { id: 'fixing' });
          
          const fixResult = await fixVendorAccountByEmail(formData.email);
          
          toast.dismiss('fixing');
          
          if (fixResult.status === 'fixed') {
            toast.success('Account issue resolved! Please try registering again.');
            setError('Account was incomplete and has been cleaned up. Please click "Register" again.');
          } else if (fixResult.status === 'complete') {
            toast.info('Account already exists. Please try logging in.');
            setError('This email is already registered. Please use the login page instead.');
          } else {
            toast.error('Unable to fix account. Please use a different email.');
            setError('An account with this email already exists. Please use a different email or contact support.');
          }
        } catch (fixError) {
          console.error('❌ Failed to fix account:', fixError);
          toast.error('Unable to resolve account issue.');
          setError('An account with this email already exists. Please try logging in or use a different email.');
        }
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else if (error.message.includes('vendor profile')) {
        setError(error.message);
      } else {
        setError('Failed to create account. Please try again or contact support.');
      }

      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Vendor Registration | Go7 Marketplace</title>
      </Helmet>

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            className="mx-auto h-12 w-auto mb-4"
            src="/go7-logo.png"
            alt="Go7 Logo"
          />
          <h2 className="text-3xl font-extrabold text-gray-900">
            Become a Go7 Vendor
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join our marketplace and reach thousands of customers
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-red-600 text-white' : 'bg-gray-300'}`}>
              1
            </div>
            <div className={`w-24 h-1 ${step >= 2 ? 'bg-red-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-red-600 text-white' : 'bg-gray-300'}`}>
              2
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white shadow-xl rounded-lg p-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Business Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., Mama's Kitchen"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner's Name *
                  </label>
                  <input
                    type="text"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="08012345678"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Type *
                  </label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="restaurant">Restaurant</option>
                    <option value="local_market">Local Market</option>
                    <option value="grocery">Grocery Store</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="bakery">Bakery</option>
                    <option value="fast_food">Fast Food</option>
                    <option value="traditional_food">Traditional Food</option>
                    <option value="drinks_beverages">Drinks & Beverages</option>
                    <option value="meat_fish">Meat & Fish</option>
                    <option value="fruits_vegetables">Fruits & Vegetables</option>
                    <option value="fashion_clothing">Fashion & Clothing</option>
                    <option value="electronics">Electronics</option>
                    <option value="beauty_cosmetics">Beauty & Cosmetics</option>
                    <option value="home_garden">Home & Garden</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Next Step →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Account & Location Details
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Re-enter password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Full business address"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Tell customers about your business"
                  />
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    required
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    I agree to Go7's{' '}
                    <a href="/terms" className="text-red-600 hover:text-red-700">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-red-600 hover:text-red-700">
                      Privacy Policy
                    </a>
                  </label>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating Account...' : 'Complete Registration'}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/vendor/login')}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-3xl mb-2">📦</div>
            <h4 className="font-semibold text-gray-900">Easy Setup</h4>
            <p className="text-sm text-gray-600">Get started in minutes</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-3xl mb-2">🎯</div>
            <h4 className="font-semibold text-gray-900">Reach Customers</h4>
            <p className="text-sm text-gray-600">Thousands of active users</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-3xl mb-2">💰</div>
            <h4 className="font-semibold text-gray-900">Grow Revenue</h4>
            <p className="text-sm text-gray-600">Competitive commission rates</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorRegister;
