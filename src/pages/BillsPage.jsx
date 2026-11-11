import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, Smartphone, Wifi, Wallet } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import { auth, db, functions } from '../firebase/config';
import { subscribeToUnifiedWalletBalance } from '../utils/walletBalance';
import {
  DEFAULT_BILLS_PRICING,
  applyDataMarkup,
  airtimeSellPrice,
  normalizePricing,
} from '../utils/billsPricing';

const NETWORKS = ['MTN', 'AIRTEL', 'GLO', '9MOBILE'];
const QUICK_AIRTIME_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];
const DATA_PLANS_URL = 'https://smeapi.com.ng/api/dataplans/';
/** SME still lists these Airtel IDs but rejects purchase ("Data Plan ID is invalid"). */
const BLOCKED_DATA_PLAN_IDS = new Set([
  73, // AIRTEL 1GB SME 1day social
  76, // AIRTEL 1.5GB SME 1day
  77, // AIRTEL 1.5GB Gifting 7days social
]);

function formatNaira(n) {
  return `₦${Number(n || 0).toLocaleString('en-NG')}`;
}

function callableErrorMessage(err, fallback) {
  const raw =
    err?.details ||
    err?.message ||
    (typeof err === 'string' ? err : null) ||
    fallback;
  const text = String(raw || '').replace(/^Firebase:\s*/i, '').replace(/\s*\([^)]*\)\.?\s*$/, '');
  if (/insufficient balance/i.test(text) && /fund your wallet/i.test(text)) {
    return 'Data provider is temporarily out of stock. Your GO7 wallet was refunded — please try again shortly.';
  }
  if (/insufficient balance/i.test(text) && !/Available:/i.test(text)) {
    return 'Data provider could not complete this purchase. Your GO7 wallet was refunded.';
  }
  return text || fallback;
}

/**
 * Transport-level errors (timeout/internal/unavailable) mean the request may
 * still be running server-side — the debit+refund are atomic there. Don't
 * show a hard "failed" for these; tell the user it's processing instead.
 */
function isAmbiguousBillError(err) {
  const code = String(err?.code || '').toLowerCase();
  if (['internal', 'deadline-exceeded', 'unavailable', 'unknown', 'unauthenticated'].includes(code)) return true;
  const msg = String(err?.message || '').toLowerCase();
  return /timeout|timed out|network|internal/.test(msg) && !/wallet was refunded|refunded to your wallet|insufficient/i.test(msg);
}

function isAwoofPlan(plan) {
  return /awoof/i.test(String(plan?.name || ''));
}

