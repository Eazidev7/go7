import React, { useEffect, useMemo, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const naira = (kobo) => `₦${(Number(kobo || 0) / 100).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const fmtDate = (t) => {
  if (!t) return '—';
  if (t.toDate) return t.toDate().toLocaleDateString();
  if (t._seconds || t.seconds) return new Date((t._seconds || t.seconds) * 1000).toLocaleDateString();
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

const STATUS_BADGE = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  SUSPENDED: 'bg-red-100 text-red-700',
};

const REWARD_BADGE = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  VOID: 'bg-gray-100 text-gray-500',
};

const StatCard = ({ label, value, sub }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

/**
 * /partner — influencer/growth-partner dashboard.
 * Data comes from the getPartnerDashboard callable (server resolves the
 * caller's partner doc via growthPartners.userId — no direct Firestore access).
 */
const PartnerDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [notPartner, setNotPartner] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const fn = httpsCallable(getFunctions(), 'getPartnerDashboard');
        const res = await fn({});
        if (cancelled) return;
        if (res.data?.ok) setDashboard(res.data);
        else setError('Could not load your dashboard. Please try again.');
      } catch (e) {
        if (cancelled) return;
        if (e?.code === 'functions/permission-denied' || e?.code === 'permission-denied') {
          setNotPartner(true);
        } else {
          setError('Could not load your dashboard. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const shareText = useMemo(() => {
    if (!dashboard) return '';
    return `Order food, groceries & deliveries on Go7 — sign up with my link and get a bonus: https://${dashboard.referralLink}`;
  }, [dashboard]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://${dashboard.referralLink}`);
      toast.success('Referral link copied!');
    } catch (_) {
      toast.error('Copy failed — long-press the link to copy it.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-gray-500 text-sm">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full text-center">
          <p className="text-4xl mb-3">📣</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Go7 Partner Dashboard</h1>
          <p className="text-gray-500 text-sm mb-6">Sign in to see your referral stats and earnings.</p>
          <button
            onClick={() => navigate('/login', { state: { from: '/partner' } })}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  if (notPartner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full text-center">
          <p className="text-4xl mb-3">📣</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Not a partner yet</h1>
          <p className="text-gray-500 text-sm mb-6">
            Your account isn't registered as a Go7 growth partner. Contact the Go7 team to activate
            your influencer/partner account and get your personal referral link.
          </p>
          <a
            href="https://wa.me/2348166205600?text=Hi%20Go7%2C%20I%20want%20to%20become%20a%20growth%20partner"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
          >
            Contact Go7 on WhatsApp
          </a>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full text-center">
          <p className="text-gray-500 text-sm mb-6">{error || 'No dashboard data.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboard.stats || {};
  const rewards = dashboard.rewards || [];
  const attributions = dashboard.attributions || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 pt-10 pb-16">
        <div className="max-w-2xl mx-auto">
          <p className="text-red-100 text-xs uppercase tracking-widest">Go7 Growth Partner</p>
          <h1 className="text-2xl font-bold mt-1">{dashboard.name || 'Partner Dashboard'}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[dashboard.status] || 'bg-gray-100 text-gray-600'}`}>
              {dashboard.status}
            </span>
            <span className="text-red-100 text-sm">Code: <strong className="text-white">{dashboard.code}</strong></span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-10 space-y-4">
        {/* Referral link */}
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Your referral link</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <span className="text-sm font-mono text-gray-800 truncate flex-1">{dashboard.referralLink}</span>
            <button onClick={copyLink} className="text-xs font-semibold text-red-600 hover:text-red-700 flex-shrink-0">
              COPY
            </button>
          </div>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block w-full py-2.5 bg-green-600 text-white text-center rounded-lg font-semibold text-sm hover:bg-green-700"
          >
            Share on WhatsApp
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Link clicks" value={stats.clicks || 0} />
          <StatCard label="Sign ups" value={stats.signups || 0} />
          <StatCard label="Qualified" value={stats.qualifiedCustomers || 0} sub="first orders completed" />
          <StatCard label="Conversion" value={`${stats.conversionPercent || 0}%`} />
        </div>

        {/* Earnings */}
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Earnings</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-yellow-600">{naira(stats.pendingRewardsKobo)}</p>
              <p className="text-xs text-gray-400">Pending</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">{naira(stats.approvedRewardsKobo)}</p>
              <p className="text-xs text-gray-400">Approved</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">{naira(stats.paidRewardsKobo)}</p>
              <p className="text-xs text-gray-400">Paid</p>
            </div>
          </div>
        </div>

        {/* Rewards */}
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Rewards ({rewards.length})</p>
          {rewards.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No rewards yet — they appear when customers you refer complete their first order.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {rewards.map((r) => (
                <div key={r.rewardId} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.customer}</p>
                    <p className="text-xs text-gray-400">{fmtDate(r.createdAt)} · {(r.rewardType || '').replace(/_/g, ' ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{naira(r.amountKobo)}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${REWARD_BADGE[r.status] || 'bg-gray-100 text-gray-500'}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attributions */}
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Referred customers ({attributions.length})</p>
          {attributions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nobody has signed up with your link yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {attributions.map((a, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{a.customer}</p>
                    <p className="text-xs text-gray-400">{fmtDate(a.registeredAt)}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${a.qualified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {a.qualified ? 'QUALIFIED' : a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;
