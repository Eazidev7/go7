/**
 * GO7 OTP Service using WhatsApp via Infobip
 * Handles sending and verifying OTP codes
 */

import { db } from '../firebase/config';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizePhone(phoneNumber) {
  let formattedPhone = String(phoneNumber).replace(/\D/g, '');
  if (formattedPhone.startsWith('234')) {
    formattedPhone = '0' + formattedPhone.substring(3);
  } else if (!formattedPhone.startsWith('0')) {
    formattedPhone = '0' + formattedPhone;
  }
  return formattedPhone;
}

async function saveOtpRecord(userId, contact, purpose, otpCode, expiresAt, channel = 'whatsapp') {
  const payload = {
    code: otpCode,
    phone: contact,
    email: channel === 'email' ? contact : null,
    channel,
    purpose,
    expiresAt,
    createdAt: serverTimestamp(),
    verified: false,
    attempts: 0,
  };

  // `otps` is writable on production rules today
  await setDoc(doc(db, 'otps', userId), payload);

  try {
    await setDoc(doc(db, 'otp_codes', userId), payload);
  } catch (error) {
    console.warn('otp_codes write skipped (rules/function path will use otps):', error?.message);
  }
}

async function readOtpRecord(userId) {
  const primary = await getDoc(doc(db, 'otp_codes', userId));
  if (primary.exists()) return primary;

  return getDoc(doc(db, 'otps', userId));
}

/**
 * Send OTP via WhatsApp
 */
export async function sendOTP(userId, phoneNumber, purpose = 'verification') {
  try {
    if (!userId || !phoneNumber) {
      throw new Error('Phone number is required');
    }

    const formattedPhone = normalizePhone(phoneNumber);
    const functions = getFunctions();

    try {
      const requestPhoneOTP = httpsCallable(functions, 'requestPhoneOTP');
      const result = await requestPhoneOTP({
        userId,
        phoneNumber: formattedPhone,
        purpose,
      });

      if (!result.data?.success) {
        throw new Error(result.data?.message || 'Failed to send WhatsApp OTP');
      }

      return {
        success: true,
        message: result.data.message || 'OTP sent to your WhatsApp',
      };
    } catch (cloudError) {
      const code = cloudError?.code || '';
      const functionsDown =
        code === 'functions/not-found' ||
        code === 'functions/unavailable' ||
        code === 'functions/internal' ||
        code === 'functions/failed-precondition' ||
        /not-found|unavailable|INTERNAL|Failed to fetch/i.test(String(cloudError?.message || code));

      if (!functionsDown) {
        throw cloudError;
      }

      console.warn('⚠️ requestPhoneOTP unavailable, using fallback OTP path');

      const otpCode = generateOTP();
      const expiresAt = Date.now() + (30 * 60 * 1000);

      await saveOtpRecord(userId, formattedPhone, purpose, otpCode, expiresAt);

      try {
        const sendAuthOTP = httpsCallable(functions, 'sendAuthOTP');
        const result = await sendAuthOTP({
          phoneNumber: formattedPhone,
          otp: otpCode,
        });

        if (!result.data?.success) {
          throw new Error('Failed to send WhatsApp OTP');
        }

        if (import.meta.env.DEV) {
          console.log('🔐 DEV OTP (fallback):', otpCode);
        }

        return {
          success: true,
          message: 'OTP sent to your WhatsApp',
          devOtp: import.meta.env.DEV ? otpCode : undefined,
        };
      } catch (sendError) {
        console.warn('⚠️ WhatsApp OTP delivery unavailable:', sendError?.message || sendError);
        return {
          success: false,
          code: 'OTP_DELIVERY_UNAVAILABLE',
          message:
            'WhatsApp OTP is temporarily unavailable. Submit your number for GO7 review to continue onboarding.',
        };
      }
    }
  } catch (error) {
    console.error('❌ Send OTP error:', error);

    if (error?.code === 'OTP_DELIVERY_UNAVAILABLE') {
      return error;
    }

    const message =
      error?.message ||
      error?.details?.message ||
      'Failed to send OTP. Please try again.';

    throw new Error(message);
  }
}

/**
 * Send OTP via email (Hostinger + Resend) — used when WhatsApp OTP is unavailable.
 * Email is always the signed-in Firebase account email (enforced server-side).
 */
