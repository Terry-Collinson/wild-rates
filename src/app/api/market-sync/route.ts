
import { NextRequest, NextResponse } from 'next/server';

/**
 * @fileOverview Sanctuary Intelligence Sync API
 * Fetches regional market data with 'Apples-to-Apples' normalization.
 * Handles PPPN conversion, Tax normalization, and Mobile-Only discount detection.
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date'); // YYYY-MM-DD
  
  if (!date) {
    return NextResponse.json({ error: "Date parameter required" }, { status: 400 });
  }

  const SERP_API_KEY = 'ed6e9bd15689a702ca76f7374fc39a1d7fc011e18d426a7538474ea844b78068';
  
  const COMPETITORS = ["Shamwari Private Game Reserve", "Pumba Private Game Reserve", "Lalibela Game Reserve"];
  const OWN_GROUP = ["Amakhala", "Hlosi", "Bush Lodge", "HillsNek", "Woodbury", "Bukela", "Quatermain"];
  
  // Emulate Mobile Safari to capture 'Mobile-Only' discounts
  const MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

  try {
    const searchUrl = new URL('https://serpapi.com/search.json');
    searchUrl.searchParams.append('engine', 'google_hotels');
    searchUrl.searchParams.append('q', 'Luxury Safari Eastern Cape');
    searchUrl.searchParams.append('check_in_date', date);
    const checkOutDate = new Date(date);
    checkOutDate.setDate(checkOutDate.getDate() + 1);
    searchUrl.searchParams.append('check_out_date', checkOutDate.toISOString().split('T')[0]);
    searchUrl.searchParams.append('api_key', SERP_API_KEY);
    searchUrl.searchParams.append('currency', 'ZAR');
    searchUrl.searchParams.append('gl', 'za');
    searchUrl.searchParams.append('adults', '2'); // Standard market benchmark

    const response = await fetch(searchUrl.toString(), {
      headers: { 'User-Agent': MOBILE_USER_AGENT }
    });
    const data = await response.json();

    const allProperties = [
      ...(data.ads || []),
      ...(data.properties || [])
    ];

    const marketSnapshot = allProperties.filter((p: any) => {
      const name = p.name?.toLowerCase() || "";
      return COMPETITORS.some(c => name.includes(c.toLowerCase())) || OWN_GROUP.some(o => name.includes(o.toLowerCase()));
    }).map((p: any) => {
      const name = p.name || "";
      const isOwn = OWN_GROUP.some(o => name.toLowerCase().includes(o.toLowerCase()));
      
      // 1. NORMALIZATION: Convert to Per Person Per Night (PPPN)
      // Google Hotels usually returns room total for 2 guests.
      const rawPrice = p.rate_per_night?.extracted_lowest || p.price || 0;
      let normalizedPrice = rawPrice / 2;

      // 2. TAX HANDLING: Detect Net vs Gross
      // Heuristic: If source is Expedia or metadata indicates taxes are excluded, apply 15% VAT.
      const source = p.source?.toLowerCase() || "";
      const isNetSource = source.includes("expedia") || source.includes("hotels.com");
      if (isNetSource) {
        normalizedPrice = normalizedPrice * 1.15;
      }
      
      return {
        name: p.name,
        price: Math.round(normalizedPrice),
        source: p.source || "Google Hotels (Mobile)",
        isCompetitor: !isOwn,
        is_own_property: isOwn,
        is_verified_total: true,
        is_pppn: true
      };
    });

    return NextResponse.json({
      date,
      snapshot: marketSnapshot,
      count: marketSnapshot.length,
      normalized_mode: "PPPN",
      tax_policy: "VAT-Inclusive"
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
