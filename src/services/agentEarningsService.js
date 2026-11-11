/**
 * Agent Earnings Service
 * Handles all API calls to Firebase Cloud Functions for the agent earnings system
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

const functions = getFunctions(app);

// ====================================================================
// AGENT MANAGEMENT
// ====================================================================

/**
 * Create a new agent
 */
export async function createAgent(agentData) {
  const createAgentFn = httpsCallable(functions, 'createAgent');
  const result = await createAgentFn(agentData);
  return result.data;
}

/**
 * Get agent details
 */
export async function getAgent(agentId) {
  const getAgentFn = httpsCallable(functions, 'getAgent');
  const result = await getAgentFn({ agentId });
  return result.data;
}

/**
 * Update agent bank details
 */
export async function updateAgentBank(agentId, bankName, accountNumber) {
  const updateAgentBankFn = httpsCallable(functions, 'updateAgentBank');
  const result = await updateAgentBankFn({ agentId, bankName, accountNumber });
  return result.data;
}

// ====================================================================
// VENDOR MANAGEMENT
// ====================================================================

/**
 * Create a new vendor
 */
export async function createVendor(vendorData) {
  const createVendorFn = httpsCallable(functions, 'createVendor');
  const result = await createVendorFn(vendorData);
  return result.data;
}

// ====================================================================
// EARNINGS
// ====================================================================

/**
 * Get agent earnings history
 */
export async function getAgentEarnings(agentId, limit = 50) {
  const getAgentEarningsFn = httpsCallable(functions, 'getAgentEarnings');
  const result = await getAgentEarningsFn({ agentId, limit });
  return result.data;
}

/**
 * Approve an earning (Admin only)
 */
export async function approveEarning(earningId) {
  const approveEarningFn = httpsCallable(functions, 'approveEarning');
  const result = await approveEarningFn({ earningId });
  return result.data;
}

/**
 * Get all pending earnings (Admin only)
 */
export async function getPendingEarnings() {
  const getPendingEarningsFn = httpsCallable(functions, 'getPendingEarnings');
  const result = await getPendingEarningsFn({});
  return result.data;
}

// ====================================================================
// WITHDRAWALS
// ====================================================================

/**
 * Request withdrawal
 */
export async function requestWithdrawal(agentId, amount) {
  const requestWithdrawalFn = httpsCallable(functions, 'requestWithdrawal');
  const result = await requestWithdrawalFn({ agentId, amount });
  return result.data;
}

/**
 * Get agent withdrawals history
 */
export async function getAgentWithdrawals(agentId, limit = 50) {
  const getAgentWithdrawalsFn = httpsCallable(functions, 'getAgentWithdrawals');
  const result = await getAgentWithdrawalsFn({ agentId, limit });
  return result.data;
}

/**
 * Mark withdrawal as paid (Admin only)
 */
export async function markWithdrawalPaid(withdrawalId, reference = null) {
  const markWithdrawalPaidFn = httpsCallable(functions, 'markWithdrawalPaid');
  const result = await markWithdrawalPaidFn({ withdrawalId, reference });
  return result.data;
}

/**
 * Get all pending withdrawals (Admin only)
 */
export async function getPendingWithdrawals() {
  const getPendingWithdrawalsFn = httpsCallable(functions, 'getPendingWithdrawals');
  const result = await getPendingWithdrawalsFn({});
  return result.data;
}
