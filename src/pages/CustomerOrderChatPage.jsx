import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, Send } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import toast from 'react-hot-toast';
import { useAuthContext } from '../contexts/AuthContext';
import {
  sendOrderChatMessage,
  subscribeToOrderChat,
} from '../services/orderDeliveryChat';
import { loadTrackingOrder } from '../utils/loadTrackingOrder';

function formatTime(date) {
  return date.toLocaleTimeString('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function CustomerOrderChatPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const uid = user?.uid || getAuth().currentUser?.uid || null;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rider, setRider] = useState({ name: 'Your rider', phone: '' });
  const [orderNumber, setOrderNumber] = useState(orderId || '');
  const [riderId, setRiderId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    (async () => {
      try {
        const record = await loadTrackingOrder(orderId);
        if (cancelled || !record?.data) return;

        const data = record.data;
        setOrderNumber(data.bookingId || data.orderNumber || data.jobId || record.docId || orderId);
        setRider({
          name: data.riderName || data.rider?.name || 'Your rider',
          phone: data.riderPhone || data.rider?.phone || '',
          image: data.riderPhoto || data.rider?.photoURL || data.rider?.image || '',
        });
        setRiderId(data.riderId || data.rider?.id || data.assignedRiderId || null);
      } catch (err) {
        console.warn('[CustomerOrderChatPage] order lookup failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return undefined;

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
  }, [orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50">
      <div className="bg-[#E53935] px-4 py-4 flex items-center gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate('/chat')}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 min-w-0 text-white">
          <h1 className="font-bold truncate">{rider.name}</h1>
          <p className="text-sm opacity-90 truncate">Order {orderNumber}</p>
        </div>
        {rider.phone && (
          <a
            href={`tel:${rider.phone}`}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
          >
            <Phone className="w-5 h-5 text-white" />
          </a>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50 min-h-0">
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

      <div className="px-4 py-3 bg-white border-t border-gray-200 flex-shrink-0">
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
        <div className="flex items-center gap-3 mt-2">
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
    </div>
  );
}
