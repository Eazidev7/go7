import React, { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { db } from '../../firebase/config';

const fn = (n) => httpsCallable(getFunctions(undefined, 'us-central1'), n);
const naira = (k) => `₦${(Number(k || 0) / 100).toLocaleString('en-NG')}`;
const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500';
const SLOT_LABEL = { breakfast: '🌅 Breakfast', lunch: '☀️ Lunch', dinner: '🌙 Dinner' };
const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SLOT_PRESETS = { breakfast: '07:00-09:00', lunch: '11:30-14:00', dinner: '17:00-20:00' };

const emptyForm = () => ({
  name: '', description: '', imageUrl: '',
  days: [1, 2, 3, 4, 5],
  slots: {
    breakfast: { enabled: false, items: {}, price: '', window: SLOT_PRESETS.breakfast },
    lunch: { enabled: false, items: {}, price: '', window: SLOT_PRESETS.lunch },
    dinner: { enabled: false, items: {}, price: '', window: SLOT_PRESETS.dinner },
  },
  discountPct: '', maxOrdersPerDay: '', orderCutoffMins: 120, prepTimeMins: 60,
});

const formFromPlan = (p) => {
  const f = emptyForm();
  f.name = p.name || ''; f.description = p.description || ''; f.imageUrl = p.imageUrl || '';
  f.days = p.days || [];
  f.discountPct = p.packageDiscountBps ? String(p.packageDiscountBps / 100) : '';
  f.maxOrdersPerDay = p.maxOrdersPerDay ? String(p.maxOrdersPerDay) : '';
  f.orderCutoffMins = p.orderCutoffMins || 120;
  f.prepTimeMins = p.prepTimeMins || 60;
  for (const s of Object.keys(SLOT_LABEL)) {
    const slot = p.slots && p.slots[s];
    if (slot) {
      f.slots[s] = {
        enabled: true,
        items: Object.fromEntries((slot.items || []).map((i) => [i.productId, i.quantity])),
        price: slot.priceKobo != null ? String(slot.priceKobo / 100) : '',
        window: slot.deliveryWindow || SLOT_PRESETS[s],
      };
    }
    // legacy flat items → treat as lunch
    else if (s === 'lunch' && Array.isArray(p.items) && p.items.length) {
      f.slots.lunch = {
        enabled: true,
        items: Object.fromEntries(p.items.map((i) => [i.productId, i.quantity])),
        price: p.priceKobo != null ? String(p.priceKobo / 100) : '',
        window: SLOT_PRESETS.lunch,
      };
    }
  }
  return f;
};

/**
 * Scheduled Meal Plans — vendor creates/edits/pauses sellable meal plans with
 * breakfast/lunch/dinner slots. All saves go through the upsertMealPlan
 * callable (server validates ownership, menu items, slots, prices).
 */
const VendorMealPlans = ({ vendorId }) => {
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!vendorId) return;
    const [pSnap, prodSnap] = await Promise.all([
      getDocs(query(collection(db, 'mealPlanProducts'), where('vendorId', '==', vendorId))),
      getDocs(collection(db, 'vendors', vendorId, 'products')),
    ]);
    setPlans(pSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setProducts(prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => p.available !== false && p.inStock !== false));
  }, [vendorId]);

  useEffect(() => { load(); }, [load]);

  const setSlot = (s, patch) =>
    setForm((f) => ({ ...f, slots: { ...f.slots, [s]: { ...f.slots[s], ...patch } } }));

  const save = async () => {
    const slots = {};
    for (const s of Object.keys(SLOT_LABEL)) {
      const slot = form.slots[s];
      if (!slot.enabled) continue;
      const items = Object.entries(slot.items).filter(([, q]) => q > 0)
        .map(([productId, quantity]) => ({ productId, quantity }));
      slots[s] = {
        items,
        priceKobo: slot.price !== '' ? Math.round(Number(slot.price) * 100) : null,
        deliveryWindow: slot.window,
      };
    }
    setSaving(true);
    try {
      await fn('upsertMealPlan')({
        planId: editId || undefined,
        name: form.name, description: form.description, imageUrl: form.imageUrl,
        days: form.days, slots,
        packageDiscountBps: form.discountPct !== '' ? Math.round(Number(form.discountPct) * 100) : 0,
        maxOrdersPerDay: form.maxOrdersPerDay !== '' ? Math.round(Number(form.maxOrdersPerDay)) : null,
        orderCutoffMins: Math.round(Number(form.orderCutoffMins)) || 120,
        prepTimeMins: Math.round(Number(form.prepTimeMins)) || 60,
      });
      toast.success(editId ? 'Plan updated' : 'Meal plan created');
      setForm(emptyForm()); setEditId(null); setShowForm(false);
      await load();
    } catch (e) {
      toast.error(e?.message?.replace(/^Firebase.*?:\s*/i, '') || 'Could not save plan');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (plan) => {
    try {
      await fn('upsertMealPlan')({ planId: plan.id, name: plan.name, days: plan.days || [1, 2, 3, 4, 5],
        slots: plan.slots || { lunch: { items: plan.items || [], deliveryWindow: SLOT_PRESETS.lunch } },
        active: plan.active === false });
      await load();
    } catch (e) { toast.error('Update failed'); }
  };

  const edit = (plan) => {
    setForm(formFromPlan(plan)); setEditId(plan.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">📅 Scheduled Meal Plans</h3>
          <p className="text-xs text-gray-400">Sell breakfast/lunch/dinner plans customers subscribe to on GO7 CheapChop</p>
        </div>
        <button onClick={() => { setShowForm((s) => !s); if (showForm) { setEditId(null); setForm(emptyForm()); } }}
          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700">
          {showForm ? 'Cancel' : '+ Create Meal Plan'}
        </button>
      </div>

      {showForm && (
        <div className="border border-gray-200 rounded-lg p-3 mb-3 space-y-3 bg-gray-50">
          <input className={inputCls} placeholder="Plan name (e.g. Weekday Office Lunch)" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <input className={inputCls} placeholder="Description (optional)" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <input className={inputCls} placeholder="Cover image URL (optional — defaults to first item's photo)" value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} />

          {/* Available days */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Available days</p>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABEL.map((d, i) => (
                <button key={i} type="button"
                  onClick={() => setForm((f) => ({ ...f, days: f.days.includes(i) ? f.days.filter((x) => x !== i) : [...f.days, i] }))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${form.days.includes(i) ? 'bg-red-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Meal slots */}
          {Object.keys(SLOT_LABEL).map((s) => {
            const slot = form.slots[s];
            return (
              <div key={s} className="bg-white border border-gray-200 rounded-lg p-2.5">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={slot.enabled} onChange={(e) => setSlot(s, { enabled: e.target.checked })} className="w-4 h-4 accent-red-600" />
                  {SLOT_LABEL[s]}
                </label>
                {slot.enabled && (
                  <div className="mt-2 space-y-2">
                    <div className="max-h-32 overflow-y-auto space-y-1 bg-gray-50 rounded-lg p-2">
                      {products.map((p) => {
                        const qty = slot.items[p.id] || 0;
                        return (
                          <div key={p.id} className="flex items-center justify-between text-xs">
                            <span className="truncate flex-1">{p.name} <span className="text-gray-400">{naira(Number(p.priceKobo ?? p.price * 100 ?? 0))}</span></span>
                            <div className="flex items-center gap-1.5 ml-2">
                              <button type="button" onClick={() => setSlot(s, { items: { ...slot.items, [p.id]: Math.max(0, qty - 1) } })} className="w-5 h-5 rounded-full bg-gray-100 text-xs font-bold">−</button>
                              <span className="w-4 text-center">{qty}</span>
                              <button type="button" onClick={() => setSlot(s, { items: { ...slot.items, [p.id]: qty + 1 } })} className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold">+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" className={inputCls} placeholder="Slot price ₦ (blank = item sum)" value={slot.price}
                        onChange={(e) => setSlot(s, { price: e.target.value })} />
                      <input className={inputCls} placeholder="Delivery window HH:MM-HH:MM" value={slot.window}
                        onChange={(e) => setSlot(s, { window: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Limits */}
          <div className="grid grid-cols-2 gap-2">
            <input type="number" className={inputCls} placeholder="Package discount % (optional)" value={form.discountPct}
              onChange={(e) => setForm((f) => ({ ...f, discountPct: e.target.value }))} />
            <input type="number" className={inputCls} placeholder="Max orders/day (optional)" value={form.maxOrdersPerDay}
              onChange={(e) => setForm((f) => ({ ...f, maxOrdersPerDay: e.target.value }))} />
            <input type="number" className={inputCls} placeholder="Order cutoff (mins before)" value={form.orderCutoffMins}
              onChange={(e) => setForm((f) => ({ ...f, orderCutoffMins: e.target.value }))} />
            <input type="number" className={inputCls} placeholder="Prep time (mins)" value={form.prepTimeMins}
              onChange={(e) => setForm((f) => ({ ...f, prepTimeMins: e.target.value }))} />
          </div>

          <button onClick={save} disabled={saving}
            className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
            {saving ? 'Saving…' : editId ? 'Save changes' : 'Create Plan'}
          </button>
        </div>
      )}

      {/* Plan list */}
      <div className="space-y-2">
        {plans.length === 0 && !showForm && (
          <p className="text-xs text-gray-400">No meal plans yet — create one and customers can subscribe.</p>
        )}
        {plans.map((p) => {
          const slotCount = p.slots ? Object.keys(p.slots).length : 0;
          return (
            <div key={p.id} className="border border-gray-100 rounded-lg p-2.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">
                    {slotCount > 0
                      ? Object.entries(p.slots).map(([s, sl]) => `${SLOT_LABEL[s] || s} ${sl.deliveryWindow || ''}`).join(' · ')
                      : `${(p.items || []).length} items${p.priceKobo != null ? ` · ${naira(p.priceKobo)}/delivery` : ''}`}
                    {p.days ? ` · ${p.days.map((d) => DAY_LABEL[d]).join(' ')}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <button onClick={() => edit(p)} className="text-xs font-semibold px-2 py-1 rounded-lg bg-gray-100 text-gray-600">Edit</button>
                  <button onClick={() => toggle(p)}
                    className={`text-xs font-semibold px-2 py-1 rounded-lg ${p.active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.active !== false ? 'Active' : 'Paused'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VendorMealPlans;
