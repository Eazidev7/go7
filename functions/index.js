const functions = require('firebase-functions/v1');
const { defineString } = require('firebase-functions/params');
const admin = require('./adminInit');
const crypto = require('crypto');

const firestore = admin.firestore();

// Import Resend email service for wallet notifications
const { sendWalletCreditEmail, sendWalletDebitEmail } = require('./resendEmailService');

// Import delivery notification functions
const deliveryNotifications = require('./deliveryNotifications');
const scheduledDeliveries = require('./scheduledDeliveries');
const deliveryReminders = require('./deliveryReminders');
const gobuyAssignment = require('./gobuyAssignment');
const whatsappNotifications = require('./whatsappNotifications');
const whatsappNotifier = require('./whatsappNotifier');
const whatsappWebhook = require('./whatsappWebhook');
const whatsappBot = require('./whatsappBot');
const locationResolver = require('./locationResolver');
const packageDetection = require('./packageDetection');
const deliveryFeeService = require('./deliveryFeeService');
const commerceOrderService = require('./commerceOrderService');
const promotionService = require('./promotionService');
const { loadCanonicalDeliveryPricing } = require('./pricingConfig');

// Import live delivery tracking functions
const { 
  onRiderLocationUpdate, 
  onDeliveryStatusChange, 
  updateDeliveryETA 
} = require('./liveDelivery');
const notificationTracking = require('./notificationTracking');
const autoRetryWhatsApp = require('./autoRetryWhatsApp');
const vendorOrderWhatsApp = require('./vendorOrderWhatsApp');
const vendorOfflineHandler = require('./vendorOfflineHandler');
const { 
  notifyAdminsRiderApplication,
  sendRiderApprovalEmail,
  sendRiderReuploadRequestEmail,
} = require('./riderNotifications');
const { writeCustomerInboxNotification } = require('./customerInbox');

// Import addon image processing functions
// addonImageProcessor disabled (requires sharp which is removed)
// const { generateAddonThumbnail, cleanupAddonImages } = require('./src/addonImageProcessor');

// ====================================================================
// 📧📱 RESEND + TERMII NOTIFICATION FUNCTIONS (Email & SMS)
// ====================================================================
const fetch = require('node-fetch');
const { getResend, sendNotificationEmail, WORKING_FROM } = require('./resendClient');

/**
 * TRIGGER 1: New Booking Created - Send Email & SMS
 */
exports.notifyOnBooking = functions.firestore
  .document('bookings/{deliveryId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const id = context.params.deliveryId;
    const { pickup, dropoff, sender, recipient, fare, distance, bookingId } = data;
    const displayId = bookingId || id;

    console.log(`🚀 New booking: ${displayId}`);

    try {
      // Email
      const emailRecipients = [];
      if (sender?.email) emailRecipients.push(sender.email);
      if (recipient?.email && recipient.email !== sender?.email) emailRecipients.push(recipient.email);

      if (emailRecipients.length > 0) {
        const resend = getResend();
        if (resend) {
          await resend.emails.send({
          from: 'Go7 <notifications@go7.ng>',
          to: emailRecipients,
          subject: `✅ Go7 Delivery #${displayId} Confirmed`,
          html: `
            <div style="font-family:Arial;max-width:600px;margin:0 auto">
              <div style="background:linear-gradient(135deg,#E30613,#8B0000);color:white;padding:30px;text-align:center">
                <h1>🚚 Delivery Confirmed!</h1>
                <p>Booking ID: ${displayId}</p>
              </div>
              <div style="padding:30px;background:#f9f9f9">
                <p><strong>📍 Pickup:</strong> ${sender?.name} | ${pickup?.address}</p>
                <p><strong>🎯 Dropoff:</strong> ${recipient?.name} | ${dropoff?.address}</p>
                <p><strong>Distance:</strong> ${distance?.toFixed(2) || 'N/A'} km | <strong>Fare:</strong> ₦${fare?.toLocaleString()}</p>
                <p><a href="https://go7.ng/track/${displayId}" style="background:#E30613;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;display:inline-block;margin:20px 0">Track Delivery</a></p>
              </div>
            </div>
          `
          });
          console.log('✅ Emails sent to:', emailRecipients);
        }
      }

      // SMS
      const smsMsg = `Go7 Delivery #${displayId} booked. Pickup: ${pickup?.address}. Dropoff: ${dropoff?.address}. Track: go7.ng/track/${displayId}`;
      if (sender?.phone) await sendTermiiSMS(sender.phone, smsMsg);
      if (recipient?.phone && recipient.phone !== sender?.phone) await sendTermiiSMS(recipient.phone, smsMsg);

      // Log for customer in-app inbox
      await admin.firestore().collection('notifications').add({
        uid: data.userId || null,
        userId: data.userId || null,
        orderId: displayId,
        type: 'booking_created',
        title: 'Booking confirmed',
        message: smsMsg,
        body: smsMsg,
        status: 'finding_shopper',
        read: false,
        recipients: emailRecipients,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      // Reassure customer — payment received, team notified
      const reassureMsg = `Go7: Payment confirmed for #${displayId}. We're assigning a rider now — track at go7.ng/track-order/${displayId}`;
      if (sender?.phone) await sendTermiiSMS(sender.phone, reassureMsg);

      // 🚀 CREATE DELIVERY RECORD FOR RIDERS APP
      // Copy booking to deliveries collection so riders can see and accept it
      await admin.firestore().collection('deliveries').doc(id).set({
        bookingId: displayId,
        orderId: displayId,
        requiresDeliveryPin: Boolean(data.requiresDeliveryPin || data.deliveryPin || data.customerPIN),
        // 💰 Delivery fee split (rider earns percentage, platform keeps rest)
        deliveryFee: data.deliveryFee || data.total || 0, // Total customer paid
        riderPayout: data.riderPayout || Math.round((data.deliveryFee || data.total || 0) * 0.50), // 50% to rider
        platformFee: data.platformFee || Math.round((data.deliveryFee || data.total || 0) * 0.50), // 50% to platform
        riderPercentage: data.riderPercentage || 50,
        pickup: pickup || { address: data.pickupAddress, coordinates: data.pickupCoords },
        dropoff: dropoff || { address: data.dropoffAddress, coordinates: data.dropoffCoords },
        sender: sender || { phone: data.phoneNumber, name: data.userName || 'Customer' },
        recipient: recipient || { phone: data.recipientNumber || data.phoneNumber },
        itemDescription: data.itemDescription || 'Package',
        serviceType: data.serviceType || 'parcel',
        orderType: data.orderType || 'GENERAL_DELIVERY',
        fare: data.deliveryFee || data.total,
        // Book Delivery point-to-point pricing + geospatial data (authoritative
        // fields captured at order creation; historical fee is preserved).
        distance: distance || data.distance,
        distanceKm: distance || data.distance || data.distanceKm || null,
        pickupLatitude: pickup && pickup.coordinates ? pickup.coordinates.lat : null,
        pickupLongitude: pickup && pickup.coordinates ? pickup.coordinates.lng : null,
        dropoffLatitude: dropoff && dropoff.coordinates ? dropoff.coordinates.lat : null,
        dropoffLongitude: dropoff && dropoff.coordinates ? dropoff.coordinates.lng : null,
        pricingConfigVersion: data.pricingConfigVersion || null,
        pickupZone: data.pickupZone || null,
        dropoffZone: data.dropoffZone || null,
        vehicleType: data.vehicleType || null,
        // Referral / product-marketer attribution (future) — passthrough if present.
        referralCode: data.referralCode || null,
        referrerId: data.referrerId || null,
        promotionId: data.promotionId || null,
        promoCreditApplied: data.promoCreditApplied || data.promotionCredit || null,
        paymentStatus: data.paymentStatus || 'completed',
        status: 'pending', // Pending rider acceptance
        riderId: null, // No rider assigned yet
        riderName: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        userId: data.userId,
        userEmail: data.userEmail
      });

      console.log(`✅ Delivery record created for booking ${displayId} | Rider earns: ₦${data.riderPayout} (${data.riderPercentage}%)`);

      // 🔔 Alert admin — customer already paid, needs rider assignment
      try {
        const { alertAdminNewPaidBooking } = require('./bookingAlerts');
        await alertAdminNewPaidBooking(data, id);
      } catch (alertErr) {
        console.error('Admin new-booking alert failed:', alertErr.message);
      }

    } catch (error) {
      console.error('❌ Notification error:', error);
    }
  });

/**
 * TRIGGER 2: Package Picked Up
 */
exports.notifyOnPickup = functions.firestore
  .document('bookings/{deliveryId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    const id = change.after.id;

    if (before.status !== 'picked_up' && after.status === 'picked_up') {
      const { sender, recipient, riderName, bookingId } = after;
      const displayId = bookingId || id;
      console.log(`📦 Pickup: ${displayId}`);

      try {
        const emailRecipients = [];
        if (sender?.email) emailRecipients.push(sender.email);
        if (recipient?.email && recipient.email !== sender?.email) emailRecipients.push(recipient.email);

        if (emailRecipients.length > 0) {
          const resend = getResend();
          if (resend) {
            await resend.emails.send({
            from: 'Go7 <notifications@go7.ng>',
            to: emailRecipients,
            subject: `📦 Go7 Delivery #${displayId} Picked Up`,
            html: `<div style="font-family:Arial;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#16a34a,#15803d);color:white;padding:30px;text-align:center"><h1>✅ Package Picked Up!</h1></div><div style="padding:30px"><p>Rider: ${riderName || 'Go7 Rider'}</p><p><a href="https://go7.ng/track/${displayId}" style="background:#16a34a;color:white;padding:12px 30px;text-decoration:none;border-radius:5px">Track Live</a></p></div></div>`
            });
          }
        }

        const smsMsg = `Go7: Delivery #${displayId} picked up. Track: go7.ng/track/${displayId}`;
        if (sender?.phone) await sendTermiiSMS(sender.phone, smsMsg);
        if (recipient?.phone && recipient.phone !== sender?.phone) await sendTermiiSMS(recipient.phone, smsMsg);

        await admin.firestore().collection('notifications').add({
          uid: after.userId || null,
          userId: after.userId || null,
          orderId: displayId,
          type: 'picked_up',
          title: 'Package picked up',
          message: smsMsg,
          body: smsMsg,
          status: 'picked-up',
          read: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error('❌ Pickup notification error:', error);
      }
    }
  });

/**
 * TRIGGER 3: Delivery Completed
 */
exports.notifyOnDelivery = functions.firestore
  .document('bookings/{deliveryId}')
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    const id = change.after.id;

    if (before.status !== 'delivered' && after.status === 'delivered') {
      const { sender, recipient, fare, bookingId } = after;
      const displayId = bookingId || id;
      console.log(`🎉 Delivered: ${displayId}`);

      try {
        const emailRecipients = [];
        if (sender?.email) emailRecipients.push(sender.email);
        if (recipient?.email && recipient.email !== sender?.email) emailRecipients.push(recipient.email);

        if (emailRecipients.length > 0) {
          const resend = getResend();
          if (resend) {
            await resend.emails.send({
            from: 'Go7 <notifications@go7.ng>',
            to: emailRecipients,
            subject: `🎉 Go7 Delivery #${displayId} Completed`,
            html: `<div style="font-family:Arial;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;padding:30px;text-align:center"><h1>🎉 Delivery Completed!</h1></div><div style="padding:30px;text-align:center"><div style="background:#dcfce7;padding:20px;border-radius:8px;margin:20px 0"><h2>✅ Successfully Delivered</h2><p>Total: ₦${fare?.toLocaleString()}</p></div><p><a href="https://go7.ng/book" style="background:#8b5cf6;color:white;padding:12px 30px;text-decoration:none;border-radius:5px">Book Another</a></p></div></div>`
            });
          }
        }

        const smsMsg = `Go7: Delivery #${displayId} completed! Thank you for using Go7.`;
        if (sender?.phone) await sendTermiiSMS(sender.phone, smsMsg);
        if (recipient?.phone && recipient.phone !== sender?.phone) await sendTermiiSMS(recipient.phone, smsMsg);

        await admin.firestore().collection('notifications').add({
          uid: after.userId || null,
          userId: after.userId || null,
          orderId: displayId,
          type: 'delivered',
          title: 'Delivery completed',
          message: smsMsg,
          body: smsMsg,
          status: 'delivered',
          read: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error('❌ Delivery notification error:', error);
      }
    }
  });

/**
 * TRIGGER: Any booking status change → customer in-app inbox
 * (covers assigned / enroute / nearby etc. beyond pickup & delivered SMS triggers)
 */
exports.onBookingActivityInbox = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const beforeStatus = String(before.status || '').toLowerCase();
    const afterStatus = String(after.status || '').toLowerCase();
    if (!afterStatus || beforeStatus === afterStatus) return null;

    const uid = after.userId || after.customerId || after.customer?.uid || null;
    if (!uid) return null;

    const displayId = after.bookingId || context.params.bookingId;
    const titleMap = {
      pending: 'Booking received',
      searching_rider: 'Finding a rider',
      assigned: 'Rider assigned',
      accepted: 'Rider assigned',
      enroute: 'Rider en route',
      enroute_pickup: 'Rider heading to pickup',
      enroute_dropoff: 'Rider en route to you',
      in_transit: 'Rider en route',
      at_pickup: 'Rider arrived at pickup',
      arrived_pickup: 'Rider arrived at pickup',
      picked_up: 'Package picked up',
      at_delivery: 'Rider nearby — share your PIN',
      arrived_dropoff: 'Rider nearby — share your PIN',
      nearby: 'Rider nearby',
      arriving: 'Rider nearby',
      delivered: 'Delivered',
      completed: 'Delivered',
      cancelled: 'Booking cancelled',
    };
    const title = titleMap[afterStatus] || `Delivery update: ${afterStatus}`;
    const message = `GO7 #${displayId} — ${title}. Open Track for live updates.`;

    // Skip duplicates for statuses already written by notifyOnPickup / notifyOnDelivery
    if (afterStatus === 'picked_up' || afterStatus === 'delivered') {
      return null;
    }

    await writeCustomerInboxNotification({
      uid,
      userId: uid,
      title,
      message,
      type: 'booking_status',
      orderId: displayId,
      status: afterStatus,
    });
    return null;
  });

/**
 * TRIGGER: Food/order status changes → customer in-app inbox
 * (rider app mirrors to orders; food customers often have no bookings doc)
 */
exports.onOrderActivityInbox = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const beforeStatus = String(before.status || before.orderStatus || '').toLowerCase();
    const afterStatus = String(after.status || after.orderStatus || '').toLowerCase();
    if (!afterStatus || beforeStatus === afterStatus) return null;

    const uid = after.userId || after.customerId || after.customer?.uid || after.uid || null;
    if (!uid) return null;

    // Avoid double-notifying when the same id also exists as a booking
    try {
      const bookingSnap = await admin.firestore().collection('bookings').doc(context.params.orderId).get();
      if (bookingSnap.exists) return null;
    } catch (_) {
      /* continue */
    }

    const displayId = after.orderCode || after.displayId || after.bookingId || context.params.orderId;
    const titleMap = {
      pending: 'Order received',
      confirmed: 'Order confirmed',
      preparing: 'Vendor is preparing',
      ready: 'Ready for pickup',
      ready_for_pickup: 'Ready for pickup',
      searching_rider: 'Finding a rider',
      assigned: 'Rider assigned',
      accepted: 'Rider assigned',
      enroute: 'Rider en route',
      enroute_pickup: 'Rider heading to pickup',
      enroute_dropoff: 'Rider en route to you',
      in_transit: 'Rider en route',
      out_for_delivery: 'Rider en route to you',
      at_pickup: 'Rider arrived at pickup',
      picked_up: 'Order picked up',
      at_delivery: 'Rider nearby — share your PIN',
      nearby: 'Rider nearby',
      delivered: 'Delivered',
      completed: 'Delivered',
      cancelled: 'Order cancelled',
    };
    if (afterStatus === 'picked_up' || afterStatus === 'delivered') {
      return null;
    }

    const title = titleMap[afterStatus] || `Order update: ${afterStatus}`;
    const message = `GO7 #${displayId} — ${title}. Open Track for live updates.`;

    await writeCustomerInboxNotification({
      uid,
      userId: uid,
      title,
      message,
      type: 'order_status',
      orderId: displayId,
      status: afterStatus,
    });
    return null;
  });

/**
 * TRIGGER: GoBuy (errand) order created → customer in-app inbox
 */
exports.onGobuyCreatedInbox = functions.firestore
  .document('gobuy_orders/{orderId}')
  .onCreate(async (snap, context) => {
    const data = snap.data() || {};
    const uid = data.customerId || data.userId || data.customer?.uid || null;
    if (!uid || uid === 'guest') return null;

    const displayId = data.orderId || data.bookingId || context.params.orderId;
    const itemName = data.itemName || 'your item';
    const message = `GO7 Errand #${displayId} received — we're finding a shopper for ${itemName}. Track for live updates.`;

    await writeCustomerInboxNotification({
      uid,
      userId: uid,
      title: 'Errand received',
      message,
      type: 'gobuy_created',
      orderId: displayId,
      status: 'pending',
    });
    return null;
  });

/**
 * TRIGGER: GoBuy (errand) order status changes → customer in-app inbox
 */
exports.onGobuyActivityInbox = functions.firestore
  .document('gobuy_orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const beforeStatus = String(before.orderStatus || '').toLowerCase();
    const afterStatus = String(after.orderStatus || '').toLowerCase();
    if (!afterStatus || beforeStatus === afterStatus) return null;

    const uid = after.customerId || after.userId || after.customer?.uid || null;
    if (!uid || uid === 'guest') return null;

    const displayId = after.orderId || after.bookingId || context.params.orderId;
    const titleMap = {
      pending: 'Finding a shopper',
      assigned: 'Shopper assigned',
      accepted: 'Shopper assigned',
      shopping: 'Shopper is shopping for you',
      enroute: 'Shopper en route',
      picked_up: 'Items picked up',
      delivered: 'Errand completed',
      completed: 'Errand completed',
      unassigned: 'Finding another shopper',
      cancelled: 'Errand cancelled',
      error: 'Errand needs attention',
    };
    const title = titleMap[afterStatus] || `Errand update: ${afterStatus}`;
    const message = `GO7 Errand #${displayId} — ${title}. Open Track for live updates.`;

    await writeCustomerInboxNotification({
      uid,
      userId: uid,
      title,
      message,
      type: 'gobuy_status',
      orderId: displayId,
      status: afterStatus,
    });
    return null;
  });

/**
 * TRIGGER: Paid booking cancelled or stuck — alert admin for refund / dispatch
 */
const bookingAlerts = require('./bookingAlerts');

exports.notifyAdminBookingUpdates = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    try {
      await bookingAlerts.alertAdminPaidBookingCancelled(
        change.before.data(),
        change.after.data(),
        context.params.bookingId
      );
    } catch (err) {
      console.error('Admin cancel alert failed:', err.message);
    }
    return null;
  });

exports.checkStuckPaidBookings = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async () => {
    const snap = await admin.firestore()
      .collection('bookings')
      .where('status', 'in', ['searching_rider', 'pending', 'pending_dispatch'])
      .limit(40)
      .get();

    const now = Date.now();
    let alerted = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (!bookingAlerts.isPaidBooking(data)) continue;
      if (data.riderId || data.rider?.id) continue;

      const created =
        data.createdAt?.toMillis?.() ||
        (data.timestamp?.toMillis?.() ?? null) ||
        (typeof data.createdAt === 'string' ? Date.parse(data.createdAt) : null) ||
        now;
      const waitingMinutes = Math.floor((now - created) / 60000);
      if (waitingMinutes < 10) continue;

      await bookingAlerts.alertAdminStuckPaidBooking(data, docSnap.id, waitingMinutes);
      alerted += 1;
    }

    console.log(`⏰ Stuck paid booking check done — ${alerted} alert(s) sent`);
    return null;
  });

// ---------------------------------------------------------------------------
// Retry dispatch for paid bookings stuck in searching_rider — automatically
// assigns a rider when one becomes available, without manual intervention.
// ---------------------------------------------------------------------------
exports.retrySearchingRiderDispatch = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const searchingSnap = await admin.firestore()
      .collection('bookings')
      .where('status', '==', 'searching_rider')
      .limit(100)
      .get();
    const fallbackSnap = await admin.firestore()
      .collection('bookings')
      .where('isFallback', '==', true)
      .where('dispatchStatus', '==', 'fallback')
      .limit(100)
      .get();

    const processed = new Set();
    let retried = 0;
    let assigned = 0;

    async function processDoc(docSnap) {
      if (processed.has(docSnap.id)) return;
      processed.add(docSnap.id);
      const data = docSnap.data();
      if (!['paid', 'pay_on_delivery'].includes(data.paymentStatus)) return;
      if ((data.riderSearchAttempts || 0) >= 40) return;
      const paidAt =
        data.paidAt?.toMillis?.() ||
        data.createdAt?.toMillis?.() ||
        Date.now();
      if (paidAt < twoHoursAgo) return; // stop retrying after 2 hours

      try {
        let dispatch;
        if (data.isFallback) {
          dispatch = await bookDeliveryOrder.tryUpgradeFallbackRider(docSnap.id, data, 'bike');
        } else {
          dispatch = await bookDeliveryOrder.dispatchBookDeliveryOrder(docSnap.id, data, 'bike');
        }
        retried += 1;
        if (dispatch.assigned) {
          assigned += 1;
          console.log(`✅ [retrySearchingRiderDispatch] assigned ${dispatch.rider.id} to ${docSnap.id}`);
        } else {
          console.log(`⏳ [retrySearchingRiderDispatch] still no rider for ${docSnap.id}: ${dispatch.reason}`);
        }
      } catch (err) {
        console.error(`❌ [retrySearchingRiderDispatch] error for ${docSnap.id}:`, err.message);
      }
    }

    for (const docSnap of searchingSnap.docs) await processDoc(docSnap);
    for (const docSnap of fallbackSnap.docs) await processDoc(docSnap);

    // Sweep: any assignment that landed without the tracking/deliveries docs
    // (manual edits, legacy admin paths) gets completed by the same
    // authoritative writer auto-dispatch uses.
    let healed = 0;
    try {
      const assignedSnap = await admin.firestore()
        .collection('orders')
        .where('status', '==', 'assigned')
        .limit(100)
        .get();
      for (const docSnap of assignedSnap.docs) {
        if (await healMissingAssignmentArtifacts(docSnap.id, docSnap.data())) healed += 1;
      }
    } catch (err) {
      console.error('[assignment-sweep] error:', err.message);
    }

    console.log(`🔄 Rider dispatch retry done — ${retried} retried, ${assigned} assigned, ${healed} healed`);
    return null;
  });

/**
 * Repair a booking/order that has a riderId at an assigned-family status but
 * is missing the deliveries/deliveryTracking writes. Any assignment path —
 * admin panels, console edits, future code — gets the full write set here.
 * Returns true when a repair was written.
 */
