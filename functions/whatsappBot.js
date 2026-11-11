/**
 * 🤖 GO7 WHATSAPP BOT — "Room & Engine" (Phase 1)
 *
 * Turns the Go7 WhatsApp business number into a mini-app.
 * Phase 1 scope: inbound message handling + per-user session engine +
 * in-chat OTP signup → full member creation.
 *
 * Membership is required on Go7, so new users register inside WhatsApp
 * (name + OTP), then get the member menu. Every reply funnels them back to
 * the Go7 app for live tracking.
 */

const { defineString } = require('firebase-functions/params');
const functions = require('firebase-functions/v1');
const admin = require('./adminInit');
const axios = require('axios');
const { resolveLocationText, listPopularLocations } = require('./locationResolver');
const billsService = require('./billsService');
const fuelService = require('./fuelService');

const firestore = admin.firestore();

// Infobip credentials (same config as infobipWhatsApp.js)
const INFOBIP_API_KEY = defineString('INFOBIP_API_KEY');
const INFOBIP_BASE_URL = defineString('INFOBIP_BASE_URL');
const INFOBIP_SENDER = defineString('INFOBIP_SENDER');
const INFOBIP_AUTH_TEMPLATE = defineString('INFOBIP_AUTH_TEMPLATE', { default: 'go7_auth_otp' });
const INFOBIP_WEBHOOK_SECRET = defineString('INFOBIP_WEBHOOK_SECRET', { default: '' });
const META_VERIFY_TOKEN = defineString('META_VERIFY_TOKEN', { default: '' });
const WHATSAPP_WEBHOOK_SECRET = defineString('WHATSAPP_WEBHOOK_SECRET', { default: '' });

function paramValue(param, fallback = '') {
  try {
    if (typeof param?.value === 'function') return param.value() || fallback;
  } catch (_) {}
  return fallback;
}

const getInfobipConfig = () => ({
  apiKey: paramValue(INFOBIP_API_KEY, process.env.INFOBIP_API_KEY || ''),
  baseUrl: paramValue(INFOBIP_BASE_URL, process.env.INFOBIP_BASE_URL || ''),
  sender: paramValue(INFOBIP_SENDER, process.env.INFOBIP_SENDER || '447860015662'),
  authTemplate: paramValue(INFOBIP_AUTH_TEMPLATE, process.env.INFOBIP_AUTH_TEMPLATE || 'otp'),
});

// ---------------------------------------------------------------------------
// Phone helpers
// ---------------------------------------------------------------------------
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) return `234${cleaned.slice(1)}`;
  if (cleaned.startsWith('234')) return cleaned;
  if (cleaned.startsWith('+234')) return cleaned.slice(1);
  return `234${cleaned}`;
};

const formatLocalPhone = (phone) => {
  let cleaned = String(phone || '').replace(/\D/g, '');
  if (cleaned.startsWith('234')) cleaned = '0' + cleaned.substring(3);
  if (cleaned && !cleaned.startsWith('0')) cleaned = '0' + cleaned;
  return cleaned;
};

// ---------------------------------------------------------------------------
// WhatsApp sending (Infobip)
// ---------------------------------------------------------------------------
async function sendWhatsAppText(phone, text) {
  const { apiKey, baseUrl, sender } = getInfobipConfig();
  if (!apiKey || !baseUrl || !sender) {
    console.error('❌ Infobip credentials not configured');
    return false;
  }
  const to = formatPhoneNumber(phone);
  try {
    // NOTE: The Infobip text endpoint uses a SINGLE-message structure with
    // from/to/content at the TOP LEVEL (NOT wrapped in a `messages` array).
    const response = await axios.post(
      `${baseUrl}/whatsapp/1/message/text`,
      {
        from: sender,
        to,
        content: { text },
      },
      {
        headers: {
          Authorization: `App ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );
    console.log('✅ Bot text sent to', to, JSON.stringify(response.data));
    return true;
  } catch (error) {
    console.error(
      '❌ Bot text error:',
      JSON.stringify(error.response?.data || error.message, null, 2)
    );
    return false;
  }
}

async function sendOtpTemplate(phone, otp) {
  const { apiKey, baseUrl, sender, authTemplate } = getInfobipConfig();
  if (!apiKey || !baseUrl || !sender) return false;
  const to = formatPhoneNumber(phone);
  try {
    const response = await axios.post(
      `${baseUrl}/whatsapp/1/message/template`,
      {
        messages: [
          {
            from: sender,
            to,
            content: {
              templateName: String(authTemplate || 'otp').trim() || 'otp',
              templateData: {
                body: { placeholders: [otp] },
                buttons: [{ type: 'URL', parameter: otp }],
              },
              language: 'en_GB',
            },
          },
        ],
      },
      {
        headers: {
          Authorization: `App ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );
    const message = response.data?.messages?.[0];
    const statusName = message?.status?.name || '';
    const statusGroup = message?.status?.groupName || '';
    const rejected =
      /REJECT/i.test(statusGroup) ||
      /REJECT/i.test(statusName) ||
      /UNDELIVERABLE/i.test(statusGroup);
    if (rejected) {
      console.error('❌ Infobip rejected OTP template:', statusName || statusGroup);
      return false;
    }
    console.log('✅ OTP template sent to', to);
    return true;
  } catch (error) {
    console.error('❌ Infobip OTP error:', error.response?.data || error.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------
async function getSession(phone) {
  const ref = firestore.collection('whatsapp_sessions').doc(phone);
  const snap = await ref.get();
  if (snap.exists) return { ref, data: snap.data() };
  return { ref, data: null };
}

async function setSession(phone, state, data = {}) {
  await firestore.collection('whatsapp_sessions').doc(phone).set(
    {
      phone,
      state,
      data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

// ---------------------------------------------------------------------------
// Member lookup
// ---------------------------------------------------------------------------
async function findMemberByPhone(phone) {
  const localPhone = formatLocalPhone(phone);
  const formats = [
    localPhone,
    localPhone.substring(1),
    '234' + localPhone.substring(1),
    '+234' + localPhone.substring(1),
  ];
  const fields = ['phoneNumber', 'phone', 'mobile', 'whatsapp', 'contactPhone'];
  for (const f of formats) {
    for (const field of fields) {
      const snap = await firestore.collection('users').where(field, '==', f).limit(1).get();
      if (!snap.empty) return snap.docs[0];
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// OTP helpers (consistent with existing signup flow)
// ---------------------------------------------------------------------------
async function sendSignupOtp(phone) {
  const localPhone = formatLocalPhone(phone);
  const userId = `signup_${localPhone}`;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 30 * 60 * 1000;
  const payload = {
    code,
    phone: localPhone,
    purpose: 'customer_signup_verification',
    expiresAt,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    verified: false,
    attempts: 0,
  };
  await firestore.collection('otp_codes').doc(userId).set(payload);
  await firestore.collection('otps').doc(userId).set(payload).catch(() => {});
  const delivered = await sendOtpTemplate(phone, code);
  return { delivered, userId, localPhone };
}

async function verifySignupOtp(phone, inputCode) {
  const localPhone = formatLocalPhone(phone);
  const userId = `signup_${localPhone}`;
  const doc = await firestore.collection('otp_codes').doc(userId).get();
  if (!doc.exists) return { ok: false, reason: 'no_otp' };
  const data = doc.data() || {};
  const attempts = data.attempts || 0;
  const expiresAtMs =
    typeof data.expiresAt?.toMillis === 'function'
      ? data.expiresAt.toMillis()
      : Number(data.expiresAt || 0);

  if (attempts >= 3) {
    await firestore.collection('otp_codes').doc(userId).delete().catch(() => {});
    return { ok: false, reason: 'too_many_attempts' };
  }
  if (!expiresAtMs || Date.now() > expiresAtMs) {
    await firestore.collection('otp_codes').doc(userId).delete().catch(() => {});
    return { ok: false, reason: 'expired' };
  }
  if (String(inputCode).trim() !== String(data.code).trim()) {
    await firestore
      .collection('otp_codes')
      .doc(userId)
      .update({ attempts: admin.firestore.FieldValue.increment(1) });
    return { ok: false, reason: 'invalid', remaining: Math.max(0, 2 - attempts) };
  }
  await firestore
    .collection('otp_codes')
    .doc(userId)
    .set({ verified: true, verifiedAt: Date.now() }, { merge: true });
  return { ok: true, userId, localPhone };
}

// ---------------------------------------------------------------------------
// Member creation (Firebase Auth + users doc)
// ---------------------------------------------------------------------------
async function createMember(phone, name) {
  const localPhone = formatLocalPhone(phone);
  const existing = await findMemberByPhone(phone);
  if (existing) return { ok: true, uid: existing.id, existed: true };

  let uid;
  try {
    const userRecord = await admin.auth().createUser({
      phoneNumber: `+${formatPhoneNumber(phone)}`,
      displayName: name || 'Go7 Member',
    });
    uid = userRecord.uid;
  } catch (error) {
    // If the phone already has an auth account, fetch it by phone
    const existingAuth = await admin
      .auth()
      .getUserByPhoneNumber(`+${formatPhoneNumber(phone)}`)
      .catch(() => null);
    if (existingAuth) {
      uid = existingAuth.uid;
    } else {
      throw error;
    }
  }

  await firestore.collection('users').doc(uid).set(
    {
      uid,
      name: name || 'Go7 Member',
      displayName: name || 'Go7 Member',
      phone: localPhone,
      phoneNumber: localPhone,
      whatsapp: localPhone,
      accountType: 'member',
      role: 'customer',
      source: 'whatsapp_bot',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return { ok: true, uid, existed: false };
}

// ---------------------------------------------------------------------------
// Ordering / booking / tracking / wallet helpers
// ---------------------------------------------------------------------------
async function listVendors() {
  const snap = await firestore.collection('vendors').where('active', '==', true).limit(10).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((v) => v.name || v.businessName);
}

async function listVendorItems(vendorId) {
  const snap = await firestore
    .collection(`vendors/${vendorId}/products`)
    .where('active', '==', true)
    .limit(20)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getMemberUid(phone) {
  const member = await findMemberByPhone(phone);
  return member ? member.id : null;
}

async function getWallet(uid) {
  const snap = await firestore.collection('wallets').doc(uid).get();
  return snap.exists ? Number(snap.data().balance) || 0 : 0;
}

async function createOrder(uid, orderData) {
  const ref = await firestore.collection('orders').add({
    ...orderData,
    userId: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

async function createBooking(uid, bookingData) {
  const ref = await firestore.collection('bookings').add({
    ...bookingData,
    userId: uid,
    status: 'pending',
    paymentStatus: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

async function getOrderStatus(id) {
  const order = await firestore.collection('orders').doc(id).get();
  if (order.exists) return { type: 'order', data: order.data() };
  const booking = await firestore.collection('bookings').doc(id).get();
  if (booking.exists) return { type: 'booking', data: booking.data() };
  return null;
}

// Simple distance (km) between two points
function haversineKm(a, b) {
  if (!a || !b) return 0;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function validateCoords(raw, label = 'location') {
  const lat = Number(raw && (raw.lat !== undefined ? raw.lat : raw.latitude));
  const lng = Number(raw && (raw.lng !== undefined ? raw.lng : raw.longitude));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`${label} coordinates must be finite numbers`);
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error(`${label} coordinates out of range`);
  }
  const isZeroPlaceholder = Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001;
  if (isZeroPlaceholder) {
    throw new Error(`${label} coordinates are a 0,0 placeholder — not a real location`);
  }
  return { lat, lng };
}

// ---------------------------------------------------------------------------
// Order food flow
// ---------------------------------------------------------------------------
async function startOrdering(phone) {
  const vendors = await listVendors();
  if (vendors.length === 0) {
    return sendWhatsAppText(phone, 'Sorry, no vendors are available right now. Please try again later.');
  }
  await setSession(phone, 'ordering', { orderStep: 'vendor', cart: [] });
  const list = vendors.map((v, i) => `${i + 1}. ${v.businessName || v.name}`).join('\n');
  return sendWhatsAppText(phone, `🍔 *Order Food*\n\nChoose a vendor:\n\n${list}\n\nReply with a number, or \"cancel\" to go back.`);
}

async function handleOrderingStep(phone, text, data, locationAttachment = null) {
  const t = (text || '').trim();
  const step = data?.orderStep || 'vendor';
  const cart = data?.cart || [];

  if (/^(cancel|back|menu|stop)$/i.test(t)) {
    await setSession(phone, 'main_menu', {});
    return sendWhatsAppText(phone, MAIN_MENU);
  }

  if (step === 'vendor') {
    const vendors = await listVendors();
    const idx = parseInt(t, 10) - 1;
    if (isNaN(idx) || !vendors[idx]) {
      return sendWhatsAppText(phone, 'Please reply with a valid vendor number.');
    }
    const vendor = vendors[idx];
    const items = await listVendorItems(vendor.id);
    if (items.length === 0) {
      return sendWhatsAppText(phone, `Sorry, ${vendor.businessName || vendor.name} has no items right now.`);
    }
    await setSession(phone, 'ordering', { orderStep: 'item', vendorId: vendor.id, vendorName: vendor.businessName || vendor.name, items, cart });
    const list = items.map((it, i) => `${i + 1}. ${it.name} - ₦${Number(it.basePrice || it.price || 0).toLocaleString()}`).join('\n');
    return sendWhatsAppText(phone, `🍽️ *${vendor.businessName || vendor.name}*\n\n${list}\n\nReply with an item number.`);
  }

  if (step === 'item') {
    const items = data?.items || [];
    const idx = parseInt(t, 10) - 1;
    if (isNaN(idx) || !items[idx]) {
      return sendWhatsAppText(phone, 'Please reply with a valid item number.');
    }
    const item = items[idx];
    await setSession(phone, 'ordering', { ...data, orderStep: 'qty', selectedItem: item });
    return sendWhatsAppText(phone, `How many *${item.name}*? (reply a number)`);
  }

  if (step === 'qty') {
    const qty = parseInt(t, 10);
    const item = data?.selectedItem;
    if (isNaN(qty) || qty < 1 || !item) {
      return sendWhatsAppText(phone, 'Please reply a valid quantity (e.g. 2).');
    }
    const price = Number(item.basePrice || item.price || 0);
    const newCart = [...cart, { productId: item.id, name: item.name, qty, price }];
    await setSession(phone, 'ordering', { ...data, orderStep: 'cart', cart: newCart });
    const subtotal = newCart.reduce((s, c) => s + c.price * c.qty, 0);
    return sendWhatsAppText(
      phone,
      `🛒 *Your cart*\n\n${newCart.map((c) => `${c.name} x${c.qty} - ₦${(c.price * c.qty).toLocaleString()}`).join('\n')}\n\nSubtotal: ₦${subtotal.toLocaleString()}\n\nReply *1* to add more, or *2* to checkout.`
    );
  }

  if (step === 'cart') {
    if (t === '1') {
      const items = data?.items || [];
      const list = items.map((it, i) => `${i + 1}. ${it.name} - ₦${Number(it.basePrice || it.price || 0).toLocaleString()}`).join('\n');
      await setSession(phone, 'ordering', { ...data, orderStep: 'item' });
      return sendWhatsAppText(phone, `🍽️ Choose another item:\n\n${list}`);
    }
    if (t === '2') {
      await setSession(phone, 'ordering', { ...data, orderStep: 'delivery_type' });
      return sendWhatsAppText(phone, `📦 How do you want it?\n\nReply *1* for Pickup, or *2* for Delivery.`);
    }
    return sendWhatsAppText(phone, 'Reply *1* to add more, or *2* to checkout.');
  }

  if (step === 'delivery_type') {
    if (t === '1') {
      await setSession(phone, 'ordering', { ...data, orderStep: 'confirm', deliveryType: 'pickup' });
      return confirmOrderPrompt(phone, data);
    }
    if (t === '2') {
      await setSession(phone, 'ordering', { ...data, orderStep: 'location', deliveryType: 'delivery' });
      const popular = await listPopularLocations(8);
      const quick = popular.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
      return sendWhatsAppText(phone, `📍 Where should we deliver?\n\nType your address/area, or pick one:\n\n${quick}`);
    }
    return sendWhatsAppText(phone, 'Reply *1* for Pickup, or *2* for Delivery.');
  }

  if (step === 'location') {
    const resolved = locationAttachment
      ? { name: locationAttachment.address || 'Shared location', lat: locationAttachment.lat, lng: locationAttachment.lng, type: 'coordinates' }
      : await resolveLocationText(t);
    if (!resolved) {
      return sendWhatsAppText(phone, `I couldn’t find \"${t}\". Try a known area/landmark (e.g. Kuto, Olumo Rock, Federal Medical Centre) or share your location.`);
    }
    await setSession(phone, 'ordering', { ...data, orderStep: 'confirm', deliveryAddress: resolved });
    return confirmOrderPrompt(phone, { ...data, deliveryAddress: resolved });
  }

  if (step === 'confirm') {
    if (/^(yes|y|confirm|ok)$/i.test(t)) {
      const uid = await getMemberUid(phone);
      if (!uid) {
        await setSession(phone, 'main_menu', {});
        return sendWhatsAppText(phone, 'Account not found. Please restart.');
      }
      try {
        if (data?.deliveryType === 'delivery') {
          validateCoords(data?.deliveryAddress, 'delivery address');
        }
      } catch (err) {
        await setSession(phone, 'ordering', { ...data, orderStep: 'location' });
        return sendWhatsAppText(phone, `⚠️ ${err.message}. Please share your location or type a nearby area.`);
      }
      const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
      const deliveryFee = data?.deliveryType === 'delivery' ? 700 : 0;
      const orderId = await createOrder(uid, {
        vendorId: data.vendorId,
        orderType: 'food',
        type: 'food',
        serviceType: 'food',
        items: cart,
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        status: 'pending',
        orderStatus: 'pending_vendor',
        deliveryType: data.deliveryType || 'pickup',
        deliveryAddress: data.deliveryAddress ? { address: data.deliveryAddress.name, coordinates: { lat: data.deliveryAddress.lat, lng: data.deliveryAddress.lng } } : null,
        customer: { phone },
        customerPhone: phone,
        payment: { method: 'POD', status: 'pending' },
        paymentStatus: 'pending',
        source: 'whatsapp_bot',
      });
      await setSession(phone, 'main_menu', {});
      return sendWhatsAppText(
        phone,
        `✅ *Order placed!*\n\nOrder ID: ${orderId}\nTotal: ₦${(subtotal + deliveryFee).toLocaleString()}\n\nTrack it here: 👉 https://go7.ng/track/${orderId}\n\nWe’ll update you as it progresses.`
      );
    }
    return sendWhatsAppText(phone, 'Reply *yes* to confirm your order, or *cancel* to go back.');
  }

  return sendWhatsAppText(phone, MAIN_MENU);
}

async function confirmOrderPrompt(phone, data) {
  const cart = data?.cart || [];
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const deliveryFee = data?.deliveryType === 'delivery' ? 700 : 0;
  const lines = cart.map((c) => `${c.name} x${c.qty} - ₦${(c.price * c.qty).toLocaleString()}`).join('\n');
  const addr = data?.deliveryAddress ? `\n📍 Deliver to: ${data.deliveryAddress.name}` : '\n📍 Pickup';
  return sendWhatsAppText(
    phone,
    `🧾 *Confirm your order*\n\n${lines}\nSubtotal: ₦${subtotal.toLocaleString()}\nDelivery: ₦${deliveryFee.toLocaleString()}\nTotal: ₦${(subtotal + deliveryFee).toLocaleString()}${addr}\n\nReply *yes* to confirm, or *cancel* to go back.`
  );
}

// ---------------------------------------------------------------------------
// Book delivery flow
// ---------------------------------------------------------------------------
async function startBooking(phone) {
  await setSession(phone, 'booking', { bookingStep: 'pickup' });
  const popular = await listPopularLocations(8);
  const quick = popular.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
  return sendWhatsAppText(phone, `📦 *Book a Delivery*\n\nWhere should the rider pick up from?\n\nType an address/area, or pick one:\n\n${quick}`);
}

async function handleBookingStep(phone, text, data, locationAttachment = null) {
  const t = (text || '').trim();
  const step = data?.bookingStep || 'pickup';

  if (/^(cancel|back|menu|stop)$/i.test(t) && !locationAttachment) {
    await setSession(phone, 'main_menu', {});
    return sendWhatsAppText(phone, MAIN_MENU);
  }

  if (step === 'pickup') {
    const resolved = locationAttachment
      ? { name: locationAttachment.address || 'Shared location', lat: locationAttachment.lat, lng: locationAttachment.lng, type: 'coordinates' }
      : await resolveLocationText(t);
    if (!resolved) return sendWhatsAppText(phone, `I couldn’t find \"${t}\". Try a known area/landmark, or share your location.`);
    await setSession(phone, 'booking', { ...data, bookingStep: 'dropoff', pickup: resolved });
    const popular = await listPopularLocations(8);
    const quick = popular.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    return sendWhatsAppText(phone, `📍 Pickup: *${resolved.name}*\n\nWhere should it be delivered to?\n\nType an address/area, or pick one:\n\n${quick}`);
  }

  if (step === 'dropoff') {
    const resolved = locationAttachment
      ? { name: locationAttachment.address || 'Shared location', lat: locationAttachment.lat, lng: locationAttachment.lng, type: 'coordinates' }
      : await resolveLocationText(t);
    if (!resolved) return sendWhatsAppText(phone, `I couldn’t find \"${t}\". Try a known area/landmark, or share your location.`);
    const pickup = data?.pickup;
    const distanceKm = haversineKm(pickup, resolved);
    const baseFee = 700;
    const perKm = 100;
    const fare = Math.round(baseFee + Math.max(0, distanceKm - 3) * perKm);
    await setSession(phone, 'booking', { ...data, bookingStep: 'confirm', dropoff: resolved, distanceKm, fare });
    return sendWhatsAppText(
      phone,
      `🧾 *Delivery summary*\n\nPickup: ${pickup.name}\nDropoff: ${resolved.name}\nDistance: ~${distanceKm.toFixed(1)} km\nFare: ₦${fare.toLocaleString()}\n\nReply *yes* to confirm, or *cancel* to go back.`
    );
  }

  if (step === 'confirm') {
    if (/^(yes|y|confirm|ok)$/i.test(t)) {
      const uid = await getMemberUid(phone);
      if (!uid) {
        await setSession(phone, 'main_menu', {});
        return sendWhatsAppText(phone, 'Account not found. Please restart.');
      }
      try {
        validateCoords(data?.pickup, 'pickup');
        validateCoords(data?.dropoff, 'dropoff');
      } catch (err) {
        await setSession(phone, 'booking', { ...data, bookingStep: 'pickup' });
        return sendWhatsAppText(phone, `⚠️ ${err.message}. Please start again and share a real pickup/dropoff.`);
      }
      const bookingId = await createBooking(uid, {
        pickupAddress: data.pickup.name,
        dropoffAddress: data.dropoff.name,
        pickupCoordinates: { lat: data.pickup.lat, lng: data.pickup.lng },
        dropoffCoordinates: { lat: data.dropoff.lat, lng: data.dropoff.lng },
        pickup: { lat: data.pickup.lat, lng: data.pickup.lng, address: data.pickup.name },
        dropoff: { lat: data.dropoff.lat, lng: data.dropoff.lng, address: data.dropoff.name },
        estimatedFee: data.fare,
        fare: data.fare,
        price: data.fare,
        distanceKm: data.distanceKm,
        deliveryMode: 'standard',
        sender: { phone },
        customer: { phone, uid },
        source: 'whatsapp_bot',
      });
      await setSession(phone, 'main_menu', {});
      return sendWhatsAppText(
        phone,
        `✅ *Delivery booked!*\n\nBooking ID: ${bookingId}\nFare: ₦${data.fare.toLocaleString()}\n\nTrack it here: 👉 https://go7.ng/track/${bookingId}\n\nWe’ll assign a rider shortly.`
      );
    }
    return sendWhatsAppText(phone, 'Reply *yes* to confirm, or *cancel* to go back.');
  }

  return sendWhatsAppText(phone, MAIN_MENU);
}

// ---------------------------------------------------------------------------
// Tracking flow
// ---------------------------------------------------------------------------
async function startTracking(phone) {
  await setSession(phone, 'tracking', {});
  return sendWhatsAppText(phone, `📍 *Track a package*\n\nSend me your order or delivery ID (e.g. from your confirmation message), or tap here: 👉 https://go7.ng/track`);
}

async function handleTrackingStep(phone, text) {
  const id = (text || '').trim();
  if (/^(cancel|back|menu|stop)$/i.test(id)) {
    await setSession(phone, 'main_menu', {});
    return sendWhatsAppText(phone, MAIN_MENU);
  }
  const result = await getOrderStatus(id);
  if (!result) {
    return sendWhatsAppText(phone, `I couldn’t find an order/delivery with ID \"${id}\". Check the ID and try again.`);
  }
  const d = result.data;
  const status = d.status || d.paymentStatus || 'pending';
  const total = d.total || d.fare || d.estimatedFee || 0;
  await setSession(phone, 'main_menu', {});
  return sendWhatsAppText(
    phone,
    `📍 *${result.type === 'order' ? 'Order' : 'Delivery'} ${id}*\n\nStatus: ${status}\nAmount: ₦${Number(total).toLocaleString()}\n\nTrack live here: 👉 https://go7.ng/track/${id}`
  );
}

// ---------------------------------------------------------------------------
// Wallet flow
// ---------------------------------------------------------------------------
async function showWallet(phone) {
  const uid = await getMemberUid(phone);
  if (!uid) {
    await setSession(phone, 'main_menu', {});
    return sendWhatsAppText(phone, 'Account not found. Please restart.');
  }
  const balance = await getWallet(uid);
  await setSession(phone, 'main_menu', {});
  return sendWhatsAppText(
    phone,
    `💳 *Your Go7 Wallet*\n\nBalance: ₦${balance.toLocaleString()}\n\nTop up or manage your wallet in the app: 👉 https://go7.ng/profile`
  );
}

// ---------------------------------------------------------------------------
// Airtime / Data flow
// ---------------------------------------------------------------------------
const { applyMarkup: applyBillsMarkup, loadBillsPricing } = require('./billsPricing');

const BLOCKED_DATA_PLAN_IDS = new Set([73, 76, 77]);

function normalizeDataNetworkName(name) {
  const n = String(name || '').trim().toUpperCase();
  if (['MTN', 'MCI', 'MTN NIGERIA'].includes(n)) return 'MTN';
  if (['AIRTEL', 'AIRTEL NIGERIA'].includes(n)) return 'AIRTEL';
  if (['GLO', 'GLOBACOM', 'GLO MOBILE'].includes(n)) return 'GLO';
  if (['9MOBILE', '9 MOBILE', 'ETISALAT'].includes(n)) return '9MOBILE';
  return n;
}

function isBotDisplayPlan(plan) {
  const id = Number(plan?.id);
  if (!Number.isFinite(id) || id <= 0) return false;
  if (BLOCKED_DATA_PLAN_IDS.has(id)) return false;
  return true;
}

async function fetchDataPlans() {
  const key = process.env.SMEAPI_KEY || functions.config().smeapi?.key;
  try {
    const headers = key ? { Authorization: `Token ${key}` } : {};
    const res = await axios.get('https://smeapi.com.ng/api/dataplans/', {
      headers,
      timeout: 15000,
    });
    const plans = Array.isArray(res.data?.data) ? res.data.data : [];
    return plans.filter(isBotDisplayPlan);
  } catch (e) {
    console.error('❌ fetchDataPlans error:', e.message);
    return [];
  }
}

function getDataNetworks(plans) {
  const set = new Set();
  for (const p of plans || []) {
    const n = normalizeDataNetworkName(p.network || p.network_name);
    if (n) set.add(n);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

async function getAvailableDataNetworks() {
  const plans = await fetchDataPlans();
  return getDataNetworks(plans);
}

async function startBills(phone) {
  await setSession(phone, 'bills', { billsType: null, step: 'type' });
  return sendWhatsAppText(phone, `📲 *Buy Airtime / Data*\n\nReply *1* for Airtime, or *2* for Data.`);
}

async function handleBillsStep(phone, text, data) {
  const t = (text || '').trim();
  const billsType = data?.billsType;
  const step = data?.step || 'type';

  if (/^(cancel|back|menu|stop)$/i.test(t)) {
    await setSession(phone, 'main_menu', {});
    return sendWhatsAppText(phone, MAIN_MENU);
  }

  // Choose airtime or data
  if (step === 'type') {
    let billsType;
    if (t === '1') {
      billsType = 'airtime';
    } else if (t === '2') {
      billsType = 'data';
    } else {
      return sendWhatsAppText(phone, 'Reply *1* for Airtime, or *2* for Data.');
    }
    const networks = await getAvailableDataNetworks();
    if (networks.length === 0) {
      await setSession(phone, 'main_menu', {});
      return sendWhatsAppText(phone, 'Sorry, bill payments are unavailable right now. Please try again later.');
    }
    await setSession(phone, 'bills', { ...data, billsType, step: 'network', networks });
    const list = networks.map((n, i) => `${i + 1}. ${n}`).join('\n');
    return sendWhatsAppText(phone, `📡 Choose a network:\n\n${list}\n\nReply with a number.`);
  }

  // Choose network
  if (step === 'network') {
    const networks = data?.networks || [];
    const idx = parseInt(t, 10) - 1;
    if (isNaN(idx) || !networks[idx]) return sendWhatsAppText(phone, 'Please reply a valid network number.');
    const network = networks[idx];
    if (billsType === 'airtime') {
      await setSession(phone, 'bills', { ...data, step: 'phone', network });
      return sendWhatsAppText(phone, `📞 Enter the phone number to top up (e.g. 08012345678):`);
    }
    // data → fetch plans for this network
    const allPlans = await fetchDataPlans();
    const plans = allPlans.filter((p) => normalizeDataNetworkName(p.network || p.network_name) === network);
    if (plans.length === 0) return sendWhatsAppText(phone, `Sorry, no data plans available for ${network} right now.`);
    const pricing = await loadBillsPricing(firestore);
    const list = plans.slice(0, 10).map((p, i) => {
      const cost = Number(p.price || p.user_price || 0);
      const priced = applyBillsMarkup(cost, 'data', pricing, { planId: p.id });
      return `${i + 1}. ${p.name || p.displayName} - ₦${priced.sellPrice.toLocaleString()}`;
    }).join('\n');
    await setSession(phone, 'bills', { ...data, step: 'plan', network, plans, pricing });
    return sendWhatsAppText(phone, `📶 *${network} data plans*\n\n${list}\n\nReply with a plan number.`);
  }

  // Choose data plan
  if (step === 'plan') {
    const plans = data?.plans || [];
    const idx = parseInt(t, 10) - 1;
    if (isNaN(idx) || !plans[idx]) return sendWhatsAppText(phone, 'Please reply a valid plan number.');
    const plan = plans[idx];
    await setSession(phone, 'bills', { ...data, step: 'phone', plan });
    return sendWhatsAppText(phone, `📞 Enter the phone number for the data (e.g. 08012345678):`);
  }

  // Enter phone
  if (step === 'phone') {
    const phoneNum = t.replace(/\D/g, '');
    if (phoneNum.length < 10) return sendWhatsAppText(phone, 'Please enter a valid phone number (e.g. 08012345678).');
    const next = billsType === 'airtime' ? 'amount' : 'confirm';
    if (billsType === 'airtime') {
      await setSession(phone, 'bills', { ...data, step: next, phone: phoneNum });
      return sendWhatsAppText(phone, `💰 Enter the airtime amount (e.g. 100, 200, 500):`);
    }
    const plan = data?.plan;
    const pricing = data?.pricing || await loadBillsPricing(firestore);
    const cost = Number(plan?.price || plan?.user_price || 0);
    const priced = applyBillsMarkup(cost, 'data', pricing, { planId: plan?.id });
    const planSellPrice = priced.sellPrice;
    await setSession(phone, 'bills', { ...data, step: next, phone: phoneNum, planSellPrice, pricing });
    return sendWhatsAppText(
      phone,
      `🧾 *Confirm*\n\nNetwork: ${data.network}\nPlan: ${plan.name || plan.displayName}\nPhone: ${phoneNum}\nPrice: ₦${planSellPrice.toLocaleString()}\n\nReply *yes* to confirm.`
    );
  }

  // Airtime amount
  if (billsType === 'airtime' && step === 'amount') {
    const amount = parseInt(t, 10);
    if (isNaN(amount) || amount < 50) return sendWhatsAppText(phone, 'Please enter a valid amount (min ₦50).');
    await setSession(phone, 'bills', { ...data, step: 'confirm', amount });
    return sendWhatsAppText(phone, `🧾 *Confirm*\n\nNetwork: ${data.network}\nPhone: ${data.phone}\nAmount: ₦${amount.toLocaleString()}\n\nReply *yes* to confirm.`);
  }

  // Confirm
  if (step === 'confirm') {
    if (!/^(yes|y|confirm|ok)$/i.test(t)) return sendWhatsAppText(phone, 'Reply *yes* to confirm, or *cancel* to go back.');
    const uid = await getMemberUid(phone);
    if (!uid) {
      await setSession(phone, 'main_menu', {});
      return sendWhatsAppText(phone, 'Account not found. Please restart.');
    }
    try {
      if (billsType === 'airtime') {
        const res = await billsService.purchaseAirtimeInternal(
          { network: data.network, phone: data.phone, amount: data.amount },
          uid
        );
        await setSession(phone, 'main_menu', {});
        return sendWhatsAppText(phone, `✅ *Airtime purchased!*\n\n${data.network} ₦${data.amount} for ${data.phone}.\n\nCheck your wallet in the app: 👉 https://go7.ng/profile`);
      } else {
        const plan = data?.plan;
        const res = await billsService.purchaseDataBundleInternal(
          { network: data.network, phone: data.phone, dataPlan: plan.id },
          uid
        );
        await setSession(phone, 'main_menu', {});
        return sendWhatsAppText(phone, `✅ *Data purchased!*\n\n${data.network} ${plan.name || plan.displayName} for ${data.phone}.\n\nCheck your wallet in the app: 👉 https://go7.ng/profile`);
      }
    } catch (err) {
      return sendWhatsAppText(phone, `❌ Purchase failed: ${err.message || 'Please try again.'}`);
    }
  }

  return sendWhatsAppText(phone, MAIN_MENU);
}

// ---------------------------------------------------------------------------
// Fuel order flow
// ---------------------------------------------------------------------------
const FUEL_TYPES = [
  { id: 'petrol', name: 'Petrol' },
  { id: 'diesel', name: 'Diesel' },
  { id: 'cng', name: 'CNG (gas)' },
];

async function startFuel(phone) {
  await setSession(phone, 'fuel', { step: 'type' });
  const list = FUEL_TYPES.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
  return sendWhatsAppText(phone, `⛽ *Order Fuel*\n\nChoose a fuel type:\n\n${list}\n\nReply with a number.`);
}

async function handleFuelStep(phone, text, data, locationAttachment = null) {
  const t = (text || '').trim();
  const step = data?.step || 'type';

  if (/^(cancel|back|menu|stop)$/i.test(t) && !locationAttachment) {
    await setSession(phone, 'main_menu', {});
    return sendWhatsAppText(phone, MAIN_MENU);
  }

  if (step === 'type') {
    const idx = parseInt(t, 10) - 1;
    if (isNaN(idx) || !FUEL_TYPES[idx]) return sendWhatsAppText(phone, 'Please reply a valid fuel type number.');
    const fuelType = FUEL_TYPES[idx].id;
    await setSession(phone, 'fuel', { ...data, step: 'amount', fuelType });
    return sendWhatsAppText(phone, `💰 Enter the amount you want to spend (e.g. 5000):`);
  }

  if (step === 'amount') {
    const amount = parseInt(t, 10);
    if (isNaN(amount) || amount < 1000) return sendWhatsAppText(phone, 'Please enter a valid amount (min ₦1,000).');
    await setSession(phone, 'fuel', { ...data, step: 'location', amount });
    const popular = await listPopularLocations(8);
    const quick = popular.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    return sendWhatsAppText(phone, `📍 Where should the fuel be delivered?\n\nType an address/area, or pick one:\n\n${quick}`);
  }

  if (step === 'location') {
    const resolved = locationAttachment
      ? { name: locationAttachment.address || 'Shared location', lat: locationAttachment.lat, lng: locationAttachment.lng, type: 'coordinates' }
      : await resolveLocationText(t);
    if (!resolved) return sendWhatsAppText(phone, `I couldn’t find \"${t}\". Try a known area/landmark, or share your location.`);
    await setSession(phone, 'fuel', { ...data, step: 'confirm', location: resolved });
    const typeName = FUEL_TYPES.find((f) => f.id === data.fuelType)?.name || data.fuelType;
    return sendWhatsAppText(
      phone,
      `🧾 *Confirm fuel order*\n\nType: ${typeName}\nAmount: ₦${Number(data.amount).toLocaleString()}\nDeliver to: ${resolved.name}\n\nReply *yes* to confirm, or *cancel* to go back.`
    );
  }

  if (step === 'confirm') {
    if (!/^(yes|y|confirm|ok)$/i.test(t)) return sendWhatsAppText(phone, 'Reply *yes* to confirm, or *cancel* to go back.');
    const uid = await getMemberUid(phone);
    if (!uid) {
      await setSession(phone, 'main_menu', {});
      return sendWhatsAppText(phone, 'Account not found. Please restart.');
    }
    try {
      validateCoords(data?.location, 'delivery location');
      const res = await fuelService.createFuelOrderInternal(
        {
          fuelType: data.fuelType,
          amount: data.amount,
          deliveryLocation: { lat: data.location.lat, lng: data.location.lng, address: data.location.name },
          paymentMethod: 'wallet',
        },
        uid
      );
      const orderId = res?.orderId || '';
      const total = res?.totalAmount || data.amount;
      await setSession(phone, 'main_menu', {});
      return sendWhatsAppText(
        phone,
        `✅ *Fuel order placed!*\n\nOrder ID: ${orderId}\nTotal: ₦${Number(total).toLocaleString()}\n\nTrack it here: 👉 https://go7.ng/track/${orderId}\n\nWe’ll assign a rider shortly.`
      );
    } catch (err) {
      return sendWhatsAppText(phone, `❌ Fuel order failed: ${err.message || 'Please try again.'}`);
    }
  }

  return sendWhatsAppText(phone, MAIN_MENU);
}

// ---------------------------------------------------------------------------
// Bot replies / menu
// ---------------------------------------------------------------------------
const MAIN_MENU = `👋 Welcome to Go7!

What would you like to do?
1️⃣ Order food
2️⃣ Book a delivery
3️⃣ Track a package
4️⃣ Check wallet
5️⃣ Set my delivery location
6️⃣ Buy airtime / data
7️⃣ Order fuel
8️⃣ Talk to support

Reply with a number, or just type what you need.`;

async function handleMemberMenu(phone, text) {
  const t = (text || '').trim().toLowerCase();
  if (t === '1' || t.includes('order') || t.includes('food')) {
    return startOrdering(phone);
  } else if (t === '2' || t.includes('book') || t.includes('delivery')) {
    return startBooking(phone);
  } else if (t === '3' || t.includes('track')) {
    return startTracking(phone);
  } else if (t === '4' || t.includes('wallet')) {
    return showWallet(phone);
  } else if (t === '5' || t.includes('location') || t.includes('address') || t.includes('where')) {
    // Start location capture
    await setSession(phone, 'awaiting_location', {});
    const popular = await listPopularLocations(8);
    const quick = popular.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    await sendWhatsAppText(
      phone,
      `📍 *Set your delivery location*\n\nType your address or area (e.g. \"Oke-Ilewo\", \"Federal Medical Centre\", \"Kuto\"), or share your location, or pick one:\n\n${quick}`
    );
  } else if (t === '6' || t.includes('airtime') || t.includes('data') || t.includes('recharge')) {
    return startBills(phone);
  } else if (t === '7' || t.includes('fuel') || t.includes('petrol') || t.includes('diesel') || t.includes('gas')) {
    return startFuel(phone);
  } else if (t === '8' || t.includes('support') || t.includes('help')) {
    await sendWhatsAppText(
      phone,
      '🛟 *Support*\n\nA support agent will be with you shortly. You can also reach us in the app.\n\n👉 https://go7.ng'
    );
  } else {
    await sendWhatsAppText(phone, MAIN_MENU);
  }
}

// Handle a location capture step: resolve typed text and confirm.
async function handleLocationStep(phone, text, sessionData, locationAttachment = null) {
  const t = (text || '').trim();

  // Allow user to cancel
  if (/^(cancel|back|menu|stop)$/i.test(t) && !locationAttachment) {
    await setSession(phone, 'main_menu', {});
    return sendWhatsAppText(phone, MAIN_MENU);
  }

  // Try to resolve the typed address/area or use shared location
  const resolved = locationAttachment
    ? { name: locationAttachment.address || 'Shared location', lat: locationAttachment.lat, lng: locationAttachment.lng, type: 'coordinates' }
    : await resolveLocationText(t);
  if (!resolved) {
    return sendWhatsAppText(
      phone,
      `I couldn’t find \"${t}\" yet. Try a well-known area or landmark (e.g. Kuto, Panseke, Olumo Rock, Federal Medical Centre), or share your location.`
    );
  }

  // Save the resolved location and ask for confirmation
  await setSession(phone, 'confirm_location', { location: resolved });
  return sendWhatsAppText(
    phone,
    `📍 I found: *${resolved.name}* (${resolved.type})\n\nIs this correct? Reply *Yes* to confirm, or type a different place.`
  );
}

// Confirm the resolved location.
async function handleLocationConfirm(phone, text, sessionData, locationAttachment = null) {
  const t = (text || '').trim().toLowerCase();
  const location = sessionData?.location;

  // If they shared a location now, treat it as a new place to resolve
  if (locationAttachment) {
    return handleLocationStep(phone, text, sessionData, locationAttachment);
  }

  if (/^(yes|y|correct|confirm|ok)$/i.test(t)) {
    if (!location) {
      await setSession(phone, 'main_menu', {});
      return sendWhatsAppText(phone, MAIN_MENU);
    }
    // Persist the member's saved location
    const member = await findMemberByPhone(phone);
    if (member) {
      await firestore.collection('users').doc(member.id).set(
        { savedLocation: location, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    }
    await setSession(phone, 'main_menu', {});
    return sendWhatsAppText(
      phone,
      `✅ Saved! Your delivery location is *${location.name}* (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}).\n\nYou can also manage addresses in the Go7 app. 👉 https://go7.ng`
    );
  }

  // Not "yes" → treat as a new location to resolve
  return handleLocationStep(phone, text, sessionData);
}

// ---------------------------------------------------------------------------
// Main inbound handler
// ---------------------------------------------------------------------------
async function handleInbound(phone, text, locationAttachment = null) {
  const member = await findMemberByPhone(phone);
  const { data } = await getSession(phone);
  const state = data?.state || 'idle';
  const t = (text || '').trim();

  // Global commands always work (unless the user just shared a location)
  if (!locationAttachment) {
    if (/^(hi|hello|hey|start|menu)\b/i.test(t)) {
      if (member) {
        await setSession(phone, 'main_menu', {});
        return handleMemberMenu(phone, 'menu');
      }
      await setSession(phone, 'awaiting_name', {});
      return sendWhatsAppText(phone, `👋 Welcome to Go7!\n\nWhat’s your name?`);
    }
    if (/^restart$/i.test(t)) {
      await setSession(phone, 'idle', {});
      return sendWhatsAppText(phone, `👋 Hi again! Type *hi* to start.`);
    }
  }

  // Existing member → route by session state, else main menu
  if (member) {
    if (state === 'awaiting_location') {
      return handleLocationStep(phone, text, data?.data, locationAttachment);
    }
    if (state === 'confirm_location') {
      return handleLocationConfirm(phone, text, data?.data, locationAttachment);
    }
    if (state === 'ordering') {
      return handleOrderingStep(phone, text, data?.data, locationAttachment);
    }
    if (state === 'booking') {
      return handleBookingStep(phone, text, data?.data, locationAttachment);
    }
    if (state === 'tracking') {
      return handleTrackingStep(phone, text);
    }
    if (state === 'bills') {
      return handleBillsStep(phone, text, data?.data);
    }
    if (state === 'fuel') {
      return handleFuelStep(phone, text, data?.data, locationAttachment);
    }
    await setSession(phone, 'main_menu', {});
    return handleMemberMenu(phone, text);
  }

  // ---- Signup flow ----
  if (state === 'awaiting_name') {
    const name = t.slice(0, 60);
    if (!name) {
      return sendWhatsAppText(phone, 'Please type your name so we can set up your account. 😊');
    }
    await setSession(phone, 'awaiting_otp', { name });
    const { delivered } = await sendSignupOtp(phone);
    if (!delivered) {
      await setSession(phone, 'idle', {});
      return sendWhatsAppText(
        phone,
        'Sorry, we couldn’t send a code right now. Please try again in a moment.'
      );
    }
    return sendWhatsAppText(
      phone,
      `Thanks, ${name}! 🎉\n\nI’ve sent a 6-digit code to your WhatsApp. Reply with the code to complete your Go7 account.`
    );
  }

  if (state === 'awaiting_otp') {
    const code = t.replace(/\D/g, '');
    if (code.length !== 6) {
      return sendWhatsAppText(phone, 'Please reply with the 6-digit code I sent you. 🔢');
    }
    const result = await verifySignupOtp(phone, code);
    if (!result.ok) {
      const msg =
        result.reason === 'invalid'
          ? `That code isn’t right. ${result.remaining} attempt(s) left.`
          : result.reason === 'expired'
          ? 'That code has expired. Reply "restart" to get a new one.'
          : result.reason === 'too_many_attempts'
          ? 'Too many wrong attempts. Reply "restart" to get a new code.'
          : 'We couldn’t verify that code. Please try again.';
      return sendWhatsAppText(phone, msg);
    }
    const name = data?.data?.name || 'Go7 Member';
    const created = await createMember(phone, name);
    await setSession(phone, 'main_menu', { uid: created.uid });
    await sendWhatsAppText(
      phone,
      `✅ You’re now a Go7 member, ${name}!\n\nYour account is ready — you can use it in the app too.`
    );
    return handleMemberMenu(phone, 'menu');
  }

  // ---- First contact ----
  const greeting = /^(hi|hello|hey|start|menu|go7|help)\b/i.test(t);
  if (greeting || state === 'idle') {
    await setSession(phone, 'awaiting_name', {});
    return sendWhatsAppText(
      phone,
      `👋 Welcome to Go7!\n\nTo order, book a delivery or track a package you need a free Go7 account — and I can set it up right here in 30 seconds.\n\nWhat’s your name?`
    );
  }

  // Fallback
  await setSession(phone, 'idle', {});
  return sendWhatsAppText(phone, 'I didn’t quite get that. Type "hi" to start, or "restart" to begin again.');
}

// ---------------------------------------------------------------------------
// Webhook helpers (idempotency + optional shared secret)
// ---------------------------------------------------------------------------
function getWebhookSecret() {
  return paramValue(WHATSAPP_WEBHOOK_SECRET, process.env.WHATSAPP_WEBHOOK_SECRET || '') ||
    paramValue(INFOBIP_WEBHOOK_SECRET, process.env.INFOBIP_WEBHOOK_SECRET || '');
}

function isWebhookSecretValid(req) {
  const configured = getWebhookSecret();
  if (!configured) return true;
  const provided =
    req.query?.secret ||
    req.headers?.['x-webhook-secret'] ||
    req.headers?.['x-infobip-secret'] ||
    '';
  // Constant-time compare to avoid timing leaks
  if (provided.length !== configured.length) return false;
  let mismatch = 0;
  for (let i = 0; i < provided.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ configured.charCodeAt(i);
  }
  return mismatch === 0;
}

async function isDuplicateMessage(messageId) {
  if (!messageId) return false;
  const snap = await firestore.collection('whatsapp_webhook_events').doc(String(messageId)).get();
  return snap.exists;
}

async function recordMessage(messageId) {
  if (!messageId) return;
  try {
    await firestore.collection('whatsapp_webhook_events').doc(String(messageId)).set(
      { receivedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    console.error('❌ Failed to record webhook event:', messageId, e.message);
  }
}

// ---------------------------------------------------------------------------
// Webhook endpoint (inbound messages)
// Supports Infobip inbound format and a generic Meta fallback.
// ---------------------------------------------------------------------------
exports.whatsappBotWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'];
    const verifyToken = req.query['hub.verify_token'];
    if (challenge) {
      const expectedToken = paramValue(META_VERIFY_TOKEN, process.env.META_VERIFY_TOKEN || '');
      if (expectedToken && verifyToken !== expectedToken) {
        return res.status(403).send({ status: 'forbidden' });
      }
      return res.status(200).send(challenge);
    }
    return res.status(200).send({ status: 'ok', service: 'go7-whatsapp-bot' });
  }

  if (!isWebhookSecretValid(req)) {
    return res.status(401).send({ status: 'unauthorized' });
  }

  try {
    const body = req.body || {};

    // Infobip inbound format: { results: [ { from, message } ] }
    const results = body.results || [];
    for (const msg of results) {
      const messageId = msg?.messageId || msg?.message?.id || msg?.messageId || '';
      if (await isDuplicateMessage(messageId)) {
        console.log('🔁 Skipping duplicate Infobip message:', messageId);
        continue;
      }
      await recordMessage(messageId);
      const from = msg?.from;
      const text =
        msg?.text ||
        msg?.message?.text ||
        msg?.message?.button?.text ||
        msg?.message?.interactive?.buttonReply?.title ||
        msg?.message?.interactive?.listReply?.title ||
        '';
      const lat = Number(
        msg?.message?.location?.latitude ??
        msg?.location?.latitude ??
        msg?.message?.latitude ??
        NaN
      );
      const lng = Number(
        msg?.message?.location?.longitude ??
        msg?.location?.longitude ??
        msg?.message?.longitude ??
        NaN
      );
      const locationAttachment = Number.isFinite(lat) && Number.isFinite(lng)
        ? { lat, lng, address: msg?.message?.location?.name || msg?.message?.location?.address || msg?.message?.name || 'Shared location' }
        : null;

      console.log('📥 Bot inbound (Infobip):', { from, text, hasLocation: !!locationAttachment, to: msg?.to });
      if (from) {
        // Await so the reply is sent before the function returns (Cloud
        // Functions terminate background work after the response is sent).
        await handleInbound(from, text, locationAttachment).catch((err) =>
          console.error('❌ Bot handleInbound error:', err)
        );
      }
    }

    // Meta Cloud API inbound format
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value || {};
          for (const message of value.messages || []) {
            const waId = message?.from;
            const messageId = message?.id;
            if (await isDuplicateMessage(messageId)) {
              console.log('🔁 Skipping duplicate Meta message:', messageId);
              continue;
            }
            await recordMessage(messageId);
            const text = message?.type === 'text' ? message?.text?.body || '' : '';
            const locationAttachment =
              message?.type === 'location' && message?.location
                ? {
                    lat: message.location.latitude,
                    lng: message.location.longitude,
                    address: message.location.name || 'Shared location',
                  }
                : null;
            if (waId) {
              await handleInbound(waId, text, locationAttachment).catch((err) =>
                console.error('❌ Bot handleInbound error:', err)
              );
            }
          }
        }
      }
    }

    res.status(200).send({ status: 'ok' });
  } catch (error) {
    console.error('❌ whatsappBotWebhook error:', error);
    res.status(500).send({ status: 'error', message: error.message });
  }
});

// Expose helpers for testing / manual triggering
exports.whatsappBotHandleInbound = functions.https.onCall(async (data, context) => {
  const { phone, text } = data || {};
  if (!phone || !text) {
    throw new functions.https.HttpsError('invalid-argument', 'phone and text are required');
  }
  await handleInbound(phone, text);
  return { success: true };
});
