/**
 * Write customer-facing activity rows into `notifications` for the in-app inbox.
 * Always set both `uid` and `userId` so the Figma NotificationsPage can query either.
 */
const admin = require('firebase-admin');

async function writeCustomerInboxNotification({
  uid,
  userId,
  title,
  message,
  body,
  type,
  orderId,
  status,
  extra = {},
}) {
  const owner = uid || userId;
  if (!owner) {
    console.warn('[customerInbox] skip — no uid/userId');
    return null;
  }

  const text = message || body || '';
  const payload = {
    uid: owner,
    userId: owner,
    title: title || 'GO7 Update',
    message: text,
    body: text,
    type: type || 'activity',
    orderId: orderId || null,
    status: status || null,
    read: false,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...extra,
  };

  try {
    const ref = await admin.firestore().collection('notifications').add(payload);
    return ref.id;
  } catch (err) {
    console.error('[customerInbox] write failed:', err.message);
    return null;
  }
}

module.exports = {
  writeCustomerInboxNotification,
};
