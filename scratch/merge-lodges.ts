import dotenv from 'dotenv';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';

// 1. Load env variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

console.log('Initializing Firebase Client for migration...');
console.log('Project ID:', firebaseConfig.projectId);

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Error: Firebase configuration missing in .env.local!');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Migration configuration
const DRY_RUN = process.argv.includes('--execute') ? false : true;
const CLEANUP_SOURCE = process.argv.includes('--cleanup') ? true : false;

/**
 * Highly intelligent matching layer to correlate scraper records with canonical lodge records.
 * Resolves complex edge cases like "Woodbury Lodge" vs "Woodbury Tented Camp", and "Safari Lodge" name overlaps.
 */
function findMatchingLodge(propData: any, propId: string, lodges: any[]) {
  // 1. Match by nightsbridge_id (if valid)
  if (propData.nightsbridge_id && propData.nightsbridge_id !== 'PENDING_MAPPING') {
    const match = lodges.find(l => l.nightsbridge_id === propData.nightsbridge_id);
    if (match) return match;
  }

  // 2. Match by direct ID check
  const directMatch = lodges.find(l => l.id === propId);
  if (directMatch) return directMatch;

  // Helpers for string normalization
  const cleanPropName = propData.name.toLowerCase().replace(/[^a-z0-9]/g, '');

  const removeNoise = (name: string) => name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/safari|camp|game|lodge|inn|amakhala/g, ''); // Keep distinctive words like "tented", "bush", "hillsnek"

  const propNameBase = removeNoise(propData.name);

  // 3. Try exact distinctive base match (e.g. "woodburytented" === "woodburytented")
  // Only use if base name is not empty
  if (propNameBase.length >= 3) {
    const exactBaseMatch = lodges.find(l => {
      const lodgeBase = removeNoise(l.name);
      return lodgeBase.length >= 3 && lodgeBase === propNameBase;
    });
    if (exactBaseMatch) return exactBaseMatch;
  }

  // 4. Try exact string containment (full names)
  for (const lodge of lodges) {
    const cleanLodgeName = lodge.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanPropName === cleanLodgeName) {
      return lodge;
    }
  }

  // 5. Try containment check with distinctive base names (skip if base is empty or too short)
  for (const lodge of lodges) {
    const lodgeBase = removeNoise(lodge.name);
    if (lodgeBase.length >= 3 && propNameBase.length >= 3) {
      if (propNameBase.includes(lodgeBase) || lodgeBase.includes(propNameBase)) {
        return lodge;
      }
    }
  }

  // 6. Semantic match requiring multiple unique words
  for (const lodge of lodges) {
    const propWords = propData.name.toLowerCase()
      .split(/[\s,–—-]+/)
      .filter((w: string) => w.length >= 3 && !['game', 'reserve', 'and', 'hotels'].includes(w));
      
    const lodgeWords = lodge.name.toLowerCase()
      .split(/[\s,–—-]+/)
      .filter((w: string) => w.length >= 3 && !['game', 'reserve', 'and', 'hotels'].includes(w));

    const intersection = propWords.filter((w: string) => lodgeWords.includes(w));
    if (intersection.length >= 2 || (intersection.length === 1 && propWords.length === 1 && lodgeWords.length === 1)) {
      return lodge;
    }
  }

  return null;
}

