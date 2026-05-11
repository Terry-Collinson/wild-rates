import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { firebaseConfig } from '@/firebase/config';

// Helper to convert string to kebab-case
const toKebabCase = (str: string) => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export async function POST() {
  const stats = {
    total: 0,
    success: 0,
    failed: 0,
    logs: [] as string[],
  };

  const addLog = (msg: string) => {
    console.log(msg);
    stats.logs.push(msg);
  };

  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'booking-service-1c217';
    addLog(`Starting REST Sync for Project: ${projectId}`);

    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

    // 1. Fetch Properties (for naming)
    addLog('Fetching properties via REST...');
    const propRes = await axios.get(`${baseUrl}/properties?pageSize=100`);
    const propertyMap = new Map<string, string>();
    
    if (propRes.data.documents) {
      propRes.data.documents.forEach((doc: any) => {
        const id = doc.name.split('/').pop();
        const name = doc.fields?.name?.stringValue || id;
        propertyMap.set(id, name);
      });
    }
    addLog(`Mapped ${propertyMap.size} properties.`);

    // 2. Fetch Room Types
    addLog('Fetching room_types via REST...');
    const roomRes = await axios.get(`${baseUrl}/room_types?pageSize=100`);
    const roomDocs = roomRes.data.documents || [];
    stats.total = roomDocs.length;
    addLog(`Found ${roomDocs.length} rooms to process.`);

    // 3. Launch Puppeteer Browser for "Human" downloads
    addLog('Launching Stealth Browser...');
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    const publicDir = path.join(process.cwd(), 'public');

    for (const doc of roomDocs) {
      const roomDocId = doc.name.split('/').pop();
      const fields = doc.fields || {};
      
      // Extract data from REST format
      const roomName = fields.name?.stringValue || fields.roomName?.stringValue || 'room';
      let propertyId = fields.property_id?.stringValue || fields.lodgeId?.stringValue || fields.propertyId?.stringValue;
      
      if (!propertyId && roomDocId.includes('_')) {
        propertyId = roomDocId.split('_')[0];
      }

      const propertyName = propertyMap.get(propertyId) || fields.lodgeName?.stringValue || propertyId || 'unknown-lodge';
      const cleanPropertyName = propertyName.split('-')[0].trim();
      const folderName = toKebabCase(cleanPropertyName);
      const roomFileNameBase = toKebabCase(roomName);

      addLog(`Processing: [${cleanPropertyName}] - ${roomName}`);

      // Extract Images from REST array
      const imageUrls: string[] = [];
      const imagesField = fields.images?.arrayValue?.values || [];
      imagesField.forEach((val: any) => {
        let url = val.stringValue;
        if (url) {
          if (url.startsWith('/hrppk/')) url = 'https://lh3.googleusercontent.com' + url;
          if (url.startsWith('http')) imageUrls.push(url);
        }
      });

      if (imageUrls.length === 0) {
        const singleImg = fields.image?.stringValue || fields.url?.stringValue;
        if (singleImg && singleImg.startsWith('http')) imageUrls.push(singleImg);
      }

      if (imageUrls.length === 0) {
        addLog(`  -> No images found.`);
        continue;
      }

      try {
        const targetDir = path.join(publicDir, 'assets', 'lodges', folderName);
        await fs.ensureDir(targetDir);

        const localImages: string[] = [];
        for (let i = 0; i < imageUrls.length; i++) {
          let imageUrl = imageUrls[i];
          
          // Option 1: Strip parameters (anything after =) to get the raw image
          if (imageUrl.includes('=')) {
            imageUrl = imageUrl.split('=')[0];
          }
          
          const fileName = `${roomFileNameBase}-${i + 1}.jpg`;
          const absoluteFilePath = path.join(targetDir, fileName);
          const localPath = `/assets/lodges/${folderName}/${fileName}`;

          try {
            addLog(`  -> Syncing Image ${i+1} via Stealth...`);
            
            const viewSource = await page.goto(imageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            if (viewSource) {
              const buffer = await viewSource.buffer();
              await fs.writeFile(absoluteFilePath, buffer);
              localImages.push(localPath);
            } else {
              throw new Error('Could not get image buffer');
            }
          } catch (e: any) {
            addLog(`  !! Image Failed: ${e.message}`);
          }
        }

        if (localImages.length > 0) {
          // 3. Update Firestore via PATCH (REST)
          addLog(`  -> Success. Updating Firestore...`);
          const updateUrl = `https://firestore.googleapis.com/v1/${doc.name}?updateMask.fieldPaths=localImages&updateMask.fieldPaths=localImage&updateMask.fieldPaths=mediaSyncedAt`;
          
          await axios.patch(updateUrl, {
            fields: {
              localImages: { arrayValue: { values: localImages.map(url => ({ stringValue: url })) } },
              localImage: { stringValue: localImages[0] },
              mediaSyncedAt: { stringValue: new Date().toISOString() }
            }
          });
          
          stats.success++;
        }
      } catch (err: any) {
        addLog(`  !! Error: ${err.message}`);
        stats.failed++;
      }
    }

    await browser.close();
    addLog(`Sync finished. Success: ${stats.success}, Failed: ${stats.failed}`);
    return NextResponse.json({ message: 'Sync completed', stats });
  } catch (error: any) {
    addLog(`FATAL: ${error.message}`);
    return NextResponse.json({ error: error.message, stats }, { status: 500 });
  }
}
