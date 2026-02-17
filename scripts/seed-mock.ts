/**
 * 서울역 근처 목업 스팟 삽입 (UI 확인용)
 * 사용법: npx tsx scripts/seed-mock.ts
 * 삭제:   npx tsx scripts/seed-mock.ts --delete
 */

import * as path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MOCK_TAG = '__mock__';

const mockSpots = [
  {
    name: '서울역 러너스팟 (테스트)',
    address: '서울특별시 용산구 한강대로 405',
    latitude: 37.5547,
    longitude: 126.9707,
    category: '러너스팟' as const,
    features: ['샤워실', '탈의실', '물품보관함'],
    locker_sections: null,
    is_highlighted: true,
    operating_hours: { mon: '06:00-22:00', tue: '06:00-22:00', wed: '06:00-22:00', thu: '06:00-22:00', fri: '06:00-22:00', sat: '08:00-20:00', sun: '08:00-20:00' },
    description: '서울역 근처 러너를 위한 공간입니다. 샤워실과 탈의실을 갖추고 있습니다.',
    phone: '02-1234-5678',
    photos: [],
    extra_data: {},
    search_tags: [MOCK_TAG],
  },
  {
    name: '서울역 짐보관소 (테스트)',
    address: '서울특별시 중구 청파로 426',
    latitude: 37.5563,
    longitude: 126.9723,
    category: '짐보관' as const,
    features: ['물품보관함'],
    locker_sections: [
      {
        detail_address: '지하 1층',
        locker_small: 10,
        locker_medium: 5,
        locker_large: 3,
      },
      {
        detail_address: '2번 출구 앞 복도',
        locker_small: 8,
        locker_medium: 2,
        locker_large: null,
      },
    ],
    is_highlighted: false,
    operating_hours: { mon: '07:00-21:00', tue: '07:00-21:00', wed: '07:00-21:00', thu: '07:00-21:00', fri: '07:00-21:00', sat: '09:00-18:00', sun: '09:00-18:00' },
    description: '서울역 인근 짐보관 서비스. 소/중/대 사이즈 보관함을 운영합니다.',
    phone: '02-9876-5432',
    photos: [],
    extra_data: {},
    search_tags: [MOCK_TAG],
  },
];

async function insert() {
  console.log(`--- 목업 데이터 ${mockSpots.length}건 삽입 ---`);
  const { data, error } = await supabase.from('spots').insert(mockSpots).select('id, name');

  if (error) {
    console.error('[ERROR]', error.message);
    return;
  }

  console.log(`[OK] ${data.length}건 삽입 완료`);
  data.forEach((row: any) => console.log(`  id: ${row.id} - ${row.name}`));
}

async function remove() {
  console.log('--- 목업 데이터 삭제 ---');
  const { data, error } = await supabase
    .from('spots')
    .delete()
    .contains('search_tags', [MOCK_TAG])
    .select('id, name');

  if (error) {
    console.error('[ERROR]', error.message);
    return;
  }

  console.log(`[OK] ${data.length}건 삭제 완료`);
  data.forEach((row: any) => console.log(`  id: ${row.id} - ${row.name}`));
}

const isDelete = process.argv.includes('--delete');
(isDelete ? remove() : insert()).catch(console.error);
