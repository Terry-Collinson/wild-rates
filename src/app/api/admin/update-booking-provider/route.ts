import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

export async function POST() {
  const logs: string[] = [];
  try {
    const existingApps = getApps();
    const app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);
    const db = getFirestore(app);

    logs.push('Fetching lodges...');
    const lodgesSnap = await getDocs(collection(db, 'lodges'));
    logs.push(`Found ${lodgesSnap.size} lodges in Firestore.`);

    let updatedCount = 0;

    for (const lodgeDoc of lodgesSnap.docs) {
      const data = lodgeDoc.data();
      const lodgeId = lodgeDoc.id;
      const name = data.name || '';
      
      const isHlosi = lodgeId === '336715' || name.toLowerCase().includes('hlosi');
      const isBukela = lodgeId === '336709' || name.toLowerCase().includes('bukela');

      if (isHlosi || isBukela) {
        logs.push(`Updating ${name} (${lodgeId}) to bookingProvider: 'ProfitRoom'`);
        const docRef = doc(db, 'lodges', lodgeId);
        await updateDoc(docRef, {
          bookingProvider: 'ProfitRoom'
        });
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      logs
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      logs
    }, { status: 500 });
  }
}
