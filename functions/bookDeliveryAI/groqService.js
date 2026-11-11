/**
 * 🤖 Groq NLU service — server-side only.
 *
 * GROQ_API_KEY lives in Firebase params/env, NEVER in Vite client vars and
 * NEVER sent to the browser. Groq is used ONLY to extract structured intent
 * from the customer's text (entity extraction). It never decides prices,
 * coordinates, payment state, or dispatch — those come from Go7 services.
 *
 * If no key is configured the service returns null and the controller falls
 * back to the deterministic extractor in nlu.js — the chat still works.
 */

let cachedKey;
function getGroqApiKey() {
  if (cachedKey !== undefined) return cachedKey;
  try {
    const { defineString } = require('firebase-functions/params');
    cachedKey = defineString('GROQ_API_KEY').value() || process.env.GROQ_API_KEY || null;
  } catch (_) {
    cachedKey = process.env.GROQ_API_KEY || null;
  }
  if (!cachedKey) console.warn('[groqService] GROQ_API_KEY not configured — using deterministic NLU fallback');
  return cachedKey;
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Overridable via GROQ_MODEL env; default picked from the account's live model list.
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

/**
 * Ask Groq for structured JSON only.
 * @returns {object|null} parsed JSON, or null when unavailable/failed.
 */
async function chatJson(systemPrompt, userText) {
  const key = getGroqApiKey();
  if (!key) return null;
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(8000), // never let a hung call stall a turn
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: String(userText || '').slice(0, 2000) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 400,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      console.warn('[groqService] API error', res.status, JSON.stringify(body)?.slice(0, 200));
      return null;
    }
    const text = body?.choices?.[0]?.message?.content;
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (_) {
      console.warn('[groqService] non-JSON model output — falling back to deterministic NLU');
      return null;
    }
  } catch (err) {
    console.warn('[groqService] call failed:', err.message);
    return null;
  }
}

const EXTRACTION_PROMPT = `You extract delivery booking fields from a customer message for a Nigerian delivery app (Abeokuta area).

Return STRICT JSON with these keys only — omit keys you cannot find:
{
  "intent": one of ["book","affirm","deny","correct","quote_inquiry","track","cancel","greeting","other"],
  "pickup": string (place name only, e.g. "Kuto"),
  "dropoff": string (place name only, e.g. "FUNAAB"),
  "item": string (what is being sent, e.g. "laptop"),
  "recipientName": string (person receiving, e.g. "Tobi"),
  "recipientPhone": string (Nigerian phone like 08012345678),
  "correctField": one of ["pickup","dropoff","recipient","package"] (only when the customer is CHANGING a previously given value),
  "notes": string (delivery instructions)
}

Rules:
- "from X to Y" → pickup=X, dropoff=Y
- "to <name> in <place>" → recipientName=<name>, dropoff=<place>
- "my hostel in X" / "my guy in X" → dropoff=X
- intent=affirm for yes/correct/okay/go ahead; deny for no/wrong; correct for "actually/change/instead"
- NEVER invent places, names, phones, or values not present in the text
- NEVER output prices, distances, coordinates, or times
- pickup/dropoff are PLACES, never person names`;

/**
 * Extract booking entities from free text.
 * @returns {Promise<object|null>} parsed extraction or null on failure.
 */
async function extractDeliveryEntities(message) {
  return chatJson(EXTRACTION_PROMPT, message);
}

module.exports = {
  extractDeliveryEntities,
  getGroqApiKey,
  // test hook — re-read the key/env between scenarios
  _resetKeyCache() { cachedKey = undefined; },
};
