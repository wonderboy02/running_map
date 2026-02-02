import { NextRequest, NextResponse } from 'next/server';

interface GeocodeAddress {
  roadAddress: string;
  jibunAddress: string;
  latitude: number;
  longitude: number;
  source: 'geocode' | 'place';
  placeName?: string;
  category?: string;
  phone?: string;
}

// --- Naver Geocoding API (NCP Maps) ---

interface NaverGeocodeAddress {
  roadAddress: string;
  jibunAddress: string;
  x: string;
  y: string;
}

interface NaverGeocodeResponse {
  status: string;
  addresses: NaverGeocodeAddress[];
}

async function searchGeocode(query: string): Promise<GeocodeAddress[]> {
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

  if (!clientId || !clientSecret) return [];

  const url = new URL('https://maps.apigw.ntruss.com/map-geocode/v2/geocode');
  url.searchParams.set('query', query);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.error(`[Geocode API] ${res.status}: ${errorText}`);
      return [];
    }

    const data: NaverGeocodeResponse = await res.json();
    if (data.status !== 'OK' || !data.addresses) return [];

    console.log(`[Geocode API] ${data.addresses.length}건 결과`);
    return data.addresses.map((addr) => ({
      roadAddress: addr.roadAddress,
      jibunAddress: addr.jibunAddress,
      latitude: parseFloat(addr.y),
      longitude: parseFloat(addr.x),
      source: 'geocode' as const,
    }));
  } catch (err) {
    console.error('[Geocode API] Error:', err);
    return [];
  }
}

// --- Naver Local Search API (developers.naver.com) ---

interface NaverLocalItem {
  title: string;
  category: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
}

interface NaverLocalResponse {
  items: NaverLocalItem[];
}

function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

async function searchLocal(query: string): Promise<GeocodeAddress[]> {
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) return [];

  const url = new URL('https://openapi.naver.com/v1/search/local.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', '5');

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.error(`[Local Search API] ${res.status}: ${errorText}`);
      return [];
    }

    const data: NaverLocalResponse = await res.json();
    if (!data.items) return [];

    console.log(`[Local Search API] ${data.items.length}건 결과`);
    return data.items
      .filter((item) => item.mapx && item.mapy)
      .map((item) => ({
        roadAddress: item.roadAddress || item.address,
        jibunAddress: item.address,
        latitude: parseInt(item.mapy, 10) / 10_000_000,
        longitude: parseInt(item.mapx, 10) / 10_000_000,
        source: 'place' as const,
        placeName: stripHtmlTags(item.title),
        category: item.category,
        phone: item.telephone || undefined,
      }));
  } catch (err) {
    console.error('[Local Search API] Error:', err);
    return [];
  }
}

// --- Combined handler ---

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query');

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ addresses: [] });
  }

  const trimmed = query.trim();

  // 두 API를 병렬로 호출
  const [geocodeResults, localResults] = await Promise.all([
    searchGeocode(trimmed),
    searchLocal(trimmed),
  ]);

  // 장소 검색 결과를 먼저 표시하고, 주소 검색 결과를 뒤에 배치
  const addresses = [...localResults, ...geocodeResults];

  console.log(`[Geocode Route] query="${trimmed}" → geocode: ${geocodeResults.length}, local: ${localResults.length}, total: ${addresses.length}`);

  return NextResponse.json({ addresses });
}
