'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics';
import { firebaseConfig } from './config';

/**
 * Robust initialization for Next.js and Cloud Workstation environments.
 * Ensures authDomain is a clean string and handles singleton app patterns.
 */
export function initializeFirebase(): {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
  analytics: Analytics | null;
} {
  // Ensure config is robust and authDomain is a single string (not an array)
  // The "t is not iterable" error often comes from the SDK when config is invalid.
  const cleanConfig = {
    ...firebaseConfig,
    authDomain: Array.isArray(firebaseConfig.authDomain) 
      ? firebaseConfig.authDomain[0] 
      : firebaseConfig.authDomain
  };

  if (typeof window !== 'undefined') {
    console.log('Firebase Init: Using Auth Domain:', cleanConfig.authDomain);
  }

  const existingApps = getApps();
  const app = existingApps.length > 0 ? existingApps[0] : initializeApp(cleanConfig);
  
  const db = getFirestore(app);
  const auth = getAuth(app);
  const storage = getStorage(app);
  
  let analytics: Analytics | null = null;
  if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    });
  }

  return { app, db, auth, storage, analytics };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
