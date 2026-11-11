const LEGACY_BLOCKED_STORAGE_HOST = 'go7-delivery.firebasestorage.app';

/**
 * Normalize stored media URLs for display. Does not rewrite Firestore data.
 * Legacy go7-delivery Storage URLs return HTTP 402 (billing) — skip them so UI
 * can fall back to placeholders until the vendor re-uploads via go7.ng/uploads.
 */
export function normalizeMediaUrl(url) {
  if (typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.includes('placeholder') || trimmed.includes('via.placeholder')) return null;
  if (trimmed.includes(LEGACY_BLOCKED_STORAGE_HOST)) return null;

  if (trimmed.startsWith('/uploads/')) {
    return `https://go7.ng${trimmed}`;
  }

  if (trimmed.startsWith('uploads/')) {
    return `https://go7.ng/${trimmed}`;
  }

  return trimmed;
}

/**
 * Resolve a vendor's uploaded logo URL only — never fabricate a profile image.
 */
export function resolveVendorImage(vendor = {}) {
  if (!vendor || typeof vendor !== 'object') return null;

  const candidates = [
    vendor.profileImage,
    vendor.businessLogo,
    vendor.imageUrl,
    vendor.image,
    vendor.logo,
    vendor.coverImage,
    vendor.bannerImage,
  ];

  for (const value of candidates) {
    const normalized = normalizeMediaUrl(value);
    if (normalized) return normalized;
  }

  return null;
}
/**
 * Whether a vendor card has a real logo URL.
 * Listing UIs must not hide vendors when this is false — use placeholders instead.
 */
export function hasValidVendorImage(vendor = {}) {
  return Boolean(resolveVendorImage(vendor));
}
