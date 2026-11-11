/**
 * GO7 Lucky Week — server-side spin + weekly jackpot settle.
 *
 * Money-value writes (userRewards order_credit, jackpotGrants, coin credit)
 * live here so Firestore rules can keep them out of client reach.
 * Mirrors the legacy client logic in src/services/gamificationService.js.
 */
const functions = require('firebase-functions/v1');
const admin = require('./adminInit');

const db = admin.firestore();
const { serverTimestamp, increment } = admin.firestore.FieldValue;

const GAMIFICATION_ECONOMY = {
  weeklyJackpotNaira: 1500,
  maxWinnersPerWeek: 10,
  jackpotPrizeType: 'order_credit',
  maxSpinsPerDay: 1,
  maxJackpotEntriesPerWeek: 1,
  maxCoinsPerLuckySpin: 150,
};

const LUCKY_PRIZES = [
  { name: 'Free Delivery', weight: 32, value: 0, type: 'voucher' },
  { name: '50 Coins', weight: 28, value: 50, type: 'coins' },
  { name: '100 Coins', weight: 22, value: 100, type: 'coins' },
  { name: '150 Coins', weight: 12, value: 150, type: 'coins' },
  { name: '₦200 Food Credit', weight: 4, value: 200, type: 'order_credit' },
  { name: 'Jackpot Entry', weight: 2, value: 0, type: 'jackpot' },
];

function pickWeightedPrize() {
  const totalWeight = LUCKY_PRIZES.reduce((s, p) => s + p.weight, 0);
  let random = Math.random() * totalWeight;
  for (const prize of LUCKY_PRIZES) {
    random -= prize.weight;
    if (random <= 0) return prize;
  }
  return LUCKY_PRIZES[0];
}

/** Stable week key so jackpot entries reset each week (Mon–Sun). */
function getJackpotWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  const y = monday.getFullYear();
  const start = new Date(y, 0, 1);
  const week = Math.floor((monday.getTime() - start.getTime()) / 86400000) + 1;
  return `${y}-W${week}`;
}

function currentWeekJackpotEntries(luckyWeek) {
  const weekKey = getJackpotWeekKey();
  if (luckyWeek.jackpotWeek !== weekKey) return 0;
  return Number(luckyWeek.jackpotEntries) || 0;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickJackpotWinners(entrants) {
  const pool = shuffleInPlace([...entrants]);
  return pool.slice(0, Math.min(GAMIFICATION_ECONOMY.maxWinnersPerWeek, pool.length));
}

function splitJackpotPool(winnerCount) {
  const total = GAMIFICATION_ECONOMY.weeklyJackpotNaira;
  if (winnerCount <= 0) return [];
  const base = Math.floor(total / winnerCount);
  const remainder = total - base * winnerCount;
  return Array.from({ length: winnerCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

/** Idempotent: jackpotGrants/{weekKey} can only be written once. */
async function creditJackpotWinners(winnerIds, weekKey, meta = {}) {
  const grantRef = db.collection('jackpotGrants').doc(weekKey);
  const amounts = splitJackpotPool(winnerIds.length);
  const total = amounts.reduce((s, n) => s + n, 0);

  return db.runTransaction(async (tx) => {
    const existing = await tx.get(grantRef);
    if (existing.exists) {
      return { already: true, ...(existing.data() || {}) };
    }

    const winners = winnerIds.map((userId, i) => {
      const amount = amounts[i];
      const rewardRef = db.collection('userRewards').doc();
      tx.set(rewardRef, {
        userId,
        rewardName: `Weekly Jackpot ₦${amount} (food or delivery)`,
        type: 'order_credit',
        value: amount,
        appliesTo: ['food', 'delivery'],
        costInCoins: 0,
        source: 'weekly_jackpot',
        status: 'active',
        redeemedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        weekKey,
        auto: meta.auto === true,
        adminNote: meta.adminNote || null,
      });

      const txRef = db.collection('gamificationTransactions').doc();
      tx.set(txRef, {
        userId,
        type: 'earned',
        coins: 0,
        xp: 0,
        source: 'weekly_jackpot',
        description: `Weekly jackpot ₦${amount} order credit`,
        weekKey,
        timestamp: serverTimestamp(),
      });

      return { userId, amount, rewardId: rewardRef.id };
    });

    tx.set(grantRef, {
      winners,
      winnerCount: winners.length,
      amount: total,
      poolTotal: GAMIFICATION_ECONOMY.weeklyJackpotNaira,
      maxWinners: GAMIFICATION_ECONOMY.maxWinnersPerWeek,
      userId: winners[0]?.userId || null,
      rewardId: winners[0]?.rewardId || null,
      weekKey,
      type: 'order_credit',
      appliesTo: ['food', 'delivery'],
      status: 'granted',
      auto: meta.auto === true,
      grantedAt: serverTimestamp(),
      adminNote: meta.adminNote || null,
    });

    return { success: true, already: false, winners, amount: total, weekKey };
  });
}

/** Auto-draw previous week's pool and credit up to 10 winners. Safe to call often. */
async function settlePreviousWeek() {
  const currentKey = getJackpotWeekKey();
  const prevWeekKey = getJackpotWeekKey(new Date(Date.now() - 7 * 86400000));

  if (prevWeekKey === currentKey) {
    return { status: 'week_open', weekKey: currentKey };
  }

  const grantRef = db.collection('jackpotGrants').doc(prevWeekKey);
  const existing = await grantRef.get();
  if (existing.exists) {
    return { status: 'already_settled', weekKey: prevWeekKey, ...(existing.data() || {}) };
  }

  const entriesSnap = await db.collection('jackpotPools').doc(prevWeekKey).collection('entries').get();
  const entrants = entriesSnap.docs.map((d) => d.id);

  if (entrants.length === 0) {
    try {
      await grantRef.set({
        status: 'no_entries',
        weekKey: prevWeekKey,
        amount: 0,
        winnerCount: 0,
        auto: true,
        settledAt: serverTimestamp(),
      });
    } catch {
      /* another settle may have written */
    }
    return { status: 'no_entries', weekKey: prevWeekKey };
  }

  const winnerIds = pickJackpotWinners(entrants);
  const result = await creditJackpotWinners(winnerIds, prevWeekKey, { auto: true });
  return { status: result.already ? 'already_settled' : 'granted', ...result };
}

/**
 * Callable: settle last week's jackpot. Any authenticated user's app may trigger
 * it (the UI calls it on Lucky Week open); the transaction makes it idempotent.
 */
exports.settleWeeklyJackpot = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  }
  return settlePreviousWeek();
});

/**
 * Callable: manual admin override — credit one user from last week's pool.
 */
exports.grantJackpotManual = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  }
  const adminSnap = await db.collection('users').doc(context.auth.uid).get();
  const role = String(adminSnap.data()?.role || '').toLowerCase();
  if (role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  const userId = String(data?.userId || '').trim();
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'userId required');
  }
  const weekKey = getJackpotWeekKey(new Date(Date.now() - 7 * 86400000));
  return creditJackpotWinners([userId], weekKey, { auto: false, adminNote: data?.adminNote || '' });
});