async function runMigration() {
  console.log('\n--- FIRESTORE COLLECTION MERGE INITIATED ---');
  console.log(`Mode: ${DRY_RUN ? '⚡ DRY RUN (No database mutations will be made)' : '🔥 EXECUTE (Database will be updated)'}`);
  console.log(`Cleanup source collection: ${CLEANUP_SOURCE ? 'Yes (properties collection will be emptied)' : 'No (properties collection remains untouched)'}\n`);

  try {
    // 2. Fetch all documents from both collections
    console.log('Fetching properties...');
    const propertiesSnap = await getDocs(collection(db, 'properties'));
    console.log(`Found ${propertiesSnap.size} documents in 'properties' collection.`);

    console.log('Fetching lodges...');
    const lodgesSnap = await getDocs(collection(db, 'lodges'));
    console.log(`Found ${lodgesSnap.size} documents in 'lodges' collection.`);

    const lodgesList: any[] = [];
    lodgesSnap.forEach(doc => {
      lodgesList.push({ id: doc.id, ...doc.data() });
    });

    const batch = writeBatch(db);
    let mergeCount = 0;
    let createCount = 0;
    let deleteCount = 0;

    const mergedLodgeIds = new Set<string>();

    // 3. Process the 'properties' collection and match it into canonical 'lodges'
    propertiesSnap.forEach((propDoc) => {
      const propData = propDoc.data();
      const propId = propDoc.id;

      // Use the intelligent match layer
      const matchedLodge = findMatchingLodge(propData, propId, lodgesList);

      const targetId = matchedLodge ? matchedLodge.id : propId;
      mergedLodgeIds.add(targetId);

      // Unified merged schema
      const unifiedLodge = {
        // Keep canonical identifiers if matching, otherwise fall back to property
        id: targetId,
        name: matchedLodge?.name || propData.name || 'Unknown Lodge',
        bookingProvider: matchedLodge?.bookingProvider || propData.bookingProvider || 'NightsBridge',
        nightsbridge_id: matchedLodge?.nightsbridge_id || propData.nightsbridge_id || '',

        // Fields from 'properties'
        address: propData.address || matchedLodge?.address || '',
        phone: propData.phone || matchedLodge?.phone || '',
        star_rating: propData.star_rating || matchedLodge?.star_rating || 5,
        gps: propData.gps || matchedLodge?.gps || null,
        google_hotel_id: propId, // Store Google Hotel Scraper ID for rate matching references!
        updated_at: new Date().toISOString(),

        // Fields from 'lodges'
        slug: matchedLodge?.slug || propData.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || propId,
        category: matchedLodge?.category || (propData.star_rating ? `${propData.star_rating}-Star Luxury` : 'Luxury'),
        region: matchedLodge?.region || 'Amakhala',
        description: matchedLodge?.description || 'Luxury boutique sanctuary suite in Eastern Cape.',
        commissionRate: matchedLodge?.commissionRate ?? 0.10,
        bookingId: matchedLodge?.bookingId || targetId,
        maxCapacity: matchedLodge?.maxCapacity ?? 2,
      };

      if (matchedLodge) {
        console.log(`[MERGE] Matched & merged Google property "${propData.name}" into canonical lodge: "${matchedLodge.name}" (ID: ${targetId})`);
        mergeCount++;
      } else {
        console.log(`[CREATE] No match found. Creating new unified lodge: "${unifiedLodge.name}" (ID: ${targetId})`);
        createCount++;
      }

      // Queue write to 'lodges'
      if (!DRY_RUN) {
        const targetDocRef = doc(db, 'lodges', targetId);
        batch.set(targetDocRef, unifiedLodge, { merge: true });
      }
    });

    // 4. Preserve lodges that didn't have corresponding property data
    lodgesList.forEach((lodge) => {
      if (!mergedLodgeIds.has(lodge.id)) {
        console.log(`[KEEP] Preserving existing lodge unchanged: "${lodge.name}" (ID: ${lodge.id})`);
      }
    });

    // 5. Queue deletions for the source 'properties' collection if requested
    if (CLEANUP_SOURCE) {
      propertiesSnap.forEach((propDoc) => {
        deleteCount++;
        if (!DRY_RUN) {
          batch.delete(doc(db, 'properties', propDoc.id));
        }
      });
    }

    // 6. Commit the writes
    if (!DRY_RUN) {
      if (mergeCount > 0 || createCount > 0 || deleteCount > 0) {
        console.log('\nCommitting changes to Firestore...');
        await batch.commit();
        console.log('Successfully completed batch transactions.');
      } else {
        console.log('\nNo mutations to perform.');
      }
    } else {
      console.log('\n--- DRY RUN PREVIEW SUMMARY ---');
      console.log(`- Scraper records matched and merged into canonical lodges: ${mergeCount}`);
      console.log(`- New lodge entries to be created: ${createCount}`);
      console.log(`- Documents to be deleted from 'properties': ${CLEANUP_SOURCE ? deleteCount : '0 (Cleanup flag not set)'}`);
      console.log('\nTo execute these changes, run the script with the --execute flag:');
      console.log('  npx tsx scratch/merge-lodges.ts --execute');
      console.log('\nTo execute AND delete the old properties collection after merging, run:');
      console.log('  npx tsx scratch/merge-lodges.ts --execute --cleanup');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();
