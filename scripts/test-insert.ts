/**
 * 서울역 1~8번출구 테스트 삽입
 * 사용법: npx tsx scripts/test-insert.ts
 */

import * as path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NAVER_SEARCH_CLIENT_ID = process.env.NAVER_SEARCH_CLIENT_ID!;
const NAVER_SEARCH_CLIENT_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET!;

async function searchLocal(query: string) {
  const url = new URL('https://openapi.naver.com/v1/search/local.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', '1');

  const res = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': NAVER_SEARCH_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_SEARCH_CLIENT_SECRET,
    },
  });

  const data = await res.json();
  const item = data.items?.[0];
  if (!item?.mapx || !item?.mapy) return null;

  return {
    latitude: parseInt(item.mapy, 10) / 10_000_000,
    longitude: parseInt(item.mapx, 10) / 10_000_000,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const exits = Array.from({ length: 8 }, (_, i) => `서울역 ${i + 1}번출구`);

  console.log('--- 좌표 변환 ---');
  const spots = [];

  for (const name of exits) {
    const result = await searchLocal(name);
    if (!result) {
      console.log(`  ${name} - FAIL`);
      continue;
    }
    console.log(`  ${name} -> (${result.latitude}, ${result.longitude})`);
    spots.push({
      name,
      address: name,
      latitude: result.latitude,
      longitude: result.longitude,
      category: '짐보관',
      locker_sections: null,
      features: [],
      is_highlighted: false,
      photos: [],
      extra_data: {},
      description: null,
      operating_hours: null,
      phone: null,
      search_tags: [],
    });
    await sleep(300);
  }

  console.log(`\n--- DB 삽입 (${spots.length}건) ---`);
  const { data, error } = await supabase.from('spots').insert(spots).select('id, name');

  if (error) {
    console.error('[ERROR]', error.message);
    return;
  }

  console.log(`[OK] ${data.length}건 삽입 완료`);
  data.forEach((row: any) => console.log(`  id: ${row.id} - ${row.name}`));
}

main().catch(console.error);
