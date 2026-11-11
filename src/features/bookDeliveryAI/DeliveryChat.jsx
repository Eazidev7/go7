/**
 * 💬 Go7 Book Delivery AI — conversational booking at /book-delivery/ai.
 *
 * Orchestration layer only: every server reply carries messages + a UI card
 * payload. The client never sets prices, coordinates, payment state, or
 * rider assignment — it renders what the authoritative backend returns.
 *
 * The manual flow at /book-delivery is untouched and always reachable via
 * the "Continue with manual booking" fallback card.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuthContext } from '../../contexts/AuthContext';
import {
  startSession, sendMessage, sendAction, executePayment,
} from './deliveryChatService';
import { botMessage, userMessage } from './deliveryChatState';
import DeliveryChatMessage from './DeliveryChatMessage';
import DeliveryQuickActions from './DeliveryQuickActions';
import { LocationConfirmCard, LocationCandidatesCard } from './DeliveryLocationCard';
import DeliveryQuoteCard from './DeliveryQuoteCard';
import { PaymentOptionsCard, PaymentActionCard, FindingRiderCard, TrackingCard } from './DeliveryPaymentCard';

const SUGGESTIONS = [
  'Send a laptop from Kuto to Camp',
  'Pick up a package from Orombo to FUNAAB',
  'Deliver documents to Alabata',
];

export default function DeliveryChat() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [authError, setAuthError] = useState(false);
  const scrollRef = useRef(null);
  const sessionIdRef = useRef(null);
  const pendingRef = useRef([]);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, []);

  const appendReplies = useCallback((replies) => {
    const items = (replies || []).map((m) => botMessage(m.text, m.ui || null));
    if (!items.length) return;
    setMessages((prev) => {
      // Guard against a turn firing twice (remount/double-fire) appending the
      // exact same replies again — skip consecutive identical repeats.
      let out = prev;
      for (const it of items) {
        const last = out[out.length - 1];
        if (last && last.role === 'assistant' && last.text === it.text) continue;
        out = [...out, it];
      }
      return out;
    });
    scrollDown();
  }, [scrollDown]);

  const turn = useCallback(async (payload) => {
    setBusy(true);
    try {
      const res = payload.start
        ? await startSession()
        : payload.action
          ? await sendAction(sessionIdRef.current, payload.action)
          : await sendMessage(sessionIdRef.current, payload.message);
      if (res.sessionId) {
        sessionIdRef.current = res.sessionId;
        setSessionId(res.sessionId);
      }
      appendReplies(res.messages);
    } catch (err) {
      const code = String(err?.code || '');
      if (code.includes('unauthenticated')) {
        setAuthError(true);
        appendReplies([{ text: 'Please sign in to use the delivery assistant.', ui: null }]);
      } else if (code.includes('not-found')) {
        sessionIdRef.current = null;
        setSessionId(null); // expired — next send starts fresh
        appendReplies([{ text: "That session expired — let's start fresh. What would you like to send?", ui: { type: 'quick_actions' } }]);
      } else {
        appendReplies([{ text: 'Something went wrong — you can try again or continue with manual booking.', ui: { type: 'manual_fallback', label: 'Continue with manual booking', route: '/book-delivery/manual' } }]);
      }
    } finally {
      setBusy(false);
      // A message typed while the previous turn was in flight goes out now.
      const next = pendingRef.current.shift();
      if (next) turn({ message: next });
    }
  }, [appendReplies]);

  // Kick off a session once the customer is authenticated (covers sign-in
  // after page load too — the chat callable requires auth).
  const startedRef = useRef(false);
  const promptedRef = useRef(false);
  useEffect(() => {
    if (user) {
      if (startedRef.current) return;
      startedRef.current = true;
      turn({ start: true }).catch(() => {});
    } else if (!authLoading && !promptedRef.current) {
      promptedRef.current = true;
      setAuthError(true);
      appendReplies([{ text: 'Please sign in to use the delivery assistant.', ui: null }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const handleSend = useCallback((text) => {
    const t = String(text || '').trim();
    if (!t) return;
    setMessages((prev) => [...prev, userMessage(t)]);
    setInput('');
    scrollDown();
    if (busy) { pendingRef.current.push(t); return; }
    turn({ message: t });
  }, [busy, turn, scrollDown]);

  const handleAction = useCallback((action, echoText) => {
    if (busy) return;
    if (echoText) setMessages((prev) => [...prev, userMessage(echoText)]);
    turn({ action });
  }, [busy, turn]);

  const handlePay = useCallback(async (ui) => {
    if (!user) { setAuthError(true); return; }
    setBusy(true);
    try {
      const confirm = await executePayment({
        method: ui.method,
        bookingId: ui.bookingId,
        amountKobo: ui.amountKobo,
        amount: ui.amount,
        user,
      });
      appendReplies([{ text: 'Verifying your payment…' }]);
      await handleAction({ type: 'payment_confirmed', bookingId: ui.bookingId });
      if (confirm?.dispatch?.assigned) {
        // server already attached the rider; the chat reply will reflect it
      }
    } catch (err) {
      appendReplies([{
        text: `Payment didn't complete: ${String(err?.message || err).slice(0, 120)}. Tap the pay button to try again.`,
      }]);
    } finally {
      setBusy(false);
    }
  }, [user, appendReplies, handleAction]);

  const renderUi = (ui) => {
    if (!ui) return null;
    switch (ui.type) {
      case 'quick_actions':
        return <DeliveryQuickActions onPick={(m) => handleSend(m)} />;
      case 'location_confirm':
        return (
          <LocationConfirmCard
            role={ui.role}
            location={ui.location}
            disabled={busy}
            onConfirm={() => handleAction({ type: 'confirm_location', role: ui.role }, 'Yes, that\'s correct')}
            onChange={() => handleAction({ type: 'change_location', role: ui.role }, 'Change')}
          />
        );
      case 'location_candidates':
        return (
          <LocationCandidatesCard
            candidates={ui.candidates}
            disabled={busy}
            onSelect={(i) => handleAction({ type: 'select_location', role: ui.role, index: i }, ui.candidates[i]?.name)}
            onCustom={() => appendReplies([{ text: 'Type the area or landmark name and I\'ll find it.' }])}
          />
        );
      case 'package_options':
        return (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {ui.options.map((o) => (
              <button
                key={o}
                onClick={() => handleAction({ type: 'set_package', item: o.replace(/^[^ ]+ /, '') }, o)}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2 py-2.5 text-[13px] font-medium text-gray-700 hover:border-[#E30613] disabled:opacity-50 shadow-sm"
              >
                {o}
              </button>
            ))}
          </div>
        );
      case 'quote':
        return (
          <DeliveryQuoteCard
            quote={ui.quote}
            disabled={busy}
            onConfirm={() => handleAction({ type: 'confirm_quote' }, 'Yes, continue')}
            onCancel={() => handleAction({ type: 'cancel' }, 'Cancel')}
          />
        );
      case 'payment_options':
        return (
          <PaymentOptionsCard
            options={ui.options}
            disabled={busy}
            onSelect={(method) => handleAction({ type: 'select_payment_method', method })}
          />
        );
      case 'payment':
        return <PaymentActionCard method={ui.method} amount={ui.amount} paying={busy} disabled={false} onPay={() => handlePay(ui)} />;
      case 'payment_pending':
      case 'finding_rider':
        return (
          <FindingRiderCard
            checking={checking}
            onCheck={async () => {
              setChecking(true);
              try { await handleAction({ type: 'check_rider' }); } finally { setChecking(false); }
            }}
          />
        );
      case 'action_buttons':
        return (
          <div className="mt-2 flex flex-wrap gap-2">
            {ui.buttons.map((b) => (
              <button
                key={b.label}
                onClick={() => handleAction(b.action, b.label)}
                disabled={busy}
                className="bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-[13px] font-medium text-gray-700 hover:border-[#E30613] hover:text-[#E30613] disabled:opacity-50 shadow-sm"
              >
                {b.label}
              </button>
            ))}
          </div>
        );
      case 'tracking':
        return <TrackingCard orderId={ui.orderId} onOpen={() => navigate(ui.trackingUrl)} />;
      case 'manual_fallback':
        return (
          <Link
            to={ui.route || '/book-delivery/manual'}
            className="inline-block mt-2 bg-[#E30613] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg"
          >
            {ui.label || 'Continue with manual booking'}
          </Link>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet><title>Go7 Delivery Assistant | AI Booking</title></Helmet>

      {/* Header — matches the approved chat design */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-gray-600 text-xl leading-none" aria-label="Back">‹</button>
        <div className="w-9 h-9 rounded-full bg-[#E30613] flex items-center justify-center text-white font-bold text-sm">G7</div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-gray-900 leading-tight">Go7 Delivery Assistant</p>
          <p className="text-[11px] text-green-500 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" /> Online
          </p>
        </div>
        <Link to="/book-delivery/manual" className="text-[12px] font-semibold text-gray-400 hover:text-[#E30613]">
          Manual form
        </Link>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        {messages.map((m) => (
          <DeliveryChatMessage key={m.id} msg={m}>{renderUi(m.ui)}</DeliveryChatMessage>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
            <div className="w-8 h-8 rounded-full bg-[#E30613] flex items-center justify-center text-white text-xs font-bold">G7</div>
            <span className="bg-white border border-gray-100 rounded-2xl rounded-tl-md px-4 py-2.5 shadow-sm">
              <span className="animate-pulse">typing…</span>
            </span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-3 pt-2 pb-4">
        <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-hide">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              disabled={busy}
              className="flex-shrink-0 text-[12px] bg-gray-100 text-gray-600 rounded-full px-3 py-1.5 hover:bg-red-50 hover:text-[#E30613] disabled:opacity-50"
            >
              "{s}"
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
        >
          <button type="button" className="w-9 h-9 rounded-full bg-[#E30613] text-white text-lg leading-none flex items-center justify-center" aria-label="Add">+</button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={authError ? 'Sign in to continue…' : 'Type your message…'}
            className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#E30613]/30"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-9 h-9 rounded-full bg-[#E30613] text-white flex items-center justify-center disabled:opacity-40"
            aria-label="Send"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
