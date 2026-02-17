/**
 * 짐보관 스팟 일괄 업로드 스크립트
 *
 * Google Sheet에서 CSV로 다운로드한 짐보관 데이터를 파싱하고,
 * Naver 지역검색 API(+ Geocoding fallback)로 좌표를 변환한 뒤
 * Supabase에 일괄 삽입합니다.
 *
 * 사용법:
 *   npx tsx scripts/bulk-upload-lockers.ts <csv파일경로>
 *
 * CSV 컬럼 (Google Sheet 헤더 그대로):
 *   name | 네이버 지도 주소 | 상세위치 | 소형 (ex. 1개) | 중형 | 대형 | 합계
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// .env.local 로드
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

// ── 환경변수 확인 ──────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Naver 지역검색 API (장소명 → 좌표)
const NAVER_SEARCH_CLIENT_ID = process.env.NAVER_SEARCH_CLIENT_ID;
const NAVER_SEARCH_CLIENT_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET;

// Naver Geocoding API (도로명 주소 → 좌표, fallback용)
const NAVER_MAP_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
const NAVER_MAP_CLIENT_SECRET = process.env.NAVER_MAP_CLIENT_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[ERROR] SUPABASE 환경변수가 없습니다. .env.local을 확인하세요.');
  process.exit(1);
}
if (!NAVER_SEARCH_CLIENT_ID || !NAVER_SEARCH_CLIENT_SECRET) {
  console.error('[ERROR] NAVER_SEARCH 환경변수가 없습니다. .env.local을 확인하세요.');
  process.exit(1);
}
if (!NAVER_MAP_CLIENT_ID || !NAVER_MAP_CLIENT_SECRET) {
  console.error('[ERROR] NAVER MAP 환경변수가 없습니다. .env.local을 확인하세요.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── 타입 ────────────────────────────────────────────────────────

interface CsvRow {
  name: string;
  address: string;
  detailAddress: string;
  lockerSmall: number | null;
  lockerMedium: number | null;
  lockerLarge: number | null;
}

interface GeoResult {
  latitude: number;
  longitude: number;
  roadAddress: string;
}

// ── CSV 파싱 ────────────────────────────────────────────────────

/** RFC 4180 호환 CSV 행 파서 — 쌍따옴표 안의 쉼표/개행을 무시 */
function parseCsvLine(line: string, separator: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // 연속 "" → escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === separator) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

function parseNumber(value: string): number | null {
  if (!value || value.trim() === '' || value.trim() === '-') return null;
  // "1개", "2", " 3개 " 등에서 숫자만 추출
  const match = value.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function parseCsv(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length < 2) {
    console.error('[ERROR] CSV에 데이터가 없습니다.');
    process.exit(1);
  }

  // 구분자 자동 감지 (탭 또는 쉼표)
  const headerLine = lines[0];
  const separator = headerLine.includes('\t') ? '\t' : ',';
  console.log(`[INFO] 구분자: ${separator === '\t' ? 'TAB' : 'COMMA'}`);

  const headers = parseCsvLine(headerLine, separator);
  console.log(`[INFO] 헤더: ${headers.join(' | ')}`);

  // 컬럼 인덱스 매핑 (중복 감지 포함)
  function findUniqueColumn(predicate: (h: string) => boolean, label: string): number {
    const matches = headers.reduce<number[]>((acc, h, i) => {
      if (predicate(h)) acc.push(i);
      return acc;
    }, []);
    if (matches.length > 1) {
      console.error(`[ERROR] "${label}" 조건에 매칭되는 컬럼이 ${matches.length}개입니다.`);
      console.error('  매칭된 컬럼:', matches.map((i) => headers[i]).join(', '));
      process.exit(1);
    }
    return matches[0] ?? -1;
  }

  const colName = headers.indexOf('name');
  const colAddress = findUniqueColumn((h) => h.includes('네이버') || h.includes('주소'), '주소');
  const colDetail = findUniqueColumn((h) => h.includes('상세'), '상세위치');
  const colSmall = findUniqueColumn((h) => h.includes('소형'), '소형');
  const colMedium = findUniqueColumn((h) => h.includes('중형'), '중형');
  const colLarge = findUniqueColumn((h) => h.includes('대형'), '대형');

  if (colName === -1 || colAddress === -1) {
    console.error('[ERROR] 필수 컬럼(name, 주소)을 찾을 수 없습니다.');
    console.error('  감지된 헤더:', headers);
    process.exit(1);
  }

  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], separator);
    const name = cols[colName];
    const address = cols[colAddress];

    if (!name || !address) {
      console.warn(`[WARN] ${i + 1}행 건너뜀: name 또는 주소 없음`);
      continue;
    }

    rows.push({
      name,
      address,
      detailAddress: colDetail !== -1 ? cols[colDetail] || '' : '',
      lockerSmall: colSmall !== -1 ? parseNumber(cols[colSmall]) : null,
      lockerMedium: colMedium !== -1 ? parseNumber(cols[colMedium]) : null,
      lockerLarge: colLarge !== -1 ? parseNumber(cols[colLarge]) : null,
    });
  }

  return rows;
}

