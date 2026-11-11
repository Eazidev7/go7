// Firebase configuration for the client-side
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
// NEW: FCM Messaging Support
import { getMessaging, isSupported } from 'firebase/messaging';

// Enable real-time Firebase for production
const ENABLE_FIREBASE = true;
const USE_EMULATORS = import.meta.env.VITE_ENVIRONMENT === 'development' && import.meta.env.VITE_USE_EMULATORS === 'true';
// Dev-only escape hatch: point ONLY the Functions SDK at a local emulator
// (e.g. QA of undeployed callables against production data). import.meta.env.DEV
// is always false in production builds, so this can never engage in prod.
const USE_FUNCTIONS_EMULATOR = import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true';

// FIXED: Use correct Firebase config from .env
// Never pass an empty databaseURL — getDatabase("") crashes and used to wipe Auth/Firestore.
const configuredDatabaseURL = String(import.meta.env.VITE_FIREBASE_DATABASE_URL || '').trim();
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAApbZP6QnaeMWP19cfK_XXRLlXlS7cP5s",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "go7-app-209e4.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "go7-app-209e4",
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'go7-app-209e4.firebasestorage.app').replace(/\.appspot\.com$/, '.firebasestorage.app'),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "64086226844",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:64086226844:web:cb8c67344e6241fe11fa59",
  ...(configuredDatabaseURL ? { databaseURL: configuredDatabaseURL } : {}),
};

