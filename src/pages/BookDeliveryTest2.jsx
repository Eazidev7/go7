import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function BookDeliveryTest() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        pickupAddress: '',
        dropoffAddress: '',
        packageSize: 'small',
        recipientName: '',
        recipientPhone: '',
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        alert('Booking functionality coming soon!');
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Helmet>
                <title>Book Delivery - Test | Go7</title>
            </Helmet>

            {/* Header */}
            <div className="bg-red-600 text-white p-4 sticky top-0 z-10">
                <div className="flex items-center">
                    <button
                        onClick={() => navigate('/')}
                        className="mr-3 p-2 rounded-full hover:bg-red-700 transition-colors"
                    >
                        ←
                    </button>
                    <h1 className="text-xl font-bold">Book a Delivery (Test)</h1>
                </div>
            </div>

            {/* Form */}
            <div className="p-4 max-w-2xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Pickup Address */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            📍 Pickup Address
                        </label>
                        <input
                            type="text"
                            name="pickupAddress"
                            value={formData.pickupAddress}
                            onChange={handleInputChange}
                            placeholder="Enter pickup location"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Dropoff Address */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            🎯 Dropoff Address
                        </label>
                        <input
                            type="text"
                            name="dropoffAddress"
                            value={formData.dropoffAddress}
                            onChange={handleInputChange}
                            placeholder="Enter delivery destination"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Package Size */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            📦 Package Size
                        </label>
                        <select
                            name="packageSize"
                            value={formData.packageSize}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            required
                        >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                        </select>
                    </div>

                    {/* Recipient Name */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            👤 Recipient Name
                        </label>
                        <input
                            type="text"
                            name="recipientName"
                            value={formData.recipientName}
                            onChange={handleInputChange}
                            placeholder="Enter recipient's name"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Recipient Phone */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            📱 Recipient Phone
                        </label>
                        <input
                            type="tel"
                            name="recipientPhone"
                            value={formData.recipientPhone}
                            onChange={handleInputChange}
                            placeholder="Enter recipient's phone number"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full bg-red-600 text-white px-6 py-4 rounded-lg font-bold text-lg hover:bg-red-700 transition-colors shadow-lg"
                    >
                        Continue to Payment
                    </button>
                </form>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                        💡 <strong>Note:</strong> This is a simplified test version. The full version includes map integration, real-time pricing, and rider assignment.
                    </p>
                </div>
            </div>
        </div>
    );
}
