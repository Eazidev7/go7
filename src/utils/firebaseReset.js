// Firebase Hard Reset Utility
// This utility completely clears all Firebase-related caches and reinitializes everything

import { getApps, deleteApp } from 'firebase/app';

export const hardResetFirebase = async () => {
  console.log('🔄 Starting Firebase Hard Reset...');
  
  try {
    // 1. Delete all existing Firebase apps
    const apps = getApps();
    console.log(`📱 Found ${apps.length} existing Firebase apps`);
    
    for (const app of apps) {
      console.log(`🗑️ Deleting Firebase app: ${app.name}`);
      await deleteApp(app);
    }
    
    // 2. Clear all localStorage with Firebase keys
    const firebaseKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('firebase:') ||
        key.startsWith('firebaseui::') ||
        key.includes('firebase') ||
        key.includes('auth') ||
        key.includes('fir-')
      )) {
        firebaseKeys.push(key);
      }
    }
    
    console.log(`🧹 Clearing ${firebaseKeys.length} Firebase localStorage keys:`, firebaseKeys);
    firebaseKeys.forEach(key => localStorage.removeItem(key));
    
    // 3. Clear sessionStorage
    const sessionKeys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.startsWith('firebase:') ||
        key.startsWith('firebaseui::') ||
        key.includes('firebase') ||
        key.includes('auth')
      )) {
        sessionKeys.push(key);
      }
    }
    
    console.log(`🧹 Clearing ${sessionKeys.length} Firebase sessionStorage keys:`, sessionKeys);
    sessionKeys.forEach(key => sessionStorage.removeItem(key));
    
    // 4. Clear IndexedDB Firebase databases
    if ('indexedDB' in window) {
      try {
        const databases = await indexedDB.databases?.() || [];
        const firebaseDbs = databases.filter(db => 
          db.name && (
            db.name.includes('firebase') ||
            db.name.includes('firestore') ||
            db.name.includes('fir-')
          )
        );
        
        console.log(`🗄️ Found ${firebaseDbs.length} Firebase IndexedDB databases:`, firebaseDbs.map(db => db.name));
        
        for (const db of firebaseDbs) {
          const deleteReq = indexedDB.deleteDatabase(db.name);
          await new Promise((resolve, reject) => {
            deleteReq.onsuccess = () => resolve();
            deleteReq.onerror = () => reject(deleteReq.error);
          });
          console.log(`🗑️ Deleted Firebase database: ${db.name}`);
        }
      } catch (error) {
        console.warn('⚠️ Could not clear IndexedDB:', error);
      }
    }
    
    // 5. Unregister all service workers (especially Firebase messaging)
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`🔧 Found ${registrations.length} service worker registrations`);
      
      for (const registration of registrations) {
        console.log(`🗑️ Unregistering service worker: ${registration.scope}`);
        await registration.unregister();
      }
    }
    
    // 6. Clear all cookies with firebase domain
    if ('cookieStore' in window) {
      try {
        const cookies = await cookieStore.getAll();
        const firebaseCookies = cookies.filter(cookie => 
          cookie.name.includes('firebase') || 
          cookie.domain?.includes('firebase') ||
          cookie.name.includes('fir-')
        );
        
        console.log(`🍪 Clearing ${firebaseCookies.length} Firebase cookies`);
        for (const cookie of firebaseCookies) {
          await cookieStore.delete(cookie.name);
        }
      } catch (error) {
        console.warn('⚠️ Could not clear cookies via cookieStore:', error);
      }
    }
    
    // 7. Clear cache storage
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        const firebaseCaches = cacheNames.filter(name => 
          name.includes('firebase') || 
          name.includes('firestore') ||
          name.includes('fir-')
        );
        
        console.log(`💾 Clearing ${firebaseCaches.length} Firebase caches:`, firebaseCaches);
        for (const cacheName of firebaseCaches) {
          await caches.delete(cacheName);
        }
      } catch (error) {
        console.warn('⚠️ Could not clear cache storage:', error);
      }
    }
    
    console.log('✅ Firebase Hard Reset Complete!');
    console.log('🔄 Please refresh the page to reinitialize Firebase with fresh configuration');
    
    return {
      success: true,
      message: 'Firebase hard reset completed successfully',
      clearedApps: apps.length,
      clearedLocalStorage: firebaseKeys.length,
      clearedSessionStorage: sessionKeys.length
    };
    
  } catch (error) {
    console.error('❌ Firebase Hard Reset Failed:', error);
    return {
      success: false,
      error: error.message,
      fullError: error
    };
  }
};

// Auto-detect and warn about potential Firebase conflicts
export const detectFirebaseConflicts = () => {
  console.log('🔍 Checking for Firebase conflicts...');
  
  const conflicts = [];
  
  // Check for multiple Firebase projects in localStorage
  const localStorageData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.includes('firebase')) {
      localStorageData[key] = localStorage.getItem(key);
    }
  }
  
  // Check for project ID mismatches
  const projectIds = new Set();
  Object.entries(localStorageData).forEach(([key, value]) => {
    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed.projectId) {
        projectIds.add(parsed.projectId);
      }
    } catch (e) {
      // Not JSON, check if it's a project ID string
      if (value && value.includes('fir-') || value.includes('go7-') || value.includes('firebase')) {
        projectIds.add(value);
      }
    }
  });
  
  if (projectIds.size > 1) {
    conflicts.push({
      type: 'Multiple Project IDs',
      details: Array.from(projectIds),
      severity: 'high'
    });
  }
  
  // Check for old demo project references
  const hasDemoProject = Array.from(projectIds).some(id => id.includes('fir-demo') || id.includes('demo'));
  if (hasDemoProject) {
    conflicts.push({
      type: 'Demo Project Detected',
      details: 'Found references to fir-demo-project which conflicts with go7-delivery',
      severity: 'high'
    });
  }
  
  console.log(`🔍 Conflict scan complete. Found ${conflicts.length} issues:`, conflicts);
  return conflicts;
};