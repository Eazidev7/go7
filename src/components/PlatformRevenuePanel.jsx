/**
 * Admin platform revenue — platform fees, delivery share, vendor commissions, rider payouts.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { aggregatePlatformRevenue } from '../utils/orderPricing';
import './AdminEarningsPanel.css';

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

export default function PlatformRevenuePanel() {
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(500));
    const qBookings = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(500));

    const unsubOrders = onSnapshot(qOrders, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));

    const unsubBookings = onSnapshot(qBookings, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubOrders();
      unsubBookings();
    };
  }, []);

  const merged = useMemo(() => {
    const byId = new Map();
    [...orders, ...bookings].forEach((o) => {
      const key = o.bookingId || o.orderId || o.id;
      if (!byId.has(key)) byId.set(key, o);
    });
    return [...byId.values()];
  }, [orders, bookings]);

  const revenue = useMemo(() => aggregatePlatformRevenue(merged), [merged]);

  if (loading) {
    return (
      <div className="admin-panel loading">
        <div className="spinner" />
        <p>Loading revenue report…</p>
      </div>
    );
  }

  return (
    <div className="admin-panel" style={{ marginTop: 24 }}>
      <div className="panel-header">
        <h1>Platform Revenue Report</h1>
        <p className="text-sm text-gray-500">From {revenue.orderCount} completed orders</p>
      </div>

      <div className="summary-cards">
        <div className="summary-card earnings">
          <div className="card-icon">🛡️</div>
          <div className="card-content">
            <p className="card-label">Platform Fees (10%)</p>
            <p className="card-amount">{fmt(revenue.platformFees)}</p>
          </div>
        </div>
        <div className="summary-card withdrawals">
          <div className="card-icon">🚚</div>
          <div className="card-content">
            <p className="card-label">Delivery Revenue (Go7 share)</p>
            <p className="card-amount">{fmt(revenue.deliveryRevenue)}</p>
          </div>
        </div>
        <div className="summary-card earnings">
          <div className="card-icon">🏪</div>
          <div className="card-content">
            <p className="card-label">Vendor Commission (8%)</p>
            <p className="card-amount">{fmt(revenue.vendorWithdrawalFees)}</p>
          </div>
        </div>
        <div className="summary-card withdrawals">
          <div className="card-icon">🛵</div>
          <div className="card-content">
            <p className="card-label">Rider Payouts (60% delivery)</p>
            <p className="card-amount">{fmt(revenue.riderPayouts)}</p>
          </div>
        </div>
      </div>

      <div className="summary-cards" style={{ marginTop: 16 }}>
        <div className="summary-card earnings" style={{ gridColumn: 'span 2' }}>
          <div className="card-icon">💰</div>
          <div className="card-content">
            <p className="card-label">Total Platform Earnings</p>
            <p className="card-amount">{fmt(revenue.totalPlatformEarnings)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Platform fees + delivery share + vendor commission
            </p>
          </div>
        </div>
        <div className="summary-card withdrawals">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <p className="card-label">Gross Order Volume</p>
            <p className="card-amount">{fmt(revenue.grossOrderVolume)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
