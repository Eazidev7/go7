import React, { useEffect, useMemo, useState } from 'react';
import { getAuth } from 'firebase/auth';
import toast from 'react-hot-toast';
import { db } from '../../config/firebase';
import {
  DEFAULT_BILLS_PRICING,
  normalizePricing,
  subscribeBillsPricing,
  saveBillsPricing,
  applyDataMarkup,
  airtimeSellPrice,
} from '../../utils/billsPricing';

const FIELDS = [
  { key: 'airtimeMarkupFlat', label: 'Airtime markup flat (₦)', help: 'Added on top of face value. Keep 0 to match OPay-style face airtime.' },
  { key: 'airtimeMarkupPercent', label: 'Airtime markup %', help: 'Percent of face value. Usually 0.' },
  { key: 'airtimeCashbackNaira', label: 'Airtime cashback (₦)', help: 'Flat wallet credit after successful airtime. SME ~₦98/₦100 → keep 1 if cashback is 1.' },
  { key: 'dataMarkupPercent', label: 'Data markup % (everyday)', help: 'Everyday data plans (e.g. 12).' },
  { key: 'heroDataMarkupPercent', label: 'Data markup % (hero / awoof deals)', help: 'Lower markup for hero plan IDs (e.g. 10).' },
  { key: 'dataMarkupFlat', label: 'Data markup flat (₦)', help: 'Extra flat fee on every data sale.' },
  { key: 'minMarginNaira', label: 'Minimum margin (₦)', help: 'Never sell data below cost + this amount.' },
  { key: 'roundTo', label: 'Round sell price to nearest ₦', help: 'e.g. 5 → prices end in 0 or 5.' },
];

export default function BillsPricingPanel() {
  const [form, setForm] = useState({ ...DEFAULT_BILLS_PRICING, heroPlanIdsText: DEFAULT_BILLS_PRICING.heroPlanIds.join(', ') });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeBillsPricing(db, (settings) => {
      setForm({
        ...settings,
        heroPlanIdsText: (settings.heroPlanIds || []).join(', '),
      });
      setLoading(false);
    });
    return unsub;
  }, []);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const parsedHeroIds = useMemo(() => {
    return String(form.heroPlanIdsText || '')
      .split(/[,\s]+/)
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);
  }, [form.heroPlanIdsText]);

  const previewPricing = useMemo(
    () => normalizePricing({ ...form, heroPlanIds: parsedHeroIds }),
    [form, parsedHeroIds]
  );

  const airtimePreview = airtimeSellPrice(100, previewPricing);
  const dataPreview = applyDataMarkup(240, 21, previewPricing);
  const heroPreview = applyDataMarkup(375, 2, previewPricing);

  const handleSave = async () => {
    setSaving(true);
    try {
      const uid = getAuth().currentUser?.uid || null;
      if (!uid) {
        toast.error('You must be logged in as admin to save bill pricing');
        return;
      }
      await saveBillsPricing(
        db,
        {
          ...form,
          heroPlanIds: parsedHeroIds,
        },
        uid
      );
      toast.success('Bill pricing saved to Firestore — Bills page + purchases update immediately');
    } catch (err) {
      console.error(err);
      const msg = err?.code === 'permission-denied'
        ? 'Permission denied. Your account needs role: admin in Firestore users/{uid}'
        : (err?.message || 'Failed to save bill pricing');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Reset form to recommended bills defaults?')) return;
    const defaults = normalizePricing(DEFAULT_BILLS_PRICING);
    setForm({
      ...defaults,
      heroPlanIdsText: defaults.heroPlanIds.join(', '),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        Loading bill pricing…
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Airtime & Data Pricing</h2>
          <p className="text-sm text-gray-500 mt-1">
            Writes to <code className="text-xs bg-gray-100 px-1 rounded">pricingSettings/bills</code>.
            Customer Bills page and Cloud Functions read this live — no redeploy needed.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-50 text-red-700">
          Firestore live
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {FIELDS.map((field) => (
          <label key={field.key} className="block text-sm">
            <span className="font-medium text-gray-800">{field.label}</span>
            <input
              type="number"
              step="any"
              value={form[field.key]}
              onChange={(e) => updateField(field.key, e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            {field.help && <span className="text-xs text-gray-500 mt-1 block">{field.help}</span>}
          </label>
        ))}

        <label className="block text-sm md:col-span-2">
          <span className="font-medium text-gray-800">Hero plan IDs (comma-separated SME plan ids)</span>
          <input
            type="text"
            value={form.heroPlanIdsText}
            onChange={(e) => updateField('heroPlanIdsText', e.target.value)}
            placeholder="2, 6, 3, 31, 32"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
          />
          <span className="text-xs text-gray-500 mt-1 block">
            These plans use the lower hero markup %. Parsed: {parsedHeroIds.join(', ') || 'none'}
          </span>
        </label>

        <label className="block text-sm md:col-span-2">
          <span className="font-medium text-gray-800">Admin notes</span>
          <textarea
            value={form.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            rows={2}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </label>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-semibold text-gray-800 mb-2">Live preview (from form values)</p>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>₦100 airtime → customer pays <strong>₦{airtimePreview}</strong></li>
          <li>Data cost ₦240 (plan 21) → sell <strong>₦{dataPreview.sellPrice}</strong> (margin ₦{dataPreview.margin})</li>
          <li>Hero cost ₦375 (plan 2) → sell <strong>₦{heroPreview.sellPrice}</strong> {heroPreview.isHero ? '(hero rate)' : ''}</li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save bill pricing to Firestore'}
        </button>
        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Reset form to defaults
        </button>
      </div>
    </div>
  );
}
