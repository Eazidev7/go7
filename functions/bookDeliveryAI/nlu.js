/**
 * Deterministic entity extraction — fallback when Groq is unavailable, and a
 * sanity layer for Groq output. Extracts only what is literally present in the
 * text: places are always validated against the canonical resolver afterwards,
 * never trusted from extraction alone.
 */

const NG_PHONE = /(?:\+?234|0)([789][01]\d{8})/;

function extractPhone(text) {
  const m = String(text || '').match(NG_PHONE);
  if (!m) return null;
  let digits = m[0].replace(/\D/g, '');
  if (digits.startsWith('234')) digits = '0' + digits.slice(3);
  return /^0[789][01]\d{8}$/.test(digits) ? digits : null;
}

const AFFIRM = /^(yes|yeah|yep|correct|that'?s (right|correct)|right|okay|ok|confirm|go ahead|proceed|exactly|sure|continue)[.! ]*$/i;
const DENY = /^(no|nope|wrong|not (right|correct)|incorrect|that'?s wrong)[.! ]*$/i;
const CANCEL = /\b(cancel|stop|never ?mind|forget it|abort)\b/i;
const GREETING = /^(hi|hello|hey|good (morning|afternoon|evening)|how far|wetin dey)[.!? ]*$/i;
const TRACK_Q = /\b(where is|track|status of|rider|my (delivery|order|package))\b/i;
const QUOTE_Q = /\b(how much|price|cost|fee|fare|quote)\b/i;
const CORRECTION = /\b(actually|instead|change|meant|i mean|sorry,? (it'?s|i said))\b/i;
const FALLBACK_REQ = /\b(manual|form|type it (myself|out)|regular booking)\b/i;

function detectIntent(text) {
  const t = String(text || '').trim();
  if (!t) return 'other';
  if (AFFIRM.test(t)) return 'affirm';
  if (DENY.test(t)) return 'deny';
  if (FALLBACK_REQ.test(t)) return 'manual_fallback';
  if (CANCEL.test(t)) return 'cancel';
  if (CORRECTION.test(t)) return 'correct';
  if (TRACK_Q.test(t)) return 'track';
  if (QUOTE_Q.test(t)) return 'quote_inquiry';
  if (GREETING.test(t)) return 'greeting';
  return 'book';
}

/** Strip common filler so place extraction stays tight. */
const FILLER = /\b(i want to|i wanna|please|help me|can you|could you|kindly|send|deliver|pick|pickup|pick up|take|drop|dropoff|drop off|carry|move|package|parcel|something|this|it|for me|for|to|from|my|a|an|the|and|in|at|guy|brother|sister|friend|hostel)\b/gi;

function cleanPlace(fragment) {
  if (!fragment) return null;
  const s = String(fragment)
    .replace(FILLER, ' ')
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s.length >= 2 ? s : null;
}

/**
 * Pull pickup/dropoff/item/recipient from a free-text booking request.
 * Mirrors Groq's output shape so both paths merge identically.
 */
function extractHeuristic(text) {
  const t = String(text || '');
  const out = { intent: detectIntent(t) };

  const phone = extractPhone(t);
  if (phone) out.recipientPhone = phone;

  // "to Tobi in FUNAAB" → recipient + dropoff
  const toPersonIn = t.match(/\bto\s+([A-Za-z]+)\s+in\s+([A-Za-z][\w '-]+)$/i);
  // "from X to Y" / "from X and take it to Y" / "pick this from Kuto to Alabata"
  const fromTo = t.match(/\bfrom\s+(.+?)\s+(?:to|and (?:take|deliver|send) it to|and drop (?:it )?(?:at|in))\s+(.+)$/i);
  // "send/deliver <item> to <place>"
  const toPlace = t.match(/\b(?:to|take it to|deliver (?:it |to )?to)\s+([A-Za-z][\w '-]+)$/i);

  if (fromTo) {
    const p = cleanPlace(fromTo[1]);
    let d = fromTo[2];
    const personIn = d.match(/^([A-Za-z]+)\s+in\s+(.+)$/);
    if (personIn && !/^(the|my|a|an)$/i.test(personIn[1])) {
      out.recipientName = personIn[1];
      d = personIn[2];
    }
    const dd = cleanPlace(d);
    if (p) out.pickup = p;
    if (dd) out.dropoff = dd;
  } else if (toPersonIn) {
    out.recipientName = toPersonIn[1];
    const dd = cleanPlace(toPersonIn[2]);
    if (dd) out.dropoff = dd;
  } else if (toPlace) {
    const dd = cleanPlace(toPlace[1]);
    if (dd) out.dropoff = dd;
  }

  // standalone "from X" / "in/at X" dropoff
  if (!out.pickup) {
    const fromOnly = t.match(/\bfrom\s+([A-Za-z][\w '-]+)$/i);
    if (fromOnly) { const p = cleanPlace(fromOnly[1]); if (p) out.pickup = p; }
  }
  if (!out.dropoff) {
    const inOnly = t.match(/\b(?:in|at)\s+([A-Za-z][\w '-]+)$/i);
    if (inOnly) { const d = cleanPlace(inOnly[1]); if (d) out.dropoff = d; }
  }

  // Named-field corrections: "pickup is Obantoko", "drop-off should be Camp"
  const namedField = t.match(/\b(pick[\s-]?up|drop[\s-]?off|destination|deliver to)\s+(?:is|should be|=|:)?\s*([A-Za-z][\w'-]+(?:\s+[A-Za-z][\w'-]+){0,3})/i);
  if (namedField) {
    const key = namedField[1].toLowerCase().replace(/[\s-]/g, '');
    const field = key === 'pickup' ? 'pickup' : 'dropoff';
    const v = cleanPlace(namedField[2]);
    if (v) out[field] = v;
  }

  // "the recipient is Tobiloba", "recipient name is Tobi", "his number is…"
  if (!out.recipientName) {
    const rec = t.match(/\b(?:recipient|receiver)(?:'s|\s+name)?\s+(?:is\s+)?([A-Za-z][\w'-]{1,30})/i)
      || t.match(/\b(?:name is|call (?:him|her|them))\s+([A-Za-z][\w'-]{1,30})/i)
      || t.match(/\bto\s+([A-Za-z]{2,30})\s+in\b/i);
    if (rec) {
      const name = rec[1];
      // don't treat filler verbs as names
      if (!/^(a|an|the|my|some|is|at|in|to|from)$/i.test(name)) out.recipientName = name;
    }
  }

  // Corrections must override already-set fields
  if (out.intent === 'correct') {
    if (out.pickup) out.correctField = 'pickup';
    else if (out.dropoff) out.correctField = 'dropoff';
    else if (out.item) out.correctField = 'package';
    else if (out.recipientName || out.recipientPhone) out.correctField = 'recipient';
  }

  // item: "send a laptop", "package of clothes", "documents"
  const item = t.match(/\b(?:send|sending|deliver|delivering|carry|move|send out)\s+(?:a |an |my |some )?([a-zA-Z][\w -]{1,30}?)(?:\s+(?:from|to|for|in|at)\b|$)/i);
  if (item) {
    const i = cleanPlace(item[1]);
    if (i && i !== out.pickup && i !== out.dropoff) out.item = i;
  }

  return out;
}

/**
 * Merge extractor output into the working session fields. Only fills slots
 * that are still empty unless the customer is correcting a field.
 * Returns a list of field names that were just filled.
 */
function mergeEntities(session, entities) {
  const filled = [];
  if (!entities || typeof entities !== 'object') return filled;

  const setIf = (cond, apply, name) => { if (cond) { apply(); filled.push(name); } };
  const correcting = String(entities.correctField || '').toLowerCase();

  if (entities.pickup && (!session.pickup.query || correcting === 'pickup')) {
    setIf(true, () => {
      session.pickup = { query: String(entities.pickup).slice(0, 120), canonicalLocation: null, confirmed: false };
      session.quote = null; session.quoteDeclined = false;
    }, 'pickup');
  }
  if (entities.dropoff && (!session.dropoff.query || correcting === 'dropoff')) {
    setIf(true, () => {
      session.dropoff = { query: String(entities.dropoff).slice(0, 120), canonicalLocation: null, confirmed: false };
      session.quote = null; session.quoteDeclined = false;
    }, 'dropoff');
  }
  if (entities.item && (!session.package.description || correcting === 'package')) {
    setIf(true, () => { session.package.description = String(entities.item).slice(0, 120); }, 'package');
  }
  if (entities.recipientName && (!session.recipient.name || correcting === 'recipient')) {
    setIf(true, () => { session.recipient.name = String(entities.recipientName).slice(0, 80); }, 'recipientName');
  }
  if (entities.recipientPhone && (!session.recipient.phone || correcting === 'recipient')) {
    setIf(true, () => { session.recipient.phone = String(entities.recipientPhone).slice(0, 20); }, 'recipientPhone');
  }
  if (entities.notes && !session.instructions) {
    session.instructions = String(entities.notes).slice(0, 500);
  }
  return filled;
}

module.exports = { extractHeuristic, detectIntent, mergeEntities, extractPhone, cleanPlace };
