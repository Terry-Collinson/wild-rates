import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

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

export async function POST(request: Request) {
  const logs: string[] = [];
  const addLog = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    const { dryRun = false, cleanup = false } = await request.json().catch(() => ({}));

    const existingApps = getApps();
    const app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);
    const db = getFirestore(app);

    addLog('--- FIRESTORE COLLECTION MERGE API INITIATED ---');
    addLog(`Mode: ${dryRun ? '⚡ DRY RUN' : '🔥 EXECUTE'}`);
    addLog(`Cleanup properties: ${cleanup ? 'Yes' : 'No'}`);

    addLog('Fetching properties...');
    const propertiesSnap = await getDocs(collection(db, 'properties'));
    addLog(`Found ${propertiesSnap.size} documents in 'properties'.`);

    addLog('Fetching lodges...');
    const lodgesSnap = await getDocs(collection(db, 'lodges'));
    addLog(`Found ${lodgesSnap.size} documents in 'lodges'.`);

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
        google_hotel_id: propId,
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
        addLog(`[MERGE] Matched Google property "${propData.name}" -> canonical "${matchedLodge.name}" (${targetId})`);
        mergeCount++;
      } else {
        addLog(`[CREATE] Creating new unified lodge: "${unifiedLodge.name}" (${targetId})`);
        createCount++;
      }

      // Queue write to 'lodges'
      if (!dryRun) {
        const targetDocRef = doc(db, 'lodges', targetId);
        batch.set(targetDocRef, unifiedLodge, { merge: true });
      }
    });

    // 4. Preserve lodges that didn't have corresponding property data
    lodgesList.forEach((lodge) => {
      if (!mergedLodgeIds.has(lodge.id)) {
        addLog(`[KEEP] Preserving existing lodge unchanged: "${lodge.name}" (${lodge.id})`);
      }
    });

    // 5. Queue deletions for the source 'properties' collection if requested
    if (cleanup) {
      propertiesSnap.forEach((propDoc) => {
        deleteCount++;
        if (!dryRun) {
          batch.delete(doc(db, 'properties', propDoc.id));
        }
      });
    }

    // 6. Commit the writes
    if (!dryRun) {
      if (mergeCount > 0 || createCount > 0 || deleteCount > 0) {
        addLog('Committing changes to Firestore...');
        await batch.commit();
        addLog('Successfully completed batch transactions.');
      } else {
        addLog('No mutations to perform.');
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      cleanup,
      stats: {
        merged: mergeCount,
        created: createCount,
        deleted: deleteCount
      },
      logs
    });

  } catch (error: any) {
    addLog(`FATAL: ${error.message}`);
    return NextResponse.json({ success: false, error: error.message, logs }, { status: 500 });
  }
}
