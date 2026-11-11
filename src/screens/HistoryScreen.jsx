import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const HistoryScreen = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  console.log('👤 User in TransactionHistory:', user?.uid);

  // Real-time listener for transactions from BOTH collections
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    console.log('📊 Setting up transaction listener for:', user.uid);

    // Listen to transactions collection
    const q1 = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    // Listen to walletTransactions collection
    const q2 = query(
      collection(db, 'walletTransactions'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    let allTransactions = [];
    let transactionsLoaded = false;
    let walletTransactionsLoaded = false;

    const updateTransactions = () => {
      if (transactionsLoaded && walletTransactionsLoaded) {
        // Merge and sort by timestamp
        const merged = [...allTransactions].sort((a, b) => {
          const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
          const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
          return timeB - timeA;
        });
        console.log(`💳 Loaded ${merged.length} total transactions (transactions + walletTransactions)`);
        setTransactions(merged);
        setLoading(false);
      }
    };

    const unsubscribe1 = onSnapshot(
      q1,
      (snapshot) => {
        const txList = [];
        snapshot.forEach((doc) => {
          txList.push({
            id: doc.id,
            source: 'transactions',
            ...doc.data()
          });
        });
        console.log(`📊 Loaded ${txList.length} from transactions collection`);
        
        // Remove old transactions entries and add new ones
        allTransactions = allTransactions.filter(tx => tx.source !== 'transactions');
        allTransactions = [...allTransactions, ...txList];
        transactionsLoaded = true;
        updateTransactions();
      },
      (error) => {
        console.error('❌ Transaction listener error:', error);
        transactionsLoaded = true;
        updateTransactions();
      }
    );

    const unsubscribe2 = onSnapshot(
      q2,
      (snapshot) => {
        const txList = [];
        snapshot.forEach((doc) => {
          txList.push({
            id: doc.id,
            source: 'walletTransactions',
            ...doc.data()
          });
        });
        console.log(`💰 Loaded ${txList.length} from walletTransactions collection`);
        
        // Remove old walletTransactions entries and add new ones
        allTransactions = allTransactions.filter(tx => tx.source !== 'walletTransactions');
        allTransactions = [...allTransactions, ...txList];
        walletTransactionsLoaded = true;
        updateTransactions();
      },
      (error) => {
        console.error('❌ Wallet transaction listener error:', error);
        walletTransactionsLoaded = true;
        updateTransactions();
      }
    );

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user?.uid]);

  // Advanced filtering and search
  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    // Filter by type
    if (filter !== 'all') {
      filtered = filtered.filter(tx => tx.type === filter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(tx => 
        (tx.description || '').toLowerCase().includes(query) ||
        (tx.reference || '').toLowerCase().includes(query) ||
        (tx.source || '').toLowerCase().includes(query) ||
        (tx.channel || '').toLowerCase().includes(query) ||
        tx.amount?.toString().includes(query)
      );
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(tx => {
        const txDate = tx.timestamp ? tx.timestamp.toDate() : new Date(tx.createdAt);
        
        switch (dateFilter) {
          case 'today':
            return txDate >= today;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return txDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            return txDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Sort transactions
    filtered.sort((a, b) => {
      const dateA = a.timestamp ? a.timestamp.toDate() : new Date(a.createdAt);
      const dateB = b.timestamp ? b.timestamp.toDate() : new Date(b.createdAt);
      
      if (sortBy === 'date') {
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else if (sortBy === 'amount') {
        return sortOrder === 'desc' ? (b.amount || 0) - (a.amount || 0) : (a.amount || 0) - (b.amount || 0);
      }
      return 0;
    });

    return filtered;
  };

  // Calculate statistics
  const getTransactionStats = () => {
    const filtered = getFilteredTransactions();
    const credits = filtered.filter(tx => tx.type === 'credit');
    const debits = filtered.filter(tx => tx.type === 'debit');
    
    const totalCredits = credits.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalDebits = debits.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    return {
      total: filtered.length,
      credits: credits.length,
      debits: debits.length,
      totalCredits,
      totalDebits,
      netAmount: totalCredits - totalDebits
    };
  };

  // Export functionality
  const exportTransactions = () => {
    const filtered = getFilteredTransactions();
    const csvData = filtered.map(tx => ({
      Date: formatDate(tx.timestamp || tx.createdAt),
      Type: tx.type,
      Description: tx.description || (tx.type === 'credit' ? 'Wallet Top-up' : 'Payment'),
      Amount: tx.amount,
      Status: tx.status,
      Reference: tx.reference || '',
      Source: tx.source || 'Paystack',
      Channel: tx.channel || 'card'
    }));
    
    // Convert to CSV
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilter('all');
    setSearchQuery('');
    setDateFilter('all');
    setSortBy('date');
    setSortOrder('desc');
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
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'failed':
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  const filteredTransactions = getFilteredTransactions();
  const stats = getTransactionStats();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-red-600 text-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Transaction History</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 hover:bg-red-700 rounded-lg transition-colors"
              title="Toggle Filters"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
              </svg>
            </button>
            <button
              onClick={exportTransactions}
              className="p-2 hover:bg-red-700 rounded-lg transition-colors"
              title="Export Transactions"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Bar */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">₦{stats.totalCredits.toLocaleString()}</div>
            <div className="text-xs text-gray-600">{stats.credits} Credits</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600">₦{stats.totalDebits.toLocaleString()}</div>
            <div className="text-xs text-gray-600">{stats.debits} Debits</div>
          </div>
          <div>
            <div className={`text-lg font-bold ${stats.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₦{Math.abs(stats.netAmount).toLocaleString()}
            </div>
            <div className="text-xs text-gray-600">Net {stats.netAmount >= 0 ? 'Gain' : 'Loss'}</div>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <svg className="w-4 h-4 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Type Filter */}
            <div className="flex space-x-2">
              {['all', 'credit', 'debit'].map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setFilter(filterType)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    filter === filterType
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </button>
              ))}
            </div>

            {/* Date Filter */}
            <div className="flex space-x-2">
              {[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' }
              ].map((dateOption) => (
                <button
                  key={dateOption.value}
                  onClick={() => setDateFilter(dateOption.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    dateFilter === dateOption.value
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {dateOption.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title={`Sort ${sortOrder === 'desc' ? 'Ascending' : 'Descending'}`}
              >
                <svg className={`w-4 h-4 text-gray-600 ${sortOrder === 'asc' ? 'rotate-180' : ''} transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="px-6 py-4">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || filter !== 'all' || dateFilter !== 'all' 
                ? 'No Matching Transactions' 
                : 'No Transactions Yet'
              }
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || filter !== 'all' || dateFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Your transaction history will appear here'
              }
            </p>
            {(searchQuery || filter !== 'all' || dateFilter !== 'all') && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Results Counter */}
            <div className="flex items-center justify-between py-2">
              <p className="text-sm text-gray-600">
                Showing {filteredTransactions.length} of {transactions.length} transactions
              </p>
              {(searchQuery || filter !== 'all' || dateFilter !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Transaction Cards */}
            {filteredTransactions.map((tx, index) => (
              <div key={tx.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-red-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      tx.type === 'credit' ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'
                    }`}>
                      {tx.type === 'credit' ? (
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                        </svg>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {tx.description || (tx.type === 'credit' ? 'Wallet Top-up' : 'Payment')}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tx.status === 'success' || tx.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : tx.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {tx.status?.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-1">
                        {formatDate(tx.timestamp || tx.createdAt)}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{tx.source || 'Paystack'} • {tx.channel || 'card'}</span>
                        {tx.reference && (
                          <span className="font-mono">Ref: {tx.reference.slice(0, 12)}...</span>
                        )}
                        <span className="bg-gray-100 px-2 py-1 rounded">#{index + 1}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-bold text-xl ${
                      tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.type === 'credit' ? '+' : '-'}₦{tx.amount?.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {/* Transaction Actions */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    <span>Transaction ID: {tx.id?.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded transition-colors"
                      onClick={async () => {
                        const refText = tx.reference || tx.id;
                        if (!refText) {
                          alert('No reference available to copy');
                          return;
                        }
                        try {
                          await navigator.clipboard.writeText(refText);
                          // Brief visual feedback
                          const button = event.target;
                          const original = button.textContent;
                          button.textContent = '✓ Copied';
                          setTimeout(() => button.textContent = original, 1500);
                        } catch (error) {
                          try {
                            // Fallback
                            const textArea = document.createElement('textarea');
                            textArea.value = refText;
                            document.body.appendChild(textArea);
                            textArea.focus();
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                            // Visual feedback
                            const button = event.target;
                            const original = button.textContent;
                            button.textContent = '✓ Copied';
                            setTimeout(() => button.textContent = original, 1500);
                          } catch (fallbackError) {
                            alert('Failed to copy reference');
                            console.error('Copy failed:', fallbackError);
                          }
                        }
                      }}
                    >
                      Copy Ref
                    </button>
                    {tx.type === 'debit' && (
                      <button className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors">
                        Track
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryScreen;