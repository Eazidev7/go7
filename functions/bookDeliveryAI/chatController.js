/**
 * 💬 Book Delivery AI — chat controller (callable: bookDeliveryAIChat).
 *
 * Orchestration layer ONLY. The LLM interprets language; Go7 backend services
 * do everything else via the strict tool registry. All replies are server-side
 * templates — the model cannot fabricate prices, coordinates, rider info, or
 * payment state.
 *
 * Input:  { sessionId?, message? , action?: {type, ...} }
 * Output: { sessionId, messages:[{text, ui?}], session:<redacted view> }
 */

const functions = require('firebase-functions/v1');
const admin = require('../adminInit');
const groq = require('./groqService');
const nlu = require('./nlu');
const convo = require('./conversationState');
const locationResolver = require('../locationResolver');
const { STATES, deriveState } = require('./stateMachine');
const { runTool, ToolError } = require('./toolRegistry');

const db = admin.firestore();
const fmtN = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

const OPENING = `Hi 👋 I'm Go7, your delivery assistant.\n\nTell me what you want to send and where it's going — I'll handle the rest.`;
const QUOTE_TTL_MS = 15 * 60 * 1000; // quotes expire — re-quote rather than charge a stale fare
const FALLBACK = {
  text: "Let's use the regular booking form — it'll get this sorted quickly.",
  ui: { type: 'manual_fallback', label: 'Continue with manual booking', route: '/book-delivery/manual' },
};

// ---------------------------------------------------------------------------
// Entity extraction — Groq first, deterministic fallback always available.
// Groq output is untrusted: coerced to strings, known keys only.
// ---------------------------------------------------------------------------
async function extractEntities(text) {
  const g = await groq.extractDeliveryEntities(text);
  const h = nlu.extractHeuristic(text);
  if (!g) return h;
  const clean = {};
  for (const k of ['intent', 'pickup', 'dropoff', 'item', 'recipientName', 'recipientPhone', 'correctField', 'notes']) {
    if (typeof g[k] === 'string' && g[k].trim()) clean[k] = g[k].trim();
  }
  const phone = nlu.extractPhone(clean.recipientPhone || '') || h.recipientPhone || null;
  if (phone) clean.recipientPhone = phone;
  else delete clean.recipientPhone;
  // heuristic intent wins when it detected something specific (affirm/deny/cancel)
  if (h.intent !== 'book' && h.intent !== 'other') clean.intent = h.intent;
  return clean;
}

// ---------------------------------------------------------------------------
// Location resolution pipeline — runs the canonical resolver via the registry
// and stores candidates server-side.
// ---------------------------------------------------------------------------
async function pipelineResolve(ctx, role) {
  const s = ctx.session;
  const slot = s[role];
  if (slot.confirmed || !slot.query) return null;
  const res = await runTool(ctx, 'resolveDeliveryLocation', { query: slot.query });
  if (res.status === 'not_found') {
    slot.query = null; // let the customer rephrase instead of looping
    // Offer known areas as a recovery path — candidates are stored server-side
    // so selection goes through confirmDeliveryLocation like any other card.
    const popular = await locationResolver.listPopularLocations(6).catch(() => []);
    slot.candidates = popular
      .filter((l) => Number.isFinite(Number(l.lat)) && Number.isFinite(Number(l.lng)))
      .map((l) => ({
        id: null, name: l.name, lat: Number(l.lat), lng: Number(l.lng), type: l.type || 'area', source: 'suggestion',
      }));
    return {
      nf: true, // needs input — emit even if a pickup card was just shown
      text: `I couldn't find "${res.query}" in our service areas. Pick a nearby area below, or type another landmark/street name.`,
      ui: { type: 'location_candidates', role, candidates: slot.candidates.map((c) => ({ name: c.name, type: c.type })) },
    };
  }
  slot.candidates = res.candidates;
  if (res.status === 'resolved') {
    return {
      text: role === 'pickup'
        ? `Got it 👍 You want pickup at **${res.candidates[0].name}**. Can you confirm the pickup location for me?`
        : `Got it 👍 Drop-off at **${res.candidates[0].name}** — is that right?`,
      ui: { type: 'location_confirm', role, location: res.candidates[0] },
    };
  }
  return {
    text: `Which ${role === 'pickup' ? 'pickup' : 'drop-off'} location do you mean?`,
    ui: { type: 'location_candidates', role, candidates: res.candidates },
  };
}

