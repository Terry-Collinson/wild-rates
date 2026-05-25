
/**
 * @fileOverview Ingestion utilities for transforming market data into Firestore-ready collections.
 * Handles the "Static" vs "Dynamic" split:
 * - Foundation (Static): properties, room_types
 * - Pulse (Dynamic): market_rates (PPPN Normalized)
 * - Intelligence: Extracts NightsBridge BBID or ProfitRoom IDs via robust regex.
 */

export function processHotelScrape(rawData: any) {
  const { results, raw } = rawData;
  if (!raw || !results || results.length === 0) {
    return { propertyDoc: null, roomTypes: [], marketRates: [] };
  }

  const hotel = results[0];
  const checkInDate = raw.search_parameters?.check_in_date || new Date().toISOString().split('T')[0];
  const propertyId = hotel.hotelId || 'unknown_property';

  // 1. AGGRESSIVE LINK DISCOVERY
  const allPricePoints = [
    ...(raw.prices || []),
    ...(raw.featured_prices || []),
    ...(raw.ads || [])
  ];
  
  const allLinks: string[] = [];
  allPricePoints.forEach((p: any) => {
    if (p.link) allLinks.push(p.link);
    if (p.rooms) {
      p.rooms.forEach((r: any) => {
        if (r.link) allLinks.push(r.link);
        if (r.booking_link) allLinks.push(r.booking_link);
      });
    }
  });

  // Target multiple direct providers: NightsBridge and ProfitRoom
  const nbLinkMatch = allLinks.find((link: string) => 
    link.includes("upperbooking.com") || 
    link.includes("nightsbridge.com") ||
    link.includes("nightsbridge.co.za") ||
    link.includes("res.nightsbridge.co.za") ||
    link.includes("direct-book.com")
  );

  const prLinkMatch = allLinks.find((link: string) => 
    link.includes("profitroom.com") || 
    link.includes("be.profitroom.com")
  );

  let bbid = "PENDING_MAPPING";
  let provider = "NightsBridge";

  // 2. ROBUST PROVIDER-AWARE EXTRACTION
  if (nbLinkMatch) {
    const match = nbLinkMatch.match(/(?:BBID|bbid)[=/](\d+)/i);
    if (match) bbid = match[1];
  } else if (prLinkMatch) {
    provider = "ProfitRoom";
    // ProfitRoom IDs are often slugs in the URL path
    const match = prLinkMatch.match(/profitroom\.com\/(?:[a-z]{2}\/)?([a-z0-9_-]+)/i);
    if (match) bbid = match[1];
  }

  // 3. PROPERTY COLLECTION DOCUMENT
  const propertyDoc = {
    id: propertyId,
    name: hotel.name || raw.name || 'Unknown Sanctuary',
    address: raw.address || '',
    phone: raw.phone || '',
    star_rating: hotel.starRating || raw.rating || 5,
    gps: raw.gps_coordinates || null,
    nightsbridge_id: bbid,
    bookingProvider: provider,
    updated_at: new Date().toISOString(),
  };

  const roomTypes: any[] = [];
  const marketRates: any[] = [];

  const featuredPrices = raw.featured_prices || [];
  
  featuredPrices.forEach((providerEntry: any) => {
    if (!providerEntry.rooms) return;

    providerEntry.rooms.forEach((room: any) => {
      if (!room || !room.name) return;

      const roomSlug = room.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const roomTypeId = `${propertyId}_${roomSlug}`;

      const providerLink = room.link || providerEntry.link || "";
      const roomIdMatch = providerLink.match(/(?:RoomID|roomid)[=/](\d+)/i);
      const nbRoomId = roomIdMatch ? roomIdMatch[1] : "PENDING_MAPPING";

      // 4. ROOM TYPE DOC (Static Foundation)
      roomTypes.push({
        id: roomTypeId,
        property_id: propertyId,
        nightsbridge_id: nbRoomId,
        name: room.name,
        images: room.images || [],
        max_guests: room.num_guests || 2,
        description: room.description || room.roomDescription || generateRoomDescription(room.name, hotel.name || raw.name || 'Amakhala'),
      });

      // 5. MARKET RATE DOC (Dynamic Pulse - PPPN Normalized)
      const rawOfficialRate = (raw.prices?.find((p:any) => p.official)?.rate_per_night?.extracted_lowest) || hotel.price || 0;
      const rawOtaRate = room.rate_per_night?.extracted_lowest || 0;

      const officialRatePPPN = Math.round(rawOfficialRate / 2);
      const otaRatePPPN = Math.round(rawOtaRate / 2);

      const sourceSlug = (providerEntry.source || 'ota').replace(/\s+/g, '_').toLowerCase();

      marketRates.push({
        id: `${roomTypeId}_${checkInDate}_${sourceSlug}`,
        room_type_id: roomTypeId,
        property_id: propertyId,
        date: checkInDate,
        official_price: officialRatePPPN,
        ota_lowest_price: otaRatePPPN,
        ota_source: providerEntry.source || 'Unknown OTA',
        price_leakage: otaRatePPPN > 0 && officialRatePPPN > otaRatePPPN,
        net_reclaim_potential: Math.round(otaRatePPPN * 0.15),
        is_verified_total: true,
        is_pppn: true,
        scraped_at: new Date().toISOString(),
      });
    });
  });

  return { propertyDoc, roomTypes, marketRates };
}

export function generateRoomDescription(roomName: string, lodgeName: string): string {
  const name = roomName.toLowerCase();
  
  if (name.includes('tent') || name.includes('canvas')) {
    return `An elegant canvas oasis at ${lodgeName}. Features premium draped tents, a private wooden viewing deck overlooking the reserve, and an en-suite bathroom with an outdoor shower. Includes two daily game drives, all luxury meals, and conservation guardianship.`;
  }
  if (name.includes('family') || name.includes('villa') || name.includes('manor')) {
    return `Spacious luxury designed for families or small groups at ${lodgeName}. Offers multiple bedrooms, expansive living areas, private deck with panoramic views, and a dedicated ranger. Includes two daily game drives, all meals, and reserve protection fees.`;
  }
  if (name.includes('honeymoon') || name.includes('executive') || name.includes('superior') || name.includes('pool')) {
    return `The ultimate premium sanctuary at ${lodgeName}. Boasts a private plunge pool, expansive lounge area, wood-burning fireplace, and breathtaking wilderness views. Includes premium game drives, dining, and direct conservation support.`;
  }
  if (name.includes('suite')) {
    return `A beautifully appointed luxury suite at ${lodgeName}. Integrates glass-fronted views, private observation deck, bespoke African styling, and premium amenities. Includes two daily game drives, all-inclusive dining, and conservation guardianship.`;
  }
  
  return `Luxury boutique accommodations at ${lodgeName}. Exquisitely finished, verified direct matching. Includes two daily game drives, premium local cuisine, and direct conservation guardianship.`;
}
