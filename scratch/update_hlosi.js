const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

async function run() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  console.log('Updating Hlosi Game Lodge (415665)...');
  const hlosiRef = doc(db, 'lodges', '415665');
  await updateDoc(hlosiRef, {
    profitroom_id: 'hlosigamelodge'
  });
  console.log('Hlosi successfully updated!');

  console.log('Updating Bukela Game Lodge (354146)...');
  const bukelaRef = doc(db, 'lodges', '354146');
  await updateDoc(bukelaRef, {
    profitroom_id: 'bukelagamelodge'
  });
  console.log('Bukela successfully updated!');
}

run().catch(console.error);
