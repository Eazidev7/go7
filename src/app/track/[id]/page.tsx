'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { Map as MLMap, Marker, LngLatBounds, LngLat } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { doc, onSnapshot, getFirestore, Timestamp } from 'firebase/firestore';
import { app } from '../../../lib/firebase';

// ---- Types ----
type OrderStatus = 'PENDING'|'IN_TRANSIT'|'DELIVERED';

type LatLng = { lat:number; lng:number };

type Order = {
  pickupAddress: string;
  dropoffAddress: string;
  pickupLatLng: LatLng;
  dropoffLatLng: LatLng;
  status: OrderStatus;
  priceNaira: number;
  distanceKm: number;
  pin: string;
  riderId?: string|null;
  createdAt?: Timestamp;
  riderAssignedAt?: Timestamp;
  deliveredAt?: Timestamp;
  customerPhone?: string;
};

// ---- Utilities ----
const fmtNaira = (n?:number) => n == null ? '—' : `₦${n.toLocaleString()}`;
const fmtTime = (ts?:Timestamp) => ts?.toDate ? ts.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '—';
const statusChip = (s?:OrderStatus) => {
  switch(s){
    case 'DELIVERED': return 'bg-green-100/20 text-green-200';
    case 'IN_TRANSIT': return 'bg-emerald-100/20 text-emerald-200';
    default: return 'bg-blue-100/20 text-blue-200';
  }
};

