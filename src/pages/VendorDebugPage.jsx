/**
 * 🔍 VENDOR DEBUG PAGE
 * Debug vendor registration and authentication issues
 */

import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import toast from 'react-hot-toast';

export default function VendorDebugPage() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { message, type, timestamp }]);
  };

  const testVendorRegistration = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addResult('🧪 Starting vendor registration test...', 'info');
      
      // Test data
      const testEmail = `test-vendor-${Date.now()}@example.com`;
      const testPassword = 'testpassword123';
      
      addResult(`📧 Using test email: ${testEmail}`, 'info');
      
      // 1. Test Firebase Auth creation
      addResult('🔐 Testing Firebase Auth account creation...', 'info');
      const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      const vendorId = userCredential.user.uid;
      addResult(`✅ Firebase Auth account created: ${vendorId}`, 'success');
      
      // 2. Test Firestore document creation
      addResult('📝 Testing Firestore vendor document creation...', 'info');
      const vendorDoc = {
        vendorId: vendorId,
        userId: vendorId, // For Firestore rules
        name: 'Test Vendor',
        businessName: 'Test Business',
        email: testEmail,
        phone: '+2348000000000',
        address: 'Test Address, Abeokuta',
        type: 'restaurant',
        categories: ['restaurant'],
        description: 'Test vendor for debugging',
        isOnline: true,
        autoAccept: false,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        availableHours: { start: '08:00', end: '22:00' },
        deliveryTime: '30-45 mins',
        deliveryFee: 200,
        isTemporarilyClosed: false,
        location: {
          address: 'Test Address, Abeokuta',
          coordinates: {
            latitude: 7.1475,
            longitude: 3.3619
          }
        },
        coordinates: {
          latitude: 7.1475,
          longitude: 3.3619
        },
        rating: 4.5,
        totalOrders: 0,
        totalProducts: 0,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      try {
        await setDoc(doc(db, 'vendors', vendorId), vendorDoc);
        addResult('✅ Firestore vendor document created successfully!', 'success');
        addResult('🎉 Vendor registration test PASSED!', 'success');
      } catch (firestoreError) {
        addResult(`❌ Firestore error: ${firestoreError.message}`, 'error');
        addResult(`🔍 Error code: ${firestoreError.code}`, 'error');
        addResult('⚠️ Auth account created but Firestore document failed', 'warning');
      }
      
    } catch (error) {
      addResult(`❌ Test failed: ${error.message}`, 'error');
      addResult(`🔍 Error code: ${error.code}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testFirebaseConnection = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addResult('🔍 Testing Firebase connection...', 'info');
      addResult(`📡 Auth domain: ${auth.config?.authDomain}`, 'info');
      addResult(`🗄️ Project ID: ${auth.config?.projectId}`, 'info');
      addResult('✅ Firebase config loaded successfully', 'success');
    } catch (error) {
      addResult(`❌ Firebase connection error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">🔍 Vendor Debug Panel</h1>
          
          <div className="space-y-4 mb-6">
            <button
              onClick={testFirebaseConnection}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 mr-4"
            >
              {loading ? 'Testing...' : '🔥 Test Firebase Connection'}
            </button>
            
            <button
              onClick={testVendorRegistration}
              disabled={loading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : '🏪 Test Vendor Registration'}
            </button>
          </div>

          {testResults.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Test Results:</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded text-sm font-mono ${
                      result.type === 'success' ? 'bg-green-100 text-green-800' :
                      result.type === 'error' ? 'bg-red-100 text-red-800' :
                      result.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}
                  >
                    <span className="text-xs text-gray-500">[{result.timestamp}]</span> {result.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}