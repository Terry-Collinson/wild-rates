const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Load environment variables from .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ROOMS_TO_SEED = [
  // 1. Quatermain's 1920's Safari Camp
  {
    id: "1134267_expedition_tent",
    property_id: "1134267",
    name: "1920s Expedition Tent",
    max_guests: 2,
    nightsbridge_id: "17176",
    description: "Authentic, rustic colonial-style canvas tent set on raised wooden decks. Immerses you in a true 1920s bush expedition experience. Includes game drives, home-styled meals, and local beverages.",
    images: [
      "https://images.unsplash.com/photo-1533587837-a281d77a858e?q=80&w=1200",
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=1200"
    ]
  },
  // 2. Safari Lodge (Amakhala)
  {
    id: "1154382_luxury_safari_hut",
    property_id: "1154382",
    name: "Luxury Safari Hut",
    max_guests: 2,
    nightsbridge_id: "11586",
    description: "Air-conditioned under-thatch luxury rooms styled with local stone and African beadwork. Glass-fronted doors lead onto private decks. Includes twice-daily game drives and all-inclusive dining.",
    images: [
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200"
    ]
  },
  {
    id: "1154382_safari_suite",
    property_id: "1154382",
    name: "Safari Suite",
    max_guests: 2,
    nightsbridge_id: "11586",
    description: "Spacious thatch-roofed safari suite featuring a private plunge pool, outdoor shower, and direct savanna views. Includes premium game drives, all-inclusive luxury meals, and beverages.",
    images: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200"
    ]
  },
  // 3. HillsNek Safari Camp
  {
    id: "415664_luxury_safari_suite",
    property_id: "415664",
    name: "Luxury Safari Suite",
    max_guests: 3,
    nightsbridge_id: "14692",
    description: "Elevated canvas tented suite connected by wooden boardwalks. Boasts a private viewing deck, luxurious deep-soak stone bath, and outdoor shower. Includes dedicated ranger service and all-inclusive dining.",
    images: [
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1200"
    ]
  },
  // 4. Reed Valley Inn
  {
    id: "415666_historic_homestead_suite",
    property_id: "415666",
    name: "Historic Homestead Suite",
    max_guests: 4,
    nightsbridge_id: "PENDING_MAPPING",
    description: "Beautiful en-suite bedroom inside the historic 1800s country farmhouse manor. Filled with country charm, antiques, and private fireplaces. Includes daily game drives and premium dining.",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200"
    ]
  },
  // 5. Induli Lodge
  {
    id: "induli-lodge_private_eco_chalet",
    property_id: "induli-lodge",
    name: "Private Eco-Chalet",
    max_guests: 6,
    nightsbridge_id: "37278",
    description: "Intimate and sustainable luxury chalet perched over the spectacular Bushman's River valley. Built with minimal eco-footprint and premium appointments. Includes private ranger and all-inclusive dining.",
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200"
    ]
  },
  // 6. Leeuwenbosch Country House
  {
    id: "leeuwenbosch-country-house_manor_suite",
    property_id: "leeuwenbosch-country-house",
    name: "Manor Suite",
    max_guests: 4,
    nightsbridge_id: "10208",
    description: "Elegant colonial-style manor suite located within the historic 1908 homestead. Exudes old-world charm, high ceilings, sash windows, and private garden patio. Includes game drives and all meals.",
    images: [
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1200"
    ]
  },
  {
    id: "leeuwenbosch-country-house_heritage_room",
    property_id: "leeuwenbosch-country-house",
    name: "Heritage Room",
    max_guests: 2,
    nightsbridge_id: "10208",
    description: "Stately master bedroom in the original country house with traditional dark wood furnishings and modern premium en-suite. Includes daily game drives and chef-prepared dining.",
    images: [
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200"
    ]
  },
  // 7. Woodbury Manor
  {
    id: "woodbury-manor_exclusive_villa",
    property_id: "woodbury-manor",
    name: "Exclusive-Use Private Villa",
    max_guests: 8,
    nightsbridge_id: "37058",
    description: "5-star exclusive-use private safari villa overlooking the Woodbury basin. Comes complete with private chef, dedicated ranger, 4 en-suite luxury suites, private pool, and boma. Perfect for families.",
    images: [
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1200",
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1200"
    ]
  }
];

async function seed() {
  console.log('Starting room types seeding into collection "room_types"...');
  console.log('Project ID:', firebaseConfig.projectId);

  for (const r of ROOMS_TO_SEED) {
    console.log(`Seeding room: "${r.name}" for Property ID: "${r.property_id}"...`);
    const docRef = doc(db, 'room_types', r.id);
    await setDoc(docRef, r, { merge: true });
    console.log(`  -> Seeded successfully!`);
  }
  
  console.log('\nAll 9 room types seeded successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
