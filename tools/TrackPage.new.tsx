import { MapPin, Clock, Package, ChevronRight, Bike, Search, X } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import { loadTrackingOrder } from '../../src/utils/loadTrackingOrder';
import { getDropoffAddress, getPickupAddress, normalizeTrackingId } from '../../src/utils/bookingTracking';
import { useAuth } from '../contexts/backend/AuthContext';

interface Order {
  id: string;
  orderNumber: string;
  status: 'preparing' | 'ready-for-pickup' | 'picked-up' | 'on-the-way' | 'nearby' | 'delivered';
  vendor: {
    name: string;
    image: string;
    location: string;
  };
  rider?: {
    name: string;
    image: string;
    rating: number;
  };
  destination: string;
  estimatedTime: number;
  items: number;
  totalPrice: number;
  progress: number;
}

interface TrackPageProps {
  onTrackOrder: (orderId: string) => void;
}

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=200';
const ACTIVE_STATUSES = new Set([
  'pending', 'confirmed', 'assigned', 'accepted', 'picked_up', 'picked-up',
  'enroute', 'in_transit', 'in-transit', 'on-the-way', 'nearby', 'preparing',
  'searching_rider', 'rider-assigned',
]);

function mapUiStatus(raw: string): Order['status'] {
  const s = String(raw || '').toLowerCase().replace(/_/g, '-');
  if (s === 'nearby') return 'nearby';
  if (['on-the-way', 'enroute', 'in-transit', 'enroute-dropoff'].includes(s)) return 'on-the-way';
  if (['picked-up', 'picked-up', 'pickup-complete'].includes(s)) return 'picked-up';
  if (s === 'ready-for-pickup') return 'ready-for-pickup';
  if (['delivered', 'completed'].includes(s)) return 'delivered';
  if (['assigned', 'rider-assigned', 'accepted'].includes(s)) return 'preparing';
  return 'preparing';
}

function progressForStatus(status: Order['status']) {
  const map: Record<string, number> = {
    preparing: 20,
    'ready-for-pickup': 35,
    'picked-up': 55,
    'on-the-way': 75,
    nearby: 92,
    delivered: 100,
  };
  return map[status] || 25;
}

function bookingToOrder(docId: string, data: Record<string, unknown>): Order {
  const orderNumber = String(data.bookingId || data.jobId || data.orderId || docId);
  const status = mapUiStatus(String(data.status || data.orderStatus || 'pending'));
  const pickup = getPickupAddress(data) || 'Pickup';
  const dropoff = getDropoffAddress(data) || 'Dropoff';
  const items = Array.isArray(data.items) ? data.items.length : 1;

  return {
    id: docId,
    orderNumber,
    status,
    vendor: {
      name: String(data.vendorName || data.vendor?.name || 'Go7 Delivery'),
      image: String(data.vendor?.image || data.vendorImage || PLACEHOLDER_IMG),
      location: pickup.split(',')[0] || pickup,
    },
    rider: data.riderName || data.assignedRider?.name
      ? {
          name: String(data.riderName || data.assignedRider?.name),
          image: String(data.riderPhoto || data.assignedRider?.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'),
          rating: Number(data.riderRating || data.assignedRider?.rating || 4.8),
        }
      : undefined,
    destination: dropoff.split(',')[0] || dropoff,
    estimatedTime: Number(data.eta || data.estimatedMinutes || 15),
    items: items || 1,
    totalPrice: Number(data.total || data.fare || data.finalFare || data.deliveryFee || 0),
    progress: progressForStatus(status),
  };
}

function readLocalCodes(): string[] {
  const codes: string[] = [];
  try {
    const last = localStorage.getItem('go7_last_tracking_id');
    if (last) codes.push(normalizeTrackingId(last));
    const stored = localStorage.getItem('go7:bookings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        parsed.forEach((b) => {
          const c = b?.bookingId || b?.id || b?.jobId;
          if (c) codes.push(normalizeTrackingId(c));
        });
      }
    }
  } catch {
    /* ignore */
  }
  return [...new Set(codes.filter(Boolean))];
}

