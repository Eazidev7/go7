import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Package, DollarSign, Camera, ImageIcon } from 'lucide-react';
import { uploadVendorImagePreferHostinger } from '../services/hostingerImageUpload';

const VendorComboManager = ({ vendorId, vendorName }) => {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    items: [{ name: '', price: '' }],
    category: 'combo',
    isActive: true,
    image: null,
    imagePreview: null
  });

  // Fetch combos on component mount
  useEffect(() => {
    if (!vendorId) return;

    console.log('🔍 Setting up combo listener for vendor:', vendorId);
    console.log('📍 Firestore path: vendors/' + vendorId + '/combos');

    const combosRef = collection(db, 'vendors', vendorId, 'combos');

    const unsubscribe = onSnapshot(
      combosRef,
      (snapshot) => {
        const combosList = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          combosList.push({ id: docSnap.id, ...data });
        });
        setCombos(combosList);
        setLoading(false);
      },
      (error) => {
        console.error('Combo listener error:', error);
        setCombos([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [vendorId]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const isEditing = Boolean(editingCombo);
    const hasImage = Boolean(formData.image) || (isEditing && formData.imagePreview);

    if (!formData.name.trim() || !formData.price || !hasImage) {
      toast.error('Please add combo name, price, and photo');
      return;
    }

    const validItems = formData.items
      .filter(item => item.name.trim() && item.price)
      .map(item => ({
        name: item.name.trim(),
        price: parseFloat(item.price)
      }));
    if (validItems.length === 0) {
      toast.error('Please add at least one item with name and price');
      return;
    }

    try {
      setSaving(true);
      let imageUrl = isEditing ? (formData.imagePreview || '') : '';

      if (formData.image instanceof File) {
        const fileName = `${Date.now()}_${formData.image.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        imageUrl = await uploadVendorImagePreferHostinger(
          formData.image,
          `vendors/${vendorId}/combos/${fileName}`
        );
      }

      const comboPrice = parseFloat(formData.price);
      const originalPrice = parseFloat(formData.originalPrice) || comboPrice;

      if (isEditing) {
        const updateData = {
          name: String(formData.name || ''),
          description: String(formData.description || ''),
          category: String(formData.category || 'combo'),
          isActive: Boolean(formData.isActive),
          items: validItems,
          price: comboPrice,
          comboPrice,
          originalPrice,
          savings: Math.max(0, originalPrice - comboPrice),
          updatedAt: serverTimestamp(),
        };
        if (imageUrl) {
          updateData.imageUrl = imageUrl;
          updateData.image = imageUrl;
        }
        await updateDoc(doc(db, 'vendors', vendorId, 'combos', editingCombo.id), updateData);
        toast.success('Combo updated successfully!');
      } else {
        const comboData = {
          name: String(formData.name || ''),
          description: String(formData.description || ''),
          category: String(formData.category || 'combo'),
          isActive: Boolean(formData.isActive),
          items: validItems,
          price: comboPrice,
          comboPrice,
          originalPrice,
          savings: Math.max(0, originalPrice - comboPrice),
          timeLeft: 120,
          soldCount: 0,
          rating: 4.5,
          imageUrl: String(imageUrl || ''),
          image: String(imageUrl || ''),
          vendorId: String(vendorId || ''),
          vendorName: String(vendorName || ''),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await addDoc(collection(db, 'vendors', vendorId, 'combos'), comboData);
        toast.success('Combo created successfully!');
      }

      resetForm();
    } catch (error) {
      console.error('Error saving combo:', error);
      const msg = error?.code === 'permission-denied'
        ? 'Permission denied. Make sure you are logged in as this vendor.'
        : (error?.message || 'Failed to save combo. Please try again.');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imagePreview: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      originalPrice: '',
      items: [{ name: '', price: '' }],
      category: 'combo',
      isActive: true,
      image: null,
      imagePreview: null
    });
    setEditingCombo(null);
    setShowModal(false);
  };

  // Edit combo
  const handleEdit = (combo) => {
    setFormData({
      name: combo.name,
      description: combo.description || '',
      price: combo.price.toString(),
      originalPrice: combo.originalPrice?.toString() || combo.price.toString(),
      items: combo.items || [{ name: '', price: '' }],
      category: combo.category || 'combo',
      isActive: combo.isActive !== false,
      image: null,
      imagePreview: combo.imageUrl || null
    });
    setEditingCombo(combo);
    setShowModal(true);
  };

  // Delete combo
  const handleDelete = async (comboId) => {
    if (!confirm('Are you sure you want to delete this combo?')) return;
    
    try {
      await deleteDoc(doc(db, 'vendors', vendorId, 'combos', comboId));
      toast.success('Combo deleted successfully!');
    } catch (error) {
      console.error('Error deleting combo:', error);
      toast.error('Failed to delete combo');
    }
  };

  // Add new item to combo
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', price: '' }]
    }));
  };

  // Remove item from combo
  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Update item
  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Combo Rush Manager</h2>
          <p className="text-gray-600 mt-1">Create and manage combo deals for your restaurant</p>
        </div>
        <button
          onClick={() => {
            setEditingCombo(null);
            setShowModal(true);
          }}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Create Combo</span>
        </button>
      </div>

      {/* Combos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {combos.map((combo) => (
          <div key={combo.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-gray-900">{combo.name}</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(combo)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(combo.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <p className="text-gray-600 text-sm mb-3">{combo.description}</p>
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <DollarSign size={16} className="text-green-600" />
                <span className="font-bold text-green-600">₦{combo.price?.toLocaleString()}</span>
                {combo.originalPrice && combo.originalPrice > combo.price && (
                  <span className="text-sm text-gray-500 line-through">₦{combo.originalPrice.toLocaleString()}</span>
                )}
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                combo.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {combo.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="border-t pt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Items included:</p>
              <div className="space-y-1">
                {combo.items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{item.name}</span>
                    <span className="text-gray-500">₦{parseFloat(item.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {combos.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No combos yet</h3>
          <p className="text-gray-600">Create your first combo deal to boost sales!</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingCombo ? 'Edit Combo' : 'Create New Combo'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Combo Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="e.g. Family Feast Combo"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="combo">Combo Deal</option>
                      <option value="family">Family Pack</option>
                      <option value="value">Value Meal</option>
                      <option value="special">Special Offer</option>
                    </select>
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Combo Price (₦) *
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="2500"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Original Price (₦)
                    </label>
                    <input
                      type="number"
                      value={formData.originalPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="3000"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">Show original price for discount display</p>
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Camera className="inline mr-1" size={16} />
                    Combo Photo *
                  </label>
                  <div className="flex items-center gap-4">
                    {formData.imagePreview && (
                      <img
                        src={formData.imagePreview}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                      />
                    )}
                    <label className="flex-1 cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-red-500 transition">
                        <div className="flex items-center justify-center gap-2 text-gray-600">
                          <ImageIcon size={20} />
                          <span>{formData.image ? formData.image.name : 'Click to upload combo image'}</span>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows="3"
                    placeholder="Describe what's included in this combo..."
                  />
                </div>

                {/* Items Section */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Combo Items *
                    </label>
                    <button
                      type="button"
                      onClick={addItem}
                      className="text-red-600 hover:text-red-800 text-sm flex items-center space-x-1"
                    >
                      <Plus size={16} />
                      <span>Add Item</span>
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 px-3 text-sm text-gray-600">
                      <div className="flex-1">Item Name</div>
                      <div className="w-32">Price (₦)</div>
                      <div className="w-8"></div>
                    </div>
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            placeholder="Item name (e.g. Chicken Burger)"
                          />
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItem(index, 'price', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            placeholder="Price"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Make this combo active and available for ordering
                  </label>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : (editingCombo ? 'Update Combo' : 'Create Combo')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorComboManager;