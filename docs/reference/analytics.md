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
       └─ 비프로덕션 또는 no_track → early return (init 스킵, 이벤트 완전 차단)
       └─ mixpanel.init() — autocapture, 페이지뷰 자동 추적
            └─ loaded 콜백:
                 ├─ register()         — super properties (app_version, platform)
                 ├─ identify()         — device-based ID → People 프로필 생성
                 ├─ people.set_once()  — first-touch 속성 (UTM, referrer, 방문일, 랜딩페이지)
                 └─ register_once()    — first-touch UTM super properties

각 컴포넌트
  └─ track('event_name', { ...properties })
       └─ mixpanel.track() — 타입 안전하게 이벤트 전송
```

---

## 이벤트 카탈로그

### Mixpanel 자동 수집 (구현 불필요)

| 항목 | 설명 |
|------|------|
| 페이지뷰 | `autocapture.pageview: 'url-with-path'`로 SPA 라우트 변경 자동 추적 |
| 세션 | DAU/WAU/MAU, 세션 길이 — Mixpanel 대시보드 자동 계산 |
| UTM 파라미터 | `utm_source`, `utm_medium`, `utm_campaign` 자동 수집 |
| 디바이스 정보 | `$os`, `$browser`, `$screen_width`, `$device` 자동 수집 |
| Autocapture | 클릭, 폼 제출, 스크롤 자동 수집 (`input: false` — 수동 `search_query`로 대체) |

### 수동 추적 이벤트

#### 선택 (통합)

| 이벤트명 | 트리거 시점 | 프로퍼티 | 적용 파일 |
|---------|-----------|---------|----------|
| `spot_select` | 스팟 선택 (모든 진입점) | `spot_id`, `spot_name`, `category`, `source`, `query?` | `page.tsx` |
| `course_select` | 코스 선택 (모든 진입점) | `course_id`, `course_name`, `source`, `query?` | `page.tsx` |

- `source`: `'map'` (마커 클릭), `'search'` (검색 결과), `'drawer_list'` (드로어 목록), `'course_explorer'` (코스 탭 카드 클릭)
- `query`: `source === 'search'`일 때만 포함 — 검색어 → 선택 전환 분석용

#### 지도 인터랙션

| 이벤트명 | 트리거 시점 | 프로퍼티 | 적용 파일 |
|---------|-----------|---------|----------|
| `course_toggle` | 코스 오버레이 on/off | `show_courses` | `page.tsx` |
| `filter_toggle` | 필터 칩 토글 | `category`, `is_active`, `active_filters` | `page.tsx` |
| `my_location_click` | 내 위치 버튼 클릭 | `has_location` | `page.tsx` |

#### 검색

| 이벤트명 | 트리거 시점 | 프로퍼티 | 적용 파일 |
|---------|-----------|---------|----------|
| `search_open` | 검색 오버레이 열기 | — | `SearchOverlay.tsx` |
| `search_query` | 외부 검색 로딩 완료 시 | `query`, `query_length`, `result_count_spots`, `result_count_courses`, `result_count_external` | `useUnifiedSearch.ts` |
| `search_external_click` | 외부 장소 검색 결과 클릭 | `result_name`, `query` | `SearchResultsList.tsx` |
| `search_close` | 검색 오버레이 닫기 | `had_results`, `dwell_time_ms` | `SearchOverlay.tsx` |

#### 바텀 드로어

| 이벤트명 | 트리거 시점 | 프로퍼티 | 적용 파일 |
|---------|-----------|---------|----------|
| `drawer_snap` | 사용자 드래그로 snap 이동 (settle 후) | `from_snap`, `to_snap`, `content_type` | `BottomDrawer/index.tsx` |
| `drawer_action_click` | 액션 버튼 클릭 | `action_type`, `spot_id` | `DrawerSpotDetail.tsx` |

- `action_type`: `'naver_map'` | `'custom_url'` | `'phone_call'` | `'ttaracker_install'`
  - `ttaracker_install`: 짐보관 스팟의 또타라커 앱 설치 배너 클릭 (OS에 따라 App Store / Play Store로 연결)

> `drawer_snap`은 프로그래매틱 snap(selection 변경, onClose, backdrop tap)을 `isProgrammaticSnapRef`로 필터링하여 사용자 드래그만 추적한다.

#### 피드백

| 이벤트명 | 트리거 시점 | 프로퍼티 | 적용 파일 |
|---------|-----------|---------|----------|
| `feedback_submit` | 피드백 제출 성공 | `content_length` | `FeedbackDialog.tsx` |

#### Coming Soon

| 이벤트명 | 트리거 시점 | 프로퍼티 | 적용 파일 |
|---------|-----------|---------|----------|
| `coming_soon_view` | 길안내 탭 최초 진입 (세션당 1회, sessionStorage) | — | `ComingSoon.tsx` |
| `coming_soon_vote` | up/down 버튼 클릭 (사용자당 1회, localStorage) | `vote` (`'up'` \| `'down'`) | `ComingSoon.tsx` |

- view는 `sessionStorage` (`runners_spot_coming_soon_viewed`)로 세션당 1회 제한 — 탭 전환 노이즈 제거, 재방문 시 재발화
- 투표는 `localStorage` (`runners_spot_coming_soon_voted`)로 영구 중복 방지

---

## Super Properties

### `register()` — 매 세션 설정

모든 이벤트에 자동으로 포함되는 프로퍼티:

| 프로퍼티 | 값 | 설명 |
|---------|---|------|
| `app_version` | `NEXT_PUBLIC_APP_VERSION` 또는 `'unknown'` | 앱 버전 (수동 설정) |
| `platform` | `'web'` | 고정값 |

### `register_once()` — 최초 1회 설정 (first-touch)

UTM 파라미터가 있는 첫 방문 시에만 설정되며, 이후 방문에서 덮어쓰지 않음:

| 프로퍼티 | 값 | 설명 |
|---------|---|------|
| `first_utm_source` | URL의 `utm_source` | 최초 유입 소스 (e.g. `instagram`, `naver`) |
| `first_utm_medium` | URL의 `utm_medium` | 최초 유입 매체 (e.g. `social`, `cpc`) |
| `first_utm_campaign` | URL의 `utm_campaign` | 최초 유입 캠페인명 |

> UTM 없이 직접 접속한 경우 이 super properties는 설정되지 않음.

---

## 유저 식별 (User Identification)

### Device-based 식별

이 앱은 **로그인 없는 공개 웹앱**이므로 Mixpanel의 자동 생성 device ID(`distinct_id`)를 영구 식별자로 사용한다.

```
초기화 시: mp.identify(mp.get_distinct_id())
```

- `identify()` 호출이 있어야 **People 프로필이 생성**되어 Users 탭에 표시됨
- 기존 anonymous ID를 그대로 사용하므로 ID merge가 발생하지 않음
- Mixpanel 공식 문서의 "anonymous visitor에 identify() 비권장" 경고는 **나중에 로그인 merge가 있는 앱** 대상이므로 해당 없음

### 한계점

| 상황 | 결과 |
|------|------|
| 같은 브라우저, 같은 디바이스 | 같은 유저로 인식 |
| 다른 브라우저 또는 다른 디바이스 | 다른 유저로 인식 |
| 시크릿 모드 | 매번 새 유저로 인식 |
| localStorage 삭제 | 새 유저로 인식 |

---

## 유입 추적 (Acquisition Tracking)

### People 프로필 속성 (`people.set_once`)

최초 방문 시 1회만 저장. 재방문 시 덮어쓰지 않아 first-touch 어트리뷰션을 보존한다.

| 프로퍼티 | 값 | 설명 |
|---------|---|------|
| `first_visit_date` | ISO 8601 timestamp | 최초 방문 시각 |
| `first_landing_page` | `window.location.pathname` | 최초 진입 페이지 경로 |
| `first_referrer` | `document.referrer` | 최초 유입 referrer URL (직접 접속 시 빈 문자열) |
| `first_utm_source` | URL의 `utm_source` | 최초 유입 소스 (없으면 미저장) |
| `first_utm_medium` | URL의 `utm_medium` | 최초 유입 매체 (없으면 미저장) |
| `first_utm_campaign` | URL의 `utm_campaign` | 최초 유입 캠페인명 (없으면 미저장) |

### UTM 링크 사용법

외부에 공유하는 URL에 쿼리 파라미터를 붙이면 유입 경로가 자동 기록된다.

```
https://your-domain.com?utm_source=소스&utm_medium=매체&utm_campaign=캠페인명
```

| 파라미터 | 의미 | 예시 |
|---------|------|------|
| `utm_source` | 어디서 왔는지 | `instagram`, `kakao`, `naver_blog` |
| `utm_medium` | 어떤 유형인지 | `social`, `messenger`, `blog`, `cpc` |
| `utm_campaign` | 어떤 목적인지 | `launch`, `beta`, `event_name` |

**채널별 예시:**

| 채널 | URL 예시 |
|------|---------|
| 인스타 프로필 링크 | `?utm_source=instagram&utm_medium=social&utm_campaign=profile_link` |
| 인스타 스토리 | `?utm_source=instagram&utm_medium=story&utm_campaign=launch` |
| 카카오톡 공유 | `?utm_source=kakao&utm_medium=messenger&utm_campaign=share` |
| 네이버 블로그 | `?utm_source=naver_blog&utm_medium=blog&utm_campaign=review` |
| 러닝 커뮤니티 | `?utm_source=running_crew&utm_medium=community&utm_campaign=beta` |

- 3개 모두 필수는 아님 — 있는 것만 저장됨
- UTM 없이 접속해도 `first_referrer`(이전 페이지 URL)는 기록됨
- **첫 방문 때 1회만 저장** — 이후 다른 UTM으로 재방문해도 덮어쓰지 않음

### Mixpanel SDK 자동 UTM 수집과의 차이

| 항목 | SDK 자동 수집 | 우리 구현 (`set_once` + `register_once`) |
|------|-------------|--------------------------------------|
| 저장 위치 | 이벤트 프로퍼티 | People 프로필 + super property |
| 어트리뷰션 | last-touch (매 이벤트마다 현재 UTM) | first-touch (최초 UTM만 보존) |
| Users 탭 | 표시 안 됨 | 표시됨 |
| Breakdown 분석 | 이벤트 단위 | 유저 단위 |

### 분석 예시

| 분석 목표 | Mixpanel 경로 |
|----------|-------------|
| 유입 채널별 유저 수 | Users > Filter by `first_utm_source` |
| 캠페인별 전환 분석 | Insights > Breakdown by `first_utm_campaign` |
| 검색엔진 유입 분석 | Users > Filter by `first_referrer` contains `search` |
| 채널별 리텐션 비교 | Retention > Breakdown by `first_utm_source` |

---

## 환경별 이벤트 전송 정책

**프로덕션 환경에서만 Mixpanel을 초기화**한다. 비프로덕션 환경에서는 `mixpanel.init()` 자체를 호출하지 않아 autocapture 포함 모든 이벤트 전송이 완전 차단된다.

| 환경 | 이벤트 전송 | 판단 기준 |
|------|-----------|----------|
| 로컬 개발 (`npm run dev`) | **차단** | `NEXT_PUBLIC_VERCEL_ENV` 미설정 → `isProduction = false` |
| Vercel Preview | **차단** | `NEXT_PUBLIC_VERCEL_ENV === 'preview'` → `isProduction = false` |
| Vercel Production | **전송** | `NEXT_PUBLIC_VERCEL_ENV === 'production'` |
| Production + `?no_track=1` | **차단** | localStorage에 플래그 저장 → `isNoTrack() = true` |

### 프로덕션에서 추적 제외하기

개발자 본인 기기 등에서 프로덕션 데이터를 오염시키지 않으려면:

```
# 추적 끄기 (localStorage에 저장, 이후 접속부터 유지)
https://your-domain.com?no_track=1