// ── 좌표 변환 (지역검색 → Geocoding fallback) ──────────────────

function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/** Naver 지역검색 API — 장소명/주소로 검색하여 좌표 반환 */
async function searchLocal(query: string): Promise<GeoResult | null> {
  const url = new URL('https://openapi.naver.com/v1/search/local.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', '1');

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id': NAVER_SEARCH_CLIENT_ID!,
        'X-Naver-Client-Secret': NAVER_SEARCH_CLIENT_SECRET!,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const item = data.items?.[0];
    if (!item?.mapx || !item?.mapy) return null;

    return {
      latitude: parseInt(item.mapy, 10) / 10_000_000,
      longitude: parseInt(item.mapx, 10) / 10_000_000,
      roadAddress: item.roadAddress || item.address,
    };
  } catch {
    return null;
  }
}

/** Naver Geocoding API — 도로명 주소로 좌표 변환 (fallback) */
async function searchGeocode(query: string): Promise<GeoResult | null> {
  const url = new URL('https://maps.apigw.ntruss.com/map-geocode/v2/geocode');
  url.searchParams.set('query', query);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': NAVER_MAP_CLIENT_ID!,
        'X-NCP-APIGW-API-KEY': NAVER_MAP_CLIENT_SECRET!,
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
    };
  } catch {
    return null;
  }
}

