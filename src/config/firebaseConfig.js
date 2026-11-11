// Go7 Firebase Configuration
// ✅ FIXED: Re-export from main Firebase config to prevent duplicate app errors

export { app as default, auth } from '../firebase/config.js';

// Log successful initialization
console.log('✅ Firebase App Initialized:', {
  name: app.name,
  options: {
    apiKey: app.options.apiKey ? `${app.options.apiKey.substring(0, 10)}...` : 'MISSING',
    authDomain: app.options.authDomain,
    projectId: app.options.projectId
  }
});

// Initialize and export Firebase Auth
export const auth = getAuth(app);

console.log('✅ Firebase Auth Service Ready');

export default app;
