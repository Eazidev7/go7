/**
 * Go7 customer app — notification sounds.
 *
 * Before this module existed, every sound in the app was an inline
 * `new Audio('/sounds/…').play()` wrapped in a try/catch. Three problems with that:
 *
 *  1. The audio files did not exist, so every call failed silently.
 *  2. Two call sites pointed at `/assets/sounds/…` instead of `/sounds/…`, so even
 *     with the files present they would still 404.
 *  3. `new Audio().play()` is blocked by browser autoplay policy until the user has
 *     interacted with the page — so sounds would stay silent for most sessions.
 *
 * This module owns all three: one place for the paths, one place for the unlock,
 * one place for the mute preference.
 */

/** Every tone shipped in /public/sounds. */
export const SOUNDS = {
  NOTIFICATION: 'notification',
  NOTIFY: 'notify',
  SUCCESS: 'success',
  ERROR: 'error',
  ORDER_ASSIGNED: 'order-assigned',
  STATUS_UPDATE: 'status-update',
  ORDER_COMPLETE: 'order-complete',
  LOCATION_PING: 'location-ping',
  CHAT: 'chat',
  NEW_JOB: 'new-job',
  JOB_CANCELLED: 'job-cancelled',
  EARNINGS_CREDITED: 'earnings-credited',
};

/** Mix levels — confirmation tones sit forward, ambient pings sit back. */
const VOLUME = {
  success: 0.45,
  error: 0.5,
  'order-complete': 0.5,
  'order-assigned': 0.5,
  notify: 0.4,
  notification: 0.4,
  chat: 0.35,
  'location-ping': 0.25,
};
const DEFAULT_VOLUME = 0.4;

const STORAGE_KEY = 'go7_sound_enabled';

const soundUrl = (name) =>
  `${import.meta.env.BASE_URL}sounds/${name}.mp3`.replace(/([^:]\/)\/+/g, '$1');

class SoundService {
  constructor() {
    this.cache = new Map();
    this.enabled = true;
    this.unlocked = false;
    this.unlockInstalled = false;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) this.enabled = stored !== 'false';
    } catch {
      /* localStorage unavailable — default to enabled */
    }
  }

  isEnabled() {
    return this.enabled;
  }

  /** Mute / unmute. Persists across launches. */
  setEnabled(value) {
    this.enabled = Boolean(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(this.enabled));
    } catch {
      /* ignore */
    }
    if (!this.enabled) this.stopAll();
  }

  element(name) {
    let el = this.cache.get(name);
    if (!el) {
      el = new Audio(soundUrl(name));
      el.preload = 'auto';
      el.volume = VOLUME[name] ?? DEFAULT_VOLUME;
      this.cache.set(name, el);
    }
    return el;
  }

  /** Preload a tone so the first real alert has no delay. */
  warm(name) {
    try {
      this.element(name).load();
    } catch {
      /* ignore */
    }
  }

  /**
   * Prime audio on the first genuine user gesture. Browsers only grant audio to
   * a document with user activation, and the play() attempt must happen inside
   * the gesture handler — so it happens here, not lazily at notification time.
   */
  installUnlock() {
    if (this.unlockInstalled || typeof window === 'undefined') return;
    this.unlockInstalled = true;

    const events = ['pointerdown', 'touchstart', 'keydown'];
    const once = () => {
      if (!this.unlocked) {
        this.unlocked = true;
        const el = this.element(SOUNDS.NOTIFY);
        const previous = el.volume;
        el.volume = 0;
        const done = () => {
          el.pause();
          el.currentTime = 0;
          el.volume = previous;
        };
        const attempt = el.play();
        if (attempt && typeof attempt.then === 'function') {
          attempt.then(done).catch(done);
        } else {
          done();
        }
      }
      events.forEach((e) => window.removeEventListener(e, once));
    };
    events.forEach((e) => window.addEventListener(e, once, { passive: true }));
  }

  /** Play a one-shot tone. Never throws, never surfaces an error to the user. */
  play(name, options = {}) {
    if (!this.enabled) return;
    const tone = SOUNDS[name] ? name : name;
    try {
      const el = this.element(tone);
      if (options.restart !== false) el.currentTime = 0;
      const attempt = el.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => {
          /* autoplay blocked or file missing — silent by design */
        });
      }
    } catch {
      /* ignore */
    }
  }

  stopAll() {
    this.cache.forEach((el) => {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    });
  }

  /**
   * Map the app's notification severity (info/success/warning/error) to a tone.
   * Used by NotificationContext so all in-app alerts sound consistent.
   */
  playForType(type) {
    switch (type) {
      case 'success':
        this.play(SOUNDS.SUCCESS);
        break;
      case 'error':
        this.play(SOUNDS.ERROR);
        break;
      case 'warning':
        this.play(SOUNDS.NOTIFY);
        break;
      default:
        this.play(SOUNDS.NOTIFICATION);
    }
  }
}

export const soundService = new SoundService();

/** Convenience export used by the legacy alert helpers. */
export const playSound = (name) => soundService.play(name);

export default soundService;
