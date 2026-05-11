
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'Amakhala Game Reserve';
  const arrival = searchParams.get('arrival') || '2026-05-15';
  const departure = searchParams.get('departure') || '2026-05-16';
  const adults = searchParams.get('adults') || '2';
  const rooms = searchParams.get('rooms') || '1';
  const mode = searchParams.get('mode') || 'availability';
  const hotelId = searchParams.get('hotelId');

  const SERP_API_KEY = 'ed6e9bd15689a702ca76f7374fc39a1d7fc011e18d426a7538474ea844b78068';
  const RAPID_API_KEY = 'qw7M4kAE8Q6y43Ep3kGAMmTd1sSTjetC';
  const RAPID_API_HOST = 'apidojo-booking-v1.p.rapidapi.com';

  try {
    // 1. ADMIN SYNC MODE: Booking.com deep metadata
    if (mode === 'sync' && hotelId) {
      const listUrl = new URL(`https://${RAPID_API_HOST}/properties/list`);
      listUrl.searchParams.append('hotel_ids', hotelId);
      listUrl.searchParams.append('arrival_date', arrival);
      listUrl.searchParams.append('departure_date', departure);
      listUrl.searchParams.append('adults_qty', adults);
      listUrl.searchParams.append('room_qty', rooms);
      listUrl.searchParams.append('currency_code', 'ZAR');

      const listRes = await fetch(listUrl.toString(), {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': RAPID_API_HOST }
      });
      const listData = await listRes.json();
      const metadata = listData?.result?.[0] || null;

      const availUrl = new URL(`https://${RAPID_API_HOST}/properties/get-hotel-all-availability`);
      availUrl.searchParams.append('hotel_id', hotelId);
      availUrl.searchParams.append('checkin_date', arrival);
      availUrl.searchParams.append('checkout_date', departure);
      availUrl.searchParams.append('adults_number', adults);
      availUrl.searchParams.append('room_number', rooms);

      const availRes = await fetch(availUrl.toString(), {
        headers: { 'x-rapidapi-key': RAPID_API_KEY, 'x-rapidapi-host': RAPID_API_HOST }
      });
      const availData = await availRes.json();
      let blocks = Array.isArray(availData) ? availData : (availData?.result || []);

      return NextResponse.json({ metadata, blocks });
    }

    // 2. UNIVERSAL PULLER: Hybrid Logic (Detailed vs List)
    const searchUrl = new URL('https://serpapi.com/search.json');
    searchUrl.searchParams.append('engine', 'google_hotels');
    searchUrl.searchParams.append('q', query);
    searchUrl.searchParams.append('check_in_date', arrival);
    searchUrl.searchParams.append('check_out_date', departure);
    searchUrl.searchParams.append('adults', adults);
    searchUrl.searchParams.append('api_key', SERP_API_KEY);
    searchUrl.searchParams.append('currency', 'ZAR');
    searchUrl.searchParams.append('gl', 'za');

    const serpRes = await fetch(searchUrl.toString());
    const serpData = await serpRes.json();

    const isDetailed = serpData.type === "hotel" && serpData.name;
    const standardizedResults: any[] = [];
    const seenNames = new Set();

    if (isDetailed) {
      const featured = serpData.featured_prices || [];
      const competitors = featured.map((f: any) => ({
        source: f.source,
        price: f.rate_per_night?.extracted_lowest || 0,
        link: f.link
      }));

      const lowestFeatured = featured.reduce((min: number, curr: any) => {
        const p = curr.rate_per_night?.extracted_lowest || 0;
        return (p > 0 && (min === 0 || p < min)) ? p : min;
      }, 0);

      const cleanPrice = lowestFeatured || serpData.rate_per_night?.extracted_lowest || 0;

      standardizedResults.push({
        hotelId: serpData.property_token || 'detailed-match',
        name: serpData.name,
        price: cleanPrice,
        competitors: competitors,
        currency: serpData.search_parameters?.currency || 'ZAR',
        source: serpData.source || 'Google Market Pull',
        image: serpData.images?.[0]?.original_image || serpData.images?.[0]?.thumbnail || '',
        isAvailable: cleanPrice > 0,
        statusNote: cleanPrice > 0 ? null : "Inquire Direct",
        starRating: serpData.rating || 5
      });
    } else {
      const allFound = [
        ...(serpData.ads || []),
        ...(serpData.properties || [])
      ];

      allFound.forEach((prop: any) => {
        const name = prop.name || prop.title || query;
        if (seenNames.has(name)) return;
        seenNames.add(name);

        const featured = prop.featured_prices || [];
        const competitors = featured.map((f: any) => ({
          source: f.source,
          price: f.rate_per_night?.extracted_lowest || 0,
          link: f.link
        }));

        const rawPrice = 
          prop.rate_per_night?.extracted_lowest || 
          prop.rate_per_night?.lowest ||
          prop.extracted_price || 
          prop.price || 
          0;

        const cleanPrice = typeof rawPrice === 'string' 
          ? parseFloat(rawPrice.replace(/[^0-9.]/g, '')) 
          : rawPrice;

        standardizedResults.push({
          hotelId: prop.hotel_id || prop.property_token || 'list-item',
          name: name,
          price: cleanPrice,
          competitors: competitors,
          currency: serpData.search_parameters?.currency || 'ZAR',
          source: prop.source || 'Google Market Pull',
          image: prop.thumbnail || prop.images?.[0]?.thumbnail || '',
          isAvailable: cleanPrice > 0,
          statusNote: cleanPrice > 0 ? null : "Inquire Direct",
          starRating: prop.rating || 5
        });
      });
    }

    if (standardizedResults.length === 0 && query) {
      standardizedResults.push({
        hotelId: 'fallback',
        name: query,
        price: 0,
        competitors: [],
        currency: 'ZAR',
        source: 'Identity Fallback',
        image: '',
        isAvailable: false,
        statusNote: 'High Demand - Inquire Direct',
        starRating: 5
      });
    }

    return NextResponse.json({ 
      results: standardizedResults,
      discoveryCount: standardizedResults.length,
      engine: isDetailed ? "Google Hotels / Detailed Dashboard" : "Google Hotels / Properties List",
      raw: serpData 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
