import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  getDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  FaWallet, 
  FaDollarSign, 
  FaClock, 
  FaDownload,
  FaCheck,
  FaTimes,
  FaEye,
  FaChartLine,
  FaCreditCard,
  FaArrowUp,
  FaArrowDown,
  FaHistory
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import VendorNavigation from './VendorNavigation';

const VendorWallet = () => {
  const [walletData, setWalletData] = useState({
    totalEarnings: 0,
    availableBalance: 0,
    pendingPayouts: 0,
    totalWithdrawn: 0
  });
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    accountType: 'savings'
  });
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  
  const vendorId = 'vendor_001'; // This would come from auth context

  // Handle payout request
  const handlePayoutRequest = async (amount) => {
    if (!amount || amount <= 0) {
      Swal.fire({
        title: 'Invalid Amount',
        text: 'Please enter a valid payout amount.',
        icon: 'warning'
      });
      return;
    }

    if (amount > walletData.availableBalance) {
      Swal.fire({
        title: 'Insufficient Balance',
        text: 'Payout amount exceeds available balance.',
        icon: 'error'
      });
      return;
    }

    if (!bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.bankName) {
      Swal.fire({
        title: 'Missing Bank Details',
        text: 'Please provide complete bank account information.',
        icon: 'warning'
      });
      return;
    }

    setRequesting(true);

    try {
      if (!db) {
        // Mock payout request for demo
        const mockPayout = {
          id: `payout_${Date.now()}`,
          vendorId,
          amount: parseFloat(amount),
          status: 'pending',
          bankDetails,
          requestedAt: new Date(),
          processedAt: null
        };

        setPayoutHistory(prev => [mockPayout, ...prev]);
        setWalletData(prev => ({
          ...prev,
          availableBalance: prev.availableBalance - parseFloat(amount),
          pendingPayouts: prev.pendingPayouts + parseFloat(amount)
        }));

        Swal.fire({
          title: 'Payout Requested!',
          text: `₦${parseFloat(amount).toLocaleString()} payout request submitted successfully.`,
          icon: 'success',
          timer: 3000,
          showConfirmButton: false
        });

        setShowPayoutModal(false);
        setPayoutAmount('');
        setRequesting(false);
        return;
      }

      // Create payout request in Firebase
      const payoutRequest = {
        vendorId,
        amount: parseFloat(amount),
        status: 'pending',
        bankDetails,
        requestedAt: serverTimestamp(),
        processedAt: null,
        processedBy: null,
        notes: ''
      };

      await addDoc(collection(db, 'payoutRequests'), payoutRequest);

      // Update vendor available balance
      await updateDoc(doc(db, 'vendors', vendorId), {
        availableBalance: walletData.availableBalance - parseFloat(amount),
        pendingPayouts: walletData.pendingPayouts + parseFloat(amount),
        lastPayoutRequest: serverTimestamp()
      });

      Swal.fire({
        title: 'Payout Requested!',
        text: `₦${parseFloat(amount).toLocaleString()} payout request submitted successfully.`,
        icon: 'success',
        timer: 3000,
        showConfirmButton: false
      });

      setShowPayoutModal(false);
      setPayoutAmount('');
    } catch (error) {
      console.error('Error requesting payout:', error);
      Swal.fire({
        title: 'Request Failed',
        text: 'Could not process payout request. Please try again.',
        icon: 'error'
      });
    } finally {
      setRequesting(false);
    }
  };

  // Set up real-time listeners
  useEffect(() => {
    if (!db) {
      // Mock data for demo
      const mockWalletData = {
        totalEarnings: 125000,
        availableBalance: 45000,
        pendingPayouts: 15000,
        totalWithdrawn: 65000
      };

      const mockPayoutHistory = [
        {
          id: 'payout_001',
          amount: 25000,
          status: 'paid',
          requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          processedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          bankDetails: { accountName: 'John Doe', bankName: 'First Bank' }
        },
        {
          id: 'payout_002',
          amount: 15000,
          status: 'pending',
          requestedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
          processedAt: null,
          bankDetails: { accountName: 'John Doe', bankName: 'First Bank' }
        },
        {
          id: 'payout_003',
          amount: 30000,
          status: 'paid',
          requestedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          processedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          bankDetails: { accountName: 'John Doe', bankName: 'GTBank' }
        }
      ];

      const mockBankDetails = {
        accountName: 'Pizza Palace Ltd',
        accountNumber: '0123456789',
        bankName: 'First Bank Nigeria',
        accountType: 'current'
      };

      setWalletData(mockWalletData);
      setPayoutHistory(mockPayoutHistory);
      setBankDetails(mockBankDetails);
      setLoading(false);
      return;
    }

    try {
      // Listen to vendor wallet data
      const vendorQuery = doc(db, 'vendors', vendorId);
      const unsubscribeVendor = onSnapshot(vendorQuery, (doc) => {
        if (doc.exists()) {
          const vendorData = doc.data();
          setWalletData({
            totalEarnings: vendorData.totalEarnings || 0,
            availableBalance: vendorData.availableBalance || 0,
            pendingPayouts: vendorData.pendingPayouts || 0,
            totalWithdrawn: vendorData.totalWithdrawn || 0
          });

          if (vendorData.bankDetails) {
            setBankDetails(vendorData.bankDetails);
          }
        }
      });

      // Listen to payout requests
      const payoutQuery = query(
        collection(db, 'payoutRequests'),
        where('vendorId', '==', vendorId),
        orderBy('requestedAt', 'desc'),
        limit(20)
      );

      const unsubscribePayouts = onSnapshot(payoutQuery, (snapshot) => {
        const payouts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPayoutHistory(payouts);
      });

      setLoading(false);

      return () => {
        unsubscribeVendor();
        unsubscribePayouts();
      };
    } catch (error) {
      console.error('Error setting up wallet listeners:', error);
      setLoading(false);
    }
  }, [vendorId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <FaCheck className="text-green-600" />;
      case 'pending': return <FaClock className="text-yellow-600" />;
      case 'rejected': return <FaTimes className="text-red-600" />;
      default: return <FaEye className="text-gray-600" />;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '--';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <VendorNavigation />
        <div className="lg:ml-64 p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading wallet...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNavigation />
      
      <div className="lg:ml-64 p-4 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FaWallet className="mr-3 text-red-600" />
            Vendor Wallet
          </h1>
          <p className="text-gray-600 mt-2">Manage your earnings, payouts, and financial data</p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900 animate-pulse">
                  ₦{walletData.totalEarnings.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FaChartLine className="text-green-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <FaArrowUp className="text-green-500 mr-1" />
              <span className="text-green-500 font-medium">+12.5%</span>
              <span className="text-gray-500 ml-2">vs last month</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Balance</p>
                <p className="text-2xl font-bold text-gray-900 animate-pulse">
                  ₦{walletData.availableBalance.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaDollarSign className="text-blue-600 text-xl" />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => setShowPayoutModal(true)}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
              >
                <FaDownload className="mr-2" />
                Request Payout
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Payouts</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₦{walletData.pendingPayouts.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FaClock className="text-yellow-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">Awaiting approval</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Withdrawn</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₦{walletData.totalWithdrawn.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FaArrowDown className="text-purple-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">Lifetime withdrawals</span>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FaCreditCard className="mr-2 text-red-600" />
            Bank Account Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
              <p className="text-gray-900 font-medium">{bankDetails.accountName || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
              <p className="text-gray-900 font-medium">{bankDetails.accountNumber || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <p className="text-gray-900 font-medium">{bankDetails.bankName || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
              <p className="text-gray-900 font-medium capitalize">{bankDetails.accountType || 'savings'}</p>
            </div>
          </div>
        </div>

        {/* Payout History */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FaHistory className="mr-2 text-red-600" />
              Payout History
            </h2>
            <p className="text-gray-600 mt-1">Track your withdrawal requests and payments</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Processed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payoutHistory.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <FaWallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No payout history yet</p>
                      <p className="text-sm text-gray-400">Your withdrawal requests will appear here</p>
                    </td>
                  </tr>
                ) : (
                  payoutHistory.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ₦{payout.amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>
                          {getStatusIcon(payout.status)}
                          <span className="ml-1">{payout.status.toUpperCase()}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(payout.requestedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payout.processedAt ? formatDate(payout.processedAt) : '--'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payout.bankDetails?.bankName || '--'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Request Payout</h3>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available Balance
                </label>
                <p className="text-lg font-bold text-green-600">
                  ₦{walletData.availableBalance.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payout Amount
                </label>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                  max={walletData.availableBalance}
                />
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-2">Payout will be sent to:</p>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium">{bankDetails.accountName}</p>
                  <p className="text-sm text-gray-600">{bankDetails.bankName}</p>
                  <p className="text-sm text-gray-600">{bankDetails.accountNumber}</p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowPayoutModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePayoutRequest(payoutAmount)}
                  disabled={requesting || !payoutAmount}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                  {requesting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <FaDownload className="mr-2" />
                      Request Payout
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorWallet;