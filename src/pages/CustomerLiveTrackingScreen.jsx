import React, { useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import CustomerLiveTrackingMap from '../components/tracking/CustomerLiveTrackingMap';
import DeliveryStatusTimeline from '../components/DeliveryStatusTimeline';
import { useLiveDeliveryTracking } from '../hooks/useLiveDeliveryTracking';
import { loadTrackingOrder } from '../utils/loadTrackingOrder';
import RiderDeliveryChatModal from '../components/delivery/RiderDeliveryChatModal';
import {
  mapToTimelineStatus,
  TRACKING_STATUS_LABELS,
} from '../utils/trackingStatusUtils';
import '../styles/tracking.css';

const fmtNaira = (n) =>
  n == null || !Number.isFinite(Number(n)) ? '—' : `₦${Number(n).toLocaleString('en-NG')}`;

const toDate = (ts) => {
  if (!ts) return null;
  if (ts.toDate instanceof Function) return ts.toDate();
  if (typeof ts === 'object' && typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmtDateTime = (ts) => {
  const d = toDate(ts);
  return d
    ? d.toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
};

// Authoritative receipt fields — read straight from the order/booking doc,
// never recomputed client-side.
const receiptFrom = (raw, meta, fallbackId) => {
  if (!raw && !meta) return null;
  const r = raw || {};
  return {
    id: meta?.orderNumber || r.id || r.bookingId || r.jobId || fallbackId,
    created: r.createdAt || r.timestamps?.createdAt,
    paid: r.paidAt || r.timestamps?.paidAt,
    pickup: meta?.pickup || r.pickupAddress || r.pickup?.address || '—',
    dropoff: meta?.dropoff || r.dropoffAddress || r.dropoff?.address || '—',
    item: r.itemDescription || r.packageDetails?.name || null,
    distanceKm: r.distanceKm ?? r.deliveryDistanceKm ?? r.distance ?? null,
    vehicle: r.vehicleType || null,
    itemTotal: r.itemTotal ?? null,
    deliveryFee: r.deliveryFee ?? r.fare ?? r.finalFare ?? null,
    serviceFee: r.platformFee ?? r.serviceFee ?? null,
    total: r.total ?? r.grandTotal ?? r.totalAmount ?? meta?.total ?? null,
    paymentMethod: r.paymentMethod || null,
    paymentStatus: r.paymentStatus || null,
    paymentReference: r.paymentReference || null,
    riderName: meta?.riderName || r.rider?.name || r.riderName || null,
  };
};

export default function CustomerLiveTrackingScreen({ orderId, onClose }) {
  const live = useLiveDeliveryTracking(orderId);
  const [orderMeta, setOrderMeta] = useState(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [loadStalled, setLoadStalled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadTrackingOrder(orderId)
      .then((t) => {
        if (cancelled || !t) return;
        setOrderMeta({
          orderNumber: t.displayId || orderId,
          pickup: t.pickupAddress,
          dropoff: t.dropoffAddress,
          riderName: t.riderName || live.booking?.rider?.name || 'Your rider',
          riderPhone: t.riderPhone || live.booking?.rider?.phone || '',
          total: t.total,
        });
      })
      .catch((err) => {
        console.warn('[tracking] loadTrackingOrder failed:', err?.message || err);
      });
    return () => { cancelled = true; };
  }, [orderId, live.booking?.rider?.name, live.booking?.rider?.phone]);

  // Guard against getting stuck on the spinner forever if Firestore
  // never resolves (bad network, permission edge cases, etc).
  useEffect(() => {
    if (!live.loading) {
      setLoadStalled(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setLoadStalled(true), 15000);
    return () => window.clearTimeout(timer);
  }, [live.loading, orderId]);

  const statusLabel = TRACKING_STATUS_LABELS[live.status] || 'Tracking your delivery';
  const timelineStatus = mapToTimelineStatus(live.status);
  const showEta = live.hasLiveGps && live.etaMinutes != null && live.status !== 'delivered';

  if (!orderId) {
    return (
      <div className="go7-tracking-screen fixed inset-0 bg-white flex items-center justify-center z-50 p-6 text-center">
        <div>
          <p className="text-gray-600 mb-4">We couldn't find that order to track.</p>
          <button
            type="button"
            onClick={onClose}
            className="bg-red-600 text-white px-6 py-3 rounded-full font-medium"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (live.loading && !orderMeta && !live.booking && !loadStalled) {
    return (
      <div className="go7-tracking-screen fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading live tracking…</p>
        </div>
      </div>
    );
  }

  if (loadStalled && !orderMeta && !live.booking) {
    return (
      <div className="go7-tracking-screen fixed inset-0 bg-white flex items-center justify-center z-50 p-6 text-center">
        <div>
          <p className="text-gray-600 mb-4">Tracking is taking longer than usual to load. Your order is safe — please check your connection and try again.</p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={onClose}
              className="border-2 border-red-600 text-red-600 px-5 py-3 rounded-full font-medium"
            >
              Go back
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-5 py-3 rounded-full font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="go7-tracking-screen fixed inset-0 z-50 flex flex-col bg-white h-[100dvh] max-h-[100dvh] min-h-0"
    >
      {/* Header */}
      <div className="flex-shrink-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100"
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6 text-[#E53935]" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-[#121212] truncate">Live Delivery Tracking</h1>
          <p className="text-xs text-gray-500 truncate">{statusLabel}</p>
        </div>
        {live.hasRider && (
          <button
            type="button"
            onClick={() => setShowChat(true)}
            className="w-10 h-10 rounded-full bg-[#E53935]/10 flex items-center justify-center"
            aria-label="Chat with rider"
          >
            <MessageCircle className="w-5 h-5 text-[#E53935]" />
          </button>
        )}
      </div>

      {/* Map area */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <CustomerLiveTrackingMap
          pickup={live.pickup}
          dropoff={live.dropoff}
          riderLocation={live.riderLocation}
          routeCoords={live.routeCoords}
          riderProgress={live.riderProgress}
          className="absolute inset-0 h-full w-full"
        />

        <AnimatePresence>
          {showEta && (
            <motion.div
              key="eta"
              className="go7-tracking-eta absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white rounded-2xl shadow-lg px-5 py-3 flex flex-col items-center pointer-events-none"
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <motion.div
                  className="w-2 h-2 bg-[#E53935] rounded-full"
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="font-bold text-base text-[#121212]">
                  Arriving in {live.etaMinutes} min
                </span>
              </div>
              {live.distanceKm != null && (
                <span className="text-xs text-gray-500">{live.distanceKm.toFixed(1)} km away</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom sheet — fixed heights so inner scroll works on mobile */}
      <div
        className={`flex-shrink-0 bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-30 flex flex-col min-h-0 transition-[max-height] duration-300 ease-out ${
          sheetExpanded ? 'max-h-[58dvh]' : 'max-h-[36dvh]'
        }`}
      >
        <button
          type="button"
          onClick={() => setSheetExpanded(!sheetExpanded)}
          className="flex flex-col items-center pt-3 pb-2 flex-shrink-0 w-full touch-manipulation"
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-1" />
          <span className="text-xs text-gray-500 flex items-center gap-1">
            {sheetExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            {sheetExpanded ? 'Show map' : 'View progress'}
          </span>
        </button>

        <div className="go7-tracking-sheet-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-5 pb-6">
          <div className="text-center mb-4">
            <div className="text-xs text-gray-400 mb-0.5">Order ID</div>
            <div className="text-sm font-bold text-[#E53935]">{orderMeta?.orderNumber || orderId}</div>
          </div>

          {!live.hasLiveGps && live.hasRider && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-900">
              Rider assigned - waiting for GPS signal from rider app.
            </div>
          )}

          {live.deliveryPin && live.status !== 'delivered' && live.status !== 'finding_shopper' ? (
            <div className="mb-4 p-4 bg-[#E53935]/5 border border-[#E53935]/20 rounded-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#E53935] mb-1">
                Delivery PIN
              </p>
              <p className="text-3xl font-bold tracking-[0.35em] text-[#121212]">{live.deliveryPin}</p>
              <p className="text-xs text-gray-500 mt-2">
                Share this PIN only with your GO7 rider when they arrive.
              </p>
            </div>
          ) : null}

          {live.isSearching && (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl text-sm text-gray-600">
              Matching you with the nearest available rider. The map updates when a rider accepts your delivery.
            </div>
          )}

          <div className="mb-4">
            <DeliveryStatusTimeline
              currentStatus={timelineStatus}
              estimatedTime={showEta ? `${live.etaMinutes} min` : null}
            />
          </div>

          {orderMeta && (
            <div className="space-y-3 mb-4 text-sm">
              <div>
                <div className="text-xs text-gray-500">Pickup</div>
                <div className="font-medium">{orderMeta.pickup}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Dropoff</div>
                <div className="font-medium">{orderMeta.dropoff}</div>
              </div>
              {live.hasRider && (
                <div>
                  <div className="text-xs text-gray-500">Rider</div>
                  <div className="font-medium">{orderMeta.riderName}</div>
                  {(orderMeta.riderPhone || live.riderPhone) ? (
                    <a
                      href={`tel:${orderMeta.riderPhone || live.riderPhone}`}
                      className="text-sm text-[#E53935] font-medium mt-0.5 inline-block"
                    >
                      Call rider
                    </a>
                  ) : null}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={() => toast.info('Support will contact you shortly')}
              className="flex-1 border-2 border-[#E53935] text-[#E53935] py-3 rounded-xl font-bold text-sm"
            >
              Report issue
            </button>
            <button
              type="button"
              onClick={() => setShowReceipt(true)}
              className="flex-1 bg-[#E53935] text-white py-3 rounded-xl font-bold text-sm"
            >
              View receipt
            </button>
          </div>
        </div>
      </div>

      <RiderDeliveryChatModal
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        orderId={orderId}
        orderNumber={orderMeta?.orderNumber || orderId}
        rider={{ name: orderMeta?.riderName || 'Rider', phone: orderMeta?.riderPhone || '' }}
        riderId={live.riderId}
      />

      <AnimatePresence>
        {showReceipt && (() => {
          const receipt = receiptFrom(live.booking?.raw, orderMeta, orderId);
          return (
            <motion.div
              key="receipt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center"
              onClick={() => setShowReceipt(false)}
            >
              <motion.div
                initial={{ y: 60 }}
                animate={{ y: 0 }}
                exit={{ y: 60 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full sm:max-w-md max-h-[85dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-[#121212]">Delivery Receipt</h2>
                  <button
                    type="button"
                    onClick={() => setShowReceipt(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
                    aria-label="Close receipt"
                  >
                    ✕
                  </button>
                </div>
                {!receipt ? (
                  <p className="px-5 py-8 text-sm text-gray-500 text-center">
                    Receipt isn't available yet — check again once the order details finish syncing.
                  </p>
                ) : (
                  <div className="px-5 py-4 pb-6">
                    <div className="text-center mb-4">
                      <div className="text-xs text-gray-400">Order</div>
                      <div className="font-bold text-[#E53935]">{receipt.id}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{fmtDateTime(receipt.created)}</div>
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                      <div>
                        <div className="text-xs text-gray-500">Pickup</div>
                        <div className="font-medium">{receipt.pickup}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Dropoff</div>
                        <div className="font-medium">{receipt.dropoff}</div>
                      </div>
                      <div className="flex gap-6 flex-wrap">
                        {receipt.item && (
                          <div>
                            <div className="text-xs text-gray-500">Item</div>
                            <div className="font-medium">{receipt.item}</div>
                          </div>
                        )}
                        {receipt.distanceKm != null && (
                          <div>
                            <div className="text-xs text-gray-500">Distance</div>
                            <div className="font-medium">{Number(receipt.distanceKm).toFixed(1)} km</div>
                          </div>
                        )}
                        {receipt.vehicle && (
                          <div>
                            <div className="text-xs text-gray-500">Vehicle</div>
                            <div className="font-medium">{String(receipt.vehicle).toLowerCase()}</div>
                          </div>
                        )}
                        {receipt.riderName && (
                          <div>
                            <div className="text-xs text-gray-500">Rider</div>
                            <div className="font-medium">{receipt.riderName}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
                      {receipt.itemTotal != null && receipt.itemTotal > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Item total</span>
                          <span>{fmtNaira(receipt.itemTotal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Delivery fee</span>
                        <span>{fmtNaira(receipt.deliveryFee)}</span>
                      </div>
                      {receipt.serviceFee != null && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Service fee</span>
                          <span>{fmtNaira(receipt.serviceFee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2 mt-1">
                        <span>Total{receipt.paymentStatus === 'paid' ? ' paid' : ''}</span>
                        <span className="text-[#E53935]">{fmtNaira(receipt.total)}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                      {receipt.paymentMethod && (
                        <div className="flex justify-between">
                          <span>Payment method</span>
                          <span className="font-medium text-gray-700">{receipt.paymentMethod}</span>
                        </div>
                      )}
                      {receipt.paymentStatus && (
                        <div className="flex justify-between">
                          <span>Payment status</span>
                          <span className="font-medium text-gray-700">{receipt.paymentStatus}</span>
                        </div>
                      )}
                      {receipt.paid && (
                        <div className="flex justify-between">
                          <span>Paid at</span>
                          <span className="font-medium text-gray-700">{fmtDateTime(receipt.paid)}</span>
                        </div>
                      )}
                      {receipt.paymentReference && (
                        <div className="flex justify-between">
                          <span>Reference</span>
                          <span className="font-medium text-gray-700 break-all">{receipt.paymentReference}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}
