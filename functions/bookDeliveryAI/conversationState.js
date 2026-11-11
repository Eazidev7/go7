/**
 * Server-side delivery AI session — authoritative conversation state.
 *
 * Collection: `deliveryAISessions` — covered by the firestore.rules catch-all
 * deny, so ONLY Admin SDK (this controller) can read/write it. The browser
 * receives a redacted view via the chat callable; it can never read or write
 * the session directly.
 */

const admin = require('../adminInit');
const { FieldValue } = require('firebase-admin/firestore');
const crypto = require('crypto');
const db = admin.firestore();

const COLLECTION = 'deliveryAISessions';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function newSessionId() {
  return `dai_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
}

function emptySession(sessionId, uid) {
  return {
    sessionId,
    userId: uid,
    status: 'COLLECTING_PICKUP',
    pickup: { query: null, canonicalLocation: null, confirmed: false, candidates: [] },
    dropoff: { query: null, canonicalLocation: null, confirmed: false, candidates: [] },
    package: { description: null },
    recipient: { name: null, phone: null },
    instructions: null,
    quote: null,
    bookingId: null,
    paymentMethod: null,
    paymentStatus: 'unpaid',
    riderStatus: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    toolCallLog: [],
  };
}

async function createSession(uid) {
  const sessionId = newSessionId();
  const session = emptySession(sessionId, uid);
  await db.collection(COLLECTION).doc(sessionId).set(session);
  return session;
}

// Sessions with a finished/dead journey — a fresh chat should start over.
const NON_REUSABLE = new Set(['CANCELLED', 'DELIVERED', 'EXPIRED']);
const PTR_COLLECTION = 'deliveryAISessionActive';

/**
 * Reuse the user's live session when the client has no sessionId yet (first
 * message, remount, retry). A uid→sessionId pointer doc updated inside a
 * transaction makes concurrent "first" calls converge on ONE session instead
 * of each creating its own.
 */
async function getOrCreateSession(uid) {
  const ptrRef = db.collection(PTR_COLLECTION).doc(uid);
  return db.runTransaction(async (tx) => {
    const ptr = await tx.get(ptrRef);
    if (ptr.exists) {
      const snap = await tx.get(db.collection(COLLECTION).doc(String(ptr.data().sessionId)));
      if (snap.exists) {
        const s = snap.data();
        const ms = s.createdAt?.toMillis?.() || s.updatedAt?.toMillis?.() || 0;
        if (s.userId === uid && !NON_REUSABLE.has(s.status) && ms && Date.now() - ms <= SESSION_TTL_MS) {
          s.sessionId = snap.id;
          return { session: s, isNew: false };
        }
      }
    }
    const session = emptySession(newSessionId(), uid);
    tx.set(db.collection(COLLECTION).doc(session.sessionId), session);
    tx.set(ptrRef, { sessionId: session.sessionId, updatedAt: FieldValue.serverTimestamp() });
    return { session, isNew: true };
  });
}

/**
 * Load a session and enforce ownership. Throws a tagged error for
 * cross-user access attempts (callers translate to permission-denied).
 */
async function loadSession(uid, sessionId) {
  const snap = await db.collection(COLLECTION).doc(sessionId).get();
  if (!snap.exists) {
    const e = new Error('Session not found');
    e.code = 'not-found';
    throw e;
  }
  const s = snap.data();
  if (s.userId !== uid) {
    const e = new Error('Session belongs to another user');
    e.code = 'permission-denied';
    throw e;
  }
  // Expired sessions are dead — start fresh rather than resurrecting.
  const createdMs = s.createdAt?.toMillis ? s.createdAt.toMillis() : 0;
  if (createdMs && Date.now() - createdMs > SESSION_TTL_MS) {
    const e = new Error('Session expired');
    e.code = 'not-found';
    throw e;
  }
  return s;
}

async function saveSession(session) {
  const { sessionId } = session;
  await db.collection(COLLECTION).doc(sessionId).set(
    { ...session, updatedAt: FieldValue.serverTimestamp() },
    { merge: false }
  );
}

/** Append a tool-call audit entry (server-side observability). */
function logToolCall(session, tool, inputSummary, outcome) {
  session.toolCallLog = session.toolCallLog || [];
  session.toolCallLog.push({
    tool,
    input: inputSummary,
    outcome,
    at: new Date().toISOString(),
  });
  if (session.toolCallLog.length > 50) session.toolCallLog.shift();
}

/**
 * Start a fresh session for a NEW booking while a prior paid booking is still
 * in-flight — the old doc stays for history, the pointer moves to the new one.
 */
async function rotateSession(uid) {
  const session = await createSession(uid);
  await db.collection(PTR_COLLECTION).doc(uid)
    .set({ sessionId: session.sessionId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return session;
}

module.exports = { createSession, getOrCreateSession, rotateSession, loadSession, saveSession, logToolCall, COLLECTION };
