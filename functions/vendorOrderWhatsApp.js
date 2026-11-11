/**
 * Notify food vendors on WhatsApp when a new order needs preparation.
 * Uses Infobip WhatsApp template API (same stack as OTP / order templates).
 */
const { defineString } = require('firebase-functions/params');
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const axios = require('axios');

const db = admin.firestore();

const INFOBIP_API_KEY = defineString('INFOBIP_API_KEY');
const INFOBIP_BASE_URL = defineString('INFOBIP_BASE_URL');
const INFOBIP_SENDER = defineString('INFOBIP_SENDER');
// Optional overrides — plain env (not defineString) so deploy does not require new params
const VENDOR_TEMPLATE =
  process.env.INFOBIP_VENDOR_ORDER_TEMPLATE ||
  process.env.INFOBIP_ORDER_TEMPLATE ||
  functions.config().infobip?.vendor_order_template ||
  functions.config().infobip?.order_template ||
  'vendor_v2';
const VENDOR_TEMPLATE_LANG =
  process.env.INFOBIP_VENDOR_ORDER_LANG ||
  process.env.INFOBIP_ORDER_LANG ||
  functions.config().infobip?.vendor_order_lang ||
  functions.config().infobip?.order_lang ||
  'en';

function paramValue(param, fallback = '') {
  try {
    if (typeof param?.value === 'function') return param.value() || fallback;
  } catch (_) {
    /* unset param */
  }
  return fallback;
}

function getInfobipConfig() {
  return {
    apiKey: paramValue(INFOBIP_API_KEY, process.env.INFOBIP_API_KEY || ''),
    baseUrl: paramValue(INFOBIP_BASE_URL, process.env.INFOBIP_BASE_URL || ''),
    sender: paramValue(INFOBIP_SENDER, process.env.INFOBIP_SENDER || ''),
    templateName: VENDOR_TEMPLATE,
    language: VENDOR_TEMPLATE_LANG,
  };
}

function formatPhoneNumber(phone) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/\D/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('0')) return `234${cleaned.slice(1)}`;
  if (cleaned.startsWith('234')) return cleaned;
  return `234${cleaned}`;
}

function isFoodOrder(data = {}) {
  const t = String(data.orderType || data.type || data.serviceType || '').toLowerCase();
  if (['gobuy', 'go_buy', 'parcel', 'courier', 'booking', 'delivery_only',
    'general_delivery', 'general-delivery', 'fuel'].includes(t)) {
    return false;
  }
  if (['food', 'restaurant', 'meal', 'vendor', 'market', 'pharmacy'].includes(t)) return true;
  // A type field exists but isn't food — don't guess food for it.
  if (t) return false;
  // No type at all — legacy heuristic: vendorId + items implies a store order.
  if (data.vendorId && Array.isArray(data.items) && data.items.length > 0) return true;
  return false;
}

function paymentAllowsNotify(data = {}) {
  const ps = String(data.paymentStatus || data.payment?.status || '').toLowerCase();
  if (['failed', 'cancelled', 'canceled', 'refunded'].includes(ps)) return false;
  return true;
}

function resolveVendorIds(data = {}) {
  const ids = new Set();
  if (data.vendorId) ids.add(String(data.vendorId));
  if (Array.isArray(data.vendorIds)) {
    data.vendorIds.forEach((id) => id && ids.add(String(id)));
  }
  if (data.vendorOrders && typeof data.vendorOrders === 'object') {
    Object.keys(data.vendorOrders).forEach((id) => ids.add(String(id)));
  }
  if (Array.isArray(data.items)) {
    data.items.forEach((item) => {
      if (item?.vendorId) ids.add(String(item.vendorId));
    });
  }
  return [...ids];
}

function itemDisplayName(item = {}) {
  return (
    item.name ||
    item.productName ||
    item.title ||
    item.itemName ||
    item.product?.name ||
    'Item'
  );
}

function itemQuantity(item = {}) {
  const q = Number(item.quantity ?? item.qty ?? item.count);
  return Number.isFinite(q) && q > 0 ? q : 1;
}

function itemAddonNames(item = {}) {
  const raw = item.addons || item.addOns || item.selectedAddons || item.selectedAddOns || [];
  if (!Array.isArray(raw) || !raw.length) return [];
  return raw
    .map((a) => {
      if (!a) return null;
      if (typeof a === 'string') return a;
      return a.name || a.title || a.label || a.optionName || null;
    })
    .filter(Boolean);
}

function formatItemLine(item = {}) {
  const qty = itemQuantity(item);
  const name = String(itemDisplayName(item)).trim();
  const addons = itemAddonNames(item);
  let line = `${qty}x ${name}`;
  if (addons.length) line += ` (${addons.join(', ')})`;
  return line;
}