async function healMissingAssignmentArtifacts(orderId, after) {
  const riderId = after?.riderId || after?.assignedRider?.id || null;
  if (!riderId) return false;
  const status = String(after.status || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (!['assigned', 'rider_assigned', 'accepted'].includes(status)) return false;

  const firestore = admin.firestore();
  const [trackingSnap, deliverySnap] = await Promise.all([
    firestore.collection('deliveryTracking').doc(orderId).get(),
    firestore.collection('deliveries').doc(orderId).get(),
  ]);
  const trackingOk = trackingSnap.exists && trackingSnap.data()?.riderId === riderId;
  const deliveryOk = deliverySnap.exists && deliverySnap.data()?.riderId === riderId;
  if (trackingOk && deliveryOk) return false; // assignment already complete

  // Only repair the Book Delivery surface — food orders in `orders` have no
  // bookings doc and must not get a deliveries job-list entry written for them.
  const bookingSnap = await firestore.collection('bookings').doc(orderId).get();
  if (!bookingSnap.exists) return false;

  const [riderSnap, locSnap] = await Promise.all([
    firestore.collection('riders').doc(riderId).get(),
    firestore.collection('riderLocations').doc(riderId).get(),
  ]);
  const riderProfile = riderSnap.exists ? riderSnap.data() : {};
  const loc = locSnap.exists ? locSnap.data() : null;
  const lat = Number(
    loc?.lat ?? loc?.latitude ?? loc?.location?.lat ??
    riderProfile.latitude ?? riderProfile.currentLocation?.lat ??
    after.pickup?.lat ?? after.pickup?.coordinates?.lat ?? after.pickupCoords?.lat
  );
  const lng = Number(
    loc?.lng ?? loc?.longitude ?? loc?.location?.lng ??
    riderProfile.longitude ?? riderProfile.currentLocation?.lng ??
    after.pickup?.lng ?? after.pickup?.coordinates?.lng ?? after.pickupCoords?.lng
  );
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  const rider = {
    id: riderId,
    name: riderProfile.name || riderProfile.fullName || after.riderName || 'Rider',
    phone: riderProfile.phone || riderProfile.phoneNumber || after.riderPhone || null,
    vehicleType: riderProfile.vehicleType || riderProfile.vehicle?.type || 'bike',
    vehicleOwnership: riderProfile.vehicleOwnership || riderProfile.vehicleOwner || null,
    latitude: lat,
    longitude: lng,
    distance: null,
  };
  const orderPayload = {
    orderType: after.orderType || 'GENERAL_DELIVERY',
    deliveryFee: after.deliveryFee ?? after.fare ?? after.finalFare ?? null,
    platformFee: after.platformFee ?? after.serviceFee ?? null,
    distanceKm: after.distanceKm ?? after.deliveryDistanceKm ?? after.distance ?? null,
    corridorId: after.corridorId || null,
    grandTotal: after.grandTotal ?? after.total ?? null,
  };

  await bookDeliveryOrder.assignRiderToBooking(orderId, rider, { orderPayload });
  console.log(`🩹 [healAssignment] completed missing assignment docs for ${orderId} (rider ${riderId})`);
  return true;
}

// Instant heal — fires the moment a riderId lands on an order or booking by
// ANY write path. The heal writes the same riderId, so the re-fire exits on
// the unchanged-riderId guard (no loop).
exports.healAssignmentOnOrderUpdate = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if ((before.riderId || null) === (after.riderId || null)) return null;
    await healMissingAssignmentArtifacts(context.params.orderId, after);
    return null;
  });

exports.healAssignmentOnBookingUpdate = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if ((before.riderId || null) === (after.riderId || null)) return null;
    await healMissingAssignmentArtifacts(context.params.bookingId, after);
    return null;
  });

/**
 * Cancellation propagation — fires the moment an order/booking is cancelled by
 * ANY write path (admin dashboards, customer cancels, console edits). Keeps the
 * deliveries job doc and the rider's current-job pointer in sync so a cancelled
 * job stops surfacing in the rider app and the rider is freed for dispatch.
 */
async function propagateCancellation(orderId, after) {
  const status = String(after.status || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (!['cancelled', 'canceled'].includes(status)) return;
  const riderId = after.riderId || after.assignedRider?.id || null;
  const firestore = admin.firestore();
  const ts = admin.firestore.FieldValue.serverTimestamp();

  await firestore.collection('deliveries').doc(orderId).set({
    status: 'cancelled',
    orderStatus: 'cancelled',
    cancelledBy: after.cancelledBy || null,
    cancelReason: after.cancelReason || after.cancellationReason || null,
    cancelledAt: after.cancelledAt || ts,
    updatedAt: ts,
  }, { merge: true }).catch((e) => console.error(`[cancel-propagation] deliveries ${orderId}:`, e.message));

  await firestore.collection('deliveryTracking').doc(orderId).set({
    status: 'cancelled',
    cancelledAt: after.cancelledAt || ts,
    updatedAt: ts,
  }, { merge: true }).catch((e) => console.error(`[cancel-propagation] tracking ${orderId}:`, e.message));

  if (!riderId) return;
  const riderRef = firestore.collection('riders').doc(riderId);
  const riderSnap = await riderRef.get().catch(() => null);
  if (!riderSnap || !riderSnap.exists) return;
  const r = riderSnap.data() || {};
  const pointedHere = [r.currentJobId, r.currentOrder, r.currentOrderId].includes(orderId);
  if (!pointedHere) return; // rider already moved to a different job — leave them
  await riderRef.update({
    currentJobId: null,
    currentOrder: null,
    currentOrderId: null,
    status: 'active',
    isAvailable: true,
    updatedAt: ts,
  }).catch((e) => console.error(`[cancel-propagation] rider ${riderId}:`, e.message));
  console.log(`[cancel-propagation] freed rider ${riderId} from cancelled ${orderId}`);
}

exports.propagateCancelOnOrderUpdate = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const wasCancelled = ['cancelled', 'canceled'].includes(String(before.status || '').toLowerCase());
    const nowCancelled = ['cancelled', 'canceled'].includes(String(after.status || '').toLowerCase());
    if (!nowCancelled || wasCancelled) return null;
    await propagateCancellation(context.params.orderId, after);
    return null;
  });

exports.propagateCancelOnBookingUpdate = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const wasCancelled = ['cancelled', 'canceled'].includes(String(before.status || '').toLowerCase());
    const nowCancelled = ['cancelled', 'canceled'].includes(String(after.status || '').toLowerCase());
    if (!nowCancelled || wasCancelled) return null;
    await propagateCancellation(context.params.bookingId, after);
    return null;
  });

/**
 * Helper: Send SMS via Termii
 */
async function sendTermiiSMS(phone, message) {
  try {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
    if (!cleaned.startsWith('234')) cleaned = '234' + cleaned;

    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: cleaned,
        from: 'GO7',
        sms: message,
        type: 'plain',
        api_key: defineString('TERMII_API_KEY').value(),
        channel: 'generic'
      })
    });

    const data = await response.json();
    console.log('✅ SMS sent:', { phone: cleaned, messageId: data.message_id });
    return data;
  } catch (error) {
    console.error('❌ SMS error:', error);
    throw error;
  }
}

/**
 * Callable: rider responds to an assigned order (accept / reject / status update).
 */
exports.riderRespond = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Rider must be authenticated');
  }
  const { orderId, riderId, action, reason, status } = data || {};
  if (!orderId || !riderId || !action) {
    throw new functions.https.HttpsError('invalid-argument', 'orderId, riderId and action are required');
  }

  const orderRef = firestore.collection('orders').doc(orderId);
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Order not found');
  }

  if (action === 'accept') {
    await orderRef.update({
      riderId,
      assignedRiderId: riderId,
      status: 'assigned',
      riderAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: 'Order accepted' };
  }

  if (action === 'reject' || action === 'decline') {
    await orderRef.update({
      riderId: null,
      assignedRiderId: null,
      status: 'pending',
      declinedRiders: admin.firestore.FieldValue.arrayUnion(riderId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: 'Order declined' };
  }

  if (action === 'updateOrderStatus') {
    const valid = ['picked_up', 'en_route', 'in_transit', 'delivered', 'completed'];
    if (!status || !valid.includes(status)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid status');
    }
    await orderRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: 'Status updated' };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid action');
});

/**
 * Callable: initialize auto-dispatch zones (admin).
 */
exports.initializeZones = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  const uid = context.auth.uid;
  const userDoc = await firestore.collection('users').doc(uid).get();
  const role = userDoc.exists ? userDoc.data().role : null;
  if (role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const zones = [
    { id: 'south', name: 'Abeokuta South', center: { lat: 7.15, lng: 3.35 } },
    { id: 'north', name: 'Abeokuta North', center: { lat: 7.17, lng: 3.37 } },
    { id: 'metro', name: 'Metro / Suburbs', center: { lat: 7.12, lng: 3.4 } },
  ];
  const batch = firestore.batch();
  for (const z of zones) {
    batch.set(
      firestore.collection('zones').doc(z.id),
      { ...z, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  }
  await batch.commit();
  return { success: true, message: `Initialized ${zones.length} zones` };
});

// ====================================================================
// EXISTING EXPORTS
// ====================================================================

// Export delivery notification functions
exports.sendDeliveryStatusNotification = deliveryNotifications.sendDeliveryStatusNotification;

// Export scheduled delivery functions
exports.processScheduledDeliveries = scheduledDeliveries.processScheduledDeliveries;

// Export delivery reminder functions
exports.sendScheduledDeliveryReminders = deliveryReminders.sendScheduledDeliveryReminders;

// Export GoBuy assignment functions
exports.autoAssignGoBuyOrder = gobuyAssignment.autoAssignGoBuyOrder;
exports.handleRiderResponse = gobuyAssignment.handleRiderResponse;

// Export WhatsApp notification functions
exports.sendWhatsAppOrderUpdate = whatsappNotifications.sendWhatsAppOrderUpdate;
exports.sendManualWhatsApp = whatsappNotifications.sendManualWhatsApp;

// Export AI package detection functions
exports.analyzePackageImage = packageDetection.analyzePackageImage;
exports.updatePackageAnalysis = packageDetection.updatePackageAnalysis;
exports.getPackageAnalytics = packageDetection.getPackageAnalytics;

/**
 * 📱 GO7 WHATSAPP CLOUD API INTEGRATION
 * Sends WhatsApp notifications for order status changes (CONFIRMED, OUT_FOR_DELIVERY, DELIVERED)
 */
exports.sendWhatsAppCloudNotification = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    // Only trigger for specific status changes
    const triggerStatuses = ['CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    
    if (before.status === after.status || !triggerStatuses.includes(after.status)) {
      console.log(`ℹ️ Order ${orderId} status: ${after.status} - Not triggering WhatsApp`);
      return null;
    }

    console.log(`📱 Order ${orderId} status changed: ${before.status} → ${after.status}`);

    // Extract customer details
    const customerPhone = after.customerPhone 
                          || after.recipientInfo?.phone 
                          || after.deliveryDetails?.phone;
    
    if (!customerPhone) {
      console.warn(`⚠️ No phone number for order ${orderId}`);
      return null;
    }

    const orderData = {
      customerName: after.customerName || after.recipientInfo?.name || 'Customer',
      orderType: after.orderType || after.serviceType || 'Delivery',
      orderAmount: after.orderAmount || after.total || 0
    };

    // Send WhatsApp notification using Cloud API
    try {
      const result = await whatsappNotifier.sendWhatsApp(
        customerPhone,
        after.status,
        orderId,
        orderData
      );

      // Log result to Firestore
      await change.after.ref.update({
        'notifications.whatsappCloud': admin.firestore.FieldValue.arrayUnion({
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          status: after.status,
          phone: customerPhone,
          success: result.success,
          messageId: result.messageId || null,
          attempt: result.attempt || result.attempts || null
        })
      });

      return result;
    } catch (error) {
      console.error('❌ WhatsApp Cloud API error:', error);
      return null;
    }
  });

/**
 * 🧪 Test WhatsApp Cloud API Integration
 * HTTP callable function for testing
 */
exports.testWhatsAppCloud = functions.https.onCall(async (data, context) => {
  const { testPhone } = data;

  if (!testPhone) {
    throw new functions.https.HttpsError('invalid-argument', 'testPhone is required');
  }

  try {
    const result = await whatsappNotifier.testWhatsAppIntegration(testPhone);
    return result;
  } catch (error) {
    console.error('Test failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * 📋 Validate WhatsApp Configuration
 * HTTP callable function to check config
 */
exports.validateWhatsAppConfig = functions.https.onCall(async (data, context) => {
  // Require admin authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const validation = whatsappNotifier.validateConfig();
  return validation;
});

// Export WhatsApp webhook endpoints
exports.whatsappWebhookVerify = whatsappWebhook.whatsappWebhookVerify;
exports.whatsappWebhookStatus = whatsappWebhook.whatsappWebhookStatus;
exports.testWhatsappWebhook = whatsappWebhook.testWhatsappWebhook;

// Export WhatsApp bot (Room & Engine) — inbound webhook + manual trigger
exports.whatsappBotWebhook = whatsappBot.whatsappBotWebhook;
exports.whatsappBotHandleInbound = whatsappBot.whatsappBotHandleInbound;

// Export shared location resolver (used by bot + app)
exports.resolveLocation = locationResolver.resolveLocation;

// ====================================================================
// 🚚 BOOK DELIVERY — server-authoritative order creation + payment confirm
// Single authoritative path for the manual page and any orchestration layer.
// createBookDeliveryOrder stages a server-only pending doc + authoritative
// quote; confirmBookDeliveryPayment verifies payment server-side, then creates
// the real bookings/orders docs and dispatches a rider.
// ====================================================================
const bookDeliveryOrder = require('./bookDeliveryOrder');
exports.createBookDeliveryOrder = bookDeliveryOrder.createBookDeliveryOrder;
exports.confirmBookDeliveryPayment = bookDeliveryOrder.confirmBookDeliveryPayment;

// ====================================================================
// 🤖 BOOK DELIVERY AI — conversational orchestration layer.
// Server-side session + strict tool registry over the same authoritative
// services above. Groq (if configured) only interprets language — it never
// touches pricing, coordinates, payment state, or Firestore.
// ====================================================================
const bookDeliveryAI = require('./bookDeliveryAI/chatController');
exports.bookDeliveryAIChat = bookDeliveryAI.bookDeliveryAIChat;

// ====================================================================
// 📍 AUTHORITATIVE DELIVERY FEE (server-side pricing validation)
// ====================================================================

/**
 * Compute the authoritative delivery fee for an order. The server recomputes
 * distance, zone and fee from trusted inputs — it NEVER trusts client values.
 * Used by checkout to obtain the fee to display/charge, and by order creation
 * to validate before the write succeeds.
 */
/**
 * Authoritative commerce order creation (FOOD / MARKET / PHARMACY).
 * Client cannot choose the delivery fee / distance / zone / orderType / totals.
 */
exports.createCommerceOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  }
  try {
    return await commerceOrderService.createCommerceOrder(data || {}, { db: firestore, uid: context.auth.uid });
  } catch (err) {
    if (err instanceof deliveryFeeService.AuthFeeError) {
      throw new functions.https.HttpsError(
        err.code === 'outside-service-area' || err.code === 'invalid-distance'
          ? 'failed-precondition'
          : 'invalid-argument',
        err.message
      );
    }
    console.error('[createCommerceOrder] failed:', err);
    throw new functions.https.HttpsError('internal', 'Failed to create order');
  }
});

/**
 * PREVIEW-ONLY promotion validation (no order, no redemption). Lets checkout
 * show whether a promotion code is valid + its discount. The final
 * createCommerceOrder always revalidates and redeems atomically.
 */
exports.verifyPromotion = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  }
  try {
    return await promotionService.verifyPromotionQuote(firestore, {
      code: data && data.promotionCode,
      orderType: data && data.orderType,
      subtotal: data && data.subtotal,
      userId: context.auth.uid,
      vendorId: data && data.vendorId,
      itemProductIds: data && data.itemProductIds,
    });
  } catch (err) {
    if (err instanceof deliveryFeeService.AuthFeeError) {
      throw new functions.https.HttpsError('invalid-argument', err.message);
    }
    console.error('[verifyPromotion] failed:', err);
    throw new functions.https.HttpsError('internal', 'Failed to verify promotion');
  }
});

exports.computeDeliveryFee = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  }
  try {
    return await deliveryFeeService.computeDeliveryFee(data || {}, { db: firestore });
  } catch (err) {
    if (err instanceof deliveryFeeService.AuthFeeError) {
      const code =
        err.code === 'outside-service-area' || err.code === 'invalid-distance'
          ? 'failed-precondition'
          : 'invalid-argument';
      throw new functions.https.HttpsError(code, err.message);
    }
    console.error('[computeDeliveryFee] failed:', err);
    throw new functions.https.HttpsError('internal', 'Failed to compute delivery fee');
  }
});

/**
 * Verify the delivery fee stored on a newly created order against the
 * authoritative recomputation. GATED on deliveryPricing.enabled === true so
 * production behaviour is unchanged while disabled.
 *
 * When enabled, mismatched fees are flagged (deliveryFeeInvalid) for admin
 * review — a client that lowers the fee cannot silently pass.
 */
exports.verifyOrderDeliveryFee = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data() || {};
    const { enabled } = await loadCanonicalDeliveryPricing(firestore);
    if (!enabled) return null; // legacy — no change to production behaviour

    if (!order.orderType || !order.deliveryFee) return null;

    const pickup =
      order.pickup && order.pickup.coordinates
        ? order.pickup.coordinates
        : order.vendor && (order.vendor.coordinates || order.vendor.pickupCoords)
        ? order.vendor.coordinates || order.vendor.pickupCoords
        : null;
    const destination =
      order.dropoff && order.dropoff.coordinates
        ? order.dropoff.coordinates
        : order.deliveryAddress && order.deliveryAddress.coordinates
        ? order.deliveryAddress.coordinates
        : null;

    if (!pickup || !destination) {
      await snap.ref.update({ deliveryFeeVerified: 'unverifiable' }).catch(() => {});
      return null;
    }

    try {
      const result = await deliveryFeeService.computeDeliveryFee(
        { orderType: order.orderType, pickup, destination, subtotal: order.subtotal },
        { db: firestore }
      );
      const diff = Math.abs(Number(order.deliveryFee) - result.deliveryFee);
      const valid = diff <= deliveryFeeService.FEE_TOLERANCE;
      await snap.ref
        .update({
          deliveryFeeVerified: valid,
          deliveryFeeInvalid: !valid,
          deliveryFeeServer: result.deliveryFee,
          deliveryDistanceKm: result.distanceKm,
          deliveryZoneId: result.zoneId,
          deliveryZoneName: result.zoneName,
          pricingConfigVersion: result.pricingConfigVersion,
        })
        .catch(() => {});
      if (!valid) {
        console.warn(`⚠️ Order ${context.params.orderId} delivery fee mismatch: client ₦${order.deliveryFee} vs server ₦${result.deliveryFee}`);
      }
    } catch (err) {
      console.warn(`Order ${context.params.orderId} delivery fee verify error:`, err.message);
      await snap.ref.update({ deliveryFeeVerified: 'unverifiable' }).catch(() => {});
    }
    return null;
  });

// Export WhatsApp notification tracking functions (Admin Dashboard)
exports.getWhatsAppNotifications = notificationTracking.getWhatsAppNotifications;
exports.getNotificationStats = notificationTracking.getNotificationStats;
exports.getOrderNotifications = notificationTracking.getOrderNotifications;
exports.retryFailedNotification = notificationTracking.retryFailedNotification;

// Vendor food-order WhatsApp (prep alerts)
exports.notifyVendorNewFoodOrder = vendorOrderWhatsApp.notifyVendorNewFoodOrder;

// Process vendor-offline queued orders and refunds
exports.processQueuedOrders = vendorOfflineHandler.processQueuedOrders;
exports.handleVendorOffline = vendorOfflineHandler.handleVendorOffline;
exports.manualProcessQueued = vendorOfflineHandler.manualProcessQueued;

// Export WhatsApp auto-retry functions (Scheduled & Manual)
exports.autoRetryWhatsApp = autoRetryWhatsApp.autoRetryWhatsApp;
exports.triggerAutoRetryWhatsApp = autoRetryWhatsApp.triggerAutoRetryWhatsApp;

// ===================================================================
// 🛢️ FUEL & CNG DELIVERY SERVICE
// ===================================================================

// Import fuel service functions
const fuelService = require('./fuelService');
const fuelTriggers = require('./fuelTriggers');
const riderAutoCredit = require('./riderAutoCredit');

// Export fuel service callable functions
exports.createFuelOrder = fuelService.createFuelOrder;
exports.updateFuelOrderStatus = fuelService.updateFuelOrderStatus;
exports.getAvailableFuelOrders = fuelService.getAvailableFuelOrders;
exports.getNearestFuelStation = fuelService.getNearestFuelStation;
exports.getCustomerFuelOrders = fuelService.getCustomerFuelOrders;

// Export fuel triggers
exports.onFuelOrderCreated = fuelTriggers.onFuelOrderCreated;
exports.onFuelOrderStatusChanged = fuelTriggers.onFuelOrderStatusChanged;
exports.cleanupOldFuelOrders = fuelTriggers.cleanupOldFuelOrders;

// Idempotent rider earnings auto-credit (delivered orders/fuelOrders credit once).
exports.onOrderDelivered = riderAutoCredit.onOrderDelivered;
exports.onFuelOrderDelivered = riderAutoCredit.onFuelOrderDelivered;

// ===================================================================
// 💳 PAYSTACK DEDICATED VIRTUAL ACCOUNT (DVA) SYSTEM FOR GO7 WALLET
// ===================================================================

/**
 * 💳 Create User Virtual Account
 * 
 * Creates a Paystack customer and Titan Paystack Dedicated Virtual Account (DVA)
 * for seamless wallet funding. Each user gets their own virtual account.
 * 
 * Features:
 * ✅ Creates Paystack customer profile
 * ✅ Generates Titan Paystack DVA
 * ✅ Saves account details to Firestore users/{uid}
 * ✅ Returns account details for frontend display
 * 
 * Usage: Call from frontend after Firebase Auth signup
 */
