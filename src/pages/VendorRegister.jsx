/**
 * 🏪 VENDOR REGISTRATION PAGE
 * Allow new vendors to sign up for GO7 platform
 * Integrates with Firebase Auth, Firestore, and Storage
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth, storage } from '../config/firebase';
import { Upload, Store, Mail, Phone, Lock, MapPin, FileText, Image as ImageIcon, ArrowLeft, Loader, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { registerVendor } from '../services/vendorAuthService';
import { lookupAgent } from '../utils/agentLookup';
import VendorImageCaptureInput from '../components/vendor/VendorImageCaptureInput';

export default function VendorRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [agentLookupState, setAgentLookupState] = useState({ checking: false, found: false, name: '', error: '' });
  
  const [formData, setFormData] = useState({
    name: '', // Owner/Contact name
    businessName: '', // Business/Restaurant name
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    type: '',
    description: '',
    agentId: searchParams.get('agent') || '',
    image: null,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    availableHours: { start: '08:00', end: '22:00' }
  });

  const verifyAgentInput = useCallback(async (agentInput) => {
    const value = String(agentInput || '').trim();
    if (!value) {
      setAgentLookupState({ checking: false, found: false, name: '', error: '' });
      return;
    }
    setAgentLookupState((s) => ({ ...s, checking: true, error: '' }));
    const result = await lookupAgent(value);
    if (result.found) {
      setAgentLookupState({
        checking: false,
        found: true,
        name: result.agent.name || 'GO7 Agent',
        error: '',
      });
    } else {
      setAgentLookupState({
        checking: false,
        found: false,
        name: '',
        error: result.error || 'Agent not found',
      });
    }
  }, []);

  useEffect(() => {
    const prefilled = searchParams.get('agent');
    if (prefilled) {
      verifyAgentInput(prefilled);
    }
  }, [searchParams, verifyAgentInput]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.agentId.trim()) {
        verifyAgentInput(formData.agentId);
      } else {
        setAgentLookupState({ checking: false, found: false, name: '', error: '' });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.agentId, verifyAgentInput]);

  // Handle text input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle day selection
  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }));
  };

  // Handle hour changes
  const handleHourChange = (type, value) => {
    setFormData(prev => ({
      ...prev,
      availableHours: {
        ...prev.availableHours,
        [type]: value
      }
    }));
  };

  // Handle image selection (camera or gallery)
  const handleImageFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setFormData(prev => ({
      ...prev,
      image: file
    }));

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) handleImageFile(file);
  };

  // Validate form
  const validateForm = () => {
    if (!formData.businessName.trim()) {
      toast.error('Business name is required');
      return false;
    }

    if (!formData.name.trim()) {
      toast.error('Contact person name is required');
      return false;
    }

    if (!formData.email.trim()) {
      toast.error('Email is required');
      return false;
    }

    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    if (!formData.address.trim()) {
      toast.error('Business address is required');
      return false;
    }

    if (!formData.type) {
      toast.error('Please select a vendor type');
      return false;
    }

    if (formData.agentId.trim() && !agentLookupState.found) {
      toast.error(agentLookupState.error || 'Please enter a valid GO7 Agent ID');
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    const loadingToast = toast.loading('Creating your vendor account...');

    try {
      // Use vendorAuthService to register vendor with all fields including availability
      const result = await registerVendor({
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
        businessName: formData.businessName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        type: formData.type,
        description: formData.description.trim() || '',
        agentId: formData.agentId.trim() || undefined,
        availableDays: formData.availableDays,
        availableHours: formData.availableHours
      }, formData.image);

      if (result.success) {
        // Show success message with phone verification requirement
        if (result.requiresPhoneVerification) {
          toast.success(`🎉 Registration successful! 📱 You must verify your phone number to activate your account.`, { 
            id: loadingToast,
            duration: 5000 
          });
          
          // Redirect to vendor dashboard where they'll see phone verification prompt
          // Lite vendor shell only has login/register — must hard-nav into full app
          setTimeout(() => {
            const target = '/vendor/dashboard';
            if (window.__GO7_VENDOR_ENTRY__) {
              window.location.assign(target);
            } else {
              navigate(`/vendor/dashboard/${result.vendorId}`);
            }
          }, 2000);
        } else if (result.warning) {
          toast.success(`🎉 Registration successful! ⚠️ ${result.warning}`, { 
            id: loadingToast,
            duration: 4000 
          });
          
          setTimeout(() => {
            if (window.__GO7_VENDOR_ENTRY__) {
              window.location.assign('/vendor/login');
            } else {
              navigate('/vendor/login');
            }
          }, 1500);
        } else {
          toast.success('🎉 Vendor registration successful!', { id: loadingToast });
          
          setTimeout(() => {
            if (window.__GO7_VENDOR_ENTRY__) {
              window.location.assign('/vendor/login');
            } else {
              navigate('/vendor/login');
            }
          }, 1500);
        }
      } else {
        throw new Error(result.error || 'Registration failed');
      }

    } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.code === 'auth/email-already-in-use' || error.message?.includes('email-already-in-use')) {
        errorMessage = `This email is already registered. Try logging in instead or use a different email.`;
      } else if (error.code === 'auth/weak-password' || error.message?.includes('weak-password')) {
        errorMessage = 'Password must be at least 6 characters long';
      } else if (error.code === 'auth/invalid-email' || error.message?.includes('invalid-email')) {
        errorMessage = 'Please enter a valid email address';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.code === 'permission-denied') {
        console.log('🔍 Permission denied error during vendor registration:', error);
        errorMessage = 'Registration temporarily unavailable. Please try again in a few minutes.';
      } else if (error.message?.includes('Firebase')) {
        console.log('🔍 Firebase error during vendor registration:', error);
        errorMessage = `Registration failed. Please check your internet connection and try again.`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-red-50 via-white to-orange-50 py-6 sm:py-12 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-3xl mx-auto w-full">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-gray-600 hover:text-red-500 mb-6 transition"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500 rounded-full mb-4">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">Become a GO7 Vendor</h1>
          <p className="text-gray-600">Join our platform and reach thousands of customers</p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Logo Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Business Logo (Optional)
              </label>
              <div className="flex items-center space-x-4">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                    <ImageIcon size={32} className="text-gray-400" />
                  </div>
                )}
                <VendorImageCaptureInput onImageSelected={handleImageFile} />
              </div>
              <p className="text-xs text-gray-500 mt-2">PNG, JPG, or WEBP (max 5MB)</p>
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Business/Restaurant Name *
              </label>
              <div className="relative">
                <Store size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="e.g., Mama T Rice & Beans, KFC, Domino's Pizza"
                  className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* GO7 Agent ID */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                GO7 Agent Code
                <span className="font-normal text-gray-500 ml-1">(if an agent onboarded you)</span>
              </label>
              <div className="relative">
                <UserCheck size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" />
                <input
                  type="text"
                  name="agentId"
                  value={formData.agentId}
                  onChange={handleChange}
                  placeholder="e.g. GO7-AB23CD (from your GO7 agent)"
                  className={`w-full pl-12 pr-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    agentLookupState.error
                      ? 'border-red-400'
                      : agentLookupState.found
                      ? 'border-green-400'
                      : 'border-gray-300'
                  }`}
                />
              </div>
              {agentLookupState.checking && (
                <p className="text-xs text-gray-500 mt-2">Verifying agent…</p>
              )}
              {agentLookupState.found && (
                <p className="text-xs text-green-700 mt-2 font-medium">
                  ✓ Agent verified: {agentLookupState.name}
                </p>
              )}
              {agentLookupState.error && (
                <p className="text-xs text-red-600 mt-2">{agentLookupState.error}</p>
              )}
              <p className="text-xs text-gray-600 mt-2">
                Your agent earns commission from your vendor activity on GO7. Leave blank only if you signed up directly.
              </p>
            </div>

            {/* Contact Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contact Person Name *
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., John Doe, Mary Johnson"
                  className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Email & Phone (Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="vendor@example.com"
                    className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="08012345678"
                    autoComplete="off"
                    className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password & Confirm Password (Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 characters"
                    className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Business Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Business Address *
              </label>
              <div className="relative">
                <MapPin size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g., Abeokuta Main Market, Ogun State"
                  className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Vendor Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Vendor Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              >
                <option value="">Select vendor type</option>
                <option value="Food">🍔 Food & Restaurant</option>
                <option value="Supermarket">🛒 Supermarket & Groceries</option>
                <option value="Local Market">🏪 Local Market</option>
                <option value="Pharmacy">💊 Pharmacy & Health</option>
                <option value="Errands">📦 Errands & Delivery</option>
                <option value="Electronics">📱 Electronics & Gadgets</option>
                <option value="Fashion">👗 Fashion & Clothing</option>
                <option value="Other">🏬 Other</option>
              </select>
            </div>

            {/* Business Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Business Description (Optional)
              </label>
              <div className="relative">
                <FileText size={20} className="absolute left-3 top-3 text-gray-400" />
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Tell customers about your business..."
                  rows={4}
                  className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Business Hours */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">⏰ Business Hours</h3>
              
              {/* Operating Hours */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Operating Hours
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Open Time</label>
                    <input
                      type="time"
                      value={formData.availableHours.start}
                      onChange={(e) => handleHourChange('start', e.target.value)}
                      className="w-full px-4 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Close Time</label>
                    <input
                      type="time"
                      value={formData.availableHours.end}
                      onChange={(e) => handleHourChange('end', e.target.value)}
                      className="w-full px-4 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Operating Days */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Operating Days
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                        formData.availableDays.includes(day)
                          ? 'bg-red-500 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Select the days your business is open
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <Store size={20} />
                  <span>Register as Vendor</span>
                </>
              )}
            </button>

            {/* Login Link */}
            <p className="text-center text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/vendor/login')}
                className="text-red-500 hover:text-red-600 font-semibold"
              >
                Login here
              </button>
            </p>
          </form>
        </div>

        {/* Benefits Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Real-time Dashboard</h3>
            <p className="text-sm text-gray-600">Track orders and sales in real-time</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Reach More Customers</h3>
            <p className="text-sm text-gray-600">Get discovered by thousands of users</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Fast Payouts</h3>
            <p className="text-sm text-gray-600">Get paid quickly and securely</p>
          </div>
        </div>
      </div>
    </div>
  );
}
