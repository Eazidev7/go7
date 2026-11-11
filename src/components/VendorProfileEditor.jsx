/**
 * 🏪 VENDOR PROFILE EDITOR
 * 
 * Allows vendors to edit their business details with restrictions:
 * - One free edit allowed
 * - After first edit, must contact support for changes
 * - Tracks edit history and timestamps
 */

import React, { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp, getDoc, addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Edit3, Save, X, MessageCircle, Lock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

export default function VendorProfileEditor({ vendor, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    businessName: '',
    name: '',
    category: '',
    address: '',
    description: ''
  });
  const [editCount, setEditCount] = useState(0);
  const [lastEditDate, setLastEditDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');

  useEffect(() => {
    if (vendor) {
      console.log('🔥 VendorProfileEditor loaded with vendor:', vendor);
      setEditForm({
        businessName: vendor.businessName || vendor.name || '',
        name: vendor.name || '',
        category: vendor.category || '',
        address: vendor.address || '',
        description: vendor.description || ''
      });
      setEditCount(vendor.profileEditCount || 0);
      setLastEditDate(vendor.lastProfileEdit);
      console.log('📝 Edit count:', vendor.profileEditCount || 0);
    }
  }, [vendor]);

  const canEdit = editCount === 0;
  const needsSupport = editCount > 0;

  const handleEditToggle = () => {
    if (!canEdit) {
      setShowSupportModal(true);
      return;
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!vendor?.id || !editForm.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }

    try {
      setLoading(true);

      const result = await Swal.fire({
        title: 'Save Profile Changes?',
        html: `
          <div class="text-left space-y-2">
            <p><strong>Business Name:</strong> ${editForm.businessName}</p>
            <p class="text-orange-600 font-medium">⚠️ This is your only free edit. Future changes will require contacting support.</p>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Save Changes',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#E83A2E'
      });

      if (!result.isConfirmed) {
        setLoading(false);
        return;
      }

      // Update vendor profile
      const vendorRef = doc(db, 'vendors', vendor.id);
      const updateData = {
        businessName: editForm.businessName.trim(),
        name: editForm.name.trim() || editForm.businessName.trim(),
        category: editForm.category.trim(),
        address: editForm.address.trim(),
        description: editForm.description.trim(),
        profileEditCount: (editCount || 0) + 1,
        lastProfileEdit: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(vendorRef, updateData);

      // Log the edit for admin tracking
      await addDoc(collection(db, 'vendorProfileEdits'), {
        vendorId: vendor.id,
        vendorName: editForm.businessName,
        editNumber: (editCount || 0) + 1,
        changes: {
          businessName: { from: vendor.businessName, to: editForm.businessName },
          category: { from: vendor.category, to: editForm.category },
          address: { from: vendor.address, to: editForm.address }
        },
        timestamp: serverTimestamp(),
        userId: auth.currentUser?.uid
      });

      setEditCount(prev => prev + 1);
      setIsEditing(false);
      
      if (onUpdate) {
        onUpdate({ ...vendor, ...updateData });
      }

      toast.success('Profile updated successfully!');

      // Show info about future edits
      setTimeout(() => {
        Swal.fire({
          title: 'Profile Updated!',
          text: 'Your profile has been updated. For future changes, please contact our support team.',
          icon: 'success',
          confirmButtonText: 'Got it',
          confirmButtonColor: '#E83A2E'
        });
      }, 1000);

    } catch (error) {
      console.error('Error updating vendor profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSupportRequest = async () => {
    if (!supportMessage.trim()) {
      toast.error('Please enter your message');
      return;
    }

    try {
      setLoading(true);

      // Create support ticket
      await addDoc(collection(db, 'supportTickets'), {
        vendorId: vendor.id,
        vendorName: vendor.businessName || vendor.name,
        type: 'profile_edit_request',
        subject: 'Profile Edit Request',
        message: supportMessage,
        status: 'open',
        priority: 'medium',
        createdAt: serverTimestamp(),
        userId: auth.currentUser?.uid
      });

      // Send notification to admin
      await addDoc(collection(db, 'adminNotifications'), {
        type: 'support_ticket',
        title: 'Profile Edit Request',
        message: `${vendor.businessName || vendor.name} has requested profile changes`,
        vendorId: vendor.id,
        ticketType: 'profile_edit_request',
        createdAt: serverTimestamp(),
        read: false
      });

      setShowSupportModal(false);
      setSupportMessage('');
      
      toast.success('Support request sent! We\'ll get back to you within 24 hours.');

    } catch (error) {
      console.error('Error sending support request:', error);
      toast.error('Failed to send support request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!vendor) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Business Profile</h3>
        <div className="flex items-center space-x-3">
          {editCount > 0 && (
            <div className="flex items-center space-x-1 text-sm text-orange-600">
              <Lock size={16} />
              <span>Edited {editCount} time{editCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          <button
            onClick={handleEditToggle}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              canEdit 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {canEdit ? (
              <>
                <Edit3 size={16} />
                <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
              </>
            ) : (
              <>
                <MessageCircle size={16} />
                <span>Request Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!canEdit && !isEditing && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="text-orange-500 mt-0.5" size={16} />
            <div className="text-sm text-orange-700">
              <p className="font-medium">Profile editing limited</p>
              <p>You've used your free edit. Contact support to make changes.</p>
              {lastEditDate && (
                <p className="text-xs mt-1">
                  Last edited: {new Date(lastEditDate.toDate()).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name *
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.businessName}
                onChange={(e) => setEditForm(prev => ({ ...prev, businessName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter business name"
                required
              />
            ) : (
              <p className="text-gray-900 py-2">{vendor.businessName || vendor.name || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.category}
                onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Restaurant, Pharmacy, Grocery"
              />
            ) : (
              <p className="text-gray-900 py-2">{vendor.category || 'Not specified'}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          {isEditing ? (
            <textarea
              value={editForm.address}
              onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter business address"
              rows={3}
            />
          ) : (
            <p className="text-gray-900 py-2">{vendor.address || 'Not provided'}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          {isEditing ? (
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your business"
              rows={3}
            />
          ) : (
            <p className="text-gray-900 py-2">{vendor.description || 'No description provided'}</p>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="flex items-center space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={loading || !editForm.businessName.trim()}
            className="flex items-center space-x-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            <span>{loading ? 'Saving...' : 'Save Changes'}</span>
          </button>
          <button
            onClick={() => setIsEditing(false)}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <X size={16} />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* Support Request Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Request Profile Changes</h3>
                <button
                  onClick={() => setShowSupportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Describe what changes you'd like to make to your business profile. 
                    Our support team will review and implement approved changes within 24 hours.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What changes would you like to make?
                  </label>
                  <textarea
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Please describe the changes you need..."
                    rows={5}
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowSupportModal(false)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSupportRequest}
                  disabled={loading || !supportMessage.trim()}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}