/** Collect line items for a vendor (or whole order). */
function collectOrderItems(data = {}, vendorId = null) {
  const top = Array.isArray(data.items) ? data.items : [];
  if (vendorId) {
    const forVendor = top.filter(
      (it) => !it?.vendorId || String(it.vendorId) === String(vendorId)
    );
    const vo = data.vendorOrders?.[vendorId] || data.vendorOrders?.[String(vendorId)];
    const voItems = Array.isArray(vo?.items) ? vo.items : [];
    if (forVendor.length && forVendor.some((it) => it?.vendorId)) return forVendor;
    if (voItems.length) return voItems;
    if (forVendor.length) return forVendor;
  }
  if (top.length) return top;
  if (data.vendorOrders && typeof data.vendorOrders === 'object') {
    return Object.values(data.vendorOrders).flatMap((v) =>
      Array.isArray(v?.items) ? v.items : []
    );
  }
  return [];
}

/**
 * WhatsApp {{3}} — human-readable items list (not a bare count).
 * Meta/Infobip: no newlines; keep length reasonable.
 */
function formatItemsForWhatsApp(items = [], maxLen = 500) {
  if (!items.length) return 'See GO7 for full items';
  const text = items
    .map(formatItemLine)
    .join(', ')
    .replace(/[\n\r\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 1))}…`;
}

function orderSummary(data = {}, orderId, vendorId = null) {
  const items = collectOrderItems(data, vendorId);
  const itemCount = items.reduce((n, it) => n + itemQuantity(it), 0) || items.length || 1;
  const itemsText = formatItemsForWhatsApp(items);
  const total = data.total || data.grandTotal || data.amount || data.orderTotal || 0;
  const displayId = data.orderCode || data.displayId || orderId;
  return { itemCount, itemsText, total, displayId, items };
}

async function logVendorNotification(payload) {
  const ref = await db.collection('notifications').add({
    ...payload,
    recipientType: 'vendor',
    messageType: payload.messageType || 'VENDOR_NEW_ORDER',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

async function writeAdminAlert(payload) {
  try {
    await db.collection('adminAlerts').add({
      type: 'vendor_new_order_whatsapp',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...payload,
    });
  } catch (err) {
    console.warn('[vendorOrderWhatsApp] adminAlerts write failed:', err.message);
  }
}

/**
 * Infobip template send — placeholders:
 * [vendorName, orderId, itemsText, total]
 * Template: GO7 new food order for {{1}}. Order {{2}}. Items {{3}}. Total {{4}}.
 */
async function sendVendorTemplate(phone, { vendorName, displayId, itemsText, total }) {
  const { apiKey, baseUrl, sender, templateName, language } = getInfobipConfig();

  if (!apiKey || !baseUrl || !sender) {
    return { success: false, error: 'Missing Infobip credentials' };
  }

  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone) {
    return { success: false, error: 'Invalid vendor phone' };
  }

  const totalText = `${Number(total || 0).toLocaleString('en-NG')} NGN`;
  const placeholders = [
    String(vendorName || 'Vendor').slice(0, 60),
    String(displayId).slice(0, 60),
    String(itemsText || 'See GO7 for full items').slice(0, 500),
    totalText.slice(0, 60),
  ];

  try {
    const response = await axios.post(
      `${baseUrl}/whatsapp/1/message/template`,
      {
        messages: [
          {
            from: sender,
            to: formattedPhone,
            content: {
              templateName,
              templateData: {
                body: { placeholders },
              },
              language,
            },
          },
        ],
      },
      {
        headers: {
          Authorization: `App ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
      }
    );

    const message = response.data?.messages?.[0];
    const statusName = message?.status?.name || '';
    const statusGroup = message?.status?.groupName || '';
    const rejected =
      /REJECT/i.test(statusGroup) ||
      /REJECT/i.test(statusName) ||
      /UNDELIVERABLE/i.test(statusGroup) ||
      /EXPIRED/i.test(statusName);

    if (rejected) {
      return {
        success: false,
        error: `Infobip rejected (${statusName || statusGroup}). Check template "${templateName}" / language "${language}".`,
        phone: formattedPhone,
        messageId: message?.messageId || null,
        templateName,
      };
    }

    return {
      success: true,
      messageId: message?.messageId || null,
      phone: formattedPhone,
      templateName,
      statusName,
    };
  } catch (error) {
    const errorMessage =
      error.response?.data?.requestError?.serviceException?.text ||
      error.response?.data?.message ||
      error.message ||
      'Unknown Infobip error';
    return {
      success: false,
      error: errorMessage,
      phone: formattedPhone,
      errorDetails: error.response?.data || null,
      templateName,
    };
  }
}

exports.sendVendorTemplate = sendVendorTemplate;

