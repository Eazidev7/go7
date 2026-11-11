import React, { useState } from 'react';
import PremiumAddonModal from '../components/PremiumAddonModal';

const PremiumModalExample = () => {
  const [isModalOpen, setModalOpen] = useState(false);

  // Example product data matching the expected structure
  const exampleProduct = {
    id: 'premium-jollof-123',
    name: 'Premium Jollof Rice',
    title: 'Premium Jollof Rice', // Alternative field name
    price: 4500,
    basePrice: 4500, // Alternative field name
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=80', // Alternative field name
    vendorName: 'Golden Spoon Restaurant',
    vendorId: 'golden-spoon-456',
    rating: '4.9'
  };

  // Example addons with all supported properties
  const exampleAddons = [
    {
      id: 'grilled-chicken-001',
      name: 'Grilled Chicken Breast',
      title: 'Grilled Chicken Breast', // Alternative field name
      price: 2000,
      unitLabel: 'piece',
      imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=200&q=80',
      image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=200&q=80', // Alternative field name
      category: 'protein'
    },
    {
      id: 'fried-plantain-002',
      name: 'Sweet Fried Plantain',
      price: 800,
      unitLabel: 'serving',
      imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200&q=80',
      category: 'carbs'
    },
    {
      id: 'pepper-sauce-003',
      name: 'Spicy Pepper Sauce',
      price: 400,
      unitLabel: 'bottle',
      imageUrl: 'https://images.unsplash.com/photo-1583324113626-70df0f4deaab?w=200&q=80',
      category: 'spicy'
    },
    {
      id: 'coleslaw-004',
      name: 'Fresh Garden Coleslaw',
      price: 700,
      unitLabel: 'bowl',
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&q=80',
      category: 'vegetable'
    },
    {
      id: 'soft-drink-005',
      name: 'Chilled Soft Drink',
      price: 500,
      unitLabel: 'bottle',
      imageUrl: 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=200&q=80',
      category: 'drinks'
    }
  ];

  const handleAddToCart = (cartItem) => {
    console.log('🛒 Item added to cart:', cartItem);
    // Here you would typically dispatch to your cart state management
    // or make an API call to add the item to the user's cart
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎨 Premium Add-On Modal
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A complete implementation of the premium add-on modal with all features:
            accessibility, responsive design, cart integration, and beautiful animations.
          </p>
        </div>

        {/* Demo Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                ✨ Features Showcase
              </h2>
              <ul className="space-y-3 text-gray-600 mb-6">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Large product image at top
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Rounded modal card with shadows
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Addon rows with thumbnails
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Unit labels and pricing
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Plus/minus quantity controls
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Big Add to Cart button
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Real-time total calculation
                </li>
              </ul>
              
              <button
                onClick={() => setModalOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                🚀 Open Premium Modal
              </button>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                🛠️ Technical Features
              </h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• <strong>Accessibility:</strong> ARIA labels, keyboard navigation, focus management</li>
                <li>• <strong>Responsive:</strong> Mobile-optimized with swipe-to-dismiss</li>
                <li>• <strong>State Management:</strong> useReducer for addon quantities</li>
                <li>• <strong>Cart Integration:</strong> Seamless integration with existing cart system</li>
                <li>• <strong>Error Handling:</strong> Graceful image loading fallbacks</li>
                <li>• <strong>Animations:</strong> Smooth enter/exit transitions</li>
                <li>• <strong>Dark Mode:</strong> Automatic dark mode support</li>
                <li>• <strong>High Contrast:</strong> Enhanced accessibility modes</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Usage Example */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            📝 Usage Example
          </h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`// Import the component
import PremiumAddonModal from './components/PremiumAddonModal';

// Use in your component
<PremiumAddonModal
  open={isModalOpen}
  onClose={() => setModalOpen(false)}
  product={productData}
  addons={addonsArray}
  onAddToCart={(cartItem) => {
    // Handle cart addition
    console.log('Added to cart:', cartItem);
  }}
/>`}
          </pre>
        </div>

        {/* Data Structure */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              📦 Product Data Structure
            </h3>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
{`{
  id: 'product-id',
  name: 'Product Name',        // or title
  price: 4500,                 // or basePrice
  image: 'image-url',          // or imageUrl
  vendorName: 'Vendor Name',
  vendorId: 'vendor-id',
  rating: '4.9'
}`}
            </pre>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              🧩 Addon Data Structure
            </h3>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
{`{
  id: 'addon-id',
  name: 'Addon Name',          // or title
  price: 2000,
  unitLabel: 'piece',          // e.g. 'serving', 'bottle'
  imageUrl: 'image-url',       // or image
  category: 'protein'          // for styling
}`}
            </pre>
          </div>
        </div>

        <div className="text-center mt-8 text-gray-500">
          <p>🎉 Premium Add-On Modal - Production Ready!</p>
        </div>
      </div>

      {/* The Premium Modal */}
      <PremiumAddonModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        product={exampleProduct}
        addons={exampleAddons}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
};

export default PremiumModalExample;