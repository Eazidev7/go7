/**
 * Normalize Firestore Timestamp | Date | ISO string | millis | {seconds}.
 * Migrated docs may store dates as strings (JSON remount), not Timestamp.
 */
export function toJsDate(value, fallback = new Date()) {
  if (value == null) return fallback;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value;
  }
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      return fallback;
    }
  }
  if (typeof value === 'object' && value.seconds != null) {
    const seconds = Number(value.seconds);
    if (Number.isFinite(seconds)) return new Date(seconds * 1000);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? fallback : d;
  }
  return fallback;
}