// ---------------------------------------------------------------------------
// Structured client actions (buttons/cards — not free text).
// ---------------------------------------------------------------------------
async function handleAction(ctx, action) {
  const s = ctx.session;
  const type = action.type;
  const out = { messages: [] };

  if (type === 'select_location' || type === 'confirm_location') {
    const role = action.role;
    if (!['pickup', 'dropoff'].includes(role)) throw new ToolError('invalid-argument', 'bad role');
    // Self-heal: a card tap can arrive after the slot's stored candidates were
    // cleared (bare-place recapture, stale card, concurrent turn). Re-resolve
    // the stored query instead of failing with "no candidates".
    if (!s[role].candidates?.length && s[role].query) {
      const r = await pipelineResolve(ctx, role);
      if (r) { s[role].cardEmitted = true; out.messages.push(r); }
      if (!s[role].candidates?.length) return out;
      // A re-resolved list can reorder — never auto-confirm an index tap.
      if (type === 'select_location') return out;
    }
    const res = await runTool(ctx, 'confirmDeliveryLocation', { role, index: action.index });
    out.messages.push({ text: `✅ ${role === 'pickup' ? 'Pickup' : 'Drop-off'} confirmed: **${res.location.name}**` });
    return out;
  }

  if (type === 'change_location') {
    const role = action.role;
    if (!['pickup', 'dropoff'].includes(role)) throw new ToolError('invalid-argument', 'bad role');
    s[role] = { query: null, canonicalLocation: null, confirmed: false, candidates: [] };
    s.quote = null; // a location change invalidates any quote
    s.status = role === 'pickup' ? STATES.COLLECTING_PICKUP : STATES.COLLECTING_DROPOFF;
    out.messages.push({ text: `No problem — where ${role === 'pickup' ? 'should I pick up from' : 'is it going'}?` });
    return out;
  }

  if (type === 'set_package') {
    const item = String(action.item || '').slice(0, 80);
    if (!item) throw new ToolError('invalid-argument', 'item required');
    s.package.description = item;
    out.messages.push({ text: `Noted 📦 ${item}.` });
    return out;
  }

  if (type === 'get_quote') {
    s.quoteDeclined = false;
    const q = await runTool(ctx, 'getDeliveryQuote', {});
    s.status = STATES.QUOTE_PRESENTED;
    const vehicleLine =
      q.vehicleType && q.vehicleType !== 'ANY'
        ? `\n🚗 ${q.vehicleType === 'MOTORCYCLE' ? 'Motorcycle' : q.vehicleType === 'BICYCLE' ? 'Bicycle' : 'E-bike'} delivery`
        : '';
    out.messages.push({
      text: `Great. I checked the route.\n\n📍 ${s.pickup.canonicalLocation.name} → ${s.dropoff.canonicalLocation.name}\n📏 ${q.distanceKm} km${vehicleLine}\n\n**Delivery fee: ${fmtN(q.deliveryFee)}**\nService fee: ${fmtN(q.platformFee)}\n**Total: ${fmtN(q.grandTotal)}**\n\nWould you like to continue?`,
      ui: { type: 'quote', quote: q },
    });
    return out;
  }

  if (type === 'confirm_quote') {
    if (!s.quote) throw new ToolError('failed-precondition', 'No quote to confirm');
    // Stale quotes must never be charged — pins and pricing config can change
    // while a session sits parked. Re-quote instead of confirming.
    const quoteAgeMs = Date.now() - new Date(s.quote.quotedAt || 0).getTime();
    if (!Number.isFinite(quoteAgeMs) || quoteAgeMs > QUOTE_TTL_MS) {
      s.quote = null;
      const r = await handleAction(ctx, { type: 'get_quote' });
      r.messages.unshift({ text: `That earlier quote had expired — here's the current price:` });
      return r;
    }
    const opts = await runTool(ctx, 'getPaymentOptions', {});
    s.status = STATES.AWAITING_PAYMENT_METHOD;
    out.messages.push({
      text: `Perfect! How would you like to pay? Total is **${fmtN(s.quote.grandTotal)}**.`,
      ui: { type: 'payment_options', options: opts.options },
    });
    return out;
  }

  if (type === 'select_payment_method') {
    const method = String(action.method || '').toLowerCase();
    if (!s.quote) throw new ToolError('failed-precondition', 'No quote yet');
    const created = await runTool(ctx, 'createDeliveryBooking', { paymentMethod: method });
    s.status = STATES.AWAITING_PAYMENT;
    const amount = created.grandTotal ?? s.quote?.grandTotal;
    out.messages.push({
      text: method === 'pod'
        ? `Booking **${created.bookingId}** created — pay the rider on delivery.`
        : `Booking **${created.bookingId}** is ready. Tap below to complete payment of **${fmtN(amount)}**.`,
      ui: {
        type: 'payment',
        bookingId: created.bookingId,
        method,
        amountKobo: created.totalKobo ?? s.quote?.totalKobo,
        amount,
      },
    });
    if (method === 'pod') {
      // POD is still confirmed server-side via confirmBookDeliveryPayment —
      // the client calls it with method 'pod'.
    }
    return out;
  }

  if (type === 'payment_confirmed') {
    // Never trust the event — read server state.
    const status = await runTool(ctx, 'getDeliveryStatus', {});
    if (status.paymentStatus === 'paid' || status.paymentStatus === 'pay_on_delivery') {
      s.paymentStatus = status.paymentStatus;
      s.status = STATES.FINDING_RIDER;
      if (status.riderAssigned) {
        s.riderStatus = 'assigned';
        s.status = STATES.TRACKING;
        const link = await runTool(ctx, 'getTrackingLink', {});
        out.messages.push({
          text: `Rider found! 🎉 **${status.riderName || 'Your rider'}** is heading to the pickup.`,
          ui: { type: 'tracking', ...link },
        });
      } else {
        out.messages.push({
          text: `Payment confirmed ✅ I'm finding a rider for you now…`,
          ui: { type: 'finding_rider', bookingId: s.bookingId },
        });
      }
      return out;
    }
    out.messages.push({
      text: `I don't see the payment confirmed yet — give it a moment and tap "I've paid" again.`,
      ui: { type: 'payment_pending', bookingId: s.bookingId },
    });
    return out;
  }

  if (type === 'check_rider') {
    const status = await runTool(ctx, 'getDeliveryStatus', {});
    if (status.riderAssigned) {
      s.riderStatus = 'assigned';
      s.status = STATES.TRACKING;
      const link = await runTool(ctx, 'getTrackingLink', {});
      out.messages.push({
        text: `Rider found! 🎉 **${status.riderName || 'Your rider'}** is on the way to the pickup.`,
        ui: { type: 'tracking', ...link },
      });
    } else {
      out.messages.push({ text: `Still searching for a nearby rider — I'll let you know as soon as one accepts.`, ui: { type: 'finding_rider', bookingId: s.bookingId } });
    }
    return out;
  }

  if (type === 'track') {
    const link = await runTool(ctx, 'getTrackingLink', {});
    out.messages.push({ text: `Here's your tracking link 👇`, ui: { type: 'tracking', ...link } });
    return out;
  }

  if (type === 'cancel') {
    // An unpaid pending booking is parked in pendingBookings — mark it
    // cancelled so it can't sit forever or get revived by a stray confirm.
    if (s.bookingId && s.paymentStatus === 'unpaid') {
      const { FieldValue } = require('firebase-admin/firestore');
      await db.collection('pendingBookings').doc(s.bookingId).set(
        {
          status: 'cancelled',
          dispatchStatus: 'cancelled',
          cancelReason: 'customer_cancelled_via_chat',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      ).catch((e) => console.warn('[chat] pending booking cancel failed:', e.message));
      s.bookingId = null;
    }
    s.status = STATES.CANCELLED;
    out.messages.push({ text: `No worries — I've cancelled this booking request. ${FALLBACK.text}`, ui: FALLBACK.ui });
    return out;
  }

  if (type === 'manual_fallback') {
    out.messages.push({ text: FALLBACK.text, ui: FALLBACK.ui });
    return out;
  }

  throw new ToolError('invalid-argument', `Unknown action: ${type}`);
}

// ---------------------------------------------------------------------------
// Free-text flow
// ---------------------------------------------------------------------------
async function handleMessage(ctx, text, entities) {
  const s = ctx.session;
  entities = entities || await extractEntities(text);
  const intent = entities.intent || 'book';
  const out = { messages: [] };

  // Global intents
  if (intent === 'cancel') {
    return handleAction(ctx, { type: 'cancel' });
  }
  if (intent === 'manual_fallback') {
    out.messages.push({ text: FALLBACK.text, ui: FALLBACK.ui });
    return out;
  }
  if (intent === 'track' && s.bookingId) {
    const status = await runTool(ctx, 'getDeliveryStatus', {});
    if (status.riderAssigned) {
      const link = await runTool(ctx, 'getTrackingLink', {});
      out.messages.push({ text: `**${status.riderName || 'Your rider'}** is on it — live tracking below 👇`, ui: { type: 'tracking', ...link } });
    } else {
      out.messages.push({ text: `Your delivery is ${status.status === 'searching_rider' ? 'still looking for a rider' : status.status}. Hang tight!` });
    }
    return out;
  }
  if (intent === 'quote_inquiry' && s.pickup.confirmed && s.dropoff.confirmed) {
    const r = await handleAction(ctx, { type: 'get_quote' });
    return r;
  }

  // Payment method chosen by typing ("wallet", "pod", "pay on delivery",
  // "card") — without this the turn returned an empty reply and the flow
  // dead-ended before booking.
  if (s.status === STATES.AWAITING_PAYMENT_METHOD || (s.status === STATES.QUOTE_PRESENTED && s.quote)) {
    const m = text.toLowerCase();
    const method = /\bpod\b|pay\s*on\s*delivery|cash|on delivery/.test(m) ? 'pod'
      : /\bwallet\b/.test(m) ? 'wallet'
      : /\bpaystack|card|transfer|\bpay\b/.test(m) ? 'paystack'
      : null;
    if (method) return handleAction(ctx, { type: 'select_payment_method', method });
    if (s.status === STATES.AWAITING_PAYMENT_METHOD && intent !== 'correct') {
      // "yes"/unrelated text while picking a method → re-show the options card
      return handleAction(ctx, { type: 'confirm_quote' });
    }
  }

  // Bare corrections with no new value ("change the drop-off", "actually the
  // pickup") previously fell through to an empty reply.
  if (intent === 'correct') {
    const field = String(entities.correctField || '').toLowerCase()
      || (/\b(pick[\s-]?up)\b/i.test(text) ? 'pickup'
        : /\b(drop[\s-]?off|destination)\b/i.test(text) ? 'dropoff'
        : null);
    const hasNewValue = entities.pickup || entities.dropoff;
    if (!hasNewValue) {
      if (field === 'pickup' || field === 'dropoff') {
        return handleAction(ctx, { type: 'change_location', role: field });
      }
      if (field === 'package') {
        s.package.description = null;
        out.messages.push({ text: `Sure — what are you sending?` });
        return out;
      }
      if (field === 'recipient') {
        s.recipient = { name: null, phone: null };
        out.messages.push({ text: `Okay — recipient's name and phone number?` });
        return out;
      }
      out.messages.push({
        text: `No problem — what do you want to change?`,
        ui: {
          type: 'action_buttons',
          buttons: [
            { label: 'Pickup location', action: { type: 'change_location', role: 'pickup' } },
            { label: 'Drop-off location', action: { type: 'change_location', role: 'dropoff' } },
          ],
        },
      });
      return out;
    }
  }

  // Affirm inside a confirming state = confirm the pending location.
  if (intent === 'affirm') {
    if (s.status === STATES.CONFIRMING_PICKUP && (s.pickup.candidates?.length || s.pickup.query)) {
      return handleAction(ctx, { type: 'confirm_location', role: 'pickup' });
    }
    if (s.status === STATES.CONFIRMING_DROPOFF && (s.dropoff.candidates?.length || s.dropoff.query)) {
      return handleAction(ctx, { type: 'confirm_location', role: 'dropoff' });
    }
    if (s.status === STATES.QUOTE_PRESENTED) {
      return handleAction(ctx, { type: 'confirm_quote' });
    }
    // Nothing pending to affirm — fall through so nextPrompt re-asks the
    // current question once (avoids an ack + repeated-question pair).
    if (s.status === STATES.AWAITING_PAYMENT && s.bookingId) {
      out.messages.push({ text: `Almost there — tap the pay button above to complete payment for **${s.bookingId}**.` });
    }
    return out;
  }
  if (intent === 'deny') {
    if (s.status === STATES.CONFIRMING_PICKUP) return handleAction(ctx, { type: 'change_location', role: 'pickup' });
    if (s.status === STATES.CONFIRMING_DROPOFF) return handleAction(ctx, { type: 'change_location', role: 'dropoff' });
    if (s.status === STATES.QUOTE_PRESENTED) {
      s.quote = null;
      s.quoteDeclined = true;
      out.messages.push({
        text: `No problem — want a fresh quote, or should we change the pickup/drop-off first?`,
        ui: {
          type: 'action_buttons',
          buttons: [
            { label: 'Get a new quote', action: { type: 'get_quote' } },
            { label: 'Change pickup', action: { type: 'change_location', role: 'pickup' } },
            { label: 'Change drop-off', action: { type: 'change_location', role: 'dropoff' } },
          ],
        },
      });
      return out;
    }
  }

  // Merge extracted entities into the session (server-validated later).
  nlu.mergeEntities(s, entities);

  // Bare place answers while a location slot is pending — the extractors only
  // pull places from "to X"/"from X"/"in X" phrasing, so a bare "Camp" typed
  // while COLLECTING_DROPOFF (or a corrected place while CONFIRMING_DROPOFF)
  // produced no entity, nothing merged, and the bot re-asked forever.
  // Only when no other entity was extracted, so a phone/name/item reply can
  // never be swallowed as a location.
  if (
    ['book', 'other'].includes(intent) &&
    !entities.pickup && !entities.dropoff &&
    !entities.item && !entities.recipientName && !entities.recipientPhone
  ) {
    const role =
      s.status === STATES.COLLECTING_PICKUP || s.status === STATES.CONFIRMING_PICKUP ? 'pickup'
      : s.status === STATES.COLLECTING_DROPOFF || s.status === STATES.CONFIRMING_DROPOFF ? 'dropoff'
      : null;
    const slot = role && s[role];
    const q = role ? nlu.cleanPlace(text) : null;
    const differs = q && /[A-Za-z]/.test(q)
      && q.toLowerCase() !== String((slot && slot.query) || '').toLowerCase();
    if (slot && !slot.confirmed && differs) {
      s[role] = { query: q, canonicalLocation: null, confirmed: false, candidates: [], cardEmitted: false };
      s.quote = null; s.quoteDeclined = false;
    }
  }

  // Recipient fields captured only while collecting recipient info.
  if (s.status === STATES.COLLECTING_RECIPIENT) {
    const phone = nlu.extractPhone(text);
    if (phone && !s.recipient.phone) s.recipient.phone = phone;
    // bare "Name phone" reply or a lone name
    if (!s.recipient.name) {
      const nameOnly = text.replace(/(?:\+?234|0)\d{10}/g, '').trim();
      if (/^[A-Za-z][A-Za-z .'-]{1,60}$/.test(nameOnly) && nameOnly.length >= 2) {
        s.recipient.name = nameOnly;
      }
    }
  }
  // Package description captured only while collecting the package.
  if (s.status === STATES.COLLECTING_PACKAGE && !s.package.description) {
    const desc = String(entities.item || text).trim();
    if (desc.length >= 2 && desc.length <= 120) s.package.description = desc;
  }

  // Resolve any unconfirmed location queries via the canonical resolver.
  // If a pickup card was emitted this turn, a drop-off *card* is deferred to
  // the next prompt (two look-alike cards in one reply read as a duplicate);
  // a not-found result still surfaces immediately since it needs new input.
  const needsPickupResolve = s.pickup.query && !s.pickup.confirmed;
  const needsDropoffResolve = s.dropoff.query && !s.dropoff.confirmed;
  let pickupCardThisTurn = false;
  if (needsPickupResolve) {
    const r = await pipelineResolve(ctx, 'pickup');
    if (r) { s.pickup.cardEmitted = true; pickupCardThisTurn = true; out.messages.push(r); }
  }
  if (needsDropoffResolve) {
    const r = await pipelineResolve(ctx, 'dropoff');
    if (r && (!pickupCardThisTurn || r.nf)) {
      s.dropoff.cardEmitted = true;
      out.messages.push(r);
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Prompt for whatever the state machine still needs.
// ---------------------------------------------------------------------------
async function nextPrompt(ctx) {
  const s = ctx.session;
  const state = deriveState(s);
  s.status = state;

  switch (state) {
    case STATES.COLLECTING_PICKUP:
      if (s.pickup.query) return null;
      return { text: `Tell me what you want to send and where to pick it up from 📍`, ui: { type: 'quick_actions' } };
    case STATES.CONFIRMING_PICKUP:
    case STATES.CONFIRMING_DROPOFF: {
      // A stored query whose card hasn't been emitted yet (e.g. the drop-off
      // card deferred while the pickup card was showing) resolves here.
      const role = state === STATES.CONFIRMING_PICKUP ? 'pickup' : 'dropoff';
      const slot = s[role];
      if (!slot.query || slot.cardEmitted) return null;
      const r = await pipelineResolve(ctx, role);
      if (r) slot.cardEmitted = true;
      return r;
    }
    case STATES.COLLECTING_DROPOFF:
      return { text: `Great! Now what's the drop-off location?`, ui: { type: 'location_suggestions' } };
    case STATES.COLLECTING_PACKAGE:
      return {
        text: `Perfect! 😊 What are you sending?`,
        ui: { type: 'package_options', options: ['📦 Laptop', '📄 Documents', '📱 Phone', '🎁 Shopping item', '💬 Something else'] },
      };
    case STATES.COLLECTING_RECIPIENT:
      return { text: `Almost done — what's the recipient's name and phone number?` };
    case STATES.READY_FOR_QUOTE:
    case STATES.QUOTE_PRESENTED: {
      if (!s.quote && !s.quoteDeclined) {
        const r = await handleAction(ctx, { type: 'get_quote' });
        return r.messages[0];
      }
      return null;
    }
    case STATES.AWAITING_PAYMENT_METHOD:
      return null;
    case STATES.AWAITING_PAYMENT:
      return null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Callable entry — auth + ownership + orchestration.
// ---------------------------------------------------------------------------
async function handleChat(uid, data) {
  const input = data || {};
  let session;
  let isNew = false;

  if (input.sessionId) {
    try {
      session = await convo.loadSession(uid, String(input.sessionId));
    } catch (e) {
      if (e.code === 'not-found') {
        const got = await convo.getOrCreateSession(uid);
        session = got.session;
        isNew = got.isNew;
      } else {
        throw e;
      }
    }
  } else {
    const got = await convo.getOrCreateSession(uid);
    session = got.session;
    isNew = got.isNew;
  }

  const ctx = {
    uid,
    session,
    log: (tool, inputSummary, outcome) => convo.logToolCall(ctx.session, tool, inputSummary, outcome),
  };

  const messages = [];
  if (isNew) {
    messages.push({ text: OPENING, ui: { type: 'quick_actions' } });
  }

  try {
    if (input.action && typeof input.action === 'object') {
      const res = await handleAction(ctx, input.action);
      messages.push(...res.messages);
    } else if (typeof input.message === 'string' && input.message.trim()) {
      const text = input.message.trim().slice(0, 1000);
      // 50 customer messages per session — the journey then moves to the
      // manual flow. Bookings/orders/tracking are untouched.
      session.messageCount = (session.messageCount || 0) + 1;
      if (session.messageCount > 50) {
        session.status = 'EXPIRED';
        messages.push({
          text: `Let's continue this delivery through the booking screen.`,
          ui: FALLBACK.ui,
        });
        await convo.saveSession(session);
        return { sessionId: session.sessionId, messages, session: redact(session) };
      }
      const entities = await extractEntities(text);
      // A paid booking followed by a message carrying new booking entities
      // means the customer wants another delivery — rotate to a fresh session.
      const wantsNewBooking = entities.pickup || entities.dropoff || entities.item;
      const settled = session.bookingId && ['paid', 'pay_on_delivery'].includes(session.paymentStatus);
      // A stale unpaid quote must not trap the customer either — parked at
      // QUOTE_PRESENTED/AWAITING_PAYMENT_METHOD with no booking created yet, a
      // message carrying new booking entities starts over instead of being
      // silently dropped.
      const stalePreBooking = !session.bookingId
        && [STATES.QUOTE_PRESENTED, STATES.AWAITING_PAYMENT_METHOD].includes(session.status);
      if (wantsNewBooking && (settled || stalePreBooking)) {
        session = ctx.session = await convo.rotateSession(uid);
      }
      const res = await handleMessage(ctx, text, entities);
      messages.push(...res.messages);
    } else if (!isNew) {
      // Resumed session — surface the live journey state instead of a blank chat.
      if (session.status === STATES.FINDING_RIDER || session.status === STATES.TRACKING) {
        const status = await runTool(ctx, 'getDeliveryStatus', {}).catch(() => null);
        if (status?.riderAssigned) {
          session.riderStatus = 'assigned';
          session.status = STATES.TRACKING;
          const link = await runTool(ctx, 'getTrackingLink', {});
          messages.push({
            text: `Welcome back! 🎉 **${status.riderName || 'Your rider'}** is on your delivery.`,
            ui: { type: 'tracking', ...link },
          });
        } else {
          messages.push({
            text: `Welcome back! I'm still finding the nearest available rider for **${session.bookingId}**…`,
            ui: { type: 'finding_rider', bookingId: session.bookingId },
          });
        }
      } else {
        messages.push({ text: `I'm here — tell me what you need delivered.` });
      }
    }
  } catch (err) {
    const code = err instanceof ToolError ? err.code : 'internal';
    console.error('[bookDeliveryAIChat] turn failed:', code, err.message);
    messages.push({
      text: `Hmm, something went wrong on my end (${err.message?.slice(0, 120)}). ${FALLBACK.text}`,
      ui: FALLBACK.ui,
    });
  }

  // After handling, emit the next question the state machine needs.
  if (!['CANCELLED', 'TRACKING', 'FINDING_RIDER', 'AWAITING_PAYMENT'].includes(session.status)) {
    const prompt = await nextPrompt(ctx);
    if (prompt) messages.push(prompt);
  }

  if (messages.length === 0) {
    // A 200 with no reply reads as a dead chat — never return an empty turn.
    // Reply in the context of wherever the customer is parked.
    if (session.status === STATES.AWAITING_PAYMENT && session.bookingId) {
      messages.push({
        text: `Booking **${session.bookingId}** is still waiting for payment — tap the pay button above, or say "cancel" to drop it.`,
      });
    } else if (session.status === STATES.QUOTE_PRESENTED && session.quote) {
      messages.push({
        text: `Your quote is ready — **${fmtN(session.quote.grandTotal)}** total. Say "yes" to continue or "change" to adjust the trip.`,
        ui: {
          type: 'action_buttons',
          buttons: [
            { label: 'Continue', action: { type: 'confirm_quote' } },
            { label: 'Change trip', action: { type: 'change_location', role: 'pickup' } },
          ],
        },
      });
    } else if (session.status === STATES.AWAITING_PAYMENT_METHOD && session.quote) {
      const r = await handleAction(ctx, { type: 'confirm_quote' });
      messages.push(...r.messages);
    } else if (session.status === STATES.FINDING_RIDER || session.status === STATES.TRACKING) {
      messages.push({
        text: `Your delivery **${session.bookingId}** is ${session.status === STATES.TRACKING ? 'in progress' : 'still looking for a rider'} — tap below for the latest status.`,
        ui: {
          type: 'action_buttons',
          buttons: [
            { label: 'Check status', action: { type: session.status === STATES.TRACKING ? 'track' : 'check_rider' } },
          ],
        },
      });
    } else if (session.status === 'CANCELLED' || session.status === 'EXPIRED') {
      messages.push({ text: `This chat has ended — tell me what you'd like to send and we'll start a new delivery.` });
    } else {
      messages.push({ text: FALLBACK.text, ui: FALLBACK.ui });
    }
  }

  await convo.saveSession(session);

  return {
    sessionId: session.sessionId,
    messages,
    session: redact(session),
  };
}

/** Browser-safe session view — no internals, no tool log. */
function redact(s) {
  return {
    sessionId: s.sessionId,
    status: s.status,
    pickup: { query: s.pickup.query, location: s.pickup.canonicalLocation, confirmed: s.pickup.confirmed },
    dropoff: { query: s.dropoff.query, location: s.dropoff.canonicalLocation, confirmed: s.dropoff.confirmed },
    package: s.package,
    recipient: { name: s.recipient.name, phoneMasked: s.recipient.phone ? `•••${s.recipient.phone.slice(-4)}` : null },
    quote: s.quote,
    bookingId: s.bookingId,
    paymentStatus: s.paymentStatus,
    riderStatus: s.riderStatus,
  };
}

exports.bookDeliveryAIChat = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in is required to use the delivery assistant');
  }
  try {
    return await handleChat(context.auth.uid, data);
  } catch (err) {
    console.error('[bookDeliveryAIChat] failed:', err);
    if (err.code === 'permission-denied') throw new functions.https.HttpsError('permission-denied', err.message);
    if (err.code === 'not-found') throw new functions.https.HttpsError('not-found', err.message);
    throw new functions.https.HttpsError('internal', 'Assistant is unavailable right now');
  }
});

// Export the core for local testing.
module.exports.handleChat = handleChat;
