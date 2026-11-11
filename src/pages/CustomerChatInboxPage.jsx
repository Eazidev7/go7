import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageCircle, ChevronRight } from 'lucide-react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthContext } from '../contexts/AuthContext';

const ACTIVE_STATUSES = new Set([
  'pending',
  'confirmed',
  'assigned',
  'accepted',
  'picked_up',
  'pickup',
  'in_transit',
  'in-transit',
  'on_the_way',
  'on-the-way',
  'nearby',
  'out_for_delivery',
  'delivering',
]);

function formatRelativeTime(value) {
  const date = value?.toDate?.() || (value instanceof Date ? value : null);
  if (!date) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

function normalizeStatus(status) {
  return String(status || '').toLowerCase().replace(/\s+/g, '_');
}

function buildConversation(docSnap, collectionName) {
  const data = docSnap.data();
  const status = normalizeStatus(data.status);
  const orderId = docSnap.id;
  const orderNumber =
    data.bookingId || data.orderNumber || data.jobId || data.trackingId || orderId;

  return {
    id: orderId,
    orderNumber,
    collection: collectionName,
    rider: {
      name: data.riderName || data.rider?.name || 'Rider',
      phone: data.riderPhone || data.rider?.phone || '',
      image: data.riderPhoto || data.rider?.photoURL || data.rider?.image || '',
      rating: data.rider?.rating || 5,
    },
    status: ACTIVE_STATUSES.has(status) ? 'active' : 'delivered',
    updatedAt:
      data.updatedAt?.toDate?.() ||
      data.createdAt?.toDate?.() ||
      new Date(0),
    lastMessage: {
      text: data.lastChatMessage || 'Tap to open delivery chat',
      timestamp:
        data.updatedAt?.toDate?.() ||
        data.createdAt?.toDate?.() ||
        new Date(0),
      sender: 'rider',
    },
    unreadCount: 0,
  };
}

async function queryByCustomerField(collectionName, field, uid) {
  try {
    const q = query(
      collection(db, collectionName),
      where(field, '==', uid),
      orderBy('updatedAt', 'desc'),
      limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs;
  } catch {
    try {
      const q = query(
        collection(db, collectionName),
        where(field, '==', uid),
        limit(30)
      );
      const snap = await getDocs(q);
      return snap.docs;
    } catch {
      return [];
    }
  }
}

async function loadCustomerConversations(uid) {
  if (!db || !uid) return [];

  const collections = ['bookings', 'orders', 'gobuy_orders'];
  const fields = ['customerId', 'userId', 'uid', 'customerUid'];
  const seen = new Map();

  for (const collectionName of collections) {
    for (const field of fields) {
      const docs = await queryByCustomerField(collectionName, field, uid);
      docs.forEach((docSnap) => {
        if (!seen.has(docSnap.id)) {
          seen.set(docSnap.id, buildConversation(docSnap, collectionName));
        }
      });
    }
  }

  const conversations = Array.from(seen.values());

  await Promise.all(
    conversations.map(async (conv) => {
      try {
        const chatSnap = await getDoc(doc(db, 'chats', conv.id));
        if (!chatSnap.exists()) return;
        const chat = chatSnap.data();
        if (chat.lastMessage) {
          conv.lastMessage = {
            text: chat.lastMessage,
            timestamp: chat.updatedAt?.toDate?.() || chat.lastMessageTime?.toDate?.() || conv.updatedAt,
            sender: chat.lastSenderType === 'customer' ? 'user' : 'rider',
          };
        }
      } catch {
        // ignore chat metadata errors
      }
    })
  );

  return conversations.sort(
    (a, b) => b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime()
  );
}

function ConversationItem({ conversation, onClick }) {
  const { rider, orderNumber, lastMessage, status } = conversation;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 px-5 py-4 hover:bg-gray-50 border-b border-gray-100 text-left"
    >
      <div className="w-12 h-12 rounded-full bg-[#E53935]/10 text-[#E53935] font-bold flex items-center justify-center flex-shrink-0">
        {rider.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-bold truncate text-[#121212]">{rider.name}</h3>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {formatRelativeTime(lastMessage.timestamp)}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-1">{orderNumber}</p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-gray-600 truncate">
            {lastMessage.sender === 'user' ? 'You: ' : ''}
            {lastMessage.text}
          </p>
          {status === 'active' ? (
            <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">
              Active
            </span>
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
        </div>
      </div>
    </button>
  );
}

export default function CustomerChatInboxPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!user?.uid) {
        setConversations([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const rows = await loadCustomerConversations(user.uid);
      if (!cancelled) {
        setConversations(rows);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (conv) =>
        conv.rider.name.toLowerCase().includes(q) ||
        conv.orderNumber.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const activeConversations = filteredConversations.filter((c) => c.status === 'active');
  const pastConversations = filteredConversations.filter((c) => c.status !== 'active');

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="bg-[#E53935] px-5 pt-3 pb-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white text-2xl font-bold">Messages</h1>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages or orders..."
            className="w-full bg-white rounded-full pl-12 pr-4 py-3 text-[#121212] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!user?.uid && (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <h3 className="font-bold text-lg mb-2">Sign in to view messages</h3>
            <p className="text-gray-500 text-sm mb-4">
              Your delivery chats with riders appear here after you place an order.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="bg-[#E53935] text-white px-6 py-3 rounded-full font-medium"
            >
              Sign in
            </button>
          </div>
        )}

        {user?.uid && loading && (
          <p className="text-center text-sm text-gray-500 py-12">Loading your chats…</p>
        )}

        {user?.uid && !loading && filteredConversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="font-bold text-lg mb-2">
              {searchQuery ? 'No messages found' : 'No messages yet'}
            </h3>
            <p className="text-gray-500 text-sm">
              {searchQuery
                ? 'Try searching with a different keyword'
                : 'Book a delivery or place an order to chat with your rider here.'}
            </p>
          </div>
        )}

        {activeConversations.length > 0 && (
          <div>
            <div className="px-5 py-3 bg-green-50 border-b border-green-100">
              <span className="text-sm font-bold text-green-700">
                Active Deliveries ({activeConversations.length})
              </span>
            </div>
            {activeConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                onClick={() => navigate(`/chat/${conv.id}`)}
              />
            ))}
          </div>
        )}

        {pastConversations.length > 0 && (
          <div>
            <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500">Recent Chats</span>
            </div>
            {pastConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                onClick={() => navigate(`/chat/${conv.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
