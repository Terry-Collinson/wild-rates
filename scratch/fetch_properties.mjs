
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchProperties() {
  try {
    const querySnapshot = await getDocs(collection(db, 'properties'));
    const properties = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      properties.push({
        name: data.name,
        nightsbridge_id: data.nightsbridge_id
      });
    });
    console.log(JSON.stringify(properties, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error fetching properties:', error);
    process.exit(1);
  }
}

fetchProperties();
