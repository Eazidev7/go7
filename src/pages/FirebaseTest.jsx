import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import realtimeTrackingService from '../services/realtimeTracking';
import FirebaseStatusIndicator from '../components/FirebaseStatusIndicator';

const FirebaseTest = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState(null);
    const [testResults, setTestResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setStatus(realtimeTrackingService.getStatus());
    }, []);

    const runConnectivityTest = async () => {
        setIsLoading(true);
        const results = [];

        try {
            // Test 1: Check Firebase initialization
            results.push({
                test: 'Firebase Initialization',
                status: status?.online ? 'PASS' : 'FAIL',
                details: status?.online ? `Connected to project: ${status.project}` : 'Firebase not initialized'
            });

            // Test 2: Test booking creation
            try {
                const testBooking = {
                    pickup: { address: 'Test Pickup', lat: 7.16, lng: 3.35 },
                    dropoff: { address: 'Test Dropoff', lat: 7.17, lng: 3.36 },
                    sender: { name: 'Test User', phone: '+234123456789' },
                    recipient: { name: 'Test Recipient', phone: '+234987654321' },
                    itemDescription: 'Firebase connectivity test',
                    packageDetails: { size: 'small', weight: 'under_5kg', type: 'document' }
                };

                const bookingId = await realtimeTrackingService.createDeliveryBooking(testBooking);
                results.push({
                    test: 'Booking Creation',
                    status: 'PASS',
                    details: `Created booking: ${bookingId}`
                });
            } catch (error) {
                results.push({
                    test: 'Booking Creation',
                    status: 'FAIL',
                    details: error.message
                });
            }

            // Test 3: Test real-time subscription
            try {
                const unsubscribe = realtimeTrackingService.subscribeToActiveRiders((riders) => {
                    console.log('Test subscription received:', riders.length, 'riders');
                });

                results.push({
                    test: 'Real-time Subscription',
                    status: 'PASS',
                    details: 'Successfully subscribed to rider updates'
                });

                // Clean up subscription
                setTimeout(() => {
                    if (unsubscribe) unsubscribe();
                }, 1000);
            } catch (error) {
                results.push({
                    test: 'Real-time Subscription',
                    status: 'FAIL',
                    details: error.message
                });
            }

        } catch (error) {
            results.push({
                test: 'General Connectivity',
                status: 'FAIL',
                details: error.message
            });
        }

        setTestResults(results);
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => navigate('/')}
                                className="text-white hover:text-blue-100 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                                <span className="text-blue-600 font-bold text-xl">🔥</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Firebase Connectivity Test</h1>
                                <p className="text-blue-100 text-sm">Real-time connection diagnostics</p>
                            </div>
                        </div>
                        <FirebaseStatusIndicator className="text-white" />
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Status Overview */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">🔍 Connection Status</h2>

                    {status && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-sm text-gray-600">Firebase Status</div>
                                <div className={`text-lg font-bold ${status.online ? 'text-green-600' : 'text-red-600'}`}>
                                    {status.online ? '🟢 ONLINE' : '🔴 OFFLINE'}
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-sm text-gray-600">Project ID</div>
                                <div className="text-lg font-bold text-gray-900">
                                    {status.project || 'Not connected'}
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-sm text-gray-600">Active Listeners</div>
                                <div className="text-lg font-bold text-blue-600">
                                    {status.listeners}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Test Button */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">🧪 Connectivity Tests</h2>

                    <button
                        onClick={runConnectivityTest}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2"
                    >
                        {isLoading && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>}
                        <span>{isLoading ? 'Testing...' : 'Run Connectivity Tests'}</span>
                    </button>
                </div>

                {/* Test Results */}
                {testResults.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Test Results</h2>

                        <div className="space-y-3">
                            {testResults.map((result, index) => (
                                <div key={index} className={`p-4 rounded-lg border-2 ${result.status === 'PASS'
                                        ? 'border-green-200 bg-green-50'
                                        : 'border-red-200 bg-red-50'
                                    }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-medium text-gray-900">{result.test}</h3>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${result.status === 'PASS'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                            {result.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600">{result.details}</p>
                                </div>
                            ))}
                        </div>

                        {/* Summary */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-600">Summary</div>
                            <div className="text-lg font-bold">
                                {testResults.filter(r => r.status === 'PASS').length} / {testResults.length} tests passed
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FirebaseTest;