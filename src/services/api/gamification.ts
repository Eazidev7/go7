/**
 * Gamification & Rewards API Service
 * Following GO7 Backend Integration Guide - Sections 12 & 13
 */

import { get, post, ApiResponse, PaginationParams, Pagination } from './client';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface GamificationProfile {
  userId: string;
  level: number;
  currentXP: number;
  xpForNextLevel: number;
  totalCoins: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  badges: Badge[];
  rank: number;
  totalOrders: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  requirement: {
    type: 'orders' | 'spending' | 'reviews' | 'referrals';
    target: number;
    current: number;
  };
  reward: {
    coins: number;
    xp: number;
  };
  expiresAt?: string;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
  isLocked: boolean;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  image: string;
  type: 'discount' | 'free_delivery' | 'cashback' | 'item';
  costInCoins: number;
  value: number;
  validityDays: number;
  isAvailable: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar: string;
  level: number;
  totalXP: number;
  totalCoins: number;
  totalOrders: number;
}

export interface Prize {
  id: string;
  name: string;
  type: 'coins' | 'discount' | 'free_delivery' | 'item';
  value: number;
  image: string;
  probability: number;
}

export interface LuckyWeekStatus {
  spinsAvailable: number;
  lastSpinDate: string;
  canSpinToday: boolean;
  prizePool: Prize[];
}

export interface SpinResult {
  prize: Prize;
  newBalance: {
    coins: number;
    spinsRemaining: number;
  };
}

// ============================================================================
// Gamification API Endpoints
// ============================================================================

/**
 * Get gamification profile
 * GET /api/gamification/profile
 */
export async function getGamificationProfile(): Promise<ApiResponse<GamificationProfile>> {
  return get<GamificationProfile>('/gamification/profile');
}

/**
 * Get missions
 * GET /api/gamification/missions
 */
export async function getMissions(): Promise<ApiResponse<Mission[]>> {
  return get<Mission[]>('/gamification/missions');
}

/**
 * Claim mission reward
 * POST /api/gamification/missions/:id/claim
 */
export async function claimMission(
  missionId: string
): Promise<ApiResponse<{ reward: Mission['reward']; newBalance: { coins: number; xp: number } }>> {
  return post(`/gamification/missions/${missionId}/claim`);
}

/**
 * Get badges
 * GET /api/gamification/badges
 */
export async function getBadges(): Promise<ApiResponse<Badge[]>> {
  return get<Badge[]>('/gamification/badges');
}

/**
 * Get leaderboard
 * GET /api/gamification/leaderboard
 */
export async function getLeaderboard(
  params?: PaginationParams & { period?: 'daily' | 'weekly' | 'monthly' | 'all-time' }
): Promise<ApiResponse<{ leaderboard: LeaderboardEntry[]; pagination: Pagination }>> {
  return get('/gamification/leaderboard', params);
}

/**
 * Get rewards store
 * GET /api/gamification/rewards
 */
export async function getRewards(
  params?: PaginationParams
): Promise<ApiResponse<{ rewards: Reward[]; pagination: Pagination }>> {
  return get('/gamification/rewards', params);
}

/**
 * Redeem reward
 * POST /api/gamification/rewards/:id/redeem
 */
export async function redeemReward(
  rewardId: string
): Promise<ApiResponse<{ message: string; newBalance: number; reward: Reward }>> {
  return post(`/gamification/rewards/${rewardId}/redeem`);
}

/**
 * Get gamification transactions (coins/XP history)
 * GET /api/gamification/transactions
 */
export async function getGamificationTransactions(
  params?: PaginationParams
): Promise<ApiResponse<{ transactions: any[]; pagination: Pagination }>> {
  return get('/gamification/transactions', params);
}

// ============================================================================
// Lucky Week API Endpoints
// ============================================================================

/**
 * Get Lucky Week status
 * GET /api/lucky-week/status
 */
export async function getLuckyWeekStatus(): Promise<ApiResponse<LuckyWeekStatus>> {
  return get<LuckyWeekStatus>('/lucky-week/status');
}

/**
 * Spin the Lucky Week wheel
 * POST /api/lucky-week/spin
 */
export async function spinLuckyWheel(): Promise<ApiResponse<SpinResult>> {
  return post<SpinResult>('/lucky-week/spin');
}

/**
 * Get Lucky Week history
 * GET /api/lucky-week/history
 */
export async function getLuckyWeekHistory(
  params?: PaginationParams
): Promise<ApiResponse<{ history: any[]; pagination: Pagination }>> {
  return get('/lucky-week/history', params);
}

/**
 * Get Lucky Week prizes
 * GET /api/lucky-week/prizes
 */
export async function getLuckyWeekPrizes(): Promise<ApiResponse<Prize[]>> {
  return get<Prize[]>('/lucky-week/prizes');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate XP progress percentage
 */
export function calculateXPProgress(profile: GamificationProfile): number {
  return (profile.currentXP / profile.xpForNextLevel) * 100;
}

/**
 * Check if mission is completable
 */
export function isMissionCompletable(mission: Mission): boolean {
  return mission.requirement.current >= mission.requirement.target && !mission.isClaimed;
}

/**
 * Check if user can afford reward
 */
export function canAffordReward(reward: Reward, userCoins: number): boolean {
  return userCoins >= reward.costInCoins && reward.isAvailable;
}

/**
 * Get rarity color
 */
export function getRarityColor(rarity: Badge['rarity']): string {
  const colors = {
    common: '#9CA3AF',
    rare: '#3B82F6',
    epic: '#A855F7',
    legendary: '#F59E0B',
  };
  return colors[rarity];
}

/**
 * Format XP display
 */
export function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`;
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toString();
}

/**
 * Get level badge icon
 */
export function getLevelBadge(level: number): string {
  if (level >= 50) return '👑';
  if (level >= 40) return '💎';
  if (level >= 30) return '🏆';
  if (level >= 20) return '🥇';
  if (level >= 10) return '🥈';
  return '🥉';
}
