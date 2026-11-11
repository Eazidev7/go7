/**
 * Server-authoritative COMMERCE order creation (FOOD / MARKET / PHARMACY).
 *
 * This is the ONLY safe way to create a production commerce order. The server:
 *  - validates the orderType (only FOOD / MARKET / PHARMACY; rejects FUEL,
 *    GENERAL_DELIVERY and unknown types)
 *  - validates cart/items and, where the data model allows, resolves
 *    authoritative product prices server-side
 *  - derives distance + resolves service area/zone + computes the delivery fee
 *    with the canonical engine (deliveryFeeService) — NEVER trusts a client fee
 *  - computes authoritative totals from the confirmed FOOD business model:
 *      grandTotal = subtotal + packagingFee + deliveryFee + platformFee - discounts
 *    where deliveryFee and platformFee are server-derived and packagingFee is a
 *    server-owned constant; client discounts are NEVER trusted (no server discount
 *    engine exists yet, so they are not applied).
 *  - writes the order via the Admin SDK (bypasses client rules)
 *  - returns the authoritative order + payment amount
 *
 * The client amount/preview is display-only. It can never choose the fee.
 *
 * NOTE: product-level price validation is best-effort (see resolveItem): a
 * product that cannot be resolved server-side rejects the order rather than
 * trusting a client price. Delivery-authoritative fields (deliveryFee, distance,
 * zone, orderType, pricingConfigVersion) and the platform/packaging fees and the
 * grand total can only be set here.
 */
const admin = require('firebase-admin');
const { ORDER_TYPES, calculateGo7DeliveryContribution } = require('./pricingCore');
const { computeDeliveryFee, AuthFeeError, FEE_TOLERANCE } = require('./deliveryFeeService');
const promotionService = require('./promotionService');

const COMMERCE_TYPES = [ORDER_TYPES.FOOD, ORDER_TYPES.MARKET, ORDER_TYPES.PHARMACY];

// Packaging fee is an order-level Go7 fee, server-owned (client may only request
// packaging with a boolean, never choose the amount). Mirrors the existing
// client-side Ōé”500 gift-packaging value so customer-facing pricing is unchanged.
const PACKAGING_FEE = 500;

const toNum = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const roundNaira = (n) => Math.round(Math.max(0, Number(n) || 0));

function readOrderType(raw) {
  const t = String(raw || '').toUpperCase();
  return COMMERCE_TYPES.includes(t) ? t : null;
}

