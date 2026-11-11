/**
 * Admin panel: delivery zones + unified delivery pricing.
 *
 * Lets an admin (foundation-level, kept intentionally simple):
 *  - enable/disable the unified delivery pricing engine
 *  - edit each delivery zone (polygon, enabled, priority, zone base fee)
 *  - seed the placeholder Abeokuta zones
 *
 * Writes:
 *   deliveryZones/{id}                       — zone geometry + priority
 *   pricingSettings/current.deliveryPricing  — { enabled, orderTypes, roundingStepping, version }
 *
 * IMPORTANT: enabling here changes live FOOD delivery fees. Do NOT enable
 * until the server-authoritative validation (verifyOrderDeliveryFee) has been
 * deployed and reviewed.
 */
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { DELIVERY_ZONES_SEED } from '../../lib/deliveryZonesSeed';
import { getActivePricingSettings } from '../../utils/pricingSettings';
import { SERVICE_BOUNDS, MAX_RADIUS_KM, ABEOKUTA_CENTER } from '../../utils/abeokutaServiceArea';

const ORDER_TYPES = ['FOOD', 'MARKET', 'PHARMACY', 'GENERAL_DELIVERY', 'FUEL'];

const polygonToText = (p) => (Array.isArray(p) ? p.map((pt) => `${pt[0]}, ${pt[1]}`).join('\n') : '');
const textToPolygon = (t) =>
  String(t || '')
    .split('\n')
    .map((line) => line.split(',').map((v) => parseFloat(v)))
    .filter((pt) => pt.length >= 2 && pt.every((v) => Number.isFinite(v)));

