import React, { useState } from 'react';
import { runSeedAndSimulation, seedRiders, seedOrders, simulateJobAssignment } from '../utils/riderSeedData';
import { Database, Users, Package, Zap, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

const RiderSystemTest = () => {
  const [loading, setLoading] = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  const handleRunFullSeed = async () => {
    try {
      setLoading(true);
      const result = await runSeedAndSimulation();
      setSeedResult(result);
      
      Swal.fire({
        icon: 'success',
        title: 'Seed Complete!',
        html: `
          <div class="text-left">
            <p class="mb-2">✅ ${result.riders.length} riders created</p>
            <p class="mb-2">✅ ${result.orders.length} orders created</p>
            <p class="mb-2">✅ 1 assignment simulated</p>
            <hr class="my-3">
            <p class="text-sm font-semibold">Demo Credentials:</p>
            <p class="text-sm">Email: rider@go7.com</p>
            <p class="text-sm">Password: rider123</p>
          </div>
        `,
        confirmButtonColor: '#E30613'
      });
    } catch (error) {
      console.error('Seed error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Seed Failed',
        text: error.message,
        confirmButtonColor: '#E30613'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedRiders = async () => {
    try {
      setLoading(true);
      const riders = await seedRiders();
      Swal.fire({
        icon: 'success',
        title: 'Riders Seeded!',
        text: `${riders.length} riders created successfully`,
        confirmButtonColor: '#E30613'
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message,
        confirmButtonColor: '#E30613'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedOrders = async () => {
    try {
      setLoading(true);
      const orders = await seedOrders();
      Swal.fire({
        icon: 'success',
        title: 'Orders Seeded!',
        text: `${orders.length} orders created successfully`,
        confirmButtonColor: '#E30613'
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message,
        confirmButtonColor: '#E30613'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateAssignment = async () => {
    try {
      setLoading(true);
      await simulateJobAssignment('rider-001', 'order-001');
      Swal.fire({
        icon: 'success',
        title: 'Assignment Simulated!',
        text: 'Job assigned to rider-001',
        confirmButtonColor: '#E30613'
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message,
        confirmButtonColor: '#E30613'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-red-600 to-red-700 text-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center space-x-4">
            <Database className="w-12 h-12" />
            <div>
              <h1 className="text-3xl font-bold mb-2">Rider System Test Panel</h1>
              <p className="text-red-100">Seed data and simulate job assignments</p>
            </div>
          </div>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Run Full Seed */}
          <button
            onClick={handleRunFullSeed}
            disabled={loading}
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all disabled:opacity-50 text-left group"
          >
            <div className="flex items-start justify-between mb-4">
              <Zap className="w-8 h-8 text-yellow-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-gray-500">Recommended</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Run Full Seed</h3>
            <p className="text-sm text-gray-600">
              Creates riders, orders, and simulates one assignment
            </p>
          </button>

          {/* Seed Riders */}
          <button
            onClick={handleSeedRiders}
            disabled={loading}
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all disabled:opacity-50 text-left group"
          >
            <Users className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Seed Riders Only</h3>
            <p className="text-sm text-gray-600">
              Create 3 test riders in Firestore
            </p>
          </button>

          {/* Seed Orders */}
          <button
            onClick={handleSeedOrders}
            disabled={loading}
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all disabled:opacity-50 text-left group"
          >
            <Package className="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Seed Orders Only</h3>
            <p className="text-sm text-gray-600">
              Create 3 test orders in Firestore
            </p>
          </button>

          {/* Simulate Assignment */}
          <button
            onClick={handleSimulateAssignment}
            disabled={loading}
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all disabled:opacity-50 text-left group"
          >
            <Zap className="w-8 h-8 text-purple-600 group-hover:scale-110 transition-transform mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Simulate Assignment</h3>
            <p className="text-sm text-gray-600">
              Assign order-001 to rider-001
            </p>
          </button>
        </div>

        {/* Results */}
        {seedResult && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Seed Results</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-gray-900">Riders Created</span>
                <span className="text-lg font-bold text-blue-600">{seedResult.riders.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium text-gray-900">Orders Created</span>
                <span className="text-lg font-bold text-green-600">{seedResult.orders.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="font-medium text-gray-900">Assignments</span>
                <span className="text-lg font-bold text-purple-600">1</span>
              </div>
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mt-6">
          <h3 className="font-bold text-blue-900 mb-3">📋 Test Credentials</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>Email:</strong> rider@go7.com</p>
            <p><strong>Password:</strong> rider123</p>
            <p className="text-xs text-blue-600 mt-3">
              Note: You'll need to create this user in Firebase Authentication first
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <a
            href="/rider/login"
            className="bg-red-600 text-white rounded-xl p-4 text-center font-semibold hover:bg-red-700 transition-colors"
          >
            Rider Login
          </a>
          <a
            href="/rider/dashboard"
            className="bg-gray-800 text-white rounded-xl p-4 text-center font-semibold hover:bg-gray-900 transition-colors"
          >
            Rider Dashboard
          </a>
          <a
            href="/admin"
            className="bg-blue-600 text-white rounded-xl p-4 text-center font-semibold hover:bg-blue-700 transition-colors"
          >
            Admin Dashboard
          </a>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-900 font-semibold">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderSystemTest;
