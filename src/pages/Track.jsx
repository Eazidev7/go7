import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { getDropoffAddress, normalizeTrackingId } from '../utils/bookingTracking';

const LAST_TRACKING_KEY = 'go7_last_tracking_id';

function readLocalBookingCodes() {
  const codes = [];
  try {
    const last = localStorage.getItem(LAST_TRACKING_KEY);
    if (last) codes.push(normalizeTrackingId(last));
    const stored = localStorage.getItem('go7:bookings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        parsed.forEach((b) => {
          const code = b?.bookingId || b?.id || b?.jobId;
          if (code) codes.push(normalizeTrackingId(code));
        });
      }
    }
  } catch {
    /* ignore */
  }
  return [...new Set(codes.filter(Boolean))];
}

function sortBookingsNewestFirst(rows) {
  return [...rows].sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() || a.timestamp?.toMillis?.() || a.updatedAt?.toMillis?.() || 0;
    const tb = b.createdAt?.toMillis?.() || b.timestamp?.toMillis?.() || b.updatedAt?.toMillis?.() || 0;
    return tb - ta;
  });
}

export default function Track() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trackingId, setTrackingId] = useState('');
  const [recentOrders, setRecentOrders] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  useEffect(() => {
    const localCodes = readLocalBookingCodes();
    if (localCodes[0] && !trackingId) {
      setTrackingId(localCodes[0]);
    }
  }, []);

  useEffect(() => {
    if (!db) return undefined;

    let cancelled = false;
    setLoadingRecent(true);

    (async () => {
      const merged = new Map();

      const addRows = (rows) => {
        rows.forEach((row) => {
          const key = row.bookingId || row.jobId || row.id;
          if (key) merged.set(key, row);
        });
      };

      if (user?.uid) {
        try {
          const snap = await getDocs(
            query(
              collection(db, 'bookings'),
              where('userId', '==', user.uid),
              orderBy('createdAt', 'desc'),
              limit(8)
            )
          );
          addRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch {
          try {
            const snap = await getDocs(
              query(collection(db, 'bookings'), where('userId', '==', user.uid), limit(20))
            );
            addRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          } catch (err) {
            console.warn('[Track] Could not load user bookings:', err?.message);
          }
        }
      }

      const localCodes = readLocalBookingCodes();
      for (const code of localCodes.slice(0, 5)) {
        if (merged.has(code)) continue;
        try {
          const snap = await getDocs(
            query(collection(db, 'bookings'), where('bookingId', '==', code), limit(1))
          );
          if (!snap.empty) {
            const d = snap.docs[0];
            addRows([{ id: d.id, ...d.data() }]);
          }
        } catch {
          /* direct doc read fallback below */
        }
      }

      if (cancelled) return;
      setRecentOrders(sortBookingsNewestFirst([...merged.values()]).slice(0, 8));
      setLoadingRecent(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const handleTrack = (id) => {
    const code = normalizeTrackingId(id || trackingId);
    if (!code) return;
    try {
      localStorage.setItem(LAST_TRACKING_KEY, code);
    } catch {
      /* ignore */
    }
    navigate(`/track-order/${encodeURIComponent(code)}`);
  };

  const statusLabel = (status) => {
    const labels = {
      pending: 'Finding rider',
      assigned: 'Rider assigned',
      accepted: 'Rider en route',
      picked_up: 'Picked up',
      enroute: 'On the way',
      in_transit: 'On the way',
      delivered: 'Delivered',
      completed: 'Delivered',
      cancelled: 'Cancelled',
    };
    return labels[status] || 'Tracking';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 border-b sticky top-0 z-10">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mr-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-900">Track Delivery</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center mb-6">
            <div className="relative inline-block mb-4" style={{ width: '280px', height: '180px' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="/images/map-pin-road.png"
                  alt="Track delivery"
                  style={{ width: '100%', height: 'auto', objectFit: 'contain', opacity: 0.9 }}
                />
              </div>
              <div
                className="absolute"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                }}
              >
                <img
                  src="/images/delivery-scooter.png"
                  alt="Delivery scooter"
                  style={{
                    width: '140px',
                    height: '140px',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.15))',
                  }}
                />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Live delivery tracking</h2>
            <p className="text-gray-600 text-sm">
              Enter your Go7 booking code for real-time map, rider updates, and ETA
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="tracking-id" className="block text-sm font-medium text-gray-700 mb-2">
                Booking code
              </label>
              <input
                id="tracking-id"
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="e.g. Go7-3S40VHP"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
              />
            </div>

            <button
              type="button"
              onClick={() => handleTrack()}
              disabled={!trackingId.trim()}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Track live
            </button>
          </div>
        </div>

        {(user || recentOrders.length > 0) && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Your recent deliveries</h3>
            {loadingRecent && <p className="text-sm text-gray-500">Loading...</p>}
            {!loadingRecent && recentOrders.length === 0 && (
              <p className="text-sm text-gray-500">No deliveries yet. Book one to track it here.</p>
            )}
            <div className="space-y-2">
              {recentOrders.map((order) => {
                const code = order.bookingId || order.jobId || order.id;
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => handleTrack(code)}
                    className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-gray-900">{code}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
                        {statusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">{getDropoffAddress(order)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-4 bg-blue-50 rounded-xl">
          <p className="text-sm text-blue-800">
            Your booking code appears after payment and in your order confirmation (e.g. <strong>Go7-XXXXXXX</strong>).
          </p>
        </div>
      </div>
    </div>
  );
}