/** Clean SME names like "1GB (awoof)" / "1GB awoof)" → "1GB" for display. */
function awoofSizeLabel(plan) {
  const raw = String(plan?.name || '').trim();
  const cleaned = raw
    .replace(/\s*\(?\s*awoof\)?\s*/gi, ' ')
    .replace(/[()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || raw;
}

export default function BillsPage({ onBack }) {
  const navigate = useNavigate();
  const handleBack = () => {
    if (typeof onBack === 'function') onBack();
    else navigate(-1);
  };

  const [uid, setUid] = useState(() => auth?.currentUser?.uid || null);
  const [tab, setTab] = useState('airtime'); // 'airtime' | 'data'
  const [walletBalance, setWalletBalance] = useState(0);
  const [network, setNetwork] = useState('MTN');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pricing, setPricing] = useState(() => normalizePricing(DEFAULT_BILLS_PRICING));

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
    });
  }, []);

  useEffect(() => {
    if (!uid) {
      setWalletBalance(0);
      return undefined;
    }
    return subscribeToUnifiedWalletBalance(uid, setWalletBalance);
  }, [uid]);

  useEffect(() => {
    if (!db) {
      setPricing(normalizePricing(DEFAULT_BILLS_PRICING));
      return undefined;
    }
    try {
      return onSnapshot(
        doc(db, 'pricingSettings', 'bills'),
        (snap) => {
          setPricing(normalizePricing(snap.exists() ? snap.data() : DEFAULT_BILLS_PRICING));
        },
        () => {
          setPricing(normalizePricing(DEFAULT_BILLS_PRICING));
        }
      );
    } catch {
      setPricing(normalizePricing(DEFAULT_BILLS_PRICING));
      return undefined;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPlansLoading(true);
    fetch(DATA_PLANS_URL)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setPlans(Array.isArray(json?.data) ? json.data : []);
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const availableNetworks = useMemo(() => {
    if (plansLoading) return NETWORKS;
    return NETWORKS.filter((name) => plans.some((plan) => (
      String(plan.network || plan.network_name || '').toUpperCase() === name
    )));
  }, [plans, plansLoading]);

  const networkPlans = useMemo(() => {
    const list = plans
      .filter((p) => String(p.network || p.network_name || '').toUpperCase() === network)
      .filter((p) => !BLOCKED_DATA_PLAN_IDS.has(Number(p.id)))
      .map((p) => {
        const priced = applyDataMarkup(p.price || p.user_price, p.id, pricing);
        const awoof = isAwoofPlan(p);
        return {
          ...p,
          sellPrice: priced.sellPrice,
          isHero: priced.isHero || awoof,
          margin: priced.margin,
          isAwoof: awoof,
          displayName: awoof ? awoofSizeLabel(p) : p.name,
        };
      });
    list.sort((a, b) => {
      if (a.isAwoof !== b.isAwoof) return a.isAwoof ? -1 : 1;
      if (a.isHero !== b.isHero) return a.isHero ? -1 : 1;
      return Number(a.sellPrice) - Number(b.sellPrice);
    });
    return list;
  }, [plans, network, pricing]);

  const selectedPlan = useMemo(
    () => networkPlans.find((p) => p.id === selectedPlanId) || null,
    [networkPlans, selectedPlanId]
  );

  const airtimeCharge = useMemo(
    () => airtimeSellPrice(amount, pricing),
    [amount, pricing]
  );

  useEffect(() => {
    setSelectedPlanId(null);
  }, [network]);

  useEffect(() => {
    if (!plansLoading && availableNetworks.length > 0 && !availableNetworks.includes(network)) {
      setNetwork(availableNetworks[0]);
    }
  }, [availableNetworks, network, plansLoading]);

  const isValidPhone = /^0\d{10}$/.test(phone.trim());

  const handleBuyAirtime = async () => {
    setError('');
    if (!uid) return setError('Please sign in to buy airtime');
    if (!functions) return setError('Payments are temporarily unavailable. Please try again.');
    const face = Math.round(Number(amount));
    if (!isValidPhone) return setError('Enter a valid 11-digit phone number (e.g. 08012345678)');
    if (!Number.isFinite(face) || face < 50) return setError('Enter a valid amount (minimum ₦50)');
    const charge = airtimeSellPrice(face, pricing);
    if (charge > walletBalance) return setError(`Insufficient wallet balance. Available: ${formatNaira(walletBalance)}`);

    setSubmitting(true);
    try {
      const purchaseAirtime = httpsCallable(functions, 'purchaseAirtime');
      const sentTo = phone.trim();
      await purchaseAirtime({ network, phone: sentTo, amount: face });
      setAmount('');
      setPhone('');
      setError('');
      const cashback = Math.max(0, Math.round(Number(pricing?.airtimeCashbackNaira) || 0));
      toast.success('Airtime sent', {
        description: cashback > 0
          ? `${formatNaira(face)} to ${sentTo} · ₦${cashback} cashback added to wallet`
          : `${formatNaira(face)} delivered to ${sentTo}`,
        duration: 4500,
        icon: <Smartphone className="w-5 h-5" />,
      });
    } catch (err) {
      if (isAmbiguousBillError(err)) {
        toast('Still processing…', {
          description: 'The provider is taking longer than usual. Check your wallet shortly — if it fails, the refund is automatic.',
          duration: 6000,
          icon: <Smartphone className="w-5 h-5" />,
        });
      } else {
        const msg = callableErrorMessage(err, 'Airtime purchase failed. Please try again.');
        setError(msg);
        toast.error('Airtime failed', {
          description: msg,
          duration: 5000,
          icon: <Smartphone className="w-5 h-5" />,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuyData = async () => {
    setError('');
    if (!uid) return setError('Please sign in to buy data');
    if (!functions) return setError('Payments are temporarily unavailable. Please try again.');
    if (!isValidPhone) return setError('Enter a valid 11-digit phone number (e.g. 08012345678)');
    if (!selectedPlan) return setError('Please select a data plan');
    const price = Number(selectedPlan.sellPrice);
    if (price > walletBalance) return setError(`Insufficient wallet balance. Available: ${formatNaira(walletBalance)}`);

    setSubmitting(true);
    try {
      const purchaseDataBundle = httpsCallable(functions, 'purchaseDataBundle');
      const sentTo = phone.trim();
      const planLabel = selectedPlan.isAwoof
        ? `${selectedPlan.displayName} Awoof data (${selectedPlan.days})`
        : `${selectedPlan.displayName || selectedPlan.name} (${selectedPlan.days})`;
      await purchaseDataBundle({
        network,
        phone: sentTo,
        dataPlan: selectedPlan.id,
      });
      setPhone('');
      setSelectedPlanId(null);
      setError('');
      toast.success('Data sent', {
        description: `${planLabel} delivered to ${sentTo}`,
        duration: 4500,
        icon: <Wifi className="w-5 h-5" />,
      });
    } catch (err) {
      if (isAmbiguousBillError(err)) {
        toast('Still processing…', {
          description: 'The provider is taking longer than usual. Check your wallet shortly — if it fails, the refund is automatic.',
          duration: 6000,
          icon: <Wifi className="w-5 h-5" />,
        });
      } else {
        const msg = callableErrorMessage(err, 'Data purchase failed. Please try again.');
        setError(msg);
        toast.error('Data failed', {
          description: msg,
          duration: 5000,
          icon: <Wifi className="w-5 h-5" />,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-[#E53935] px-5 pb-6 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-white text-xl font-bold">Airtime & Data</h1>
        </div>

        <div className="bg-white/15 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Wallet className="w-5 h-5" />
            <span className="text-sm">Wallet Balance</span>
          </div>
          <span className="text-white font-bold text-lg">{formatNaira(walletBalance)}</span>
        </div>
      </div>

      <div className="px-5 -mt-3">
        <div className="bg-white rounded-2xl shadow-md p-1.5 flex gap-1">
          <button
            type="button"
            onClick={() => setTab('airtime')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition ${
              tab === 'airtime' ? 'bg-[#E53935] text-white' : 'text-gray-500'
            }`}
          >
            <Smartphone className="w-4 h-4" /> Airtime
            {Number(pricing?.airtimeCashbackNaira) > 0 ? (
              <span className="text-[9px] font-bold bg-white/25 px-1.5 py-0.5 rounded-full">
                ₦{Math.round(Number(pricing.airtimeCashbackNaira))} CB
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setTab('data')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition ${
              tab === 'data' ? 'bg-[#E53935] text-white' : 'text-gray-500'
            }`}
          >
            <Wifi className="w-4 h-4" /> Data
          </button>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Select Network</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {availableNetworks.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNetwork(n)}
                className={`py-2.5 rounded-xl text-xs font-bold border-2 transition ${
                  network === n
                    ? 'border-[#E53935] bg-[#E53935]/5 text-[#E53935]'
                    : 'border-gray-100 text-gray-500'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Phone Number</p>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, '').slice(0, 11))}
            placeholder="08012345678"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E53935]/40 text-[#121212]"
          />
        </div>

        {tab === 'airtime' ? (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-gray-500">Amount</p>
              {Number(pricing?.airtimeCashbackNaira) > 0 ? (
                <span className="text-[10px] font-bold uppercase tracking-wide bg-[#E53935]/10 text-[#E53935] px-2 py-0.5 rounded-full">
                  ₦{Math.round(Number(pricing.airtimeCashbackNaira))} cashback
                </span>
              ) : null}
            </div>
            {Number(pricing?.airtimeCashbackNaira) > 0 ? (
              <p className="text-xs text-[#E53935] bg-[#E53935]/5 rounded-xl px-3 py-2 mb-3">
                Get ₦{Math.round(Number(pricing.airtimeCashbackNaira))} cashback in your wallet on every successful airtime.
              </p>
            ) : null}
            <input
              type="number"
              min={50}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E53935]/40 mb-3 text-[#121212]"
            />
            <div className="grid grid-cols-3 gap-2">
              {QUICK_AIRTIME_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(String(amt))}
                  className={`py-2 rounded-xl text-sm font-semibold border-2 ${
                    String(amt) === amount
                      ? 'border-[#E53935] bg-[#E53935]/5 text-[#E53935]'
                      : 'border-gray-100 text-gray-600'
                  }`}
                >
                  {formatNaira(amt)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">Select Data Plan</p>
            {plansLoading ? (
              <div className="py-6 text-center text-sm text-gray-400">Loading plans…</div>
            ) : networkPlans.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">No plans available for {network} right now.</div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                {networkPlans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`p-3 rounded-xl border-2 text-left relative ${
                      selectedPlanId === p.id
                        ? 'border-[#E53935] bg-[#E53935]/5'
                        : p.isAwoof
                          ? 'border-[#E53935]/30 bg-red-50/60'
                          : 'border-gray-100'
                    }`}
                  >
                    {p.isAwoof ? (
                      <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase tracking-wide bg-[#E53935] text-white px-1.5 py-0.5 rounded">
                        Awoof data
                      </span>
                    ) : p.isHero ? (
                      <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase tracking-wide bg-[#E53935] text-white px-1.5 py-0.5 rounded">
                        Deal
                      </span>
                    ) : null}
                    <div className="font-bold text-sm text-[#121212] pr-8">{p.displayName}</div>
                    <div className="text-xs text-gray-500">
                      {p.isAwoof ? 'Awoof data' : p.type || 'Data'}
                      {p.days ? ` · ${p.days}` : ''}
                    </div>
                    <div className="text-sm font-semibold text-[#E53935] mt-1">{formatNaira(p.sellPrice)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-3">{error}</div>
        )}

        <button
          type="button"
          disabled={submitting}
          onClick={tab === 'airtime' ? handleBuyAirtime : handleBuyData}
          className="w-full bg-[#E53935] text-white py-4 rounded-2xl font-bold disabled:opacity-60"
        >
          {submitting
            ? 'Processing…'
            : tab === 'airtime'
              ? `Buy Airtime${airtimeCharge ? ` — ${formatNaira(airtimeCharge)}` : ''}`
              : `Buy Data${selectedPlan ? ` — ${formatNaira(selectedPlan.sellPrice)}` : ''}`}
        </button>

        <p className="text-xs text-gray-400 text-center px-4">
          Payments are made instantly from your GO7 Wallet. If a purchase fails, you're automatically refunded.
          {tab === 'airtime' && Number(pricing?.airtimeCashbackNaira) > 0
            ? ` Get ₦${Math.round(Number(pricing.airtimeCashbackNaira))} cashback on every successful airtime.`
            : ''}
        </p>
      </div>
    </div>
  );
}
