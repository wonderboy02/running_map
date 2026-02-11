import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';

interface NaverLocalItem {
  title: string;
  category: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
  link: string;
}

interface NaverLocalResponse {
  items: NaverLocalItem[];
  total: number;
  start: number;
  display: number;
}

// HTML 태그 제거 + HTML 엔티티 디코딩
function stripHtmlTags(str: string): string {
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'");
}

// KATECH 좌표계 → WGS84 변환
function convertKatechToWgs84(mapx: string, mapy: string) {
  return {
    latitude: parseInt(mapy, 10) / 10_000_000,
    longitude: parseInt(mapx, 10) / 10_000_000
  };
}

export const GET = withAuth(async (request: NextRequest) => {
  const query = request.nextUrl.searchParams.get('query');
  const display = request.nextUrl.searchParams.get('display') || '5';
  const start = request.nextUrl.searchParams.get('start') || '1';

  // 검색어 검증
  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { success: false, error: '검색어는 2글자 이상 입력해주세요.' },
      { status: 400 }
    );
  }

  // API 키 확인
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[Search Places API] Missing Naver API credentials');
    return NextResponse.json(
      { success: false, error: 'API 인증 정보가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  try {
    // 네이버 지역검색 API 호출
    const url = new URL('https://openapi.naver.com/v1/search/local.json');
    url.searchParams.set('query', query.trim());
    url.searchParams.set('display', Math.min(parseInt(display, 10), 5).toString());
    url.searchParams.set('start', start);

    const response = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[Search Places API] ${response.status}: ${errorText}`);

      if (response.status === 429) {
        return NextResponse.json(
          { success: false, error: '일일 API 호출 한도를 초과했습니다.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { success: false, error: 'API 호출에 실패했습니다.' },
        { status: response.status }
      );
    }

    const data: NaverLocalResponse = await response.json();

    // 응답 데이터 변환
    const items = data.items
      .filter(item => item.mapx && item.mapy) // 좌표 없는 항목 제외
      .map(item => {
        const coords = convertKatechToWgs84(item.mapx, item.mapy);
        return {
          // 원본 데이터
          title: item.title,
          category: item.category,
          telephone: item.telephone,
          address: item.address,
          roadAddress: item.roadAddress,
          mapx: item.mapx,
          mapy: item.mapy,
          link: item.link,

          // 변환된 데이터
          cleanName: stripHtmlTags(item.title),
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
      });

    console.log(`[Search Places API] query="${query}" → ${items.length}건 결과`);

    return NextResponse.json({
      success: true,
      items,
      total: data.total,
      query: query.trim(),
    });

  } catch (error) {
    console.error('[Search Places API] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
});
