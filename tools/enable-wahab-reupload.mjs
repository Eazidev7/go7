import admin from 'firebase-admin';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const W = {
  id: 'wCudXeXdN7RwAadnxthdaUtr1FG3',
  name: 'Abdul Wahab',
  email: 'badmosaa.25@student.funaab.edu.ng',
  phone: '09038363122',
  cc: ['addulwahab@gmail.com', 'feyisetantobiloba@gmail.com'],
};

const adcPath = join(
  process.env.APPDATA || '',
  'firebase',
  'feyisetantobiloba_gmail_com_application_default_credentials.json'
);
process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;
readFileSync(adcPath);

if (!admin.apps.length) admin.initializeApp({ projectId: 'go7-delivery' });
const db = admin.firestore();
const ts = admin.firestore.FieldValue.serverTimestamp();

await db.collection('riders').doc(W.id).set({
  uid: W.id,
  name: W.name,
  fullName: W.name,
  email: W.email,
  phone: W.phone,
  status: 'pending',
  approved: false,
  applicationStatus: 'under_review',
  reuploadEnabled: true,
  reuploadRequestedAt: ts,
  updatedAt: ts,
}, { merge: true });

await db.collection('users').doc(W.id).set({
  uid: W.id,
  role: 'rider',
  displayName: W.name,
  name: W.name,
  email: W.email,
  phone: W.phone,
  reuploadEnabled: true,
  updatedAt: ts,
}, { merge: true });

console.log('Firestore OK: reuploadEnabled for', W.id);

let key = process.env.RESEND_API_KEY?.trim();
if (!key) {
  try {
    key = execSync(
      'npx -y firebase-tools@latest functions:secrets:access RESEND_API_KEY --project go7-delivery',
      { encoding: 'utf8' }
    ).trim();
  } catch {
    key = '';
  }
}

const url = 'https://go7.ng/rider/register';
const subject = 'Go7 Logistics — Please Complete Your Rider Application';
const html = [
  '<!DOCTYPE html><html><body style="font-family:Segoe UI,Arial,sans-serif;background:#f3f4f6;padding:24px">',
  '<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">',
  '<div style="background:#E0001B;padding:32px;text-align:center;color:#fff">',
  '<h1 style="margin:0">Complete Your Rider Application</h1></div>',
  '<div style="padding:32px;color:#374151;line-height:1.7">',
  `<p>Dear <strong>${W.name}</strong>,</p>`,
  '<p>Thank you for joining <strong>Go7 Logistics</strong>. Your documents were not fully saved due to a technical issue — now fixed.</p>',
  `<p>Please <strong>log in with ${W.phone}</strong> (do not create a new account) and re-upload your profile photo, ID, license, and vehicle photo.</p>`,
  `<p style="text-align:center;margin:32px 0"><a href="${url}" style="background:#E0001B;color:#fff;padding:16px 32px;text-decoration:none;border-radius:8px;font-weight:bold">Complete My Application</a></p>`,
  '<p>We will review within 24–48 hours.</p>',
  '<p>Warm regards,<br><strong>The Go7 Logistics Team</strong></p>',
  '</div></div></body></html>',
].join('');

let sentVia = '';
let messageId = '';

if (key) {
  const senders = [
    'Go7 <notifications@go7.ng>',
    'Go7 Logistics <onboarding@resend.dev>',
  ];
  for (const from of senders) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [W.email],
        cc: W.cc.filter((e) => e.toLowerCase() !== W.email.toLowerCase()),
        subject,
        html,
      }),
    });
    const text = await res.text();
    if (res.ok) {
      messageId = JSON.parse(text).id;
      sentVia = `Resend (${from})`;
      break;
    }
    console.warn('Resend sender failed:', from, text.slice(0, 120));
  }
}

if (!sentVia) {
  const brevoKey = process.env.BREVO_API_KEY?.trim();
  if (brevoKey) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoKey,
      },
      body: JSON.stringify({
        sender: { name: 'Go7 Logistics', email: 'notifications@go7.ng' },
        to: [{ email: W.email, name: W.name }],
        cc: W.cc
          .filter((e) => e.toLowerCase() !== W.email.toLowerCase())
          .map((email) => ({ email })),
        subject,
        htmlContent: html,
      }),
    });
    const text = await res.text();
    if (res.ok) {
      messageId = JSON.parse(text).messageId;
      sentVia = 'Brevo';
    } else {
      console.warn('Brevo failed:', text.slice(0, 200));
    }
  }
}

// Always try admin copy to feyisetantobiloba@gmail.com (separate send — CC often blocked)
if (key) {
  for (const from of ['Go7 <notifications@go7.ng>', 'Go7 Logistics <onboarding@resend.dev>']) {
    const adminRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: ['feyisetantobiloba@gmail.com'],
        subject: `[Admin copy] ${subject} — ${W.name}`,
        html: `<p style="font-family:sans-serif;color:#666">Rider email: <strong>${W.email}</strong> | CC: ${W.cc.join(', ')}</p>${html}`,
      }),
    });
    if (adminRes.ok) {
      const adminJson = await adminRes.json();
      console.log('Admin copy sent to feyisetantobiloba@gmail.com via', from, '| id:', adminJson.id);
      if (!sentVia) {
        sentVia = `Admin copy only (${from})`;
        messageId = adminJson.id;
      }
      break;
    }
    const errText = await adminRes.text();
    console.warn('Admin copy failed:', from, errText.slice(0, 120));
  }
}

if (!sentVia) {
  throw new Error('Email not sent: configure RESEND_API_KEY or BREVO_API_KEY.');
}

console.log('Email sent to', W.email, 'cc:', W.cc.join(', '), 'via', sentVia, '| id:', messageId);
