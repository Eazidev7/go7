import React, { useState } from 'react';
import { bookDelivery } from '../services/deliveryService';
import { showGo7Success, showGo7Error, showGo7Toast } from '../utils/go7Notifications';

const BookingTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const testBooking = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      showGo7Toast('Testing booking service...', 'info');

      const testDeliveryData = {
        pickup: {
          address: "Abeokuta Main Market, Abeokuta, Nigeria",
          lat: 7.1516,
          lng: 3.3467,
        },
        dropoff: {
          address: "Olusegun Obasanjo Presidential Library, Abeokuta, Nigeria",
          lat: 7.1315,
          lng: 3.3622,
        },
        sender: {
          name: "Test Sender",
          phone: "+2348012345678",
          email: "sender@test.com"
        },
        recipient: {
          name: "Test Recipient",
          phone: "+2348087654321",
          email: "recipient@test.com"
        },
        itemDescription: "Test package delivery",
        packageDetails: {
          size: "medium",
          weight: "1-5kg",
          type: "general",
          multiplier: 1
        },
        paymentType: "cash",
        customerId: "test-customer-123"
      };

      console.log('🚀 Testing booking with data:', testDeliveryData);
      
      const deliveryId = await bookDelivery(testDeliveryData);
      
      console.log('✅ Booking successful! ID:', deliveryId);
      setResult({ success: true, deliveryId });
      
      await showGo7Success(
        `Test booking successful! Order ID: ${deliveryId}`,
        '✅ Booking Test Passed!'
      );

    } catch (error) {
      console.error('❌ Booking test failed:', error);
      setResult({ success: false, error: error.message });
      
      await showGo7Error(
        `Booking test failed: ${error.message}`,
        '❌ Test Failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Go7 Booking Service Test</h1>
          
          <div className="space-y-6">
            <p className="text-gray-600">
              Click the button below to test the delivery booking service with sample data.
            </p>
            
            <button
              onClick={testBooking}
              disabled={isLoading}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Testing Booking...
                </div>
              ) : (
                'Test Booking Service'
              )}
            </button>

            {result && (
              <div className={`p-4 rounded-lg ${
                result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <h3 className={`font-semibold ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.success ? '✅ Test Successful' : '❌ Test Failed'}
                </h3>
                <p className={`mt-2 ${
                  result.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.success 
                    ? `Booking created with ID: ${result.deliveryId}` 
                    : `Error: ${result.error}`
                  }
                </p>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Test Data:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>📍 <strong>Pickup:</strong> Abeokuta Main Market</li>
                <li>🏁 <strong>Dropoff:</strong> Olusegun Obasanjo Presidential Library</li>
                <li>👤 <strong>Sender:</strong> Test Sender (+2348012345678)</li>
                <li>👤 <strong>Recipient:</strong> Test Recipient (+2348087654321)</li>
                <li>📦 <strong>Package:</strong> Medium size, 1-5kg, General</li>
                <li>💰 <strong>Payment:</strong> Cash</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingTest;