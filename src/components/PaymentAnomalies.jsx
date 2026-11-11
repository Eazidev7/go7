import React, { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../firebase/config';

const fmt = (t) => {
  if (!t) return '—';
  const d = t.toDate ? t.toDate() : (t.seconds ? new Date(t.seconds * 1000) : new Date(t));
  return Number.isNaN(d.getTime()) ? '—' : `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};
const naira = (k) => `₦${(Number(k || 0) / 100).toLocaleString('en-NG')}`;

/**
 * Payment anomaly watch — surfaces underpayments, mismatched references, and
 * any charge the webhook flagged before marking an order paid. Written only
 * by server functions; this is a read-only admin view.
 */
const PaymentAnomalies = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'paymentAnomalies'), orderBy('timestamp', 'desc'), limit(50))
      );
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Anomalies load error:', e);
      // orderBy fails without the index — fall back to unordered
      try {
        const snap2 = await getDocs(query(collection(db, 'paymentAnomalies'), limit(50)));
        setRows(snap2.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (_) {
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-8 text-center text-gray-400 text-sm">Loading anomalies…</div>;

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-900">Payment Anomalies</h3>
          <p className="text-xs text-gray-400">Underpayments and mismatched references the webhook flagged — review before trusting the order.</p>
        </div>
        <button onClick={load} className="text-xs font-semibold text-gray-500 hover:underline">Refresh</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Expected</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No anomalies — all payments verified clean.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{String(r.reference || '').slice(0, 20)}…</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {r.orderId || '—'}
                  <p className="text-[10px] text-gray-400">{r.orderCollection || ''}</p>
                </td>
                <td className="px-4 py-3 text-red-600 font-medium">{naira(r.paidKobo)}</td>
                <td className="px-4 py-3">{naira(r.totalKobo)}</td>
                <td className="px-4 py-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{r.reason || 'flagged'}</span></td>
                <td className="px-4 py-3 text-xs text-gray-400">{fmt(r.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentAnomalies;
