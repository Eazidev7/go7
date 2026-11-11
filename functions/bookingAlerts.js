/**
 * Admin alerts for paid bookings — new orders, stuck dispatch, cancellations/refunds.
 */
const admin = require('firebase-admin');
const { sendNotificationEmail } = require('./resendClient');

const DEFAULT_ADMIN_EMAILS = [
  'feyisetantobiloba@gmail.com',
  '7linkz01@gmail.com',
];

async function getAdminEmails(firestore) {
  const emails = new Set(DEFAULT_ADMIN_EMAILS);
  try {
    const snap = await firestore.collection('users').where('role', '==', 'admin').get();
    snap.forEach((d) => {
      const e = d.data().email;
      if (e && typeof e === 'string') emails.add(e.trim().toLowerCase());
    });
  } catch (err) {
    console.warn('Could not load admin emails:', err.message);
  }
  return [...emails];
}

function isPaidBooking(data = {}) {
  const ps = String(data.paymentStatus || data.payment?.status || '').toLowerCase();
  return ps === 'paid' || ps === 'completed' || ps === 'success';
}

function bookingDisplayId(data, id) {
  return data.bookingId || data.id || id;
}

function bookingAdminUrl(displayId) {
  return `https://go7.ng/admin/bookings`;
}

function formatMoney(n) {
  return `₦${Number(n || 0).toLocaleString('en-NG')}`;
}

async function writeAdminAlert(firestore, payload) {
  return firestore.collection('adminAlerts').add({
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...payload,
  });
}

async function sendAdminEmail(subject, html) {
  const firestore = admin.firestore();
  const to = await getAdminEmails(firestore);
  try {
    await sendNotificationEmail({ to, subject, html });
    console.log(`✅ Admin alert email sent: ${subject}`);
    return true;
  } catch (err) {
    console.error('❌ Admin alert email failed:', err.message);
    return false;
  }
}

/**
 * New paid booking — assign a rider ASAP.
 */
async function alertAdminNewPaidBooking(data, bookingId) {
  if (!isPaidBooking(data)) return null;

  const displayId = bookingDisplayId(data, bookingId);
  const fare = data.fare || data.finalFare || data.total || data.deliveryFee || 0;
  const customerName = data.customer?.name || data.sender?.name || data.senderName || 'Customer';
  const customerPhone = data.customer?.phone || data.sender?.phone || data.phoneNumber || '—';
  const pickup = data.pickup?.address || data.pickupAddress || '—';
  const dropoff = data.dropoff?.address || data.dropoffAddress || '—';

  const subject = `🔴 PAID delivery ${displayId} — assign rider now (${formatMoney(fare)})`;
  const html = `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f3f4f6;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#E0001B;color:#fff;padding:20px 24px;">
      <h1 style="margin:0;font-size:20px;">🔴 Paid — rider needed</h1>
      <p style="margin:8px 0 0;opacity:.9;">Customer already paid. Assign within minutes.</p>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#6b7280;">Booking</td><td style="font-weight:700;">${displayId}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Customer</td><td>${customerName} · ${customerPhone}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Amount</td><td style="font-weight:700;color:#059669;">${formatMoney(fare)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Pickup</td><td>${pickup}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Dropoff</td><td>${dropoff}</td></tr>
      </table>
      <p style="margin:20px 0 0;">
        <a href="${bookingAdminUrl(displayId)}" style="display:inline-block;background:#E0001B;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;">
          Open Admin Dispatch →
        </a>
      </p>
    </div>
  </div>
</body></html>`;

  await sendAdminEmail(subject, html);
  return writeAdminAlert(admin.firestore(), {
    type: 'paid_booking_new',
    severity: 'high',
    bookingId: displayId,
    title: 'Paid delivery — assign rider',
    message: `${customerName} paid ${formatMoney(fare)} for ${displayId}. Pickup: ${pickup}`,
    customerName,
    customerPhone,
    fare,
    pickup,
    dropoff,
    actionUrl: bookingAdminUrl(displayId),
  });
}

/**
 * Customer cancelled a paid booking — refund may be required.
 */
async function alertAdminPaidBookingCancelled(before, after, bookingId) {
  if (!isPaidBooking(after)) return null;
  const wasCancelled =
    String(before.status || '').toLowerCase() !== 'cancelled' &&
    String(after.status || '').toLowerCase() === 'cancelled';
  if (!wasCancelled) return null;

  const displayId = bookingDisplayId(after, bookingId);
  const fare = after.fare || after.finalFare || after.total || 0;
  const customerName = after.customer?.name || after.sender?.name || 'Customer';
  const reason = after.cancellationReason || after.cancelReason || 'No reason recorded';

  const subject = `⚠️ REFUND? ${displayId} cancelled after payment (${formatMoney(fare)})`;
  const html = `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f3f4f6;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
    <div style="background:#b45309;color:#fff;padding:20px 24px;">
      <h1 style="margin:0;font-size:20px;">⚠️ Paid booking cancelled</h1>
      <p style="margin:8px 0 0;">Customer may need a refund or callback.</p>
    </div>
    <div style="padding:24px;font-size:14px;">
      <p><strong>Booking:</strong> ${displayId}</p>
      <p><strong>Customer:</strong> ${customerName}</p>
      <p><strong>Paid:</strong> ${formatMoney(fare)}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p style="margin-top:20px;"><a href="${bookingAdminUrl(displayId)}" style="background:#b45309;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:700;">Review in admin →</a></p>
    </div>
  </div>
</body></html>`;

  await sendAdminEmail(subject, html);
  return writeAdminAlert(admin.firestore(), {
    type: 'paid_booking_cancelled',
    severity: 'critical',
    bookingId: displayId,
    title: 'Refund may be needed',
    message: `${displayId} cancelled after ${formatMoney(fare)} payment. Reason: ${reason}`,
    customerName,
    fare,
    cancellationReason: reason,
    actionUrl: bookingAdminUrl(displayId),
    refundStatus: 'pending_review',
  });
}

/**
 * Paid booking still has no rider after threshold — re-alert admin.
 */
async function alertAdminStuckPaidBooking(data, bookingId, waitingMinutes) {
  if (!isPaidBooking(data)) return null;
  if (data.riderId || data.rider?.id) return null;

  const status = String(data.status || '').toLowerCase();
  if (!['searching_rider', 'pending', 'pending_dispatch'].includes(status)) return null;

  // Avoid spam — at most one stuck alert per hour per booking
  const lastAlert = data.lastStuckAdminAlertAt?.toMillis?.() || 0;
  if (Date.now() - lastAlert < 60 * 60 * 1000) return null;

  const displayId = bookingDisplayId(data, bookingId);
  const fare = data.fare || data.finalFare || data.total || 0;
  const customerName = data.customer?.name || data.sender?.name || 'Customer';
  const customerPhone = data.customer?.phone || data.sender?.phone || '—';

  const subject = `⏰ STILL WAITING ${displayId} — ${waitingMinutes}m, no rider (${formatMoney(fare)})`;
  const html = `
<p style="font-family:Arial;"><strong>Customer waiting ${waitingMinutes} minutes</strong> with no rider assigned.</p>
<p>Booking: ${displayId}<br>Customer: ${customerName} (${customerPhone})<br>Paid: ${formatMoney(fare)}</p>
<p><a href="${bookingAdminUrl(displayId)}">Assign rider in admin</a> or call the customer.</p>`;

  await sendAdminEmail(subject, html);
  await admin.firestore().collection('bookings').doc(bookingId).set(
    { lastStuckAdminAlertAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );

  return writeAdminAlert(admin.firestore(), {
    type: 'paid_booking_stuck',
    severity: 'critical',
    bookingId: displayId,
    title: `No rider for ${waitingMinutes}m`,
    message: `${displayId} — ${customerName} paid ${formatMoney(fare)}, still searching.`,
    customerName,
    customerPhone,
    fare,
    waitingMinutes,
    actionUrl: bookingAdminUrl(displayId),
  });
}

/**
 * New paid food/commerce order — admin needs visibility.
 */
async function alertAdminNewPaidOrder(data, orderId) {
  const ps = String(data.paymentStatus || data.payment?.status || '').toLowerCase();
  if (!['paid', 'completed', 'success'].includes(ps)) return null;

  const displayId = data.orderCode || data.orderId || orderId;
  const total = data.amountToPay || data.total || data.grandTotal || 0;
  const customerName = data.customerName || data.customer?.name || 'Customer';
  const customerPhone = data.userPhone || data.customerPhone || data.recipientInfo?.phone || '—';
  const vendor = data.vendorName || data.vendor?.name || '—';

  const subject = `🔴 PAID order ${displayId} — ₦${Number(total).toLocaleString('en-NG')} (${vendor})`;
  const html = `
<p style="font-family:Arial;"><strong>New paid order received.</strong></p>
<p>Order: ${displayId}<br>Customer: ${customerName} (${customerPhone})<br>Vendor: ${vendor}<br>Amount: ₦${Number(total).toLocaleString('en-NG')}</p>
<p><a href="https://go7.ng/admin/orders">Open orders in admin</a></p>`;

  await sendAdminEmail(subject, html);
  return writeAdminAlert(admin.firestore(), {
    type: 'paid_order_new',
    severity: 'high',
    bookingId: displayId,
    title: 'Paid order received',
    message: `${customerName} paid ₦${Number(total).toLocaleString('en-NG')} — ${vendor} (${displayId})`,
    customerName,
    customerPhone,
    fare: total,
    actionUrl: 'https://go7.ng/admin/orders',
  });
}

/**
 * Vendor requested a payout — admin must approve/pay.
 */
async function alertAdminPayoutRequest(data, payoutId) {
  const amount = data.amount || data.requestedAmount || 0;
  const vendorName = data.vendorName || data.vendor?.name || data.businessName || 'Vendor';

  const subject = `💸 Payout request — ${vendorName} wants ₦${Number(amount).toLocaleString('en-NG')}`;
  const html = `
<p style="font-family:Arial;"><strong>Vendor payout request needs review.</strong></p>
<p>Vendor: ${vendorName}<br>Amount: ₦${Number(amount).toLocaleString('en-NG')}<br>Request: ${payoutId}</p>
<p><a href="https://go7.ng/admin">Review in admin</a></p>`;

  await sendAdminEmail(subject, html);
  return writeAdminAlert(admin.firestore(), {
    type: 'payout_request',
    severity: 'high',
    bookingId: payoutId,
    title: 'Payout requested',
    message: `${vendorName} requested ₦${Number(amount).toLocaleString('en-NG')}`,
    fare: amount,
    actionUrl: 'https://go7.ng/admin',
  });
}

module.exports = {
  isPaidBooking,
  alertAdminNewPaidBooking,
  alertAdminPaidBookingCancelled,
  alertAdminStuckPaidBooking,
  alertAdminNewPaidOrder,
  alertAdminPayoutRequest,
  getAdminEmails,
};