# 추적 다시 켜기
https://your-domain.com?no_track=0
```

`no_track=1`이 설정되면 `initAnalytics()`가 early return하여 Mixpanel 자체가 초기화되지 않는다.

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
- 비프로덕션 또는 `no_track=1` → early return (init 스킵, 이벤트 완전 차단)

### `track(event, properties)`

```typescript
import { track } from '@/lib/analytics';

// 프로퍼티가 있는 이벤트
track('spot_select', { spot_id: '...', spot_name: '...', category: '러너스팟', source: 'map' });

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
| 인기 스팟 TOP 10 | `spot_select` → `spot_name` | Insights > Breakdown |
| 스팟 진입 경로 비교 | `spot_select` → `source` | Insights > Breakdown |
| 코스 이용률 | `course_toggle` → `show_courses` | Insights > Breakdown |
| 인기 검색어 | `search_query` → `query` | Insights > Breakdown |
| 관심 있는 검색 | `search_close` → `dwell_time_ms >= 1000 AND had_results = true` | Insights > Filter |
| 검색 → 선택 전환율 | `search_open` → `spot_select(source=search)` | Funnels |
| 스팟 탐색 → 액션 전환 | `spot_select` → `drawer_action_click` | Funnels |
| 필터 사용 패턴 | `filter_toggle` → `category` | Insights > Breakdown |
| 유입 채널별 유저 수 | `first_utm_source` (People 프로필) | Users > Filter by `first_utm_source` |
| 캠페인별 리텐션 | `first_utm_campaign` (People 프로필) | Retention > Breakdown by `first_utm_campaign` |
| 검색엔진 유입 분석 | `first_referrer` (People 프로필) | Users > Filter by `first_referrer` |
| 길안내 기능 관심도 | `coming_soon_vote` / `coming_soon_view` unique | Funnels |
