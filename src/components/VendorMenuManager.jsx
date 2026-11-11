/**
 * 🍱 VENDOR MENU MANAGEMENT SYSTEM
 * Allows vendors to manage their menu items with add-ons
 * Integrated with Firebase Storage and Firestore
 */

import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { uploadImageToHostinger } from '../services/hostingerImageUpload';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Image as ImageIcon, 
  DollarSign,
  Package,
  X,
  Save,
  Camera
} from 'lucide-react';
import toast from 'react-hot-toast';
import addOnService from '../services/addOnServiceV2';

export default function VendorMenuManager({ vendorId }) {
  const [items, setItems] = useState([]);
  const [globalAddons, setGlobalAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    basePrice: '',
    unitLabel: 'plate',
    image: null,
    imagePreview: null
  });
  
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);

  // Fetch menu items and global addons
  useEffect(() => {
    fetchMenuItems();
    fetchGlobalAddons();
  }, [vendorId]);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const menuRef = collection(db, 'vendors', vendorId, 'menus');
      const q = query(menuRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const menuItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setItems(menuItems);
      console.log('📋 Fetched menu items:', menuItems.length);
    } catch (error) {
      console.error('Error fetching menu:', error);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalAddons = async () => {
    try {
      const addons = await addOnService.getVendorAddOns(vendorId);
      setGlobalAddons(addons.filter(addon => addon.isActive !== false));
      console.log('🧩 Fetched global addons:', addons.length);
    } catch (error) {
      console.error('Error fetching global addons:', error);
      toast.error('Failed to load addons');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'image' && files && files[0]) {
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      setForm({ 
        ...form, 
        image: file,
        imagePreview: previewUrl
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const toggleAddonSelection = (addonId) => {
    setSelectedAddonIds(prev => 
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const getSelectedAddons = () => {
    return globalAddons.filter(addon => selectedAddonIds.includes(addon.id));
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      basePrice: '',
      unitLabel: 'plate',
      image: null,
      imagePreview: null
    });
    setSelectedAddonIds([]);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name || !form.basePrice || !form.unitLabel) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!editingId && !form.image) {
      toast.error('Please upload an image');
      return;
    }

    console.log('🍱 Starting menu item submission...');
    console.log('Vendor ID:', vendorId);
    console.log('Form data:', form);

    setSubmitting(true);
    const loadingToast = toast.loading(editingId ? 'Updating item...' : 'Adding item...');

    try {
      let imageUrl = editingId ? items.find(i => i.id === editingId)?.imageUrl : '';

      // Upload new image via Hostinger (Firebase Storage bypass)
      if (form.image) {
        console.log('📸 Uploading image...');
        const timestamp = Date.now();
        const safeName = String(form.image.name || 'menu.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
        imageUrl = await uploadImageToHostinger(
          form.image,
          `vendors/${vendorId}/menu/${timestamp}_${safeName}`
        );
        console.log('✅ Image uploaded:', imageUrl);
      }

      // Get selected global addons
      const selectedAddons = getSelectedAddons();
      console.log('Selected addons:', selectedAddons);

      const menuData = {
        name: form.name.trim(),
        description: form.description.trim(),
        basePrice: parseFloat(form.basePrice),
        unitLabel: form.unitLabel,
        addonIds: selectedAddonIds,
        addOns: selectedAddons.map(addon => ({
          id: addon.id,
          name: addon.name,
          price: addon.price,
          unitLabel: addon.unitLabel || 'piece'
        })),
        imageUrl,
        isAvailable: true,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        // Update existing item
        console.log('📝 Updating menu item:', editingId);
        const itemRef = doc(db, 'vendors', vendorId, 'menus', editingId);
        await updateDoc(itemRef, menuData);
        console.log('✅ Menu item updated');
        toast.success('Menu item updated!', { id: loadingToast });
      } else {
        // Add new item
        console.log('➕ Adding new menu item...');
        menuData.createdAt = serverTimestamp();
        
        console.log('Menu data to save:', menuData);
        console.log('Collection path:', `vendors/${vendorId}/menus`);
        
        const docRef = await addDoc(collection(db, 'vendors', vendorId, 'menus'), menuData);
        console.log('✅ Menu item added with ID:', docRef.id);
        toast.success('Menu item added!', { id: loadingToast });
      }

      console.log('🔄 Resetting form and refreshing menu...');
      resetForm();
      await fetchMenuItems();
      console.log('✅ Menu refresh complete');
    } catch (error) {
      console.error('❌ Error saving menu item:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      toast.error('Failed to save: ' + error.message, { id: loadingToast });
    } finally {
      setSubmitting(false);
      console.log('🏁 Submission complete');
    }
  };

  const handleEdit = (item) => {
    setForm({
      name: item.name,
      description: item.description || '',
      basePrice: item.basePrice.toString(),
      unitLabel: item.unitLabel,
      image: null,
      imagePreview: item.imageUrl
    });
    
    // Set selected addon IDs from the item
    setSelectedAddonIds(item.addonIds || []);
    
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) {
      return;
    }

    const loadingToast = toast.loading('Deleting item...');

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'vendors', vendorId, 'menus', item.id));
      
      // Firestore delete only — Hostinger images stay (no Storage delete API)
      if (item.imageUrl) {
        console.log('Menu item image left on Hostinger (no delete API):', item.imageUrl);
      }

      toast.success('Item deleted!', { id: loadingToast });
      fetchMenuItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete: ' + error.message, { id: loadingToast });
    }
  };

  const toggleAvailability = async (item) => {
    try {
      const itemRef = doc(db, 'vendors', vendorId, 'menus', item.id);
      await updateDoc(itemRef, {
        isAvailable: !item.isAvailable,
        updatedAt: serverTimestamp()
      });
      
      toast.success(item.isAvailable ? 'Item marked unavailable' : 'Item marked available');
      fetchMenuItems();
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error('Failed to update availability');
    }
  };

  return (
    <div className="vendor-menu-manager max-w-6xl mx-auto p-4">
      {/* Add/Edit Form */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-yellow-500" />
            {editingId ? 'Edit Menu Item' : 'Add New Menu Item'}
          </h2>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X size={20} />
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Camera className="inline mr-1" size={16} />
              Item Photo *
            </label>
            <div className="flex items-center gap-4">
              {form.imagePreview && (
                <img
                  src={form.imagePreview}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                />
              )}
              <label className="flex-1 cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-yellow-500 transition">
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <ImageIcon size={20} />
                    <span>{form.image ? form.image.name : 'Click to upload image'}</span>
                  </div>
                </div>
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleInputChange}
              placeholder="e.g. Jollof Rice"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleInputChange}
              placeholder="Delicious rice with tomato sauce..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>

          {/* Base Price & Unit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="inline mr-1" size={16} />
                Base Price (₦) *
              </label>
              <input
                type="number"
                name="basePrice"
                value={form.basePrice}
                onChange={handleInputChange}
                placeholder="300"
                min="0"
                step="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Label *
              </label>
              <select
                name="unitLabel"
                value={form.unitLabel}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              >
                <option value="plate">Plate</option>
                <option value="spoon">Spoon</option>
                <option value="wrap">Wrap</option>
                <option value="portion">Portion</option>
                <option value="pack">Pack</option>
                <option value="bowl">Bowl</option>
                <option value="piece">Piece</option>
                <option value="cup">Cup</option>
                <option value="bottle">Bottle</option>
              </select>
            </div>
          </div>

          {/* Add-ons Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Add-ons (Optional)
              </label>
              <div className="text-sm text-gray-500">
                Select from your global add-ons
              </div>
            </div>

            {globalAddons.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <Package size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500 mb-2">No global add-ons available</p>
                <p className="text-sm text-gray-400">Create add-ons in the "Add-ons" tab first</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {globalAddons.map((addon) => (
                  <label
                    key={addon.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${
                      selectedAddonIds.includes(addon.id)
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAddonIds.includes(addon.id)}
                      onChange={() => toggleAddonSelection(addon.id)}
                      className="mr-3 text-yellow-500 focus:ring-yellow-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{addon.name}</div>
                      <div className="text-sm text-gray-500">
                        ₦{addon.price} per {addon.unitLabel}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {selectedAddonIds.length > 0 && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-800 mb-1">
                  Selected Add-ons ({selectedAddonIds.length})
                </div>
                <div className="text-sm text-green-700">
                  {getSelectedAddons().map(addon => addon.name).join(', ')}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-yellow-500 text-white py-3 rounded-lg font-semibold hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>Processing...</>
            ) : editingId ? (
              <>
                <Save size={20} />
                Update Menu Item
              </>
            ) : (
              <>
                <Plus size={20} />
                Add Menu Item
              </>
            )}
          </button>
        </form>
      </div>

      {/* Menu Items List */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="text-yellow-500" />
          Your Menu Items ({items.length})
        </h3>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading menu items...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No menu items yet. Add your first item above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-4 transition ${
                  item.isAvailable
                    ? 'border-gray-200 bg-white'
                    : 'border-gray-300 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex gap-4">
                  {/* Image */}
                  <img
                    src={item.imageUrl || '/placeholder-food.jpg'}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                  />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {item.name}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {item.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-600 font-bold">
                        ₦{item.basePrice?.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        per {item.unitLabel}
                      </span>
                    </div>
                    {item.addOns && item.addOns.length > 0 && (
                      <p className="text-xs text-gray-500">
                        {item.addOns.length} add-on{item.addOns.length !== 1 ? 's' : ''} available
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => toggleAvailability(item)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      item.isAvailable
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {item.isAvailable ? '✓ Available' : '✗ Unavailable'}
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