exports.notifyVendorNewFoodOrder = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const orderId = context.params.orderId;
    const data = snap.data() || {};

    if (!isFoodOrder(data)) {
      console.log(`[vendorOrderWhatsApp] skip non-food order ${orderId}`);
      return null;
    }
    if (!paymentAllowsNotify(data)) {
      console.log(`[vendorOrderWhatsApp] skip unpaid/failed order ${orderId}`);
      return null;
    }
    if (data.vendorWhatsAppNotifiedAt) {
      console.log(`[vendorOrderWhatsApp] already notified ${orderId}`);
      return null;
    }

    const vendorIds = resolveVendorIds(data);
    if (!vendorIds.length) {
      console.warn(`[vendorOrderWhatsApp] no vendorId on order ${orderId}`);
      await logVendorNotification({
        orderId,
        status: 'FAILED',
        details: 'No vendorId on food order',
        customerName: data.customerName || data.userName || null,
        customerPhone: null,
        vendorId: null,
        vendorPhone: null,
      });
      return null;
    }

    const results = [];

    for (const vendorId of vendorIds) {
      try {
        const { itemsText, total, displayId } = orderSummary(data, orderId, vendorId);
        const vendorSnap = await db.collection('vendors').doc(vendorId).get();
        if (!vendorSnap.exists) {
          results.push({ vendorId, success: false, error: 'Vendor not found' });
          await logVendorNotification({
            orderId,
            vendorId,
            status: 'FAILED',
            details: 'Vendor document not found',
            customerName: data.customerName || null,
            customerPhone: null,
            vendorPhone: null,
          });
          continue;
        }

        const vendor = vendorSnap.data() || {};
        const phone = vendor.phone || vendor.whatsapp || vendor.contactPhone || data.vendorPhone;
        const vendorName =
          vendor.businessName || vendor.name || vendor.shopName || data.vendorName || 'Vendor';

        if (!phone) {
          results.push({ vendorId, success: false, error: 'No vendor phone' });
          await logVendorNotification({
            orderId,
            vendorId,
            vendorName,
            status: 'FAILED',
            details: 'Vendor has no phone/WhatsApp number',
            customerName: data.customerName || null,
            customerPhone: null,
            vendorPhone: null,
          });
          await writeAdminAlert({
            orderId,
            vendorId,
            vendorName,
            severity: 'warning',
            title: 'Vendor WhatsApp missing',
            message: `Order ${displayId}: vendor ${vendorName} has no phone for prep alert.`,
          });
          continue;
        }

        const sendResult = await sendVendorTemplate(phone, {
          vendorName,
          displayId,
          itemsText,
          total,
        });

        await logVendorNotification({
          orderId,
          vendorId,
          vendorName,
          vendorPhone: sendResult.phone || formatPhoneNumber(phone),
          customerName: vendorName,
          customerPhone: sendResult.phone || formatPhoneNumber(phone),
          status: sendResult.success ? 'SENT' : 'FAILED',
          details: sendResult.success
            ? `Vendor prep alert sent via Infobip (${sendResult.templateName})`
            : sendResult.error,
          messageId: sendResult.messageId || null,
          template: sendResult.templateName || 'vendor_new_order',
          channel: 'infobip',
        });

        await writeAdminAlert({
          orderId,
          vendorId,
          vendorName,
          vendorPhone: sendResult.phone || formatPhoneNumber(phone),
          severity: sendResult.success ? 'info' : 'error',
          title: sendResult.success ? 'Vendor WhatsApp sent' : 'Vendor WhatsApp failed',
          message: sendResult.success
            ? `Prep alert for order ${displayId} sent to ${vendorName}.`
            : `Prep alert for order ${displayId} failed: ${sendResult.error}`,
        });

        results.push({ vendorId, ...sendResult });
      } catch (err) {
        console.error(`[vendorOrderWhatsApp] vendor ${vendorId} error:`, err);
        results.push({ vendorId, success: false, error: err.message });
      }
    }

    const anySent = results.some((r) => r.success);
    try {
      await snap.ref.set(
        {
          vendorWhatsAppNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          vendorWhatsAppResults: results.map((r) => ({
            vendorId: r.vendorId,
            success: !!r.success,
            error: r.error || null,
            messageId: r.messageId || null,
          })),
        },
        { merge: true }
      );
    } catch (stampErr) {
      console.warn('[vendorOrderWhatsApp] stamp failed:', stampErr.message);
    }

    console.log(
      `[vendorOrderWhatsApp] order ${orderId} done — sent=${anySent} vendors=${results.length}`
    );
    return null;
  });

module.exports.formatPhoneNumber = formatPhoneNumber;
module.exports.isFoodOrder = isFoodOrder;