export function TrackPage({ onTrackOrder }: TrackPageProps) {
  const { user } = useAuth();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!db) {
        setLoadingList(false);
        return;
      }

      const merged = new Map<string, Order>();

      const addDoc = (docId: string, data: Record<string, unknown>) => {
        const order = bookingToOrder(docId, data);
        merged.set(order.orderNumber, order);
      };

      if (user?.uid) {
        try {
          const snap = await getDocs(
            query(collection(db, 'bookings'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(12))
          );
          snap.docs.forEach((d) => addDoc(d.id, d.data()));
        } catch {
          try {
            const snap = await getDocs(
              query(collection(db, 'bookings'), where('userId', '==', user.uid), limit(20))
            );
            snap.docs.forEach((d) => addDoc(d.id, d.data()));
          } catch (err) {
            console.warn('[TrackPage] user bookings:', err);
          }
        }
      }

      for (const code of readLocalCodes().slice(0, 8)) {
        if ([...merged.values()].some((o) => o.orderNumber.toLowerCase() === code.toLowerCase())) continue;
        try {
          const snap = await getDocs(
            query(collection(db, 'bookings'), where('bookingId', '==', code), limit(1))
          );
          if (!snap.empty) {
            addDoc(snap.docs[0].id, snap.docs[0].data());
          }
        } catch {
          /* ignore */
        }
      }

      if (cancelled) return;

      const all = [...merged.values()].sort((a, b) => {
        const activeA = ACTIVE_STATUSES.has(a.status) || a.status !== 'delivered';
        const activeB = ACTIVE_STATUSES.has(b.status) || b.status !== 'delivered';
        if (activeA && !activeB) return -1;
        if (!activeA && activeB) return 1;
        return 0;
      });

      setActiveOrders(all.filter((o) => o.status !== 'delivered').slice(0, 8));
      setRecentOrders(all.filter((o) => o.status === 'delivered').slice(0, 5));
      setLoadingList(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const handleTrackByNumber = async () => {
    const code = normalizeTrackingId(trackingNumber);
    if (!code) {
      toast.error('Please enter a tracking number');
      return;
    }

    setIsSearching(true);
    try {
      const tracking = await loadTrackingOrder(code);
      if (tracking) {
        try {
          localStorage.setItem('go7_last_tracking_id', tracking.displayId);
        } catch {
          /* ignore */
        }
        toast.success(`Found order ${tracking.displayId}`);
        onTrackOrder(tracking.displayId);
        setTrackingNumber('');
      } else {
        toast.error(`Order ${code} not found. Please check the tracking number.`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not look up order. Try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'nearby':
        return 'bg-green-500';
      case 'on-the-way':
        return 'bg-[#E53935]';
      case 'picked-up':
        return 'bg-orange-500';
      case 'ready-for-pickup':
        return 'bg-yellow-500';
      case 'delivered':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'nearby':
        return 'Arriving Soon';
      case 'on-the-way':
        return 'On The Way';
      case 'picked-up':
        return 'Picked Up';
      case 'ready-for-pickup':
        return 'Ready for Pickup';
      case 'delivered':
        return 'Delivered';
      default:
        return 'Preparing';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    if (status === 'nearby' || status === 'on-the-way' || status === 'picked-up') {
      return <Bike className="w-4 h-4" />;
    }
    return <Package className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 min-h-screen pb-24">
      <div className="bg-[#E53935] px-5 pt-3 pb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-white text-2xl font-bold">Track Orders</h1>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
        </div>
        <p className="text-white/90 text-sm mb-4">Follow your deliveries in real-time</p>

        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTrackByNumber()}
              placeholder="Enter tracking number (e.g. Go7-PS0332V)"
              className="w-full pl-12 pr-24 py-3.5 rounded-xl text-[#121212] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            {trackingNumber && (
              <button
                type="button"
                onClick={() => setTrackingNumber('')}
                className="absolute right-20 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <button
              type="button"
              onClick={handleTrackByNumber}
              disabled={isSearching || !trackingNumber.trim()}
              className="absolute right-2 bg-[#E53935] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#d32f2f] disabled:opacity-50"
            >
              {isSearching ? '...' : 'Track'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3"
          >
            <div className="text-2xl">💡</div>
            <div className="flex-1">
              <p className="text-xs text-blue-900 leading-relaxed">
                <span className="font-bold">Quick Track:</span> Enter your Go7 booking code above or tap a delivery below
              </p>
            </div>
          </motion.div>
        </div>

        <div className="bg-white rounded-t-3xl shadow-sm mt-1">
          <div className="px-5 pt-5 pb-2">
            <div className="flex items-center gap-2 mb-4">
              <motion.div
                className="w-2 h-2 bg-[#E53935] rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <h2 className="font-bold text-[#121212]">
                Active Deliveries ({activeOrders.length})
              </h2>
            </div>
          </div>

          <div className="space-y-3 px-5 pb-5">
            {loadingList && (
              <p className="text-sm text-gray-500 text-center py-6">Loading your deliveries...</p>
            )}
            {!loadingList && activeOrders.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">
                No active deliveries. Book a delivery or enter your tracking code above.
              </p>
            )}
            {activeOrders.map((order) => (
              <OrderCard
                key={order.orderNumber}
                order={order}
                onTrack={onTrackOrder}
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
                getStatusIcon={getStatusIcon}
              />
            ))}
          </div>
        </div>

        {recentOrders.length > 0 && (
          <div className="bg-white mt-4 rounded-2xl shadow-sm mx-5 mb-6">
            <div className="px-5 pt-4 pb-2">
              <h2 className="font-bold text-[#121212]">Recent Deliveries</h2>
            </div>
            <div className="space-y-3 px-5 pb-5">
              {recentOrders.map((order) => (
                <OrderCard
                  key={order.orderNumber}
                  order={order}
                  onTrack={onTrackOrder}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface OrderCardProps {
  order: Order;
  onTrack: (orderId: string) => void;
  getStatusColor: (status: Order['status']) => string;
  getStatusText: (status: Order['status']) => string;
  getStatusIcon: (status: Order['status']) => JSX.Element;
}

function OrderCard({ order, onTrack, getStatusColor, getStatusText, getStatusIcon }: OrderCardProps) {
  const isUrgent = order.status === 'nearby' || order.estimatedTime <= 5;

  return (
    <motion.button
      type="button"
      onClick={() => onTrack(order.orderNumber)}
      className="w-full bg-white border-2 border-gray-100 rounded-2xl p-4 hover:border-[#E53935] transition-all"
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`${getStatusColor(order.status)} text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold`}>
          {getStatusIcon(order.status)}
          {getStatusText(order.status)}
        </div>
        <span className="text-xs text-gray-500 font-mono">{order.orderNumber}</span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <ImageWithFallback
          src={order.vendor.image}
          alt={order.vendor.name}
          className="w-12 h-12 rounded-xl object-cover border border-gray-100"
        />
        <div className="flex-1 text-left">
          <h3 className="font-bold text-[#121212]">{order.vendor.name}</h3>
          <p className="text-xs text-gray-500">
            {order.items} item{order.items !== 1 ? 's' : ''} &middot; NGN {order.totalPrice.toLocaleString()}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>

      {order.rider && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-xl">
          <ImageWithFallback
            src={order.rider.image}
            alt={order.rider.name}
            className="w-8 h-8 rounded-full object-cover border border-white"
          />
          <div className="flex-1 text-left">
            <p className="text-xs font-medium text-[#121212]">{order.rider.name}</p>
            <p className="text-xs text-gray-500">Rating {order.rider.rating}</p>
          </div>
        </div>
      )}

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <MapPin className="w-3.5 h-3.5" />
            <span className="font-medium">{order.vendor.location}</span>
            <span className="text-gray-400">-&gt;</span>
            <span className="font-medium">{order.destination}</span>
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${getStatusColor(order.status)}`}
            initial={{ width: 0 }}
            animate={{ width: `${order.progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className={`flex items-center justify-between ${isUrgent ? 'text-[#E53935]' : 'text-gray-600'}`}>
        <div className="flex items-center gap-1.5">
          <Clock className={`w-4 h-4 ${isUrgent ? 'animate-pulse' : ''}`} />
          <span className="text-sm font-bold">
            {isUrgent ? 'Almost there - ' : ''}ETA {order.estimatedTime} min
          </span>
        </div>
      </div>
    </motion.button>
  );
}
