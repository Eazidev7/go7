/**
 * Vibration utilities for mobile feedback
 */

/**
 * Trigger device vibration (mobile only)
 * @param {number|Array} pattern - Duration in ms or pattern array
 */
export function buzz(pattern = 60) {
  if (!navigator.vibrate) {
    console.debug('Vibration not supported on this device');
    return false;
  }

  try {
    navigator.vibrate(pattern);
    return true;
  } catch (error) {
    console.warn('Vibration failed:', error);
    return false;
  }
}

/**
 * Predefined vibration patterns
 */
export const VIBRATION_PATTERNS = {
  // Quick notification
  NOTIFICATION: 60,
  
  // New order alert (short-long-short)
  NEW_ORDER: [100, 50, 200, 50, 100],
  
  // Success feedback
  SUCCESS: [80, 40, 80],
  
  // Error/warning
  ERROR: [200, 100, 200, 100, 200],
  
  // Countdown tick
  TICK: 30,
  
  // Final countdown warning
  WARNING: [150, 100, 150],
};

/**
 * Convenience functions for common patterns
 */
export const vibe = {
  notification: () => buzz(VIBRATION_PATTERNS.NOTIFICATION),
  newOrder: () => buzz(VIBRATION_PATTERNS.NEW_ORDER),
  success: () => buzz(VIBRATION_PATTERNS.SUCCESS),
  error: () => buzz(VIBRATION_PATTERNS.ERROR),
  tick: () => buzz(VIBRATION_PATTERNS.TICK),
  warning: () => buzz(VIBRATION_PATTERNS.WARNING),
};