/**
 * Callable: spin the Lucky Week wheel. Server decides the prize and writes all
 * reward docs — clients cannot mint order credits or extra spins.
 */
exports.spinLuckyWeek = functions.https.onCall(async (data, context) => {
  const userId = context.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  }

  try {
    await settlePreviousWeek();
  } catch (e) {
    functions.logger.warn('Jackpot auto-settle skipped:', e?.message || e);
  }

  const userRef = db.collection('users').doc(userId);
  const today = new Date().toDateString();
  const weekKey = getJackpotWeekKey();

  const userSnap = await userRef.get();
  const prev = userSnap.exists ? userSnap.data()?.luckyWeek || {} : {};

  if (prev.lastSpinDate === today) {
    throw new functions.https.HttpsError('failed-precondition', 'No spins remaining today');
  }

  let selectedPrize = { ...pickWeightedPrize() };
  if (selectedPrize.type === 'coins') {
    selectedPrize.value = Math.min(selectedPrize.value, GAMIFICATION_ECONOMY.maxCoinsPerLuckySpin);
  }

  const weekEntries = currentWeekJackpotEntries(prev);
  if (
    selectedPrize.type === 'jackpot' &&
    weekEntries >= GAMIFICATION_ECONOMY.maxJackpotEntriesPerWeek
  ) {
    selectedPrize = { name: '50 Coins', weight: 0, value: 50, type: 'coins' };
  }

  let jackpotEntries = weekEntries;
  if (selectedPrize.type === 'jackpot') {
    jackpotEntries = weekEntries + 1;
  }

  const luckyWeekUpdate = {
    lastSpinDate: today,
    totalSpins: (prev.totalSpins || 0) + 1,
    totalWins: (prev.totalWins || 0) + 1,
    jackpotWeek: weekKey,
    jackpotEntries,
    lastPrize: selectedPrize.name,
    lastPrizeAt: new Date().toISOString(),
    history: [
      {
        prize: selectedPrize.name,
        type: selectedPrize.type,
        value: selectedPrize.value,
        at: new Date().toISOString(),
      },
      ...(Array.isArray(prev.history) ? prev.history.slice(0, 49) : []),
    ],
  };

  await userRef.set({ luckyWeek: luckyWeekUpdate }, { merge: true });

  if (selectedPrize.type === 'jackpot') {
    await db.collection('jackpotPools').doc(weekKey).collection('entries').doc(userId).set(
      { userId, weekKey, createdAt: serverTimestamp() },
      { merge: true }
    );
  }

  if (selectedPrize.type === 'coins' && selectedPrize.value > 0) {
    const profileRef = db.collection('gamificationProfiles').doc(userId);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
      await profileRef.set({
        userId,
        level: 1,
        currentXP: 0,
        xpForNextLevel: 500,
        totalCoins: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: new Date(0).toISOString(),
        totalOrders: 0,
        totalSpent: 0,
        badges: [],
        claimedMissions: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await profileRef.update({ totalCoins: increment(selectedPrize.value), updatedAt: serverTimestamp() });
  }

  if (selectedPrize.type === 'voucher') {
    await db.collection('userRewards').add({
      userId,
      rewardName: selectedPrize.name,
      type: 'free_delivery',
      value: 1,
      costInCoins: 0,
      source: 'lucky_week',
      status: 'active',
      redeemedAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  if (selectedPrize.type === 'order_credit' && selectedPrize.value > 0) {
    await db.collection('userRewards').add({
      userId,
      rewardName: selectedPrize.name,
      type: 'order_credit',
      value: selectedPrize.value,
      appliesTo: ['food', 'delivery'],
      costInCoins: 0,
      source: 'lucky_week',
      status: 'active',
      redeemedAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  await db.collection('gamificationTransactions').add({
    userId,
    type: 'earned',
    coins: selectedPrize.type === 'coins' ? selectedPrize.value : 0,
    xp: 0,
    source: 'lucky_week',
    description: `Lucky Week: ${selectedPrize.name}`,
    prizeType: selectedPrize.type,
    timestamp: serverTimestamp(),
  });

  return {
    prize: selectedPrize,
    spinsRemaining: 0,
    jackpotEntries,
  };
});
