import React from 'react';
import { 
  showGo7Success, 
  showGo7Error, 
  showGo7Warning,
  showRiderUpdate,
  showPricingUpdate,
  showLocationUpdate,
  showOrderStatus,
  showGo7Toast
} from '../utils/go7Notifications';

const Go7NotificationDemo = () => {
  const handleTestSuccess = () => {
    showGo7Success("Your delivery has been booked successfully! Your rider will arrive in 15-20 minutes.");
  };

  const handleTestError = () => {
    showGo7Error("Unable to detect your current location. Please enable GPS and try again.", "GPS Access Denied");
  };

  const handleTestWarning = () => {
    showGo7Warning("This location appears to be outside our service area. Please select a location within Abeokuta.");
  };

  const handleTestRiderUpdate = () => {
    showRiderUpdate("Rider Akeem is 5 minutes away 🚦");
  };

  const handleTestPricingUpdate = () => {
    showPricingUpdate(1750, 1500);
  };

  const handleTestLocationUpdate = () => {
    showLocationUpdate("Pickup location updated to Olumo Rock");
  };

  const handleTestOrderStatus = () => {
    showOrderStatus("rider_assigned", "GO7001", "Akeem O.");
  };

  const handleTestToast = () => {
    showGo7Toast("Settings saved successfully!", "success");
  };

  const handleTestSequence = () => {
    // Simulate a complete delivery booking sequence
    setTimeout(() => showLocationUpdate("Pickup location set"), 500);
    setTimeout(() => showLocationUpdate("Drop-off location set"), 1000);
    setTimeout(() => showPricingUpdate(1500), 1500);
    setTimeout(() => showGo7Success("Order confirmed! Your delivery will arrive soon."), 2000);
    setTimeout(() => showRiderUpdate("Looking for available riders..."), 3000);
    setTimeout(() => showOrderStatus("rider_assigned", "GO7001", "Akeem O."), 4500);
    setTimeout(() => showRiderUpdate("Rider Akeem is on the way 🛵"), 6000);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          🚀 Go7 Notification System Demo
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Test Individual Notifications</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={handleTestSuccess}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ✅ Success Alert
            </button>
            
            <button
              onClick={handleTestError}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ❌ Error Alert
            </button>
            
            <button
              onClick={handleTestWarning}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ⚠️ Warning Alert
            </button>
            
            <button
              onClick={handleTestRiderUpdate}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              🛵 Rider Update
            </button>
            
            <button
              onClick={handleTestPricingUpdate}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              💰 Pricing Update
            </button>
            
            <button
              onClick={handleTestLocationUpdate}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              📍 Location Update
            </button>
            
            <button
              onClick={handleTestOrderStatus}
              className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              📦 Order Status
            </button>
            
            <button
              onClick={handleTestToast}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              🔔 General Toast
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Demo Full Sequence</h2>
          <button
            onClick={handleTestSequence}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            🎬 Play Full Delivery Sequence
          </button>
          <p className="text-gray-600 mt-2 text-sm">
            This will show a complete delivery booking flow with multiple notifications in sequence.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">🎨 Visual Features</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Go7 branded red-white-black color scheme</li>
                <li>• Smooth animations with Animate.css</li>
                <li>• Custom CSS with glow effects and hover states</li>
                <li>• Responsive design for mobile and desktop</li>
                <li>• High contrast and reduced motion support</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">🔊 Audio & UX Features</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Sound effects for different notification types</li>
                <li>• Intelligent positioning (top-right, bottom-right, etc.)</li>
                <li>• Auto-dismiss timers with progress bars</li>
                <li>• Click interaction and hover effects</li>
                <li>• Accessibility support</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Go7NotificationDemo;