import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import toast from 'react-hot-toast';
import { db } from '../../config/firebase';
import {
  DEFAULT_PRICING_SETTINGS,
  normalizePricingSettings,
  savePricingSettings,
  subscribePricingSettings,
  calculateGo7DeliveryFare,
  validateShareConfig,
  validateDeliveryPricing,
} from '../../utils/pricingSettings';

const numberField = (label, key, help) => ({ label, key, type: 'number', help });

const FIELDS = [
  { label: 'Launch mode (affordable launch pricing)', key: 'launchMode', type: 'boolean' },
  numberField('Fuel price reference (₦/litre)', 'fuelPriceReference', 'Reference only — for admin notes'),
  numberField('Launch base fee (₦)', 'launchBaseFee'),
  numberField('Launch included KM', 'launchIncludedKm'),
  numberField('Launch per KM after included (₦)', 'launchPerKmAfterIncluded'),
  numberField('Standard base fee (₦)', 'standardBaseFee'),
  numberField('Standard included KM', 'standardIncludedKm'),
  numberField('Standard per KM after included (₦)', 'standardPerKmAfterIncluded'),
  numberField('Waiting grace (minutes)', 'waitingGraceMinutes'),
  numberField('Waiting fee per minute (₦)', 'waitingFeePerMinute'),
  { label: 'Enable automatic travel time charge', key: 'enableTimeCharge', type: 'boolean' },
  numberField('Minimum delivery fee (₦)', 'minimumDeliveryFee'),
  numberField('Maximum delivery fee (₦)', 'maximumDeliveryFee'),
  numberField('Platform fee — food (% as decimal, e.g. 0.1 = 10%)', 'platformFeeRateFood', 'Applied to food item subtotal'),
  numberField('Platform fee — parcel/book (% as decimal)', 'platformFeeRateParcel', 'Applied to delivery charge'),
  numberField('Go7 bike rider share of delivery fee (0.5 = 50%)', 'go7BikeRiderDeliveryShare'),
  numberField('Other riders delivery share (0.5 = 50%)', 'defaultRiderDeliveryShare'),
  numberField('Vendor commission rate (0.08 = 8%)', 'vendorCommissionRate', 'Food subtotal only — do not change without approval'),
];

