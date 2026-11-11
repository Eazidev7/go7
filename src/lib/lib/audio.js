/**
 * Audio feedback utilities for order notifications
 */

let audioContext = null;
let userHasInteracted = false;

// Initialize audio context after user interaction
export function initAudio() {
  if (!audioContext && window.AudioContext) {
    audioContext = new AudioContext();
    userHasInteracted = true;
  }
}

/**
 * Play a notification beep
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in milliseconds
 */
export function playBeep(frequency = 800, duration = 200) {
  if (!audioContext || !userHasInteracted) {
    console.debug('Audio not initialized or no user interaction yet');
    return;
  }

  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration / 1000);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (error) {
    console.warn('Failed to play audio:', error);
  }
}

/**
 * Predefined notification sounds
 */
export const sounds = {
  // New order notification (two-tone)
  newOrder: () => {
    if (!userHasInteracted) return;
    playBeep(800, 150);
    setTimeout(() => playBeep(1000, 150), 200);
  },
  
  // Success sound
  success: () => playBeep(1200, 100),
  
  // Error/warning sound
  error: () => {
    if (!userHasInteracted) return;
    playBeep(400, 200);
    setTimeout(() => playBeep(300, 200), 250);
  },
  
  // Countdown tick
  tick: () => playBeep(600, 50),
  
  // Final warning
  warning: () => {
    if (!userHasInteracted) return;
    playBeep(1400, 100);
    setTimeout(() => playBeep(1400, 100), 150);
    setTimeout(() => playBeep(1400, 100), 300);
  }
};

// Initialize audio on first user interaction
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('touchstart', initAudio, { once: true });

/**
 * Play notification sound for order events
 * @param {string} type - Type of notification (new_order, success, error, etc.)
 */
export function playNotificationSound(type = 'newOrder') {
  if (sounds[type]) {
    sounds[type]();
  } else {
    // Default notification sound
    sounds.newOrder();
  }
}
