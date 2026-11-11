/**
 * Mock events module to replace Node.js built-in 'events'
 * This prevents build errors when the events module is not needed in browser
 */

// Simple EventEmitter implementation for browser
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  once(event, listener) {
    const onceWrapper = (...args) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }

  emit(event, ...args) {
    if (!this.events[event]) return false;
    this.events[event].forEach(listener => listener(...args));
    return true;
  }

  off(event, listenerToRemove) {
    if (!this.events[event]) return this;
    this.events[event] = this.events[event].filter(
      listener => listener !== listenerToRemove
    );
    return this;
  }

  removeListener(event, listener) {
    return this.off(event, listener);
  }

  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
    return this;
  }

  listeners(event) {
    return this.events[event] || [];
  }

  listenerCount(event) {
    return this.listeners(event).length;
  }
}

// Utility function to wait for event once
export function once(emitter, event) {
  return new Promise((resolve) => {
    emitter.once(event, (...args) => {
      resolve(args.length === 1 ? args[0] : args);
    });
  });
}

// Export EventEmitter as default and named export
export { EventEmitter };
export default EventEmitter;
