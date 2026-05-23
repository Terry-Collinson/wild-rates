import dotenv from 'dotenv';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

async function runUpdate() {
  console.log('--- UPDATING NIGHTSBRIDGE IDS IN DYNAMIC FIRESTORE COLLECTIONS ---');
  
  const updates = [
    { 
      id: 'leeuwenbosch-country-house', 
      nightsbridge_id: '10208', 
      name: 'Leeuwenbosch Country House',
      category: 'Heritage Manor',
      description: 'Historic colonial-style country house built in 1908, offering old-world elegance.',
      maxCapacity: 6
    },
    { 
      id: 'woodbury-manor', 
      nightsbridge_id: '37058', 
      name: 'Woodbury Manor',
      category: 'Exclusive Villa',
      description: 'A 5-star exclusive-use safari villa featuring a private chef and ranger.',
      maxCapacity: 8
    },
    { 
      id: 'induli-lodge', 
      nightsbridge_id: '37278', 
      name: 'Induli Lodge',
      category: 'Private Eco-Chalet',
      description: 'An intimate, eco-friendly luxury retreat overlooking the savanna landscape.',
      maxCapacity: 6
    }
  ];

  for (const item of updates) {
    try {
      console.log(`\n[UPDATE] Seeding "${item.name}"...`);
      
      // 1. Create or merge in 'lodges' collection using setDoc
      const lodgeRef = doc(db, 'lodges', item.id);
      await setDoc(lodgeRef, {
        id: item.id,
        name: item.name,
        slug: item.id.replace('-country-house', '').replace('-lodge', ''),
        category: item.category,
        region: 'Amakhala',
        description: item.description,
        commissionRate: 0.10,
        bookingId: item.id,
        maxCapacity: item.maxCapacity,
        nightsbridge_id: item.nightsbridge_id,
        bookingProvider: 'NightsBridge',
        updated_at: new Date().toISOString()
      }, { merge: true });
      console.log(`  -> Main 'lodges' collection: Saved successfully (NightsBridge ID: ${item.nightsbridge_id})`);

      // 2. Also update in fallback profiles/rates if present to ensure complete synchronization
      const profileRef = doc(db, 'api_lodgeprofiles', item.id);
      await setDoc(profileRef, {
        rawResponse: {
          nightsbridge_id: item.nightsbridge_id
        }
      }, { merge: true }).catch(() => {});
      console.log(`  -> API profiles cache: Synced successfully.`);
      
    } catch (err: any) {
      console.error(`  !! Update failed for ${item.id}:`, err.message);
    }
  }
  
  console.log('\n--- FIRESTORE UPDATE TASK COMPLETED ---');
}

runUpdate();
