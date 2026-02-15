# Mixpanel 애널리틱스 스펙

## 개요

Mixpanel을 사용하여 유저 행동 데이터를 수집하고 분석한다. 무료 플랜(월 1,000만 이벤트)으로 시작.

### ⚠️ 구현 시 반드시 공식 문서를 참조할 것

이 스펙은 작성 시점(2025-02)의 Mixpanel SDK 기준으로 작성되었다.
**구현 전 아래 공식 문서에서 최신 API와 옵션을 반드시 확인**하고, 스펙과 차이가 있으면 공식 문서를 우선한다.

| 문서 | URL |
|------|-----|
| **JavaScript SDK 레퍼런스** | https://docs.mixpanel.com/docs/tracking-methods/sdks/javascript |
| **Next.js 통합 가이드** | https://docs.mixpanel.com/docs/tracking-methods/integrations/nextjs |
| **Autocapture 설정** | https://docs.mixpanel.com/docs/tracking-methods/sdks/javascript#autocapture |
| **SDK GitHub (mixpanel-js)** | https://github.com/mixpanel/mixpanel-js |

### 설계 원칙

- **Autocapture + 수동 이벤트 병행**: 클릭/페이지뷰 등 범용 이벤트는 Mixpanel autocapture에 위임, 비즈니스 로직 이벤트만 수동 추적
- **타입 안전**: 이벤트명과 프로퍼티를 TypeScript로 정의하여 오타/누락 방지
- **SSR 안전**: `window`/`navigator` 접근은 반드시 클라이언트에서만 실행
- **테스트 분리**: `is_test` super property로 개발/프로덕션 데이터 구분 (코드 레벨 차단 안 함)

---

## 추적 이벤트 정의

> Mixpanel이 **자동 제공**하는 항목 (수동 구현 불필요):
> - **페이지뷰**: `track_pageview: 'url-with-path'` 옵션으로 SPA 라우트 변경 자동 추적
> - **세션**: DAU/WAU/MAU, 세션 길이 등 Mixpanel 대시보드에서 자동 계산
> - **UTM 파라미터**: `utm_source`, `utm_medium`, `utm_campaign` 등 자동 수집
> - **기본 디바이스 정보**: `$os`, `$browser`, `$screen_width`, `$device` 등 자동 수집

### 1. 지도 인터랙션 (수동)

| 이벤트명 | 트리거 시점 | 프로퍼티 |
|---------|-----------|---------|
| `spot_click` | 스팟 마커 클릭 | `spot_id`, `spot_name`, `categories` |
| `course_click` | 코스 핀 클릭 | `course_id`, `course_name` |
| `course_toggle` | 코스 오버레이 on/off | `show_courses` (boolean) |
| `filter_toggle` | 필터 칩 토글 | `category`, `is_active`, `active_filters` (string[]) |
| `my_location_click` | 내 위치 버튼 클릭 | `has_location` (boolean) |

### 2. 검색 (수동)

| 이벤트명 | 트리거 시점 | 프로퍼티 |
|---------|-----------|---------|
| `search_open` | 검색 오버레이 열기 | — |
| `search_query` | 검색 실행 (debounce 후) | `query`, `query_length`, `result_count_spots`, `result_count_courses`, `result_count_external` |
| `search_result_click` | 검색 결과 클릭 | `result_type` (`spot` / `course` / `external`), `result_id`, `result_name`, `query` |
| `search_close` | 검색 오버레이 닫기 | `had_results` (boolean) |

### 3. 바텀 드로어 (수동)

| 이벤트명 | 트리거 시점 | 프로퍼티 |
|---------|-----------|---------|
| `drawer_snap` | snap 이동 **settle 후** (드래그 중 아님) | `from_snap`, `to_snap`, `content_type` (`list` / `spot_detail` / `course_detail`) |
| `drawer_action_click` | 액션 버튼 클릭 | `action_type` (`naver_map` / `custom_url` / `phone_call`), `spot_id` |

### 4. 피드백 (수동)

| 이벤트명 | 트리거 시점 | 프로퍼티 |
|---------|-----------|---------|
| `feedback_submit` | 피드백 제출 | `content_length` |

---

## 구현 계획

### 1. 패키지 설치

```bash
npm install mixpanel-browser
npm install -D @types/mixpanel-browser
```

### 2. 이벤트 타입 정의 (`src/types/analytics.ts`)

