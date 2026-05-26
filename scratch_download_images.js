const fs = require('fs-extra');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc } = require('firebase/firestore');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
});
const db = getFirestore(app);

const SERP_API_KEY = 'ed6e9bd15689a702ca76f7374fc39a1d7fc011e18d426a7538474ea844b78068';
const SIZE_THRESHOLD_BYTES = 10240; // 10 KB (HTML error files are around 3 KB)

const toKebabCase = (str) => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

async function run() {
  const publicDir = path.join(process.cwd(), 'public');
  
  // 1. Fetch Lodges from Firestore
  console.log('Fetching lodges from Firestore...');
  const lodgesSnap = await getDocs(collection(db, 'lodges'));
  const lodges = [];
  
  lodgesSnap.forEach(d => {
    const data = d.data();
    if (data.google_hotel_id && data.name) {
      let folderName = toKebabCase(data.name.split('-')[0].trim());
      if (folderName === 'amakhala-bush-lodge') folderName = 'bush-lodge-amakhala';
      
      lodges.push({
        id: d.id,
        googleHotelId: data.google_hotel_id,
        name: data.name,
        folder: folderName
      });
    }
  });
  console.log(`Loaded ${lodges.length} lodges from Firestore.`);

  // 2. Fetch Room Types from Firestore
  console.log('Fetching room types from Firestore...');
  const roomsSnap = await getDocs(collection(db, 'room_types'));
  const roomsByProp = {};
  roomsSnap.forEach(d => {
    const data = d.data();
    const propId = data.property_id || 'unknown';
    if (!roomsByProp[propId]) roomsByProp[propId] = [];
    roomsByProp[propId].push({ id: d.id, ref: d.ref, ...data });
  });

  // 3. Sync Lodges via SerpApi
  for (const lodge of lodges) {
    console.log(`\n==========================================`);
    console.log(`Processing Lodge: ${lodge.name}`);
    console.log(`==========================================`);
    
    const propRooms = roomsByProp[lodge.googleHotelId] || roomsByProp[lodge.id] || [];
    if (propRooms.length === 0) {
      console.log(`No registered room types found in Firestore for ${lodge.name}`);
      continue;
    }

    const queryName = lodge.name.includes('Amakhala') ? lodge.name : `${lodge.name} Amakhala`;
    const searchUrl = `https://serpapi.com/search.json?engine=google_hotels&q=${encodeURIComponent(queryName)}&check_in_date=2026-06-15&check_out_date=2026-06-16&api_key=${SERP_API_KEY}`;
    
    let activeRoomsList = [];
    let fallbackImages = [];
    
    try {
      console.log(`Fetching active hotel details from SerpApi...`);
      const res = await axios.get(searchUrl);
      const data = res.data;
      
      // Load room-specific images if available
      const featured = data.featured_prices || data.properties?.[0]?.featured_prices || [];
      featured.forEach(provider => {
        if (provider.rooms) {
          provider.rooms.forEach(r => {
            if (r.name && r.images && r.images.length > 0) {
              activeRoomsList.push(r);
            }
          });
        }
      });

      // Load general lodge photos as solid backup
      if (data.images && data.images.length > 0) {
        fallbackImages = data.images.map(img => img.original_image || img.thumbnail).filter(Boolean);
      } else if (data.properties?.[0]?.images && data.properties[0].images.length > 0) {
        fallbackImages = data.properties[0].images.map(img => img.original_image || img.thumbnail).filter(Boolean);
      }
      
      console.log(`Found ${activeRoomsList.length} rooms with active images. Fallback gallery has ${fallbackImages.length} images.`);
    } catch (err) {
      console.error(`SerpApi search failed for ${lodge.name}: ${err.message}`);
      continue;
    }

    // Create local folder
    const targetDir = path.join(publicDir, 'assets', 'lodges', lodge.folder);
    await fs.ensureDir(targetDir);

    // Download images for each room type
    let fallbackIndex = 0;
    for (const room of propRooms) {
      console.log(`\n  -> Room Type: ${room.name}`);
      
      // Attempt to match room name
      let imageUrls = [];
      const matchedScraped = activeRoomsList.find(ar => 
        ar.name.toLowerCase().includes(room.name.toLowerCase()) ||
        room.name.toLowerCase().includes(ar.name.toLowerCase())
      );

      if (matchedScraped) {
        imageUrls = matchedScraped.images || [];
      } else if (fallbackImages.length > 0) {
        const sliceStart = (fallbackIndex * 3) % fallbackImages.length;
        imageUrls = fallbackImages.slice(sliceStart, sliceStart + 3);
        if (imageUrls.length === 0) imageUrls = [fallbackImages[0]];
        fallbackIndex++;
      }

      if (imageUrls.length === 0) {
        console.log(`  !! No images available to download.`);
        continue;
      }

      const localImages = [];
      const roomFileNameBase = toKebabCase(room.name);
      
      const downloadLimit = Math.min(imageUrls.length, 5);
      for (let i = 0; i < downloadLimit; i++) {
        const freshUrl = imageUrls[i];
        const fileName = `${roomFileNameBase}-${i + 1}.jpg`;
        const absoluteFilePath = path.join(targetDir, fileName);
        const localPath = `/assets/lodges/${lodge.folder}/${fileName}`;

        // Smart skip: Check if file already exists and is size-validated
        if (fs.existsSync(absoluteFilePath)) {
          try {
            const stats = fs.statSync(absoluteFilePath);
            if (stats.size >= SIZE_THRESHOLD_BYTES) {
              console.log(`     [SKIPPED] ${fileName} already downloaded and verified (${Math.round(stats.size / 1024)} KB)`);
              localImages.push(localPath);
              continue;
            } else {
              console.log(`     [REDOWNLOAD] ${fileName} exists but is invalid/small (${Math.round(stats.size / 1024)} KB)`);
            }
          } catch (statErr) {
            // Proceed to download on error
          }
        }

        try {
          console.log(`  -> Downloading Image ${i + 1} of ${downloadLimit}...`);
          const imgRes = await axios.get(freshUrl, {
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
              'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9'
            }
          });

          if (imgRes.status === 200 && imgRes.data.length > 3000) {
            await fs.writeFile(absoluteFilePath, imgRes.data);
            localImages.push(localPath);
            console.log(`     Saved locally: ${localPath} (${Math.round(imgRes.data.length / 1024)} KB)`);
          } else {
            console.log(`     Failed: Got status ${imgRes.status} or small file size.`);
          }
        } catch (dlErr) {
          console.error(`     Failed to download: ${dlErr.message}`);
        }
      }

      if (localImages.length > 0) {
        console.log(`  -> Updating Firestore room type with local images...`);
        await updateDoc(room.ref, {
          localImages: localImages,
          localImage: localImages[0],
          images: imageUrls,
          mediaSyncedAt: new Date().toISOString()
        });
      }
    }
  }

  console.log('\n==========================================');
  console.log('Image download completed successfully!');
  console.log('==========================================');
}

run().catch(console.error);
