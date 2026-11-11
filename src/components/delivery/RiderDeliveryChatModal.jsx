import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Phone, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { getAuth } from 'firebase/auth';
import {
  sendOrderChatMessage,
  subscribeToOrderChat,
} from '../../services/orderDeliveryChat';

function formatTime(date) {
  return date.toLocaleTimeString('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function RiderDeliveryChatModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  rider = {},
  customerId = null,
  riderId = null,
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const uid = customerId || getAuth().currentUser?.uid || null;

  useEffect(() => {
    if (!isOpen || !orderId) return undefined;

    setLoading(true);
    const unsub = subscribeToOrderChat(
      orderId,
      (rows) => {
        setMessages(rows);
        setLoading(false);
      },
      () => setLoading(false)
    );

    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => {
      unsub();
      clearTimeout(t);
    };
  }, [isOpen, orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    if (!uid) {
      toast.error('Please sign in to message your rider');
      return;
    }

    setSending(true);
    try {
      await sendOrderChatMessage({
        orderId,
        senderId: uid,
        senderType: 'customer',
        text,
        riderId,
        customerId: uid,
      });
      setInputText('');
    } catch (err) {
      console.error(err);
      toast.error('Could not send message. Try again.');
    } finally {
      setSending(false);
    }
  };

  const quickReplies = [
    'Please call when you arrive',
    'Leave at the door',
    "I'm outside",
    'How far are you?',
  ];

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[9999] mx-auto w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col"
            style={{
              height: 'min(94dvh, 100%)',
              maxHeight: '100dvh',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#E53935] px-5 py-4 rounded-t-3xl flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full border-2 border-white bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {rider.image ? (
                    <img src={rider.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <MessageCircle className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="text-white min-w-0">
                  <h2 className="font-bold truncate">{rider.name || 'Your rider'}</h2>
                  <p className="text-sm opacity-90 truncate">Order {orderNumber || orderId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {rider.phone && (
                  <a
                    href={`tel:${rider.phone}`}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="w-5 h-5 text-white" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50 min-h-0">
              {loading && (
                <p className="text-center text-sm text-gray-500 py-8">Loading messages…</p>
              )}
              {!loading && messages.length === 0 && (
                <div className="text-center py-10 px-4">
                  <p className="text-gray-600 font-medium">No messages yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Send a message to your rider about this delivery.
                  </p>
                </div>
              )}
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isUser = msg.senderType === 'customer';
                  return (
                    <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                          isUser
                            ? 'bg-[#E53935] text-white rounded-br-sm'
                            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <p className={`text-[10px] mt-1 ${isUser ? 'text-white/70' : 'text-gray-400'}`}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="px-5 py-3 bg-white border-t border-gray-200 flex-shrink-0">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => setInputText(reply)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full text-xs font-medium whitespace-nowrap"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white px-5 py-4 border-t border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={uid ? 'Type a message…' : 'Sign in to chat'}
                  disabled={!uid || sending}
                  className="flex-1 bg-gray-100 rounded-full px-5 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!uid || !inputText.trim() || sending}
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-[#E53935] text-white disabled:bg-gray-200 disabled:text-gray-400"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