```typescript
/**
 * 수동 추적 이벤트의 이름 → 프로퍼티 매핑.
 * track() 호출 시 타입 체크를 강제하여 오타/누락을 방지한다.
 */
export type AnalyticsEventMap = {
  // 지도 인터랙션
  spot_click: { spot_id: string; spot_name: string; categories: string[] };
  course_click: { course_id: string; course_name: string };
  course_toggle: { show_courses: boolean };
  filter_toggle: { category: string; is_active: boolean; active_filters: string[] };
  my_location_click: { has_location: boolean };

  // 검색
  search_open: Record<string, never>;
  search_query: {
    query: string;
    query_length: number;
    result_count_spots: number;
    result_count_courses: number;
    result_count_external: number;
  };
  search_result_click: {
    result_type: 'spot' | 'course' | 'external';
    result_id: string;
    result_name: string;
    query: string;
  };
  search_close: { had_results: boolean };

  // 바텀 드로어
  drawer_snap: {
    from_snap: number;
    to_snap: number;
    content_type: 'list' | 'spot_detail' | 'course_detail';
  };
  drawer_action_click: {
    action_type: 'naver_map' | 'custom_url' | 'phone_call';
    spot_id: string;
  };

  // 피드백
  feedback_submit: { content_length: number };
};

export type AnalyticsEvent = keyof AnalyticsEventMap;
```

### 3. 분석 모듈 (`src/lib/analytics.ts`)

```typescript
import mixpanel from 'mixpanel-browser';
import type { AnalyticsEventMap, AnalyticsEvent } from '@/types/analytics';

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let initialized = false;

/**
 * Mixpanel 초기화. 반드시 클라이언트(useEffect) 내에서 호출할 것.
 * 중복 호출 시 무시된다.
 */
export function initAnalytics() {
  if (!MIXPANEL_TOKEN || initialized) return;

  mixpanel.init(MIXPANEL_TOKEN, {
    debug: !IS_PRODUCTION,
    track_pageview: 'url-with-path', // SPA 라우트 변경 자동 추적
    persistence: 'localStorage',
    autocapture: true,
  });

  // Super Properties: 모든 이벤트에 자동 포함
  mixpanel.register({
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
    platform: 'web',
    is_test: !IS_PRODUCTION || window.location.hostname === 'localhost',
  });

  initialized = true;
}

/**
 * 타입 안전한 이벤트 전송.
 * 이벤트명에 정의되지 않은 프로퍼티를 넘기면 컴파일 에러 발생.
 */
export function track<E extends AnalyticsEvent>(
  event: E,
  properties: AnalyticsEventMap[E],
) {
  if (!MIXPANEL_TOKEN || !initialized) return;
  mixpanel.track(event, properties as Record<string, unknown>);
}

/**
 * Mixpanel reset (로그아웃 시 등).
 */
export function resetAnalytics() {
  if (!MIXPANEL_TOKEN || !initialized) return;
  mixpanel.reset();
}
```

**포인트:**
- `initialized` 플래그로 중복 init 방지 (React strict mode 대응)
- `track_pageview: 'url-with-path'` — Next.js App Router의 `pathname` 변경 시 자동 페이지뷰 이벤트
- `autocapture: true` — 클릭, 폼 제출 등 자동 수집 (수동 이벤트와 별개로 동작)
- `is_test` super property — Mixpanel 대시보드에서 `is_test = false` 필터로 프로덕션 데이터만 조회
- `window` 접근은 `initAnalytics()`가 `useEffect` 내에서만 호출되므로 SSR 안전

### 4. Provider 컴포넌트 (`src/components/AnalyticsProvider.tsx`)

```typescript
'use client';

import { useEffect } from 'react';
import { initAnalytics } from '@/lib/analytics';

/**
 * Mixpanel 초기화 전용 클라이언트 컴포넌트.
 * layout.tsx에서 <AnalyticsProvider /> 를 마운트한다.
 */
export default function AnalyticsProvider() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return null;
}
```

**layout.tsx 적용:**

```tsx
// src/app/layout.tsx
import AnalyticsProvider from '@/components/AnalyticsProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AnalyticsProvider />
        {children}
        {/* <Toaster /> 등 기존 코드 */}
      </body>
    </html>
  );
}
```

### 5. 적용 위치 상세

