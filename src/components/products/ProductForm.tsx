import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusIcon, TrashIcon, PhotoIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { ToastContainer, useToasts } from '../addons/ToastNotifications';

// Types
type ProductType = "food" | "market";
type AddOn = { 
  id: string; 
  name: string; 
  price: number; 
  imageUrl?: string;
  description?: string;
  category?: "protein" | "carbs" | "spicy" | "drinks" | "dessert";
};
type Variant = { 
  id: string; 
  name: string; 
  price: number; 
  imageUrl?: string; 
  stock?: number;
  description?: string;
};

interface ProductFormProps {
  onSave: (product: any) => void;
  onCancel?: () => void;
  initialData?: any;
  vendorId?: string;
}

export default function ProductForm({ onSave, onCancel, initialData, vendorId }: ProductFormProps) {
  const [productType, setProductType] = useState<ProductType>(initialData?.productType || "food");
  const [name, setName] = useState(initialData?.name || "");
  const [desc, setDesc] = useState(initialData?.description || "");
  const [price, setPrice] = useState<number | "">(initialData?.price || "");
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
  const [category, setCategory] = useState(initialData?.category || "main");
  const [addons, setAddons] = useState<AddOn[]>(initialData?.addons || []);
  const [variants, setVariants] = useState<Variant[]>(initialData?.variants || []);
  const [isLoading, setIsLoading] = useState(false);
  
  const { toasts, showSuccess, showError, showInfo, removeToast } = useToasts();

  // Add-on helpers
  const addAddon = () => {
    const newAddon: AddOn = { 
      id: Date.now().toString(), 
      name: "", 
      price: 0,
      category: "protein",
      description: ""
    };
    setAddons(prev => [...prev, newAddon]);
    showInfo("Add-on Added", "New add-on slot created");
  };

  const removeAddon = (id: string) => {
    setAddons(prev => prev.filter(a => a.id !== id));
    showSuccess("Removed", "Add-on removed successfully");
  };

  const updateAddon = (id: string, field: keyof AddOn, value: any) => {
    setAddons(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  // Variant helpers
  const addVariant = () => {
    const newVariant: Variant = { 
      id: Date.now().toString(), 
      name: "", 
      price: 0,
      stock: 0,
      description: ""
    };
    setVariants(prev => [...prev, newVariant]);
    showInfo("Variant Added", "New variant slot created");
  };

  const removeVariant = (id: string) => {
    setVariants(prev => prev.filter(v => v.id !== id));
    showSuccess("Removed", "Variant removed successfully");
  };

  const updateVariant = (id: string, field: keyof Variant, value: any) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const save = async () => {
    if (!name.trim()) {
      showError("Validation Error", "Product name is required");
      return;
    }

    if (!price || price <= 0) {
      showError("Validation Error", "Valid price is required");
      return;
    }

    setIsLoading(true);
    try {
      const payload = { 
        productType, 
        name: name.trim(), 
        description: desc.trim(), 
        imageUrl: imageUrl.trim(), 
        price: Number(price),
        category: category.trim(),
        addons: addons.filter(a => a.name.trim() && a.price > 0),
        variants: variants.filter(v => v.name.trim() && v.price > 0),
        vendorId,
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true
      };
      
      await onSave(payload);
      showSuccess("Success", `${productType === "food" ? "Food item" : "Market item"} saved successfully`);
    } catch (error) {
      console.error("Error saving product:", error);
      showError("Save Failed", "Failed to save product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    { value: "protein", label: "🍗 Protein", color: "from-green-100 to-emerald-100" },
    { value: "carbs", label: "🍚 Carbs", color: "from-yellow-100 to-orange-100" },
    { value: "spicy", label: "🌶️ Spicy", color: "from-red-100 to-pink-100" },
    { value: "drinks", label: "🥤 Drinks", color: "from-blue-100 to-cyan-100" },
    { value: "dessert", label: "🍰 Desserts", color: "from-purple-100 to-pink-100" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {initialData ? "Edit Product" : "Create New Product"}
            </h1>
            <p className="text-gray-600 mt-1">
              {productType === "food" ? "Add cooked food with optional add-ons" : "Add market items with variants"}
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-8 h-8" />
            </button>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          {/* Product Type Selection */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-900 mb-4">Product Type</label>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { value: "food", label: "🍽️ Cooked Food", desc: "Ready-to-eat meals with optional add-ons" },
                { value: "market", label: "🛒 Market Item", desc: "Raw ingredients with different variants/sizes" }
              ].map((type) => (
                <motion.button
                  key={type.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setProductType(type.value as ProductType)}
                  className={`p-4 rounded-2xl border-2 transition-all text-left ${
                    productType === type.value
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="text-xl font-bold text-gray-900 mb-1">{type.label}</div>
                  <p className="text-sm text-gray-600">{type.desc}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="e.g., Jollof Rice with Chicken"
              />
            </div>

            {/* Base Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {productType === "food" ? "Base Price (₦) *" : "Suggested Price (₦)"}
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="2500"
                min="0"
                step="50"
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Describe your product..."
            />
          </div>

          {/* Category (for food items) */}
          {productType === "food" && (
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="e.g., Nigerian, Chinese, Fast Food"
              />
            </div>
          )}

          {/* Image Upload */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Image
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Upload image and paste URL here"
                />
              </div>
              <button className="px-6 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-gray-400 transition-colors flex items-center gap-2">
                <PhotoIcon className="w-5 h-5" />
                Upload
              </button>
            </div>
            {imageUrl && (
              <div className="mt-4">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-xl border border-gray-200"
                  onError={(e) => {
                    e.currentTarget.src = `/api/placeholder/150/150?text=${encodeURIComponent(name || "Product")}`;
                  }}
                />
              </div>
            )}
          </div>

          {/* Add-ons Section (Food items only) */}
          {productType === "food" && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Add-ons (Optional)</h3>
                  <p className="text-gray-600">Let customers enhance their meal with extras</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={addAddon}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Add-on
                </motion.button>
              </div>

              <AnimatePresence>
                {addons.map((addon, index) => (
                  <motion.div
                    key={addon.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 rounded-2xl p-4 mb-4"
                  >
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          placeholder="Extra Protein"
                          value={addon.name}
                          onChange={(e) => updateAddon(addon.id, "name", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Price (₦)</label>
                        <input
                          type="number"
                          value={addon.price}
                          onChange={(e) => updateAddon(addon.id, "price", Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                          min="0"
                          step="50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                        <select
                          value={addon.category}
                          onChange={(e) => updateAddon(addon.id, "category", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        >
                          {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Image URL</label>
                          <input
                            type="text"
                            placeholder="Optional"
                            value={addon.imageUrl || ""}
                            onChange={(e) => updateAddon(addon.id, "imageUrl", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAddon(addon.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-2"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        placeholder="Brief description of the add-on"
                        value={addon.description || ""}
                        onChange={(e) => updateAddon(addon.id, "description", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {addons.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🍽️</div>
                  <p>No add-ons yet. Click "Add Add-on" to create extras for your food.</p>
                </div>
              )}
            </motion.section>
          )}

          {/* Variants Section (Market items only) */}
          {productType === "market" && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Product Variants</h3>
                  <p className="text-gray-600">Define different sizes, packs, or weights with individual pricing</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={addVariant}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Variant
                </motion.button>
              </div>

              <AnimatePresence>
                {variants.map((variant, index) => (
                  <motion.div
                    key={variant.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 rounded-2xl p-4 mb-4"
                  >
                    <div className="grid md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Variant Name</label>
                        <input
                          type="text"
                          placeholder="Small / 1kg / Bundle"
                          value={variant.name}
                          onChange={(e) => updateVariant(variant.id, "name", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Price (₦)</label>
                        <input
                          type="number"
                          value={variant.price}
                          onChange={(e) => updateVariant(variant.id, "price", Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                          min="0"
                          step="50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Stock</label>
                        <input
                          type="number"
                          placeholder="Available quantity"
                          value={variant.stock || ""}
                          onChange={(e) => updateVariant(variant.id, "stock", e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Image URL</label>
                        <input
                          type="text"
                          placeholder="Variant image"
                          value={variant.imageUrl || ""}
                          onChange={(e) => updateVariant(variant.id, "imageUrl", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeVariant(variant.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-2"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        placeholder="Describe this variant"
                        value={variant.description || ""}
                        onChange={(e) => updateVariant(variant.id, "description", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {variants.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🛒</div>
                  <p>No variants yet. Click "Add Variant" to create different sizes or packs.</p>
                </div>
              )}
            </motion.section>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={save}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : initialData ? "Update Product" : "Create Product"}
            </motion.button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-8 py-4 border border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}