exports.createUserVirtualAccount = functions.https.onCall(async (data, context) => {
  try {
    console.log('💳 Creating virtual account for user:', data);
    
    // Validate required data (accept userId as alias for uid)
    let { uid, email, phone, name } = data;
    if (!uid) uid = data.userId;
    if (!uid || !email || !name) {
      // Look up missing fields from the user doc
      if (uid) {
        const userDoc = await firestore.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const u = userDoc.data();
          email = email || u.email;
          name = name || u.name || u.displayName;
          phone = phone || u.phone || u.phoneNumber || u.verifiedPhone || u.mobile;
        }
      }
    }
    if (!uid || !email || !name) {
      throw new Error('Missing required fields: uid, email, name');
    }

    const formatPhoneForPaystack = (rawPhone) => {
      let cleaned = String(rawPhone || '').replace(/\D/g, '');
      if (!cleaned) return '';
      if (cleaned.startsWith('0')) {
        cleaned = '234' + cleaned.substring(1);
      } else if (!cleaned.startsWith('234')) {
        cleaned = '234' + cleaned;
      }
      return cleaned.length >= 13 ? `+${cleaned}` : '';
    };

    if (!phone) {
      const userDoc = await firestore.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        phone =
          userData.phone ||
          userData.phoneNumber ||
          userData.verifiedPhone ||
          userData.mobile ||
          '';
      }
    }

    const paystackPhone = formatPhoneForPaystack(phone);
    if (!paystackPhone) {
      throw new Error('Valid customer phone number is required');
    }
    
    // Import node-fetch dynamically
    const fetch = (await import('node-fetch')).default;
    
    // Get Paystack secret key (support legacy + params env names)
    const paystackSecret =
      defineString('PAYSTACK_SECRET').value() ||
      defineString('PAYSTACK_SECRET_KEY').value() ||
      functions.config().paystack?.secret ||
      process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      throw new Error('Paystack secret not configured');
    }
    
    // Step 1: Create Paystack customer
    console.log('📝 Creating Paystack customer...');
    
    // Ensure last_name is never empty (Paystack DVA requirement)
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || 'Go7';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
    
    const customerResponse = await fetch('https://api.paystack.co/customer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        first_name: firstName,
        last_name: lastName,
        phone: paystackPhone
      })
    });
    
    const customerData = await customerResponse.json();
    console.log('👤 Customer response:', customerData);
    
    if (!customerData.status) {
      throw new Error(`Failed to create customer: ${customerData.message}`);
    }
    
    const customerCode = customerData.data.customer_code;

    // Existing Paystack customers may be returned without a phone — update before DVA
    const customerUpdateResponse = await fetch(
      `https://api.paystack.co/customer/${encodeURIComponent(customerCode)}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
          phone: paystackPhone
        })
      }
    );
    const customerUpdateData = await customerUpdateResponse.json();
    console.log('📞 Customer phone update:', customerUpdateData);

    if (!customerUpdateData.status) {
      throw new Error(`Failed to update customer phone: ${customerUpdateData.message}`);
    }
    
    // Step 2: Create Dedicated Virtual Account with Titan Paystack
    console.log('🏦 Creating Titan Paystack DVA...');
    const dvaResponse = await fetch('https://api.paystack.co/dedicated_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer: customerCode,
        preferred_bank: 'titan-paystack'
      })
    });
    
    const dvaData = await dvaResponse.json();
    console.log('💳 DVA response:', dvaData);
    
    if (!dvaData.status) {
      throw new Error(`Failed to create DVA: ${dvaData.message}`);
    }
    
    const virtualAccount = {
      bank: dvaData.data.bank.name,
      account_number: dvaData.data.account_number,
      account_name: dvaData.data.account_name,
      assignedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Step 3: Save to Firestore users/{uid}
    console.log('💾 Saving user data to Firestore...');
    const userData = {
      name,
      email,
      phone: paystackPhone,
      paystackId: customerCode,
      virtualAccount: virtualAccount,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await firestore.collection('users').doc(uid).set(userData, { merge: true });
    
    // Step 4: Initialize wallet if not exists
    const walletRef = firestore.collection('wallets').doc(uid);
    const walletDoc = await walletRef.get();
    
    if (!walletDoc.exists) {
      await walletRef.set({
        balance: 0,
        virtualAccount: virtualAccount,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('💰 Initialized wallet for user:', uid);
    }
    
    console.log('✅ Virtual account created successfully for:', uid);
    
    // Return account details for frontend
    return {
      success: true,
      message: 'Virtual account created successfully',
      data: {
        paystackId: customerCode,
        virtualAccount: {
          bank: virtualAccount.bank,
          account_number: virtualAccount.account_number,
          account_name: virtualAccount.account_name
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Error creating virtual account:', error);
    throw new functions.https.HttpsError(
      'internal', 
      `Failed to create virtual account: ${error.message}`
    );
  }
});

// Aliases used by the frontend (signup + wallet funding)
exports.createUserDedicatedVirtualAccount = exports.createUserVirtualAccount;
exports.createPaystackVirtualAccount = exports.createUserVirtualAccount;

/**
 * Cloud Function that triggers when a new order document is created.
 * It decrements the stock for each product/variant in the order.
 */
exports.decrementProductStock = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snapshot, context) => {
    const orderData = snapshot.data();
    const { vendorId, items } = orderData;

    // For batched writes
    const batch = firestore.batch();

    try {
      // Process each item in the order
      for (const item of items) {
        const { productId, qty, options } = item;

        // Reference to the product document
        const productRef = firestore.doc(`vendors/${vendorId}/products/${productId}`);
        const productSnap = await productRef.get();

        if (!productSnap.exists) {
          console.error(`Product ${productId} not found for vendor ${vendorId}`);
          continue;
        }

        const productData = productSnap.data();

        // Check if this is a variant product
        if (productData.hasVariants && options) {
          // Handle variant stock update
          let variantKey = null;

          // Find the variant with matching options
          if (productData.variants && productData.variants.length > 0) {
            // In this implementation we assume the variantKey is passed directly
            variantKey = options.variantKey;

            if (variantKey) {
              // Find the variant in the product data
              const variantIndex = productData.variants.findIndex(v => v.key === variantKey);

              if (variantIndex !== -1) {
                // Calculate new stock value
                const variant = productData.variants[variantIndex];
                const newStock = Math.max(0, (variant.stock || 0) - qty);

                // Update the variant's stock
                batch.update(productRef, {
                  [`variants.${variantIndex}.stock`]: newStock
                });

                console.log(`Updated variant stock for product ${productId}, variant ${variantKey} to ${newStock}`);
              }
            }
          }
        } else {
          // Handle regular product stock update
          // Calculate new stock value
          const newStock = Math.max(0, (productData.stock || 0) - qty);

          // Update the product's stock
          batch.update(productRef, { stock: newStock });

          console.log(`Updated stock for product ${productId} to ${newStock}`);
        }
      }

      // Commit all the stock updates in a single batch
      await batch.commit();

      console.log(`Successfully processed stock decrements for order ${context.params.orderId}`);
      return { success: true };

    } catch (error) {
      console.error('Error processing stock decrements:', error);
      return { success: false, error: error.message };
    }
  });

/**
 * Cloud Function to update the order status when a payment is verified
 */
exports.updateOrderOnPaymentVerification = functions.https.onCall(
  async (data, context) => {
    const { orderId, paymentStatus } = data;

    if (!orderId || !paymentStatus) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'The function must be called with orderId and paymentStatus arguments.'
      );
    }

    try {
      const orderRef = firestore.doc(`orders/${orderId}`);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          `Order with ID ${orderId} not found`
        );
      }

      await orderRef.update({
        'payment.status': paymentStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, orderId };

    } catch (error) {
      console.error('Error updating order payment status:', error);

      throw new functions.https.HttpsError(
        'internal',
        'An error occurred while updating the order payment status.'
      );
    }
  }
);

/**
 * Cloud Function to restore stock when orders are cancelled
 * Triggered when an order status is updated to 'cancelled'
 */
exports.restoreStockOnOrderCancellation = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const orderId = context.params.orderId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Only proceed if status changed to 'cancelled'
    if (beforeData.status !== 'cancelled' && afterData.status === 'cancelled') {
      console.log('Processing stock restoration for cancelled order:', orderId);

      const { vendorId, items } = afterData;
      const batch = firestore.batch();

      try {
        // Process each item in the order to restore stock
        for (const item of items) {
          const { productId, qty, options } = item;

          // Reference to the product document
          const productRef = firestore.doc(`vendors/${vendorId}/products/${productId}`);
          const productSnap = await productRef.get();

          if (!productSnap.exists) {
            console.error(`Product ${productId} not found for vendor ${vendorId}`);
            continue;
          }

          const productData = productSnap.data();

          // Check if this is a variant product
          if (productData.hasVariants && options) {
            // Handle variant stock restoration
            const variantKey = options.variantKey;

            if (variantKey) {
              // Find the variant in the product data
              const variantIndex = productData.variants.findIndex(v => v.key === variantKey);

              if (variantIndex !== -1) {
                // Calculate restored stock value
                const variant = productData.variants[variantIndex];
                const restoredStock = (variant.stock || 0) + qty;

                // Update the variant's stock
                batch.update(productRef, {
                  [`variants.${variantIndex}.stock`]: restoredStock
                });

                console.log(`Restored variant stock for product ${productId}, variant ${variantKey} to ${restoredStock}`);
              }
            }
          } else {
            // Handle regular product stock restoration
            const restoredStock = (productData.stock || 0) + qty;

            // Update the product's stock
            batch.update(productRef, { stock: restoredStock });

            console.log(`Restored stock for product ${productId} to ${restoredStock}`);
          }
        }

        // Commit all the stock restorations in a single batch
        await batch.commit();

        console.log(`Successfully processed stock restoration for cancelled order ${orderId}`);

      } catch (error) {
        console.error('Error restoring stock for cancelled order:', orderId, error);
      }
    }
  });

/**
 * Cloud Function to handle order dispatch when status changes to 'accepted'
 * Triggers rider assignment and creates delivery job
 */
exports.handleOrderDispatch = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const orderId = context.params.orderId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Only proceed if status changed to 'accepted'
    if (beforeData.status !== 'accepted' && afterData.status === 'accepted') {
      console.log('Processing rider assignment for accepted order:', orderId);

      try {
        const { areaFrom, areaTo } = afterData;

        // Call dispatch assignment
        const assignmentResult = await assignRiderToOrder({
          orderId,
          areaFrom,
          areaTo,
          orderData: afterData
        });

        if (assignmentResult.success) {
          console.log(`Successfully assigned rider ${assignmentResult.riderId} to order ${orderId}`);
        } else {
          console.error(`Failed to assign rider to order ${orderId}:`, assignmentResult.error);
        }

      } catch (error) {
        console.error('Error processing order dispatch:', orderId, error);
      }
    }
  });

/**
 * Dispatch assignment function
 * Finds the best available rider and creates delivery job
 */
async function assignRiderToOrder({ orderId, areaFrom, areaTo, orderData }) {
  try {
    // Find available riders in the pickup area
    const ridersQuery = firestore.collection('riders_online')
      .where('area', '==', areaFrom)
      .where('status', '==', 'available')
      .orderBy('load', 'asc')
      .limit(10);

    const ridersSnapshot = await ridersQuery.get();

    if (ridersSnapshot.empty) {
      console.log(`No available riders found in area: ${areaFrom}`);
      return { success: false, error: 'No available riders' };
    }

    // Find the rider with the lowest load and calculate distance
    let bestRider = null;
    let bestScore = Infinity;

    for (const riderDoc of ridersSnapshot.docs) {
      const rider = riderDoc.data();
      const riderId = riderDoc.id;

      // Simple scoring: prioritize low load (in a real app, you'd include distance calculation)
      const score = rider.load || 0;

      if (score < bestScore) {
        bestScore = score;
        bestRider = { id: riderId, ...rider };
      }
    }

    if (!bestRider) {
      return { success: false, error: 'No suitable rider found' };
    }

    // Generate delivery job ID
    const jobId = `job_${orderId}_${Date.now()}`;

    // Calculate estimated delivery time (simplified)
    const estimatedMinutes = 30 + (bestRider.load * 10); // Base 30 min + 10 min per current delivery
    const eta = new Date(Date.now() + estimatedMinutes * 60 * 1000);

    // Create delivery job document
    const deliveryJob = {
      jobId,
      orderId,
      riderId: bestRider.id,
      riderName: bestRider.name,
      riderPhone: bestRider.phone,
      vendorId: orderData.vendorId,
      customer: orderData.customer,
      areaFrom,
      areaTo,
      status: 'assigned',
      estimatedPickupTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      estimatedDeliveryTime: eta,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      orderValue: (orderData.subtotal || 0) + (orderData.deliveryFee || 0)
    };

    // Use transaction to ensure consistency
    await firestore.runTransaction(async (transaction) => {
      // Create delivery job
      const deliveryRef = firestore.collection('delivery_live').doc(jobId);
      transaction.set(deliveryRef, deliveryJob);

      // Update order with delivery information
      const orderRef = firestore.collection('orders').doc(orderId);
      transaction.update(orderRef, {
        delivery: {
          riderId: bestRider.id,
          riderName: bestRider.name,
          riderPhone: bestRider.phone,
          jobId,
          eta: eta,
          status: 'assigned'
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update rider's load
      const riderRef = firestore.collection('riders_online').doc(bestRider.id);
      transaction.update(riderRef, {
        load: (bestRider.load || 0) + 1,
        lastAssigned: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return {
      success: true,
      riderId: bestRider.id,
      jobId,
      eta: eta.toISOString()
    };

  } catch (error) {
    console.error('Error in rider assignment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cloud Function to handle delivery status updates
 * Updates rider load when deliveries are completed
 */
exports.handleDeliveryStatusUpdate = functions.firestore
  .document('delivery_live/{jobId}')
  .onUpdate(async (change, context) => {
    const jobId = context.params.jobId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Check if delivery was completed
    if (beforeData.status !== 'completed' && afterData.status === 'completed') {
      console.log('Processing delivery completion for job:', jobId);

      try {
        const riderId = afterData.riderId;
        const orderId = afterData.orderId;

        // Update rider's load (decrease by 1)
        const riderRef = firestore.collection('riders_online').doc(riderId);
        const riderDoc = await riderRef.get();

        if (riderDoc.exists) {
          const currentLoad = riderDoc.data().load || 0;
          await riderRef.update({
            load: Math.max(0, currentLoad - 1),
            lastCompleted: admin.firestore.FieldValue.serverTimestamp()
          });

          console.log(`Updated rider ${riderId} load after delivery completion`);
        }

        // Update order status to delivered
        const orderRef = firestore.collection('orders').doc(orderId);
        await orderRef.update({
          status: 'delivered',
          'delivery.status': 'completed',
          'delivery.completedAt': admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Order ${orderId} marked as delivered`);

      } catch (error) {
        console.error('Error processing delivery completion:', jobId, error);
      }
    }
  });

/**
 * HTTP Cloud Function to manually trigger rider assignment
 * Useful for testing and manual intervention
 */
exports.assignRider = functions.https.onCall(async (data, context) => {
  const { orderId } = data;

  if (!orderId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Order ID is required'
    );
  }

  try {
    // Get order data
    const orderRef = firestore.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Order not found'
      );
    }

    const orderData = orderDoc.data();

    if (orderData.status !== 'accepted') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Order must be in accepted status'
      );
    }

    // Assign rider
    const result = await assignRiderToOrder({
      orderId,
      areaFrom: orderData.areaFrom,
      areaTo: orderData.areaTo,
      orderData
    });

    return result;

  } catch (error) {
    console.error('Error in manual rider assignment:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to assign rider'
    );
  }
});

/**
 * Callable: admin manually assigns a rider to a Book Delivery booking.
 * Runs the SAME write set as auto-dispatch (bookings + orders + deliveries +
 * riders + deliveryTracking + rider_locations) so manual assignment can never
 * leave tracking half-created again.
 */
exports.adminAssignRiderToDelivery = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  }
  const adminDoc = await firestore.collection('users').doc(context.auth.uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
  }

  const bookingId = String(data?.bookingId || data?.orderId || '').trim();
  const riderId = String(data?.riderId || '').trim();
  if (!bookingId || !riderId) {
    throw new functions.https.HttpsError('invalid-argument', 'bookingId and riderId are required');
  }

  const orderSnap = await firestore.collection('orders').doc(bookingId).get();
  const bookingSnap = await firestore.collection('bookings').doc(bookingId).get();
  const orderData = (orderSnap.exists && orderSnap.data()) || (bookingSnap.exists && bookingSnap.data()) || null;
  if (!orderData) {
    throw new functions.https.HttpsError('not-found', 'Booking not found');
  }
  if (['delivered', 'cancelled', 'completed'].includes(String(orderData.status || '').toLowerCase())) {
    throw new functions.https.HttpsError('failed-precondition', `Cannot assign: booking is ${orderData.status}`);
  }

  const riderSnap = await firestore.collection('riders').doc(riderId).get();
  const riderProfile = riderSnap.exists ? riderSnap.data() : {};
  if (!riderSnap.exists) {
    console.warn(`[adminAssign] riders/${riderId} missing — proceeding with minimal profile`);
  }

  // Rider coordinates for tracking seed: riderLocations → rider profile → pickup point.
  const locSnap = await firestore.collection('riderLocations').doc(riderId).get();
  const loc = locSnap.exists ? locSnap.data() : null;
  const riderLat = Number(
    loc?.lat ?? loc?.latitude ?? loc?.location?.lat ?? loc?.location?.latitude ??
    riderProfile.latitude ?? riderProfile.currentLocation?.lat ??
    orderData.pickup?.lat ?? orderData.pickup?.coordinates?.lat ?? orderData.pickupCoords?.lat
  );
  const riderLng = Number(
    loc?.lng ?? loc?.longitude ?? loc?.location?.lng ?? loc?.location?.longitude ??
    riderProfile.longitude ?? riderProfile.currentLocation?.lng ??
    orderData.pickup?.lng ?? orderData.pickup?.coordinates?.lng ?? orderData.pickupCoords?.lng
  );
  if (!Number.isFinite(riderLat) || !Number.isFinite(riderLng)) {
    throw new functions.https.HttpsError('failed-precondition', 'No usable coordinates to seed tracking for this rider');
  }

  const rider = {
    id: riderId,
    name: riderProfile.name || riderProfile.fullName || riderProfile.displayName || 'Rider',
    phone: riderProfile.phone || riderProfile.phoneNumber || null,
    vehicleType: riderProfile.vehicleType || riderProfile.vehicle?.type || 'bike',
    vehicleOwnership: riderProfile.vehicleOwnership || riderProfile.vehicleOwner || null,
    latitude: riderLat,
    longitude: riderLng,
    distance: null,
  };

  const previousRiderId = orderData.riderId && orderData.riderId !== riderId ? orderData.riderId : null;
  const orderPayload = {
    orderType: orderData.orderType || 'GENERAL_DELIVERY',
    deliveryFee: orderData.deliveryFee ?? orderData.fare ?? orderData.finalFare ?? null,
    platformFee: orderData.platformFee ?? orderData.serviceFee ?? null,
    distanceKm: orderData.distanceKm ?? orderData.deliveryDistanceKm ?? orderData.distance ?? null,
    corridorId: orderData.corridorId || null,
    grandTotal: orderData.grandTotal ?? orderData.total ?? null,
  };

  await bookDeliveryOrder.assignRiderToBooking(bookingId, rider, {
    isFallback: false,
    releasePreviousRiderId: previousRiderId,
    orderPayload,
  });

  console.log(`✅ [adminAssign] ${context.auth.uid} assigned rider ${riderId} to ${bookingId}`);
  return { success: true, bookingId, riderId, riderName: rider.name, reassigned: Boolean(previousRiderId) };
});

// ============================================
// FCM CHAT NOTIFICATIONS
// ============================================

const messaging = admin.messaging();

/**
 * Send FCM notification when new chat message is created
 * Triggered by: /chats/{deliveryId}/messages/{messageId}
 */
exports.sendChatNotification = functions.firestore
  .document('chats/{deliveryId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const messageData = snap.data();
      const deliveryId = context.params.deliveryId;
      const messageId = context.params.messageId;

      console.log(`🔔 New message in delivery ${deliveryId}: ${messageId}`);

      // Get message details
      const {
        senderId,
        receiverId,
        text,
        senderRole = 'user',
        timestamp
      } = messageData;

      // Validate required fields
      if (!senderId || !receiverId || !text) {
        console.log('❌ Missing required message fields');
        return null;
      }

      // Don't send notification to sender
      if (senderId === receiverId) {
        console.log('📤 Message sent to self, skipping notification');
        return null;
      }

      // Get receiver's FCM token from user profile
      const receiverDoc = await firestore.collection('users').doc(receiverId).get();

      if (!receiverDoc.exists) {
        console.log(`❌ Receiver ${receiverId} not found in users collection`);
        return null;
      }

      const receiverData = receiverDoc.data();
      const fcmToken = receiverData.fcmToken;

      if (!fcmToken) {
        console.log(`📱 No FCM token found for user ${receiverId}`);
        return null;
      }

      // Get delivery details for context
      const deliveryDoc = await firestore.collection('deliveries').doc(deliveryId).get();
      let deliveryInfo = {};

      if (deliveryDoc.exists) {
        const delivery = deliveryDoc.data();
        deliveryInfo = {
          pickupAddress: delivery.pickupAddress || 'Unknown location',
          deliveryAddress: delivery.deliveryAddress || 'Unknown destination',
          status: delivery.status || 'active'
        };
      }

      // Determine sender role and notification content
      const isFromRider = senderRole === 'rider' || senderId.includes('rider');
      const senderType = isFromRider ? 'rider' : 'customer';
      const senderName = messageData.senderName || (isFromRider ? 'Your GO7 rider' : 'Your customer');

      // Create notification payload
      const notification = {
        title: `New message from your GO7 ${senderType}`,
        body: text.length > 50 ? `${text.substring(0, 50)}...` : text,
        icon: '/icons/go7-icon-192.png',
        badge: '/icons/go7-badge-72.png',
        tag: `chat-${deliveryId}`,
        requireInteraction: false
      };

      // Create data payload for app handling
      const data = {
        type: 'chat_message',
        deliveryId: deliveryId,
        messageId: messageId,
        senderId: senderId,
        senderRole: senderType,
        senderName: senderName,
        timestamp: timestamp ? timestamp.toMillis().toString() : Date.now().toString(),
        clickAction: `https://go7delivery.com/tracking/${deliveryId}#chat`,
        deliveryStatus: deliveryInfo.status || 'active'
      };

      // FCM message structure
      const fcmMessage = {
        token: fcmToken,
        notification: notification,
        data: data,
        android: {
          notification: {
            sound: 'default',
            priority: 'high',
            channelId: 'go7_chat_notifications',
            color: '#3B82F6'
          },
          data: data
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              category: 'GO7_CHAT'
            }
          },
          fcmOptions: {
            imageUrl: '/icons/go7-icon-192.png'
          }
        },
        webpush: {
          notification: {
            ...notification,
            image: '/icons/go7-icon-512.png',
            actions: [
              {
                action: 'reply',
                title: 'Reply',
                icon: '/icons/reply-icon.png'
              },
              {
                action: 'view',
                title: 'View Chat',
                icon: '/icons/view-icon.png'
              }
            ]
          },
          fcmOptions: {
            link: `https://go7delivery.com/tracking/${deliveryId}#chat`
          }
        }
      };

      // Send FCM notification
      const response = await messaging.send(fcmMessage);

      console.log(`✅ FCM notification sent successfully: ${response}`);
      console.log(`📱 Sent to: ${senderName} → ${receiverData.name || receiverId}`);
      console.log(`💬 Message: "${text.substring(0, 100)}..."`);

      // Update notification stats (optional)
      await firestore.collection('notification_stats').add({
        type: 'chat_message',
        deliveryId: deliveryId,
        senderId: senderId,
        receiverId: receiverId,
        fcmResponse: response,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        success: true
      });

      return response;

    } catch (error) {
      console.error('❌ Error sending FCM notification:', error);

      // Log error for debugging
      await firestore.collection('notification_errors').add({
        type: 'chat_message_fcm_error',
        deliveryId: context.params.deliveryId,
        messageId: context.params.messageId,
        error: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      return null;
    }
  });

/**
 * Update user FCM token
 * Called from client app when FCM token is refreshed
 */
exports.updateFCMToken = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { fcmToken, platform = 'web' } = data;
    const userId = context.auth.uid;

    if (!fcmToken) {
      throw new functions.https.HttpsError('invalid-argument', 'FCM token is required');
    }

    // Update user's FCM token
    await firestore.collection('users').doc(userId).set({
      fcmToken: fcmToken,
      fcmTokenUpdated: admin.firestore.FieldValue.serverTimestamp(),
      platform: platform,
      lastActive: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`📱 FCM token updated for user ${userId}`);

    return { success: true, message: 'FCM token updated successfully' };

  } catch (error) {
    console.error('❌ Error updating FCM token:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update FCM token');
  }
});

// Helper function to generate status messages
function getStatusMessage(status, userRole) {
  const messages = {
    customer: {
      assigned: 'A rider has been assigned to your delivery!',
      enroute: 'Your rider is on the way to pick up your package',
      picked_up: 'Your package has been picked up and is on the way!',
      delivered: 'Your package has been delivered successfully!',
      cancelled: 'Your delivery has been cancelled'
    },
    rider: {
      assigned: 'New delivery assigned to you',
      enroute: 'Delivery marked as en route',
      picked_up: 'Package pickup confirmed',
      delivered: 'Delivery completed successfully',
      cancelled: 'Delivery has been cancelled'
    }
  };

  return messages[userRole][status] || `Delivery status updated to ${status}`;
}

/**
 *  SECURE PAYSTACK PAYMENT VERIFICATION
 * Verifies payment with Paystack API and updates Firestore
 * Called by client after successful Paystack popup
 */
