import React, { useCallback, useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { db } from '../firebase/config';

const call = (name, data) => httpsCallable(getFunctions(), name)(data).then((r) => r.data);
const koboOf = (n) => Math.round(Number(n || 0) * 100);
const nairaOf = (k) => (k == null ? '' : (Number(k) / 100).toString());
const inputCls = 'w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none';

const EVENTS = [
  'FIRST_COMPLETED_ORDER', 'EVERY_COMPLETED_ORDER', 'NTH_COMPLETED_ORDER',
  'DELIVERY_VOLUME', 'REVENUE_THRESHOLD',
  'VENDOR_REGISTERED', 'VENDOR_APPROVED', 'VENDOR_FIRST_ORDER',
];
const BLANK_RULE = {
  id: '', name: '', enabled: true, event: 'FIRST_COMPLETED_ORDER',
  participant: 'referrer', rewardType: 'FIXED', amount: '', percent: '',
  threshold: '', minOrder: '', maxPerParticipant: '', maxRuleTotal: '',
  oneTime: true, requiresApproval: true,
};
const BLANK_CAMPAIGN = {
  campaignId: '', name: '', status: 'DRAFT', type: 'influencer',
  description: '', budget: '', creditBudget: '', startAt: '', endAt: '', payoutSchedule: 'manual',
  customerReward: '', partnerReward: '', firstOrderDiscount: '',
};

function docToForm(d) {
  const toDateInput = (v) => {
    if (!v) return '';
    const t = v.toDate ? v.toDate() : (v.seconds ? new Date(v.seconds * 1000) : new Date(v));
    return Number.isNaN(t.getTime()) ? '' : t.toISOString().slice(0, 10);
  };
  return {
    campaignId: d.campaignId || '',
    name: d.name || '',
    status: d.status || 'DRAFT',
    type: d.type || 'influencer',
    description: d.description || '',
    budget: nairaOf(d.budgetKobo),
    creditBudget: nairaOf(d.customerCreditBudgetKobo),
    startAt: toDateInput(d.startAt),
    endAt: toDateInput(d.endAt),
    payoutSchedule: d.payoutSchedule || 'manual',
    customerReward: nairaOf(d.customerRewardKobo),
    partnerReward: nairaOf(d.partnerRewardKobo),
    firstOrderDiscount: nairaOf(d.firstOrderDiscountKobo),
    rules: (d.rewardRules || []).map((r) => ({
      id: r.id || '', name: r.name || '', enabled: r.enabled !== false,
      event: r.event || 'FIRST_COMPLETED_ORDER', participant: r.participant || 'referrer',
      rewardType: r.rewardType || 'FIXED',
      amount: nairaOf(r.amountKobo ?? r.maxAmountKobo), percent: r.percentBps ? String(r.percentBps / 100) : '',
      threshold: r.threshold != null ? String(r.threshold) : (r.thresholdKobo != null ? nairaOf(r.thresholdKobo) : ''),
      minOrder: nairaOf(r.minOrderKobo), maxPerParticipant: nairaOf(r.maxPerParticipantKobo),
      maxRuleTotal: nairaOf(r.maxRuleTotalKobo),
      oneTime: r.oneTime !== false, requiresApproval: r.requiresApproval !== false,
    })),
  };
}

function formToPayload(f) {
  const rules = (f.rules || []).map((r, i) => {
    const isVendor = r.event.startsWith('VENDOR');
    const rule = {
      id: (r.id || `RULE_${i + 1}`).toUpperCase().replace(/[^A-Z0-9_]/g, ''),
      name: r.name || `Rule ${i + 1}`,
      enabled: r.enabled, event: r.event, participant: r.participant,
      rewardType: r.rewardType,
      minOrderKobo: r.minOrder !== '' ? koboOf(r.minOrder) : 0,
      maxPerParticipantKobo: r.maxPerParticipant !== '' ? koboOf(r.maxPerParticipant) : null,
      maxRuleTotalKobo: r.maxRuleTotal !== '' ? koboOf(r.maxRuleTotal) : null,
      oneTime: r.oneTime, requiresApproval: r.requiresApproval,
    };
    if (r.rewardType === 'PERCENT') {
      rule.percentBps = Math.round(Number(r.percent || 0) * 100);
      if (r.amount !== '') rule.amountKobo = koboOf(r.amount); // cap for percent
    } else {
      rule.amountKobo = koboOf(r.amount);
    }
    if (['NTH_COMPLETED_ORDER', 'DELIVERY_VOLUME'].includes(r.event)) rule.threshold = Math.round(Number(r.threshold || 0));
    if (r.event === 'REVENUE_THRESHOLD') rule.thresholdKobo = koboOf(r.threshold);
    return rule;
  });
  return {
    campaignId: f.campaignId.trim(),
    name: f.name.trim() || 'Campaign',
    status: f.status,
    type: f.type,
    description: f.description.trim(),
    budgetKobo: f.budget !== '' ? koboOf(f.budget) : undefined,
    customerCreditBudgetKobo: f.creditBudget !== '' ? koboOf(f.creditBudget) : undefined,
    startAt: f.startAt || undefined,
    endAt: f.endAt || undefined,
    payoutSchedule: f.payoutSchedule,
    customerRewardKobo: f.customerReward !== '' ? koboOf(f.customerReward) : 0,
    partnerRewardKobo: f.partnerReward !== '' ? koboOf(f.partnerReward) : 0,
    firstOrderDiscountKobo: f.firstOrderDiscount !== '' ? koboOf(f.firstOrderDiscount) : 0,
    rewardRules: rules,
  };
}

/**
 * Multi-campaign manager: list, create, duplicate, edit config + reward rules.
 * All writes go through upsertGrowthCampaign (server-validated, audited).
 */
const GrowthCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [selected, setSelected] = useState(null); // campaignId
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'growthCampaigns'));
      setCampaigns(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      toast.error('Could not load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const select = (c) => {
    setSelected(c.id);
    setForm(docToForm(c));
  };

  const newCampaign = () => {
    setSelected('__new__');
    setForm({ ...BLANK_CAMPAIGN, campaignId: `CAMP_${Date.now().toString(36).toUpperCase()}`, rules: [] });
  };

  const duplicate = (c) => {
    const f = docToForm(c);
    setSelected('__new__');
    setForm({ ...f, campaignId: `${c.id}_COPY_${Date.now().toString(36).toUpperCase()}`, name: `${f.name} (copy)`, status: 'DRAFT' });
  };

  const setRule = (i, patch) => setForm((f) => {
    const rules = f.rules.slice();
    rules[i] = { ...rules[i], ...patch };
    return { ...f, rules };
  });

  const save = async () => {
    if (!form.campaignId.trim()) { toast.error('Campaign ID required'); return; }
    setSaving(true);
    try {
      await call('upsertGrowthCampaign', formToPayload(form));
      toast.success('Campaign saved');
      setSelected(null); setForm(null);
      await load();
    } catch (e) {
      toast.error(e?.message?.replace(/^Firebase.*?:\s*/i, '') || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const STATUS_BADGE = {
    ACTIVE: 'bg-green-100 text-green-700', DRAFT: 'bg-gray-100 text-gray-600',
    PAUSED: 'bg-amber-100 text-amber-700', ENDED: 'bg-red-100 text-red-700',
  };

  if (loading) return <div className="py-8 text-center text-gray-400 text-sm">Loading campaigns…</div>;

  // ---------- Editor ----------
  if (form) {
    return (
      <div className="bg-white rounded-xl shadow border border-gray-200 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{selected === '__new__' ? 'New Campaign' : `Edit — ${form.name}`}</h3>
          <button onClick={() => { setSelected(null); setForm(null); }} className="text-xs text-gray-500 hover:underline">← Back to list</button>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          <div><label className="text-xs text-gray-500">Campaign ID</label>
            <input className={inputCls} value={form.campaignId} disabled={selected !== '__new__'} onChange={(e) => setForm((f) => ({ ...f, campaignId: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))} /></div>
          <div><label className="text-xs text-gray-500">Name</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="text-xs text-gray-500">Type</label>
            <select className={inputCls} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {['influencer', 'referral', 'vendor', 'promoter', 'custom'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select></div>
          <div><label className="text-xs text-gray-500">Status</label>
            <select className={inputCls} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select></div>
          <div><label className="text-xs text-gray-500">Budget cap (₦)</label>
            <input type="number" className={inputCls} value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} /></div>
          <div><label className="text-xs text-gray-500">Customer-credit cap (₦)</label>
            <input type="number" className={inputCls} value={form.creditBudget} onChange={(e) => setForm((f) => ({ ...f, creditBudget: e.target.value }))} /></div>
          <div><label className="text-xs text-gray-500">Start date</label>
            <input type="date" className={inputCls} value={form.startAt} onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))} /></div>
          <div><label className="text-xs text-gray-500">End date</label>
            <input type="date" className={inputCls} value={form.endAt} onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))} /></div>
          <div><label className="text-xs text-gray-500">Payout</label>
            <select className={inputCls} value={form.payoutSchedule} onChange={(e) => setForm((f) => ({ ...f, payoutSchedule: e.target.value }))}>
              {['manual', 'weekly', 'monthly'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select></div>
        </div>
        <div><label className="text-xs text-gray-500">Description</label>
          <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>

        {/* Legacy fields */}
        <div className="bg-gray-50 rounded-lg p-3 grid md:grid-cols-3 gap-3">
          <div><label className="text-xs text-gray-500">Referred-customer bonus (₦)</label>
            <input type="number" className={inputCls} value={form.customerReward} onChange={(e) => setForm((f) => ({ ...f, customerReward: e.target.value }))} /></div>
          <div><label className="text-xs text-gray-500">Partner first-order reward (₦)</label>
            <input type="number" className={inputCls} value={form.partnerReward} onChange={(e) => setForm((f) => ({ ...f, partnerReward: e.target.value }))} /></div>
          <div><label className="text-xs text-gray-500">First-order discount (₦)</label>
            <input type="number" className={inputCls} value={form.firstOrderDiscount} onChange={(e) => setForm((f) => ({ ...f, firstOrderDiscount: e.target.value }))} /></div>
        </div>

        {/* Rules editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900">Reward Rules</h4>
            <button onClick={() => setForm((f) => ({ ...f, rules: [...(f.rules || []), { ...BLANK_RULE }] }))}
              className="text-xs font-semibold text-red-600 hover:underline">+ Add rule</button>
          </div>
          {(form.rules || []).length === 0 && (
            <p className="text-xs text-gray-400">No custom rules — legacy fields above still apply.</p>
          )}
          <div className="space-y-3">
            {(form.rules || []).map((r, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                <div className="grid md:grid-cols-6 gap-2">
                  <div><label className="text-[10px] text-gray-500">Rule ID</label>
                    <input className={inputCls} placeholder={`RULE_${i + 1}`} value={r.id} onChange={(e) => setRule(i, { id: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })} /></div>
                  <div><label className="text-[10px] text-gray-500">Event</label>
                    <select className={inputCls} value={r.event} onChange={(e) => setRule(i, { event: e.target.value })}>
                      {EVENTS.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
                    </select></div>
                  <div><label className="text-[10px] text-gray-500">Participant</label>
                    <select className={inputCls} value={r.participant} onChange={(e) => setRule(i, { participant: e.target.value })}>
                      <option value="referrer">referrer</option>
                      <option value="referred">referred</option>
                    </select></div>
                  <div><label className="text-[10px] text-gray-500">Type</label>
                    <select className={inputCls} value={r.rewardType} onChange={(e) => setRule(i, { rewardType: e.target.value })}>
                      <option value="FIXED">FIXED ₦</option>
                      <option value="PERCENT">% of order</option>
                    </select></div>
                  <div><label className="text-[10px] text-gray-500">{r.rewardType === 'PERCENT' ? '% rate' : 'Amount ₦'}</label>
                    <input type="number" className={inputCls} value={r.rewardType === 'PERCENT' ? r.percent : r.amount}
                      onChange={(e) => setRule(i, r.rewardType === 'PERCENT' ? { percent: e.target.value } : { amount: e.target.value })} /></div>
                  {r.rewardType === 'PERCENT' && (
                    <div><label className="text-[10px] text-gray-500">Cap ₦</label>
                      <input type="number" className={inputCls} value={r.amount} onChange={(e) => setRule(i, { amount: e.target.value })} /></div>
                  )}
                  {['NTH_COMPLETED_ORDER', 'DELIVERY_VOLUME'].includes(r.event) && (
                    <div><label className="text-[10px] text-gray-500">Threshold (count)</label>
                      <input type="number" className={inputCls} value={r.threshold} onChange={(e) => setRule(i, { threshold: e.target.value })} /></div>
                  )}
                  {r.event === 'REVENUE_THRESHOLD' && (
                    <div><label className="text-[10px] text-gray-500">Threshold (₦)</label>
                      <input type="number" className={inputCls} value={r.threshold} onChange={(e) => setRule(i, { threshold: e.target.value })} /></div>
                  )}
                  <div><label className="text-[10px] text-gray-500">Min order ₦</label>
                    <input type="number" className={inputCls} value={r.minOrder} onChange={(e) => setRule(i, { minOrder: e.target.value })} /></div>
                  <div><label className="text-[10px] text-gray-500">Max/participant ₦</label>
                    <input type="number" className={inputCls} value={r.maxPerParticipant} onChange={(e) => setRule(i, { maxPerParticipant: e.target.value })} /></div>
                  <div><label className="text-[10px] text-gray-500">Max rule total ₦</label>
                    <input type="number" className={inputCls} value={r.maxRuleTotal} onChange={(e) => setRule(i, { maxRuleTotal: e.target.value })} /></div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={r.enabled} onChange={(e) => setRule(i, { enabled: e.target.checked })} /> Enabled</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={r.oneTime} onChange={(e) => setRule(i, { oneTime: e.target.checked })} /> One-time</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={r.requiresApproval} onChange={(e) => setRule(i, { requiresApproval: e.target.checked })} /> Needs approval</label>
                  <button onClick={() => setForm((f) => ({ ...f, rules: f.rules.filter((_, j) => j !== i) }))}
                    className="ml-auto text-red-500 hover:underline font-medium">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={save} disabled={saving}
            className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Campaign'}
          </button>
          <button onClick={() => { setSelected(null); setForm(null); }} className="px-5 py-2.5 bg-gray-100 rounded-lg text-sm font-semibold hover:bg-gray-200">Cancel</button>
        </div>
      </div>
    );
  }

  // ---------- List ----------
  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-900">Campaigns</h3>
          <p className="text-xs text-gray-400">Create and configure reward campaigns — changes apply to future qualifications only.</p>
        </div>
        <button onClick={newCampaign} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">+ New Campaign</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Rules</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Rewarded</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns.length === 0 && (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No campaigns yet — create one to start rewarding partners.</td></tr>
            )}
            {campaigns.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{c.name || c.id}</p>
                  <p className="text-xs text-gray-400 font-mono">{c.id}</p>
                </td>
                <td className="px-4 py-3 text-xs">{c.type || 'referral'}</td>
                <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[c.status] || 'bg-gray-100 text-gray-500'}`}>{c.status || 'DRAFT'}</span></td>
                <td className="px-4 py-3">{(c.rewardRules || []).length || '—'}</td>
                <td className="px-4 py-3">{c.budgetKobo ? `₦${(c.budgetKobo / 100).toLocaleString()}` : '—'}</td>
                <td className="px-4 py-3">
                  {`₦${(((c.stats || {}).rewardedKobo || 0) / 100).toLocaleString()}`}
                  {c.customerCreditBudgetKobo ? (
                    <p className="text-xs text-gray-400">{`credit ₦${(((c.stats || {}).customerCreditIssuedKobo || 0) / 100).toLocaleString()} / ₦${(c.customerCreditBudgetKobo / 100).toLocaleString()}`}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                  <button onClick={() => select(c)} className="text-xs font-semibold text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => duplicate(c)} className="text-xs font-semibold text-gray-500 hover:underline">Duplicate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GrowthCampaigns;