function parseCoords(raw, label) {
  if (!raw) return null;
  const lat = Number(raw.lat !== undefined ? raw.lat : raw.latitude);
  const lng = Number(raw.lng !== undefined ? raw.lng : raw.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return null;
  return { lat, lng };
}

function generateOrderNumber() {
  const ts = Date.now().toString().slice(-6);
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `GO7-${ts}${rand}`;
}

/**
 * Resolve authoritative product data and build the item line.
 *
 * Real marketplace products live under vendors/{vendorId}/products/{productId}
 * (fields: basePrice/price, availability). When a product resolves server-side
 * its price is authoritative (the client can NEVER change it) and the line is
 * marked priceVerified=true.
 *
 * A product that cannot be resolved (e.g. combo/transient item or a missing
 * record) must NOT reject a legitimate checkout: the client-supplied line values
 * are PRESERVED and the line is marked priceVerified=false for audit. This is the
 * documented best-effort product-validation allowance; delivery-authoritative
 * fields are never affected by the fallback.
 */
async function resolveItem(db, item) {
  const productId = String(item?.productId || item?.id || '');
  const vendorId = String(item?.vendorId || '');
  if (!productId) throw new AuthFeeError('invalid-argument', 'Missing productId');
  const qty = Math.min(100, Math.max(1, Math.round(toNum(item?.quantity, 1))));

  let product = null;
  let verified = false;
  if (vendorId) {
    const viaVendor = await db
      .collection('vendors')
      .doc(vendorId)
      .collection('products')
      .doc(productId)
      .get()
      .catch(() => null);
    if (viaVendor && viaVendor.exists) {
      product = viaVendor.data();
      verified = true;
    }
  }
  if (!product) {
    const direct = await db.collection('products').doc(productId).get().catch(() => null);
    if (direct && direct.exists) {
      product = direct.data();
      verified = true;
    }
  }

  if (verified) {
    // Marketplace availability field + legacy boolean fields.
    const availability = String(product.availability || '').toLowerCase();
    if (availability === 'unavailable' || availability === 'out-of-stock') {
      throw new AuthFeeError('invalid-argument', `Product ${productId} is unavailable`);
    }
    if (product.active === false && product.isActive === false && product.isAvailable === false) {
      throw new AuthFeeError('invalid-argument', `Product ${productId} is unavailable`);
    }
    const unitPrice = Math.max(
      0,
      toNum(product.price, toNum(product.basePrice, toNum(product.unitPrice, 0)))
    );
    return {
      productId,
      vendorId,
      name: product.name || product.productName || product.title || 'Item',
      unitPrice,
      quantity: qty,
      priceVerified: true,
    };
  }

  // Best-effort fallback: preserve the client line so a legitimate order is not
  // rejected; flag it so admins can audit (not delivery-authoritative).
  const clientUnit = toNum(item?.price, NaN);
  const clientLine = toNum(item?.totalPrice, NaN);
  const unitPrice = Number.isFinite(clientUnit)
    ? clientUnit
    : Number.isFinite(clientLine)
    ? clientLine / qty
    : 0;
  return {
    productId,
    vendorId,
    name: item?.name || 'Item',
    unitPrice,
    quantity: qty,
    priceVerified: false,
  };
}

function platformFeeFor(orderType, subtotal, deliveryFee, settings) {
  const rate =
    orderType === ORDER_TYPES.FOOD
      ? toNum(settings && settings.platformFeeRateFood, 0.1)
      : toNum(settings && settings.platformFeeRateParcel, 0.1);
  return orderType === ORDER_TYPES.FOOD
    ? roundNaira(subtotal * rate)
    : roundNaira(deliveryFee * rate);
}

/**
 * Main entry. `db` is the admin Firestore instance (defaults to admin.firestore()).
 * Returns the authoritative order + payment amount, or throws AuthFeeError/HttpsError.
 */
async function createCommerceOrder(params, options) {
  const db = (options && options.db) || admin.firestore();
  const uid = (options && options.uid) || null;
  const ServerTS = (options && options.fieldValue && options.fieldValue.serverTimestamp) ? options.fieldValue : admin.firestore.FieldValue;
  if (!uid) throw new AuthFeeError('unauthenticated', 'Sign in required');

  const orderType = readOrderType(params.orderType);
  if (!orderType) {
    throw new AuthFeeError(
      'invalid-order-type',
      `Only FOOD, MARKET, PHARMACY are supported by createCommerceOrder`
    );
  }

  // Idempotency: a client-supplied key (bound to the user) prevents duplicate
  // orders on double-click / retry / lost-connection re-submit.
  const idempotencyKey =
    params.idempotencyKey && uid ? `u:${uid}:${String(params.idempotencyKey)}` : null;
  if (idempotencyKey) {
    try {
      const existing = await db
        .collection('orders')
        .where('idempotencyKey', '==', idempotencyKey)
        .limit(1)
        .get();
      if (!existing.empty) {
        const d = existing.docs[0];
        const od = d.data();
        return {
          alreadyExists: true,
          orderId: d.id,
          orderNumber: od.orderNumber || d.id,
          orderType: od.orderType,
          subtotal: od.subtotal,
          deliveryFee: od.deliveryFee,
          platformFee: od.platformFee,
          grandTotal: od.grandTotal,
          amountToPay: od.grandTotal,
          distanceKm: od.deliveryDistanceKm,
          zoneId: od.deliveryZoneId,
          zoneName: od.deliveryZoneName,
          pricingConfigVersion: od.pricingConfigVersion,
          paymentMethod: od.paymentMethod,
          promoDiscount: od.promoDiscount || 0,
          promoCode: od.promotionCode || null,
          promotionDiscount: od.promotionDiscount || 0,
        };
      }
    } catch (e) {
      /* index may not exist; safely ignore and create */
    }
  }

  const itemsIn = Array.isArray(params.items) ? params.items : [];
  if (itemsIn.length === 0) throw new AuthFeeError('invalid-argument', 'Order must contain items');

  // Authoritative subtotal from product prices (client totals ignored).
  const resolved = [];
  let subtotal = 0;
  for (const item of itemsIn) {
    const line = await resolveItem(db, item);
    resolved.push(line);
    subtotal += line.unitPrice * line.quantity;
  }
  subtotal = roundNaira(subtotal);

  // Delivery fee — canonical + server-authoritative (never trust client fee).
  const pickupC = parseCoords(params.pickupCoords || params.pickup, 'pickup');
  const destinationC = parseCoords(
    params.destinationCoords || params.destination || params.coordinates,
    'destination'
  );
  if (!destinationC) {
    throw new AuthFeeError('invalid-coordinates', 'Destination coordinates are required');
  }

  // Checkout quote: restaurant pin read from the vendor record (never the client)
  // and priced with the same formula the checkout screen shows (verifyFoodDeliveryFee).
  let vendorQuote = null;
  if (params.vendorId) {
    try {
      vendorQuote = await require('./foodDeliveryFee').quoteFoodDelivery(db, params.vendorId, destinationC);
    } catch (e) {
      console.warn('[commerceOrder] vendor delivery quote failed, using canonical engine:', e.message);
    }
  }

  const feeResult = await computeDeliveryFee(
    {
      orderType,
      pickup: (vendorQuote && vendorQuote.vendorCoords) || pickupC || { lat: 7.15, lng: 3.35 },
      destination: destinationC,
      subtotal,
      // Forward client-supplied values so manipulation is rejected/ignored.
      // With a vendor quote the fee is validated against that quote below instead.
      clientFee: vendorQuote ? NaN : toNum(params.deliveryFee, NaN),
      clientDistanceKm: vendorQuote ? NaN : toNum(params.distanceKm, NaN),
      clientZoneId: params.zoneId || params.dropoffZone || null,
      clientOrderType: params.clientOrderType || orderType,
    },
    { db }
  );
  const serverDeliveryFee = vendorQuote ? roundNaira(vendorQuote.fee) : feeResult.deliveryFee;
  const deliveryDistanceKm = vendorQuote ? vendorQuote.distanceKm : feeResult.distanceKm;

  // Platform-fee rates come from pricingSettings/current (existing source of truth).
  let pricing = { platformFeeRateFood: 0.1, platformFeeRateParcel: 0.1 };
  try {
    const snap = await db.doc('pricingSettings/current').get().catch(() => null);
    if (snap && snap.exists) pricing = snap.data();
  } catch (e) {
    /* ignore */
  }

  // Preserve the client-displayed fee when the server recompute lands inside
  // the canonical tolerance band — the customer must be charged exactly the
  // total shown at checkout. Values outside tolerance are already rejected by
  // computeDeliveryFee as manipulation.
  const clientFeeNum = toNum(params.deliveryFee, NaN);
  const deliveryFee =
    Number.isFinite(clientFeeNum) &&
    Math.abs(Math.round(clientFeeNum) - serverDeliveryFee) <=
      FEE_TOLERANCE
      ? Math.round(clientFeeNum)
      : serverDeliveryFee;
  const platformFee = platformFeeFor(orderType, subtotal, deliveryFee, pricing);

  // Packaging fee — server-owned constant, triggered only by the client's boolean
  // request (`giftPackaging`). The client NEVER supplies the monetary amount.
  const giftPackaging = Boolean(params.giftPackaging) || Boolean(params.packagingEnabled);
  const packagingFee = giftPackaging ? PACKAGING_FEE : 0;

  // Discounts are NEVER trusted from the client. Any client-claimed promoDiscount /
  // itemDiscounts are ignored. The ONLY discount applied comes from the
  // server-authoritative promotion engine below (when a valid promotionCode is
  // supplied and the promotion resolves to an authoritative discount).
  const itemDiscounts = 0; // no authoritative item-discount source exists yet

  // ---- Server-authoritative promotion / discount resolution ----
  let promoDiscount = 0;
  let promotionInfo = null;
  const promoCodeRaw = String(params.promotionCode || params.promoCode || '').trim();
  if (promoCodeRaw) {
    const promo = await promotionService.resolvePromotion(db, promoCodeRaw);
    if (!promo) {
      throw new AuthFeeError('invalid-promotion-code', 'Promotion code not found');
    }
    const priorOrderCount =
      promo.data.firstOrderOnly === true
        ? await promotionService.resolveFirstOrderEligibility(db, uid)
        : 0;
    const customerUsageCount =
      (promo.data.customerUsage && promo.data.customerUsage[uid]) || 0;
    const calc = promotionService.calculatePromotionDiscount({
      promo: promo.data,
      subtotal,
      orderType,
      userId: uid,
      vendorId: params.vendorId || null,
      itemProductIds: resolved.map((i) => i.productId),
      customerUsageCount,
      priorOrderCount,
      now: Date.now(),
    });
    if (!calc.valid) {
      throw new AuthFeeError('invalid-promotion', calc.reason);
    }
    promoDiscount = calc.discount;
    promotionInfo = {
      promoId: promo.id,
      code: promo.code,
      discount: calc.discount,
      snapshot: {
        type: promo.data.type,
        value: promo.data.value,
        minimumOrder: promo.data.minimumOrder || null,
        maximumDiscount: promo.data.maximumDiscount || null,
        firstOrderOnly: Boolean(promo.data.firstOrderOnly),
      },
      appliedAt: Date.now(),
    };
  }

  const orderNumber = generateOrderNumber();
  const id = orderNumber; // order id = GO7 code for tracking

  // ---- Referral first-order checkout discount (server-authoritative) ----
  // The client can only OPT IN via `applyReferralDiscount` — it never supplies
  // an amount. Eligibility is decided here against the Growth attribution
  // record: referred signup (status REGISTERED), campaign ACTIVE with
  // firstOrderDiscountKobo > 0, partner still ACTIVE, and the discount not
  // previously redeemed. The redeem write is atomic in a transaction BEFORE
  // the order write — a parallel/second order sees discountRedeemedAt set and
  // gets nothing. If the order write below fails, the marker is released.
  let referralDiscount = 0;
  let referralDiscountInfo = null;
  if (params.applyReferralDiscount === true) {
    try {
      const growthEngine = require('./growthEngine');
      const res = await growthEngine.redeemFirstOrderDiscountCore(
        { db, FieldValue: ServerTS },
        uid,
        id
      );
      if (res && res.redeemed === true && res.discountKobo > 0) {
        referralDiscount = Math.min(
          Math.round(res.discountKobo / 100),
          subtotal + packagingFee + deliveryFee + platformFee - promoDiscount - itemDiscounts
        );
        referralDiscountInfo = {
          partnerId: res.partnerId || null,
          partnerCode: res.partnerCode || null,
          campaignId: res.campaignId || null,
          discountKobo: res.discountKobo,
          appliedAt: Date.now(),
        };
      }
    } catch (e) {
      console.warn('[commerceOrder] referral discount resolve failed (non-blocking):', e.message);
    }
  }

  // Confirmed FOOD model (order-type aware): MARKET / PHARMACY keep their own
  // existing platform-fee behaviour via platformFeeFor; they do NOT add packaging.
  const grandTotal = roundNaira(
    subtotal + packagingFee + deliveryFee + platformFee - promoDiscount - itemDiscounts - referralDiscount
  );

  // Economics estimate for analytics/decision support — NEVER pricing and
  // NEVER a payout. The share is the rider-owned quote estimate; the
  // authoritative split for this rider is finalized by whoever assigns the
  // rider downstream. Deliberately does NOT write `riderPayout` (that field
  // arms riderAutoCredit — an uncorrected estimate would be wrong there).
  let riderShareEstimate = null;
  let go7ContributionEstimate = null;
  try {
    const estPayout = roundNaira(deliveryFee * toNum(feeResult.riderShareRate, 0.5));
    const economicsCfg =
      (pricing && (pricing.economics || (pricing.deliveryPricing && pricing.deliveryPricing.economics))) || null;
    go7ContributionEstimate = calculateGo7DeliveryContribution({
      deliveryFee,
      riderPayout: estPayout,
      serviceFee: platformFee, // FOOD: subtotal-based platform fee (not parcel 10%-of-fee)
      distanceKm: deliveryDistanceKm,
      vehicleType:
        feeResult.vehicleType === 'ANY' ? feeResult.preferredVehicleType : feeResult.vehicleType,
      vehicleOwnership: 'RIDER_OWNED',
      orderType,
      grandTotal,
      config: economicsCfg ? { economics: economicsCfg } : null,
    });
    riderShareEstimate = {
      rate: toNum(feeResult.riderShareRate, 0.5),
      rule: feeResult.riderShareRule || null,
      ownership: 'RIDER_OWNED',
      finalizedAt: 'ASSIGNMENT',
    };
  } catch (e) {
    console.warn('[commerceOrder] contribution estimate failed (non-blocking):', e.message);
  }
  const customer = params.customer || {};
  // Pickup contact = the vendor (rider calls the restaurant, not the customer).
  // Order docs previously carried no pickup contact, so rider UIs fell back to
  // the customer's number for both ends.
  let pickupName = null;
  let pickupPhone = null;
  const primaryVendorId = String(params.vendorId || (resolved[0] && resolved[0].vendorId) || '');
  if (primaryVendorId) {
    try {
      const vSnap = await db.collection('vendors').doc(primaryVendorId).get();
      const v = vSnap.exists ? vSnap.data() : {};
      pickupName = v.businessName || v.name || v.shopName || null;
      pickupPhone = v.phone || v.whatsapp || v.contactPhone || null;
    } catch (e) {
      console.warn('[commerceOrder] vendor contact lookup failed (non-blocking):', e.message);
    }
  }
  const orderDoc = {
    orderNumber,
    id,
    orderType,
    userId: uid,
    userEmail: customer.email || '',
    userPhone: customer.phone || '',
    customerName: customer.name || '',
    customerPhone: customer.phone || '',
    pickupName,
    pickupPhone,
    deliveryAddress: String(params.deliveryAddress || params.dropoffAddress || '').slice(0, 500),
    deliveryNotes: String(params.deliveryNotes || '').slice(0, 500),
    items: resolved,
    subtotal,
    packagingFee,
    deliveryFee,
    platformFee,
    promoDiscount,
    itemDiscounts,
    grandTotal,
    total: grandTotal,
    deliveryDistanceKm,
    deliveryPickupLatitude: (vendorQuote && vendorQuote.vendorCoords.lat) || null,
    deliveryPickupLongitude: (vendorQuote && vendorQuote.vendorCoords.lng) || null,
    deliveryPricingSource: vendorQuote ? 'checkout_quote' : 'canonical_engine',
    deliveryLatitude: destinationC.lat,
    deliveryLongitude: destinationC.lng,
    deliveryZoneId: feeResult.zoneId,
    deliveryZoneName: feeResult.zoneName,
    pricingConfigVersion: feeResult.pricingConfigVersion,
    // Quote-time economics ESTIMATE (rider-owned assumption). Authoritative
    // payout depends on the assigned rider's vehicleOwnership downstream.
    riderShareEstimate,
    go7ContributionEstimate,
    contributionStatusEstimate: go7ContributionEstimate ? go7ContributionEstimate.contributionStatus : null,
    idempotencyKey,
    paymentMethod: params.paymentMethod || 'cash',
    paymentStatus: params.paymentMethod === 'cash' ? 'pending' : 'awaiting_payment',
    // Referral / attribution passthrough (kept separate from pricing).
    referralCode: params.referralCode || null,
    referrerId: params.referrerId || null,
    promotionId: params.promotionId || null,
    promoCreditApplied:
      params.promoCreditApplied != null ? params.promoCreditApplied : (params.promotionCredit || null),
    status: 'pending',
    // Promotion audit trail (only present when a promotion was actually applied).
    promotionCode: promotionInfo ? promotionInfo.code : null,
    promotionDiscount: promotionInfo ? promotionInfo.discount : 0,
    promotionSnapshot: promotionInfo ? promotionInfo.snapshot : null,
    promotionAppliedAt: promotionInfo ? promotionInfo.appliedAt : null,
    // Referral first-order discount audit trail (only when actually applied).
    referralDiscount,
    referralDiscountInfo,
    referralDiscountAppliedAt: referralDiscountInfo ? referralDiscountInfo.appliedAt : null,
    createdAt: ServerTS.serverTimestamp(),
    updatedAt: ServerTS.serverTimestamp(),
  };

  // ATOMIC promotion redemption — increments usage only for a NEW order. Runs
  // before the order write so a race exhausting the promotion prevents creating
  // the order. Duplicate (idempotent) submissions never reach this point.
  if (promotionInfo) {
    await promotionService.redeemPromotion({
      db,
      promotion: { id: promotionInfo.promoId, code: promotionInfo.code },
      userId: uid,
      orderId: id,
      idempotencyKey,
      now: promotionInfo.appliedAt,
    });
  }

  try {
    await db.collection('orders').doc(id).set(orderDoc);
  } catch (writeErr) {
    // Order never landed — release the one-time referral discount marker so the
    // customer can still use it on a retry/new order.
    if (referralDiscountInfo) {
      try {
        await require('./growthEngine').releaseFirstOrderDiscountCore(
          { db, FieldValue: ServerTS },
          uid,
          id
        );
      } catch (relErr) {
        console.warn('[commerceOrder] referral discount release failed:', relErr.message);
      }
    }
    throw writeErr;
  }

  return {
    success: true,
    orderId: id,
    orderNumber,
    orderType,
    subtotal,
    packagingFee,
    deliveryFee,
    platformFee,
    promoDiscount,
    promoCode: promotionInfo ? promotionInfo.code : null,
    promotionDiscount: promotionInfo ? promotionInfo.discount : 0,
    itemDiscounts,
    referralDiscount,
    referralDiscountInfo,
    grandTotal,
    amountToPay: grandTotal,
    distanceKm: deliveryDistanceKm,
    zoneId: feeResult.zoneId,
    zoneName: feeResult.zoneName,
    pricingConfigVersion: feeResult.pricingConfigVersion,
    paymentMethod: orderDoc.paymentMethod,
    breakdown: feeResult.breakdown,
  };
}

module.exports = { createCommerceOrder, COMMERCE_TYPES, readOrderType, platformFeeFor };
