import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';

function resolveSenderType(data) {
  if (data.senderType) return data.senderType;
  if (data.senderRole) return data.senderRole;
  if (data.sender === 'rider' || data.sender === 'customer') return data.sender;
  return 'customer';
}

function normalizeMessage(docSnap) {
  const data = docSnap.data();
  const ts = data.timestamp?.toDate?.() || (data.createdAt?.toDate?.()) || new Date();
  const text = data.message || data.text || '';
  const senderType = resolveSenderType(data);
  return {
    id: docSnap.id,
    text,
    senderType,
    senderId: data.senderId || '',
    timestamp: ts,
    isRead: Boolean(data.isRead),
  };
}

export function subscribeToOrderChat(orderId, onMessages, onError) {
  if (!db || !orderId) {
    onMessages([]);
    return () => {};
  }

  const q = query(
    collection(db, 'chats', orderId, 'messages'),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(
    q,
    (snap) => {
      onMessages(snap.docs.map(normalizeMessage));
    },
    (err) => {
      console.error('[orderDeliveryChat] subscribe failed:', err);
      onError?.(err);
      onMessages([]);
    }
  );
}

export async function sendOrderChatMessage({
  orderId,
  senderId,
  senderType,
  text,
  riderId = null,
  customerId = null,
}) {
  if (!db || !orderId || !text?.trim()) {
    throw new Error('Missing order or message');
  }

  const payload = {
    senderId: senderId || senderType,
    senderType,
    message: text.trim(),
    text: text.trim(),
    timestamp: serverTimestamp(),
    isRead: false,
  };

  await addDoc(collection(db, 'chats', orderId, 'messages'), payload);

  await setDoc(
    doc(db, 'chats', orderId),
    {
      orderId,
      updatedAt: serverTimestamp(),
      lastMessage: text.trim(),
      lastSenderType: senderType,
      ...(riderId && { riderId }),
      ...(customerId && { customerId }),
    },
    { merge: true }
  );
}
