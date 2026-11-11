import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { db } from '../config/firebase';
import {
  DELIVERY_PIN_LENGTH,
  getDeliveryPinFromOrder,
  resolveOrderRef,
} from './orderTracking';

export interface DeliveryVerificationCode {
  orderId: string;
  code: string;
  expiresAt: string;
  createdAt: string;
}

export interface GenerateVerificationCodeResponse {
  success: boolean;
  data: DeliveryVerificationCode;
}

export interface VerifyDeliveryCodeRequest {
  orderId: string;
  code: string;
  riderId: string;
}

export interface VerifyDeliveryCodeResponse {
  success: boolean;
  message: string;
  error?: string;
}

const functions = getFunctions(getApp(), 'us-central1');
const ensureDeliveryPinFn = httpsCallable(functions, 'ensureDeliveryPin');
const verifyDeliveryPinFn = httpsCallable(functions, 'verifyDeliveryPin');

async function readPinFromSecrets(orderId: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'deliverySecrets', orderId));
    const pin = snap.exists() ? (snap.data() as any)?.pin : null;
    return pin ? String(pin) : '';
  } catch (_) {
    return '';
  }
}

export const generateVerificationCode = async (
  orderId: string
): Promise<GenerateVerificationCodeResponse> => {
  const resolved = await resolveOrderRef(orderId);
  if (!resolved) {
    throw new Error(`Order ${orderId} not found`);
  }

  // PIN lives in deliverySecrets (owner+admin only). Public order docs may
  // still carry it on legacy orders — check both, then ask the server.
  let code = await readPinFromSecrets(resolved.id);

  if (!code) {
    const snap = await getDoc(resolved.ref);
    const data = snap.data() || {};
    code = getDeliveryPinFromOrder(data as Record<string, unknown>);
  }

  if (!code) {
    const res: any = await ensureDeliveryPinFn({ jobId: resolved.id, orderId: resolved.id });
    code = String(res?.data?.pin || '');
  }

  return {
    success: true,
    data: {
      orderId: resolved.id,
      code,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    },
  };
};

export const verifyDeliveryCode = async (
  request: VerifyDeliveryCodeRequest
): Promise<VerifyDeliveryCodeResponse> => {
  // Server-side verification — the PIN is never readable by the rider client.
  try {
    const res: any = await verifyDeliveryPinFn({ jobId: request.orderId, orderId: request.orderId, pin: request.code });
    if (res?.data?.ok) {
      return { success: true, message: 'Delivery verified successfully' };
    }
    return { success: false, message: 'Incorrect delivery PIN', error: 'INVALID_CODE' };
  } catch (e: any) {
    const msg = String(e?.message || 'Verification failed');
    return { success: false, message: msg, error: 'VERIFY_FAILED' };
  }
};

export const getVerificationCode = async (
  orderId: string
): Promise<GenerateVerificationCodeResponse> => generateVerificationCode(orderId);

export const isValidCodeFormat = (code: string): boolean =>
  code.length === DELIVERY_PIN_LENGTH && /^\d+$/.test(code);
