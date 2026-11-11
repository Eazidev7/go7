/**
 * Device class helpers — phones + tablets use the lite mobile shell;
 * real desktop/laptop browsers use the marketing site.
 *
 * Never use window width alone: resizing a desktop browser must not switch to the phone app.
 */

export function isIPad() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iPad/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** Android tablet UA = "Android" without "Mobile". */
export function isAndroidTablet() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android/i.test(ua) && !/Mobile/i.test(ua);
}

/** iPad + Android tablets — lighter CustomerMobileShell, not the heavy desktop App. */
export function isTablet() {
  return isIPad() || isAndroidTablet();
}

/** True desktop/laptop OS — marketing/desktop site. Tablets are NOT desktop. */
export function isDesktopBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';

  // Phones + tablets never count as desktop
  if (/iPhone|iPod|Windows Phone|IEMobile|Opera Mini/i.test(ua)) return false;
  if (/Android/i.test(ua)) return false; // phone or tablet
  if (isIPad()) return false;

  return /Windows NT|Win64|Win32|Macintosh|Mac OS X|CrOS|X11|Linux/i.test(ua);
}

/**
 * Phones only. Tablets use isTablet(); desktop uses isDesktopBrowser().
 * Never return true just because a desktop window is narrow.
 */
export function isPhone() {
  if (typeof navigator === 'undefined') return false;
  if (isIPad() || isAndroidTablet()) return false;
  if (isDesktopBrowser()) return false;

  const ua = navigator.userAgent || '';

  if (/iPhone|iPod/i.test(ua)) return true;
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return true;
  if (/Windows Phone|IEMobile|Opera Mini/i.test(ua)) return true;

  // Rare unknown devices: coarse pointer + small screen only (not a resized desktop window)
  try {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (coarse && window.innerWidth < 768) return true;
  } catch {
    /* ignore */
  }

  return false;
}

/** Customer app (phone or tablet) — NOT desktop browser. */
export function isMobileOrTablet() {
  return isPhone() || isTablet();
}

export function isDesktopLike() {
  return !isMobileOrTablet();
}
