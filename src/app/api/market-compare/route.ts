import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q'); // e.g., "Hlosi Game Lodge"
  const checkIn = searchParams.get('arrival');
  const checkOut = searchParams.get('departure');

  const SERP_API_KEY = 'ed6e9bd15689a702ca76f7374fc39a1d7fc011e18d426a7538474ea844b78068';

  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.append('engine', 'google_hotels');
  url.searchParams.append('q', q || '');
  url.searchParams.append('check_in_date', checkIn || '');
  url.searchParams.append('check_out_date', checkOut || '');
  url.searchParams.append('api_key', SERP_API_KEY);
  url.searchParams.append('currency', 'ZAR');
  url.searchParams.append('gl', 'za'); // Search from South Africa

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    // SerpApi returns the "best" prices in the 'properties' or 'brands' array
    const hotel = data.properties?.[0] || {};
    
    return NextResponse.json({
      lodgeName: hotel.name,
      bestPublicRate: hotel.rate_per_night?.lowest || 0,
      allPrices: hotel.odds_and_ends?.other_sites || [], // Shows Agoda, Booking, etc.
      link: hotel.link,
      raw: data // for debugging analysis
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