// ULTIMATE DEBUG: Check if .env is being read
console.log('🚨🚨🚨 ULTIMATE .ENV DEBUG:');
console.log('Raw VITE_FIREBASE_API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY);
console.log('Is API key undefined?', import.meta.env.VITE_FIREBASE_API_KEY === undefined);
console.log('Full import.meta.env object:', import.meta.env);

// Log Firebase configuration for debugging (sanitized)
console.log('🔥 Firebase Main Config Loading:', {
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : '❌ MISSING',
  authDomain: firebaseConfig.authDomain || '❌ MISSING',
  projectId: firebaseConfig.projectId || '❌ MISSING',
  storageBucket: firebaseConfig.storageBucket || '❌ MISSING',
  messagingSenderId: firebaseConfig.messagingSenderId || '❌ MISSING',
  appId: firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 20)}...` : '❌ MISSING',
  databaseURL: firebaseConfig.databaseURL,
  mode: import.meta.env.MODE,
  environment: import.meta.env.VITE_ENVIRONMENT
});

// Validate all required config values are present
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
  console.error('❌ Firebase Configuration Error: Missing required fields:', missingFields);
  console.error('💡 Check your .env file has all VITE_FIREBASE_* variables');
  console.error('💡 Restart the dev server after updating .env');
}

// Initialize Firebase services with real-time support
let app, db, auth, storage, functions, database, messaging;

if (!ENABLE_FIREBASE) {
  console.log('🚫 Firebase disabled - using local mode');
  app = null;
  db = null;
  auth = null;
  storage = null;
  functions = null;
  database = null;
  messaging = null;
} else {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    
    // Log successful initialization with actual config being used
    console.log('✅ Firebase App Initialized Successfully:', {
      name: app.name,
      options: {
        apiKey: app.options.apiKey ? `${app.options.apiKey.substring(0, 10)}...${app.options.apiKey.substring(app.options.apiKey.length - 5)}` : 'MISSING',
        authDomain: app.options.authDomain,
        projectId: app.options.projectId,
        storageBucket: app.options.storageBucket
      }
    });
    
    // CRITICAL: Verify the API key matches what's in .env
    const expectedApiKey = 'AIzaSyAApbZP6QnaeMWP19cfK_XXRLlXlS7cP5s';
    if (app.options.apiKey === expectedApiKey) {
      console.log('✅✅✅ API KEY MATCHES .ENV FILE - AUTHENTICATION SHOULD WORK!');
    } else {
      console.error('❌❌❌ API KEY MISMATCH!');
      console.error('Expected:', expectedApiKey);
      console.error('Got:', app.options.apiKey);
      console.error('🔥 CLEAR YOUR BROWSER CACHE NOW! (Ctrl+Shift+Delete)');
    }

    // Initialize Firebase services
    db = getFirestore(app);
    
    // Non-blocking: enable Firestore network (avoid top-level await breaking module load)
    import('firebase/firestore')
      .then(({ enableNetwork }) => enableNetwork(db))
      .then(() => console.log('✅ Firestore network ENABLED'))
      .catch((error) => console.warn('⚠️ Could not enable Firestore network:', error?.message));
    
    auth = getAuth(app);
    // iPhone Safari / Private Mode can break IndexedDB persistence and look like
    // "app not loading" or OTP login failing after a correct code.
    import('firebase/auth')
      .then(({ setPersistence, browserLocalPersistence, inMemoryPersistence }) =>
        setPersistence(auth, browserLocalPersistence).catch(() =>
          setPersistence(auth, inMemoryPersistence)
        )
      )
      .catch(() => { /* keep default persistence */ });
    storage = getStorage(app);
    functions = getFunctions(app, 'us-central1');
    database = null;
    if (configuredDatabaseURL) {
      try {
        database = getDatabase(app);
      } catch (rtdbError) {
        console.warn('⚠️ Realtime Database unavailable (Firestore/Auth still active):', rtdbError?.message);
        database = null;
      }
    } else {
      console.warn('⚠️ Realtime Database URL not set — using Firestore only');
    }
    
    console.log('✅ Firebase Services Initialized:', {
      firestore: !!db,
      auth: !!auth,
      storage: !!storage,
      functions: !!functions,
      database: !!database
    });

    // 🏥 Run Firestore health check to diagnose 400 errors
    if (import.meta.env.DEV && db) {
      import('../utils/firestoreHealthCheck.js').then(({ runFirestoreHealthCheck }) => {
        runFirestoreHealthCheck(db);
      });
    }
    
    // NEW: Initialize FCM messaging (deferred to avoid top-level await)
    messaging = null;
    
    // Initialize messaging asynchronously
    isSupported().then((supported) => {
      if (supported) {
        messaging = getMessaging(app);
        console.log('📱 FCM messaging initialized successfully');
      } else {
        console.warn('⚠️ FCM messaging not supported on this browser');
      }
    }).catch((error) => {
      console.warn('⚠️ Error checking FCM support:', error);
    });

    // Connect to emulators in development if enabled
    if (USE_EMULATORS && !auth._delegate?._config?.emulator) {
      try {
        connectAuthEmulator(auth, 'http://localhost:9099');
        connectFirestoreEmulator(db, 'localhost', 8080);
        connectFunctionsEmulator(functions, 'localhost', 5001);
        connectDatabaseEmulator(database, 'localhost', 9000);
        console.log('🔧 Connected to Firebase emulators');
      } catch (error) {
        console.log('⚠️ Emulators not available, using production Firebase');
      }
    }

    if (USE_FUNCTIONS_EMULATOR) {
      try {
        connectFunctionsEmulator(functions, 'localhost', 5001);
        console.log('🔧 Functions emulator connected (auth/firestore stay on production)');
      } catch (e) {
        console.warn('⚠️ Functions emulator connect failed:', e?.message);
      }
    }

    console.log('✅ Firebase initialized successfully for real-time use');
    console.log('🔥 Project:', firebaseConfig.projectId);
    console.log('🌐 Environment:', import.meta.env.VITE_ENVIRONMENT || 'production');
    console.log('🔑 API Key:', firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'MISSING');
    if (firebaseConfig.databaseURL) {
      console.log('📊 Realtime Database:', firebaseConfig.databaseURL);
    } else {
      console.warn('⚠️ Realtime Database URL not configured. Add VITE_FIREBASE_DATABASE_URL to .env');
    }
  } catch (error) {
    console.warn('⚠️ Firebase initialization error (app will work in limited mode):', error.message);
    
    // Check for common errors and provide helpful messages
    if (error.message?.includes('PERMISSION_DENIED') || error.message?.includes('Identity Toolkit') || error.message?.includes('403')) {
      console.warn('ℹ️ Firebase API restrictions detected - authentication features may be limited');
      console.warn('🔧 To enable full Firebase: Update API restrictions in Firebase Console');
    }
    if (error.message?.includes('Realtime Database') || error.message?.includes('databaseURL') || error.message?.includes('Firebase url')) {
      console.warn('ℹ️ Realtime Database not configured - keeping Auth/Firestore if already initialized');
      // Do not wipe Auth/Firestore if they already started successfully before RTDB failed.
      if (app && db && auth) {
        database = null;
      } else {
        app = null;
        db = null;
        auth = null;
        storage = null;
        functions = null;
        database = null;
        messaging = null;
      }
    } else {
      // Non-RTDB init failure — limited mode
      app = null;
      db = null;
      auth = null;
      storage = null;
      functions = null;
      database = null;
      messaging = null;
    }
  }
}

// Helper function to get messaging instance safely
export const getMessagingSafe = async () => {
  try {
    if (!app) {
      console.warn('⚠️ Firebase app not initialized');
      return null;
    }
    
    const supported = await isSupported();
    if (!supported) {
      console.warn('⚠️ FCM not supported on this browser');
      return null;
    }
    
    if (!messaging) {
      messaging = getMessaging(app);
      console.log('📱 FCM messaging initialized on-demand');
    }
    
    return messaging;
  } catch (error) {
    console.error('❌ Error getting messaging instance:', error);
    return null;
  }
};

export { app, db, auth, storage, functions, database, messaging, firebaseConfig };