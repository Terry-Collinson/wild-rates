import dotenv from 'dotenv';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Error: Firebase configuration missing in .env.local!');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runCleanup() {
  console.log('--- SCANNING FIRESTORE FOR "BOUBOU LODGE" TO DELETE IT ---');
  
  try {
    // Fetch all documents from 'lodges' collection
    const lodgesSnap = await getDocs(collection(db, 'lodges'));
    let found = false;

    for (const d of lodgesSnap.docs) {
      const data = d.data();
      const name = data.name || '';
      const id = d.id;

      if (name.toLowerCase().includes('boubou') || id.toLowerCase().includes('boubou')) {
        console.log(`[FOUND] Detected "Boubou Lodge" document inside 'lodges' collection: ID="${id}", Name="${name}"`);
        found = true;
        
        // Delete the document!
        await deleteDoc(doc(db, 'lodges', id));
        console.log(`  -> SUCCESS: Deleted document "${id}" from 'lodges' collection.`);
      }
    }

    // Also check 'properties' and 'api_lodgeprofiles' just in case
    const profilesSnap = await getDocs(collection(db, 'api_lodgeprofiles')).catch(() => null);
    if (profilesSnap) {
      for (const d of profilesSnap.docs) {
        if (d.id.toLowerCase().includes('boubou') || (d.data().propertyName || '').toLowerCase().includes('boubou')) {
          console.log(`[FOUND] Detected "Boubou Lodge" inside 'api_lodgeprofiles': ID="${d.id}"`);
          await deleteDoc(doc(db, 'api_lodgeprofiles', d.id));
          console.log(`  -> SUCCESS: Deleted from 'api_lodgeprofiles'.`);
          found = true;
        }
      }
    }

    if (!found) {
      console.log('No instances of "Boubou Lodge" found in your active Firestore collections.');
    } else {
      console.log('\nCleanup completed successfully!');
    }

  } catch (err: any) {
    console.error('Cleanup failed with error:', err.message);
  }
}

runCleanup();