| 파일 | 함수/위치 | 이벤트 | 비고 |
|------|----------|--------|------|
| `src/app/page.tsx` | `handleMarkerClick` | `spot_click` | |
| `src/app/page.tsx` | `handleCoursePinClick` | `course_click` | |
| `src/app/page.tsx` | `handleFilterToggle` | `filter_toggle` | |
| `src/components/FloatingControls.tsx` | 코스 토글 onClick | `course_toggle` | `setShowCourses` 콜백 내 |
| `src/components/FloatingControls.tsx` | 내 위치 버튼 onClick | `my_location_click` | |
| `src/components/Search/SearchOverlay.tsx` | 마운트 시 | `search_open` | 컴포넌트 렌더 시점 |
| `src/components/Search/SearchOverlay.tsx` | 닫기 완료 콜백 | `search_close` | `onCloseComplete` |
| `src/hooks/useUnifiedSearch.ts` | debounce 후 결과 반환 시 | `search_query` | |
| `src/components/Search/SearchResultsList.tsx` | 결과 항목 클릭 | `search_result_click` | `onSpotTap`, `onCourseTap` 등 |
| `src/components/BottomDrawer/index.tsx` | `onSnap` 콜백 | `drawer_snap` | settle 후 최종 snap만 |
| `src/components/BottomDrawer/DrawerSpotDetail.tsx` | 액션 버튼 클릭 | `drawer_action_click` | 네이버 지도, 전화, 링크 |
| `src/components/FeedbackDialog.tsx` | `handleSubmit` | `feedback_submit` | |

### 6. 사용 예시

```typescript
// src/app/page.tsx
import { track } from '@/lib/analytics';

const handleMarkerClick = useCallback((spot: Spot) => {
  track('spot_click', {
    spot_id: spot.id,
    spot_name: spot.name,
    categories: spot.categories,
  });
  setSelection({ type: 'spot', id: spot.id });
}, []);

const handleFilterToggle = useCallback((category: string) => {
  const newFilters = /* ... 기존 토글 로직 ... */;
  track('filter_toggle', {
    category,
    is_active: newFilters.includes(category),
    active_filters: newFilters,
  });
}, [activeFilters]);
```

### 7. 환경변수

`.env.local`:
```bash
NEXT_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token
NEXT_PUBLIC_APP_VERSION=0.1
```

`.env.example`에도 키 추가 (값은 비워둘 것):
```bash
NEXT_PUBLIC_MIXPANEL_TOKEN=
NEXT_PUBLIC_APP_VERSION=
```

---

## 테스트/개발 데이터 필터링

코드 레벨에서 이벤트를 차단하지 않고, **모든 환경에서 이벤트를 전송**한다.
대신 `is_test` super property로 구분:

| 환경 | `is_test` 값 | 설명 |
|------|-------------|------|
| `localhost` | `true` | 로컬 개발 |
| Vercel Preview | `true` | `NODE_ENV !== 'production'` |
| Vercel Production | `false` | 실제 유저 데이터 |

**Mixpanel 대시보드 설정:**
- 모든 리포트/보드에 글로벌 필터 `is_test = false` 적용
- 디버깅 시 필터를 해제하면 테스트 데이터도 확인 가능

---

## 분석 가능한 인사이트

| 인사이트 | 데이터 소스 | 방법 |
|---------|-----------|------|
| DAU / WAU / MAU | Mixpanel 자동 세션 | 빌트인 Insights 리포트 |
| 평균 세션 길이 | Mixpanel 자동 세션 | 빌트인 리포트 |
| 인기 스팟 TOP 10 | `spot_click` → `spot_name` | Insights > Breakdown |
| 코스 이용률 | `course_toggle` on/off 비율 | Insights > Breakdown by `show_courses` |
| 인기 검색어 | `search_query` → `query` | Insights > Breakdown |
| 검색 전환율 | `search_open` → `search_result_click` | Funnels |
| 스팟 탐색 → 액션 전환 | `spot_click` → `drawer_action_click` | Funnels |
| 필터 사용 패턴 | `filter_toggle` → `category` | Insights > Breakdown |
| 유입 경로 | Mixpanel 자동 UTM 수집 | Insights > Breakdown by `utm_source` |

---

## 구현 순서

1. **Mixpanel 프로젝트 생성** + 토큰 발급 → `.env.local` 설정
2. **패키지 설치**: `mixpanel-browser` + `@types/mixpanel-browser`
3. **타입 정의**: `src/types/analytics.ts`
4. **분석 모듈**: `src/lib/analytics.ts`
5. **Provider**: `src/components/AnalyticsProvider.tsx` → `layout.tsx`에 마운트
6. **핵심 이벤트 적용** (Phase 1): `spot_click`, `filter_toggle`, `search_query`, `search_result_click`
7. **나머지 이벤트 적용** (Phase 2): `course_click`, `course_toggle`, `drawer_snap`, `drawer_action_click`, `my_location_click`, `feedback_submit`
8. **검색 이벤트 적용** (Phase 3): `search_open`, `search_close`
9. **Mixpanel 대시보드** 리포트 구성 + `is_test = false` 글로벌 필터 설정
10. **검증**: 로컬에서 Mixpanel debug 모드로 이벤트 전송 확인
