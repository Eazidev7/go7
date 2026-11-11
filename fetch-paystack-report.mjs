/**
 * Fetches Paystack account summary (no secrets printed).
 * Usage: node fetch-paystack-report.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadSecret() {
  const envPath = path.join(__dirname, 'functions', '.env');
  if (!fs.existsSync(envPath)) throw new Error('functions/.env not found');
  const line = fs
    .readFileSync(envPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('PAYSTACK_SECRET_KEY='));
  if (!line) throw new Error('PAYSTACK_SECRET_KEY missing in functions/.env');
  return line.split('=').slice(1).join('=').trim();
}

async function paystackGet(secret, endpoint, params = {}) {
  const url = new URL(`https://api.paystack.co${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  });
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.json();
  if (!res.ok || body.status === false) {
    throw new Error(body.message || `Paystack ${endpoint} failed (${res.status})`);
  }
  return body.data;
}

function naira(kobo) {
  return `₦${(Number(kobo || 0) / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

const secret = loadSecret();

const report = {
  fetchedAt: new Date().toISOString(),
  balance: null,
  transferBalance: null,
  recentTransfers: [],
  recentTransactions: [],
  transferRecipients: [],
  settlements: [],
  errors: [],
};

try {
  const balances = await paystackGet(secret, '/balance');
  report.balance = Array.isArray(balances)
    ? balances.map((b) => ({ currency: b.currency, amount: naira(b.balance) }))
    : balances;
} catch (e) {
  report.errors.push(`balance: ${e.message}`);
}

try {
  const transfers = await paystackGet(secret, '/transfer', { perPage: 20 });
  report.recentTransfers = (transfers || []).map((t) => ({
    reference: t.reference,
    amount: naira(t.amount),
    status: t.status,
    recipient: t.recipient?.name || t.reason || '—',
    createdAt: t.createdAt || t.transferred_at,
  }));
} catch (e) {
  report.errors.push(`transfers: ${e.message}`);
}

try {
  const txns = await paystackGet(secret, '/transaction', { perPage: 20, status: 'success' });
  report.recentTransactions = (txns || []).map((t) => ({
    reference: t.reference,
    amount: naira(t.amount),
    channel: t.channel,
    customer: t.customer?.email || t.customer?.customer_code || '—',
    paidAt: t.paid_at || t.paidAt,
  }));
} catch (e) {
  report.errors.push(`transactions: ${e.message}`);
}

try {
  const recipients = await paystackGet(secret, '/transferrecipient', { perPage: 50 });
  report.transferRecipients = (recipients || []).map((r) => ({
    code: r.recipient_code,
    name: r.name,
    bank: r.details?.bank_name || r.details?.bank_code,
    account: r.details?.account_number ? `****${String(r.details.account_number).slice(-4)}` : '—',
  }));
} catch (e) {
  report.errors.push(`recipients: ${e.message}`);
}

try {
  const settlements = await paystackGet(secret, '/settlement', { perPage: 10 });
  report.settlements = (settlements || []).map((s) => ({
    status: s.status,
    amount: naira(s.total_amount || s.total_processed),
    settledAt: s.settlement_date || s.createdAt,
  }));
} catch (e) {
  report.errors.push(`settlements: ${e.message}`);
}

// Transfer balance (ledger available for payouts)
try {
  const ledger = await paystackGet(secret, '/balance/ledger', { perPage: 5 });
  report.ledgerSample = ledger;
} catch (e) {
  // not all accounts have ledger API
}

const outPath = path.join(__dirname, 'docs', 'paystack-report.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

console.log('=== PAYSTACK REPORT ===');
console.log('Saved:', outPath);
if (report.balance) {
  console.log('\nBalances:');
  (Array.isArray(report.balance) ? report.balance : [report.balance]).forEach((b) => {
    console.log(`  ${b.currency || 'NGN'}: ${b.amount || b}`);
  });
}
console.log(`\nTransfer recipients: ${report.transferRecipients.length}`);
console.log(`Recent transfers: ${report.recentTransfers.length}`);
console.log(`Recent successful transactions: ${report.recentTransactions.length}`);
console.log(`Settlements: ${report.settlements.length}`);
if (report.recentTransfers.length) {
  console.log('\nLast 5 transfers:');
  report.recentTransfers.slice(0, 5).forEach((t) => {
    console.log(`  ${t.status?.toUpperCase()} ${t.amount} · ${t.reference} · ${t.recipient}`);
  });
}
if (report.errors.length) {
  console.log('\nWarnings:');
  report.errors.forEach((e) => console.log(`  - ${e}`));
}
