import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { toast } from 'react-hot-toast';

const ProfilePage = () => {
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-4 border-b">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/')}
            className="mr-3 p-2 rounded-full hover:bg-gray-100"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-900">Profile</h1>
        </div>
      </div>
      
      <div className="p-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mr-4">
              <span className="text-2xl">👤</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Go7 User</h2>
              <p className="text-gray-600">user@go7.com</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-gray-900">🏠 Address Book</span>
              <span className="text-gray-400">→</span>
            </div>
          </div>
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-gray-900">💳 Payment Methods</span>
              <span className="text-gray-400">→</span>
            </div>
          </div>
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-gray-900">🔔 Notifications</span>
              <span className="text-gray-400">→</span>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-900">❓ Help & Support</span>
              <span className="text-gray-400">→</span>
            </div>
          </div>
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center text-red-600 font-semibold py-3 hover:bg-red-50 rounded-lg transition-colors"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;