export default function PricingSettingsPanel() {
  const [form, setForm] = useState({ ...DEFAULT_PRICING_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribePricingSettings(db, (settings) => {
      setForm(settings);
      setLoading(false);
    });
    return unsub;
  }, []);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateVehicleRule = (vehicle, key, value) => {
    setForm((prev) => ({
      ...prev,
      vehicleRules: {
        ...(prev.vehicleRules || {}),
        [vehicle]: { ...(prev.vehicleRules?.[vehicle] || {}), [key]: value },
      },
    }));
  };

  // Ownership-aware share bands: ownership-specific bands win over generic ones.
  // A missing band (e.g. legacy config without ownership) shows the default and
  // is created on first edit.
  const findShareBand = (pred) => (form.riderShareRules?.bands || []).find(pred);
  const shareBandShare = (pred, fallback) => {
    const b = findShareBand(pred);
    return b && Number.isFinite(b.share) ? b.share : fallback;
  };
  const updateShareBand = (ownership, pred, share, defaultBand) => {
    setForm((prev) => {
      const bands = [...(prev.riderShareRules?.bands || [])];
      let i = bands.findIndex(pred);
      if (i < 0) {
        bands.push({ ...defaultBand, ownership });
        i = bands.length - 1;
      } else {
        bands[i] = { ...bands[i], ownership, share };
      }
      return { ...prev, riderShareRules: { bands } };
    });
  };
  const GO7_BAND_PRED = (b) => b.ownership === 'GO7_OWNED';
  const RIDER_STD_PRED = (b) => (b.ownership || 'RIDER_OWNED') === 'RIDER_OWNED' && (b.maxKm ?? 999) <= 15;
  const RIDER_LONG_PRED = (b) => (b.ownership || 'RIDER_OWNED') === 'RIDER_OWNED' && (b.maxKm ?? 0) > 15;

  const updateCorridor = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      corridors: (prev.corridors || []).map((c, i) => (i === index ? { ...c, [key]: value } : c)),
    }));
  };

  const corridorVehiclesToggle = (index, vehicle, checked) => {
    setForm((prev) => ({
      ...prev,
      corridors: (prev.corridors || []).map((c, i) => {
        if (i !== index) return c;
        const set = new Set(c.allowedVehicles || []);
        if (checked) set.add(vehicle);
        else set.delete(vehicle);
        return { ...c, allowedVehicles: [...set] };
      }),
    }));
  };

  const addCorridor = () => {
    setForm((prev) => ({
      ...prev,
      corridors: [
        ...(prev.corridors || []),
        {
          id: '',
          name: 'New corridor',
          enabled: false,
          orderTypes: ['GENERAL_DELIVERY'],
          pickupAreas: [],
          dropoffAreas: [],
          bidirectional: true,
          maxDistanceKm: 18,
          deliveryFee: 0,
          allowedVehicles: ['BICYCLE', 'MOTORCYCLE'],
          preferredVehicle: null,
          riderShareRate: null,
          fallbackToDistancePricing: true,
          priority: 0,
          radiusKm: 1,
        },
      ],
    }));
  };

  const removeCorridor = (index) => {
    setForm((prev) => ({ ...prev, corridors: (prev.corridors || []).filter((_, i) => i !== index) }));
  };

  const updateBand = (orderType, index, key, value) => {
    setForm((prev) => ({
      ...prev,
      deliveryPricing: {
        ...(prev.deliveryPricing || {}),
        orderTypes: {
          ...(prev.deliveryPricing?.orderTypes || {}),
          [orderType]: {
            ...(prev.deliveryPricing?.orderTypes?.[orderType] || {}),
            bands: (prev.deliveryPricing?.orderTypes?.[orderType]?.bands || []).map((b, i) =>
              i === index ? { ...b, [key]: value } : b
            ),
          },
        },
      },
    }));
  };

  const addBand = (orderType) => {
    setForm((prev) => ({
      ...prev,
      deliveryPricing: {
        ...(prev.deliveryPricing || {}),
        orderTypes: {
          ...(prev.deliveryPricing?.orderTypes || {}),
          [orderType]: {
            ...(prev.deliveryPricing?.orderTypes?.[orderType] || {}),
            bands: [...(prev.deliveryPricing?.orderTypes?.[orderType]?.bands || []), { minKm: 0, maxKm: null, fee: 0 }],
          },
        },
      },
    }));
  };

  const removeBand = (orderType, index) => {
    setForm((prev) => ({
      ...prev,
      deliveryPricing: {
        ...(prev.deliveryPricing || {}),
        orderTypes: {
          ...(prev.deliveryPricing?.orderTypes || {}),
          [orderType]: {
            ...(prev.deliveryPricing?.orderTypes?.[orderType] || {}),
            bands: (prev.deliveryPricing?.orderTypes?.[orderType]?.bands || []).filter((_, i) => i !== index),
          },
        },
      },
    }));
  };

  const handleSave = async () => {
    const shareErrors = validateShareConfig(form);
    if (shareErrors.length) {
      toast.error(`Invalid rider share: ${shareErrors[0]}`);
      return;
    }
    const bandErrors = validateDeliveryPricing(form.deliveryPricing);
    if (bandErrors.length) {
      toast.error(`Invalid distance bands: ${bandErrors[0]}`);
      return;
    }
    if (form.deliveryPricing?.enabled === true) {
      const ok = window.confirm(
        'You are about to ACTIVATE the new production pricing model (corridor + distance bands). ' +
          'This changes live customer fares immediately. Continue?'
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const uid = getAuth().currentUser?.uid || null;
      if (!uid) {
        toast.error('You must be logged in as admin to save pricing');
        return;
      }
      await savePricingSettings(db, form, uid);
      toast.success(
        form.deliveryPricing?.enabled
          ? 'Pricing settings saved — new fares are LIVE for customers'
          : 'Pricing settings saved (production pricing still OFF)'
      );
    } catch (err) {
      console.error(err);
      const msg = err?.code === 'permission-denied'
        ? 'Permission denied. Your account needs role: admin in Firestore users/{uid}'
        : (err?.message || 'Failed to save pricing settings');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Reset form to recommended launch defaults?')) return;
    setForm(normalizePricingSettings(DEFAULT_PRICING_SETTINGS));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        Loading pricing settings…
      </div>
    );
  }

  const previewKm = 12.4;
  const preview = calculateGo7DeliveryFare(form, { distanceKm: previewKm });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Delivery Pricing</h2>
            <p className="text-sm text-gray-500 mt-1">
              Controls customer delivery fees on Book Delivery. Changes apply immediately — no deploy needed.
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              form.launchMode ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }`}
          >
            {form.launchMode ? '🚀 Launch Pricing' : '📈 Standard Pricing'}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {FIELDS.map((field) => (
            <div key={field.key} className={field.type === 'boolean' ? 'md:col-span-2' : ''}>
              {field.type === 'boolean' ? (
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={Boolean(form[field.key])}
                    onChange={(e) => updateField(field.key, e.target.checked)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm font-medium text-gray-800">{field.label}</span>
                </label>
              ) : (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input
                    type="number"
                    min="0"
                    step={field.key.includes('Km') && !field.key.includes('Per') ? '0.1' : '1'}
                    value={form[field.key]}
                    onChange={(e) => updateField(field.key, Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  {field.help && <p className="text-xs text-gray-400 mt-1">{field.help}</p>}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save pricing settings'}
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Reset to launch defaults
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Vehicle & Rider Rules</h2>
        <p className="text-sm text-gray-500 mb-6">
          Dispatch decides the vehicle automatically — the customer never selects it.
          Changes apply immediately.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">🚲 Bicycle</h3>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={Boolean(form.vehicleRules?.BICYCLE?.enabled)}
                onChange={(e) => updateVehicleRule('BICYCLE', 'enabled', e.target.checked)}
                className="w-4 h-4 text-red-600"
              />
              <span className="text-sm font-medium">Enabled</span>
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Preferred up to (km)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.vehicleRules?.BICYCLE?.preferredMaxKm ?? 8}
                  onChange={(e) => updateVehicleRule('BICYCLE', 'preferredMaxKm', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Allowed up to (km)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.vehicleRules?.BICYCLE?.allowedMaxKm ?? 8}
                  onChange={(e) => updateVehicleRule('BICYCLE', 'allowedMaxKm', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">🏍️ Motorcycle</h3>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={Boolean(form.vehicleRules?.MOTORCYCLE?.enabled)}
                onChange={(e) => updateVehicleRule('MOTORCYCLE', 'enabled', e.target.checked)}
                className="w-4 h-4 text-red-600"
              />
              <span className="text-sm font-medium">Enabled</span>
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Preferred from (km)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.vehicleRules?.MOTORCYCLE?.preferredMinKm ?? 8}
                  onChange={(e) => updateVehicleRule('MOTORCYCLE', 'preferredMinKm', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Allowed from (km)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.vehicleRules?.MOTORCYCLE?.allowedMinKm ?? 5}
                  onChange={(e) => updateVehicleRule('MOTORCYCLE', 'allowedMinKm', Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-1">Rider share — by vehicle ownership</h3>
          <p className="text-xs text-gray-500 mb-4">
            Go7-owned vehicles (Go7 pays fuel/maintenance/depreciation) keep a smaller rider share.
            Rider-owned vehicles get the larger share — the rider covers those costs.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Go7-owned bike/moto — rider (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={Math.round(shareBandShare(GO7_BAND_PRED, 0.4) * 100)}
                onChange={(e) =>
                  updateShareBand('GO7_OWNED', GO7_BAND_PRED, Number(e.target.value) / 100, {
                    share: 0.4,
                    maxKm: 999,
                    rule: 'GO7_OWNED',
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rider-owned ≤15 km (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={Math.round(shareBandShare(RIDER_STD_PRED, 0.6) * 100)}
                onChange={(e) =>
                  updateShareBand('RIDER_OWNED', RIDER_STD_PRED, Number(e.target.value) / 100, {
                    share: 0.6,
                    maxKm: 15,
                    rule: 'RIDER_OWNED_STANDARD',
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rider-owned &gt;15 km (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={Math.round(shareBandShare(RIDER_LONG_PRED, 0.65) * 100)}
                onChange={(e) =>
                  updateShareBand('RIDER_OWNED', RIDER_LONG_PRED, Number(e.target.value) / 100, {
                    share: 0.65,
                    maxKm: 999,
                    rule: 'RIDER_OWNED_LONG_DISTANCE',
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Final payout is computed when a specific rider is dispatched — the share depends on that
            rider's vehicle ownership (riders/{'{'}id{'}'}.vehicleOwnership = GO7_OWNED or RIDER_OWNED;
            missing = rider-owned).
          </p>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form.vehicleRules?.allowMotorcycleFallback)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  vehicleRules: { ...(prev.vehicleRules || {}), allowMotorcycleFallback: e.target.checked },
                }))
              }
              className="w-4 h-4 text-red-600"
            />
            <span className="text-sm font-medium">Allow motorcycle when bicycle unavailable</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-1">
          <h2 className="text-xl font-bold text-gray-900">Distance-Band Fares (new model)</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form.deliveryPricing?.enabled)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  deliveryPricing: { ...(prev.deliveryPricing || {}), enabled: e.target.checked },
                }))
              }
              className="w-4 h-4 text-red-600"
            />
            <span className="text-sm font-semibold text-gray-800">Enable new pricing in production</span>
          </label>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Per-kilometre band fares for Book Delivery and Food. While the switch is OFF, production keeps
          the legacy flat fees — these bands are saved as configuration only.
          {form.deliveryPricing?.enabled && (
            <span className="block mt-1 font-semibold text-red-600">
              ⚠️ New pricing is ON — changes go live on save.
            </span>
          )}
        </p>

        {['GENERAL_DELIVERY', 'FOOD'].map((ot) => (
          <div key={ot} className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">
                {ot === 'GENERAL_DELIVERY' ? '📦 Book Delivery bands' : '🍔 Food delivery bands'}
              </h3>
              <button
                type="button"
                onClick={() => addBand(ot)}
                className="text-xs px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                + Add band
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-200">
                    <th className="text-left py-2 pr-3 font-medium">From km</th>
                    <th className="text-left py-2 pr-3 font-medium">To km (blank = open)</th>
                    <th className="text-left py-2 pr-3 font-medium">Fee ₦</th>
                    <th className="text-left py-2 pr-3 font-medium">+₦/km beyond</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(form.deliveryPricing?.orderTypes?.[ot]?.bands || []).map((band, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1.5 pr-3">
                        <input
                          type="number" min="0" step="0.1" value={band.minKm}
                          onChange={(e) => updateBand(ot, i, 'minKm', Number(e.target.value))}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          type="number" min="0" step="0.1" value={band.maxKm ?? ''}
                          onChange={(e) => updateBand(ot, i, 'maxKm', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          type="number" min="0" step="1" value={band.fee}
                          onChange={(e) => updateBand(ot, i, 'fee', Number(e.target.value))}
                          className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          type="number" min="0" step="1" value={band.perKmBeyond ?? ''}
                          onChange={(e) => updateBand(ot, i, 'perKmBeyond', e.target.value === '' ? undefined : Number(e.target.value))}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                          placeholder="—"
                        />
                      </td>
                      <td className="py-1.5">
                        <button type="button" onClick={() => removeBand(ot, i)} className="text-xs text-red-600 hover:underline">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ot === 'GENERAL_DELIVERY' && (
              <div className="grid sm:grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Min fee (₦)</label>
                  <input
                    type="number" min="0" value={form.deliveryPricing?.orderTypes?.GENERAL_DELIVERY?.minimumFee ?? 500}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      deliveryPricing: { ...(prev.deliveryPricing || {}), orderTypes: { ...(prev.deliveryPricing?.orderTypes || {}), GENERAL_DELIVERY: { ...(prev.deliveryPricing?.orderTypes?.GENERAL_DELIVERY || {}), minimumFee: Number(e.target.value) } } },
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max trip distance (km)</label>
                  <input
                    type="number" min="0" step="1" value={form.deliveryPricing?.orderTypes?.GENERAL_DELIVERY?.maxDistanceKm ?? 40}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      deliveryPricing: { ...(prev.deliveryPricing || {}), orderTypes: { ...(prev.deliveryPricing?.orderTypes || {}), GENERAL_DELIVERY: { ...(prev.deliveryPricing?.orderTypes?.GENERAL_DELIVERY || {}), maxDistanceKm: Number(e.target.value) } } },
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Economics Assumptions</h2>
        <p className="text-sm text-gray-500 mb-6">
          Decision-support only — used to estimate operating cost and Go7 contribution per order.
          These never change customer pricing.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ['fuelPricePerLiter', 'Fuel price (₦/litre)'],
            ['motorcycleKmPerLiter', 'Motorcycle km/litre'],
            ['bicycleOperatingCostPerKm', 'Bicycle cost ₦/km'],
            ['motorcycleOperatingCostPerKm', 'Motorcycle cost ₦/km'],
            ['go7VehicleMaintenanceAllowance', 'Go7 vehicle maintenance ₦/order'],
            ['paymentProcessingCost', 'Payment processing (rate, e.g. 0.015)'],
            ['otherOperationalCost', 'Other ops cost ₦/order'],
            ['lowContributionRatio', 'Low-contribution threshold (0–1 of fee)'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                type="number" step="any" value={form.economics?.[key] ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    economics: { ...(prev.economics || {}), [key]: Number(e.target.value) },
                  }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">High-Density Corridors</h2>
        <p className="text-sm text-gray-500 mb-6">
          Flat-fare corridors on high-volume routes (e.g. Camp ↔ FUNAAB). The server verifies the
          resolved endpoints by canonical location AND coordinate proximity, and enforces the maximum
          road distance — a corridor never changes the Abeokuta service area and never bypasses
          service-area, payment, or dispatch validation. Non-corridor trips use normal distance pricing.
        </p>

        <div className="space-y-4">
          {(form.corridors || []).map((corridor, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <input
                  type="text"
                  value={corridor.name}
                  onChange={(e) => updateCorridor(i, 'name', e.target.value)}
                  className="font-semibold text-gray-800 border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[200px]"
                  placeholder="Corridor name"
                />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(corridor.enabled)}
                      onChange={(e) => updateCorridor(i, 'enabled', e.target.checked)}
                      className="w-4 h-4 text-red-600"
                    />
                    <span className="text-sm font-medium">Enabled</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeCorridor(i)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Corridor ID</label>
                  <input
                    type="text"
                    value={corridor.id}
                    onChange={(e) => updateCorridor(i, 'id', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="CAMP_FUNAAB"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Pickup areas (canonical keys, comma-separated)
                  </label>
                  <input
                    type="text"
                    value={(corridor.pickupAreas || []).map((a) => (typeof a === 'string' ? a : a.key || '')).join(', ')}
                    onChange={(e) =>
                      updateCorridor(i, 'pickupAreas', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="camp"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Dropoff areas (canonical keys, comma-separated)
                  </label>
                  <input
                    type="text"
                    value={(corridor.dropoffAreas || []).map((a) => (typeof a === 'string' ? a : a.key || '')).join(', ')}
                    onChange={(e) =>
                      updateCorridor(i, 'dropoffAreas', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="funaab"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Delivery fee (₦)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={corridor.deliveryFee}
                    onChange={(e) => updateCorridor(i, 'deliveryFee', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max road distance (km)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={corridor.maxDistanceKm}
                    onChange={(e) => updateCorridor(i, 'maxDistanceKm', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Rider share override % (blank = ownership model)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={corridor.riderShareRate == null ? '' : Math.round(corridor.riderShareRate * 100)}
                    onChange={(e) =>
                      updateCorridor(i, 'riderShareRate', e.target.value === '' ? null : Number(e.target.value) / 100)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Auto"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                  <input
                    type="number"
                    step="1"
                    value={corridor.priority ?? 0}
                    onChange={(e) => updateCorridor(i, 'priority', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Endpoint radius (km)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={corridor.radiusKm ?? 2}
                    onChange={(e) => updateCorridor(i, 'radiusKm', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Preferred vehicle</label>
                  <select
                    value={corridor.preferredVehicle || ''}
                    onChange={(e) => updateCorridor(i, 'preferredVehicle', e.target.value || null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Auto (distance policy)</option>
                    <option value="BICYCLE">Bicycle</option>
                    <option value="MOTORCYCLE">Motorcycle</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mt-3">
                {['BICYCLE', 'MOTORCYCLE', 'EBIKE'].map((v) => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(corridor.allowedVehicles || []).includes(v)}
                      onChange={(e) => corridorVehiclesToggle(i, v, e.target.checked)}
                      className="w-4 h-4 text-red-600"
                    />
                    <span className="text-sm">{v === 'EBIKE' ? 'E-bike' : v.charAt(0) + v.slice(1).toLowerCase()}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={corridor.bidirectional !== false}
                    onChange={(e) => updateCorridor(i, 'bidirectional', e.target.checked)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm">Bidirectional</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={corridor.fallbackToDistancePricing !== false}
                    onChange={(e) => updateCorridor(i, 'fallbackToDistancePricing', e.target.checked)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm">Fallback to distance pricing</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addCorridor}
          className="mt-4 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          + Add corridor
        </button>
      </div>

      <div className="bg-gradient-to-br from-gray-50 to-red-50 rounded-xl border border-red-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Preview — {previewKm} km parcel</h3>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <p>Mode: <strong>{preview.pricingMode}</strong></p>
          <p>Base fee: <strong>₦{preview.baseFee?.toLocaleString()}</strong></p>
          <p>Included: <strong>{preview.includedKm} km</strong></p>
          <p>Chargeable: <strong>{preview.chargeableKm} km</strong></p>
          <p>Distance charge: <strong>₦{preview.distanceCharge?.toLocaleString()}</strong></p>
          <p>Waiting charge: <strong>₦{preview.waitingCharge?.toLocaleString()}</strong></p>
          <p className="sm:col-span-2 text-lg font-bold text-red-700">
            Total: ₦{preview.total?.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
