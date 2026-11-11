import React, { useState } from 'react';
import CheckoutSummary from '../components/CheckoutSummary';

/**
 * CheckoutSummary Test Page
 * Visual testing for all service types and pricing scenarios
 */
const CheckoutSummaryTest = () => {
  // Sample locations in Abeokuta
  const [pickup, setPickup] = useState({ lat: 7.1580, lng: 3.3650 });
  const [dropoff, setDropoff] = useState({ lat: 7.1420, lng: 3.3580 });
  const [packageSize, setPackageSize] = useState('small');
  const [packageWeight, setPackageWeight] = useState('under_5kg');

  // Sample location presets
  const locations = {
    abeokutaCenter: { lat: 7.1475, lng: 3.3619, name: 'Abeokuta Center' },
    okeIlewo: { lat: 7.1580, lng: 3.3650, name: 'Oke-Ilewo' },
    isabo: { lat: 7.1420, lng: 3.3580, name: 'Isabo' },
    kuto: { lat: 7.1550, lng: 3.3700, name: 'Kuto' },
    ita_eko: { lat: 7.1490, lng: 3.3600, name: 'Ita-Eko' }
  };

  const handleCheckout = (data) => {
    console.log('=== CHECKOUT DATA ===');
    console.log('Service:', data.serviceType);
    console.log('Distance:', data.distance, 'km');
    console.log('Total Fare:', `₦${data.fare}`);
    console.log('Breakdown:', data.fareBreakdown);
    console.log('====================');
    
    alert(`Checkout Summary:\n\nService: ${data.serviceType}\nDistance: ${data.distance}km\nFare: ₦${data.fare}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 CheckoutSummary Component Testing
          </h1>
          <p className="text-gray-600">
            Visual testing for all Go7 service types and pricing scenarios
          </p>
        </div>

        {/* Location Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📍 Location Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pickup */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Location
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-lg"
                onChange={(e) => {
                  const loc = JSON.parse(e.target.value);
                  setPickup({ lat: loc.lat, lng: loc.lng });
                }}
              >
                {Object.entries(locations).map(([key, loc]) => (
                  <option key={key} value={JSON.stringify(loc)}>
                    {loc.name} ({loc.lat}, {loc.lng})
                  </option>
                ))}
              </select>
            </div>

            {/* Dropoff */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dropoff Location
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-lg"
                defaultValue={JSON.stringify(locations.isabo)}
                onChange={(e) => {
                  const loc = JSON.parse(e.target.value);
                  setDropoff({ lat: loc.lat, lng: loc.lng });
                }}
              >
                {Object.entries(locations).map(([key, loc]) => (
                  <option key={key} value={JSON.stringify(loc)}>
                    {loc.name} ({loc.lat}, {loc.lng})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Distance Preview */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Current Distance: ~{Math.sqrt(
                Math.pow((dropoff.lat - pickup.lat) * 111, 2) + 
                Math.pow((dropoff.lng - pickup.lng) * 111, 2)
              ).toFixed(2)} km (approximate)
            </p>
          </div>
        </div>

        {/* Parcel Options */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📦 Parcel Options (for Parcel service only)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Package Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Package Size
              </label>
              <select
                value={packageSize}
                onChange={(e) => setPackageSize(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="small">Small (Base price)</option>
                <option value="medium">Medium (+₦200)</option>
                <option value="large">Large (+₦400)</option>
                <option value="extra_large">Extra Large (+₦600)</option>
              </select>
            </div>

            {/* Package Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Package Weight
              </label>
              <select
                value={packageWeight}
                onChange={(e) => setPackageWeight(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="under_5kg">Under 5kg (No surcharge)</option>
                <option value="5_10kg">5-10kg (+₦300)</option>
                <option value="10_20kg">10-20kg (+₦600)</option>
                <option value="over_20kg">Over 20kg (+₦1000)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Test Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Parcel */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">📦 Parcel Delivery</h3>
            <CheckoutSummary
              serviceType="parcel"
              pickup={pickup}
              dropoff={dropoff}
              packageSize={packageSize}
              packageWeight={packageWeight}
              onCheckout={handleCheckout}
            />
          </div>

          {/* GoBuy */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">🛒 GoBuy Shopping</h3>
            <CheckoutSummary
              serviceType="gobuy"
              pickup={pickup}
              dropoff={dropoff}
              onCheckout={handleCheckout}
            />
          </div>

          {/* Errand */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">🏃 Quick Errand</h3>
            <CheckoutSummary
              serviceType="errand"
              pickup={pickup}
              dropoff={dropoff}
              onCheckout={handleCheckout}
            />
          </div>

          {/* Restaurant */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">🍔 Restaurant</h3>
            <CheckoutSummary
              serviceType="restaurant"
              pickup={pickup}
              dropoff={dropoff}
              onCheckout={handleCheckout}
            />
          </div>

          {/* Vendor */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">🏪 Vendor Pickup</h3>
            <CheckoutSummary
              serviceType="vendor"
              pickup={pickup}
              dropoff={dropoff}
              onCheckout={handleCheckout}
            />
          </div>

          {/* Pharmacy */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">💊 Pharmacy</h3>
            <CheckoutSummary
              serviceType="pharmacy"
              pickup={pickup}
              dropoff={dropoff}
              onCheckout={handleCheckout}
            />
          </div>

        </div>

        {/* Placeholder Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">🔍 Placeholder State Test</h2>
          <p className="text-gray-600 mb-4">Component with no locations selected:</p>
          <CheckoutSummary
            serviceType="parcel"
            pickup={null}
            dropoff={null}
            onCheckout={handleCheckout}
          />
        </div>

        {/* Pricing Reference */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">💰 Pricing Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            
            <div className="p-3 bg-blue-50 rounded">
              <h4 className="font-semibold mb-2">📦 Parcel</h4>
              <p>Base: ₦700</p>
              <p>Per km: ₦200</p>
              <p>Size/Weight: Variable</p>
            </div>

            <div className="p-3 bg-green-50 rounded">
              <h4 className="font-semibold mb-2">🛒 GoBuy</h4>
              <p>Base: ₦800</p>
              <p>Service: +₦500</p>
              <p>Per km: ₦200</p>
            </div>

            <div className="p-3 bg-yellow-50 rounded">
              <h4 className="font-semibold mb-2">🏃 Errand</h4>
              <p>Base: ₦800</p>
              <p>Per km: ₦100</p>
            </div>

            <div className="p-3 bg-red-50 rounded">
              <h4 className="font-semibold mb-2">🍔 Restaurant</h4>
              <p>≤3km: Flat ₦700</p>
              <p>Base: ₦500</p>
              <p>Per km: ₦200</p>
            </div>

            <div className="p-3 bg-purple-50 rounded">
              <h4 className="font-semibold mb-2">🏪 Vendor</h4>
              <p>Base: ₦600</p>
              <p>Per km: ₦150</p>
            </div>

            <div className="p-3 bg-pink-50 rounded">
              <h4 className="font-semibold mb-2">💊 Pharmacy</h4>
              <p>Base: ₦600</p>
              <p>Per km: ₦150</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default CheckoutSummaryTest;
