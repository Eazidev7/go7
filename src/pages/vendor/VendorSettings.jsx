import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut, updatePassword } from 'firebase/auth';
import { getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { vendorDoc } from '../../lib/vendorRefs';
import { refreshVendorProducts } from '../../services/productService';
import VendorLayout from '../../components/vendor/VendorLayout';

const VendorSettings = () => {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [formData, setFormData] = useState({
    businessName: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    description: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const auth = getAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        const user = auth.currentUser;
        
        if (!user) {
          navigate('/vendor/login');
          return;
        }
        
        const vendorId = user.uid;
        const vendorSnapshot = await getDoc(vendorDoc(vendorId));
        
        if (!vendorSnapshot.exists()) {
          console.error('No vendor profile found');
          auth.signOut();
          navigate('/vendor/login');
          return;
        }
        
        const vendorData = vendorSnapshot.data();
        setVendor(vendorData);
        
        // Populate form data
        setFormData({
          businessName: vendorData.businessName || vendorData.name || '',
          name: vendorData.name || '',
          phone: vendorData.phone || '',
          email: vendorData.email || '',
          address: vendorData.address || '',
          description: vendorData.description || '',
          bankName: vendorData.payoutDetails?.bankName || '',
          accountNumber: vendorData.payoutDetails?.accountNumber || '',
          accountName: vendorData.payoutDetails?.accountName || '',
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching vendor data:', error);
        setLoading(false);
      }
    };
    
    fetchVendorData();
  }, [auth, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    setUpdating(true);
    
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const vendorRef = vendorDoc(user.uid);
      
      await updateDoc(vendorRef, {
        businessName: formData.businessName,
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        description: formData.description,
        payoutDetails: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountName: formData.accountName,
        },
        updatedAt: serverTimestamp()
      });
      
      // Refresh all products with updated vendor metadata
      await refreshVendorProducts(user.uid);
      
      setSuccessMessage('Profile updated successfully!');
      
      // Refresh vendor data
      const updatedVendorSnapshot = await getDoc(vendorRef);
      if (updatedVendorSnapshot.exists()) {
        setVendor(updatedVendorSnapshot.data());
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage('Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }
    
    setUpdating(true);
    
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      await updatePassword(user, passwordForm.newPassword);
      
      setSuccessMessage('Password updated successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error updating password:', error);
      setErrorMessage('Failed to update password. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    signOut(auth).then(() => {
      navigate('/vendor/login');
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <VendorLayout vendor={vendor} title="Settings">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Profile</h3>
            <p className="mt-1 text-sm text-gray-500">
              Update your vendor profile information.
            </p>
          </div>
        </div>
        <div className="mt-5 md:mt-0 md:col-span-2">
          <form onSubmit={handleProfileUpdate}>
            <div className="shadow sm:rounded-md sm:overflow-hidden">
              <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                {successMessage && (
                  <div className="rounded-md bg-green-50 p-4 mb-4">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">{successMessage}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {errorMessage && (
                  <div className="rounded-md bg-red-50 p-4 mb-4">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
                      Business/Restaurant Name
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      id="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-red-500 focus:border-red-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Contact Person Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-red-500 focus:border-red-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      name="phone"
                      id="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-red-500 focus:border-red-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={formData.email}
                      disabled
                      className="mt-1 bg-gray-50 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                    <p className="mt-1 text-xs text-gray-500">Email address cannot be changed.</p>
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      Business Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      id="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-red-500 focus:border-red-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Business Description
                    </label>
                    <textarea
                      name="description"
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-red-500 focus:border-red-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <button
                  type="submit"
                  disabled={updating}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="hidden sm:block" aria-hidden="true">
        <div className="py-5">
          <div className="border-t border-gray-200" />
        </div>
      </div>

      <div className="mt-10 md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Payout Details</h3>
            <p className="mt-1 text-sm text-gray-500">
              Set up your bank account for receiving payments.
            </p>
          </div>
        </div>
        <div className="mt-5 md:mt-0 md:col-span-2">
          <form onSubmit={handleProfileUpdate}>
            <div className="shadow sm:rounded-md sm:overflow-hidden">
              <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      name="bankName"
                      id="bankName"
                      value={formData.bankName}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-red-500 focus:border-red-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">
                      Account Number
                    </label>
                    <input
                      type="text"
                      name="accountNumber"
                      id="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-red-500 focus:border-red-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="accountName" className="block text-sm font-medium text-gray-700">
                      Account Name
                    </label>
                    <input
                      type="text"
                      name="accountName"
                      id="accountName"
                      value={formData.accountName}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-red-500 focus:border-red-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <button
                  type="submit"
                  disabled={updating}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="hidden sm:block" aria-hidden="true">
        <div className="py-5">
          <div className="border-t border-gray-200" />
        </div>
      </div>

      <div className="mt-10 md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Change Password</h3>
            <p className="mt-1 text-sm text-gray-500">
              Update your account password.
            </p>
          </div>
        </div>
        <div className="mt-5 md:mt-0 md:col-span-2">
          <form onSubmit={handlePasswordUpdate}>
            <div className="shadow sm:rounded-md sm:overflow-hidden">
              <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-4">
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                      Current Password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      id="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      className="mt-1 focus:ring-red-500 focus:border-red-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-4">
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      id="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      className="mt-1 focus:ring-red-500 focus:border-red-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-4">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      id="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      className="mt-1 focus:ring-red-500 focus:border-red-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <button
                  type="submit"
                  disabled={updating}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="hidden sm:block" aria-hidden="true">
        <div className="py-5">
          <div className="border-t border-gray-200" />
        </div>
      </div>

      <div className="mt-10 md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Account Actions</h3>
            <p className="mt-1 text-sm text-gray-500">
              Manage your account security and access.
            </p>
          </div>
        </div>
        <div className="mt-5 md:mt-0 md:col-span-2">
          <div className="shadow sm:rounded-md sm:overflow-hidden">
            <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
              <div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorSettings;
