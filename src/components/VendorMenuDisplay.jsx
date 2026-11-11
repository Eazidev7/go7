/**
 * 🍽️ VENDOR MENU DISPLAY - Customer-facing menu viewer
 * Shows vendor menu items with add-ons for ordering
 * Integrated with cart system
 */

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCart } from '../contexts/CartContext';
import { Plus, Minus, ShoppingCart, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VendorMenuDisplay({ vendorId, vendorName }) {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedAddOns, setSelectedAddOns] = useState({});
  const { addToCart } = useCart();

  useEffect(() => {
    fetchMenu();
  }, [vendorId]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const menuRef = collection(db, 'vendors', vendorId, 'menus');
      const q = query(
        menuRef, 
        where('isAvailable', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMenuItems(items);
    } catch (error) {
      console.error('Error fetching menu:', error);
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const openItemModal = (item) => {
    setSelectedItem(item);
    setQuantity(1);
    setSelectedAddOns({});
  };

  const closeModal = () => {
    setSelectedItem(null);
    setQuantity(1);
    setSelectedAddOns({});
  };

  const toggleAddOn = (addOnName, addOn) => {
    setSelectedAddOns(prev => {
      const newAddOns = { ...prev };
      if (newAddOns[addOnName]) {
        delete newAddOns[addOnName];
      } else {
        newAddOns[addOnName] = addOn;
      }
      return newAddOns;
    });
  };

  const calculateTotal = () => {
    if (!selectedItem) return 0;
    
    const baseTotal = selectedItem.basePrice * quantity;
    const addOnsTotal = Object.values(selectedAddOns).reduce(
      (sum, addOn) => sum + addOn.price,
      0
    ) * quantity;
    
    return baseTotal + addOnsTotal;
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    const cartItem = {
      vendorId,
      vendorName,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      basePrice: selectedItem.basePrice,
      unitLabel: selectedItem.unitLabel,
      quantity,
      addOns: Object.values(selectedAddOns),
      imageUrl: selectedItem.imageUrl,
      total: calculateTotal()
    };

    addToCart(cartItem);
    toast.success(`${selectedItem.name} added to cart!`);
    closeModal();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading menu...</p>
      </div>
    );
  }

  if (menuItems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No menu items available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="vendor-menu-display">
      {/* Menu Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {menuItems.map((item) => (
          <div
            key={item.id}
            onClick={() => openItemModal(item)}
            className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition group"
          >
            {/* Image */}
            <div className="relative h-48 overflow-hidden">
              <img
                src={item.imageUrl || '/placeholder-food.jpg'}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
              />
              {item.addOns && item.addOns.length > 0 && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                  +{item.addOns.length} add-ons
                </div>
              )}
            </div>

            {/* Details */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1 truncate">
                {item.name}
              </h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {item.description || 'No description available'}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-yellow-600 font-bold text-lg">
                  ₦{item.basePrice?.toLocaleString()}
                </span>
                <span className="text-xs text-gray-500">
                  per {item.unitLabel}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedItem.name}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Image */}
              <img
                src={selectedItem.imageUrl || '/placeholder-food.jpg'}
                alt={selectedItem.name}
                className="w-full h-64 object-cover rounded-lg mb-4"
              />

              {/* Description */}
              {selectedItem.description && (
                <p className="text-gray-700 mb-6">
                  {selectedItem.description}
                </p>
              )}

              {/* Base Price */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">Base Price</span>
                  <span className="text-yellow-600 font-bold text-xl">
                    ₦{selectedItem.basePrice?.toLocaleString()} / {selectedItem.unitLabel}
                  </span>
                </div>
              </div>

              {/* Add-ons */}
              {selectedItem.addOns && selectedItem.addOns.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Add-ons (Optional)
                  </h3>
                  <div className="space-y-2">
                    {selectedItem.addOns.map((addOn, index) => (
                      <label
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={!!selectedAddOns[addOn.name]}
                            onChange={() => toggleAddOn(addOn.name, addOn)}
                            className="w-5 h-5 text-yellow-500 rounded focus:ring-2 focus:ring-yellow-500"
                          />
                          <div>
                            <span className="font-medium text-gray-900">
                              {addOn.name}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({addOn.unitLabel})
                            </span>
                          </div>
                        </div>
                        <span className="text-yellow-600 font-semibold">
                          +₦{addOn.price?.toLocaleString()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Quantity</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-yellow-500 hover:text-yellow-500 transition"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="text-2xl font-bold text-gray-900 w-12 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-yellow-500 hover:text-yellow-500 transition"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              {/* Total */}
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">Total Price</span>
                  <span className="text-yellow-600 font-bold text-2xl">
                    ₦{calculateTotal().toLocaleString()}
                  </span>
                </div>
                {Object.keys(selectedAddOns).length > 0 && (
                  <p className="text-xs text-gray-600 mt-2">
                    Includes {Object.keys(selectedAddOns).length} add-on(s)
                  </p>
                )}
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                className="w-full bg-yellow-500 text-white py-4 rounded-lg font-semibold hover:bg-yellow-600 transition flex items-center justify-center gap-2"
              >
                <ShoppingCart size={20} />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