// Simple smooth animation between two coords
function smoothMove(marker: Marker, from: maplibregl.LngLat, to: maplibregl.LngLat) {
  let t = 0;
  const step = () => {
    t += 0.08;
    const lng = from.lng + (to.lng - from.lng)*t;
    const lat = from.lat + (to.lat - from.lat)*t;
    marker.setLngLat([lng,lat]);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---- Component ----
export default function TrackPage({ params }:{ params:{ id:string } }) {
  const db = useMemo(()=>getFirestore(app),[]);
  const [order, setOrder] = useState<Order|null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('—');
  const [isOffline, setIsOffline] = useState(false);

  // Rider position
  const [riderPos, setRiderPos] = useState<LatLng|null>(null);

  // Map refs
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap|null>(null);
  const pickupMk = useRef<Marker|null>(null);
  const dropMk = useRef<Marker|null>(null);
  const riderMk = useRef<Marker|null>(null);
  const routeLineId = 'route-line';

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setIsOffline(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to order
  useEffect(()=>{
    const unsub = onSnapshot(doc(db, 'orders', params.id), snap => {
      const data = snap.data() as Order | undefined;
      if (data) {
        setOrder(data);
        // prefer most recent known timestamp
        const t = data.deliveredAt ?? data.riderAssignedAt ?? data.createdAt;
        setLastUpdate(fmtTime(t));
      }
    });
    return unsub;
  },[db, params.id]);

  // Subscribe to rider location
  useEffect(()=>{
    if (!order?.riderId) return;
    const unsub = onSnapshot(doc(db, 'riderLocations', order.riderId), snap => {
      const d = snap.data() as any;
      if (d?.lat && d?.lng) {
        setRiderPos({ lat: d.lat, lng: d.lng });
        if (d?.ts?.toDate) setLastUpdate(fmtTime(d.ts));
      }
    });
    return unsub;
  },[db, order?.riderId]);

  // Init map once
  useEffect(()=>{
    if (!mapRef.current || map.current) return;
    map.current = new maplibregl.Map({
      container: mapRef.current,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`,
      center: [3.35,7.15], 
      zoom: 12
    });

    // Map load handler
    map.current.on('load', () => {
      if (!map.current) return;
      
      // Add route line layer
      map.current.addSource(routeLineId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        }
      });
      
      map.current.addLayer({
        id: routeLineId,
        type: 'line',
        source: routeLineId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#36c2c2', // teal
          'line-width': 4,
          'line-opacity': 0.8
        }
      });
    });
  },[]);

  // Place pickup/drop markers & fit bounds on order load
  useEffect(()=>{
    if (!order || !map.current) return;

    pickupMk.current?.remove();
    dropMk.current?.remove();

    // Create A marker element (pickup)
    const pickupEl = document.createElement('div');
    pickupEl.className = 'w-8 h-8 rounded-full flex items-center justify-center font-bold text-white';
    pickupEl.style.backgroundColor = '#38bdf8';
    pickupEl.style.boxShadow = '0 0 0 2px white';
    pickupEl.innerHTML = 'A';

    // Create B marker element (dropoff)
    const dropoffEl = document.createElement('div');
    dropoffEl.className = 'w-8 h-8 rounded-full flex items-center justify-center font-bold text-white';
    dropoffEl.style.backgroundColor = '#22c55e';
    dropoffEl.style.boxShadow = '0 0 0 2px white';
    dropoffEl.innerHTML = 'B';

    pickupMk.current = new maplibregl.Marker({ element: pickupEl })
      .setLngLat([order.pickupLatLng.lng, order.pickupLatLng.lat]).addTo(map.current);
    dropMk.current = new maplibregl.Marker({ element: dropoffEl })
      .setLngLat([order.dropoffLatLng.lng, order.dropoffLatLng.lat]).addTo(map.current);

    const b = new LngLatBounds();
    b.extend([order.pickupLatLng.lng, order.pickupLatLng.lat]);
    b.extend([order.dropoffLatLng.lng, order.dropoffLatLng.lat]);
    map.current.fitBounds(b, { padding: 60, duration: 600 });

    // Add route line if map is loaded
    if (map.current.isStyleLoaded() && map.current.getSource(routeLineId)) {
      const routeCoordinates = [
        [order.pickupLatLng.lng, order.pickupLatLng.lat],
        [order.dropoffLatLng.lng, order.dropoffLatLng.lat]
      ];
      
      (map.current.getSource(routeLineId) as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeCoordinates
        }
      });
    }
  },[order]);

  // Add / move rider marker smoothly
  useEffect(()=>{
    if (!map.current || !riderPos) return;
    const to = new LngLat(riderPos.lng, riderPos.lat);

    if (!riderMk.current) {
      // Create rider marker element
      const riderEl = document.createElement('div');
      riderEl.className = 'w-8 h-8 rounded-full flex items-center justify-center font-bold text-white';
      riderEl.style.backgroundColor = '#ef4444';
      riderEl.style.boxShadow = '0 0 0 2px white';
      riderEl.innerHTML = '🛵';

      riderMk.current = new maplibregl.Marker({ element: riderEl })
        .setLngLat(to).addTo(map.current);
      return;
    }
    const from = riderMk.current.getLngLat();
    smoothMove(riderMk.current, from, to);
  },[riderPos]);

  // ACTIONS
  const copyPin = async () => {
    if (order?.pin) await navigator.clipboard?.writeText(order.pin);
  };
  
  const callLink = order?.customerPhone ? `tel:${order.customerPhone}` : undefined;
  const waLink = order?.customerPhone ? `https://wa.me/${order.customerPhone.replace(/\D/g,'')}` : undefined;
  const share = () => {
    (navigator as any).share?.({
      title: 'Track my Go7 delivery',
      text: 'Track my Go7 delivery',
      url: window.location.href
    });
  };
  
  // Loading state
  if (!order) {
    return (
      <div className="min-h-dvh bg-[#0F0F12] text-white">
        {/* Loading header */}
        <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="font-extrabold text-xl tracking-tight">Go7</div>
          <div className="flex items-center gap-3">
            <div className="h-5 w-16 bg-white/10 animate-pulse rounded-full"></div>
          </div>
        </header>

        {/* Loading body */}
        <div className="grid md:grid-cols-2 gap-4 p-4">
          {/* MAP CARD */}
          <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5 h-[420px] animate-pulse"></div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            <div className="rounded-xl p-4 bg-white/5 border border-white/10 h-40 animate-pulse"></div>
            <div className="rounded-xl p-4 bg-white/5 border border-white/10 h-32 animate-pulse"></div>
            <div className="rounded-xl p-4 bg-white/5 border border-white/10 h-32 animate-pulse"></div>
          </div>
        </div>

        {/* TIMELINE */}
        <div className="p-4">
          <div className="rounded-xl p-4 bg-white/5 border border-white/10 h-32 animate-pulse"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-dvh bg-[#0F0F12] text-white">
      {isOffline && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-900/80 text-yellow-100 px-4 py-2 rounded-full text-sm z-10">
          Offline — showing last update
        </div>
      )}
      {/* Header */}
      <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="font-extrabold text-xl tracking-tight">Go7</div>
        <div className="flex items-center gap-3">
          <div className="text-sm opacity-80">#{params.id}</div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${statusChip(order?.status)}`}>
            {order?.status ?? '...'}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="grid md:grid-cols-2 gap-4 p-4">
        {/* MAP CARD */}
        <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5 h-[420px]">
          <div ref={mapRef} className="h-full w-full" />
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          {/* PIN */}
          {order?.status !== 'DELIVERED' ? (
            <div className="rounded-xl p-4 bg-white/5 border border-white/10">
              <div className="text-sm opacity-70">Your Delivery PIN</div>
              <div className="text-4xl font-extrabold tracking-[0.3em] mt-1">{order?.pin ?? '----'}</div>
              <div className="text-xs opacity-60 mt-1">Share this with the rider on arrival.</div>
              <button onClick={copyPin} className="mt-3 inline-block bg-[#E01E28] px-3 py-2 rounded-lg font-semibold">
                Copy PIN
              </button>
            </div>
          ) : null}

          {/* ROUTE */}
          <div className="rounded-xl p-4 bg-white/5 border border-white/10">
            <div className="font-semibold mb-2">Route</div>
            <div className="text-sm flex items-start gap-2"><span>📍</span><span>{order?.pickupAddress || '—'}</span></div>
            <div className="text-sm flex items-start gap-2 mt-1"><span>🏁</span><span>{order?.dropoffAddress || '—'}</span></div>
          </div>

          {/* CONTACT */}
          <div className="rounded-xl p-4 bg-white/5 border border-white/10">
            <div className="font-semibold mb-2">Contact</div>
            <div className="text-sm opacity-80">Rider phone (masked): 080*** ***</div>
            <div className="flex gap-2 mt-2">
              {callLink && <a className="bg-white/10 px-3 py-2 rounded-lg" href={callLink}>Call</a>}
              {waLink && <a className="bg-white/10 px-3 py-2 rounded-lg" href={waLink}>WhatsApp</a>}
              <button className="bg-white/10 px-3 py-2 rounded-lg" onClick={share}>Share link</button>
            </div>
          </div>

          {/* ORDER SUMMARY */}
          <div className="rounded-xl p-4 bg-white/5 border border-white/10">
            <div className="text-sm opacity-70">Order</div>
            <div className="text-lg font-bold">#{params.id}</div>
            <div className="text-sm mt-1">
              Distance: <b>{order?.distanceKm ?? '—'} km</b> • Price: <b>{fmtNaira(order?.priceNaira)}</b>
            </div>
            <div className="text-xs opacity-60 mt-1">Last updated: {lastUpdate}</div>
          </div>
        </div>
      </div>

      {/* TIMELINE */}
      <div className="p-4">
        <div className="rounded-xl p-4 bg-white/5 border border-white/10">
          <div className="font-semibold mb-3">Status Timeline</div>
          <ol className="space-y-2 text-sm">
            <li>✅ Order Placed <span className="opacity-60 ml-2">{fmtTime(order?.createdAt)}</span></li>
            <li>{order && order.status!=='PENDING' ? '✅' : '⏳'} Rider Assigned
              <span className="opacity-60 ml-2">{fmtTime(order?.riderAssignedAt)}</span>
            </li>
            <li>{order && order.status==='DELIVERED' ? '✅' : '⏳'} Delivered
              <span className="opacity-60 ml-2">{fmtTime(order?.deliveredAt)}</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
