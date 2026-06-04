import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

// Static mapping matrix for Profitroom integration (Lion Roars portfolio)
const PROFITROOM_PROPERTIES: Record<string, { hotelId: string; rateCode: string }> = {
  // Hlosi Game Lodge
  '336715': { hotelId: 'hlosigamelodge', rateCode: 'WILDLIFEHERO-CUG' },
  '415665': { hotelId: 'hlosigamelodge', rateCode: 'WILDLIFEHERO-CUG' },
  'hlosi': { hotelId: 'hlosigamelodge', rateCode: 'WILDLIFEHERO-CUG' },
  
  // Bukela Game Lodge
  '336709': { hotelId: 'bukelagamelodge', rateCode: 'WILDLIFEHERO-CUG' },
  '354146': { hotelId: 'bukelagamelodge', rateCode: 'WILDLIFEHERO-CUG' },
  'bukela': { hotelId: 'bukelagamelodge', rateCode: 'WILDLIFEHERO-CUG' }
};

// NightsBridge static ID map fallback (from mock-data / Firestore)
const NIGHTSBRIDGE_ID_MAP: Record<string, string> = {
  '336711': '11586', // Amakhala Bush Lodge
  '415664': '14692', // HillsNek Safari Camp
  '336717': '14690', // Woodbury Lodge
  '1162608': '17176', // Quatermain's Safari Camp
  '336718': '14691', // Woodbury Tented Camp
  '336716': '11585'  // Safari Lodge (Amakhala)
};

const SECRET_KEY = process.env.PROFITROOM_JWT_SECRET || 'wild_rates_secure_cug_salt_2026';

/**
 * Generates a cryptographic session ID to sign checkout requests,
 * validating authenticity and preventing public web scraping.
 */
function generateAuthSessionToken(hotelId: string, checkIn: string, checkOut: string, adults: number): string {
  return createHmac('sha256', SECRET_KEY)
    .update(`${hotelId}:${checkIn}:${checkOut}:${adults}`)
    .digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      propertyId, 
      checkIn, 
      checkOut, 
      adults = 2, 
      children = 0, 
      childAges = [] 
    } = body;

    if (!propertyId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Missing required parameters: propertyId, checkIn, checkOut' },
        { status: 400 }
      );
    }

    // Normalized property identifier check
    const normalizedId = String(propertyId).toLowerCase().trim();
    const profitroomConfig = PROFITROOM_PROPERTIES[normalizedId];

    // 1. CORE LOGIC: ROUTING SWITCH
    if (profitroomConfig) {
      const { hotelId, rateCode } = profitroomConfig;

      // 2. PROFITROOM STEP 3 PROTOCOL
      const token = generateAuthSessionToken(hotelId, checkIn, checkOut, Number(adults));
      const targetUrl = `https://booking.profitroom.com/hotel/v3/${hotelId}/step3/`;

      const payload = {
        hotelId: hotelId,
        checkIn: checkIn,
        checkOut: checkOut,
        'rooms[0][adults]': String(adults),
        'rooms[0][children]': String(children),
        rateCode: rateCode,
        discountCode: 'WILD5',
        token: token
      };

      return NextResponse.json({
        engine: 'Profitroom',
        routingCode: 'LR_DIRECT_PROFITROOM_CRS',
        targetUrl,
        method: 'POST',
        payload
      });
    } else {
      // 3. NIGHTSBRIDGE FALLBACK
      const nightsbridgeId = NIGHTSBRIDGE_ID_MAP[normalizedId] || '11586'; // default fallback
      const targetUrl = `https://www.nightsbridge.co.za/bridge/book`;

      const payload = {
        bbid: nightsbridgeId,
        startdate: checkIn,
        enddate: checkOut,
        adults: String(adults),
        children: String(children)
      };

      return NextResponse.json({
        engine: 'NightsBridge',
        routingCode: 'NB_INVENTORY_ENGINE',
        targetUrl,
        method: 'GET',
        payload
      });
    }

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
