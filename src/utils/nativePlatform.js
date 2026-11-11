/** Detect if Go7 is running inside a Capacitor native shell (Android/iOS). */

export function isCapacitorNative() {
  return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;
}

export function getNativePlatform() {
  if (!isCapacitorNative()) return 'web';
  return window.Capacitor.getPlatform(); // 'android' | 'ios'
}

export function isAndroidApp() {
  return getNativePlatform() === 'android';
}

export function isIosApp() {
  return getNativePlatform() === 'ios';
}
