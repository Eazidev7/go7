import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  EyeSlashIcon,
  PhotoIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { FirestoreVendorHelpers } from '../utils/firestoreVendorHelpers';

const VendorAddonsList = ({ vendorId, addons, onEditAddon, onAddAddon }) => {
  const [loading, setLoading] = useState(false);

  const toggleAddonActive = async (addonId, currentStatus) => {
    try {
      setLoading(true);
      await FirestoreVendorHelpers.toggleAddonActive(vendorId, addonId, !currentStatus);
      console.log('✅ Addon status updated');
    } catch (error) {
      console.error('❌ Error updating addon status:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAddon = async (addonId) => {
    if (!window.confirm('Are you sure you want to delete this addon?')) {
      return;
    }

    try {
      setLoading(true);
      await FirestoreVendorHelpers.deleteAddon(vendorId, addonId);
      console.log('✅ Addon deleted');
    } catch (error) {
      console.error('❌ Error deleting addon:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getMeasurementDisplay = (addon) => {
    if (!addon.measurementType) return 'Unit';
    
    const displays = {
      'tuber': 'Per Tuber',
      'pack': 'Per Pack', 
      'spoon': 'Per Spoon',
      'piece': 'Per Piece',
      'kg': 'Per Kg',
      'custom': addon.customLabel || 'Custom Unit'
    };
    
    return displays[addon.measurementType] || 'Unit';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'protein': 'bg-red-100 text-red-800',
      'carbs': 'bg-yellow-100 text-yellow-800',
      'spicy': 'bg-orange-100 text-orange-800',
      'drinks': 'bg-blue-100 text-blue-800',
      'dessert': 'bg-pink-100 text-pink-800',
      'vegetables': 'bg-green-100 text-green-800',
      'other': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors['other'];
  };

  if (addons.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 mt-8">
        <div className="text-center">
          <PhotoIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Add-ons Yet</h3>
          <p className="text-gray-500 mb-4">
            Start adding delicious add-ons to enhance your customers' orders
          </p>
          {onAddAddon && (
            <button
              onClick={onAddAddon}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Your First Add-on
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm mt-8">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Your Add-ons ({addons.length})
            </h2>
            <p className="text-gray-600 mt-1">
              Manage your restaurant's add-on offerings
            </p>
          </div>
          {onAddAddon && (
            <button
              onClick={onAddAddon}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add New Add-on
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        <AnimatePresence>
          {addons.map((addon) => (
            <motion.div
              key={addon.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-6 hover:bg-gray-50 transition-colors ${
                !addon.active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {addon.imageUrl ? (
                      <img
                        src={addon.thumbUrl || addon.imageUrl}
                        alt={addon.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/placeholder-food.jpg';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PhotoIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {addon.name}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(addon.category)}`}>
                        {addon.category}
                      </span>
                      {!addon.active && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="font-medium text-green-600">
                        {formatPrice(addon.price)}
                      </div>
                      <div className="text-gray-500">
                        {getMeasurementDisplay(addon)}
                      </div>
                      {addon.minQty && addon.maxQty && (
                        <div className="text-gray-500">
                          Qty: {addon.minQty}-{addon.maxQty}
                        </div>
                      )}
                    </div>
                    
                    {addon.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {addon.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => toggleAddonActive(addon.id, addon.active)}
                    disabled={loading}
                    className={`p-2 rounded-lg transition-colors ${
                      addon.active
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                    title={addon.active ? 'Deactivate addon' : 'Activate addon'}
                  >
                    {addon.active ? (
                      <EyeIcon className="w-4 h-4" />
                    ) : (
                      <EyeSlashIcon className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => onEditAddon(addon)}
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                    title="Edit addon"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => deleteAddon(addon.id)}
                    disabled={loading}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    title="Delete addon"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VendorAddonsList;