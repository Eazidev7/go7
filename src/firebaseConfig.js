// src/firebaseConfig.js
// ✅ FIXED: Re-export from main Firebase config to prevent duplicate app errors

export { app as default, auth, db } from './firebase/config.js';
