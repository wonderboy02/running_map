# Analytics (Mixpanel) 레퍼런스

## 아키텍처

Mixpanel Autocapture(클릭/페이지뷰 자동 수집) + 수동 이벤트를 병행한다.

```
src/
├── types/analytics.ts           # 이벤트명 → 프로퍼티 타입 매핑
├── lib/
│   ├── analytics.ts             # initAnalytics(), track(), resetAnalytics()
│   └── env.ts                   # isProduction (Vercel 환경 판별)
└── components/
    └── AnalyticsProvider.tsx     # layout.tsx에서 마운트, useEffect로 초기화
```

### 데이터 흐름

```
AnalyticsProvider (layout.tsx)
  └─ useEffect → initAnalytics()
       ├─ mixpanel.init() — autocapture, 페이지뷰 자동 추적
       └─ mixpanel.register() — super properties (app_version, platform, is_test)

각 컴포넌트
  └─ track('event_name', { ...properties })
       └─ mixpanel.track() — 타입 안전하게 이벤트 전송
```

---

## 이벤트 카탈로그

### Mixpanel 자동 수집 (구현 불필요)

| 항목 | 설명 |
|------|------|
| 페이지뷰 | `track_pageview: 'url-with-path'`로 SPA 라우트 변경 자동 추적 |
| 세션 | DAU/WAU/MAU, 세션 길이 — Mixpanel 대시보드 자동 계산 |
| UTM 파라미터 | `utm_source`, `utm_medium`, `utm_campaign` 자동 수집 |
| 디바이스 정보 | `$os`, `$browser`, `$screen_width`, `$device` 자동 수집 |
| Autocapture | 클릭, 폼 제출, 스크롤 등 자동 수집 |

### 수동 추적 이벤트

#### 지도 인터랙션

| 이벤트명 | 트리거 시점 | 프로퍼티 | 적용 파일 |
|---------|-----------|---------|----------|
| `spot_click` | 스팟 마커 클릭 | `spot_id`, `spot_name`, `categories` | `page.tsx` |
| `course_click` | 코스 핀 클릭 | `course_id`, `course_name` | `page.tsx` |
| `course_toggle` | 코스 오버레이 on/off | `show_courses` | `FloatingControls.tsx` |
| `filter_toggle` | 필터 칩 토글 | `category`, `is_active`, `active_filters` | `page.tsx` |
| `my_location_click` | 내 위치 버튼 클릭 | `has_location` | `page.tsx` |

#### 검색

| 이벤트명 | 트리거 시점 | 프로퍼티 | 적용 파일 |
|---------|-----------|---------|----------|
| `search_open` | 검색 오버레이 열기 | — | `SearchOverlay.tsx` |
| `search_query` | 외부 검색 로딩 완료 시 | `query`, `query_length`, `result_count_spots`, `result_count_courses`, `result_count_external` | `useUnifiedSearch.ts` |
| `search_result_click` | 검색 결과 클릭 | `result_type`, `result_id`, `result_name`, `query` | `SearchResultsList.tsx` |
| `search_close` | 검색 오버레이 닫기 | `had_results`, `dwell_time_ms` | `SearchOverlay.tsx` |

#### 바텀 드로어

| 이벤트명 | 트리거 시점 | 프로퍼티 | 적용 파일 |
|---------|-----------|---------|----------|
| `drawer_snap` | 사용자 드래그로 snap 이동 (settle 후) | `from_snap`, `to_snap`, `content_type` | `BottomDrawer/index.tsx` |
| `drawer_action_click` | 액션 버튼 클릭 | `action_type`, `spot_id` | `DrawerSpotDetail.tsx` |

> `drawer_snap`은 프로그래매틱 snap(selection 변경, onClose, backdrop tap)을 `isProgrammaticSnapRef`로 필터링하여 사용자 드래그만 추적한다.

#### 피드백

| 이벤트명 | 트리거 시점 | 프로퍼티 | 적용 파일 |
|---------|-----------|---------|----------|
| `feedback_submit` | 피드백 제출 성공 | `content_length` | `FeedbackDialog.tsx` |

---

## Super Properties

모든 이벤트에 자동으로 포함되는 프로퍼티:

| 프로퍼티 | 값 | 설명 |
|---------|---|------|
| `app_version` | `NEXT_PUBLIC_APP_VERSION` 또는 `'unknown'` | 앱 버전 (수동 설정) |
| `platform` | `'web'` | 고정값 |
| `is_test` | `true` / `false` | 테스트 데이터 여부 (아래 참조) |

