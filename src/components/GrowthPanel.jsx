import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection, getDocs, limit, orderBy, query, where,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { db } from '../firebase/config';
import GrowthCampaigns from './GrowthCampaigns';

const CAMPAIGN_ID = 'REFERRAL_LAUNCH';

const naira = (kobo) => `₦${(Number(kobo || 0) / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

const fmtDate = (t) => {
  if (!t) return '—';
  if (t.toDate) return t.toDate().toLocaleDateString();
  if (t._seconds || t.seconds) return new Date((t._seconds || t.seconds) * 1000).toLocaleDateString();
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

const REWARD_BADGE = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  VOID: 'bg-gray-100 text-gray-500',
};

const PARTNER_BADGE = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  SUSPENDED: 'bg-red-100 text-red-700',
};

const call = (name, data) => httpsCallable(getFunctions(), name)(data).then((r) => r.data);

/** Normalize a typed Nigerian phone to the stored '234…' form. */
const normalizePhone = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('234')) return d;
  return `234${d.replace(/^0+/, '')}`;
};

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none';

/**
 * Growth / influencer partners admin panel.
 * Reads growthPartners/growthRewards directly (admin-scoped rules);
 * all writes go through the server-authoritative callables.
 */
const GrowthPanel = () => {
  const [partners, setPartners] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', userId: '', code: '',
    tiktok: '', instagram: '', whatsapp: '', other: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pSnap, rSnap] = await Promise.all([
        getDocs(collection(db, 'growthPartners')),
        getDocs(query(collection(db, 'growthRewards'), orderBy('createdAt', 'desc'), limit(200))),
      ]);
      setPartners(pSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setRewards(rSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('GrowthPanel load error:', e);
      toast.error('Could not load growth data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const partnerById = useMemo(() => Object.fromEntries(partners.map((p) => [p.partnerId || p.id, p])), [partners]);

  const lookupUser = async () => {
    const digits = String(form.phone || '').replace(/\D/g, '');
    if (!digits) { toast.error('Enter a phone number first'); return; }
    // Stored formats vary: '080x', '+23480x', '23480x' — query all of them.
    const local = digits.startsWith('234') ? `0${digits.slice(3)}` : (digits.startsWith('0') ? digits : `0${digits}`);
    const intl = `234${local.slice(1)}`;
    const candidates = [...new Set([local, `+${intl}`, intl])];
    try {
      for (const field of ['phone', 'phoneNumber']) {
        const snap = await getDocs(query(collection(db, 'users'), where(field, 'in', candidates), limit(1)));
        if (!snap.empty) {
          setForm((f) => ({ ...f, userId: snap.docs[0].id }));
          toast.success(`Linked to user ${snap.docs[0].id}`);
          return;
        }
      }
      toast.error('No user found with that phone — paste their user ID manually');
    } catch (e) {
      toast.error('User lookup failed');
    }
  };

  const createPartner = async () => {
    if (!form.name.trim()) { toast.error('Partner name is required'); return; }
    setSaving(true);
    try {
      const res = await call('createGrowthPartner', {
        name: form.name.trim(),
        phone: normalizePhone(form.phone) || undefined,
        email: form.email.trim() || undefined,
        userId: form.userId.trim() || undefined,
        code: form.code.trim().toUpperCase() || undefined,
        tiktok: form.tiktok.trim() || undefined,
        instagram: form.instagram.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
        other: form.other.trim() || undefined,
        campaignId: CAMPAIGN_ID,
      });
      toast.success(`Partner created — link: ${res.referralLink}`);
      setShowCreate(false);
      setForm({ name: '', phone: '', email: '', userId: '', code: '', tiktok: '', instagram: '', whatsapp: '', other: '' });
      await load();
    } catch (e) {
      toast.error(e?.message?.replace(/^Firebase.*?:\s*/i, '') || 'Could not create partner');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (partnerId, status) => {
    try {
      await call('setGrowthPartnerStatus', { partnerId, status });
      toast.success(`Partner ${status.toLowerCase()}`);
      await load();
    } catch (e) {
      toast.error('Status update failed');
    }
  };

  const rewardAction = async (rewardId, fn, label) => {
    try {
      await call(fn, { rewardId });
      toast.success(`Reward ${label}`);
      await load();
    } catch (e) {
      toast.error(e?.message?.replace(/^Firebase.*?:\s*/i, '') || 'Reward update failed');
    }
  };

  const copyLink = (code) => {
    navigator.clipboard.writeText(`https://go7.ng/r/${code}`).then(
      () => toast.success('Link copied'),
      () => toast.error('Copy failed')
    );
  };

  if (loading) {
    return <div className="py-16 text-center text-gray-500 text-sm">Loading growth data…</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header + create */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Growth Partners</h2>
          <p className="text-sm text-gray-500">Influencers & referral partners — links, attribution, rewards</p>
        </div>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
        >
          {showCreate ? 'Cancel' : '+ New Partner'}
        </button>
      </div>

      {/* Create partner */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Create Partner</h3>
          <div className="grid md:grid-cols-3 gap-3">
            <input className={inputCls} placeholder="Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <div className="flex gap-2">
              <input className={inputCls} placeholder="Phone (080…)" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <button onClick={lookupUser} className="px-3 py-2 bg-gray-100 rounded-lg text-xs font-semibold hover:bg-gray-200 whitespace-nowrap">Find UID</button>
            </div>
            <input className={inputCls} placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <input className={inputCls} placeholder="User ID (links their /partner dashboard)" value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} />
            <input className={inputCls} placeholder="Custom code (optional, e.g. GO7AMINA)" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            <input className={inputCls} placeholder="TikTok handle" value={form.tiktok} onChange={(e) => setForm((f) => ({ ...f, tiktok: e.target.value }))} />
            <input className={inputCls} placeholder="Instagram handle" value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} />
            <input className={inputCls} placeholder="WhatsApp number" value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} />
            <input className={inputCls} placeholder="Other social" value={form.other} onChange={(e) => setForm((f) => ({ ...f, other: e.target.value }))} />
          </div>
          <button
            onClick={createPartner}
            disabled={saving}
            className="mt-4 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Partner'}
          </button>
        </div>
      )}

      {/* Campaigns — create/edit/duplicate, reward rules engine */}
      <GrowthCampaigns />

      {/* Partners table */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Code / Link</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Clicks</th>
                <th className="px-4 py-3">Signups</th>
                <th className="px-4 py-3">Qualified</th>
                <th className="px-4 py-3">Earned</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {partners.length === 0 && (
                <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">No partners yet — create the first influencer above.</td></tr>
              )}
              {partners.map((p) => {
                const s = p.stats || {};
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.name || '—'}</p>
                      <p className="text-xs text-gray-400">{p.phone || ''}{p.socialProfiles?.instagram ? ` · @${p.socialProfiles.instagram}` : ''}{p.socialProfiles?.tiktok ? ` · tt:${p.socialProfiles.tiktok}` : ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => copyLink(p.code)} className="font-mono text-xs text-red-600 hover:underline" title="Copy link">
                        go7.ng/r/{p.code}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PARTNER_BADGE[p.status] || 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3">{s.clicks || 0}</td>
                    <td className="px-4 py-3">{s.signups || 0}</td>
                    <td className="px-4 py-3">{s.qualifiedCustomers || 0}</td>
                    <td className="px-4 py-3 font-medium">{naira((s.pendingRewardsKobo || 0) + (s.approvedRewardsKobo || 0) + (s.paidRewardsKobo || 0))}</td>
                    <td className="px-4 py-3 text-right">
                      {p.status !== 'ACTIVE' && (
                        <button onClick={() => setStatus(p.partnerId || p.id, 'ACTIVE')} className="text-xs font-semibold text-green-600 hover:underline mr-2">Activate</button>
                      )}
                      {p.status === 'ACTIVE' && (
                        <button onClick={() => setStatus(p.partnerId || p.id, 'SUSPENDED')} className="text-xs font-semibold text-red-600 hover:underline">Suspend</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rewards ledger */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Reward Ledger</h3>
          <p className="text-xs text-gray-400">Approve → pay partner rewards. Customer bonuses credit wallets automatically.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rewards.length === 0 && (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No rewards yet.</td></tr>
              )}
              {rewards.map((r) => {
                const partner = partnerById[r.partnerId];
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{partner?.name || r.partnerId?.slice(0, 8) || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{String(r.customerId || '').slice(0, 10)}…</td>
                    <td className="px-4 py-3 text-xs">{(r.rewardType || '').replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 font-semibold">{naira(r.amountKobo)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${REWARD_BADGE[r.status] || 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(r.createdAt)}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {r.status === 'PENDING' && (
                        <>
                          <button onClick={() => rewardAction(r.id, 'approveGrowthReward', 'approved')} className="text-xs font-semibold text-blue-600 hover:underline">Approve</button>
                          <button onClick={() => rewardAction(r.id, 'rejectGrowthReward', 'rejected')} className="text-xs font-semibold text-red-600 hover:underline">Reject</button>
                        </>
                      )}
                      {r.status === 'APPROVED' && (
                        <>
                          <button onClick={() => rewardAction(r.id, 'payGrowthReward', 'marked paid')} className="text-xs font-semibold text-green-600 hover:underline">Mark Paid</button>
                          <button onClick={() => rewardAction(r.id, 'voidGrowthReward', 'voided')} className="text-xs font-semibold text-gray-500 hover:underline">Void</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GrowthPanel;
