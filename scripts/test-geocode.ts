/**
 * 좌표 변환 테스트 스크립트
 * 사용법: npx tsx scripts/test-geocode.ts
 */

import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const NAVER_SEARCH_CLIENT_ID = process.env.NAVER_SEARCH_CLIENT_ID;
const NAVER_SEARCH_CLIENT_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET;
const NAVER_MAP_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
const NAVER_MAP_CLIENT_SECRET = process.env.NAVER_MAP_CLIENT_SECRET;

interface GeoResult {
  latitude: number;
  longitude: number;
  roadAddress: string;
  source: 'local' | 'geocode';
}

async function searchLocal(query: string): Promise<GeoResult | null> {
  if (!NAVER_SEARCH_CLIENT_ID || !NAVER_SEARCH_CLIENT_SECRET) return null;

  const url = new URL('https://openapi.naver.com/v1/search/local.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', '3');

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id': NAVER_SEARCH_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_SEARCH_CLIENT_SECRET,
      },
    });
    if (!res.ok) return null;

    const data = await res.json();
    console.log(`  [local] 원본 응답 (${data.items?.length ?? 0}건):`);
    data.items?.forEach((item: any, i: number) => {
      console.log(`    [${i}] title: "${item.title}"`);
      console.log(`        category: "${item.category}"`);
      console.log(`        address: "${item.address}"`);
      console.log(`        roadAddress: "${item.roadAddress}"`);
      console.log(`        mapx: ${item.mapx}, mapy: ${item.mapy}`);
      console.log(`        telephone: "${item.telephone}"`);
    });

    const item = data.items?.[0];
    if (!item?.mapx || !item?.mapy) return null;

    return {
      latitude: parseInt(item.mapy, 10) / 10_000_000,
      longitude: parseInt(item.mapx, 10) / 10_000_000,
      roadAddress: item.roadAddress || item.address,
      source: 'local',
    };
  } catch {
    return null;
  }
}

async function searchGeocode(query: string): Promise<GeoResult | null> {
  if (!NAVER_MAP_CLIENT_ID || !NAVER_MAP_CLIENT_SECRET) return null;

  const url = new URL('https://maps.apigw.ntruss.com/map-geocode/v2/geocode');
  url.searchParams.set('query', query);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': NAVER_MAP_CLIENT_ID,
        'X-NCP-APIGW-API-KEY': NAVER_MAP_CLIENT_SECRET,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 'OK' || !data.addresses?.length) return null;

    const addr = data.addresses[0];
    return {
      latitude: parseFloat(addr.y),
      longitude: parseFloat(addr.x),
      roadAddress: addr.roadAddress || query,
      source: 'geocode',
    };
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── 테스트 실행 ──────────────────────────────────────────────

const testQueries = [
  '서울역 1번출구',
  '서울역 2번출구',
  '서울역 3번출구',
  '서울역 4번출구',
  '서울역 5번출구',
  '서울역 6번출구',
  '서울역 7번출구',
  '서울역 8번출구',
];

async function main() {
  console.log('--- 좌표 변환 테스트 ---\n');

  for (const query of testQueries) {
    process.stdout.write(`"${query}"\n`);

    const localResult = await searchLocal(query);
    if (localResult) {
      console.log(`  [local]   (${localResult.latitude}, ${localResult.longitude}) -> ${localResult.roadAddress}`);
    } else {
      console.log(`  [local]   FAIL`);
    }

    const geocodeResult = await searchGeocode(query);
    if (geocodeResult) {
      console.log(`  [geocode] (${geocodeResult.latitude}, ${geocodeResult.longitude}) -> ${geocodeResult.roadAddress}`);
    } else {
      console.log(`  [geocode] FAIL`);
    }

    const used = localResult || geocodeResult;
    console.log(`  => ${used ? `OK (${used.source})` : 'BOTH FAILED'}\n`);

    await sleep(300);
  }
}

main().catch(console.error);
