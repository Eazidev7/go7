import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, Clock, Check, Plus, Utensils } from 'lucide-react';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { usePaystack } from '../hooks/usePaystack';
import {
  createMealBundle, createMealBundleFromPlan, quoteMealBundle, confirmMealBundlePayment, cancelMealBundleLeg, cancelMealBundle,
  fetchMyBundles, fetchLiveVendors, fetchVendorProducts, fetchActivePlans, fetchMealPlansEnabled, pickSavedDropoff,
} from '../services/mealBundleService';

const naira = (k) => `₦${(Number(k || 0) / 100).toLocaleString('en-NG')}`;
const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500';

const MealBundlesPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { initializePayment } = usePaystack();
  const scheduleRef = useRef(null);
  // Idempotent purchase — stable per checkout attempt so retries can't
  // double-create a payable bundle.
  const requestIdRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const [vendors, setVendors] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [cart, setCart] = useState({}); // productId -> qty
  const [dates, setDates] = useState([{ date: '', time: '' }]);
  const [dropoff, setDropoff] = useState(null);
  const [bundles, setBundles] = useState([]);
  const [paying, setPaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [showCustom, setShowCustom] = useState(false);
  const [enabled, setEnabled] = useState(true); // feature flag — hidden until rollout approved
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);

  const loadBundles = useCallback(async () => {
    if (!user) return;
    setBundles(await fetchMyBundles(user.uid).catch(() => []));
  }, [user]);

  useEffect(() => {
    (async () => {
      const [v, p, flag] = await Promise.all([
        fetchLiveVendors().catch(() => []),
        fetchActivePlans().catch(() => []),
        fetchMealPlansEnabled().catch(() => false),
      ]);
      setVendors(v);
      setPlans(flag ? p : []);
      setEnabled(flag);
      if (user) {
        const uSnap = await getDoc(doc(db, 'users', user.uid)).catch(() => null);
        if (uSnap?.exists()) setDropoff(pickSavedDropoff(uSnap.data()));
        await loadBundles();
      }
      setLoading(false);
    })();
  }, [user, loadBundles]);

  useEffect(() => {
    if (!vendor) { setProducts([]); return; }
    fetchVendorProducts(vendor.id).then(setProducts).catch(() => setProducts([]));
    if (!selectedPlan) setCart({});
  }, [vendor, selectedPlan]);

  const vendorOf = useCallback(
    (plan) => vendors.find((v) => v.id === plan.vendorId) || {},
    [vendors]
  );

  const subtotal = useMemo(
    () => products.reduce((s, p) => s + (cart[p.id] || 0) * Math.round(Number(p.priceKobo ?? (p.price * 100) ?? 0) || 0), 0),
    [products, cart]
  );

  const validLegs = useMemo(
    () => dates.filter((d) => d.date && d.time).map((d) => `${d.date}T${d.time}:00`),
    [dates]
  );

  // Slot plans: each picked day → daySlots {date, slots:[...]} (1–3 meals/day).
  const planSlotNames = selectedPlan?.slots ? Object.keys(selectedPlan.slots) : [];
  const daySlots = useMemo(
    () => planSlotNames.length
      ? dates.filter((d) => d.date && (d.slots || planSlotNames).length > 0)
          .map((d) => ({ date: d.date, slots: d.slots || planSlotNames }))
      : [],
    [dates, planSlotNames]
  );

  // Server-priced quote whenever the plan schedule changes.
  useEffect(() => {
    if (!selectedPlan || !daySlots.length || !dropoff) { setQuote(null); return; }
    let alive = true;
    setQuoting(true);
    const t = setTimeout(() => {
      quoteMealBundle({ planId: selectedPlan.id, daySlots, dropoff })
        .then((q) => alive && setQuote(q))
        .catch(() => alive && setQuote(null))
        .finally(() => alive && setQuoting(false));
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [selectedPlan, daySlots, dropoff]);

  // Slot-based plans store items under slots{breakfast,lunch,dinner}; legacy
  // plans keep a flat items[]. Flatten for display/pricing.
  const planItems = useCallback((plan) => {
    if (plan.slots && typeof plan.slots === 'object') {
      return Object.entries(plan.slots).flatMap(([slotName, slot]) =>
        (slot.items || []).map((it) => ({ ...it, slotName })));
    }
    return plan.items || [];
  }, []);

  const planItemsTotal = useCallback(
    (plan) => {
      if (plan.slots && typeof plan.slots === 'object') {
        return Object.values(plan.slots).reduce((s, slot) =>
          s + (slot.priceKobo != null
            ? slot.priceKobo
            : (slot.items || []).reduce((x, it) => x + (it.quantity || 1) * (it.priceKobo || 0), 0)), 0);
      }
      return (plan.items || []).reduce((s, it) => s + (it.quantity || 1) * (it.priceKobo || 0), 0);
    },
    []
  );

  const SLOT_LABEL = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };

  const pickPlan = (plan) => {
    if (selectedPlan?.id === plan.id) { setSelectedPlan(null); return; }
    setSelectedPlan(plan);
    const v = vendors.find((x) => x.id === plan.vendorId);
    if (v) setVendor(v);
    setCart({});
    setTimeout(() => scheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const checkout = async () => {
    if (!user) { toast.error('Sign in first'); return; }
    if (selectedPlan ? !daySlots.length : (!vendor || !validLegs.length || subtotal <= 0)) { toast.error('Pick a plan or items, and dates'); return; }
    if (!dropoff) { toast.error('Add a delivery address in your profile first'); return; }
    setPaying(true);
    try {
      let res;
      if (selectedPlan) {
        res = await createMealBundleFromPlan({ planId: selectedPlan.id, daySlots, dropoff, clientRequestId: requestIdRef.current });
      } else {
        const items = Object.entries(cart).filter(([, q]) => q > 0).map(([productId, quantity]) => ({ productId, quantity }));
        const legs = validLegs.map((scheduledFor) => ({ vendorId: vendor.id, items, scheduledFor, dropoff }));
        res = await createMealBundle({ legs, clientRequestId: requestIdRef.current });
      }
      requestIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await initializePayment({
        amount: res.totalKobo / 100,
        email: user.email || `${user.uid}@go7.ng`,
        userId: user.uid,
        purpose: 'order_payment',
        orderId: res.bundleId,
        orderCollection: 'mealBundles',
        skipFirestoreUpdate: true,
        onSuccess: async (ref) => {
          try {
            await confirmMealBundlePayment({ bundleId: res.bundleId, reference: ref.reference || ref });
            toast.success('CheapChop paid — deliveries scheduled!');
            setCart({}); setDates([{ date: '', time: '' }]); setSelectedPlan(null);
            await loadBundles();
          } catch (e) {
            toast.error('Paid — confirming shortly, pull to refresh');
          } finally { setPaying(false); }
        },
        onError: () => { toast.error('Payment failed'); setPaying(false); },
        onClose: () => setPaying(false),
      });
    } catch (e) {
      toast.error(e?.message?.replace(/^Firebase.*?:\s*/i, '') || 'Could not create bundle');
      setPaying(false);
    }
  };

  const cancelLeg = async (bundleId, legIndex) => {
    setCancelling(`${bundleId}:${legIndex}`);
    try {
      const res = await cancelMealBundleLeg({ bundleId, legIndex });
      toast.success(res.refundedKobo ? `Delivery cancelled — ${naira(res.refundedKobo)} refunded` : 'Delivery cancelled');
      await loadBundles();
    } catch (e) {
      toast.error(e?.message?.replace(/^Firebase.*?:\s*/i, '') || 'Cancel failed');
    } finally {
      setCancelling(null);
    }
  };

  const cancelWhole = async (bundleId) => {
    if (!window.confirm('Cancel all remaining deliveries and refund to your wallet?')) return;
    setCancelling(bundleId);
    try {
      const res = await cancelMealBundle({ bundleId });
      toast.success(res.refundedKobo ? `Plan cancelled — ${naira(res.refundedKobo)} refunded` : 'Plan cancelled');
      await loadBundles();
    } catch (e) {
      toast.error(e?.message?.replace(/^Firebase.*?:\s*/i, '') || 'Cancel failed');
    } finally {
      setCancelling(null);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Utensils className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold mb-2">GO7 CheapChop</h1>
          <p className="text-gray-500 text-sm mb-6">Sign in to order full-day food once — eat on schedule.</p>
          <button onClick={() => navigate('/login')} className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold">Log In</button>
        </div>
      </div>
    );
  }

  const STATUS_BADGE = { paid: 'bg-green-100 text-green-700', pending_payment: 'bg-yellow-100 text-yellow-700', cancelled: 'bg-red-100 text-red-700', partially_cancelled: 'bg-amber-100 text-amber-700' };

  // Feature-flag gate — hidden until rollout is approved.
  if (!enabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Utensils className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold mb-2">GO7 CheapChop</h1>
          <p className="text-gray-500 text-sm mb-6">Scheduled meal plans are coming soon — order once, eat on schedule.</p>
          <button onClick={() => navigate('/')} className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header — combo-rush style */}
      <div className="bg-white px-4 pt-4 pb-3 shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 mb-2">← Back</button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl text-gray-900">GO7 CheapChop</h1>
              <p className="text-xs text-gray-500">Order full-day food once — with ease 🍱</p>
            </div>
          </div>
        </div>
      </div>

      {/* CheapChop plans carousel — combo-rush card style */}
      {plans.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3 px-4">
            <h3 className="text-base font-semibold text-gray-900">CheapChop Plans</h3>
            <span className="text-xs text-gray-400 flex items-center gap-1">swipe <ChevronRight className="w-3 h-3" /></span>
          </div>
          <div className="overflow-x-auto scrollbar-hide -mx-0 px-4" style={{ scrollbarWidth: 'none' }}>
            <div className="flex gap-4 pb-2" style={{ minWidth: 'min-content' }}>
              {plans.map((plan) => {
                const v = vendorOf(plan);
                const itemsTotal = planItemsTotal(plan);
                const isSelected = selectedPlan?.id === plan.id;
                const saves = plan.priceKobo != null && itemsTotal > plan.priceKobo ? itemsTotal - plan.priceKobo : 0;
                const img = plan.imageUrl || v.profileImage || v.businessLogo || v.imageUrl;
                const savePct = itemsTotal > 0 && saves > 0 ? Math.round((saves / itemsTotal) * 100) : 0;
                return (
                  <div key={plan.id} onClick={() => pickPlan(plan)}
                    className={`flex-shrink-0 w-48 bg-white rounded-2xl overflow-hidden shadow-lg border transition-all cursor-pointer ${isSelected ? 'border-amber-500 ring-2 ring-amber-400' : 'border-gray-100 hover:shadow-xl'}`}>
                    {/* Image section */}
                    <div className="relative h-28 bg-gradient-to-br from-amber-100 to-orange-100">
                      {img ? (
                        <img src={img} alt={plan.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Utensils className="w-9 h-9 text-amber-300" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <div className="absolute top-2 left-2 bg-amber-500 text-white px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                        <CalendarDays className="w-3 h-3" />
                        <span className="text-[10px]">Scheduled</span>
                      </div>
                      {savePct > 0 && (
                        <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-rose-600 text-white px-2 py-1 rounded-lg shadow-lg">
                          <span className="text-[10px]">Save {savePct}%</span>
                        </div>
                      )}
                      {(v.profileImage || v.businessLogo) && (
                        <div className="absolute bottom-2 left-2 w-9 h-9 bg-white rounded-lg shadow-lg overflow-hidden border-2 border-white">
                          <img src={v.profileImage || v.businessLogo} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div className="p-2.5">
                      <span className="text-[10px] text-gray-500">{v.businessName || v.name || 'Vendor'}</span>
                      <h4 className="text-xs font-medium text-gray-900 truncate">{plan.name}</h4>
                      <div className="space-y-0.5 mt-1 mb-1.5">
                        {planItems(plan).slice(0, 3).map((it, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                            <div className="w-1 h-1 bg-amber-500 rounded-full flex-shrink-0" />
                            <span className="truncate">{it.slotName ? `${SLOT_LABEL[it.slotName] || ''} ` : ''}{it.quantity || 1}× {it.name || 'item'}</span>
                          </div>
                        ))}
                        {planItems(plan).length > 3 && (
                          <div className="text-[10px] text-amber-600 ml-2.5">+{planItems(plan).length - 3} more</div>
                        )}
                      </div>
                      <div className="flex items-end justify-between pt-1.5 border-t border-gray-100">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-gray-900">{naira(plan.priceKobo ?? itemsTotal)}</span>
                            {saves > 0 && <span className="text-[10px] text-gray-400 line-through">{naira(itemsTotal)}</span>}
                          </div>
                        </div>
                        <button className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all shadow ${isSelected
                          ? 'bg-green-500 text-white'
                          : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg'}`}>
                          {isSelected ? <span className="flex items-center gap-1"><Check className="w-2.5 h-2.5" />Picked</span>
                            : <span className="flex items-center gap-1"><Plus className="w-2.5 h-2.5" />Pick</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Build your own — collapsed until tapped */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <button onClick={() => setShowCustom((s) => !s)} className="w-full flex items-center justify-between">
            <h3 className="font-semibold text-sm">🛠️ {selectedPlan ? 'Using a plan — or build custom' : 'Build your own'}</h3>
            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showCustom ? 'rotate-90' : ''}`} />
          </button>
          {showCustom && !selectedPlan && (
            <>
          <select className={`${inputCls} mt-3`} value={vendor?.id || ''}
            onChange={(e) => { setVendor(vendors.find((v) => v.id === e.target.value) || null); }}>
            <option value="">Choose vendor…</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.businessName || v.name}</option>)}
          </select>
          {vendor && (
            <div className="mt-3 space-y-2">
              {products.map((p) => {
                const price = Math.round(Number(p.priceKobo ?? (p.price * 100) ?? 0) || 0);
                const qty = cart[p.id] || 0;
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{naira(price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCart((c) => ({ ...c, [p.id]: Math.max(0, qty - 1) }))} className="w-7 h-7 rounded-full bg-gray-100 text-sm font-bold">−</button>
                      <span className="w-5 text-center text-sm">{qty}</span>
                      <button onClick={() => setCart((c) => ({ ...c, [p.id]: qty + 1 }))} className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-sm font-bold">+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
            </>
          )}
          {showCustom && selectedPlan && (
            <button onClick={() => setSelectedPlan(null)} className="mt-2 text-xs font-semibold text-amber-600">Switch to custom items →</button>
          )}
        </div>

        {/* Schedule */}
        {(subtotal > 0 || selectedPlan) && (
          <div ref={scheduleRef} className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" /> Schedule delivery days
            </h3>
            {selectedPlan && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-2">
                {selectedPlan.name} — {planItems(selectedPlan).map((it) => `${it.slotName ? `${SLOT_LABEL[it.slotName] || ''} ` : ''}${it.quantity || 1}× ${it.name}`).join(' · ')}
              </p>
            )}
            <div className="space-y-2">
              {dates.map((d, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1.5">
                    <input type="date" className={inputCls} value={d.date} min={new Date(Date.now() + 3600000).toISOString().slice(0, 10)}
                      onChange={(e) => setDates((ds) => ds.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} />
                    {planSlotNames.length ? (
                      // Slot plan — pick 1–3 meals for this day; the plan's delivery
                      // window sets each delivery's time (displayed below).
                      <div className="flex flex-wrap gap-1.5">
                        {planSlotNames.map((s) => {
                          const chosen = (d.slots || planSlotNames).includes(s);
                          const win = selectedPlan.slots[s]?.deliveryWindow;
                          return (
                            <button key={s} type="button"
                              onClick={() => setDates((ds) => ds.map((x, j) => {
                                const cur = x.slots || planSlotNames;
                                const next = chosen ? cur.filter((v) => v !== s) : [...cur, s];
                                return j === i ? { ...x, slots: next } : x;
                              }))}
                              className={`px-2 py-1 rounded-lg text-[11px] font-medium border ${chosen ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-500 border-gray-300'}`}>
                              {{ breakfast: '🌅 Breakfast', lunch: '☀️ Lunch', dinner: '🌙 Dinner' }[s] || s}{win ? ` ${win.split('-')[0]}` : ''}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <input type="time" className={inputCls} value={d.time}
                        onChange={(e) => setDates((ds) => ds.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} />
                    )}
                  </div>
                  {dates.length > 1 && (
                    <button onClick={() => setDates((ds) => ds.filter((_, j) => j !== i))} className="text-red-500 text-lg mt-2">×</button>
                  )}
                </div>
              ))}
            </div>
            {planSlotNames.length > 0 && (
              <p className="text-[11px] text-gray-400 mt-2">Each meal is a <b>separate delivery</b> — separate riders may handle each one.</p>
            )}
            {dates.length < 14 && (
              <button onClick={() => setDates((ds) => [...ds, { date: '', time: '' }])}
                className="mt-2 text-xs font-semibold text-amber-600">+ Add another day</button>
            )}
          </div>
        )}

        {/* Delivery address */}
        {(subtotal > 0 || selectedPlan) && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-sm mb-1">📍 Delivery address</h3>
            {dropoff ? (
              <p className="text-sm text-gray-600">{dropoff.address || 'Saved address'}<span className="text-xs text-gray-400"> — all deliveries go here</span></p>
            ) : (
              <p className="text-xs text-amber-600">⚠️ No saved address — add one in your profile before paying.</p>
            )}
          </div>
        )}

        {/* Price breakdown — server-quoted, real totals before payment */}
        {(subtotal > 0 || selectedPlan) && (validLegs.length > 0 || daySlots.length > 0) && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-sm mb-2">Total</h3>
            {selectedPlan && (
              quoting ? <p className="text-xs text-gray-400">Pricing…</p> :
              quote ? (
                <div className="space-y-1.5 text-sm mb-3">
                  <div className="flex justify-between"><span className="text-gray-500">Food ({quote.legCount} meal{quote.legCount !== 1 ? 's' : ''})</span><span>{naira(quote.foodKobo)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Deliveries ({quote.legCount} separate)</span><span>{naira(quote.deliveryKobo)}</span></div>
                  {quote.platformFeeKobo > 0 && <div className="flex justify-between"><span className="text-gray-500">Service fee</span><span>{naira(quote.platformFeeKobo)}</span></div>}
                  {quote.discountKobo > 0 && <div className="flex justify-between text-green-600"><span>Package discount</span><span>−{naira(quote.discountKobo)}</span></div>}
                  <div className="border-t pt-1.5 flex justify-between font-semibold"><span>Total</span><span>{naira(quote.totalKobo)}</span></div>
                  <div className="mt-2 space-y-0.5">
                    {quote.legs.map((l, i) => (
                      <p key={i} className="text-[11px] text-gray-500">
                        {l.slot ? { breakfast: '🌅', lunch: '☀️', dinner: '🌙' }[l.slot] + ' ' : ''}{new Date(l.scheduledFor).toLocaleDateString()} {new Date(l.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — delivered separately
                      </p>
                    ))}
                  </div>
                </div>
              ) : <p className="text-xs text-amber-600 mb-3">Pick valid dates to see the total.</p>
            )}
            {!selectedPlan && (
              <div className="flex justify-between text-sm mb-3">
                <span>Your items × {validLegs.length} day{validLegs.length > 1 ? 's' : ''}</span>
                <span className="font-semibold">{naira(subtotal)} × {validLegs.length} + delivery</span>
              </div>
            )}
            <button onClick={checkout} disabled={paying || (selectedPlan && !quote)}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50">
              {paying ? 'Processing…' : selectedPlan ? `Pay ${quote ? naira(quote.totalKobo) : ''} — ${daySlots.reduce((s, d) => s + d.slots.length, 0)} deliveries` : `Pay for ${validLegs.length}-day plan`}
            </button>
          </div>
        )}

        {/* My plans */}
        {bundles.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-sm mb-2">My CheapChop Plans</h3>
            <div className="space-y-2">
              {bundles.map((b) => (
                <div key={b.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">{b.planName || `${b.legCount || (b.legs || []).length}-day plan`} · {naira(b.totalKobo)}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[b.status] || 'bg-gray-100'}`}>{b.status}</span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {(b.legs || []).map((l, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {new Date(l.scheduledFor).toLocaleDateString()} {new Date(l.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {l.vendorName} ·
                          <span className={l.status === 'dispatched' ? ' text-green-600 font-medium' : (l.status === 'cancelled' ? ' text-red-500' : '')}> {l.status}</span>
                        </p>
                        {l.status === 'scheduled' && (b.status === 'paid' || b.status === 'partially_cancelled') && (
                          <button onClick={() => cancelLeg(b.id, i)} disabled={cancelling === `${b.id}:${i}`}
                            className="text-[10px] font-semibold text-red-500 hover:underline disabled:opacity-50">
                            {cancelling === `${b.id}:${i}` ? '…' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {(b.legs || []).some((l) => l.status === 'scheduled') && b.status === 'paid' && (
                    <button onClick={() => cancelWhole(b.id)} disabled={cancelling === b.id}
                      className="mt-2 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50">
                      {cancelling === b.id ? 'Cancelling…' : 'Cancel entire plan (refund all)'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MealBundlesPage;
