/**
 * FCM Initialization Module
 * This module handles the initialization of Firebase Cloud Messaging
 * and registers the service worker for push notifications
 */
import { fcmService } from './services/fcmService';
import { getAuth } from 'firebase/auth';

class FCMInitializer {
  /**
   * Initialize FCM and register service worker
   * @returns {Promise<boolean>} Success status
   */
  static async initialize() {
    try {
      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        console.log('Service workers are not supported');
        return false;
      }

      // Register service worker
      const swRegistration = await this.registerServiceWorker();
      if (!swRegistration) {
        return false;
      }

      // Initialize FCM service
      const initialized = await fcmService.initialize();
      if (!initialized) {
        return false;
      }

      // Set up authentication listener to handle FCM token
      this.setupAuthListener();

      console.log('✅ FCM initialization complete');
      return true;
    } catch (error) {
      console.error('Failed to initialize FCM:', error);
      return false;
    }
  }

  /**
   * Register the Firebase messaging service worker
   * @returns {Promise<ServiceWorkerRegistration|null>}
   */
  static async registerServiceWorker() {
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });

      console.log('✅ Service Worker registered with scope:', registration.scope);
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return null;
    }
  }

  /**
   * Set up authentication listener to handle FCM token
   * when user signs in or out
   */
  static setupAuthListener() {
    const auth = getAuth();

    auth.onAuthStateChanged(async (user) => {
      if (user) {
        // User is signed in, get FCM token
        console.log('User authenticated, requesting FCM permission');
        
        // Small delay to ensure UI is loaded before asking for permission
        setTimeout(async () => {
          // Request permission and get token
          const token = await fcmService.requestPermission();
          
          if (token) {
            console.log('FCM token obtained and saved for user');
            
            // Set up foreground message listener
            fcmService.setupMessageListener();
          }
        }, 2000);
      } else {
        // User is signed out
        console.log('User signed out, FCM token will not be requested');
      }
    });
  }
}

export default FCMInitializer;