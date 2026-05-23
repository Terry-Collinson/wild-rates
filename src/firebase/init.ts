import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics';
import { firebaseConfig } from './config';

// Declare a global scope cache that survives Next.js Fast Refresh / Hot Reloads.
// In Next.js development, module-level variables are wiped out when code is saved,
// but globalThis persists cleanly in the browser context.
const globalForFirebase = globalThis as unknown as {
  app: FirebaseApp | undefined;
  db: Firestore | undefined;
  auth: Auth | undefined;
  storage: FirebaseStorage | undefined;
  analytics: Analytics | undefined;
};

/**
 * Robust initialization for Next.js and Cloud Workstation environments.
 * Ensures authDomain is a clean string and handles singleton app patterns.
 * Configures high-stability memory cache in development and resilient IndexedDB in production.
 */
export function initializeFirebase(): {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
  analytics: Analytics | null;
} {
  // Ensure config is robust and authDomain is a single string (not an array)
  const cleanConfig = {
    ...firebaseConfig,
    authDomain: Array.isArray(firebaseConfig.authDomain) 
      ? firebaseConfig.authDomain[0] 
      : firebaseConfig.authDomain
  };

  // 1. Get or initialize FirebaseApp
  if (!globalForFirebase.app) {
    const existingApps = getApps();
    globalForFirebase.app = existingApps.length > 0 ? existingApps[0] : initializeApp(cleanConfig);
  }
  const app = globalForFirebase.app;

  // 2. Get or initialize Firestore
  if (!globalForFirebase.db) {
    let db: Firestore;
    if (typeof window !== 'undefined') {
      const { initializeFirestore, persistentLocalCache, persistentSingleTabManager } = require('firebase/firestore');
      
      // Check if we are running in local development mode
      const isDev = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
      
      if (isDev) {
        // High-Stability Memory Cache for Development:
        // Bypasses Next.js Fast Refresh hot-reload lock collisions and IndexedDB tree-traversal corruption entirely.
        db = getFirestore(app);
        console.log('Firebase Init: High-Stability Memory Cache enabled (Development Mode).');
      } else {
        // Production Mode Resilient Offline Persistent Cache:
        try {
          db = initializeFirestore(app, {
            localCache: persistentLocalCache({
              tabManager: persistentSingleTabManager({ forceOwnership: true })
            })
          });
          console.log('Firebase Init: Resilient Persistent IndexedDB Cache enabled (Production Mode).');
        } catch (err) {
          console.warn('Firebase Init: Persistent cache failed to initialize, falling back to memory cache.', err);
          db = getFirestore(app);
        }
      }
    } else {
      db = getFirestore(app);
    }
    globalForFirebase.db = db;
  }
  const db = globalForFirebase.db;

  // 3. Get or initialize Auth & Storage
  if (!globalForFirebase.auth) {
    globalForFirebase.auth = getAuth(app);
  }
  const auth = globalForFirebase.auth;

  if (!globalForFirebase.storage) {
    globalForFirebase.storage = getStorage(app);
  }
  const storage = globalForFirebase.storage;

  // 4. Get or initialize Analytics (Browser only)
  if (typeof window !== 'undefined' && !globalForFirebase.analytics) {
    isSupported().then((supported) => {
      if (supported) {
        globalForFirebase.analytics = getAnalytics(app);
      }
    });
  }
  const analytics = globalForFirebase.analytics || null;

  return { app, db, auth, storage, analytics };
}