---

## 테스트/프로덕션 데이터 구분 (`is_test`)

코드 레벨에서 이벤트를 차단하지 않고 **모든 환경에서 전송**한다.
`is_test` super property로 구분:

| 환경 | `is_test` | 판단 기준 |
|------|-----------|----------|
| 로컬 개발 (`npm run dev`) | `true` | `NEXT_PUBLIC_VERCEL_ENV` 미설정 |
| Vercel Preview | `true` | `NEXT_PUBLIC_VERCEL_ENV === 'preview'` |
| Vercel Production | `false` | `NEXT_PUBLIC_VERCEL_ENV === 'production'` |
| Production + `?no_track=1` | `true` | localStorage에 플래그 저장 |

### 프로덕션에서 추적 제외하기

개발자 본인 기기 등에서 프로덕션 데이터를 오염시키지 않으려면:

```
# 추적 끄기 (localStorage에 저장, 이후 접속부터 유지)
https://your-domain.com?no_track=1

# 추적 다시 켜기
https://your-domain.com?no_track=0
```

### Mixpanel 대시보드 설정

- 모든 리포트/보드에 글로벌 필터 `is_test = false` 적용
- 디버깅 시 필터 해제하면 테스트 데이터도 확인 가능

---

## 환경변수

`.env.local`:

```bash
NEXT_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token
NEXT_PUBLIC_APP_VERSION=0.1          # 선택적, 없으면 'unknown'
```

---

## 공개 API

### `initAnalytics()`

Mixpanel 초기화. `AnalyticsProvider`의 `useEffect`에서 자동 호출된다.

- `typeof window === 'undefined'` 가드 — SSR 안전
- `initialized` 플래그 — 중복 호출 무시 (React strict mode 대응)
- 토큰 없으면 silent return — 로컬 개발에 영향 없음

### `track(event, properties)`

```typescript
import { track } from '@/lib/analytics';

// 프로퍼티가 있는 이벤트
track('spot_click', { spot_id: '...', spot_name: '...', categories: [...] });

// 프로퍼티가 없는 이벤트 — 빈 객체 필수
track('search_open', {});
```

- 타입 안전: 이벤트명에 정의되지 않은 프로퍼티를 넘기면 컴파일 에러
- 초기화 전/토큰 없으면 silent return

### `resetAnalytics()`

Mixpanel distinct_id 리셋. 로그아웃 시 등에 사용.

### `isProduction` (`src/lib/env.ts`)

```typescript
import { isProduction } from '@/lib/env';
```

`NEXT_PUBLIC_VERCEL_ENV === 'production'` 여부. analytics 외 다른 곳에서도 사용 가능.

---

## 새 이벤트 추가 가이드

### 1. 타입 정의

`src/types/analytics.ts`의 `AnalyticsEventMap`에 추가:

```typescript
export type AnalyticsEventMap = {
  // ... 기존 이벤트 ...
  new_event: { property1: string; property2: number };
};
```

### 2. track() 호출

해당 컴포넌트/훅에서:

```typescript
import { track } from '@/lib/analytics';

track('new_event', { property1: 'value', property2: 42 });
```

### 3. 이 문서 업데이트

이벤트 카탈로그 테이블에 새 이벤트 추가.

### ❌ 하지 말 것

- `mixpanel.track()`을 직접 호출하지 않음 → 반드시 `track()` 래퍼 사용 (타입 안전 + 초기화 가드)
- 서버 컴포넌트/API Route에서 `track()` import하지 않음 → 클라이언트 전용
- `AnalyticsEventMap`에 없는 이벤트를 보내지 않음 → 타입 정의 먼저

---

## 분석 가능한 인사이트

| 인사이트 | 데이터 소스 | Mixpanel 기능 |
|---------|-----------|-------------|
| DAU / WAU / MAU | 자동 세션 | Insights |
| 인기 스팟 TOP 10 | `spot_click` → `spot_name` | Insights > Breakdown |
| 코스 이용률 | `course_toggle` → `show_courses` | Insights > Breakdown |
| 인기 검색어 | `search_query` → `query` | Insights > Breakdown |
| 검색 전환율 | `search_open` → `search_result_click` | Funnels |
| 스팟 탐색 → 액션 전환 | `spot_click` → `drawer_action_click` | Funnels |
| 필터 사용 패턴 | `filter_toggle` → `category` | Insights > Breakdown |
| 유입 경로 | 자동 UTM 수집 | Insights > Breakdown by `utm_source` |
