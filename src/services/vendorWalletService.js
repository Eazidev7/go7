import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { creditVendorOrderEarnings } from "../utils/vendorWalletUtils";

const COMPLETE_STATUSES = new Set(["delivered", "completed"]);

/**
 * Credit vendor earnings after delivery if not already done.
 * Safe to call from multiple code paths — idempotent per order.
 */
export async function creditVendorIfOrderCompleted(orderId, partialOrder = null) {
  try {
    let orderData = partialOrder;

    if (!orderData?.vendorId) {
      const orderSnap = await getDoc(doc(db, "orders", orderId));
      if (!orderSnap.exists()) {
        return { skipped: true, reason: "order_not_found" };
      }
      orderData = { id: orderId, ...orderSnap.data() };
    }

    const status = orderData.status || orderData.orderStatus;
    if (!COMPLETE_STATUSES.has(status)) {
      return { skipped: true, reason: "not_complete" };
    }

    return await creditVendorOrderEarnings(orderId, orderData);
  } catch (error) {
    if (error.message === "ALREADY_CREDITED") {
      return { skipped: true, reason: "already_credited" };
    }
    console.error("vendorWalletService.creditVendorIfOrderCompleted:", error);
    return { error: error.message };
  }
}