/** 지역검색 먼저 시도, 실패 시 Geocoding fallback */
async function resolveCoordinates(query: string): Promise<GeoResult | null> {
  const localResult = await searchLocal(query);
  if (localResult) return localResult;

  return searchGeocode(query);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── 메인 ────────────────────────────────────────────────────────

/** 그룹핑 결과: 1 그룹 = 1 스팟 */
interface SpotGroup {
  name: string;
  address: string;
  rows: CsvRow[];
}

async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error('사용법: npx tsx scripts/bulk-upload-lockers.ts <csv파일경로>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(csvPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`[ERROR] 파일을 찾을 수 없습니다: ${resolvedPath}`);
    process.exit(1);
  }

  // 1. CSV 파싱
  console.log('\n--- 1단계: CSV 파싱 ---');
  const rows = parseCsv(resolvedPath);
  console.log(`[OK] ${rows.length}건 파싱 완료\n`);

  // 2. 그룹핑 (name + address → 1 스팟)
  console.log('--- 2단계: name + address 그룹핑 ---');
  const groupMap = new Map<string, SpotGroup>();

  for (const row of rows) {
    const key = `${row.name}|||${row.address}`;
    const existing = groupMap.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      groupMap.set(key, { name: row.name, address: row.address, rows: [row] });
    }
  }

  const groups = Array.from(groupMap.values());
  const maxSections = Math.max(...groups.map((g) => g.rows.length));
  console.log(
    `[OK] ${rows.length}행 → ${groups.length}개 스팟 (최대 ${maxSections}개 섹션)\n`
  );

  // 3. Geocoding (그룹 단위, address 캐시)
  console.log('--- 3단계: 주소 -> 좌표 변환 ---');
  const addressCache = new Map<string, GeoResult | null>();

  const geocoded: (SpotGroup & GeoResult)[] = [];
  const failed: SpotGroup[] = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    process.stdout.write(`  [${i + 1}/${groups.length}] "${group.name}" ... `);

    let result: GeoResult | null;

    if (addressCache.has(group.address)) {
      result = addressCache.get(group.address)!;
      if (result) {
        console.log(`OK (캐시 ${result.latitude}, ${result.longitude})`);
      } else {
        console.log(`FAIL (캐시 - 이전에 실패)`);
      }
    } else {
      result = await resolveCoordinates(group.address);
      addressCache.set(group.address, result);

      if (result) {
        console.log(`OK (${result.latitude}, ${result.longitude})`);
      } else {
        console.log(`FAIL - 좌표 변환 실패`);
      }

      // Rate limit 방지 (300ms 간격, API 호출한 경우만)
      if (i < groups.length - 1) await sleep(300);
    }

    if (result) {
      geocoded.push({ ...group, ...result });
    } else {
      failed.push(group);
    }
  }

  const cacheHits = groups.length - addressCache.size;
  console.log(`\n[OK] 좌표 변환 성공: ${geocoded.length}건 (API 호출: ${addressCache.size}회, 캐시 히트: ${cacheHits}회)`);
  if (failed.length > 0) {
    console.log(`[FAIL] 좌표 변환 실패: ${failed.length}건`);
    failed.forEach((f) => console.log(`  - ${f.name} (${f.address})`));
  }

  if (geocoded.length === 0) {
    console.log('\n업로드할 데이터가 없습니다.');
    process.exit(0);
  }

  // 4. 중복 체크
  console.log('\n--- 4단계: 중복 체크 ---');
  const toInsert: typeof geocoded = [];

  for (const item of geocoded) {
    const { data } = await supabase
      .from('spots')
      .select('id')
      .eq('name', item.name)
      .eq('address', item.roadAddress)
      .maybeSingle();

    if (data) {
      console.log(`  [SKIP] "${item.name}" - 이미 존재 (id: ${data.id})`);
    } else {
      toInsert.push(item);
    }
  }

  console.log(`\n신규: ${toInsert.length}건, 중복 제외: ${geocoded.length - toInsert.length}건`);

  if (toInsert.length === 0) {
    console.log('\n모든 장소가 이미 존재합니다.');
    process.exit(0);
  }

  // 5. DB 삽입
  console.log('\n--- 5단계: DB 삽입 ---');

  const spotData = toInsert.map((item) => ({
    name: item.name,
    address: item.roadAddress,
    latitude: item.latitude,
    longitude: item.longitude,
    category: '짐보관' as const,
    locker_sections: item.rows.map((row) => ({
      detail_address: row.detailAddress || null,
      locker_small: row.lockerSmall,
      locker_medium: row.lockerMedium,
      locker_large: row.lockerLarge,
    })),
    features: [],
    is_highlighted: false,
    photos: [],
    extra_data: {},
    description: null,
    operating_hours: null,
    phone: null,
    search_tags: [],
  }));

  // 50건씩 배치 처리
  const BATCH_SIZE = 50;
  let insertedTotal = 0;

  for (let i = 0; i < spotData.length; i += BATCH_SIZE) {
    const batch = spotData.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase.from('spots').insert(batch).select('id, name');

    if (error) {
      console.error(`[ERROR] 배치 ${Math.floor(i / BATCH_SIZE) + 1} 삽입 실패:`, error.message);
      continue;
    }

    insertedTotal += data.length;
    console.log(
      `  배치 ${Math.floor(i / BATCH_SIZE) + 1}: ${data.length}건 삽입 완료`
    );
  }

  // 6. 결과 요약
  console.log('\n--- 결과 요약 ---');
  console.log(`CSV 전체: ${rows.length}행`);
  console.log(`그룹핑: ${groups.length}개 스팟 (최대 ${maxSections}개 섹션)`);
  console.log(`좌표 변환 성공: ${geocoded.length}건`);
  console.log(`좌표 변환 실패: ${failed.length}건`);
  console.log(`중복 제외: ${geocoded.length - toInsert.length}건`);
  console.log(`DB 삽입 완료: ${insertedTotal}건`);
}

main().catch((err) => {
  console.error('스크립트 오류:', err);
  process.exit(1);
});