exports.verifyPayment = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ 
      success: false, 
      message: "Method not allowed. Use POST." 
    });
  }

  try {
    const { reference, userId, type, orderId, amount } = req.body;

    // Validate required fields
    if (!reference) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing payment reference" 
      });
    }

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing userId" 
      });
    }

    if (!type || !["order", "wallet"].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid type. Must be 'order' or 'wallet'" 
      });
    }

    if (type === "order" && !orderId) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing orderId for order payment" 
      });
    }

    // Get Paystack secret key from environment
    const PAYSTACK_SECRET_KEY = defineString('PAYSTACK_SECRET_KEY').value();
    
    if (!PAYSTACK_SECRET_KEY) {
      console.error("❌ PAYSTACK_SECRET_KEY not configured");
      return res.status(500).json({ 
        success: false, 
        message: "Payment verification not configured" 
      });
    }

    // Verify payment with Paystack API
    console.log(`🔍 Verifying payment: ${reference}`);
    
    const fetch = (await import('node-fetch')).default;
    const paystackUrl = `https://api.paystack.co/transaction/verify/${reference}`;
    
    const paystackResponse = await fetch(paystackUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!paystackResponse.ok) {
      console.error(`❌ Paystack API error: ${paystackResponse.status}`);
      return res.status(502).json({ 
        success: false, 
        message: "Failed to verify with Paystack" 
      });
    }

    const paystackData = await paystackResponse.json();
    
    console.log('📋 Paystack verification result:', {
      status: paystackData.status,
      data_status: paystackData.data?.status,
      amount: paystackData.data?.amount,
      reference: paystackData.data?.reference
    });

    // Check if payment was successful
    if (!paystackData.status || paystackData.data?.status !== "success") {
      return res.json({
        success: false,
        message: `Payment verification failed. Status: ${paystackData.data?.status}`,
        paystackStatus: paystackData.data?.status
      });
    }

    // Convert amount from kobo to naira
    const verifiedAmount = paystackData.data.amount / 100;
    const paymentDate = new Date(paystackData.data.paid_at);

    console.log(`✅ Payment verified: ₦${verifiedAmount} on ${paymentDate.toISOString()}`);

    // Update Firestore based on payment type
    const batch = firestore.batch();
    let updateResult = {};

    if (type === "order" && orderId) {
      console.log(`📦 Updating order: ${orderId}`);
      
      const orderRef = firestore.collection("orders").doc(orderId);
      batch.update(orderRef, {
        status: "paid",
        paymentStatus: "verified",
        verifiedAmount: verifiedAmount,
        paystackReference: reference,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      updateResult.orderUpdated = true;
      updateResult.orderId = orderId;
    }

    if (type === "wallet" && userId) {
      console.log(`💰 Updating wallet for user: ${userId}`);
      
      const walletRef = firestore.collection("wallets").doc(userId);
      batch.set(walletRef, {
        balance: admin.firestore.FieldValue.increment(verifiedAmount),
        lastTopupAmount: verifiedAmount,
        lastTopupReference: reference,
        lastTopupAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // ✅ Create transaction record in wallet subcollection
      const currentWalletDoc = await walletRef.get();
      const currentBalance = currentWalletDoc.exists ? (currentWalletDoc.data().balance || 0) : 0;
      const newBalance = currentBalance + verifiedAmount;
      
      const transactionRef = firestore.collection("wallets").doc(userId).collection("transactions").doc();
      batch.set(transactionRef, {
        type: "credit",
        category: "topup",
        amount: verifiedAmount,
        balance: newBalance,
        description: "Wallet top-up via Paystack",
        reference: reference,
        status: "completed",
        method: "paystack",
        paymentMethod: paystackData.data.channel || "card",
        currency: "NGN",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Also log in top-level for admin tracking
      const adminTransactionRef = firestore.collection("transactions").doc();
      batch.set(adminTransactionRef, {
        userId: userId,
        type: "credit",
        amount: verifiedAmount,
        reference: reference,
        channel: paystackData.data.channel || "card",
        status: "success",
        source: "Paystack",
        description: "Wallet top-up via Paystack",
        method: "paystack",
        currency: "NGN",
        metadata: {
          paystackReference: reference,
          paidAt: paystackData.data.paid_at,
          channel: paystackData.data.channel,
          cardType: paystackData.data.authorization?.card_type,
          bank: paystackData.data.authorization?.bank
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      updateResult.walletUpdated = true;
      updateResult.creditedAmount = verifiedAmount;
      updateResult.transactionCreated = true;
    }

    // Execute all updates atomically
    await batch.commit();

    console.log(`🎉 Successfully processed ${type} payment: ${reference}`);

    // Return success response
    return res.json({
      success: true,
      message: "Payment verified and processed successfully",
      data: {
        reference: reference,
        amount: verifiedAmount,
        type: type,
        verifiedAt: new Date().toISOString(),
        ...updateResult
      }
    });

  } catch (error) {
    console.error("❌ Payment verification error:", error);
    
    return res.status(500).json({
      success: false,
      message: "Internal server error during payment verification",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 💰 GET WALLET BALANCE (Authenticated)
 * Returns current user wallet balance
 */
exports.getWalletBalance = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;

  try {
    const walletDoc = await firestore.collection('wallets').doc(userId).get();
    
    if (!walletDoc.exists) {
      return {
        balance: 0,
        hasWallet: false
      };
    }

    const walletData = walletDoc.data();
    
    return {
      balance: walletData.balance || 0,
      hasWallet: true,
      lastTopupAt: walletData.lastTopupAt?.toDate()?.toISOString() || null,
      lastTopupAmount: walletData.lastTopupAmount || 0
    };

  } catch (error) {
    console.error('Error getting wallet balance:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get wallet balance');
  }
});

/**
 * 🏦 Get User Virtual Account Details
 * 
 * Retrieves the user's dedicated virtual account information
 * for display in the frontend wallet section.
 */
exports.getUserVirtualAccount = functions.https.onCall(async (data, context) => {
  try {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;

    // Get user data
    const userDoc = await firestore.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      return {
        hasVirtualAccount: false,
        message: "User profile not found"
      };
    }
    
    const userData = userDoc.data();
    
    if (!userData.virtualAccount) {
      return {
        hasVirtualAccount: false,
        message: "Virtual account not created yet"
      };
    }
    
    return {
      hasVirtualAccount: true,
      virtualAccount: {
        bank: userData.virtualAccount.bank,
        account_number: userData.virtualAccount.account_number,
        account_name: userData.virtualAccount.account_name
      },
      paystackId: userData.paystackId
    };

  } catch (error) {
    console.error("Get virtual account error:", error);
    throw new functions.https.HttpsError('internal', 
      `Failed to get virtual account: ${error.message}`);
  }
});

// ===================================================================
// 📱 WHATSAPP OTP VERIFICATION SYSTEM FOR WALLET WITHDRAWALS
// ===================================================================

/**
 * 🎉 SEND WELCOME MESSAGE
 * Sends welcome email to new users (via Resend)
 * 
 * Triggered when a new user document is created in Firestore
 */
exports.sendWelcomeMessage = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    try {
      const userData = snap.data();
      const userId = context.params.userId;
      
      console.log('🎉 Sending welcome message to new user:', userId);
      
      const { email, name } = userData;
      
      let welcomeEmailStatus = 'skipped'; // 'sent' | 'skipped' | 'failed'

      // Send welcome email via Resend (if email exists)
      if (email) {
        try {
          const resend = getResend();
          if (resend) {
            await resend.emails.send({
              from: WORKING_FROM,
              to: email,
              subject: `🎉 Welcome to Go7, ${name || 'there'}!`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
                  <div style="background:linear-gradient(135deg,#E30613,#8B0000);color:white;padding:40px 30px;text-align:center">
                    <h1 style="margin:0;font-size:32px">🎉 Welcome to Go7!</h1>
                    <p style="margin:10px 0 0;font-size:18px;opacity:0.9">Your account is ready to go</p>
                  </div>
                  <div style="padding:30px;background:#f9f9f9">
                    <p style="font-size:16px;color:#333">Hi <strong>${name || 'there'}</strong>,</p>
                    <p style="font-size:15px;color:#333;line-height:1.6">
                      Thanks for signing up! Your Go7 account has been created successfully.
                      Start ordering delicious meals, booking deliveries, and running errands — all in one app. 🍕🚚
                    </p>
                    <div style="text-align:center;margin:30px 0">
                      <a href="https://go7.ng" style="background:#E30613;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Start Exploring Go7</a>
                    </div>
                    <p style="font-size:13px;color:#888;margin-top:30px">If you didn't create this account, you can safely ignore this email.</p>
                  </div>
                  <div style="background:#333;color:#fff;padding:20px;text-align:center;font-size:12px">
                    <p style="margin:0">© 2026 GO7 Delivery. All rights reserved.</p>
                    <p style="margin:10px 0 0">Fast & Reliable Delivery Service in Abeokuta</p>
                  </div>
                </div>
              `
            });
            console.log('✅ Welcome email sent to:', email);
            welcomeEmailStatus = 'sent';
          } else {
            console.warn('⚠️ Resend not configured, skipping welcome email');
          }
        } catch (emailError) {
          console.error('⚠️ Failed to send welcome email:', emailError);
          welcomeEmailStatus = 'failed';
          // Don't fail the function if email fails
        }
      }

      // Log welcome flow outcome — emailStatus is honest about delivery:
      // the message flag means the flow ran; emailStatus says whether the
      // Resend send actually went out.
      await firestore.collection('users').doc(userId).update({
        welcomeMessageSent: true,
        welcomeMessageSentAt: admin.firestore.FieldValue.serverTimestamp(),
        welcomeEmailStatus,
      });
      
      console.log('✅ Welcome message flow finished for:', email);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error sending welcome message:', error);
      return { success: false, error: error.message };
    }
  });

/**
 * 📤 Send Firebase Phone OTP
 * 
 * Sends OTP via Firebase Auth (SMS) for sensitive wallet operations
 * This works even if WhatsApp is not configured
 */
exports.sendPhoneOTP = functions.https.onCall(async (data, context) => {
  try {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = context.auth.uid;

    // Rate limiting: Check recent OTP requests
    const rateLimitDoc = await firestore.collection('rate_limits').doc('otp_' + uid).get();
    if (rateLimitDoc.exists) {
      const rateData = rateLimitDoc.data();
      const requestCount = rateData.count || 0;
      const lastRequestTime = rateData.lastRequestTime?.toMillis() || 0;
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      // Allow max 5 OTP requests per hour
      if (requestCount >= 5 && lastRequestTime > oneHourAgo) {
        throw new functions.https.HttpsError('resource-exhausted', 'Too many OTP requests. Please try again later.');
      }
      
      // Reset count if more than 1 hour has passed
      if (lastRequestTime <= oneHourAgo) {
        await firestore.collection('rate_limits').doc('otp_' + uid).set({
          count: 1,
          lastRequestTime: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Increment count
        await firestore.collection('rate_limits').doc('otp_' + uid).update({
          count: admin.firestore.FieldValue.increment(1),
          lastRequestTime: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } else {
      // First request
      await firestore.collection('rate_limits').doc('otp_' + uid).set({
        count: 1,
        lastRequestTime: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Get user phone number
    const userDoc = await firestore.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    const phone = userData.phone || userData.phoneNumber;

    if (!phone) {
      throw new functions.https.HttpsError('failed-precondition', 'User has no phone number');
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 300000; // 5 minutes (300 seconds)

    // Save OTP to Firestore
    await firestore.collection('otp_codes').doc(uid).set({
      code,
      expiresAt,
      phone,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      purpose: data.purpose || 'wallet_action',
      attempts: 0
    });

    console.log('🔐 OTP generated for user:', { uid, phone, code });

    // Try to send via WhatsApp first (optional — config may be unset, then we
    // fall through to the SMS path below)
    const whatsappConfig = (functions.config().whatsapp) || null;
    if (whatsappConfig?.access_token && whatsappConfig?.phone_number_id) {
      try {
        const fetch = (await import('node-fetch')).default;
        
        const messageBody = `🔐 *GO7 Security Code*\n\nYour verification code is: *${code}*\n\nValid for 5 minutes.\n\nDo not share this code with anyone.`;

        const whatsappResponse = await fetch(
          `https://graph.facebook.com/v17.0/${whatsappConfig.phone_number_id}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsappConfig.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone.replace('+', ''),
              type: 'text',
              text: { body: messageBody }
            })
          }
        );

        const result = await whatsappResponse.json();

        if (!result.error) {
          console.log('✅ OTP sent via WhatsApp:', { uid, phone });
          return {
            success: true,
            message: 'OTP sent to your WhatsApp',
            method: 'whatsapp',
            expiresIn: 300
          };
        }
      } catch (whatsappError) {
        console.warn('⚠️ WhatsApp send failed, will use Firebase Auth:', whatsappError.message);
      }
    }

    // Fallback: Use Firebase Auth to send SMS
    // Note: This requires Firebase Auth Phone provider to be enabled
    // and Blaze plan for SMS sending
    
    // For now, return success with OTP for testing
    // In production, Firebase will send SMS automatically when user verifies phone
    console.log('📱 OTP ready for Firebase Auth verification');

    return {
      success: true,
      message: 'OTP sent to your phone',
      method: 'sms',
      expiresIn: 300,
      // REMOVE IN PRODUCTION - only for testing without SMS
      testMode: true,
      testOTP: code
    };

  } catch (error) {
    console.error('❌ Send OTP error:', error);
    throw new functions.https.HttpsError('internal', `Failed to send OTP: ${error.message}`);
  }
});

/**
 * ✅ Verify Phone OTP
 *
 * Validates the OTP code for sensitive wallet actions and signup verification.
 * Signup OTPs are keyed as signup_{phone}; mark verified instead of deleting
 * so a double-tap / slow register retry does not look like "session expired".
 */
exports.verifyPhoneOTP = functions.https.onCall(async (data, context) => {
  try {
    const { code: inputCode, userId, phoneNumber } = data || {};

    const formatLocal = (phone) => {
      let cleaned = String(phone || '').replace(/\D/g, '');
      if (cleaned.startsWith('234')) cleaned = '0' + cleaned.substring(3);
      if (cleaned && !cleaned.startsWith('0')) cleaned = '0' + cleaned;
      return cleaned;
    };

    const localPhone = phoneNumber ? formatLocal(phoneNumber) : '';
    let uid = userId || (context.auth ? context.auth.uid : null);
    if (!uid && localPhone) {
      uid = `signup_${localPhone}`;
    }

    if (!uid) {
      throw new functions.https.HttpsError('unauthenticated', 'User ID is required');
    }

    if (!inputCode || String(inputCode).trim().length !== 6) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid OTP format');
    }

    // Resolve OTP doc: explicit uid, then signup_{phone}, then otps fallback
    const candidateIds = [];
    if (uid) candidateIds.push(uid);
    if (localPhone) {
      const phoneKey = `signup_${localPhone}`;
      if (!candidateIds.includes(phoneKey)) candidateIds.push(phoneKey);
    }

    let otpCollection = 'otp_codes';
    let otpDoc = null;
    let resolvedUid = uid;

    for (const id of candidateIds) {
      otpDoc = await firestore.collection('otp_codes').doc(id).get();
      if (otpDoc.exists) {
        otpCollection = 'otp_codes';
        resolvedUid = id;
        break;
      }
      otpDoc = await firestore.collection('otps').doc(id).get();
      if (otpDoc.exists) {
        otpCollection = 'otps';
        resolvedUid = id;
        break;
      }
    }

    if (!otpDoc || !otpDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'No OTP found. Please request a new WhatsApp code and try again.'
      );
    }

    const otpData = otpDoc.data() || {};
    const storedCode = otpData.code;
    const attempts = otpData.attempts || 0;
    const expiresAtMs = typeof otpData.expiresAt?.toMillis === 'function'
      ? otpData.expiresAt.toMillis()
      : Number(otpData.expiresAt || 0);

    if (attempts >= 3) {
      await firestore.collection(otpCollection).doc(resolvedUid).delete().catch(() => {});
      throw new functions.https.HttpsError(
        'permission-denied',
        'Too many failed attempts. Please request a new code.'
      );
    }

    if (!expiresAtMs || Date.now() > expiresAtMs) {
      await firestore.collection(otpCollection).doc(resolvedUid).delete().catch(() => {});
      throw new functions.https.HttpsError(
        'deadline-exceeded',
        'OTP expired. Please request a new code.'
      );
    }

    const codeMatches = String(inputCode).trim() === String(storedCode).trim();
    if (!codeMatches) {
      await firestore.collection(otpCollection).doc(resolvedUid).update({
        attempts: admin.firestore.FieldValue.increment(1),
      });
      throw new functions.https.HttpsError(
        'permission-denied',
        `Invalid OTP code. ${Math.max(0, 2 - attempts)} attempts remaining.`
      );
    }

    // Already verified recently — allow retry window (double-submit / slow register)
    if (otpData.verified) {
      const verifiedAtMs = typeof otpData.verifiedAt?.toMillis === 'function'
        ? otpData.verifiedAt.toMillis()
        : Number(otpData.verifiedAt || 0);
      if (verifiedAtMs && Date.now() - verifiedAtMs <= 10 * 60 * 1000) {
        console.log('✅ OTP re-accepted within retry window:', resolvedUid);
        return {
          success: true,
          message: 'OTP verified successfully',
          userId: resolvedUid,
          phone: otpData.phone || localPhone || null,
        };
      }
      await firestore.collection(otpCollection).doc(resolvedUid).delete().catch(() => {});
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This code was already used. Please request a new WhatsApp code.'
      );
    }

    await firestore.collection(otpCollection).doc(resolvedUid).set({
      ...otpData,
      verified: true,
      verifiedAt: Date.now(),
      attempts,
    }, { merge: true });

    if (otpCollection === 'otp_codes') {
      await firestore.collection('otps').doc(resolvedUid).set({
        ...otpData,
        verified: true,
        verifiedAt: Date.now(),
      }, { merge: true }).catch(() => {});
    } else {
      await firestore.collection('otp_codes').doc(resolvedUid).set({
        ...otpData,
        verified: true,
        verifiedAt: Date.now(),
      }, { merge: true }).catch(() => {});
    }

    console.log('✅ OTP verified successfully:', resolvedUid);

    return {
      success: true,
      message: 'OTP verified successfully',
      userId: resolvedUid,
      phone: otpData.phone || localPhone || null,
    };
  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', error.message || 'OTP verification failed');
  }
});

/**
 * 🔐 Login with Phone OTP
 * 
 * Authenticates user with phone number + OTP code
 * Returns custom Firebase token for passwordless login
 */
exports.loginWithPhoneOTP = functions.https.onCall(async (data, context) => {
  try {
    const { phoneNumber, code, userId: clientUserId } = data;

    if ((!phoneNumber && !clientUserId) || !code) {
      throw new functions.https.HttpsError('invalid-argument', 'Phone number and OTP code are required');
    }

    const localPhone = phoneNumber
      ? (() => {
          let cleaned = String(phoneNumber).replace(/\D/g, '');
          if (cleaned.startsWith('234')) cleaned = '0' + cleaned.substring(3);
          if (!cleaned.startsWith('0')) cleaned = '0' + cleaned;
          return cleaned;
        })()
      : '';

    let userDoc = null;

    // Prefer userId from requestLoginOTP — avoids a second flaky phone query
    if (clientUserId && typeof clientUserId === 'string') {
      const byId = await firestore.collection('users').doc(clientUserId).get();
      if (byId.exists) userDoc = byId;
    }

    if (!userDoc && localPhone) {
      const phoneFormats = [
        localPhone,
        localPhone.substring(1),
        '234' + localPhone.substring(1),
        '+234' + localPhone.substring(1),
      ];
      const phoneFields = ['phoneNumber', 'phone', 'mobile', 'whatsapp', 'contactPhone'];

      for (const format of phoneFormats) {
        for (const field of phoneFields) {
          const usersSnapshot = await firestore.collection('users')
            .where(field, '==', format)
            .limit(1)
            .get();
          if (!usersSnapshot.empty) {
            userDoc = usersSnapshot.docs[0];
            break;
          }
        }
        if (userDoc) break;
      }
    }

    if (!userDoc) {
      throw new functions.https.HttpsError('not-found', 'No account found with this phone number');
    }

    const uid = userDoc.id;
    const userData = userDoc.data();
    const profilePhone = (() => {
      const raw = userData.phoneNumber || userData.phone || localPhone;
      let cleaned = String(raw || '').replace(/\D/g, '');
      if (cleaned.startsWith('234')) cleaned = '0' + cleaned.substring(3);
      if (cleaned && !cleaned.startsWith('0')) cleaned = '0' + cleaned;
      return cleaned || localPhone;
    })();

    // Get stored OTP (otp_codes first, then otps fallback)
    let otpCollection = 'otp_codes';
    let otpDoc = await firestore.collection(otpCollection).doc(uid).get();
    if (!otpDoc.exists) {
      otpCollection = 'otps';
      otpDoc = await firestore.collection(otpCollection).doc(uid).get();
    }

    if (!otpDoc.exists) {
      // Distinct from account-missing — client must not show "no account"
      throw new functions.https.HttpsError(
        'failed-precondition',
        'No OTP found. Please request a new WhatsApp code and try again.'
      );
    }

    const otpData = otpDoc.data();
    const { code: storedCode, expiresAt, attempts = 0 } = otpData;
    const expiresAtMs = typeof expiresAt?.toMillis === 'function'
      ? expiresAt.toMillis()
      : Number(expiresAt || 0);

    // Check max attempts
    if (attempts >= 3) {
      await firestore.collection(otpCollection).doc(uid).delete().catch(() => {});
      throw new functions.https.HttpsError('permission-denied', 'Too many failed attempts. Please request a new code.');
    }

    // Check expiration
    if (!expiresAtMs || Date.now() > expiresAtMs) {
      await firestore.collection(otpCollection).doc(uid).delete().catch(() => {});
      throw new functions.https.HttpsError('deadline-exceeded', 'OTP expired. Please request a new code.');
    }

    // Verify code (allow one short re-issue window after success — iPhone/Safari
    // sometimes fails signInWithCustomToken after the server already accepted OTP)
    const codeMatches = String(code).trim() === String(storedCode).trim();
    if (!codeMatches) {
      await firestore.collection(otpCollection).doc(uid).update({
        attempts: admin.firestore.FieldValue.increment(1)
      });
      throw new functions.https.HttpsError('permission-denied', `Invalid OTP code. ${2 - attempts} attempts remaining.`);
    }

    if (otpData.verified) {
      const verifiedAtMs = typeof otpData.verifiedAt?.toMillis === 'function'
        ? otpData.verifiedAt.toMillis()
        : Number(otpData.verifiedAt || 0);
      if (!verifiedAtMs || Date.now() - verifiedAtMs > 5 * 60 * 1000) {
        await firestore.collection(otpCollection).doc(uid).delete().catch(() => {});
        throw new functions.https.HttpsError(
          'failed-precondition',
          'This code was already used. Please request a new WhatsApp code.'
        );
      }
    }

    // Create custom token BEFORE consuming OTP — client can retry sign-in on iOS
    const tokenProjectId =
      admin.app().options.projectId ||
      process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT ||
      'unknown';
    if (tokenProjectId !== 'go7-app-209e4') {
      console.error('❌ Refusing custom token mint for wrong project:', tokenProjectId);
      throw new functions.https.HttpsError(
        'internal',
        'Login service misconfigured. Please try again in a moment.'
      );
    }
    const customToken = await admin.auth().createCustomToken(uid, {
      phoneNumber: profilePhone || phoneNumber,
      phoneVerified: true
    });
    console.log('🔐 Custom token minted for project:', tokenProjectId, 'uid:', uid);

    // Mark OTP consumed (keep briefly for Safari/iPhone sign-in retries)
    await firestore.collection(otpCollection).doc(uid).set({
      ...otpData,
      verified: true,
      verifiedAt: Date.now(),
      attempts: attempts || 0,
    }, { merge: true }).catch(() => {});
    if (otpCollection === 'otp_codes') {
      await firestore.collection('otps').doc(uid).set({
        ...otpData,
        verified: true,
        verifiedAt: Date.now(),
      }, { merge: true }).catch(() => {});
    } else {
      await firestore.collection('otp_codes').doc(uid).set({
        ...otpData,
        verified: true,
        verifiedAt: Date.now(),
      }, { merge: true }).catch(() => {});
    }

    // Update last login + ensure phone is on profile for wallet/DVA
    await firestore.collection('users').doc(uid).update({
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginMethod: 'phone_otp',
      phoneVerified: true,
      phone: profilePhone || localPhone,
      phoneNumber: profilePhone || localPhone,
    }).catch((err) => {
      console.warn('⚠️ users lastLogin update skipped:', err?.message);
    });

    console.log('✅ Login with phone OTP successful:', uid);

    return {
      success: true,
      customToken: customToken,
      user: {
        uid: uid,
        phoneNumber: profilePhone || phoneNumber,
        email: userData.email || null,
        displayName: userData.displayName || userData.name || null
      }
    };

  } catch (error) {
    console.error('❌ Login with phone OTP error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      error?.message || 'Login failed. Please try again.'
    );
  }
});

// ===================================================================
// 🔐 PAYSTACK WEBHOOK + VERIFICATION SYSTEM FOR GO7 WALLET FUNDING
// ===================================================================

// crypto already imported at top

/**
 * 🔐 Paystack Webhook Handler
 * 
 * Securely processes Paystack webhook events for Go7 wallet funding
 * Features:
 * - Signature verification for security
 * - Duplicate prevention using payment references
 * - Atomic wallet balance updates
 * - Transaction logging for audit trail
 * 
 * Webhook URL: https://YOUR_FIREBASE_PROJECT.cloudfunctions.net/paystackWebhook
 */
// TEMPORARILY DISABLED - STUCK IN 2ND GEN UPGRADE
// exports.paystackWebhook = functions.https.onRequest(async (req, res) => {
exports.paystackWebhookOLD = functions.https.onRequest(async (req, res) => {
  console.log("📡 Paystack webhook received:", {
    method: req.method,
    headers: req.headers,
    event: req.body?.event,
    fullBody: req.body
  });

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.warn("Invalid method:", req.method);
    return res.status(405).send("Method not allowed");
  }

  try {
    // Get Paystack secret key from environment
    const secret = functions.config().paystack?.secret || process.env.PAYSTACK_SECRET_KEY;
    
    if (!secret) {
      console.error("❌ Paystack secret key not configured");
      console.error("💡 Configure with: firebase functions:config:set paystack.secret=YOUR_SECRET_KEY");
      return res.status(500).send("Configuration error");
    }

    // Verify webhook signature for security
    const signature = req.headers["x-paystack-signature"];
    if (!signature) {
      console.error("❌ Missing webhook signature");
      return res.status(401).send("Missing signature");
    }

    // Create hash from request body
    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== signature) {
      console.error("❌ Invalid webhook signature");
      console.log("Expected:", hash.substring(0, 20) + "...");
      console.log("Received:", signature.substring(0, 20) + "...");
      return res.status(401).send("Invalid signature");
    }

    console.log("✅ Webhook signature verified");

    const event = req.body;
    console.log("📊 Processing event:", event.event, "Reference:", event.data?.reference);

    // Handle successful charge events (includes DVA and card payments)
    if (event.event === "charge.success" && event.data.status === "success") {
      const data = event.data;
      const amount = data.amount / 100; // Convert from kobo to naira
      const reference = data.reference;
      const email = data.customer?.email;
      const metadata = data.metadata || {};

      console.log("💳 Payment details:", {
        reference,
        amount: `₦${amount}`,
        email,
        metadata,
        status: data.status,
        channel: data.channel
      });

      // 1️⃣ Identify user by UID (from metadata) or email
      let uid = metadata.userId || metadata.uid || metadata["User ID"];
      
      if (!uid && email) {
        // Try to find user by email
        const userSnapshot = await firestore.collection("users").where("email", "==", email).limit(1).get();
        if (!userSnapshot.empty) {
          uid = userSnapshot.docs[0].id;
          console.log("✅ User found by email:", email, "→", uid);
        }
      }

      if (!uid) {
        console.warn("⚠️ No matching user found for payment:", { email, metadata });
        return res.status(404).send("User not found");
      }

      // Prevent duplicate processing
      const existingTxRef = firestore.collection("webhook_transactions").doc(reference);
      const existingTx = await existingTxRef.get();

      if (existingTx.exists) {
        console.log("🔄 Duplicate webhook ignored for reference:", reference);
        return res.status(200).send("Already processed");
      }

      // Process payment in transaction for data consistency
      await firestore.runTransaction(async (transaction) => {
        // Get or create user wallet FIRST (all reads must come before writes)
        const walletRef = firestore.collection("wallets").doc(uid);
        const walletDoc = await transaction.get(walletRef);

        // Now do all the writes after reads are complete
        // Mark webhook as processed first (prevents duplicates)
        transaction.set(existingTxRef, {
          reference,
          userId: uid,
          amount,
          email,
          metadata,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          webhookEvent: event.event,
          paymentStatus: data.status,
          channel: data.channel
        });

        let currentBalance = 0;
        if (walletDoc.exists) {
          currentBalance = walletDoc.data().balance || 0;
        }

        const newBalance = currentBalance + amount;

        // 2️⃣ Credit wallet
        if (walletDoc.exists) {
          transaction.update(walletRef, {
            balance: newBalance,
            lastTopupAmount: amount,
            lastTopupReference: reference,
            lastTopupAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          // Create new wallet
          transaction.set(walletRef, {
            userId: uid,
            balance: newBalance,
            lastTopupAmount: amount,
            lastTopupReference: reference,
            lastTopupAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        // 3️⃣ Log transaction in wallet subcollection
        const transactionRef = firestore.collection("wallets").doc(uid).collection("transactions").doc();
        transaction.set(transactionRef, {
          type: "credit",
          category: "topup",
          amount,
          balance: newBalance,
          description: data.channel === "dedicated_nuban" ? "Bank transfer to Paystack account" : "Wallet top-up via Paystack",
          reference,
          status: "completed",
          method: data.channel === "dedicated_nuban" ? "dva_transfer" : "paystack",
          paymentMethod: data.channel === "dedicated_nuban" ? "bank_transfer" : "card",
          currency: "NGN",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Also log in top-level transactions for admin tracking
        const adminTransactionRef = firestore.collection("transactions").doc();
        transaction.set(adminTransactionRef, {
          userId: uid,
          type: "credit",
          amount,
          description: data.channel === "dedicated_nuban" ? "Wallet top-up via Paystack DVA" : "Wallet top-up via Paystack",
          reference,
          email,
          status: "success",
          source: data.channel === "dedicated_nuban" ? "Paystack DVA" : "Paystack Card",
          method: "paystack",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          metadata: {
            paystackReference: reference,
            channel: data.channel,
            webhookProcessed: true,
            ...metadata
          }
        });

        console.log("💰 Wallet credited ₦" + amount + " for " + email, {
          uid,
          previousBalance: currentBalance,
          creditAmount: amount,
          newBalance,
          reference,
          channel: data.channel
        });
      });

      console.log("✅ Wallet updated successfully");
      return res.status(200).send("Wallet updated successfully");
    }

    // Handle failed charges
    if (event.event === "charge.failed") {
      const reference = event.data?.reference;
      const uid = event.data?.metadata?.userId || event.data?.metadata?.uid || event.data?.metadata?.["User ID"];
      
      console.log("❌ Payment failed:", reference, "User:", uid);
      
      if (reference && uid) {
        // Log failed transaction
        await firestore.collection("failed_transactions").doc(reference).set({
          userId: uid,
          reference,
          reason: event.data?.gateway_response || "Payment failed",
          amount: event.data?.amount / 100,
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
          webhookEvent: event.event
        });
      }
      
      return res.status(200).send("Failure logged");
    }

    // Ignore all other non-payment events
    console.log("ℹ️ Event ignored:", event.event);
    return res.status(200).send("Event ignored");

  } catch (error) {
    console.error("💥 Webhook error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
});

/**
 * confirmOrderPayment — server-side payment confirmation for orders.
 * Verifies the Paystack reference against the API, checks the paid amount
 * covers the order total, and marks the order paid via Admin SDK. The client
 * can no longer fake 'paid' — verification is the only path.
 */
exports.confirmOrderPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  const { reference, orderId, orderCollection = 'orders' } = data || {};
  if (!reference || !orderId) throw new functions.https.HttpsError('invalid-argument', 'reference + orderId required');
  if (!['orders', 'gobuyOrders', 'bookings', 'deliveries'].includes(orderCollection)) {
    throw new functions.https.HttpsError('invalid-argument', 'unsupported collection');
  }

  const secret = functions.config().paystack?.secret || process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new functions.https.HttpsError('failed-precondition', 'Paystack secret not configured');

  const fetch = require('node-fetch');
  const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
  });
  const payload = await res.json();
  if (!payload.status || payload.data?.status !== 'success') {
    throw new functions.https.HttpsError('failed-precondition', `Payment not verified: ${payload.message || payload.data?.gateway_response || 'unknown'}`);
  }
  const paid = payload.data;
  const paidKobo = Math.round(Number(paid.amount || 0));

  const db = admin.firestore();
  const orderRef = db.collection(orderCollection).doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new functions.https.HttpsError('not-found', 'Order not found');
  const order = orderSnap.data();

  // Only the order owner (or admin) can confirm its payment.
  const ownerId = order.userId || order.customerId || order.customer?.uid;
  if (ownerId && ownerId !== context.auth.uid) {
    const uSnap = await db.collection('users').doc(context.auth.uid).get();
    if (!(uSnap.exists && uSnap.data().role === 'admin')) {
      throw new functions.https.HttpsError('permission-denied', 'Not your order');
    }
  }

  // Amount check — the charge must cover what the order actually costs.
  const totalKobo = Math.round(Number(order.totalKobo ?? order.grandTotalKobo ?? ((order.grandTotal ?? order.total ?? 0) * 100)) || 0);
  if (totalKobo > 0 && paidKobo < totalKobo) {
    console.error(`[confirmOrderPayment] underpayment ${reference}: paid ${paidKobo} < total ${totalKobo} on ${orderCollection}/${orderId}`);
    throw new functions.https.HttpsError('failed-precondition', `Underpaid: paid ₦${paidKobo / 100} but order is ₦${totalKobo / 100}`);
  }

  // Reference must match the Paystack metadata if the order tracks one.
  const refMeta = paid.metadata && (paid.metadata.orderId || paid.metadata.order_id);
  if (refMeta && refMeta !== orderId) {
    throw new functions.https.HttpsError('failed-precondition', 'Reference belongs to a different order');
  }

  await orderRef.update({
    paymentStatus: 'paid',
    paymentReference: reference,
    paymentRef: reference,
    paidAmountKobo: paidKobo,
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    paymentVerifiedBy: 'confirmOrderPayment',
  });
  console.log(`[confirmOrderPayment] ${orderCollection}/${orderId} paid via ${reference} (₦${paidKobo / 100})`);
  return { ok: true, orderId, reference, amountKobo: paidKobo };
});

/**
 * Manual payment verification (callable).
 * Named separately so it does not overwrite the HTTP `verifyPayment` onRequest handler.
 */
exports.verifyPaymentCallable = functions.https.onCall(async (data, context) => {
  try {
    const { reference } = data;
    
    if (!reference) {
      throw new functions.https.HttpsError('invalid-argument', 'Payment reference required');
    }

    // Get Paystack secret key
    const secret = functions.config().paystack?.secret || process.env.PAYSTACK_SECRET_KEY;
    
    if (!secret) {
      throw new functions.https.HttpsError('failed-precondition', 'Paystack secret not configured');
    }

    // Verify payment with Paystack API
    const fetch = require('node-fetch');
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json'
      }
    });

    const verifyData = await verifyResponse.json();
    
    if (!verifyData.status) {
      console.error("Payment verification failed:", verifyData.message);
      throw new functions.https.HttpsError('not-found', 
        `Payment verification failed: ${verifyData.message}`);
    }

    const paymentData = verifyData.data;
    console.log("✅ Payment verified manually:", {
      reference,
      amount: paymentData.amount / 100,
      status: paymentData.status
    });

    return {
      success: true,
      data: {
        reference: paymentData.reference,
        amount: paymentData.amount / 100,
        currency: paymentData.currency,
        status: paymentData.status,
        paidAt: paymentData.paid_at,
        customer: paymentData.customer
      }
    };

  } catch (error) {
    console.error("Manual verification error:", error);
    throw new functions.https.HttpsError('internal', 
      `Verification failed: ${error.message}`);
  }
});

/**
 * 💰 Enhanced Get Wallet Balance with Transaction History
 * 
 * Usage: Call from frontend with Firebase callable function
 */
exports.getWalletDetails = functions.https.onCall(async (data, context) => {
  try {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;

    // Get user data (for virtual account info)
    const userDoc = await firestore.collection("users").doc(userId).get();
    
    // Get wallet balance
    const walletDoc = await firestore.collection("wallets").doc(userId).get();
    
    let walletData = {
      balance: 0,
      lastTopupAmount: 0,
      lastTopupReference: null,
      lastTopupAt: null,
      exists: false,
      virtualAccount: null
    };

    if (walletDoc.exists) {
      const data = walletDoc.data();
      walletData = {
        balance: data.balance || 0,
        lastTopupAmount: data.lastTopupAmount || 0,
        lastTopupReference: data.lastTopupReference || null,
        lastTopupAt: data.lastTopupAt?.toDate()?.toISOString() || null,
        exists: true,
        virtualAccount: data.virtualAccount || null
      };
    }
    
    // If no virtual account in wallet, check user doc
    if (!walletData.virtualAccount && userDoc.exists) {
      const userData = userDoc.data();
      if (userData.virtualAccount) {
        walletData.virtualAccount = userData.virtualAccount;
      }
    }

    // Get recent transactions (both regular topups and DVA credits)
    const transactionsSnapshot = await firestore
      .collection("transactions")
      .where("userId", "==", userId)
      .where("type", "in", ["wallet_topup", "wallet_topup_dva"])
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const transactions = [];
    transactionsSnapshot.forEach(doc => {
      const txData = doc.data();
      transactions.push({
        id: doc.id,
        amount: txData.amount,
        reference: txData.reference,
        status: txData.status,
        method: txData.method,
        createdAt: txData.createdAt?.toDate()?.toISOString() || null,
        description: txData.description
      });
    });

    return {
      ...walletData,
      recentTransactions: transactions
    };

  } catch (error) {
    console.error("Get wallet details error:", error);
    throw new functions.https.HttpsError('internal', 
      `Failed to get wallet details: ${error.message}`);
  }
});

/**
 * 🔐 Fixed Paystack Webhook Handler (v2)
 * 
 * Handles Paystack webhook events with proper Firestore transaction ordering
 */
exports.paystackWebhookV2 = functions.https.onRequest(async (req, res) => {
  console.log("📡 Paystack webhook v2 received:", {
    method: req.method,
    event: req.body?.event
  });

  if (req.method !== 'POST') {
    return res.status(405).send("Method not allowed");
  }

  try {
    const secret = functions.config().paystack?.secret;
    
    if (!secret) {
      console.error("❌ Paystack secret key not configured");
      return res.status(500).send("Configuration error");
    }

    // Verify signature
    const signature = req.headers["x-paystack-signature"];
    if (!signature) {
      console.error("❌ Missing webhook signature");
      return res.status(401).send("Missing signature");
    }

    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== signature) {
      console.error("❌ Invalid webhook signature");
      return res.status(401).send("Invalid signature");
    }

    console.log("✅ Webhook signature verified");

    const event = req.body;
    
    // Handle regular payment (charge.success)
    if (event.event === "charge.success") {
      const paymentData = event.data;
      const reference = paymentData.reference;
      const amount = paymentData.amount / 100;
      const metadata = paymentData.metadata || {};
      let userId = metadata.userId || metadata["User ID"] || metadata.uid;

      console.log("💳 Payment details:", {
        reference,
        amount: `₦${amount}`,
        userId,
        email: paymentData.customer?.email,
        paymentType: metadata.paymentType,
      });

      // Delivery/booking payments — do not credit wallet. Older app bundles
      // tag order payments with purpose='order_payment' but no paymentType.
      if (metadata.paymentType === 'service_payment' || metadata.purpose === 'order_payment') {
        console.log('📦 Service payment acknowledged (no wallet credit):', reference);
        await firestore.collection('webhook_transactions').doc(reference).set({
          reference,
          userId: userId || null,
          amount,
          paymentType: 'service_payment',
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.status(200).send('Service payment acknowledged');
      }

      // If no userId in metadata, look up by email
      if (!userId && paymentData.customer?.email) {
        console.log("🔍 Looking up user by email:", paymentData.customer.email);
        const userQuery = await firestore
          .collection("users")
          .where("email", "==", paymentData.customer.email)
          .limit(1)
          .get();

        if (!userQuery.empty) {
          userId = userQuery.docs[0].id;
          console.log("✅ Found user by email:", userId);
        }
      }

      if (!userId) {
        console.warn("⚠️ Could not find user for payment");
        // Log failed transaction for manual review
        await firestore.collection("failed_transactions").doc(reference).set({
          reference,
          amount,
          email: paymentData.customer?.email,
          metadata,
          reason: "User not found",
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return res.status(400).send("User not found");
      }

      // Check for duplicate
      const existingTxRef = firestore.collection("webhook_transactions").doc(reference);
      const existingTx = await existingTxRef.get();

      if (existingTx.exists) {
        console.log("🔄 Duplicate webhook ignored");
        return res.status(200).send("Already processed");
      }

      // Process with proper transaction ordering
      await firestore.runTransaction(async (transaction) => {
        // ALL READS FIRST
        const walletRef = firestore.collection("wallets").doc(userId);
        const walletDoc = await transaction.get(walletRef);

        // ALL WRITES AFTER READS
        let currentBalance = 0;
        if (walletDoc.exists) {
          currentBalance = walletDoc.data().balance || 0;
        }
        const newBalance = currentBalance + amount;

        // Mark webhook as processed
        transaction.set(existingTxRef, {
          reference,
          userId,
          amount,
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update/create wallet
        if (walletDoc.exists) {
          transaction.update(walletRef, {
            balance: newBalance,
            lastTopupAmount: amount,
            lastTopupReference: reference,
            lastTopupAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          transaction.set(walletRef, {
            userId,
            balance: newBalance,
            lastTopupAmount: amount,
            lastTopupReference: reference,
            lastTopupAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        // Log transaction in wallet subcollection
        const transactionRef = firestore.collection("wallets").doc(userId).collection("transactions").doc();
        transaction.set(transactionRef, {
          type: "credit",
          category: "topup",
          amount,
          balance: newBalance,
          description: `Wallet top-up via Paystack`,
          reference,
          status: "completed",
          method: "paystack",
          paymentMethod: "card",
          currency: "NGN",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Also log in top-level transactions for admin tracking
        const adminTransactionRef = firestore.collection("transactions").doc();
        transaction.set(adminTransactionRef, {
          userId,
          type: "wallet_topup",
          amount,
          description: `Wallet top-up via Paystack`,
          reference,
          status: "completed",
          method: "paystack",
          paymentMethod: "card",
          currency: "NGN",
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log("💰 Wallet updated:", {
          userId,
          previousBalance: currentBalance,
          creditAmount: amount,
          newBalance
        });

        // Create Firestore notification for instant SweetAlert
        const notificationRef = firestore.collection("notifications").doc();
        transaction.set(notificationRef, {
          uid: userId,
          title: "Wallet Credited 💰",
          message: `₦${amount.toLocaleString()} added to your wallet`,
          type: "wallet_credit",
          read: false,
          amount: amount,
          reference: reference,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      // Send notifications to user (FCM + Email)
      try {
        const userDoc = await firestore.collection("users").doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const fcmToken = userData.fcmToken;
          const userEmail = userData.email || paymentData.customer?.email;
          const userName = userData.name || userData.displayName;
          
          // Send FCM notification
          if (fcmToken) {
            const messaging = admin.messaging();
            await messaging.send({
              token: fcmToken,
              notification: {
                title: "💰 Payment Received!",
                body: `₦${amount.toLocaleString()} has been added to your wallet`
              },
              data: {
                type: "payment_received",
                amount: amount.toString(),
                reference,
                timestamp: Date.now().toString()
              },
              android: {
                priority: "high",
                notification: {
                  sound: "default",
                  channelId: "payments"
                }
              },
              apns: {
                payload: {
                  aps: {
                    sound: "default",
                    badge: 1
                  }
                }
              }
            });
            console.log(`📱 FCM notification sent to ${userId}`);
          }
          
          // Send email notification
          if (userEmail) {
            const emailResult = await sendWalletCreditEmail({
              to: userEmail,
              userName: userName,
              amount: amount,
              reference: reference,
              paymentMethod: 'card'
            });
            
            if (emailResult.success) {
              console.log(`📧 Email notification sent to ${userEmail} (${emailResult.messageId})`);
            } else {
              console.warn(`⚠️ Email failed to ${userEmail}:`, emailResult.error);
            }
          } else {
            console.warn("⚠️ No email address found for user:", userId);
          }
        }
      } catch (notifError) {
        console.warn("⚠️ Failed to send notifications:", notifError.message);
      }

      console.log("✅ Payment processed successfully");
      return res.status(200).json({ success: true, reference });
    }
    
    // Handle Dedicated Virtual Account credit (DVA)
    if (event.event === "dedicatedaccount.received_credit") {
      console.log("🏦 DVA credit received:", event.data);
      
      const paymentData = event.data;
      const amount = paymentData.amount / 100; // Convert from kobo to naira
      const reference = paymentData.session_id || `DVA-${Date.now()}`;
      const customerCode = paymentData.customer?.customer_code;
      
      console.log("💳 DVA payment details:", {
        amount: `₦${amount}`,
        customerCode,
        reference,
        accountNumber: paymentData.dedicated_account?.account_number
      });
      
      if (!customerCode) {
        console.warn("⚠️ Missing customer code in DVA payment");
        return res.status(400).send("Missing customer code");
      }
      
      // Find user by Paystack customer code
      const usersQuery = await firestore
        .collection("users")
        .where("paystackId", "==", customerCode)
        .limit(1)
        .get();
      
      if (usersQuery.empty) {
        console.warn("⚠️ No user found for customer code:", customerCode);
        return res.status(404).send("User not found");
      }
      
      const userDoc = usersQuery.docs[0];
      const userId = userDoc.id;
      
      console.log("👤 Found user for DVA credit:", userId);
      
      // Check for duplicate
      const existingTxRef = firestore.collection("webhook_transactions").doc(reference);
      const existingTx = await existingTxRef.get();
      
      if (existingTx.exists) {
        console.log("🔄 Duplicate DVA webhook ignored");
        return res.status(200).send("Already processed");
      }
      
      // Process DVA credit with proper transaction ordering
      await firestore.runTransaction(async (transaction) => {
        // ALL READS FIRST
        const walletRef = firestore.collection("wallets").doc(userId);
        const walletDoc = await transaction.get(walletRef);
        
        // ALL WRITES AFTER READS
        let currentBalance = 0;
        if (walletDoc.exists) {
          currentBalance = walletDoc.data().balance || 0;
        }
        const newBalance = currentBalance + amount;
        
        // Mark webhook as processed
        transaction.set(existingTxRef, {
          reference,
          userId,
          customerCode,
          amount,
          type: "dva_credit",
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Update/create wallet
        if (walletDoc.exists) {
          transaction.update(walletRef, {
            balance: newBalance,
            lastTopupAmount: amount,
            lastTopupReference: reference,
            lastTopupAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          transaction.set(walletRef, {
            userId,
            balance: newBalance,
            lastTopupAmount: amount,
            lastTopupReference: reference,
            lastTopupAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        
        // Log transaction in wallet subcollection
        const transactionRef = firestore.collection("wallets").doc(userId).collection("transactions").doc();
        transaction.set(transactionRef, {
          type: "credit",
          category: "topup",
          amount,
          balance: newBalance,
          description: `Bank transfer to ${paymentData.dedicated_account?.account_number}`,
          reference,
          status: "completed",
          method: "dva_transfer",
          paymentMethod: "bank_transfer",
          currency: "NGN",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Also log in top-level transactions for admin tracking
        const adminTransactionRef = firestore.collection("transactions").doc();
        transaction.set(adminTransactionRef, {
          userId,
          type: "wallet_topup_dva",
          amount,
          description: `Wallet top-up via DVA (${paymentData.dedicated_account?.account_number})`,
          reference,
          customerCode,
          status: "completed",
          method: "dva_transfer",
          paymentMethod: "bank_transfer",
          currency: "NGN",
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log("💰 DVA wallet updated:", {
          userId,
          customerCode,
          previousBalance: currentBalance,
          creditAmount: amount,
          newBalance
        });

        // Create Firestore notification for instant SweetAlert
        const notificationRef = firestore.collection("notifications").doc();
        transaction.set(notificationRef, {
          uid: userId,
          title: "Bank Transfer Received 💰",
          message: `₦${amount.toLocaleString()} added via bank transfer`,
          type: "wallet_credit_dva",
          read: false,
          amount: amount,
          reference: reference,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      // Send notifications to user (FCM + Email)
      try {
        const userData = userDoc.data();
        const fcmToken = userData.fcmToken;
        const userEmail = userData.email;
        const userName = userData.name || userData.displayName;
        
        // Send FCM notification
        if (fcmToken) {
          const messaging = admin.messaging();
          await messaging.send({
            token: fcmToken,
            notification: {
              title: "💰 Bank Transfer Received!",
              body: `₦${amount.toLocaleString()} has been added to your wallet`
            },
            data: {
              type: "dva_payment_received",
              amount: amount.toString(),
              reference,
              accountNumber: paymentData.dedicated_account?.account_number || "",
              timestamp: Date.now().toString()
            },
            android: {
              priority: "high",
              notification: {
                sound: "default",
                channelId: "payments"
              }
            },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                  badge: 1
                }
              }
            }
          });
          console.log(`📱 DVA FCM notification sent to ${userId}`);
        }
        
        // Send email notification
        if (userEmail) {
          const emailResult = await sendWalletCreditEmail({
            to: userEmail,
            userName: userName,
            amount: amount,
            reference: reference,
            paymentMethod: 'bank_transfer'
          });
          
          if (emailResult.success) {
            console.log(`📧 DVA email notification sent to ${userEmail} (${emailResult.messageId})`);
          } else {
            console.warn(`⚠️ DVA email failed to ${userEmail}:`, emailResult.error);
          }
        } else {
          console.warn("⚠️ No email address found for DVA user:", userId);
        }
      } catch (notifError) {
        console.warn("⚠️ Failed to send DVA notifications:", notifError.message);
      }
      
      console.log("✅ DVA payment processed successfully");
      return res.status(200).json({ 
        success: true, 
        message: "DVA payment processed",
        reference,
        userId
      });
    }

    return res.status(200).send("Event received");

  } catch (error) {
    console.error("💥 Webhook error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
});

/**
 * 🔄 BACKFILL PAST PAYMENTS
 * 
 * Manually verifies and credits past Paystack payments that weren't processed
 * 
 * Usage: Call from frontend or Firebase console
 * Parameters:
 * - reference: Payment reference to backfill
 * - userId: User ID (optional - will be fetched from Paystack if not provided)
 * 
 * Example:
 * const backfill = httpsCallable(functions, 'backfillPayment');
 * await backfill({ reference: 'ref_123abc' });
 */
exports.backfillPayment = functions.https.onCall(async (data, context) => {
  try {
    const { reference, userId } = data;
    
    if (!reference) {
      throw new functions.https.HttpsError('invalid-argument', 'Payment reference required');
    }

    console.log('🔄 Backfilling payment:', reference);

    // Get Paystack secret key
    const secret = functions.config().paystack?.secret;
    if (!secret) {
      throw new functions.https.HttpsError('failed-precondition', 'Paystack secret not configured');
    }

    // Import node-fetch dynamically
    const fetch = (await import('node-fetch')).default;

    // Verify payment with Paystack API
    console.log('📡 Verifying payment with Paystack...');
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json'
      }
    });

    const verifyData = await verifyResponse.json();
    
    if (!verifyData.status) {
      console.error("❌ Payment verification failed:", verifyData.message);
      throw new functions.https.HttpsError('not-found', 
        `Payment not found: ${verifyData.message}`);
    }

    const paymentData = verifyData.data;
    
    // Check if payment was successful
    if (paymentData.status !== 'success') {
      throw new functions.https.HttpsError('failed-precondition', 
        `Payment status is ${paymentData.status}, not successful`);
    }

    const amount = paymentData.amount / 100; // Convert kobo to naira
    const email = paymentData.customer?.email;
    const metadata = paymentData.metadata || {};
    
    // Get userId from parameter, metadata, or email lookup
    let uid = userId || metadata.userId || metadata.uid || metadata["User ID"];
    
    if (!uid && email) {
      console.log('🔍 Looking up user by email:', email);
      const userSnapshot = await firestore.collection("users").where("email", "==", email).limit(1).get();
      if (!userSnapshot.empty) {
        uid = userSnapshot.docs[0].id;
        console.log('✅ User found:', uid);
      }
    }

    if (!uid) {
      throw new functions.https.HttpsError('not-found', 
        `No user found for email: ${email}`);
    }

    // Check if already processed
    const existingTxRef = firestore.collection("webhook_transactions").doc(reference);
    const existingTx = await existingTxRef.get();

    if (existingTx.exists) {
      console.log('⚠️ Payment already processed');
      return {
        success: false,
        message: 'Payment already processed',
        reference,
        processedAt: existingTx.data().processedAt
      };
    }

    // Process payment
    console.log('💳 Processing backfill payment:', {
      reference,
      amount,
      uid,
      email
    });

    await firestore.runTransaction(async (transaction) => {
      // Read wallet first
      const walletRef = firestore.collection("wallets").doc(uid);
      const walletDoc = await transaction.get(walletRef);

      // All writes after reads
      let currentBalance = 0;
      if (walletDoc.exists) {
        currentBalance = walletDoc.data().balance || 0;
      }
      const newBalance = currentBalance + amount;

      // Mark as processed
      transaction.set(existingTxRef, {
        reference,
        userId: uid,
        amount,
        email,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        backfilled: true,
        backfilledBy: context.auth?.uid || 'manual'
      });

      // Update/create wallet
      if (walletDoc.exists) {
        transaction.update(walletRef, {
          balance: newBalance,
          lastTopupAmount: amount,
          lastTopupReference: reference,
          lastTopupAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        transaction.set(walletRef, {
          userId: uid,
          balance: newBalance,
          lastTopupAmount: amount,
          lastTopupReference: reference,
          lastTopupAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // Log transaction in wallet subcollection
      const transactionRef = firestore.collection("wallets").doc(uid).collection("transactions").doc();
      transaction.set(transactionRef, {
        type: "credit",
        category: "topup",
        amount,
        balance: newBalance,
        description: `Backfilled payment - ${paymentData.channel === 'dedicated_nuban' ? 'Bank transfer' : 'Card payment'}`,
        reference,
        status: "completed",
        method: paymentData.channel === 'dedicated_nuban' ? 'dva_transfer' : 'paystack',
        paymentMethod: paymentData.channel === 'dedicated_nuban' ? 'bank_transfer' : 'card',
        currency: "NGN",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Also log in top-level for admin tracking
      const adminTransactionRef = firestore.collection("transactions").doc();
      transaction.set(adminTransactionRef, {
        userId: uid,
        type: "credit",
        amount,
        description: `Backfilled payment - ${paymentData.channel === 'dedicated_nuban' ? 'DVA' : 'Card'}`,
        reference,
        email,
        status: "success",
        source: paymentData.channel === 'dedicated_nuban' ? 'Paystack DVA' : 'Paystack Card',
        method: "paystack",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        metadata: {
          backfilled: true,
          channel: paymentData.channel,
          paidAt: paymentData.paid_at
        }
      });

      console.log('💰 Wallet backfilled:', {
        uid,
        previousBalance: currentBalance,
        creditAmount: amount,
        newBalance
      });
    });

    console.log('✅ Payment backfilled successfully');
    
    return {
      success: true,
      message: 'Payment backfilled successfully',
      reference,
      amount,
      userId: uid,
      email
    };

  } catch (error) {
    console.error('❌ Backfill error:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 
      `Backfill failed: ${error.message}`);
  }
});

/**
 * AUTO-SYNC PAYMENTS
 * 
 * Automatically checks for and credits uncredited Paystack payments
 * Triggered when user opens wallet/profile
 */
exports.autoSyncPayments = functions.https.onCall(async (data, context) => {
  try {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    console.log('🔄 Auto-syncing payments for user:', userId);

    // Get user email
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userEmail = userDoc.data().email;
    if (!userEmail) {
      throw new functions.https.HttpsError('failed-precondition', 'User email not found');
    }

    // Get Paystack secret
    const secret = functions.config().paystack?.secret;
    if (!secret) {
      console.warn('⚠️ Paystack secret not configured');
      return { success: false, message: 'Payment sync not configured' };
    }

    const fetch = (await import('node-fetch')).default;

    // Fetch recent transactions from Paystack for this email
    console.log('📡 Fetching Paystack transactions for:', userEmail);
    const response = await fetch(`https://api.paystack.co/transaction?customer=${encodeURIComponent(userEmail)}&status=success&perPage=50`, {
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    if (!result.status || !result.data) {
      console.warn('⚠️ No transactions found for user');
      return { success: true, creditedCount: 0, message: 'No pending payments' };
    }

    const transactions = result.data;
    console.log(`📊 Found ${transactions.length} successful transactions`);

    let creditedCount = 0;
    const creditedPayments = [];

    // Process each transaction
    for (const txn of transactions) {
      const reference = txn.reference;

      if (txn.metadata?.paymentType === 'service_payment') {
        console.log(`⏭️ Skipping delivery payment: ${reference}`);
        continue;
      }
      
      // Check if already processed
      const webhookDoc = await admin.firestore()
        .collection('webhook_transactions')
        .doc(reference)
        .get();

      if (webhookDoc.exists) {
        console.log(`⏭️ Skipping already processed: ${reference}`);
        continue;
      }

      // Check if it's a DVA payment (dedicated account)
      const isDVA = txn.channel === 'dedicated_nuban';
      const amount = txn.amount / 100;

      console.log(`💰 Crediting uncredited payment: ${reference} - ₦${amount}`);

      // Credit the payment
      await admin.firestore().runTransaction(async (transaction) => {
        const walletRef = admin.firestore().collection('wallets').doc(userId);
        const walletDoc = await transaction.get(walletRef);

        const currentBalance = walletDoc.exists ? (walletDoc.data().balance || 0) : 0;
        const newBalance = currentBalance + amount;

        // Update/create wallet
        transaction.set(walletRef, {
          balance: newBalance,
          userId,
          lastTopupAmount: amount,
          lastTopupReference: reference,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(walletDoc.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() })
        }, { merge: true });

        // Log transaction
        transaction.set(admin.firestore().collection('transactions').doc(), {
          userId,
          type: 'credit',
          amount,
          source: isDVA ? 'paystack_dva' : 'paystack',
          status: 'completed',
          reference,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          autoSynced: true,
          metadata: {
            channel: txn.channel,
            paidAt: txn.paid_at
          }
        });

        // Mark as processed
        transaction.set(admin.firestore().collection('webhook_transactions').doc(reference), {
          userId,
          reference,
          amount,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          autoSynced: true
        });

        console.log(`✅ Credited ₦${amount} to user ${userId}`);
      });

      creditedCount++;
      creditedPayments.push({ reference, amount });
    }

    console.log(`✅ Auto-sync complete: ${creditedCount} payments credited`);

    return {
      success: true,
      creditedCount,
      payments: creditedPayments,
      message: creditedCount > 0 
        ? `${creditedCount} payment(s) credited successfully` 
        : 'All payments already synced'
    };

  } catch (error) {
    console.error('❌ Auto-sync error:', error);
    throw new functions.https.HttpsError('internal', `Auto-sync failed: ${error.message}`);
  }
});

/**
 * 🔐 Go7 Backend Fare Verification & Transaction Recording
 * Comprehensive backend functions for fare validation and order management
 */

// Import the CommonJS version of fare calculator
const fareCalculator = require('./fareCalculator');

/**
 * 🧮 Verify Fare Calculation
 * Cloud Function to validate fare calculations and prevent tampering
 */
exports.verifyFare = functions.https.onCall(async (data, context) => {
  try {
    // Authenticate user
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to verify fare'
      );
    }

    const { 
      distanceKm, 
      durationMin, 
      clientFare, 
      pickupLocation, 
      deliveryLocation,
      orderId 
    } = data;

    // Validate input data
    if (!distanceKm || !durationMin || !clientFare) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fare calculation parameters'
      );
    }

    if (distanceKm <= 0 || durationMin <= 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Distance and duration must be positive values'
      );
    }

    if (distanceKm > 200) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Distance exceeds maximum allowed (200km)'
      );
    }

    // Calculate server-side fare
    const serverFare = fareCalculator.calculateFare(distanceKm, durationMin);
    const fareBreakdown = fareCalculator.getFareBreakdown(distanceKm, durationMin);
    
    // Allow for small rounding differences (±₦5)
    const fareDifference = Math.abs(serverFare - clientFare);
    const isValidFare = fareDifference <= 5;

    // Log fare verification attempt
    const verificationId = `verify_${Date.now()}_${context.auth.uid}`;
    
    await firestore.collection('fareVerifications').doc(verificationId).set({
      userId: context.auth.uid,
      orderId: orderId || null,
      clientFare,
      serverFare,
      distanceKm,
      durationMin,
      fareDifference,
      isValid: isValidFare,
      pickupLocation,
      deliveryLocation,
      fareBreakdown,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        userAgent: context.rawRequest?.headers?.['user-agent'],
        ip: context.rawRequest?.ip
      }
    });

    // Alert if fare tampering detected
    if (!isValidFare) {
      console.warn(`🚨 Fare tampering detected for user ${context.auth.uid}:`, {
        orderId,
        clientFare,
        serverFare,
        difference: fareDifference,
        distanceKm,
        durationMin
      });

      // Send alert email to admin
      try {
        await sendWalletCreditEmail({
          email: 'admin@go7.ng',
          subject: '🚨 Go7 Fare Tampering Alert',
          amount: fareDifference,
          reference: verificationId,
          customMessage: `Fare tampering detected for user ${context.auth.uid}. Client: ${fareCalculator.formatFare(clientFare)}, Server: ${fareCalculator.formatFare(serverFare)}`
        });
      } catch (emailError) {
        console.error('Failed to send fare tampering alert email:', emailError);
      }

      throw new functions.https.HttpsError(
        'failed-precondition',
        `Fare calculation mismatch. Expected: ${fareCalculator.formatFare(serverFare)}, Received: ${fareCalculator.formatFare(clientFare)}`
      );
    }

    return {
      isValid: true,
      verifiedFare: serverFare,
      fareBreakdown,
      verificationId,
      message: 'Fare verified successfully'
    };

  } catch (error) {
    console.error('Error in verifyFare function:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to verify fare calculation'
    );
  }
});

/**
 * 🚚 Record Delivery Transaction
 * Cloud Function to securely record delivery transactions
 */
exports.recordDeliveryTransaction = functions.https.onCall(async (data, context) => {
  try {
    // Authenticate user
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to record delivery transaction'
      );
    }

    const {
      orderId,
      pickupLocation,
      deliveryLocation,
      distanceKm,
      durationMin,
      fare,
      paymentMethod,
      verificationId,
      specialInstructions
    } = data;

    // Validate required fields
    if (!orderId || !pickupLocation || !deliveryLocation || !fare) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required delivery transaction fields'
      );
    }

    // Verify fare if verificationId provided
    if (verificationId) {
      const verificationDoc = await firestore.collection('fareVerifications').doc(verificationId).get();
      
      if (!verificationDoc.exists || !verificationDoc.data().isValid) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Invalid or expired fare verification'
        );
      }
    }

    const userId = context.auth.uid;
    const transactionId = `delivery_${Date.now()}_${userId}`;

    // Create delivery transaction record
    const deliveryTransaction = {
      id: transactionId,
      userId,
      orderId,
      type: 'delivery',
      status: 'confirmed',
      
      // Location details
      pickupLocation: {
        address: pickupLocation.address,
        coordinates: pickupLocation.coordinates || null,
        placeName: pickupLocation.placeName || null
      },
      deliveryLocation: {
        address: deliveryLocation.address,
        coordinates: deliveryLocation.coordinates || null,
        placeName: deliveryLocation.placeName || null
      },
      
      // Fare details
      amount: fare,
      distanceKm: distanceKm || 0,
      durationMin: durationMin || 0,
      finalFare: fare,
      
      // Payment details
      paymentMethod: paymentMethod || 'wallet',
      paymentStatus: 'pending',
      
      // Additional details
      description: `Delivery from ${pickupLocation.address} to ${deliveryLocation.address}`,
      specialInstructions: specialInstructions || null,
      verificationId: verificationId || null,
      
      // Timestamps
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      
      // Metadata
      metadata: {
        platform: 'go7-app',
        version: '1.0.0',
        userAgent: context.rawRequest?.headers?.['user-agent'],
        ip: context.rawRequest?.ip
      }
    };

    // Save transaction
    await firestore.collection('transactions').doc(transactionId).set(deliveryTransaction);

    // Update user statistics
    await updateUserStats(userId, {
      totalDeliveries: admin.firestore.FieldValue.increment(1),
      totalSpent: admin.firestore.FieldValue.increment(fare),
      lastDeliveryAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send confirmation email
    try {
      const userDoc = await firestore.collection('users').doc(userId).get();
      const userEmail = userDoc.data()?.email || context.auth.token.email;

      if (userEmail) {
        await sendWalletDebitEmail({
          email: userEmail,
          amount: fare,
          reference: transactionId,
          description: `Delivery from ${pickupLocation.address} to ${deliveryLocation.address}`,
          customMessage: '🚚 Your Go7 delivery has been confirmed!'
        });
      }
    } catch (emailError) {
      console.error('Failed to send delivery confirmation email:', emailError);
      // Don't fail the transaction if email fails
    }

    return {
      success: true,
      transactionId,
      orderId,
      fare: fareCalculator.formatFare(fare),
      status: 'confirmed',
      message: 'Delivery transaction recorded successfully'
    };

  } catch (error) {
    console.error('Error in recordDeliveryTransaction function:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to record delivery transaction'
    );
  }
});

/**
 * 🛍️ Record Order Transaction
 * Cloud Function to securely record order transactions
 */
exports.recordOrderTransaction = functions.https.onCall(async (data, context) => {
  try {
    // Authenticate user
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to record order transaction'
      );
    }

    const {
      orderId,
      restaurantId,
      restaurantName,
      items,
      totalAmount,
      deliveryAddress,
      paymentMethod,
      specialInstructions,
      estimatedDeliveryTime
    } = data;

    // Validate required fields
    if (!orderId || !restaurantId || !items || !totalAmount || !deliveryAddress) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required order transaction fields'
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Order must contain at least one item'
      );
    }

    const userId = context.auth.uid;
    const transactionId = `order_${Date.now()}_${userId}`;

    // Validate items and calculate total
    let calculatedTotal = 0;
    const validatedItems = items.map(item => {
      if (!item.name || !item.price || !item.quantity) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid item data in order'
        );
      }
      
      const itemTotal = item.price * item.quantity;
      calculatedTotal += itemTotal;
      
      return {
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: itemTotal,
        description: item.description || null,
        options: item.options || []
      };
    });

    // Allow for small rounding differences in total
    const totalDifference = Math.abs(calculatedTotal - totalAmount);
    if (totalDifference > 5) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Order total mismatch. Expected: ${fareCalculator.formatFare(calculatedTotal)}, Received: ${fareCalculator.formatFare(totalAmount)}`
      );
    }

    // Create order transaction record
    const orderTransaction = {
      id: transactionId,
      userId,
      orderId,
      type: 'order',
      status: 'confirmed',
      
      // Restaurant details
      restaurantId,
      restaurantName: restaurantName || 'Unknown Restaurant',
      
      // Order details
      items: validatedItems,
      amount: totalAmount,
      finalAmount: totalAmount,
      
      // Delivery details
      deliveryLocation: {
        address: deliveryAddress.address,
        coordinates: deliveryAddress.coordinates || null,
        placeName: deliveryAddress.placeName || null
      },
      
      // Payment details
      paymentMethod: paymentMethod || 'wallet',
      paymentStatus: 'pending',
      
      // Additional details
      description: `Order from ${restaurantName || 'Restaurant'} - ${items.length} item(s)`,
      specialInstructions: specialInstructions || null,
      estimatedDeliveryTime: estimatedDeliveryTime || null,
      
      // Timestamps
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      
      // Metadata
      metadata: {
        platform: 'go7-app',
        version: '1.0.0',
        userAgent: context.rawRequest?.headers?.['user-agent'],
        ip: context.rawRequest?.ip
      }
    };

    // Save transaction
    await firestore.collection('transactions').doc(transactionId).set(orderTransaction);

    // Update user statistics
    await updateUserStats(userId, {
      totalOrders: admin.firestore.FieldValue.increment(1),
      totalSpent: admin.firestore.FieldValue.increment(totalAmount),
      lastOrderAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send confirmation email
    try {
      const userDoc = await firestore.collection('users').doc(userId).get();
      const userEmail = userDoc.data()?.email || context.auth.token.email;

      if (userEmail) {
        const itemsList = validatedItems.map(item => `${item.name} × ${item.quantity}`).join(', ');
        
        await sendWalletDebitEmail({
          email: userEmail,
          amount: totalAmount,
          reference: transactionId,
          description: `Order from ${restaurantName} - ${itemsList}`,
          customMessage: '🛍️ Your Go7 order has been confirmed and is being prepared!'
        });
      }
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError);
      // Don't fail the transaction if email fails
    }

    return {
      success: true,
      transactionId,
      orderId,
      totalAmount: fareCalculator.formatFare(totalAmount),
      itemCount: items.length,
      status: 'confirmed',
      message: 'Order transaction recorded successfully'
    };

  } catch (error) {
    console.error('Error in recordOrderTransaction function:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to record order transaction'
    );
  }
});

/**
 * 📊 Update User Statistics
 * Helper function to update user statistics
 */
async function updateUserStats(userId, updates) {
  try {
    const userStatsRef = firestore.collection('userStats').doc(userId);
    
    // Create user stats document if it doesn't exist
    await userStatsRef.set({
      userId,
      totalDeliveries: 0,
      totalOrders: 0,
      totalSpent: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...updates
    }, { merge: true });
    
  } catch (error) {
    console.error('Error updating user stats:', error);
    // Don't throw error to avoid failing main transaction
  }
}

// 🎯 FARE VALIDATION FUNCTION - Detects inconsistent fare changes
exports.validateFare = functions.firestore
  .document('deliveries/{deliveryId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const deliveryId = context.params.deliveryId;

    // Skip if no fare fields exist
    if (!before.fare || !after.fare) {
      return null;
    }

    // Check for fare inconsistencies (more than ₦200 difference)
    const fareDifference = Math.abs(before.fare - after.fare);
    const FARE_THRESHOLD = 200;

    if (fareDifference > FARE_THRESHOLD) {
      console.warn(`🚨 FARE MISMATCH DETECTED - Delivery: ${deliveryId}`);
      console.warn(`Old fare: ₦${before.fare}, New fare: ₦${after.fare}, Difference: ₦${fareDifference}`);

      // Log to alerts collection for monitoring
      await admin.firestore().collection('alerts').add({
        type: 'FARE_MISMATCH',
        deliveryId: deliveryId,
        oldFare: before.fare,
        newFare: after.fare,
        difference: fareDifference,
        customer: after.customer?.uid || 'unknown',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        message: `Fare changed from ₦${before.fare} to ₦${after.fare} (₦${fareDifference} difference)`,
        severity: fareDifference > 1000 ? 'HIGH' : 'MEDIUM'
      });

      // Also check for other fare field inconsistencies
      const fareFields = ['finalFare', 'estimatedFare', 'totalKobo'];
      for (const field of fareFields) {
        if (before[field] && after[field]) {
          const fieldDifference = Math.abs(before[field] - after[field]);
          if (field === 'totalKobo') {
            // totalKobo should be fare * 100
            if (fieldDifference > FARE_THRESHOLD * 100) {
              console.warn(`🚨 ${field} mismatch: ${before[field]} → ${after[field]}`);
            }
          } else if (fieldDifference > FARE_THRESHOLD) {
            console.warn(`🚨 ${field} mismatch: ${before[field]} → ${after[field]}`);
          }
        }
      }
    }

    return null;
  });

// 🎯 BOOKING FARE VALIDATION - Also monitor bookings collection
exports.validateBookingFare = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const bookingId = context.params.bookingId;

    // Skip if no fare fields exist
    if (!before.fare || !after.fare) {
      return null;
    }

    const fareDifference = Math.abs(before.fare - after.fare);
    const FARE_THRESHOLD = 200;

    if (fareDifference > FARE_THRESHOLD) {
      console.warn(`🚨 BOOKING FARE MISMATCH - ID: ${bookingId}`);
      
      // Log to alerts collection
      await admin.firestore().collection('alerts').add({
        type: 'BOOKING_FARE_MISMATCH',
        bookingId: bookingId,
        oldFare: before.fare,
        newFare: after.fare,
        difference: fareDifference,
        customer: after.customer?.uid || 'unknown',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        message: `Booking fare changed from ₦${before.fare} to ₦${after.fare}`,
        severity: fareDifference > 1000 ? 'HIGH' : 'MEDIUM'
      });
    }

    return null;
  });

// 🔧 FARE BACKFILL TRIGGER - Manual trigger for admin
exports.triggerFareBackfill = functions.https.onCall(async (data, context) => {
  // Only allow authenticated users
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { runBackfill } = require('./backfill-fares');
    await runBackfill();
    
    return {
      success: true,
      message: 'Fare backfill completed successfully',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Backfill error:', error);
    throw new functions.https.HttpsError('internal', `Backfill failed: ${error.message}`);
  }
});

// exportReplay disabled (puppeteer/ffmpeg too large for Cloud Functions)
// const exportReplayFunctions = require('./exportReplay');

// Export live delivery functions
exports.onRiderLocationUpdate = onRiderLocationUpdate;
exports.onDeliveryStatusChange = onDeliveryStatusChange;
exports.updateDeliveryETA = updateDeliveryETA;

// exports.exportReplay = exportReplayFunctions.exportReplay;
// exports.batchExportReplays = exportReplayFunctions.batchExportReplays;

// ====================================================================
// 🏪 VENDOR ONBOARDING EMAIL
// ====================================================================
/**
 * Send welcome email when a new vendor registers
 */
exports.sendVendorOnboardingEmail = functions.firestore
  .document('vendors/{vendorId}')
  .onCreate(async (snap, context) => {
    const vendor = snap.data();
    const vendorId = context.params.vendorId;

    console.log(`🏪 New vendor registered: ${vendor.name}`);

    try {
      const resend = getResend();
      if (resend) {
      await resend.emails.send({
        from: 'Go7 Team <vendors@go7.ng>',
        to: vendor.email,
        subject: '🎉 Welcome to GO7 - Your Vendor Account is Ready!',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
            <div style="background:linear-gradient(135deg,#E30613,#8B0000);color:white;padding:40px 30px;text-align:center">
              <h1 style="margin:0;font-size:32px">🏪 Welcome to GO7!</h1>
              <p style="margin:10px 0 0;font-size:18px;opacity:0.9">Your vendor account is now active</p>
            </div>
            
            <div style="padding:30px;background:#f9f9f9">
              <p style="font-size:16px;color:#333">Hi <strong>${vendor.name}</strong>,</p>
              
              <p style="font-size:16px;color:#333;line-height:1.6">
                Congratulations! Your vendor account has been successfully created. You're now part of the GO7 delivery platform.
              </p>

              <div style="background:white;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #E30613">
                <h3 style="margin:0 0 15px;color:#E30613">📋 Your Account Details</h3>
                <p style="margin:5px 0"><strong>Business Name:</strong> ${vendor.name}</p>
                <p style="margin:5px 0"><strong>Email:</strong> ${vendor.email}</p>
                <p style="margin:5px 0"><strong>Phone:</strong> ${vendor.phone}</p>
                <p style="margin:5px 0"><strong>Business Type:</strong> ${vendor.type}</p>
                <p style="margin:5px 0"><strong>Address:</strong> ${vendor.address}</p>
              </div>

              <div style="background:#FFF9E6;padding:20px;border-radius:8px;margin:20px 0;border:1px solid #FFD700">
                <h3 style="margin:0 0 15px;color:#E30613">🚀 Next Steps</h3>
                <ol style="margin:0;padding-left:20px;color:#333">
                  <li style="margin:10px 0">Login to your vendor dashboard</li>
                  <li style="margin:10px 0">Set your business hours and availability</li>
                  <li style="margin:10px 0">Add your products/menu items</li>
                  <li style="margin:10px 0">Start accepting orders!</li>
                </ol>
              </div>

              <div style="text-align:center;margin:30px 0">
                <a href="https://go7.ng/vendor/login" 
                   style="background:#E30613;color:white;padding:15px 40px;text-decoration:none;border-radius:8px;display:inline-block;font-size:16px;font-weight:bold">
                  Login to Dashboard
                </a>
              </div>

              <div style="background:white;padding:20px;border-radius:8px;margin:20px 0">
                <h3 style="margin:0 0 15px;color:#E30613">💡 Quick Tips</h3>
                <ul style="margin:0;padding-left:20px;color:#333">
                  <li style="margin:10px 0">Keep your business online during operating hours</li>
                  <li style="margin:10px 0">Respond to orders quickly for better ratings</li>
                  <li style="margin:10px 0">Update your menu regularly</li>
                  <li style="margin:10px 0">Use the temporary closure feature when needed</li>
                </ul>
              </div>

              <p style="font-size:14px;color:#666;line-height:1.6;margin-top:30px">
                Need help? Contact our vendor support team at <a href="mailto:vendors@go7.ng" style="color:#E30613">vendors@go7.ng</a>
              </p>

              <p style="font-size:14px;color:#666;margin-top:20px">
                Best regards,<br>
                <strong>The GO7 Team</strong>
              </p>
            </div>

            <div style="background:#333;color:#fff;padding:20px;text-align:center;font-size:12px">
              <p style="margin:0">© 2025 GO7 Delivery. All rights reserved.</p>
              <p style="margin:10px 0 0">Fast & Reliable Delivery Service in Abeokuta</p>
            </div>
          </div>
        `
      });
      }

      console.log(`✅ Onboarding email sent to ${vendor.email}`);

      // Log the notification
      await admin.firestore().collection('notifications').add({
        vendorId,
        type: 'vendor_onboarding',
        email: vendor.email,
        businessName: vendor.name,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      console.error('❌ Error sending vendor onboarding email:', error);
    }
  });

// ====================================================================
// 🔧 VENDOR ACCOUNT CLEANUP FUNCTIONS
// ====================================================================

/**
 * Clean up orphaned auth accounts (auth user exists but no vendor document)
 * This can be called manually or run as a scheduled function
 */
exports.cleanupOrphanedVendorAccounts = functions.https.onCall(async (data, context) => {
  try {
    console.log('🧹 Starting orphaned vendor account cleanup...');
    
    const cleanupResults = {
      checked: 0,
      orphaned: 0,
      deleted: 0,
      errors: []
    };

    // Get all auth users
    const listUsersResult = await admin.auth().listUsers(1000);
    cleanupResults.checked = listUsersResult.users.length;
    
    console.log(`📊 Found ${cleanupResults.checked} total auth users`);

    // Check each user to see if they have a vendor document
    for (const userRecord of listUsersResult.users) {
      try {
        const vendorDoc = await admin.firestore()
          .collection('vendors')
          .doc(userRecord.uid)
          .get();

        // If no vendor document exists, this is an orphaned account
        if (!vendorDoc.exists()) {
          console.log(`🔍 Orphaned account found: ${userRecord.email} (${userRecord.uid})`);
          cleanupResults.orphaned++;
          
          // Only delete if requested
          if (data.deleteOrphaned === true) {
            await admin.auth().deleteUser(userRecord.uid);
            console.log(`✅ Deleted orphaned account: ${userRecord.email}`);
            cleanupResults.deleted++;
          }
        }
      } catch (error) {
        console.error(`❌ Error processing user ${userRecord.uid}:`, error);
        cleanupResults.errors.push({
          uid: userRecord.uid,
          email: userRecord.email,
          error: error.message
        });
      }
    }

    console.log('✅ Cleanup complete:', cleanupResults);
    return cleanupResults;
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Check if a specific email has an orphaned account and fix it
 */
exports.fixVendorAccount = functions.https.onCall(async (data, context) => {
  const { email } = data;
  
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required');
  }

  try {
    console.log(`🔍 Checking account for email: ${email}`);

    // Get user by email
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return {
          status: 'no_auth_account',
          message: 'No Firebase Auth account found. You can register with this email.'
        };
      }
      throw error;
    }

    // Check if vendor document exists
    const vendorDoc = await admin.firestore()
      .collection('vendors')
      .doc(userRecord.uid)
      .get();

    if (vendorDoc.exists()) {
      return {
        status: 'complete',
        message: 'Account is complete. You can log in.',
        vendorId: userRecord.uid
      };
    }

    // Orphaned account found - delete it
    console.log(`🗑️ Deleting orphaned auth account for: ${email}`);
    await admin.auth().deleteUser(userRecord.uid);

    return {
      status: 'fixed',
      message: 'Orphaned account deleted. You can now register again.',
      action: 'Account cleaned up successfully'
    };

  } catch (error) {
    console.error('❌ Error fixing vendor account:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Scheduled function to run daily cleanup of orphaned accounts
 * Runs every day at 2 AM
 */
exports.scheduledVendorCleanup = functions.pubsub
  .schedule('0 2 * * *')
  .timeZone('Africa/Lagos')
  .onRun(async (context) => {
    console.log('🕐 Running scheduled vendor cleanup...');
    
    try {
      const cleanupResults = {
        checked: 0,
        orphaned: 0,
        deleted: 0
      };

      const listUsersResult = await admin.auth().listUsers(1000);
      cleanupResults.checked = listUsersResult.users.length;

      for (const userRecord of listUsersResult.users) {
        const vendorDoc = await admin.firestore()
          .collection('vendors')
          .doc(userRecord.uid)
          .get();

        if (!vendorDoc.exists()) {
          // Check if account is older than 24 hours before deleting
          const accountAge = Date.now() - new Date(userRecord.metadata.creationTime).getTime();
          const twentyFourHours = 24 * 60 * 60 * 1000;

          if (accountAge > twentyFourHours) {
            console.log(`🗑️ Auto-deleting old orphaned account: ${userRecord.email}`);
            await admin.auth().deleteUser(userRecord.uid);
            cleanupResults.deleted++;
          } else {
            cleanupResults.orphaned++;
          }
        }
      }

      console.log('✅ Scheduled cleanup complete:', cleanupResults);
      return null;
    } catch (error) {
      console.error('❌ Scheduled cleanup failed:', error);
      return null;
    }
  });

// ═══════════════════════════════════════════════════════════════
// 🧹 LEGACY PRODUCTS CLEANUP
// ═══════════════════════════════════════════════════════════════

/**
 * Scheduled function to clean up legacy /products collection
 * Runs daily to remove any orphaned product documents
 */
exports.cleanLegacyProducts = functions.pubsub
  .schedule('0 3 * * *') // 3 AM daily
  .timeZone('Africa/Lagos')
  .onRun(async (context) => {
    try {
      console.log('🧹 Starting legacy products cleanup...');
      
      const productsSnapshot = await admin.firestore()
        .collection('products')
        .get();
      
      if (productsSnapshot.empty) {
        console.log('✅ No legacy products found');
        return null;
      }
      
      console.log(`Found ${productsSnapshot.size} legacy products to delete`);
      
      const batch = admin.firestore().batch();
      let deleteCount = 0;
      
      productsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        deleteCount++;
      });
      
      await batch.commit();
      
      console.log(`✅ Deleted ${deleteCount} legacy products`);
      return null;
    } catch (error) {
      console.error('❌ Legacy products cleanup failed:', error);
      return null;
    }
  });

// ═══════════════════════════════════════════════════════════════
// 🔔 ORDER STATUS NOTIFICATIONS — Nov 2025
// ═══════════════════════════════════════════════════════════════

/**
 * Trigger: Firestore document update in orders/{orderId}
 * Sends FCM push notification when order status changes
 */
exports.sendOrderStatusNotification = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger if status changed (support both status + orderStatus fields)
    const beforeStatus = before.status || before.orderStatus;
    const afterStatus = after.status || after.orderStatus;
    if (beforeStatus === afterStatus) return null;

    const { orderId } = context.params;
    const { userId, total } = after;
    const status = afterStatus;

    console.log(`🔔 Status change detected for ${orderId}: ${beforeStatus} → ${status}`);

    if (!userId) {
      console.log('❌ No userId on order for notification');
      return null;
    }

    // Order-type aware copy: food orders get restaurant wording, Book Delivery
    // parcels / fuel / other deliveries get neutral delivery wording.
    const orderTypeUpper = String(after.orderType || '').toUpperCase();
    const hasLineItems = Array.isArray(after.items) && after.items.length > 0;
    const isFoodOrder = ['FOOD', 'MARKET', 'PHARMACY'].includes(orderTypeUpper) || hasLineItems;

    // Define custom messages based on status
    let title = "Order Update";
    let body = "";
    let icon = "📦";
    const statusKey = String(status || '');

    // Parcel statuses that should never leak raw internal names to customers.
    const parcelStatusCopy = {
      assigned: ["Rider assigned", "A rider has been assigned to your delivery"],
      accepted: ["Rider assigned", "A rider has been assigned to your delivery"],
      enroute: ["Package on the way", "Your delivery is on the way 🚴 — track your rider live in the app"],
      enroute_pickup: ["Rider heading to pickup", "Your rider is heading to the pickup point"],
      enroute_dropoff: ["Package on the way", "Your delivery is on the way 🚴 — track your rider live in the app"],
      at_pickup: ["Rider at pickup", "Your rider has arrived at the pickup point"],
      picked_up: ["Package picked up", "Your package has been picked up and is heading to you"],
      at_delivery: ["Rider nearby", "Your rider is nearby — have your delivery PIN ready"],
      arrived_dropoff: ["Rider nearby", "Your rider is nearby — have your delivery PIN ready"],
      nearby: ["Rider nearby", "Your rider is nearby — have your delivery PIN ready"],
      delivered: ["Delivery complete", "Your delivery has been completed ✅ — thank you for using Go7"],
      completed: ["Delivery complete", "Your delivery has been completed ✅ — thank you for using Go7"],
      cancelled: ["Delivery cancelled", "Your delivery has been cancelled. Contact support if you need help."],
    };

    if (!isFoodOrder) {
      const copy = parcelStatusCopy[statusKey.toLowerCase()];
      if (copy) {
        title = copy[0];
        body = copy[1];
      } else {
        title = "Delivery update";
        body = "There's an update on your delivery — open Track for live details";
      }
      icon = "📦";
    } else {
    switch (statusKey) {
      case "Assigned":
      case "assigned":
      case "accepted":
      case "Confirmed":
      case "confirmed":
        title = "Order Accepted";
        body = "Your order has been accepted and is being prepared 🍲";
        icon = "✅";
        break;
      case "En Route":
      case "enroute":
      case "en_route":
      case "on-the-way":
      case "on_the_way":
      case "in_transit":
      case "in-transit":
        title = "Order On The Way";
        body = "Your order is on the way 🚴 — track your rider live in the app";
        icon = "🚴";
        break;
      case "Delivered":
      case "delivered":
      case "completed":
        title = "Order Delivered";
        body = "Your order has been delivered ✅ — enjoy your meal!";
        icon = "🎉";
        break;
      case "Cancelled":
      case "cancelled":
        title = "Order Cancelled";
        body = "Your order has been cancelled. Contact support if you need help.";
        icon = "❌";
        break;
      default:
        body = `Your order status is now ${status}`;
        icon = "📦";
    }
    }

    // Always write in-app inbox (even if push token missing)
    await writeCustomerInboxNotification({
      uid: userId,
      userId,
      title: `${icon} ${title}`,
      message: body,
      type: 'order_status',
      orderId,
      status: statusKey,
    });

    // Get user's FCM token from Firestore
    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log("❌ User not found for push notification");
      return null;
    }

    const fcmToken = userDoc.data().fcmToken;
    if (!fcmToken) {
      console.log(`⚠️ No FCM token for user ${userId} (inbox written)`);
      return null;
    }

    try {
      // Send FCM push notification
      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title: `${icon} ${title}`,
          body,
        },
        data: {
          orderId,
          status: String(statusKey),
          total: String(total || 0),
          click_action: `/smart-tracking/${orderId}`,
        },
        webpush: {
          fcmOptions: {
            link: `/smart-tracking/${orderId}`,
          },
          notification: {
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            requireInteraction: true,
          },
        },
      });

      console.log(`✅ Notification sent to user ${userId}: ${status}`);
      return null;
    } catch (error) {
      console.error(`❌ Failed to send notification to user ${userId}:`, error);
      return null;
    }
  });

/**
 * Trigger: Firestore document creation in orders/{orderId}
 * Sends confirmation when user places an order
 */
exports.notifyNewOrder = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const { orderId } = context.params;
    const { userId, total, items } = order;

    console.log(`🚀 New order created: ${orderId}`);

    const itemCount = items?.length || 0;
    const itemText = itemCount === 1 ? "item" : "items";
    const confirmBody = itemCount > 0
      ? `Your order ${orderId} (${itemCount} ${itemText}, ₦${total?.toLocaleString() || 0}) has been received. We'll keep you updated.`
      : `Your delivery ${orderId} (₦${total?.toLocaleString() || 0}) has been received. We'll keep you updated.`;

    await writeCustomerInboxNotification({
      uid: userId,
      userId,
      title: 'Order received',
      message: confirmBody,
      type: 'order_created',
      orderId,
      status: 'finding_shopper',
    });

    // Get user's FCM token
    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log("❌ User not found");
      return null;
    }

    const fcmToken = userDoc.data().fcmToken;
    if (!fcmToken) {
      console.log(`⚠️ No FCM token for user ${userId}`);
      return null;
    }

    try {
      // Send order confirmation notification
      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title: "🚀 Order Received!",
          body: confirmBody,
        },
        data: {
          orderId,
          status: "Requested",
          total: total?.toString() || "0",
          click_action: `/smart-tracking/${orderId}`,
        },
        webpush: {
          fcmOptions: {
            link: `/smart-tracking/${orderId}`,
          },
          notification: {
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            requireInteraction: true,
          },
        },
      });

      console.log(`✅ New order notification sent for ${orderId}`);
      return null;
    } catch (error) {
      console.error(`❌ Failed to send new order notification:`, error);
      return null;
    }
  });

/**
 * Trigger: When rider is assigned to an order
 * Notifies both customer and rider
 */
exports.notifyRiderAssignment = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const { orderId } = context.params;

    // Only trigger if riderId changed (rider just assigned)
    if (before.riderId === after.riderId) return null;
    if (!after.riderId) return null;

    const { userId, riderId, riderName, total } = after;

    console.log(`🚴 Rider ${riderName} assigned to order ${orderId}`);

    try {
      // Notify customer
      const userRef = admin.firestore().collection("users").doc(userId);
      const userDoc = await userRef.get();
      
      if (userDoc.exists && userDoc.data().fcmToken) {
        await admin.messaging().send({
          token: userDoc.data().fcmToken,
          notification: {
            title: "🚴 Rider Assigned",
            body: `${riderName} has been assigned to deliver your order. Track them live!`,
          },
          data: {
            orderId,
            riderId,
            riderName,
            click_action: `/smart-tracking/${orderId}`,
          },
        });
        console.log(`✅ Customer notified about rider assignment`);
      }

      // Notify rider
      const riderRef = admin.firestore().collection("riders").doc(riderId);
      const riderDoc = await riderRef.get();
      
      if (riderDoc.exists && riderDoc.data().fcmToken) {
        const itemBits = [];
        const orderItems = Array.isArray(after.items) ? after.items : [];
        for (const it of orderItems.slice(0, 3)) {
          const name = it?.name || it?.productName || it?.title;
          if (!name) continue;
          const qty = Number(it.quantity ?? it.qty) || 1;
          itemBits.push(qty > 1 ? `${qty}x ${name}` : name);
        }
        const itemsHint = itemBits.length
          ? ` — ${itemBits.join(', ')}${orderItems.length > 3 ? '…' : ''}`
          : after.vendorName
            ? ` — ${after.vendorName}`
            : '';
        await admin.messaging().send({
          token: riderDoc.data().fcmToken,
          notification: {
            title: "📦 New Delivery Assignment",
            body: `Order ${orderId} (₦${total?.toLocaleString()})${itemsHint}`.slice(0, 180),
          },
          data: {
            orderId,
            total: total?.toString() || "0",
            click_action: `/rider/orders/${orderId}`,
          },
        });
        console.log(`✅ Rider notified about assignment`);
      }

      return null;
    } catch (error) {
      console.error(`❌ Failed to send rider assignment notifications:`, error);
      return null;
    }
  });

// Export addon image processing functions
// exports.generateAddonThumbnail = generateAddonThumbnail;
// exports.cleanupAddonImages = cleanupAddonImages;

// ====================================================================
// 🛍️ VENDOR PRODUCT MIRRORING (vendors/{vendorId}/products -> /products)
// ====================================================================

/**
 * Mirror vendor products to global /products collection
 * Ensures products appear in Explore, Trending, and ForYou feeds
 * Maintains vendor.totalProducts count
 */
exports.mirrorVendorProduct = functions.firestore
  .document('vendors/{vendorId}/products/{productId}')
  .onWrite(async (change, context) => {
    const { vendorId, productId } = context.params;
    const after = change.after.exists ? change.after.data() : null;
    const before = change.before.exists ? change.before.data() : null;

    const globalRef = firestore.collection('products').doc(productId);
    const vendorRef = firestore.collection('vendors').doc(vendorId);

    try {
      if (!after) {
        // Product deleted: remove from global products
        console.log(`🗑️ Deleting product ${productId} from global collection`);
        await globalRef.delete();
        
        // Decrement vendor.totalProducts
        await vendorRef.update({ 
          totalProducts: admin.firestore.FieldValue.increment(-1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Product ${productId} removed and vendor count decremented`);
        return null;
      }

      // Sanitize and validate data
      const sanitized = {
        ...after,
        vendorId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Ensure price is numeric
        price: typeof after.price === 'number' ? after.price : parseFloat(after.price) || 0,
        // Ensure required fields
        available: typeof after.available === 'boolean' ? after.available : true,
        currency: after.currency || 'NGN',
        measurementType: after.measurementType || 'portion',
      };

      // Upsert global product
      console.log(`📦 Mirroring product ${productId} to global collection`);
      await globalRef.set(sanitized, { merge: true });

      // If new product (before didn't exist), increment vendor.totalProducts
      if (!before) {
        console.log(`➕ New product created, incrementing vendor count`);
        await vendorRef.update({ 
          totalProducts: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      console.log(`✅ Product ${productId} successfully mirrored`);
      return null;
    } catch (error) {
      console.error(`❌ Failed to mirror product ${productId}:`, error);
      return null;
    }
  });

/**
 * Mirror vendor product addons to maintain consistency
 * Updates addon count on parent product
 */
exports.mirrorVendorProductAddon = functions.firestore
  .document('vendors/{vendorId}/products/{productId}/addons/{addonId}')
  .onWrite(async (change, context) => {
    const { vendorId, productId, addonId } = context.params;
    const after = change.after.exists ? change.after.data() : null;
    const before = change.before.exists ? change.before.data() : null;

    const vendorProductRef = firestore.collection('vendors').doc(vendorId)
      .collection('products').doc(productId);

    try {
      if (!after && before) {
        // Addon deleted
        console.log(`🗑️ Addon ${addonId} deleted from product ${productId}`);
        await vendorProductRef.update({
          addonCount: admin.firestore.FieldValue.increment(-1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else if (after && !before) {
        // Addon created
        console.log(`➕ Addon ${addonId} added to product ${productId}`);
        await vendorProductRef.update({
          addonCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      console.log(`✅ Addon ${addonId} sync complete`);
      return null;
    } catch (error) {
      console.error(`❌ Failed to sync addon ${addonId}:`, error);
      return null;
    }
  });

// Import and export test vendors creation function
const { createTestVendors } = require('./createTestVendors');
exports.createTestVendors = createTestVendors;

// Import and export cart validation function
const { validateCart } = require('./validateCart');
exports.validateCart = validateCart;

// Import and export Infobip WhatsApp functions
const { 
  sendAuthOTP,
  sendAuthOTPHttp,
  requestPhoneOTP,
  requestLoginOTP,
  requestSignupOTP,
  sendOrderUpdate, 
  onOrderCreated,
  testInfobipWhatsApp,
  sendWhatsAppText,
  sendRiderAssignment,
  sendDeliveryConfirmation,
  sendOrderShipping,
  onRiderAssigned,
  onOrderShipping,
  onOrderDelivered
} = require('./infobipWhatsApp');
exports.sendAuthOTP = sendAuthOTP;
exports.sendAuthOTPHttp = sendAuthOTPHttp;
exports.requestPhoneOTP = requestPhoneOTP;
exports.requestLoginOTP = requestLoginOTP;
exports.requestSignupOTP = requestSignupOTP;
exports.sendOrderUpdate = sendOrderUpdate;
exports.onOrderCreated = onOrderCreated;
exports.testInfobipWhatsApp = testInfobipWhatsApp;
exports.sendWhatsAppText = sendWhatsAppText;
exports.sendRiderAssignment = sendRiderAssignment;
exports.sendDeliveryConfirmation = sendDeliveryConfirmation;
exports.sendOrderShipping = sendOrderShipping;
exports.onRiderAssigned = onRiderAssigned;
exports.onOrderShipping = onOrderShipping;
exports.onOrderDelivered = onOrderDelivered;

// ====================================================================
// 💰 AGENT EARNINGS & WITHDRAWAL SYSTEM
// ====================================================================
const agentEarnings = require('./agentEarnings');

// Auto triggers
exports.onVendorGoLive = agentEarnings.onVendorGoLive;
exports.onVendorFirstOrder = agentEarnings.onVendorFirstOrder;
exports.onVendorOrderEarningsCredited = agentEarnings.onVendorOrderEarningsCredited;

// Agent management
exports.createAgent = agentEarnings.createAgent;
exports.getAgent = agentEarnings.getAgent;
exports.updateAgentBank = agentEarnings.updateAgentBank;

// Vendor management
exports.createVendor = agentEarnings.createVendor;

// Earnings
exports.getAgentEarnings = agentEarnings.getAgentEarnings;
exports.approveEarning = agentEarnings.approveEarning;
exports.getPendingEarnings = agentEarnings.getPendingEarnings;

// Withdrawals
exports.requestWithdrawal = agentEarnings.requestWithdrawal;
exports.getAgentWithdrawals = agentEarnings.getAgentWithdrawals;
exports.markWithdrawalPaid = agentEarnings.markWithdrawalPaid;
exports.getPendingWithdrawals = agentEarnings.getPendingWithdrawals;
exports.verifyAgentReferral = agentEarnings.verifyAgentReferral;
exports.findAgentByPhone = agentEarnings.findAgentByPhone;

// ====================================================================
// 🏍️  RIDER APPLICATION CONFIRMATION EMAIL
// Fires when a new document is created in riders/{riderId}
// ====================================================================
exports.onRiderSignup = functions.firestore
  .document('riders/{riderId}')
  .onCreate(async (snap, context) => {
    const rider = snap.data();
    const riderId = context.params.riderId;

    if (!rider.email) {
      console.log(`⚠️ Rider ${riderId} has no email — skipping confirmation email`);
      return null;
    }

    const riderName = rider.name || 'Rider';
    const fleetLabel =
      rider.fleetType === 'rider'      ? 'Motorcycle / Scooter' :
      rider.fleetType === 'bicycle'    ? 'Bicycle' :
      rider.fleetType === 'leg-fleet'  ? 'Leg Fleet (Walking)' :
      'Delivery Rider';

    console.log(`📧 Sending rider application confirmation to ${rider.email}`);

    try {
      const resend = getResend();
      if (resend) {
      await resend.emails.send({
        from: 'Go7 <notifications@go7.ng>',
        to: [rider.email],
        subject: `✅ Application Received – Welcome to Go7, ${riderName}!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f8f9fa;">
            <div style="max-width:600px;margin:0 auto;padding:20px;">

              <!-- Header -->
              <div style="background:linear-gradient(135deg,#E0001B 0%,#B30016 100%);
                          border-radius:16px 16px 0 0;padding:36px 30px;text-align:center;">
                <div style="font-size:42px;margin-bottom:12px;">🏍️</div>
                <h1 style="color:white;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                  Application Received!
                </h1>
                <p style="color:#ffd6d9;margin:10px 0 0;font-size:15px;">
                  We've got your details and will be in touch soon
                </p>
              </div>

              <!-- Body -->
              <div style="background:white;padding:32px 30px;border-radius:0 0 16px 16px;">

                <p style="color:#111827;font-size:17px;margin:0 0 20px;">
                  Hi <strong>${riderName}</strong>,
                </p>
                <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 24px;">
                  Thank you for signing up as a Go7 delivery rider. We've received your application
                  and our team is reviewing your details. You'll hear back from us within
                  <strong>24–48 hours</strong>.
                </p>

                <!-- Application summary card -->
                <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 24px;
                            border-left:4px solid #E0001B;">
                  <h3 style="color:#111827;margin:0 0 14px;font-size:15px;font-weight:600;">
                    Your Application Summary
                  </h3>
                  <table style="width:100%;border-collapse:collapse;">
                    <tr>
                      <td style="padding:7px 0;color:#6b7280;font-size:14px;width:40%;">Name</td>
                      <td style="padding:7px 0;color:#111827;font-weight:600;font-size:14px;">${riderName}</td>
                    </tr>
                    <tr style="border-top:1px solid #f3f4f6;">
                      <td style="padding:7px 0;color:#6b7280;font-size:14px;">Fleet Type</td>
                      <td style="padding:7px 0;color:#111827;font-weight:600;font-size:14px;">${fleetLabel}</td>
                    </tr>
                    <tr style="border-top:1px solid #f3f4f6;">
                      <td style="padding:7px 0;color:#6b7280;font-size:14px;">Status</td>
                      <td style="padding:7px 0;font-size:14px;">
                        <span style="background:#fef3c7;color:#92400e;padding:3px 10px;
                                     border-radius:20px;font-weight:600;font-size:13px;">
                          Under Review
                        </span>
                      </td>
                    </tr>
                    <tr style="border-top:1px solid #f3f4f6;">
                      <td style="padding:7px 0;color:#6b7280;font-size:14px;">Submitted</td>
                      <td style="padding:7px 0;color:#111827;font-weight:600;font-size:14px;">
                        ${new Date().toLocaleString('en-NG', {
                          year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- What happens next -->
                <h3 style="color:#111827;font-size:15px;font-weight:600;margin:0 0 14px;">
                  What happens next?
                </h3>
                <div style="display:flex;flex-direction:column;gap:12px;margin:0 0 28px;">
                  ${[
                    ['1', '#E0001B', 'Application Review (24–48 hrs)', 'Our team verifies your details and documents'],
                    ['2', '#F59E0B', 'Approval Notification',          'You\'ll get a WhatsApp message and email when approved'],
                    ['3', '#10B981', 'Short Training',                  'Complete a quick onboarding quiz in the app'],
                    ['4', '#6366F1', 'Start Earning',                   'Go online, accept jobs, and earn with Go7!'],
                  ].map(([num, color, title, desc]) => `
                    <div style="display:flex;align-items:flex-start;gap:14px;">
                      <div style="width:28px;height:28px;border-radius:50%;background:${color};
                                  color:white;font-weight:700;font-size:13px;flex-shrink:0;
                                  display:flex;align-items:center;justify-content:center;
                                  line-height:28px;text-align:center;">${num}</div>
                      <div>
                        <div style="color:#111827;font-weight:600;font-size:14px;">${title}</div>
                        <div style="color:#6b7280;font-size:13px;margin-top:2px;">${desc}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>

                <!-- CTA -->
                <div style="text-align:center;margin:28px 0;">
                  <a href="https://go7-app-209e4.web.app"
                     style="background:#E0001B;color:white;padding:14px 32px;border-radius:8px;
                            text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
                    Open Go7 Rider App
                  </a>
                </div>

                <!-- Support -->
                <div style="background:#f3f4f6;border-radius:8px;padding:16px;text-align:center;">
                  <p style="color:#6b7280;margin:0;font-size:13px;line-height:1.6;">
                    Questions? Reach us on WhatsApp or email<br>
                    <strong>support@go7.ng</strong>
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div style="text-align:center;margin-top:24px;padding:0 20px 20px;">
                <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6;">
                  <strong>Go7 Logistics</strong> — Fast, Reliable, Everywhere<br>
                  This is an automated message. Please do not reply directly to this email.
                </p>
              </div>

            </div>
          </body>
          </html>
        `
      });
      }

      console.log(`✅ Rider application confirmation sent to ${rider.email}`);

      // Notify admin team with document links
      try {
        await notifyAdminsRiderApplication(firestore, riderId, rider, false);
      } catch (adminErr) {
        console.error('❌ Failed to send admin rider alert:', adminErr);
      }

      return null;
    } catch (error) {
      console.error(`❌ Failed to send rider confirmation email to ${rider.email}:`, error);
      return null;
    }
  });

// Notify admins when rider resubmits or updates pending application
exports.onRiderApplicationUpdate = functions.firestore
  .document('riders/{riderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const { riderId } = context.params;

    const wasApproved = before.approved === true || before.applicationStatus === 'approved';
    const isApproved = after.approved === true || after.applicationStatus === 'approved';

    if (!wasApproved && isApproved) {
      try {
        await sendRiderApprovalEmail(
          after.email,
          after.name || after.fullName || 'Rider',
          riderId
        );
      } catch (err) {
        console.error('❌ Rider approval email failed:', err);
      }
    }

    if (after.approved === true) return null;

    const wasPending = before.status === 'pending' || before.applicationStatus === 'under_review';
    const isPending = after.status === 'pending' || after.applicationStatus === 'under_review';
    if (!isPending) return null;

    const resubmitted = after.resubmittedAt && String(after.resubmittedAt) !== String(before.resubmittedAt);
    const docsAdded = ['idDocumentURL', 'profilePhoto', 'licensePhotoURL', 'vehiclePhotoURL'].some(
      (k) => after[k] && after[k] !== before[k]
    );

    if (!wasPending && !resubmitted && !docsAdded) return null;
    if (!resubmitted && wasPending && !docsAdded) return null;

    try {
      await notifyAdminsRiderApplication(firestore, riderId, after, true);
    } catch (err) {
      console.error('❌ Admin alert on rider update failed:', err);
    }
    return null;
  });

/**
 * Admin: send professional re-upload email to a rider (e.g. incomplete application).
 */
exports.sendRiderReuploadEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  }

  const adminDoc = await firestore.collection('users').doc(context.auth.uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
  }

  const { riderId, email, name, phone } = data || {};
  let riderEmail = email;
  let riderName = name || 'Rider';
  let riderPhone = phone || '';

  if (riderId) {
    const riderSnap = await firestore.collection('riders').doc(riderId).get();
    if (riderSnap.exists) {
      const r = riderSnap.data();
      riderEmail = riderEmail || r.email;
      riderName = riderName || r.name || r.fullName || 'Rider';
      riderPhone = riderPhone || r.phone || '';
    } else {
      const userSnap = await firestore.collection('users').doc(riderId).get();
      if (userSnap.exists) {
        const u = userSnap.data();
        riderEmail = riderEmail || u.email;
        riderName = riderName || u.displayName || u.name || 'Rider';
        riderPhone = riderPhone || u.phone || '';
      }
    }
  }

  if (!riderEmail || !riderEmail.includes('@')) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid rider email is required.');
  }

  const baseUrl = 'https://go7.ng';
  const registerUrl = `${baseUrl}/rider/register`;

  const cc = ['feyisetantobiloba@gmail.com'];

  try {
    await sendRiderReuploadRequestEmail(riderEmail, riderName, registerUrl, riderPhone, cc);
  } catch (err) {
    console.error('sendRiderReuploadEmail failed:', err);
    throw new functions.https.HttpsError(
      'failed-precondition',
      err.message || 'Email could not be sent. Check RESEND_API_KEY and domain verification in Resend.'
    );
  }

  if (riderId) {
    await firestore.collection('riders').doc(riderId).set({
      reuploadRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      reuploadRequestedBy: context.auth.uid,
    }, { merge: true });
  }

  return { success: true, email: riderEmail, cc };
});

/**
 * Admin: send a test email to verify Resend is working.
 */
exports.diagnoseGo7Email = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  }

  const adminDoc = await firestore.collection('users').doc(context.auth.uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
  }

  const { sendGo7Email, getApiKey, FROM_CANDIDATES } = require('./go7Mail');
  const { WORKING_FROM } = require('./resendClient');
  const to = (data?.to || 'feyisetantobiloba@gmail.com').trim();
  const hasKey = Boolean(getApiKey());

  const result = await sendGo7Email({
    to,
    subject: 'Go7 Email Test — delivery working',
    html: `
      <div style="font-family:sans-serif;padding:24px">
        <h2 style="color:#E0001B">Go7 email test OK</h2>
        <p>If you received this, Resend is configured correctly.</p>
        <p style="color:#666;font-size:13px">Sent at ${new Date().toISOString()}</p>
      </div>`,
  });

  return {
    hasKey,
    fromCandidates: [WORKING_FROM],
    to,
    ...result,
  };
});

// Wallet payment functions (debit, balance lookup, admin adjustments)
const walletModule = require('./wallet');
exports.debitWalletForDelivery = walletModule.debitWalletForDelivery;
exports.refundWalletForFailedPayment = walletModule.refundWalletForFailedPayment;
exports.getWalletInfo = walletModule.getWalletInfo;
exports.adminWalletAdjustment = walletModule.adminWalletAdjustment;
exports.onWalletPaidCancel = walletModule.onWalletPaidCancel;
exports.onWalletPaidBookingCancel = walletModule.onWalletPaidBookingCancel;

// Server-side delivery PIN verification + owner-only PIN access
const deliveryPinVerify = require('./deliveryPinVerify');
exports.verifyDeliveryPin = deliveryPinVerify.verifyDeliveryPin;
exports.ensureDeliveryPin = deliveryPinVerify.ensureDeliveryPin;

// Bills / VTU (airtime + data), paid from GO7 wallet via SME API
const billsService = require('./billsService');
exports.purchaseAirtime = billsService.purchaseAirtime;
exports.purchaseDataBundle = billsService.purchaseDataBundle;
exports.verifyFoodDeliveryFee = require('./foodDeliveryFee').verifyFoodDeliveryFee;
exports.verifyPaymentAndCreditWallet = walletModule.verifyPaymentAndCreditWallet;
// Same handler under the old Paystack dashboard name (use go7-app-209e4 URL, not go7-delivery)
exports.paystackWebhookV2 = walletModule.verifyPaymentAndCreditWallet;

// Play Store / GDPR — customer self-serve account deletion
exports.deleteMyAccount = require('./deleteAccount').deleteMyAccount;

const trackingModule = require('./tracking');
exports.lookupBookingForTracking = trackingModule.lookupBookingForTracking;

// Server-side Google Distance Matrix proxy (checkout delivery-fee calc)
const distanceMatrixModule = require('./distanceMatrix');
exports.getDistanceMatrix = distanceMatrixModule.getDistanceMatrix;

// Vendor payouts — Paystack transfer + wallet backfill
const vendorPayouts = require('./vendorPayouts');
exports.onVendorPayoutRequestCreated = vendorPayouts.onVendorPayoutRequestCreated;
exports.processVendorPayout = vendorPayouts.processVendorPayout;
exports.markVendorPayoutPaid = vendorPayouts.markVendorPayoutPaid;
exports.backfillVendorWallets = vendorPayouts.backfillVendorWallets;
exports.onPaystackTransferUpdate = vendorPayouts.onPaystackTransferUpdate;

// ====================================================================
// COMMUNITY GROWTH ASSOCIATE (agents/referrals/commissions backend)
// ====================================================================
const agentGrowth = require('./agentGrowth');
exports.createCommunityGrowthAgent = agentGrowth.createCommunityGrowthAgent;
exports.onVendorWriteForAgentGrowth = agentGrowth.onVendorWriteForAgentGrowth;
exports.onProductCreateForAgentGrowth = agentGrowth.onProductCreateForAgentGrowth;
exports.onOrderWriteForAgentGrowth = agentGrowth.onOrderWriteForAgentGrowth;

// ====================================================================
// GROWTH & REFERRAL ENGINE — Phase 1 (attribution + qualifying first
// order + reward ledger). Server-authoritative; campaign ships DRAFT.
// ====================================================================
const growthEngine = require('./growthEngine');
const campaignRules = require('./campaignRules');
const mealBundles = require('./mealBundles');
exports.createMealBundle = mealBundles.createMealBundle;
exports.quoteMealBundle = mealBundles.quoteMealBundle;
exports.confirmMealBundlePayment = mealBundles.confirmMealBundlePayment;
exports.cancelMealBundleLeg = mealBundles.cancelMealBundleLeg;
exports.cancelMealBundle = mealBundles.cancelMealBundle;
exports.processScheduledBundleLegs = mealBundles.processScheduledBundleLegs;
const mealPlans = require('./mealPlans');
exports.upsertMealPlan = mealPlans.upsertMealPlan;
exports.updateScheduledLegStatus = mealPlans.updateScheduledLegStatus;
exports.onOrderCampaignRules = campaignRules.onOrderCampaignRules;
exports.onVendorCampaignEvent = campaignRules.onVendorCampaignEvent;
exports.resolveReferralCode = growthEngine.resolveReferralCode;
exports.trackReferralClick = growthEngine.trackReferralClick;
exports.registerReferralAttribution = growthEngine.registerReferralAttribution;
exports.createGrowthPartner = growthEngine.createGrowthPartner;
exports.upsertGrowthCampaign = growthEngine.upsertGrowthCampaign;
exports.setGrowthPartnerStatus = growthEngine.setGrowthPartnerStatus;
exports.approveGrowthReward = growthEngine.approveGrowthReward;
exports.rejectGrowthReward = growthEngine.rejectGrowthReward;
exports.payGrowthReward = growthEngine.payGrowthReward;
exports.voidGrowthReward = growthEngine.voidGrowthReward;
exports.getPartnerDashboard = growthEngine.getPartnerDashboard;
exports.getPartnerRewards = growthEngine.getPartnerRewards;
exports.checkReferralDiscount = growthEngine.checkReferralDiscount;
exports.onOrderReferralQualification = growthEngine.onOrderReferralQualification;
exports.requestAgentWithdrawal = agentGrowth.requestAgentWithdrawal;
exports.approveAgentWithdrawal = agentGrowth.approveAgentWithdrawal;
exports.rejectAgentWithdrawal = agentGrowth.rejectAgentWithdrawal;
exports.markAgentWithdrawalPaid = agentGrowth.markAgentWithdrawalPaid;
exports.approveAgentTransaction = agentGrowth.approveAgentTransaction;
exports.rejectAgentTransaction = agentGrowth.rejectAgentTransaction;
exports.autoApproveAgentTransactions = agentGrowth.autoApproveAgentTransactions;
exports.submitAgentDailyReport = agentGrowth.submitAgentDailyReport;
exports.adjustAgentScorecard = agentGrowth.adjustAgentScorecard;
exports.awardMonthlyKPIBonus = agentGrowth.awardMonthlyKPIBonus;
exports.markTopPerformer = agentGrowth.markTopPerformer;
exports.generateMonthlyPerformanceSummary = agentGrowth.generateMonthlyPerformanceSummary;
exports.getAgentTransactions = agentGrowth.getAgentTransactions;
exports.getAgentWithdrawalsCGA = agentGrowth.getAgentWithdrawalsCGA;
exports.getAgentDailyReports = agentGrowth.getAgentDailyReports;
exports.getAgentPerformanceMonth = agentGrowth.getAgentPerformanceMonth;

// ====================================================================
// 🔔 FCM BROADCAST NOTIFICATIONS
// Admin: send push notifications to all users or selected segment
// ====================================================================
exports.sendFCMBroadcast = functions.https.onCall(async (data, context) => {
  try {
    // Verify admin
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    }

    const adminDoc = await firestore.collection('users').doc(context.auth.uid).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
    }

    const { title, body, image = '', clickAction = '/', segment = 'all' } = data || {};

    if (!title || !body) {
      throw new functions.https.HttpsError('invalid-argument', 'Title and body are required.');
    }

    // Build user query
    let userQuery = firestore.collection('users');
    if (segment && segment !== 'all') {
      userQuery = userQuery.where('role', '==', segment);
    }

    const snapshot = await userQuery.get();
    const tokens = [];
    const userIds = [];

    snapshot.forEach(doc => {
      const user = doc.data();
      if (user.fcmToken && typeof user.fcmToken === 'string' && user.fcmToken.length > 20) {
        tokens.push(user.fcmToken);
        userIds.push(doc.id);
      }
    });

    if (tokens.length === 0) {
      return { success: true, sent: 0, failed: 0, total: 0, message: 'No FCM tokens found' };
    }

    // Remove duplicate tokens
    const uniqueTokens = [...new Set(tokens)];

    // Build messages for sendEach (batch)
    const messages = uniqueTokens.map(token => ({
      token,
      notification: {
        title,
        body
      },
      data: {
        type: 'broadcast',
        clickAction: clickAction || '/',
        timestamp: Date.now().toString()
      },
      android: {
        priority: 'high',
        notification: {
          icon: 'notification_icon',
          color: '#03A9F4',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      },
      webpush: {
        headers: { Urgency: 'high' },
        notification: {
          icon: '/icons/go7-icon-192.png',
          badge: '/icons/go7-badge-72.png',
          ...(image ? { image } : {})
        },
        fcmOptions: {
          link: clickAction || '/'
        }
      }
    }));

    let sent = 0;
    let failed = 0;
    const errors = [];

    // FCM supports up to 500 messages per sendEach call
    const BATCH_SIZE = 500;
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const result = await admin.messaging().sendEach(batch);
      sent += result.successCount;
      failed += result.failureCount;

      if (result.responses) {
        result.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const originalToken = batch[idx]?.token;
            errors.push({ token: originalToken?.substring(0, 20) + '...', error: resp.error?.message });
            // Optionally remove invalid tokens
            if (resp.error?.code === 'messaging/registration-token-not-registered') {
              firestore.collection('users')
                .where('fcmToken', '==', originalToken)
                .get()
                .then(snap => snap.forEach(d => d.ref.update({ fcmToken: null })))
                .catch(() => {});
            }
          }
        });
      }
    }

    // Log broadcast
    await firestore.collection('fcm_broadcasts').add({
      title,
      body,
      image,
      clickAction,
      segment,
      total: uniqueTokens.length,
      sent,
      failed,
      errors: errors.slice(0, 20),
      sentBy: context.auth.uid,
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      total: uniqueTokens.length,
      sent,
      failed,
      errors: errors.slice(0, 5)
    };

  } catch (error) {
    functions.logger.error('Error sending FCM broadcast', { error: error.message });
    throw new functions.https.HttpsError('internal', error.message || 'Failed to send broadcast');
  }
});



// ── Gamification: Lucky Week spin + weekly jackpot settle (server-authoritative) ──
const gamificationJackpot = require('./gamificationJackpot');
exports.spinLuckyWeek = gamificationJackpot.spinLuckyWeek;
exports.settleWeeklyJackpot = gamificationJackpot.settleWeeklyJackpot;
exports.grantJackpotManual = gamificationJackpot.grantJackpotManual;

// ================================================================
// KEEP-WARM PING — free alternative to minInstances.
// Pings the hot callables every 5 min with an empty unauthenticated
// request. The handler's auth check rejects it instantly (~50ms), but
// the instance stays warm so real users never pay the cold start.
// ~95k invocations/month — inside the 2M free tier. Cost: $0.
// ================================================================
const HOT_CALLABLES = [
  'sendPhoneOTP',
  'verifyPhoneOTP',
  'loginWithPhoneOTP',
  'requestSignupOTP',
  'sendAuthOTP',
  'createCommerceOrder',
  'computeDeliveryFee',
  'createBookDeliveryOrder',
  'confirmBookDeliveryPayment',
  'debitWalletForDelivery',
  'bookDeliveryAIChat'
];
exports.keepFunctionsWarm = functions.pubsub
  .schedule('every 5 minutes')
  .timeZone('Africa/Lagos')
  .onRun(async () => {
    const base = 'https://us-central1-' + (process.env.GCLOUD_PROJECT || 'go7-app-209e4') + '.cloudfunctions.net';
    await Promise.all(HOT_CALLABLES.map((name) =>
      fetch(base + '/' + name, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: {} }),
      }).catch(() => null)
    ));
    return null;
  });

