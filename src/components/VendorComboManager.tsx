/**
 * 🔥 VENDOR COMBO RUSH MANAGER
 * 
 * Allows vendors to create and manage combo deals for GO7 Combo Rush
 * Features: Create combos, set time limits, manage flash deals
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Clock,
  Zap,
  DollarSign,
  Package,
  Save,
  X,
  Image as ImageIcon,
  Timer,
  Target,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  createCombo, 
  getVendorCombos, 
  updateCombo, 
  deleteCombo, 
  getVendorProducts,
  V2Combo, 
  ComboItem,
  V2Product 
} from '../services/productServiceV2';

interface VendorComboManagerProps {
  vendorId: string;
  vendorName: string;
}

const VendorComboManager: React.FC<VendorComboManagerProps> = ({ vendorId, vendorName }) => {
  const [combos, setCombos] = useState<V2Combo[]>([]);
  const [products, setProducts] = useState<V2Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Fast Food',
    timeLimit: 60, // minutes
    maxQuantity: 100,
    image: null as File | null,
    imagePreview: null as string | null
  });
  
  const [comboItems, setComboItems] = useState<ComboItem[]>([
    { name: '', quantity: 1, price: 0 }
  ]);

  // Fetch data on mount
  useEffect(() => {
    if (vendorId) {
      Promise.all([
        fetchCombos(),
        fetchProducts()
      ]).then(() => setLoading(false));
    }
  }, [vendorId]);

  const fetchCombos = async () => {
    try {
      console.log('🎯 Fetching combos for vendor:', vendorId);
      const combosData = await getVendorCombos(vendorId);
      console.log(`✅ Found ${combosData.length} combos:`, combosData);
      setCombos(combosData);
    } catch (error) {
      console.error('❌ Error fetching combos:', error);
      toast.error('Failed to load combos');
    }
  };

  const fetchProducts = async () => {
    try {
      const productsData = await getVendorProducts(vendorId);
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      category: 'Fast Food',
      timeLimit: 60,
      maxQuantity: 100,
      image: null,
      imagePreview: null
    });
    setComboItems([{ name: '', quantity: 1, price: 0 }]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm(prev => ({ ...prev, image: file }));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, imagePreview: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addComboItem = () => {
    setComboItems(prev => [...prev, { name: '', quantity: 1, price: 0 }]);
  };

  const removeComboItem = (index: number) => {
    if (comboItems.length > 1) {
      setComboItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateComboItem = (index: number, field: keyof ComboItem, value: any) => {
    setComboItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const calculatePricing = () => {
    const originalPrice = comboItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    const comboPrice = Math.round(originalPrice * 0.75); // 25% discount
    const savings = originalPrice - comboPrice;
    return { originalPrice, comboPrice, savings };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim() || comboItems.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { originalPrice, comboPrice, savings } = calculatePricing();

    if (originalPrice <= 0) {
      toast.error('Please add items with valid prices');
      return;
    }

    setSubmitting(true);

    try {
      const comboData = {
        name: form.name,
        description: form.description,
        vendorId,
        vendorName,
        vendorLogo: '', // Would be set from vendor profile
        image: form.imagePreview || 'https://via.placeholder.com/400x300',
        items: comboItems.filter(item => item.name.trim()),
        originalPrice,
        comboPrice,
        savings,
        timeLeft: form.timeLimit,
        soldCount: 0,
        maxQuantity: form.maxQuantity,
        category: form.category,
        isActive: true,
        rating: 4.5 // Default rating
      };

      if (editingId) {
        await updateCombo(vendorId, editingId, comboData);
        toast.success('Combo updated successfully!');
      } else {
        await createCombo(vendorId, comboData);
        toast.success('Combo created successfully!');
      }

      await fetchCombos();
      resetForm();
    } catch (error) {
      console.error('Error saving combo:', error);
      toast.error('Failed to save combo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (combo: V2Combo) => {
    setForm({
      name: combo.name,
      description: combo.description,
      category: combo.category,
      timeLimit: combo.timeLeft,
      maxQuantity: combo.maxQuantity,
      image: null,
      imagePreview: combo.image
    });
    setComboItems(combo.items);
    setEditingId(combo.id);
    setShowForm(true);
  };

  const handleDelete = async (comboId: string) => {
    if (!confirm('Are you sure you want to delete this combo?')) return;

    try {
      await deleteCombo(vendorId, comboId);
      toast.success('Combo deleted successfully');
      await fetchCombos();
    } catch (error) {
      console.error('Error deleting combo:', error);
      toast.error('Failed to delete combo');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="h-6 w-6 text-red-600" />
            GO7 Combo Rush
          </h2>
          <p className="text-gray-600 mt-1">Create limited-time combo deals to boost sales</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Combo
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{combos.length}</p>
              <p className="text-xs text-gray-500">Active Combos</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {combos.reduce((sum, combo) => sum + combo.soldCount, 0)}
              </p>
              <p className="text-xs text-gray-500">Total Sold</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                ₦{combos.reduce((sum, combo) => sum + (combo.soldCount * combo.comboPrice), 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Combo Revenue</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Target className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                ₦{combos.reduce((sum, combo) => sum + combo.savings, 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Customer Savings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Combo Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingId ? 'Edit Combo' : 'Create New Combo'}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Combo Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="e.g., Mega Chicken Feast"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="Fast Food">Fast Food</option>
                        <option value="Pizza">Pizza</option>
                        <option value="Breakfast">Breakfast</option>
                        <option value="Burgers">Burgers</option>
                        <option value="Local">Local Dishes</option>
                        <option value="Drinks">Drinks</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      rows={3}
                      placeholder="Describe your combo deal..."
                    />
                  </div>

                  {/* Time & Quantity Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Timer className="h-4 w-4 inline mr-1" />
                        Time Limit (minutes)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="1440"
                        value={form.timeLimit}
                        onChange={(e) => setForm(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Target className="h-4 w-4 inline mr-1" />
                        Max Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={form.maxQuantity}
                        onChange={(e) => setForm(prev => ({ ...prev, maxQuantity: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>

                  {/* Combo Items */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Combo Items *
                      </label>
                      <button
                        type="button"
                        onClick={addComboItem}
                        className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add Item
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {comboItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Item name"
                            value={item.name}
                            onChange={(e) => updateComboItem(index, 'name', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          />
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateComboItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          />
                          <input
                            type="number"
                            min="0"
                            placeholder="Price"
                            value={item.price}
                            onChange={(e) => updateComboItem(index, 'price', parseFloat(e.target.value) || 0)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          />
                          {comboItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeComboItem(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Preview */}
                  {(() => {
                    const { originalPrice, comboPrice, savings } = calculatePricing();
                    if (originalPrice > 0) {
                      return (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Pricing Preview</h4>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-500 line-through">₦{originalPrice.toLocaleString()}</span>
                            <span className="text-lg font-bold text-red-600">₦{comboPrice.toLocaleString()}</span>
                            <span className="text-green-600 font-medium">Save ₦{savings.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Combo Image
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                      {form.imagePreview ? (
                        <div className="relative">
                          <img
                            src={form.imagePreview}
                            alt="Preview"
                            className="max-w-xs max-h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, imagePreview: null, image: null }))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1 text-center">
                          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label className="relative cursor-pointer bg-white rounded-md font-medium text-red-600 hover:text-red-500">
                              <span>Upload a file</span>
                              <input
                                type="file"
                                className="sr-only"
                                accept="image/*"
                                onChange={handleImageChange}
                              />
                            </label>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="flex items-center gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {submitting ? 'Saving...' : (editingId ? 'Update Combo' : 'Create Combo')}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Combos List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {combos.map((combo) => (
          <div key={combo.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="relative">
              <img
                src={combo.image}
                alt={combo.name}
                className="w-full h-40 object-cover"
              />
              <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                {combo.timeLeft}m left
              </div>
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                {combo.soldCount} sold
              </div>
            </div>
            
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{combo.name}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{combo.description}</p>
              
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1">Items:</div>
                {combo.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="text-xs text-gray-600">
                    • {item.name} ({item.quantity}x)
                  </div>
                ))}
                {combo.items.length > 3 && (
                  <div className="text-xs text-gray-500">+{combo.items.length - 3} more items</div>
                )}
              </div>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm text-gray-500 line-through">₦{combo.originalPrice.toLocaleString()}</span>
                  <div className="text-lg font-bold text-red-600">₦{combo.comboPrice.toLocaleString()}</div>
                </div>
                <div className="text-sm text-green-600 font-medium">
                  Save ₦{combo.savings.toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(combo)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(combo.id)}
                  className="flex-1 bg-red-100 text-red-700 py-2 px-3 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {combos.length === 0 && (
        <div className="text-center py-12">
          <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No combo deals yet</h3>
          <p className="text-gray-600 mb-4">Create your first combo deal to boost sales and attract customers!</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Create Your First Combo
          </button>
        </div>
      )}
    </div>
  );
};

export default VendorComboManager;