export async function sendEmailOTP(userId, email, purpose = 'verification') {
  try {
    if (!userId) {
      throw new Error('User id is required');
    }

    const { auth } = await import('../firebase/config.js');
    const user = auth?.currentUser;
    if (!user) {
      throw new Error('Sign in required to send email OTP');
    }

    const targetEmail = String(email || user.email || '').trim().toLowerCase();
    if (!targetEmail.includes('@')) {
      throw new Error('No email on this account. Register with an email first.');
    }

    const otpCode = generateOTP();
    const expiresAt = Date.now() + 30 * 60 * 1000;
    await saveOtpRecord(userId, targetEmail, purpose, otpCode, expiresAt, 'email');

    const idToken = await user.getIdToken();
    let emailed = false;
    let deliveryError = null;

    try {
      const res = await fetch('/api/send-otp-email.php', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: otpCode,
          purpose,
        }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.ok && data?.success) {
        emailed = true;
      } else {
        deliveryError = data?.error || `Hostinger email failed (${res.status})`;
      }
    } catch (phpErr) {
      deliveryError = phpErr?.message || 'Hostinger email request failed';
    }

    // Fallback: client Resend (VITE_RESEND_API_KEY) when PHP key not set yet
    if (!emailed) {
      try {
        const { sendEmail } = await import('./emailSmsService.js');
        const mail = await sendEmail({
          to: targetEmail,
          subject: 'Your GO7 verification code',
          html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#E30613;margin:0 0 12px">GO7 verification</h2>
            <p style="color:#333;font-size:15px">Your verification code is:</p>
            <p style="font-size:32px;letter-spacing:8px;font-weight:700;color:#111;margin:16px 0">${otpCode}</p>
            <p style="color:#666;font-size:13px">This code expires in 30 minutes.</p>
          </div>`,
        });
        if (mail?.success) {
          emailed = true;
        } else {
          deliveryError = mail?.error || deliveryError || 'Resend email failed';
        }
      } catch (clientErr) {
        deliveryError = clientErr?.message || deliveryError;
      }
    }

    if (!emailed) {
      console.warn('⚠️ Email OTP delivery failed:', deliveryError);
      return {
        success: false,
        code: 'OTP_DELIVERY_UNAVAILABLE',
        message:
          deliveryError ||
          'Could not send the verification email. Check spam, or tap “Continue for admin review” to finish setup.',
      };
    }

    const masked = targetEmail.replace(/(.{2})(.*)(@.*)/, (_, a, mid, c) => a + '*'.repeat(Math.min(mid.length, 6)) + c);

    if (import.meta.env.DEV) {
      console.log('🔐 DEV email OTP:', otpCode);
    }

    return {
      success: true,
      message: `OTP sent to ${masked}. Check your inbox (and spam).`,
      email: targetEmail,
      channel: 'email',
      devOtp: import.meta.env.DEV ? otpCode : undefined,
    };
  } catch (error) {
    console.error('❌ Send email OTP error:', error);
    return {
      success: false,
      code: 'OTP_DELIVERY_UNAVAILABLE',
      message: error?.message || 'Failed to send email OTP.',
    };
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(userId, otpCode) {
  try {
    const otpDoc = await readOtpRecord(userId);

    if (!otpDoc.exists()) {
      return {
        success: false,
        message: 'No OTP found. Please request a new code.',
      };
    }

    const otpData = otpDoc.data();

    if (otpData.verified) {
      return {
        success: false,
        message: 'OTP already used. Please request a new code.',
      };
    }

    if (Date.now() > otpData.expiresAt) {
      return {
        success: false,
        message: 'OTP expired. Please request a new code.',
      };
    }

    if (otpData.code !== otpCode.trim()) {
      return {
        success: false,
        message: 'Invalid OTP code. Please try again.',
      };
    }

    const verifiedPayload = {
      ...otpData,
      verified: true,
      verifiedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'otps', userId), verifiedPayload);
    try {
      await setDoc(doc(db, 'otp_codes', userId), verifiedPayload);
    } catch (_) {}

    return {
      success: true,
      message: 'OTP verified successfully',
    };
  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
    };
  }
}
