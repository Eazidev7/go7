/**
 * GO7 Gamification Service â€” real Firestore-backed coins, streaks, missions, badges, rewards, Lucky Week.
 * No demo balances or fake progress.
 */

import { db, functions } from '../firebase/config';
import { httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';

// ============================================================================
// Catalogs (product config â€” not user fake data)
// ============================================================================

export const REWARD_CATALOG = [
  {
    id: 'discount_500',
    name: 'â‚¦500 Discount Coupon',
    description: 'Valid on orders above â‚¦2,000',
    cost: 500,
    category: 'Discount',
    type: 'discount',
    value: 500,
  },
  {
    id: 'free_delivery_3',
    name: 'Free Delivery Pass',
    description: 'Free delivery for your next 3 orders',
    cost: 800,
    category: 'Delivery',
    type: 'free_delivery',
    value: 3,
  },
  {
    id: 'discount_1000',
    name: 'â‚¦1,000 Discount Coupon',
    description: 'Valid on orders above â‚¦5,000',
    cost: 900,
    category: 'Discount',
    type: 'discount',
    value: 1000,
  },
  {
    id: 'free_delivery_1',
    name: 'Single Free Delivery',
    description: 'Waive delivery fee on your next order',
    cost: 200,
    category: 'Delivery',
    type: 'free_delivery',
    value: 1,
  },
  {
    id: 'discount_200',
    name: 'â‚¦200 Discount Coupon',
    description: 'Valid on any order above â‚¦1,000',
    cost: 250,
    category: 'Discount',
    type: 'discount',
    value: 200,
  },
];

const BADGE_DEFS = [
  {
    id: 'first_order',
    name: 'First Bite',
    description: 'Complete your first order',
    rarity: 'common',
    check: (s) => s.deliveredOrders >= 1,
    progress: (s) => Math.min(s.deliveredOrders, 1),
    total: 1,
  },
  {
    id: 'orders_10',
    name: 'Regular',
    description: 'Complete 10 orders',
    rarity: 'common',
    check: (s) => s.deliveredOrders >= 10,
    progress: (s) => Math.min(s.deliveredOrders, 10),
    total: 10,
  },
  {
    id: 'orders_50',
    name: 'Super Customer',
    description: 'Complete 50 orders',
    rarity: 'rare',
    check: (s) => s.deliveredOrders >= 50,
    progress: (s) => Math.min(s.deliveredOrders, 50),
    total: 50,
  },
  {
    id: 'streak_7',
    name: '7-Day Streak Hero',
    description: 'Login for 7 consecutive days',
    rarity: 'rare',
    check: (s) => s.currentStreak >= 7 || s.longestStreak >= 7,
    progress: (s) => Math.min(Math.max(s.currentStreak, s.longestStreak), 7),
    total: 7,
  },
  {
    id: 'vendors_5',
    name: 'Explorer',
    description: 'Order from 5 different vendors',
    rarity: 'common',
    check: (s) => s.uniqueVendors >= 5,
    progress: (s) => Math.min(s.uniqueVendors, 5),
    total: 5,
  },
  {
    id: 'spend_10k',
    name: 'Big Spender',
    description: 'Spend â‚¦10,000 total on GO7',
    rarity: 'epic',
    check: (s) => s.totalSpent >= 10000,
    progress: (s) => Math.min(s.totalSpent, 10000),
    total: 10000,
  },
  {
    id: 'ratings_5',
    name: 'Reviewer',
    description: 'Rate 5 orders',
    rarity: 'common',
    check: (s) => s.ratedOrders >= 5,
    progress: (s) => Math.min(s.ratedOrders, 5),
    total: 5,
  },
];

/**
 * Economy caps — keep Lucky Week / jackpot from draining GO7.
 * Jackpot is an order credit (food or delivery), never auto cash to wallet.
 */
export const GAMIFICATION_ECONOMY = {
  weeklyJackpotNaira: 1500, // total weekly pool (food/delivery credit)
  maxWinnersPerWeek: 10, // split pool across up to 10 winners
  jackpotPrizeType: 'order_credit', // food or delivery only
  maxSpinsPerDay: 1,
  maxJackpotEntriesPerWeek: 1,
  maxCoinsPerLuckySpin: 150,
  maxStreakBonusPerClaim: 100,
  // Coins are loyalty points, not naira 1:1 — redeem catalog has real ₦ caps
};

const COMPLETED_STATUSES = new Set([
  'delivered',
  'completed',
  'Delivered',
  'COMPLETED',
]);

function emptyStats() {
  return {
    deliveredOrders: 0,
    totalSpent: 0,
    weeklyOrders: 0,
    monthlySpent: 0,
    uniqueVendors: 0,
    ratedOrders: 0,
    breakfastOrders: 0,
    referralCount: 0,
    currentStreak: 0,
    longestStreak: 0,
  };
}

function orderCreatedMs(order) {
  const c = order.createdAt;
  if (!c) return 0;
  if (typeof c.toDate === 'function') return c.toDate().getTime();
  if (c.seconds) return c.seconds * 1000;
  const t = new Date(c).getTime();
  return Number.isFinite(t) ? t : 0;
}

function orderAmount(order) {
  const raw =
    order.total ??
    order.grandTotal ??
    order.amount ??
    order.totalAmount ??
    order.paymentAmount ??
    0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function isOrderCompleted(order) {
  return COMPLETED_STATUSES.has(String(order.status || ''));
}

// ============================================================================
// Profile
// ============================================================================

export async function initializeGamificationProfile(userId) {
  const profileRef = doc(db, 'gamificationProfiles', userId);
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) {
    const newProfile = {
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
    };
    await setDoc(profileRef, newProfile);
    return newProfile;
  }

  return profileSnap.data();
}

export async function getGamificationProfile(userId) {
  if (!userId) throw new Error('userId required');
  const profileRef = doc(db, 'gamificationProfiles', userId);
  const profileSnap = await getDoc(profileRef);
  if (!profileSnap.exists()) {
    return initializeGamificationProfile(userId);
  }
  return { userId, ...profileSnap.data() };
}

function calculateLevel(xp) {
  return Math.floor((xp || 0) / 500) + 1;
}

function calculateXPForNextLevel(currentLevel) {
  return (currentLevel || 1) * 500;
}

export { calculateLevel, calculateXPForNextLevel };

// ============================================================================
// Real order / referral stats
// ============================================================================

async function fetchUserOrders(userId) {
  const fields = ['userId', 'customerId', 'uid'];
  for (const field of fields) {
    try {
      const q = query(collection(db, 'orders'), where(field, '==', userId), limit(100));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    } catch {
      // missing index or field â€” try next
    }
  }
  return [];
}

async function fetchReferralCount(userId) {
  try {
    const q = query(collection(db, 'users'), where('referredBy', '==', userId), limit(50));
    const snap = await getDocs(q);
    return snap.size;
  } catch {
    return 0;
  }
}

export async function getUserActivityStats(userId) {
  const profile = await getGamificationProfile(userId);
  const orders = await fetchUserOrders(userId);
  const stats = emptyStats();
  stats.currentStreak = profile.currentStreak || 0;
  stats.longestStreak = profile.longestStreak || 0;
  stats.referralCount = await fetchReferralCount(userId);

  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthMs = monthStart.getTime();

  const vendors = new Set();

  for (const order of orders) {
    if (!isOrderCompleted(order)) continue;
    stats.deliveredOrders += 1;
    const amt = orderAmount(order);
    stats.totalSpent += amt;

    const ms = orderCreatedMs(order);
    if (ms >= weekAgo) stats.weeklyOrders += 1;
    if (ms >= monthMs) stats.monthlySpent += amt;

    const vendorId = order.vendorId || order.restaurantId || order.vendor?.id;
    if (vendorId) vendors.add(String(vendorId));

    if (order.rating != null || order.customerRating != null || order.rated === true) {
      stats.ratedOrders += 1;
    }

    if (ms) {
      const hour = new Date(ms).getHours();
      if (hour < 12) stats.breakfastOrders += 1;
    }
  }

  stats.uniqueVendors = vendors.size;

  // Keep profile totals in sync (best-effort)
  try {
    await updateDoc(doc(db, 'gamificationProfiles', userId), {
      totalOrders: stats.deliveredOrders,
      totalSpent: stats.totalSpent,
      updatedAt: serverTimestamp(),
    });
  } catch {
    /* ignore */
  }

  return { stats, profile, orders };
}

// ============================================================================
// Award on delivery
// ============================================================================

export async function awardCoinsForOrder(userId, orderAmount, orderId = null) {
  if (!userId) return null;
  const amount = Number(orderAmount) || 0;
  const coinsEarned = Math.floor(amount / 100);
  const xpEarned = Math.floor(amount / 50);

  const profileRef = doc(db, 'gamificationProfiles', userId);
  const profile = await getGamificationProfile(userId);

  if (orderId && profile.lastAwardedOrderId === orderId) {
    return { coinsEarned: 0, xpEarned: 0, leveledUp: false, duplicate: true };
  }

  const newXP = (profile.currentXP || 0) + xpEarned;
  const newLevel = calculateLevel(newXP);
  const leveledUp = newLevel > (profile.level || 1);

  await updateDoc(profileRef, {
    totalCoins: increment(coinsEarned),
    currentXP: newXP,
    level: newLevel,
    xpForNextLevel: calculateXPForNextLevel(newLevel),
    totalOrders: increment(1),
    totalSpent: increment(amount),
    lastAwardedOrderId: orderId || null,
    lastActivityDate: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'gamificationTransactions'), {
    userId,
    type: 'earned',
    coins: coinsEarned,
    xp: xpEarned,
    source: 'order_completion',
    description: orderId ? `Order ${orderId}` : 'Order completed',
    amount,
    orderId: orderId || null,
    timestamp: serverTimestamp(),
  });

  return {
    coinsEarned,
    xpEarned,
    leveledUp,
    newLevel,
    totalCoins: (profile.totalCoins || 0) + coinsEarned,
  };
}

// ============================================================================
// Daily streak
// ============================================================================

export async function checkAndUpdateStreak(userId) {
  const profileRef = doc(db, 'gamificationProfiles', userId);
  const profile = await getGamificationProfile(userId);

  const today = new Date().toDateString();
  const lastRaw = profile.lastActivityDate;
  const lastActivity = lastRaw ? new Date(lastRaw).toDateString() : '';
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  let newStreak = profile.currentStreak || 0;
  let streakBonus = 0;

  if (lastActivity === today) {
    return {
      currentStreak: newStreak,
      streakBonus: 0,
      longestStreak: profile.longestStreak || 0,
      alreadyCheckedIn: true,
    };
  }

  if (lastActivity === yesterday) {
    newStreak = (profile.currentStreak || 0) + 1;
    streakBonus = Math.min(newStreak * 10, 100);
  } else {
    newStreak = 1;
    streakBonus = 10;
  }

  const longestStreak = Math.max(newStreak, profile.longestStreak || 0);

  await updateDoc(profileRef, {
    currentStreak: newStreak,
    longestStreak,
    totalCoins: increment(streakBonus),
    lastActivityDate: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });

  if (streakBonus > 0) {
    await addDoc(collection(db, 'gamificationTransactions'), {
      userId,
      type: 'earned',
      coins: streakBonus,
      xp: 0,
      source: 'daily_streak',
      description: `Day ${newStreak} streak bonus`,
      timestamp: serverTimestamp(),
    });
  }

  // One-time streak milestone vouchers / coin bonuses
  const milestonesGranted = { ...(profile.streakMilestonesGranted || {}) };
  const milestoneDefs = [
    { days: 7, coins: 100, name: '7-day streak bonus' },
    { days: 14, type: 'discount', value: 200, name: '₦200 Discount Voucher' },
    { days: 30, type: 'free_delivery', value: 1, name: 'Free Delivery Pass' },
  ];
  for (const m of milestoneDefs) {
    if (newStreak >= m.days && !milestonesGranted[m.days]) {
      milestonesGranted[m.days] = new Date().toISOString();
      if (m.coins) {
        await updateDoc(profileRef, { totalCoins: increment(m.coins) });
        await addDoc(collection(db, 'gamificationTransactions'), {
          userId,
          type: 'earned',
          coins: m.coins,
          xp: 0,
          source: 'streak_milestone',
          description: m.name,
          timestamp: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'userRewards'), {
          userId,
          rewardName: m.name,
          type: m.type,
          value: m.value,
          costInCoins: 0,
          source: 'streak_milestone',
          status: 'active',
          redeemedAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }
  }
  await updateDoc(profileRef, {
    streakMilestonesGranted: milestonesGranted,
    updatedAt: serverTimestamp(),
  });

  return {
    currentStreak: newStreak,
    streakBonus,
    longestStreak,
    alreadyCheckedIn: false,
  };
}

export function buildWeekStreakDays(currentStreak, hasClaimedToday) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const todayIdx = today.getDay();
  // Show Monâ€“Sun week
  const mondayOffset = (todayIdx + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const completedBeforeToday = hasClaimedToday
    ? Math.max(0, currentStreak - 1)
    : currentStreak;

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday = i === mondayOffset;
    const daysBeforeToday = mondayOffset - i;
    let completed = false;
    if (isToday) {
      completed = hasClaimedToday;
    } else if (daysBeforeToday > 0) {
      completed = daysBeforeToday <= completedBeforeToday;
    }
    return {
      day: dayNames[d.getDay()],
      completed,
      isToday,
      reward: isToday ? Math.min(((currentStreak || 0) + (hasClaimedToday ? 0 : 1)) * 10, 100) : 10,
    };
  });
}

// ============================================================================
// Missions
// ============================================================================

export async function getMissions(userId) {
  const { stats, profile } = await getUserActivityStats(userId);
  const claimed = profile.claimedMissions || {};

  const defs = [
    {
      id: 'weekly_orders',
      title: 'Order 3 times this week',
      description: 'Complete 3 orders to earn bonus coins',
      reward: { coins: 100, xp: 50 },
      progress: stats.weeklyOrders,
      total: 3,
      type: 'weekly',
      iconKey: 'orders',
    },
    {
      id: 'spend_5000',
      title: 'Spend â‚¦5,000 this month',
      description: 'Reach â‚¦5,000 in orders this month',
      reward: { coins: 300, xp: 150 },
      progress: Math.floor(stats.monthlySpent),
      total: 5000,
      type: 'monthly',
      iconKey: 'spend',
    },
    {
      id: 'daily_streak_7',
      title: 'Maintain 7-day streak',
      description: 'Keep your daily streak for 7 days',
      reward: { coins: 200, xp: 100 },
      progress: stats.currentStreak,
      total: 7,
      type: 'special',
      iconKey: 'streak',
    },
    {
      id: 'new_vendor',
      title: 'Order from 2 vendors',
      description: 'Try more than one restaurant or shop',
      reward: { coins: 50, xp: 25 },
      progress: stats.uniqueVendors,
      total: 2,
      type: 'special',
      iconKey: 'vendor',
    },
    {
      id: 'rate_3',
      title: 'Rate 3 orders',
      description: 'Help improve GO7 by rating deliveries',
      reward: { coins: 30, xp: 15 },
      progress: stats.ratedOrders,
      total: 3,
      type: 'special',
      iconKey: 'rate',
    },
    {
      id: 'refer_1',
      title: 'Refer a friend',
      description: 'Invite a friend who joins GO7',
      reward: { coins: 200, xp: 100 },
      progress: stats.referralCount,
      total: 1,
      type: 'special',
      iconKey: 'refer',
    },
  ];

  return defs.map((m) => {
    const done = m.progress >= m.total;
    const alreadyClaimed = Boolean(claimed[m.id]);
    let status = 'active';
    if (alreadyClaimed) status = 'claimed';
    else if (done) status = 'completed';
    return { ...m, status, canClaim: done && !alreadyClaimed };
  });
}

export async function claimMissionReward(userId, missionId) {
  const missions = await getMissions(userId);
  const mission = missions.find((m) => m.id === missionId);
  if (!mission) throw new Error('Mission not found');
  if (!mission.canClaim) {
    throw new Error(
      mission.status === 'claimed' ? 'Already claimed' : 'Mission not complete yet'
    );
  }

  const profileRef = doc(db, 'gamificationProfiles', userId);
  const profile = await getGamificationProfile(userId);
  const claimed = { ...(profile.claimedMissions || {}) };
  claimed[missionId] = new Date().toISOString();

  const newXP = (profile.currentXP || 0) + mission.reward.xp;
  const newLevel = calculateLevel(newXP);

  await updateDoc(profileRef, {
    totalCoins: increment(mission.reward.coins),
    currentXP: newXP,
    level: newLevel,
    xpForNextLevel: calculateXPForNextLevel(newLevel),
    claimedMissions: claimed,
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'gamificationTransactions'), {
    userId,
    type: 'earned',
    coins: mission.reward.coins,
    xp: mission.reward.xp,
    source: 'mission_completion',
    description: `Mission: ${mission.title}`,
    missionId,
    timestamp: serverTimestamp(),
  });

  return { success: true, reward: mission.reward, mission };
}

// ============================================================================
// Badges
// ============================================================================

export async function getBadges(userId) {
  const { stats, profile } = await getUserActivityStats(userId);
  const unlockedIds = new Set(profile.badges || []);
  let changed = false;

  const badges = BADGE_DEFS.map((def) => {
    const unlocked = def.check(stats) || unlockedIds.has(def.id);
    if (def.check(stats) && !unlockedIds.has(def.id)) {
      unlockedIds.add(def.id);
      changed = true;
    }
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      rarity: def.rarity,
      unlocked,
      progress: def.progress(stats),
      total: def.total,
    };
  });

  if (changed) {
    try {
      await updateDoc(doc(db, 'gamificationProfiles', userId), {
        badges: Array.from(unlockedIds),
        updatedAt: serverTimestamp(),
      });
    } catch {
      /* ignore */
    }
  }

  return badges;
}

// ============================================================================
// Rewards store
// ============================================================================

export function getRewardCatalog() {
  return REWARD_CATALOG.map((r) => ({ ...r, available: true }));
}

export async function redeemReward(userId, rewardCost, rewardName, extra = {}) {
  const profile = await getGamificationProfile(userId);
  const cost = Number(rewardCost) || 0;

  if ((profile.totalCoins || 0) < cost) {
    throw new Error('Insufficient coins');
  }

  const catalogItem =
    REWARD_CATALOG.find((r) => r.id === extra.rewardId || r.name === rewardName) || null;

  await updateDoc(doc(db, 'gamificationProfiles', userId), {
    totalCoins: increment(-cost),
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'gamificationTransactions'), {
    userId,
    type: 'redeemed',
    coins: -cost,
    xp: 0,
    source: 'reward_redemption',
    description: `Redeemed: ${rewardName}`,
    rewardId: catalogItem?.id || extra.rewardId || null,
    timestamp: serverTimestamp(),
  });

  const rewardDoc = await addDoc(collection(db, 'userRewards'), {
    userId,
    rewardId: catalogItem?.id || extra.rewardId || null,
    rewardName,
    type: catalogItem?.type || extra.type || 'voucher',
    value: catalogItem?.value ?? extra.value ?? null,
    costInCoins: cost,
    status: 'active',
    redeemedAt: serverTimestamp(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  return {
    success: true,
    newBalance: (profile.totalCoins || 0) - cost,
    rewardDocId: rewardDoc.id,
  };
}

export async function getUserRewards(userId, limitCount = 30) {
  try {
    const q = query(
      collection(db, 'userRewards'),
      where('userId', '==', userId),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error loading user rewards:', error);
    return [];
  }
}

/** Active vouchers usable at checkout (not expired / not used). */
export async function getActiveUserRewards(userId) {
  const rewards = await getUserRewards(userId, 50);
  const now = Date.now();
  return rewards.filter((r) => {
    if (!r || r.status !== 'active') return false;
    if (r.expiresAt) {
      const exp = new Date(r.expiresAt).getTime();
      if (Number.isFinite(exp) && exp < now) return false;
    }
    return ['free_delivery', 'order_credit', 'discount'].includes(String(r.type || ''));
  });
}

/**
 * Apply one reward to checkout totals.
 * free_delivery → delivery fee 0
 * order_credit / discount → naira credit off the payable total
 */
export function applyUserRewardToTotals({ itemTotal = 0, deliveryFee = 0 } = {}, reward) {
  if (!reward) {
    return {
      itemTotal,
      deliveryFee,
      rewardCredit: 0,
      deliveryWaived: false,
    };
  }

  if (reward.type === 'free_delivery') {
    return {
      itemTotal,
      deliveryFee: 0,
      rewardCredit: 0,
      deliveryWaived: true,
    };
  }

  if (reward.type === 'order_credit' || reward.type === 'discount') {
    const maxApplicable = Math.max(0, Number(itemTotal) + Number(deliveryFee));
    const credit = Math.min(Math.max(0, Number(reward.value) || 0), maxApplicable);
    return {
      itemTotal,
      deliveryFee,
      rewardCredit: credit,
      deliveryWaived: false,
    };
  }

  return {
    itemTotal,
    deliveryFee,
    rewardCredit: 0,
    deliveryWaived: false,
  };
}

/** Mark reward used after a successful paid order (or decrement multi-use free delivery). */
export async function consumeUserReward(rewardId, orderId) {
  if (!rewardId) return null;
  const ref = doc(db, 'userRewards', rewardId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() || {};

  if (data.type === 'free_delivery' && Number(data.value) > 1) {
    await updateDoc(ref, {
      value: increment(-1),
      lastUsedOrderId: orderId || null,
      lastUsedAt: serverTimestamp(),
    });
    return { decremented: true };
  }

  await updateDoc(ref, {
    status: 'used',
    usedOrderId: orderId || null,
    usedAt: serverTimestamp(),
  });
  return { used: true };
}

// ============================================================================
// Transactions
// ============================================================================

export async function getCoinTransactions(userId, limitCount = 20) {
  try {
    const q = query(
      collection(db, 'gamificationTransactions'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.warn('Coin tx query failed, falling back:', error?.message || error);
    try {
      const q = query(
        collection(db, 'gamificationTransactions'),
        where('userId', '==', userId),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => {
        const am = a.timestamp?.toMillis?.() || new Date(a.timestamp || 0).getTime() || 0;
        const bm = b.timestamp?.toMillis?.() || new Date(b.timestamp || 0).getTime() || 0;
        return bm - am;
      });
      return rows;
    } catch {
      return [];
    }
  }
}

export async function getCoinStats(userId) {
  const txs = await getCoinTransactions(userId, 100);
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  let earnedThisMonth = 0;
  let lifetimeEarned = 0;

  for (const tx of txs) {
    if (tx.type !== 'earned') continue;
    const coins = Number(tx.coins) || 0;
    lifetimeEarned += coins;
    const d = tx.timestamp?.toDate?.() || (tx.timestamp ? new Date(tx.timestamp) : null);
    if (d && d.getMonth() === month && d.getFullYear() === year) {
      earnedThisMonth += coins;
    }
  }

  return { earnedThisMonth, lifetimeEarned };
}

// ============================================================================
// Lucky Week
// ============================================================================

function nextSundayEnd() {
  const d = new Date();
  const day = d.getDay();
  const add = day === 0 ? 7 : 7 - day;
  const end = new Date(d);
  end.setDate(d.getDate() + add);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Stable week key so jackpot entries reset each week (Mon–Sun). */
export function getJackpotWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // ISO-ish: year + day-of-year of Monday
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

export async function getLuckyWeekStatus(userId) {
  // Auto-settle last week's jackpot when a new week has started (no manual grant needed)
  try {
    await ensureWeeklyJackpotAutoSettled();
  } catch (e) {
    console.warn('Jackpot auto-settle skipped:', e?.message || e);
  }

  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  const luckyWeek = userDoc.exists() ? userDoc.data()?.luckyWeek || {} : {};
  const today = new Date().toDateString();
  const spinsAvailable =
    luckyWeek.lastSpinDate === today ? 0 : GAMIFICATION_ECONOMY.maxSpinsPerDay;

  return {
    spinsAvailable,
    canSpinToday: spinsAvailable > 0,
    lastSpinDate: luckyWeek.lastSpinDate || null,
    totalSpins: luckyWeek.totalSpins || 0,
    totalWins: luckyWeek.totalWins || 0,
    jackpotEntries: currentWeekJackpotEntries(luckyWeek),
    jackpotWeek: getJackpotWeekKey(),
    lastPrize: luckyWeek.lastPrize || null,
    weeklyJackpot: GAMIFICATION_ECONOMY.weeklyJackpotNaira,
    jackpotPrizeType: GAMIFICATION_ECONOMY.jackpotPrizeType,
    nextResetDate: nextSundayEnd().toISOString(),
    isActive: true,
  };
}

export async function spinLuckyWeek(userId) {
  // Server-side: the callable validates spin availability, picks the prize and
  // writes all reward docs (clients cannot mint order credits or extra spins).
  const call = httpsCallable(functions, 'spinLuckyWeek');
  const result = await call({});
  const data = result?.data || {};
  if (data?.error || !data?.prize) {
    throw new Error(data?.error || 'Spin failed');
  }
  return {
    prize: data.prize,
    spinsRemaining: data.spinsRemaining ?? 0,
    jackpotEntries: data.jackpotEntries ?? 0,
  };
}

/**
 * Weekly jackpot draw + prize credit run server-side (settleWeeklyJackpot /
 * spinLuckyWeek callables) — the settler writes rewards for other users, which
 * client Firestore rules cannot safely allow.
 */
export async function ensureWeeklyJackpotAutoSettled() {
  // Server-side: jackpot settle writes rewards for other users — clients can't
  // hold that permission. The callable is idempotent (one grant per weekKey).
  try {
    const call = httpsCallable(functions, 'settleWeeklyJackpot');
    const result = await call({});
    return result?.data || { status: 'error' };
  } catch (e) {
    console.warn('Jackpot auto-settle skipped:', e?.message || e);
    return { status: 'skipped', error: e?.message };
  }
}

/** Manual override — credits one user from the previous week pool (still once/week lock). */
export async function grantWeeklyJackpotOrderCredit(userId, adminNote = '') {
  if (!userId) throw new Error('userId required');
  const call = httpsCallable(functions, 'grantJackpotManual');
  const result = await call({ userId, adminNote });
  return result?.data;
}

export async function getLuckyWeekHistory(userId) {
  const status = await getLuckyWeekStatus(userId);
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  const history = userDoc.exists() ? userDoc.data()?.luckyWeek?.history || [] : [];

  if (history.length > 0) {
    return history.map((h, i) => ({
      id: `lw-${i}`,
      type: h.type || 'coins',
      reward: h.prize || h.reward || 'Prize',
      date: h.at ? new Date(h.at).toLocaleString() : 'Recently',
      raw: h,
    }));
  }

  const txs = await getCoinTransactions(userId, 50);
  return txs
    .filter((t) => t.source === 'lucky_week')
    .map((t) => ({
      id: t.id,
      type: t.prizeType || (t.coins > 0 ? 'coins' : 'voucher'),
      reward: t.description || 'Lucky Week prize',
      date: t.timestamp?.toDate?.()
        ? t.timestamp.toDate().toLocaleString()
        : 'Recently',
      raw: t,
    }));
}

export async function getJackpotStatus(userId) {
  const status = await getLuckyWeekStatus(userId);
  const end = nextSundayEnd();
  const now = Date.now();
  const diff = Math.max(0, end.getTime() - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const weekKey = getJackpotWeekKey();

  let totalParticipants = 0;
  try {
    const snap = await getDocs(collection(db, 'jackpotPools', weekKey, 'entries'));
    totalParticipants = snap.size;
  } catch {
    totalParticipants = status.jackpotEntries > 0 ? 1 : 0;
  }

  let lastGrant = null;
  try {
    const prevWeekKey = getJackpotWeekKey(new Date(Date.now() - 7 * 86400000));
    const grantSnap = await getDoc(doc(db, 'jackpotGrants', prevWeekKey));
    if (grantSnap.exists() && grantSnap.data()?.status === 'granted') {
      const g = grantSnap.data();
      lastGrant = {
        weekKey: prevWeekKey,
        userId: g.userId,
        amount: g.amount,
        winnerCount: g.winnerCount || (g.winners?.length ?? 1),
        winners: g.winners || [],
        auto: g.auto === true,
      };
    }
  } catch {
    /* ignore */
  }

  const maxWinners = GAMIFICATION_ECONOMY.maxWinnersPerWeek;
  const pool = GAMIFICATION_ECONOMY.weeklyJackpotNaira;
  const perWinnerApprox = Math.floor(pool / maxWinners);

  return {
    userTickets: status.jackpotEntries || 0,
    totalParticipants,
    prizeAmount: status.weeklyJackpot || pool,
    prizeType: GAMIFICATION_ECONOMY.jackpotPrizeType,
    prizeLabel: `₦${pool.toLocaleString()} pool · up to ${maxWinners} winners (~₦${perWinnerApprox} each)`,
    maxEntriesPerWeek: GAMIFICATION_ECONOMY.maxJackpotEntriesPerWeek,
    maxWinnersPerWeek: maxWinners,
    timeLeft: { days, hours, minutes, seconds },
    endsAt: end.toISOString(),
    autoCredit: true,
    lastWinner: lastGrant,
    recentWinners: lastGrant
      ? [
          {
            name: `${lastGrant.winnerCount} winner${lastGrant.winnerCount === 1 ? '' : 's'}`,
            prize: `₦${lastGrant.amount} total`,
            date: 'Auto-credited',
          },
        ]
      : [],
  };
}
