// Firebase App Safety Helper
// Prevents duplicate Firebase app initialization errors

import { getApps, getApp, initializeApp } from 'firebase/app';

/**
 * Safely get or initialize Firebase app
 * Prevents "Firebase App named '[DEFAULT]' already exists" errors
 * @param {Object} config - Firebase configuration object
 * @param {string} name - App name (optional, defaults to '[DEFAULT]')
 * @returns {FirebaseApp} Firebase app instance
 */
export function safeGetFirebaseApp(config, name = '[DEFAULT]') {
  try {
    // Check if app already exists
    const existingApps = getApps();
    const existingApp = existingApps.find(app => app.name === name);
    
    if (existingApp) {
      console.log(`✅ Firebase app '${name}' already exists, reusing existing instance`);
      return existingApp;
    }
    
    // Initialize new app if it doesn't exist
    console.log(`🔥 Initializing new Firebase app '${name}'`);
    return initializeApp(config, name);
    
  } catch (error) {
    if (error.code === 'app/duplicate-app') {
      console.log(`⚠️ Duplicate app detected, getting existing app '${name}'`);
      return getApp(name);
    }
    
    console.error('❌ Firebase app initialization error:', error);
    throw error;
  }
}

/**
 * Check if Firebase app exists
 * @param {string} name - App name (optional)
 * @returns {boolean} True if app exists
 */
export function firebaseAppExists(name = '[DEFAULT]') {
  try {
    getApp(name);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all Firebase app names
 * @returns {string[]} Array of app names
 */
export function getFirebaseAppNames() {
  return getApps().map(app => app.name);
}

// Debug utility
export function debugFirebaseApps() {
  const apps = getApps();
  console.log('🔍 Firebase Apps Debug:', {
    count: apps.length,
    names: apps.map(app => app.name),
    configs: apps.map(app => ({
      name: app.name,
      projectId: app.options.projectId
    }))
  });
}