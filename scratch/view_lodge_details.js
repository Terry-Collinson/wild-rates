const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
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
  
  const querySnapshot = await getDocs(collection(db, 'lodges'));
  querySnapshot.forEach((lodgeDoc) => {
    const data = lodgeDoc.data();
    if (lodgeDoc.id === '415665' || lodgeDoc.id === '354146') {
      console.log(`Lodge ID: ${lodgeDoc.id}`);
      console.log(JSON.stringify(data, null, 2));
      console.log('-----------------------------');
    }
  });
}

run().catch(console.error);
