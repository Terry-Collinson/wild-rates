import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Try to load env
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function debug() {
  console.log('Project ID:', firebaseConfig.projectId);
  if (!firebaseConfig.projectId) {
    console.error('No Project ID found in env!');
    return;
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log('Checking room_types...');
  const snap = await getDocs(collection(db, 'room_types'));
  console.log('Total room_types documents:', snap.size);

  if (snap.size > 0) {
    const first = snap.docs[0].data();
    console.log('First document snippet:', JSON.stringify(first, null, 2));
    console.log('Images field:', first.images);
  } else {
    console.log('Checking roomTypes...');
    const snap2 = await getDocs(collection(db, 'roomTypes'));
    console.log('Total roomTypes documents:', snap2.size);
    if (snap2.size > 0) {
        console.log('First document snippet:', JSON.stringify(snap2.docs[0].data(), null, 2));
    }
  }
}

debug().catch(console.error);
