// PWA Service Worker Registration Utility
// This module handles service worker registration and PWA functionality

interface ServiceWorkerRegistrationResult {
  success: boolean;
  registration?: ServiceWorkerRegistration;
  error?: Error;
}

class PWAManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable: boolean = false;

  /**
   * Register the service worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistrationResult> {
    if (!('serviceWorker' in navigator)) {
      console.warn('🚫 PWA: Service Worker not supported');
      return { success: false, error: new Error('Service Worker not supported') };
    }
    
    // Check if service workers have been disabled due to issues
    if (window.localStorage.getItem('sw-disabled') === 'true') {
      console.warn('⚠️ PWA: Service Worker disabled due to previous issues');
      return { success: false, error: new Error('Service Worker disabled by user preference') };
    }

    try {
      console.log('🔧 PWA: Registering stable service worker...');
      
      // Cache-bust the SW URL so every new build fetches a fresh worker,
      // preventing old cached bundles from staying in control.
      const buildId = (window as any).__GO7_RUNTIME__?.buildId || Date.now().toString();
      const registration = await navigator.serviceWorker.register('/sw.js?v=' + encodeURIComponent(buildId), {
        scope: '/',
        updateViaCache: 'none'
      });

      this.registration = registration;

      console.log('✅ PWA: Service worker registered successfully', registration);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        console.log('🔄 PWA: Service worker update found');
        this.handleServiceWorkerUpdate(registration);
      });

      // Check if there's already an update waiting
      if (registration.waiting) {
        console.log('⏳ PWA: Service worker update waiting');
        this.updateAvailable = true;
      }

      return { success: true, registration };

    } catch (error) {
      console.error('❌ PWA: Service worker registration failed:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Handle service worker updates
   */
  private handleServiceWorkerUpdate(registration: ServiceWorkerRegistration) {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('🔄 PWA: New service worker installed, update available');
        this.updateAvailable = true;
        this.showUpdateNotification();
      }
    });
  }

  /**
   * Show update notification to user, then self-heal by auto-applying the
   * update shortly after (stale-bundle self-heal — users on an old cached
   * bundle shouldn't have to know to force-close/reopen the app).
   */
  private showUpdateNotification() {
    console.log('📢 PWA: New version available — auto-updating shortly');

    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('pwa-update-available', {
        detail: { updateAvailable: true }
      }));
    }

    // Give any UI listener (toast/banner) a moment to render, then reload.
    // This only fires when a genuinely new build was detected, so it won't
    // affect users already on the latest bundle.
    window.setTimeout(() => {
      this.applyUpdate();
    }, 2500);
  }

  /**
   * Apply pending update
   */
  async applyUpdate(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      return;
    }

    console.log('🔄 PWA: Applying update...');
    
    // Tell the waiting service worker to skip waiting
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Reload the page to get the new version
    window.location.reload();
  }

  /**
   * Check if app is running as PWA
   */
  isPWA(): boolean {
    // Check if running in standalone mode
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    
    // Check for iOS PWA
    if ((window.navigator as any).standalone === true) {
      return true;
    }
    
    return false;
  }

  /**
   * Get service worker registration
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Check if update is available
   */
  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  /**
   * Request persistent storage (for better caching)
   */
  async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const isPersistent = await navigator.storage.persist();
        console.log('💾 PWA: Persistent storage granted:', isPersistent);
        return isPersistent;
      } catch (error) {
        console.warn('💾 PWA: Persistent storage request failed:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Estimate storage usage
   */
  async getStorageEstimate(): Promise<StorageEstimate | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        console.log('📊 PWA: Storage estimate:', estimate);
        return estimate;
      } catch (error) {
        console.warn('📊 PWA: Storage estimate failed:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Clear app cache (for debugging)
   */
  async clearCache(): Promise<void> {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('🗑️ PWA: All caches cleared');
      } catch (error) {
        console.error('🗑️ PWA: Cache clearing failed:', error);
      }
    }
  }

  /**
   * Send message to service worker
   */
  sendMessageToSW(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.registration || !this.registration.active) {
        reject(new Error('No active service worker'));
        return;
      }

      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.registration.active.postMessage(message, [messageChannel.port2]);
    });
  }
}

// Create singleton instance
export const pwaManager = new PWAManager();

// Auto-register service worker when module loads (DISABLED IN DEVELOPMENT)
if (typeof window !== 'undefined') {
  // Only register in production
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      pwaManager.registerServiceWorker();
      pwaManager.requestPersistentStorage();
    });
  } else {
    console.log('🔧 Development mode: Service Worker registration disabled');
  }
}

export default pwaManager;