// ================================================================
// ADMIN VISIBILITY — food/commerce orders + new customer signups
// Bookings already alert admin via notifyAdminBookingUpdates +
// checkStuckPaidBookings. This adds the same coverage for orders/.
// ================================================================
exports.notifyAdminOrderCancelled = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    try {
      await bookingAlerts.alertAdminPaidBookingCancelled(
        change.before.data(),
        change.after.data(),
        context.params.orderId
      );
    } catch (err) {
      console.error('Admin order-cancel alert failed:', err.message);
    }
    return null;
  });

// New paid food/commerce order -> admin email + adminAlerts
exports.notifyAdminNewPaidOrder = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    try {
      await bookingAlerts.alertAdminNewPaidOrder(snap.data(), context.params.orderId);
    } catch (err) {
      console.error('Admin new-order alert failed:', err.message);
    }
    return null;
  });

// Vendor payout request -> admin email + adminAlerts
exports.notifyAdminPayoutRequest = functions.firestore
  .document('payoutRequests/{payoutId}')
  .onCreate(async (snap, context) => {
    try {
      await bookingAlerts.alertAdminPayoutRequest(snap.data(), context.params.payoutId);
    } catch (err) {
      console.error('Admin payout alert failed:', err.message);
    }
    return null;
  });

// New customer signup -> in-app admin alert (no email, avoids spam)
exports.notifyAdminNewCustomer = functions.firestore
  .document('users/{uid}')
  .onCreate(async (snap) => {
    const u = snap.data() || {};
    return admin.firestore().collection('adminAlerts').add({
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: 'new_customer',
      severity: 'info',
      title: 'New customer signed up',
      message: (u.name || u.displayName || 'Customer') + ' ' + (u.phone || u.phoneNumber || u.email || ''),
      customerName: u.name || u.displayName || null,
      customerPhone: u.phone || u.phoneNumber || null,
    });
  });