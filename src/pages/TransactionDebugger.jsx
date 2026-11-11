import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, orderBy, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const TransactionDebugger = () => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAllData = async () => {
    if (!currentUser?.uid) {
      alert('No user logged in!');
      return;
    }

    setLoading(true);
    try {
      // Fetch transactions
      const txQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const txSnapshot = await getDocs(txQuery);
      const txList = txSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestampFormatted: doc.data().timestamp?.toDate?.()?.toLocaleString() || 'No timestamp'
      }));
      setTransactions(txList);

      // Fetch wallet
      const walletDoc = await getDoc(doc(db, 'wallets', currentUser.uid));
      setWallet(walletDoc.exists() ? walletDoc.data() : null);

      // Fetch notifications
      const notifQuery = query(
        collection(db, 'notifications'),
        where('uid', '==', currentUser.uid),
        orderBy('timestamp', 'desc'),
        limit(5)
      );
      const notifSnapshot = await getDocs(notifQuery);
      const notifList = notifSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestampFormatted: doc.data().timestamp?.toDate?.()?.toLocaleString() || 'No timestamp'
      }));
      setNotifications(notifList);

    } catch (error) {
      console.error('Debug fetch error:', error);
      alert('Error: ' + error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchAllData();
    }
  }, [currentUser?.uid]);

  if (!currentUser) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>🔐 Not Logged In</h2>
        <p>Please sign in to debug transactions</p>
        <button 
          onClick={() => window.location.href = '/profile'}
          style={{ padding: '10px 20px', background: '#e53935', color: 'white', border: 'none', borderRadius: '5px' }}
        >
          Go to Profile
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', background: '#f5f5f5', minHeight: '100vh' }}>
      <h1>🔍 Transaction Debugger</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', background: '#e8f5e8', borderRadius: '5px' }}>
        <strong>🧑‍💻 Current User:</strong><br />
        ID: {currentUser.uid}<br />
        Email: {currentUser.email}<br />
        Name: {currentUser.displayName || 'No name'}
      </div>

      <button 
        onClick={fetchAllData} 
        disabled={loading}
        style={{ 
          padding: '10px 20px', 
          background: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px',
          marginBottom: '20px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Loading...' : '🔄 Refresh Data'}
      </button>

      {/* Wallet Info */}
      <div style={{ marginBottom: '30px' }}>
        <h2>💰 Wallet Information</h2>
        <div style={{ background: '#fff', padding: '15px', borderRadius: '5px', border: '1px solid #ddd' }}>
          {wallet ? (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '12px' }}>
              {JSON.stringify(wallet, null, 2)}
            </pre>
          ) : (
            <p style={{ color: '#999' }}>No wallet found</p>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div style={{ marginBottom: '30px' }}>
        <h2>💳 Transactions ({transactions.length})</h2>
        {transactions.length > 0 ? (
          transactions.map((tx, index) => (
            <div key={tx.id} style={{ 
              background: '#fff', 
              margin: '10px 0', 
              padding: '15px', 
              borderRadius: '5px', 
              border: '1px solid #ddd',
              borderLeft: `5px solid ${tx.type?.includes('topup') ? '#4CAF50' : '#f44336'}`
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                #{index + 1} - ₦{tx.amount?.toLocaleString()} ({tx.type})
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px' }}>
                {tx.timestampFormatted} | Ref: {tx.reference} | Status: {tx.status}
              </div>
              <pre style={{ margin: 0, fontSize: '10px', background: '#f8f9fa', padding: '5px', borderRadius: '3px' }}>
                {JSON.stringify(tx, null, 2)}
              </pre>
            </div>
          ))
        ) : (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '5px', border: '1px solid #ddd', textAlign: 'center' }}>
            <p style={{ color: '#999', margin: 0 }}>No transactions found</p>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div style={{ marginBottom: '30px' }}>
        <h2>🔔 Notifications ({notifications.length})</h2>
        {notifications.length > 0 ? (
          notifications.map((notif, index) => (
            <div key={notif.id} style={{ 
              background: '#fff', 
              margin: '10px 0', 
              padding: '15px', 
              borderRadius: '5px', 
              border: '1px solid #ddd',
              borderLeft: `5px solid ${notif.read ? '#ccc' : '#007bff'}`
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                {notif.title} {notif.read ? '(Read)' : '(Unread)'}
              </div>
              <div style={{ marginBottom: '5px' }}>{notif.message}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                {notif.timestampFormatted} | Type: {notif.type}
              </div>
            </div>
          ))
        ) : (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '5px', border: '1px solid #ddd', textAlign: 'center' }}>
            <p style={{ color: '#999', margin: 0 }}>No notifications found</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2>⚡ Quick Actions</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => window.location.href = '/history'}
            style={{ padding: '8px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '3px' }}
          >
            View History Screen
          </button>
          <button 
            onClick={() => window.location.href = '/payment-flow-test'}
            style={{ padding: '8px 15px', background: '#ffc107', color: 'black', border: 'none', borderRadius: '3px' }}
          >
            Test Payment
          </button>
          <button 
            onClick={() => window.location.href = '/wallet/topup'}
            style={{ padding: '8px 15px', background: '#6f42c1', color: 'white', border: 'none', borderRadius: '3px' }}
          >
            Wallet Top-up
          </button>
          <button 
            onClick={() => window.location.href = '/profile'}
            style={{ padding: '8px 15px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px' }}
          >
            Profile Screen
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDebugger;