import { Capacitor } from '@capacitor/core';

function readEnvInset(name) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`env(${name})`).trim();
  const px = parseFloat(raw);
  return Number.isFinite(px) ? px : 0;
}

function estimateAndroidInsets() {
  const screenH = window.screen.height;
  const innerH = window.innerHeight;
  const gap = Math.max(0, screenH - innerH);

  let top = readEnvInset('safe-area-inset-top');
  let bottom = readEnvInset('safe-area-inset-bottom');

  if (top < 1) top = 28;
  if (bottom < 1) {
    bottom = gap > top ? gap - top : 48;
  }

  return { top, bottom };
}

export function applySafeAreaVars() {
  const root = document.documentElement;
  const platform = Capacitor.getPlatform();

  let top = readEnvInset('safe-area-inset-top');
  let bottom = readEnvInset('safe-area-inset-bottom');

  if (platform === 'android') {
    const est = estimateAndroidInsets();
    if (top < 1) top = est.top;
    if (bottom < 1) bottom = est.bottom;
  }

  if (platform === 'ios') {
    if (top < 1) top = 44;
    if (bottom < 1) bottom = 34;
  }

  root.style.setProperty('--go7-safe-top', `${Math.round(top)}px`);
  root.style.setProperty('--go7-safe-bottom', `${Math.round(bottom)}px`);
}

export async function initCapacitorSafeArea() {
  if (!Capacitor.isNativePlatform()) return;

  document.documentElement.classList.add('capacitor-native', `platform-${Capacitor.getPlatform()}`);

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#E53935' });
    }
  } catch (err) {
    console.warn('[Go7] StatusBar plugin unavailable:', err?.message || err);
  }

  applySafeAreaVars();

  window.addEventListener('resize', applySafeAreaVars);
  window.addEventListener('orientationchange', applySafeAreaVars);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', applySafeAreaVars);
  }
}
