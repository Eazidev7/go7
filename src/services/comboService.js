// GO7 Combo Rush Service - Vendor dashboard → customer homepage

import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config.js';
import { isVendorPubliclyVisible } from '../utils/vendorVisibility';
import { normalizeMediaUrl, resolveVendorImage } from '../utils/vendorImage';

function normalizeComboDoc(comboDoc, vendorDoc) {
  const comboData = comboDoc.data() || {};
  const vendor = vendorDoc?.data?.() || vendorDoc || {};
  const vendorId = vendorDoc?.id || comboData.vendorId;
  const originalPrice = Number(comboData.originalPrice ?? comboData.price ?? 0);
  const comboPrice = Number(comboData.comboPrice ?? comboData.price ?? originalPrice);
  const savings = Number.isFinite(Number(comboData.savings))
    ? Number(comboData.savings)
    : Math.max(0, originalPrice - comboPrice);
  const items = Array.isArray(comboData.items) ? comboData.items : [];

  return {
    id: comboDoc.id,
    name: comboData.name || 'Combo',
    vendor: vendor.businessName || vendor.name || comboData.vendorName || 'Vendor',
    vendorLogo: resolveVendorImage(vendor),
    image: normalizeMediaUrl(comboData.image || comboData.imageUrl || '') || null,
    items: items.map((item) => ({
      name: item?.name || 'Item',
      quantity: item?.quantity || 1,
    })),
    originalPrice,
    comboPrice,
    price: comboPrice,
    savings,
    rating: comboData.rating || vendor.rating || 4.5,
    timeLeft: Number(comboData.timeLeft ?? 120) || 120,
    soldCount: Number(comboData.soldCount) || 0,
    category: comboData.category || 'combo',
    description: comboData.description || '',
    vendorId,
  };
}

async function fetchActiveCombosForVendor(vendorId) {
  const combosRef = collection(db, 'vendors', vendorId, 'combos');
  try {
    const combosQuery = query(combosRef, where('isActive', '==', true));
    return await getDocs(combosQuery);
  } catch (err) {
    console.warn(`Combo query failed for ${vendorId}, falling back:`, err?.message || err);
    const snap = await getDocs(combosRef);
    return {
      docs: snap.docs.filter((d) => d.data()?.isActive !== false),
    };
  }
}

export const comboService = {
  async getActiveComboDeals(limitCount = 10) {
    try {
      const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
      let allCombos = [];

      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendorData = vendorDoc.data();
        if (!isVendorPubliclyVisible(vendorData, vendorDoc.id)) {
          continue;
        }

        try {
          const combosSnapshot = await fetchActiveCombosForVendor(vendorDoc.id);

          const vendorCombos = combosSnapshot.docs
            .map((comboDoc) => normalizeComboDoc(comboDoc, vendorDoc))
            .filter((combo) => (combo.timeLeft ?? 0) > 0)
            // Require a real combo photo; vendor logo is optional (placeholder ok)
            .filter((combo) => Boolean(combo.image))
            .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
            .slice(0, 3);

          allCombos.push(...vendorCombos);
        } catch (vendorError) {
          console.warn(`Failed to load combos for vendor ${vendorDoc.id}:`, vendorError);
        }
      }

      allCombos.sort((a, b) => {
        const scoreA = (a.soldCount * 0.7) + ((120 - a.timeLeft) * 0.3);
        const scoreB = (b.soldCount * 0.7) + ((120 - b.timeLeft) * 0.3);
        return scoreB - scoreA;
      });

      return allCombos.slice(0, limitCount);
    } catch (error) {
      console.error('Error fetching combo deals:', error);
      return [];
    }
  },

  async getVendorComboDeals(vendorId) {
    try {
      if (!vendorId) return [];
      const snapshot = await fetchActiveCombosForVendor(vendorId);
      const vendorSnap = await getDoc(doc(db, 'vendors', vendorId));

      return snapshot.docs
        .map((comboDoc) =>
          normalizeComboDoc(
            comboDoc,
            vendorSnap.exists() ? vendorSnap : { id: vendorId, data: () => ({}) }
          )
        )
        .filter((combo) => (combo.timeLeft ?? 0) > 0);
    } catch (error) {
      console.error('Error fetching vendor combo deals:', error);
      return [];
    }
  },
};

export default comboService;
