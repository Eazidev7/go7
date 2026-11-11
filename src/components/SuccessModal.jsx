import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { currencyFormatNGN, formatDistance } from '../utils/pricing';
import api from '../api';

const SuccessModal = ({ isOpen, onClose, data }) => {
  const navigate = useNavigate();
  const [bookingId, setBookingId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Create booking when modal opens
  useEffect(() => {
    if (isOpen && data && !bookingId) {
      createAndSaveBooking();
    }
  }, [isOpen, data]);

  const createAndSaveBooking = async () => {
    if (!data || isCreating) return;
    
    setIsCreating(true);
    
    // Generate booking ID
    const newBookingId = `GO7-${Date.now()}`;
    setBookingId(newBookingId);
    
    // Create a properly formatted booking object with all required fields
    const bookingData = {
      id: newBookingId,
      jobId: newBookingId,
      pickup: data.pickup,
      dropoff: data.dropoff,
      rider: data.rider,
      // Use new standard field names, but keep old ones for backward compatibility
      fare: data.fare || data.priceNaira,
      fareNaira: data.fareNaira || data.fare || data.priceNaira,
      distanceKm: data.distanceKm || data.distance,
      etaMins: data.etaMins || parseInt(data.eta) || 25,
      serviceType: data.serviceType || 'standard',
      status: 'assigned',
      createdAt: new Date().toISOString(),
      // Add any additional fields that might be needed
      paymentStatus: data.paymentStatus || 'paid',
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      notes: data.notes
    };
    
    try {
      // Save to our bookings API and localStorage for retrieval by tracking page
      const response = await api.createBooking(bookingData);
      
      if (response.success) {
        console.log('Booking created successfully:', response.data);
        setIsCreating(false);
      } else {
        console.error('Failed to create booking:', response.error);
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      setIsCreating(false);
    }
  };

  const handleTrackOrder = () => {
    // Navigate to the tracking page
    navigate(`/track-order/${bookingId}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Success Icon */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✅</span>
        </div>
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Rider Assigned
        </h2>
        
        {/* Payment Status Badge */}
        <div className="flex justify-center mb-4">
          {data.payment?.method === 'paystack' && data.payment?.status === 'paid' ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <span className="mr-1">✓</span> Paid via Paystack
            </span>
          ) : data.payment?.method === 'paystack' && data.payment?.status === 'pending' ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              <span className="mr-1">⌛</span> Payment Processing
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              <span className="mr-1">💵</span> Pay on Delivery
            </span>
          )}
        </div>
        
        {/* Rider Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="text-center">
            <p className="font-semibold text-gray-900 text-lg">
              {data.rider.name}
            </p>
            <p className="text-gray-600">
              #{data.rider.id} • ETA {data.rider.etaMin} mins
            </p>
          </div>
        </div>
        
        {/* Trip Summary */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Route:</span>
            <span className="font-medium text-right">
              {data.pickupArea} → {data.dropoffArea}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Distance:</span>
            <span className="font-medium">
              {data.distanceKm ? formatDistance(data.distanceKm) : '--'}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Estimated Time:</span>
            <span className="font-medium">
              {data.etaMins ? `${data.etaMins} mins` : '--'}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Fare:</span>
            <span className="font-semibold text-red-600">
              {currencyFormatNGN(data.fareNaira || data.fare)}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Job ID:</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
              {bookingId}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Payment:</span>
            <span className="font-medium">
              {data.payment?.method === 'paystack' ? 'Card/Transfer (Paystack)' : 'Pay on Delivery'}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Status:</span>
            <span className={`font-medium ${
              data.payment?.status === 'paid' ? 'text-green-600' : 
              data.payment?.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {data.payment?.status === 'paid' ? 'Paid' : 
               data.payment?.status === 'failed' ? 'Failed' : 'Pending'}
            </span>
          </div>
        </div>
        
        {/* Pricing Breakdown */}
        <div className="bg-gray-50 rounded-lg p-3 mb-6">
          <h4 className="text-sm font-semibold mb-2">Fare Breakdown</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-gray-600">Base Fare:</span>
            <span className="text-right">₦800</span>
            
            <span className="text-gray-600">Distance ({Math.max(data.distanceKm || 0, 1)} km):</span>
            <span className="text-right">₦{(Math.max(data.distanceKm || 0, 1) * 200).toLocaleString()}</span>
            
            <span className="text-gray-600">Service Level:</span>
            <span className="text-right capitalize">{data.priority} {data.priority === 'express' ? '(1.5×)' : '(1.0×)'}</span>
            
            <span className="text-gray-600 font-medium border-t border-gray-200 pt-1 mt-1">Total:</span>
            <span className="text-right font-semibold border-t border-gray-200 pt-1 mt-1">{currencyFormatNGN(data.fare)}</span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleTrackOrder}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
            aria-label="Track your order"
          >
            <span>📱</span>
            <span>Track Order</span>
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            aria-label="Close modal"
          >
            Close
          </button>
        </div>
        
        {/* Note */}
        <p className="text-xs text-gray-500 text-center mt-4">
          You will receive SMS updates about your delivery
        </p>
      </div>
    </div>
  );
};

export default SuccessModal;
