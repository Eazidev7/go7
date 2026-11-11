/**
 * Firebase Listener Management Utility
 * Prevents memory leaks from uncleaned Firestore listeners
 */

class ListenerManager {
  constructor() {
    this.listeners = new Map();
    this.componentUnsubscribers = new Map();
  }

  // Register a component's listeners
  registerComponent(componentId) {
    if (!this.componentUnsubscribers.has(componentId)) {
      this.componentUnsubscribers.set(componentId, []);
    }
  }

  // Add listener with auto-cleanup
  addListener(componentId, unsubscriber, description = 'Unknown listener') {
    if (!unsubscriber || typeof unsubscriber !== 'function') {
      console.warn('⚠️ Invalid unsubscriber provided:', description);
      return;
    }

    this.registerComponent(componentId);
    const listeners = this.componentUnsubscribers.get(componentId);
    
    listeners.push({
      unsubscribe: unsubscriber,
      description,
      timestamp: Date.now()
    });

    // Removed verbose logging to reduce console noise
  }

  // Clean up all listeners for a component
  cleanup(componentId) {
    const listeners = this.componentUnsubscribers.get(componentId);
    if (!listeners) return;

    let cleaned = 0;
    listeners.forEach(({ unsubscribe, description }) => {
      try {
        unsubscribe();
        cleaned++;
      } catch (error) {
        console.error(`❌ Error cleaning up listener: ${description}`, error);
      }
    });

    this.componentUnsubscribers.delete(componentId);
    // Cleaned ${cleaned} listeners for ${componentId} - logging reduced
  }

  // Clean up all listeners (emergency cleanup)
  cleanupAll() {
    let totalCleaned = 0;
    for (const [componentId, listeners] of this.componentUnsubscribers.entries()) {
      listeners.forEach(({ unsubscribe, description }) => {
        try {
          unsubscribe();
          totalCleaned++;
        } catch (error) {
          console.error(`❌ Error in emergency cleanup: ${description}`, error);
        }
      });
    }
    
    this.componentUnsubscribers.clear();
    if (totalCleaned > 0) {
      console.log(`🧹 Cleaned ${totalCleaned} listeners`);
    }
  }

  // Get active listener count
  getStats() {
    let totalListeners = 0;
    for (const listeners of this.componentUnsubscribers.values()) {
      totalListeners += listeners.length;
    }
    
    return {
      components: this.componentUnsubscribers.size,
      totalListeners,
      activeComponents: Array.from(this.componentUnsubscribers.keys())
    };
  }
}

// Global listener manager instance
const listenerManager = new ListenerManager();

// React hook for automatic listener management
export const useFirebaseListeners = (componentId) => {
  // This will be imported at the component level
  const registerListener = (name, unsubscriber) => {
    listenerManager.addListener(componentId, unsubscriber, name);
    return unsubscriber;
  };

  const cleanup = () => {
    listenerManager.cleanup(componentId);
  };

  return { registerListener, cleanup };
};

// Browser-safe error handler — log only, never hijack the UI for customers
export const setupProcessErrorHandling = () => {
  const ignored = (msg) =>
    !msg ||
    msg.includes('removeChild') ||
    msg.includes('insertBefore') ||
    msg.includes('_sw') ||
    msg.includes('_ne') ||
    msg.includes('latLng') ||
    msg.includes('fitBounds') ||
    msg.includes('ResizeObserver');

  window.addEventListener('error', (event) => {
    if (!event.error) {
      return;
    }
    const msg = event.error.message || '';
    if (ignored(msg)) return;
    if (import.meta.env.DEV) {
      console.error('Global error:', event.error);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason || '');
    if (ignored(msg)) return;
    if (import.meta.env.DEV) {
      console.error('Unhandled rejection:', event.reason);
    }
  });

  // Listener monitoring (browser-safe)
  setInterval(() => {
    const stats = listenerManager.getStats();
    
    // Log if many listeners active
    if (stats.totalListeners > 50) {
      console.log('📊 Listener Stats:', stats);
    }
  }, 30000); // Check every 30 seconds

  // Periodic listener cleanup (safety net)
  setInterval(() => {
    const stats = listenerManager.getStats();
    if (stats.totalListeners > 100) { // If more than 100 listeners
      console.warn('⚠️ High listener count detected:', stats);
      console.log('🧹 Consider investigating potential memory leaks');
    }
  }, 60000); // Check every minute
};

// Window beforeunload cleanup
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    listenerManager.cleanupAll();
  });
}

export default listenerManager;