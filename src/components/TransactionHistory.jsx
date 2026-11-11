import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

/**
 * 💳 Transaction History Component
 * 
 * Displays real-time wallet transaction history with:
 * - Live updates via Firestore onSnapshot
 * - Filtering by transaction type
 * - Beautiful red-themed UI matching wallet design
 */
export default function TransactionHistory({ maxTransactions = 20 }) {
  console.log('📊 TransactionHistory component loaded - Version: October 31, 2025 - 3:45 PM');
  
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, credit, debit
  
  console.log('👤 User in TransactionHistory:', user?.uid);

  // Real-time listener for transactions
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    console.log('📊 Setting up transaction listener for:', user.uid);

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(maxTransactions)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const txList = [];
        snapshot.forEach((doc) => {
          txList.push({
            id: doc.id,
            ...doc.data()
          });
        });

        console.log(`💳 Loaded ${txList.length} transactions`);
        setTransactions(txList);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Transaction listener error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, maxTransactions]);

  const getFilteredTransactions = () => {
    if (filter === 'all') return transactions;
    return transactions.filter(tx => tx.type === filter);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
      case 'completed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 border-2 border-red-900/30 rounded-3xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
          <span className="ml-3 text-gray-400">Loading transactions...</span>
        </div>
      </div>
    );
  }

  const filteredTransactions = getFilteredTransactions();

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 border-2 border-red-900/30 rounded-3xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-black text-white flex items-center">
          <svg className="w-6 h-6 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          TRANSACTION HISTORY
        </h3>
        
        {/* Live indicator */}
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-400 text-xs font-bold">LIVE</span>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex space-x-2 mb-6">
        {['all', 'credit', 'debit'].map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filter === filterType
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {filterType.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-400">No transactions yet</p>
          <p className="text-gray-600 text-sm mt-2">Your transaction history will appear here</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-black/50 border border-red-900/30 rounded-xl p-4 hover:border-red-600/50 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {/* Type icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'credit' 
                      ? 'bg-green-900/30 border border-green-600/50' 
                      : 'bg-red-900/30 border border-red-600/50'
                  }`}>
                    {tx.type === 'credit' ? (
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                      </svg>
                    )}
                  </div>

                  <div>
                    <p className="text-white font-semibold">
                      {tx.description || (tx.type === 'credit' ? 'Wallet Top-up' : 'Payment')}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {tx.source || 'Paystack'} • {tx.channel || 'card'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-black text-lg ${
                    tx.type === 'credit' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {tx.type === 'credit' ? '+' : '-'}₦{tx.amount?.toLocaleString()}
                  </p>
                  <p className={`text-xs font-semibold ${getStatusColor(tx.status)}`}>
                    {tx.status?.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-800">
                <span>{formatDate(tx.timestamp || tx.createdAt)}</span>
                {tx.reference && (
                  <span className="font-mono">Ref: {tx.reference.slice(0, 12)}...</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1a1a1a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e53935;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #c62828;
        }
      `}</style>
    </div>
  );
}