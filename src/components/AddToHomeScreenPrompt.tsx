import React, { useState, useEffect } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';
import { isCapacitorNative } from '../utils/nativePlatform';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function detectIOSDevice() {
  const ua = window.navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=g.go7.app';

function isAndroidDevice() {
  return /android/i.test(window.navigator.userAgent);
}

/** True Safari on iOS (not Chrome/Instagram/FB in-app). */
function isIOSSafari() {
  const ua = window.navigator.userAgent;
  if (!detectIOSDevice()) return false;
  const isSafari =
    /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/i.test(ua);
  const isWebView = /(Instagram|FBAN|FBAV|Line|Twitter|LinkedInApp)/i.test(ua);
  return isSafari && !isWebView;
}

const AddToHomeScreenPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [iosIsSafari, setIosIsSafari] = useState(true);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showPlayPrompt, setShowPlayPrompt] = useState(false);
  const isMobile = useIsMobile();
  const [forceShow, setForceShow] = useState(false);
  const onboardingDone =
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('go7_onboarding_complete') === 'true';

  useEffect(() => {
    const checkInstalled = () => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    if (checkInstalled() || isCapacitorNative()) return undefined;

    const ios = detectIOSDevice();
    setIsIOS(ios);
    setIosIsSafari(isIOSSafari());

    const readyForInstallHint = () =>
      localStorage.getItem('go7_onboarding_complete') === 'true' ||
      localStorage.getItem('go7_figma_seen') === '1';

    // iOS: show install how-to after splash (Safari can Add to Home Screen)
    if (ios && !localStorage.getItem('go7-ios-prompt-dismissed') && readyForInstallHint()) {
      setTimeout(() => setShowIOSPrompt(true), 1400);
    }

    // Android browsers: offer the real app on Google Play
    const android = isAndroidDevice();
    if (android && !localStorage.getItem('go7-play-prompt-dismissed') && readyForInstallHint()) {
      setTimeout(() => setShowPlayPrompt(true), 1400);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      if (android) return; // Android gets the Google Play prompt instead
      // Chrome desktop-class tablets: show after home splash once, unless dismissed
      if (readyForInstallHint() && !localStorage.getItem('go7-install-prompt-dismissed')) {
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setShowIOSPrompt(false);
      localStorage.setItem('go7-ios-prompt-dismissed', 'true');
      localStorage.setItem('go7-install-prompt-dismissed', 'true');
      if (window.gtag) {
        window.gtag('event', 'pwa_install', { event_category: 'PWA', event_label: 'success' });
      }
    };

    const handleShowInstall = () => {
      localStorage.removeItem('go7-install-prompt-dismissed');
      localStorage.removeItem('go7-ios-prompt-dismissed');
      localStorage.removeItem('go7-play-prompt-dismissed');
      setForceShow(true);
      if (isAndroidDevice()) {
        setShowPlayPrompt(true);
      } else if (detectIOSDevice()) {
        setIsIOS(true);
        setIosIsSafari(isIOSSafari());
        setShowIOSPrompt(true);
      } else {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('go7-show-install-prompt', handleShowInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('go7-show-install-prompt', handleShowInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setIsInstalled(true);
      } else {
        localStorage.setItem('go7-install-prompt-dismissed', 'true');
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('Install prompt failed', err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setForceShow(false);
    localStorage.setItem('go7-install-prompt-dismissed', 'true');
  };

  const handlePlayDismiss = () => {
    setShowPlayPrompt(false);
    setForceShow(false);
    localStorage.setItem('go7-play-prompt-dismissed', 'true');
  };

  const handleIOSDismiss = () => {
    setShowIOSPrompt(false);
    setForceShow(false);
    localStorage.setItem('go7-ios-prompt-dismissed', 'true');
  };

  const copySafariLink = async () => {
    try {
      await navigator.clipboard.writeText('https://go7.ng');
    } catch {
      /* ignore */
    }
  };

  if (isCapacitorNative()) return null;

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isTabletOrPhone =
    isMobile ||
    /iphone|ipad|ipod/i.test(ua) ||
    (typeof navigator !== 'undefined' &&
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1);

  const seenHome =
    onboardingDone ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('go7_figma_seen') === '1');

  if (isInstalled || !isTabletOrPhone) return null;
  if (!seenHome && !forceShow && !showIOSPrompt && !showPlayPrompt) return null;

  if (showPlayPrompt) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 mx-auto max-w-sm">
          <div className="flex items-start space-x-3">
            <img
              src="/icons/icon-192.png"
              alt="Go7"
              className="w-12 h-12 rounded-xl flex-shrink-0 object-cover bg-[#e60023]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/apple-touch-icon.png';
              }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Get the Go7 app</h3>
              <p className="text-xs text-gray-600 mb-3 leading-tight">
                Download Go7 from Google Play for faster ordering, live tracking and notifications.
              </p>
              <div className="flex space-x-2">
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    localStorage.setItem('go7-play-prompt-dismissed', 'true');
                    setShowPlayPrompt(false);
                    if (window.gtag) {
                      window.gtag('event', 'play_store_click', { event_category: 'App', event_label: 'web_prompt' });
                    }
                  }}
                  className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium text-center"
                >
                  Get it on Google Play
                </a>
                <button type="button" onClick={handlePlayDismiss} className="px-3 py-2 text-gray-500 text-sm">
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showPrompt && !isIOS) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 mx-auto max-w-sm">
          <div className="flex items-start space-x-3">
            <img
              src="/icons/icon-192.png"
              alt="Go7"
              className="w-12 h-12 rounded-xl flex-shrink-0 object-cover bg-[#e60023]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/apple-touch-icon.png';
              }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Install Go7 App</h3>
              <p className="text-xs text-gray-600 mb-3 leading-tight">
                {deferredPrompt
                  ? 'Add Go7 to your home screen for faster ordering and live tracking.'
                  : 'Browser menu → Install app / Add to Home screen.'}
              </p>
              <div className="flex space-x-2">
                {deferredPrompt ? (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
                  >
                    Install App
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
                  >
                    Got it
                  </button>
                )}
                <button type="button" onClick={handleDismiss} className="px-3 py-2 text-gray-500 text-sm">
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showIOSPrompt && isIOS) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-[100050] animate-slide-up">
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-100 p-4 mx-auto max-w-sm">
          <div className="flex items-center gap-3 mb-3">
            <img
              src="/apple-touch-icon.png"
              alt="Go7"
              className="w-12 h-12 rounded-xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/go7-logo.png';
              }}
            />
            <div>
              <h3 className="text-sm font-bold text-gray-900">Install Go7 on iPhone</h3>
              <p className="text-[11px] text-gray-500">Adds the real app icon to your Home Screen</p>
            </div>
          </div>

          {!iosIsSafari ? (
            <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-left">
              <p className="text-xs text-amber-900 font-semibold mb-1">Open in Safari first</p>
              <p className="text-[11px] text-amber-800 mb-2 leading-snug">
                iPhone only allows Add to Home Screen from Safari. Chrome / Instagram / Facebook in-app
                browsers cannot install.
              </p>
              <ol className="text-[11px] text-amber-900 list-decimal pl-4 space-y-1 mb-2">
                <li>Copy the link below</li>
                <li>Open the Safari app</li>
                <li>Paste go7.ng and follow the steps</li>
              </ol>
              <button
                type="button"
                onClick={copySafariLink}
                className="w-full bg-amber-600 text-white py-2 rounded-lg text-xs font-semibold"
              >
                Copy go7.ng
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 text-left mb-3">
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <p className="text-xs text-gray-700 pt-0.5">
                  Tap the <strong>Share</strong> button{' '}
                  <span className="inline-flex align-middle text-blue-600" aria-hidden>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92S19.61 16.08 18 16.08z" />
                    </svg>
                  </span>{' '}
                  at the bottom of Safari
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <p className="text-xs text-gray-700 pt-0.5">
                  Scroll and tap <strong>Add to Home Screen</strong>
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <p className="text-xs text-gray-700 pt-0.5">
                  Tap <strong>Add</strong> — Go7 appears like an app
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleIOSDismiss}
            className="w-full bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AddToHomeScreenPrompt;