export default function DeliveryZonesPanel() {
  const [enabled, setEnabled] = useState(false);
  const [roundingStepping, setRoundingStepping] = useState(50);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bd, setBd] = useState({ baseFee: 400, perKm: 100, minFee: 500, maxFee: 6000, enabled: true });
  const [sa, setSa] = useState({
    south: SERVICE_BOUNDS.south, north: SERVICE_BOUNDS.north, west: SERVICE_BOUNDS.west, east: SERVICE_BOUNDS.east,
    centerLat: ABEOKUTA_CENTER.lat, centerLng: ABEOKUTA_CENTER.lng,
    maxRadiusKm: MAX_RADIUS_KM, boundsVerified: false, polygonText: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'deliveryZones'));
        setZones(snap.docs.map((d) => ({ ref: d.id, ...d.data() })));
        if (snap.empty) setZones(DELIVERY_ZONES_SEED.map((z) => ({ ...z })));
      } catch (err) {
        console.error(err);
      }
      try {
        const ps = await getDoc(doc(db, 'pricingSettings', 'current'));
        if (ps.exists()) {
          const dp = ps.data().deliveryPricing || {};
          setEnabled(dp.enabled === true);
          setRoundingStepping(dp.roundingStepping ?? getActivePricingSettings().roundingStep ?? 50);
          const gd = dp.orderTypes?.GENERAL_DELIVERY || {};
          setBd({
            baseFee: gd.baseFee ?? 400,
            perKm: gd.perKmAfterIncluded ?? 100,
            minFee: gd.minimumFee ?? 500,
            maxFee: gd.maximumFee ?? 6000,
            enabled: gd.enabled !== false,
          });
          const s = dp.serviceArea || {};
          setSa({
            south: s.bounds?.south ?? SERVICE_BOUNDS.south,
            north: s.bounds?.north ?? SERVICE_BOUNDS.north,
            west: s.bounds?.west ?? SERVICE_BOUNDS.west,
            east: s.bounds?.east ?? SERVICE_BOUNDS.east,
            centerLat: s.center?.lat ?? ABEOKUTA_CENTER.lat,
            centerLng: s.center?.lng ?? ABEOKUTA_CENTER.lng,
            maxRadiusKm: s.maxRadiusKm ?? MAX_RADIUS_KM,
            boundsVerified: s.boundsVerified === true,
            polygonText: s.polygon ? polygonToText(s.polygon) : '',
          });
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    })();
  }, []);

  const updateZone = (i, patch) =>
    setZones((prev) => prev.map((z, idx) => (idx === i ? { ...z, ...patch } : z)));

  const handleSeed = () => {
    if (!window.confirm('Replace the current zone list with the placeholder Abeokuta zones?')) return;
    setZones(DELIVERY_ZONES_SEED.map((z) => ({ ...z })));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const z of zones) {
        const polygon = textToPolygon(z.polygonText !== undefined ? z.polygonText : polygonToText(z.polygon));
        if (polygon.length < 3) {
          toast.error(`Zone ${z.name}: polygon needs at least 3 points`);
          setSaving(false);
          return;
        }
        await setDoc(
          doc(db, 'deliveryZones', z.id),
          {
            id: z.id,
            name: z.name,
            description: z.description || '',
            enabled: z.enabled !== false,
            priority: Number(z.priority) || 0,
            baseFee: Number.isFinite(Number(z.baseFee)) ? Number(z.baseFee) : null,
            polygon,
            boundsVerified: Boolean(z.boundsVerified),
          },
          { merge: true }
        );
      }

      const saPolygon = textToPolygon(sa.polygonText);
      await updateDoc(doc(db, 'pricingSettings', 'current'), {
        deliveryPricing: {
          enabled,
          roundingStepping: Number(roundingStepping) || 50,
          orderTypes: {
            GENERAL_DELIVERY: {
              distanceMode: 'linear',
              baseFee: Number(bd.baseFee) || 400,
              perKmAfterIncluded: Number(bd.perKm) || 100,
              includedKm: 0,
              minimumFee: Number(bd.minFee) || 500,
              maximumFee: Number(bd.maxFee) || 6000,
              enabled: bd.enabled !== false,
              roundingStepping: 1,
            },
          },
          // Overall Abeokuta service area = authoritative coverage boundary.
          serviceArea: {
            enabled: true,
            bounds: {
              south: Number(sa.south) || SERVICE_BOUNDS.south,
              north: Number(sa.north) || SERVICE_BOUNDS.north,
              west: Number(sa.west) || SERVICE_BOUNDS.west,
              east: Number(sa.east) || SERVICE_BOUNDS.east,
            },
            center: { lat: Number(sa.centerLat) || ABEOKUTA_CENTER.lat, lng: Number(sa.centerLng) || ABEOKUTA_CENTER.lng },
            maxRadiusKm: Number(sa.maxRadiusKm) || MAX_RADIUS_KM,
            boundsVerified: sa.boundsVerified === true,
            polygon: saPolygon.length >= 3 ? saPolygon : undefined,
          },
          version: Date.now(),
          updatedAt: serverTimestamp(),
        },
      });

      toast.success('Delivery zones & pricing saved');
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Failed to save (admin permission required)');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading delivery zones…</div>;

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">📍 Delivery Zones & Pricing</h2>
        <p className="text-sm text-gray-500">
          Canonical zone boundaries (polygon = one [lat, lng] per line) + the master switch.
        </p>
      </div>

      <div className="flex items-center gap-3 border rounded-lg p-3 bg-amber-50">
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enable unified delivery pricing
        </label>
        <span className="text-xs text-gray-600 bg-white rounded px-2 py-1">
          Rounding step ₦{roundingStepping}
        </span>
      </div>

      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-gray-800">
          <span>📦 Book Delivery pricing</span>
          <label className="flex items-center gap-1 text-xs font-normal text-gray-600 ml-auto">
            <input type="checkbox" checked={bd.enabled} onChange={(e) => setBd((p) => ({ ...p, enabled: e.target.checked }))} />
            Enabled
          </label>
        </div>
        <p className="text-xs text-gray-500">BASE FEE + PER-KM point-to-point pricing across Abeokuta. Changes take effect without code changes.</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            ['Base fee (₦)', 'baseFee'],
            ['Per km (₦)', 'perKm'],
            ['Min fee (₦)', 'minFee'],
            ['Max fee (₦)', 'maxFee'],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="text-xs text-gray-500">{label}</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={bd[key]}
                onChange={(e) => setBd((p) => ({ ...p, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </div>
      {enabled && (
        <p className="text-xs text-red-600">
          ⚠️ Enabling changes live FOOD delivery fees. Only enable after the server-side
          fee validation (verifyOrderDeliveryFee) is deployed and reviewed.
        </p>
      )}

      <div className="border rounded-lg p-3 space-y-3">
        <div className="font-semibold text-gray-800">🗺️ Abeokuta service area (authoritative boundary)</div>
        <p className="text-xs text-gray-500">Named zones below are optional groups INSIDE this area. A valid Abeokuta point outside named zones still uses default distance pricing.</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            ['South lat', 'south'], ['North lat', 'north'], ['West lng', 'west'], ['East lng', 'east'],
            ['Center lat', 'centerLat'], ['Center lng', 'centerLng'], ['Max radius (km)', 'maxRadiusKm'],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="text-xs text-gray-500">{label}</label>
              <input
                type="number" step="0.0001"
                className="w-full border rounded px-2 py-1"
                value={sa[key]}
                onChange={(e) => setSa((p) => ({ ...p, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sa.boundsVerified} onChange={(e) => setSa((p) => ({ ...p, boundsVerified: e.target.checked }))} />
          boundsVerified (real-world boundary confirmed)
        </label>
        <div>
          <label className="text-xs text-gray-500">Optional polygon (one [lat, lng] per line) — overrides bounds when 3+ points</label>
          <textarea
            className="w-full border rounded px-2 py-1 h-16 font-mono text-xs"
            value={sa.polygonText}
            onChange={(e) => setSa((p) => ({ ...p, polygonText: e.target.value }))}
            placeholder="6.9, 3.0&#10;7.5, 3.0&#10;7.5, 4.0&#10;6.9, 4.0"
          />
        </div>
      </div>

      <div className="space-y-3">
        {zones.map((z, i) => (
          <div key={z.ref || z.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-3">
              <input
                className="flex-1 border rounded px-2 py-1"
                value={z.name || ''}
                onChange={(e) => updateZone(i, { name: e.target.value })}
                placeholder="Zone name"
              />
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={z.enabled !== false} onChange={(e) => updateZone(i, { enabled: e.target.checked })} />
                Enabled
              </label>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Priority</label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1"
                  value={z.priority || 0}
                  onChange={(e) => updateZone(i, { priority: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Zone base fee (₦, blank = distance pricing)</label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1"
                  value={z.baseFee ?? ''}
                  onChange={(e) => updateZone(i, { baseFee: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Polygon (one [lat, lng] per line)</label>
              <textarea
                className="w-full border rounded px-2 py-1 h-20 font-mono text-xs"
                value={z.polygonText !== undefined ? z.polygonText : polygonToText(z.polygon)}
                onChange={(e) => updateZone(i, { polygonText: e.target.value })}
                placeholder="7.21, 3.43\n7.21, 3.45\n7.23, 3.45\n7.23, 3.43"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSeed}
          className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-100"
        >
          Seed placeholder Abeokuta zones
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save zones & pricing'}
        </button>
      </div>
    </div>
  );
}
