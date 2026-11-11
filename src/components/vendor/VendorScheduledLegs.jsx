import React, { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { db } from '../../firebase/config';

const fn = (n) => httpsCallable(getFunctions(undefined, 'us-central1'), n);
const naira = (k) => `₦${(Number(k || 0) / 100).toLocaleString('en-NG')}`;
const SLOT_LABEL = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };

const fmtDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};
const prepDeadline = (iso, mins) => {
  if (!iso || !mins) return null;
  const d = new Date(new Date(iso).getTime() - mins * 60000);
  return `prep by ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const STATUS_STYLE = {
  scheduled: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready: 'bg-green-100 text-green-700',
  dispatched: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-600',
};
const NEXT_ACTION = { scheduled: ['confirm', 'Confirm'], confirmed: ['preparing', 'Start Preparing'], preparing: ['ready', 'Mark Ready'] };

/**
 * Vendor's scheduled meal orders — the "View Scheduled Meal Orders" section.
 * Vendors advance scheduled → confirmed → preparing → ready here; 'completed'
 * comes from the normal delivery flow after the leg materializes as an order.
 */
const VendorScheduledLegs = ({ vendorId }) => {
  const [legs, setLegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const load = useCallback(async () => {
    if (!vendorId) { setLoading(false); return; }
    try {
      const snap = await getDocs(
        query(collection(db, 'scheduledBundleLegs'), where('vendorId', '==', vendorId))
      );
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((l) => l.status && l.status !== 'cancelled')
        .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
      setLegs(rows);
    } catch (e) {
      console.error('Scheduled legs load error:', e);
      setLegs([]);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => { load(); }, [load]);

  const act = async (legId, action) => {
    setActing(legId);
    try {
      await fn('updateScheduledLegStatus')({ legDocId: legId, action });
      toast.success(action === 'confirm' ? 'Order confirmed' : action === 'preparing' ? 'Marked preparing' : 'Marked ready');
      await load();
    } catch (e) {
      toast.error(e?.message?.replace(/^Firebase.*?:\s*/i, '') || 'Update failed');
    } finally {
      setActing(null);
    }
  };

  if (loading || legs.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🗓️</span>
        <h3 className="font-semibold text-gray-900 text-sm">
          Scheduled Meal Orders ({legs.length})
        </h3>
      </div>
      <p className="text-xs text-gray-400 mb-3">Upcoming meal-plan deliveries — confirm and prep ahead.</p>
      <div className="space-y-2">
        {legs.map((l) => {
          const [action, label] = NEXT_ACTION[l.status] || [];
          return (
            <div key={l.id} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {l.slot ? `${SLOT_LABEL[l.slot] || ''} ` : ''}{fmtDate(l.scheduledFor)}
                    {l.deliveryWindow ? <span className="text-xs text-gray-400"> ({l.deliveryWindow})</span> : null}
                  </p>
                  {l.planName && <p className="text-[11px] text-amber-700">{l.planName}</p>}
                  <p className="text-xs text-gray-500 truncate">
                    {(l.items || []).map((it) => `${it.quantity || 1}× ${it.name}`).join(' · ')}
                  </p>
                  {l.dropoffAddress && <p className="text-xs text-gray-400 truncate">→ {l.dropoffAddress}</p>}
                  {l.dropoffNotes && <p className="text-[11px] text-gray-400 italic">“{l.dropoffNotes}”</p>}
                  {l.prepTimeMins && <p className="text-[11px] text-amber-600">{prepDeadline(l.scheduledFor, l.prepTimeMins)}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[l.status] || 'bg-gray-100'}`}>
                    {l.status}
                  </span>
                  <span className="text-xs font-semibold text-gray-700">{naira(l.subtotalKobo)}</span>
                </div>
              </div>
              {action && (
                <button onClick={() => act(l.id, action)} disabled={acting === l.id}
                  className="mt-2 w-full py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 disabled:opacity-50">
                  {acting === l.id ? '…' : label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VendorScheduledLegs;
