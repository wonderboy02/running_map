# Runner's Spot - 프로젝트 컨텍스트

## 프로젝트 개요

러너를 위한 장소(짐보관, 샤워실, 탈의실 등)를 네이버 지도 위에 표시하는 모바일 전용 웹앱.

- **Tech Stack**: Next.js 15 (App Router) + Supabase + Tailwind CSS v4 + TypeScript
- **UI 라이브러리**: shadcn/ui (new-york 스타일) + lucide-react 아이콘
- **지도**: Naver Map JavaScript API v3
- **애널리틱스**: Mixpanel (autocapture + 수동 이벤트)
- **배포**: Vercel
- **변경 이력**: `docs/changelog/` 참조

## 디렉토리 구조

```
src/
├── app/                    # Next.js App Router 페이지
│   ├── api/geocode/        # Geocoding API Route (서버 사이드)
│   └── admin/              # Admin 영역
│       ├── login/          # 로그인
│       ├── spots/new/      # 장소 추가
│       ├── spots/[id]/edit/# 장소 수정
│       └── components/     # Admin 전용 컴포넌트 (SpotForm)
├── components/             # 공용 컴포넌트
│   ├── Map/                # 네이버 지도 (NaverMap, MapControls)
│   ├── BottomDrawer/       # 통합 Bottom Drawer (snap point 기반)
│   │   ├── index.tsx       # Sheet + snap 관리 + 콘텐츠 스위칭
│   │   ├── useSnapPoints.ts # DOM 측정 → snap point 계산 훅
│   │   ├── DrawerSpotDetail.tsx # 스팟 상세 콘텐츠
│   │   └── DrawerListView.tsx   # 탭 토글 + 스팟/코스 그리드 목록
│   ├── AnalyticsProvider.tsx # Mixpanel 초기화 Provider
│   └── ui/                 # shadcn/ui 컴포넌트 (button, input, badge 등)
├── lib/                    # 유틸리티
│   ├── supabase/           # Supabase 클라이언트 (client, server, middleware)
│   ├── auth/               # withAuth HOF (Admin API 인증)
│   ├── analytics.ts        # Mixpanel track() + 초기화
│   ├── env.ts              # isProduction (Vercel 환경 판별)
│   ├── image-upload.ts     # 이미지 검증 + WebP 변환 + Storage 업로드/삭제
│   ├── utils.ts            # cn() 유틸리티 (shadcn/ui)
│   └── marker-config.ts    # 마커 아이콘 설정 (PNG 기반, 카테고리별 default/selected)
├── hooks/                  # 커스텀 훅 (useSpots, useSearch, useNaverMap, useGeocode)
├── types/                  # TypeScript 타입 정의 (index.ts, analytics.ts)
└── styles/                 # 글로벌 스타일 (globals.css)

public/markers/             # 커스텀 마커 이미지
docs/                       # 문서
├── changelog/              # 버전별 변경 이력 (v0.2.md, v0.3.md, ...)
├── specs/                  # 미구현 기능 스펙 (구현 완료 시 삭제)
└── reference/              # 상시 참조 레퍼런스 (design-system, naver-maps)
supabase/migrations/        # DB 마이그레이션 SQL
```

## 경로 별칭

- `@/*` → `./src/*` (tsconfig.json paths)

## 주요 설정

- **Tailwind CSS v4**: `@tailwindcss/postcss` 사용 (tailwind.config.ts 없음, CSS 기반 설정)
- **shadcn/ui**: new-york 스타일, `components.json`에 설정 (CSS: `src/styles/globals.css`)
- **Prettier**: tailwindcss 플러그인 포함, `endOfLine: lf`
- **Git**: `.gitattributes`로 CRLF → LF 자동 정규화

## shadcn/ui

- **설정 파일**: `components.json` (스타일: new-york, RSC: true, TSX: true)
- **컴포넌트 위치**: `src/components/ui/`
- **유틸리티**: `src/lib/utils.ts` (`cn()` 함수)
- **아이콘**: `lucide-react`
- **토스트**: `sonner` (`layout.tsx`에 `<Toaster>` 포함)
- **설치된 컴포넌트**: button, input, label, textarea, badge, card, sheet, dialog, sonner, select, checkbox, alert-dialog, separator
- **추가 설치**: `npx shadcn@latest add [component-name]`

## Naver Maps API 설정

### ⚠️ 중요: 올바른 스크립트 URL 사용

**반드시 Naver Cloud Platform (NCP) Maps API를 사용해야 합니다:**

```html
<!-- ✅ 올바른 URL (NCP Maps API) -->
<script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=YOUR_CLIENT_ID"></script>

<!-- ❌ 잘못된 URL (기존 Open API - 신규 신청 중단) -->
<script src="https://openapi.map.naver.com/openapi/v3/maps.js?clientId=YOUR_CLIENT_ID"></script>
```

**URL 차이점:**

- NCP Maps: `https://oapi.map.naver.com` + `ncpKeyId` 파라미터 ⭐
- 기존 Open API: `https://openapi.map.naver.com` + `clientId` 파라미터

**공식 예제 출처:** [navermaps/maps.js.ncp/index.html](https://github.com/navermaps/maps.js.ncp/blob/master/index.html)

### Client ID vs Client Secret

| 항목                         | Client ID                                    | Client Secret                   |
| ---------------------------- | -------------------------------------------- | ------------------------------- |
| **JavaScript Maps API**      | ✅ 필요 (`ncpKeyId`)                         | ❌ 불필요                       |
| **REST APIs** (Geocoding 등) | ✅ 필요 (`X-NCP-APIGW-API-KEY-ID`)           | ✅ 필요 (`X-NCP-APIGW-API-KEY`) |
| **프론트엔드 노출**          | ✅ 가능 (`.env.local`의 `NEXT_PUBLIC_` 변수) | ❌ 절대 금지                    |
| **서버 사이드**              | -                                            | ✅ 반드시 서버에서만 사용       |

**현재 프로젝트:**

- JavaScript Maps API → **Client ID** 필요
- Geocoding REST API (Admin 주소 검색) → **Client ID + Client Secret** 필요 (API Route에서 사용)

### 환경변수 설정

`.env.local`:

```bash
# Naver Maps (프론트엔드에서 사용)
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_client_id_here

# Naver Maps REST API (서버 사이드 전용 - Admin 주소 검색에 필요)
NAVER_MAP_CLIENT_SECRET=your_client_secret_here
```

### 공식 문서

- **NCP Maps 개요**: [https://api.ncloud-docs.com/docs/application-maps-overview](https://api.ncloud-docs.com/docs/application-maps-overview)
- **JavaScript API v3 가이드**: [https://navermaps.github.io/maps.js.ncp/docs/](https://navermaps.github.io/maps.js.ncp/docs/)
- **Client ID 발급**: [https://navermaps.github.io/maps.js.ncp/docs/tutorial-1-Getting-Client-ID.html](https://navermaps.github.io/maps.js.ncp/docs/tutorial-1-Getting-Client-ID.html)

### 프로젝트 문서

- **Naver Maps API 레퍼런스**: `docs/reference/naver-maps.md` (Map, Marker, Event, GroundOverlay 등 주요 API 정리)
  - **GroundOverlay**: 지도 위에 투명도가 있는 이미지를 오버레이하는 방법 (러닝 코스 하이라이트, 구역 표시 등에 활용)

## Supabase 클라이언트 패턴

### ⚠️ 중요: 싱글턴 패턴 사용

**Supabase 클라이언트는 반드시 싱글턴 패턴으로 생성하고 재사용해야 합니다.**

#### 클라이언트 사이드 (`client.ts`)

```typescript
// ✅ 올바른 방법 - 싱글턴
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 사용
import { supabase } from '@/lib/supabase/client';
await supabase.from('spots').select('*');
```

#### 서버 사이드 (`server.ts`)

```typescript
// ✅ 올바른 방법 - 싱글턴 (Service Role Key 사용)
import { createClient } from "@supabase/supabase-js";

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 사용 (API Route에서)
import { supabaseServer } from '@/lib/supabase/server';
await supabaseServer.from('spots').insert(...);
```

#### ❌ 잘못된 방법

```typescript
// ❌ 함수로 매번 생성하면 비효율적
export function createServerClient() {
  return createClient(...);
}

// ❌ 사용할 때마다 새 인스턴스 생성
const supabase = await createClient();
```

#### 사용 구분

| 위치 | 사용할 클라이언트 | 키 종류 | 용도 |
|------|-------------------|---------|------|
| **프론트엔드** (컴포넌트, 훅) | `supabase` (client.ts) | Anon Key | 일반 CRUD, RLS 적용 |
| **서버 사이드** (API Route) | `supabaseServer` (server.ts) | Service Role Key | Admin 작업, RLS 우회 |

### ⚠️ 중요: Service Role Key 클라이언트로 auth.getUser() 금지

**Service Role Key 클라이언트(`supabaseServer`)로는 절대 `auth.getUser()`를 호출하면 안 됩니다.**

- Service Role Key는 **RLS 우회용**이지 사용자 인증 확인용이 아님
- 인증 확인에는 **쿠키 기반 클라이언트**(`server-auth.ts`) 사용 필요

## Admin API 인증 패턴

### ⚠️ 필수: withAuth HOF 패턴 사용

**모든 Admin API Route는 반드시 `withAuth` HOF(Higher-Order Function)로 래핑해야 합니다.**

#### 인증 확인용 클라이언트 (`server-auth.ts`)

```typescript
// src/lib/supabase/server-auth.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * 쿠키 기반 Supabase 클라이언트 생성 (인증 확인용)
 * - 각 요청마다 새로 생성 (싱글턴 아님)
 * - Anon Key 사용하여 JWT 토큰 확인
 */
export async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

#### withAuth HOF (`withAuth.ts`)

```typescript
// src/lib/auth/withAuth.ts
import { NextRequest, NextResponse } from 'next/server';
import { User } from '@supabase/supabase-js';
import { createAuthClient } from '@/lib/supabase/server-auth';

export function withAuth(
  handler: (request: NextRequest, user: User) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const supabaseAuth = await createAuthClient();
      const { data: { user }, error } = await supabaseAuth.auth.getUser();

      if (error || !user) {
        return NextResponse.json(
          { success: false, error: '인증이 필요합니다.' },
          { status: 401 }
        );
      }

      return await handler(request, user);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: '서버 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
  };
}
```

#### 사용 예시

```typescript
// src/app/api/admin/*/route.ts
import { withAuth } from '@/lib/auth/withAuth';
import { supabaseServer } from '@/lib/supabase/server';

// ✅ 올바른 방법
export const POST = withAuth(async (request, user) => {
  // user는 이미 인증된 상태
  // DB 작업은 supabaseServer (Service Role Key) 사용
  const { data } = await supabaseServer.from('spots').insert(...);
  return NextResponse.json({ success: true, data });
});

export const GET = withAuth(async (request, user) => {
  // 로직...
});

export const PATCH = withAuth(async (request, user) => {
  // 로직...
});

export const DELETE = withAuth(async (request, user) => {
  // 로직...
});
```

#### ❌ 잘못된 방법

```typescript
// ❌ withAuth 없이 직접 인증 체크 (코드 중복)
export async function POST(request: NextRequest) {
  const supabaseAuth = await createAuthClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  // 로직...
}

// ❌ Service Role Key로 인증 체크 (작동 안 함)
export async function POST(request: NextRequest) {
  const { data: { user } } = await supabaseServer.auth.getUser(); // 실패!
  // 로직...
}
```

#### 적용 규칙

1. **모든 Admin API Route**는 `withAuth`로 래핑 필수
2. **인증 확인**: `withAuth` → `createAuthClient()` → Anon Key + 쿠키
3. **DB 작업**: `supabaseServer` → Service Role Key (RLS 우회)
4. **HOF 패턴**으로 인증 로직 중복 제거 및 일관성 유지

## Supabase 타입 생성

DB 스키마가 변경될 때마다 TypeScript 타입을 자동 생성합니다:

```bash
npm run gen:types
```

- **생성 위치**: `src/lib/supabase/database.ts`
- **사용 예시**:

  ```typescript
  import { Database } from '@/lib/supabase/database';

  type Spot = Database['public']['Tables']['spots']['Row'];
  type SpotInsert = Database['public']['Tables']['spots']['Insert'];
  type SpotUpdate = Database['public']['Tables']['spots']['Update'];
  ```

- **주요 테이블**:
  - `spots`: 러닝 스팟 정보
  - `admins`: 관리자 권한 (auth.users FK 연결)

**참고**: `.env.local`에 `SUPABASE_PROJECT_ID` 설정 필요

## 개발 가이드

- 당신은 **매우 유능한 시니어 개발자**입니다. 작은 스타트업에서 뛰어난 코딩 에이전트로써 매우 권장되는 방식과 깔끔한 형태로 코딩을 진행
- 모호하거나 이상한 부분이 있으면 user 에게 반드시 물어보고 확실하게 처리
- **깔끔하고 권장된 구조**로 코딩할 것, 계획이 그렇지 않다면 계획에 대해 좀 더 명확히 논의
- 이 컴퓨터는 window 기반 powershell 을 사용하니까 명령어를 그에 맞춰 사용

### docs/ 폴더 컨벤션

```
docs/
├── changelog/    # 버전별 변경 이력 (v0.2.md, v0.3.md, ...)
├── specs/        # 미구현 기능 스펙
└── reference/    # 상시 참조 레퍼런스
```

| 폴더 | 용도 | 파일 생명주기 |
|------|------|--------------|
| `changelog/` | 버전별 변경 이력 기록 | 영구 보관, 새 버전마다 `v{X}.md` 추가 |
| `specs/` | 구현 예정 기능의 설계 스펙 | **구현 완료 시 삭제** |
| `reference/` | 디자인 시스템, API 레퍼런스 등 | 상시 유지, 내용 갱신 |

**규칙:**
- 스펙 문서는 `specs/`에만 생성하고, 구현이 끝나면 반드시 삭제
- 일회성 코드 리뷰, 마이그레이션 기록 등은 문서로 남기지 않음 (git history로 대체)
- `reference/` 문서는 CLAUDE.md에서 경로를 참조하므로, 파일명 변경 시 CLAUDE.md도 함께 수정

### shadcn/ui 사용 기준

- **폼 요소**(`input`, `textarea`, `label`, `select`)는 반드시 shadcn 컴포넌트(`Input`, `Textarea`, `Label`, `Select`)를 사용
- **`<button>`은 무조건 `<Button>`으로 바꾸지 않음** — 드롭다운 아이템, 이미지 오버레이 컨트롤, 커스텀 shape(FAB, 칩 등) 등 shadcn Button 스타일을 90% 이상 override해야 하면 raw `<button>` 사용

### ⚠️ 유틸리티 / 공통 코드 중복 방지

**새로운 유틸리티 함수나 헬퍼를 만들기 전에 반드시 기존 코드를 먼저 검색하라.**

1. `src/lib/` 디렉토리에 이미 같은 역할의 유틸이 있는지 확인
2. 다른 API Route나 컴포넌트에서 동일한 로직을 로컬 함수로 갖고 있는지 Grep으로 검색
3. 이미 존재하면 → 기존 유틸을 import해서 재사용하거나, 파라미터화하여 공통 유틸로 추출
4. 새로 만들어야 한다면 → `src/lib/`에 공통 유틸로 생성하고, 기존 중복 코드도 함께 리팩터링

**현재 존재하는 공통 유틸:**

| 파일 | 내용 |
|------|------|
| `src/lib/analytics.ts` | Mixpanel `initAnalytics()`, `track()`, `resetAnalytics()` |
| `src/lib/env.ts` | `isProduction` (Vercel 환경 판별) |
| `src/lib/image-upload.ts` | 이미지 검증(`validateImageFile`), WebP 변환+업로드(`convertAndUpload`), Storage 삭제(`removeFromStorage`) |
| `src/lib/utils.ts` | `cn()` (Tailwind 클래스 병합) |
| `src/lib/marker-config.ts` | 마커 아이콘 (PNG 기반, `getSpotMarkerIcon()`, `getCoursePinIcon(isSelected?, name?)`, `getSearchPinIcon()`) |
| `src/lib/category-config.ts` | 카테고리 배지 스타일 (`getCategoryBadgeStyle()`) |
| `src/lib/locker-utils.ts` | 라커 섹션 유틸 (`emptyLockerSection()`, `sectionTotal()`, `allSectionsTotal()`, `hasLockerData()`, `parseLockerSections()`) |
| `src/lib/naver-map-utils.ts` | 네이버 지도 유틸 |
| `src/lib/auth/withAuth.ts` | Admin API 인증 HOF |

## BottomDrawer 컨벤션

### 아키텍처

`src/components/BottomDrawer/`는 **하나의 Sheet 인스턴스**를 유지하며 콘텐츠만 교체하는 구조:

```
BottomDrawer (index.tsx)     ← Sheet 인스턴스 (항상 isOpen={true})
├── DrawerSpotDetail.tsx     ← selectedSpot이 있을 때
├── DrawerCourseDetail.tsx   ← selectedCourse가 있을 때
└── DrawerListView.tsx       ← selection이 null일 때 (탭: 러너스팟/러닝코스)
```

- Sheet는 **절대 언마운트되지 않음** → 전환 애니메이션이 부드러움
- `disableDismiss={true}` → 사용자가 완전히 닫을 수 없음 (최소 title snap 유지)

### Snap Point 체계 (5단계)

`index.tsx`의 `SNAP` 상수로 인덱스를 관리합니다:

```
snapPoints = [0, peekPx, titlePx, previewPx, contentPx, maxHeight]
              │    │       │         │           │          └─ SNAP.FULL (5): 75vh, 스크롤 가능
              │    │       │         │           └─ SNAP.CONTENT (4): 주요 콘텐츠
              │    │       │         └─ SNAP.PREVIEW (3): title + content 25% (초기 상태)
              │    │       └─ SNAP.TITLE (2): 사진+이름+주소 / 요약바
              │    └─ SNAP.PEEK (1): drag handle bar만
              └─ index 0: (내부용, disableDismiss로 도달 불가)
```

| 단계 | SNAP 상수 | Index | 보이는 것 | 진입 시점 |
|------|----------|-------|----------|----------|
| **Peek** | `SNAP.PEEK` | 1 | drag handle bar만 | X 버튼 (스팟 해제) |
| **Title** | `SNAP.TITLE` | 2 | + 사진 + 스팟명 + 주소 (detail) / 요약바 (list) | 핀 클릭 |
| **Preview** | `SNAP.PREVIEW` | 3 | + contentRef의 ~25% (첫 아이템 절반) | 초기 데이터 로드 (리스트) |
| **Content** | `SNAP.CONTENT` | 4 | + 카테고리 + 설명 + 버튼 | 위로 드래그 |
| **Full** | `SNAP.FULL` | 5 | 75vh 전체, 스크롤 가능 | 위로 더 드래그 |

- `useSnapPoints` 훅이 `titleRef`, `contentRef`의 DOM 높이를 측정하여 픽셀 값 계산
- `peekPx` = `HEADER_HEIGHT` (40px, drag handle만)
- `previewPx` = `titleSnap + contentHeight * PREVIEW_CONTENT_RATIO` (0.25)
- 각 snap은 이전 snap의 clamped 값 기준으로 최소 간격(20px) 보장
- 윈도우 리사이즈 시 자동 재계산
- 측정 불가 시 fallback: `[0, 40, 0.15, 0.3, 0.45, 1]`

### 새 Drawer 콘텐츠 추가 시 규칙

1. **`titleRef` / `contentRef` 필수**: 모든 콘텐츠 컴포넌트는 props로 `titleRef`와 `contentRef`를 받아 snap 경계를 지정
2. **titleRef**: `SNAP.TITLE`에서 보이는 영역 (drag handle + 이 div까지)
3. **contentRef**: `SNAP.CONTENT`에서 추가로 보이는 영역 (titleRef 아래, `SNAP.PREVIEW`에서 25% 노출)
4. **나머지 콘텐츠**: `SNAP.FULL`에서만 노출

```tsx
interface DrawerNewContentProps {
  titleRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  // ... 기타 props
}

export default function DrawerNewContent({ titleRef, contentRef, ... }: DrawerNewContentProps) {
  return (
    <>
      <div ref={titleRef}>  {/* SNAP.TITLE 경계 */}
        {/* 제목, 요약 등 최소 정보 */}
      </div>
      <div ref={contentRef}>  {/* SNAP.CONTENT 경계 */}
        {/* 주요 콘텐츠 */}
      </div>
      {/* SNAP.FULL에서만 보이는 추가 콘텐츠 */}
    </>
  );
}
```

5. **index.tsx 수정**: 새 콘텐츠 모드 추가 시 조건부 렌더링과 snap 전환 로직 추가
6. **스크롤**: `SNAP.FULL`(index 5)에서만 활성화 — `disableScroll={({ currentSnap }) => currentSnap !== SNAP.FULL}`
7. **snap 전환**: 핀 클릭 → `snapTo(SNAP.TITLE)`, 해제 → `snapTo(SNAP.PEEK)`

### ❌ 하지 말 것

- 별도의 `Sheet` 인스턴스를 새로 만들지 않음 → 반드시 `BottomDrawer/index.tsx`에 콘텐츠를 추가
- `titleRef`/`contentRef` 없이 콘텐츠를 만들지 않음 → snap point 계산이 깨짐
- Sheet의 `isOpen`을 `false`로 바꾸지 않음 → 항상 `true` 유지

### ⚠️ Storage 파일 삭제 필수

**DB에서 레코드를 삭제할 때, 해당 레코드에 연결된 Storage 파일(사진, 이미지)도 반드시 함께 삭제해야 한다.** 개별 삭제든 일괄 삭제든 모두 적용. `removeFromStorage()` (`src/lib/image-upload.ts`) 사용.

## Z-Index 컨벤션

지도 기반 모바일 앱이므로 레이어 순서가 중요합니다. 새 컴포넌트 추가 시 아래 표를 기준으로 z-index를 부여하세요.

| z-index | 레이어 | 컴포넌트 | 비고 |
|---------|--------|----------|------|
| 0 | 지도 | `NaverMap` | `z-0` |
| 10 | 지도 내 컨트롤 | `MapControls` | 지도 위 버튼 (위성/지형 전환) |
| 20 | 필터 칩 | `FilterChips` | 헤더 바로 아래 |
| **25** | **플로팅 버튼** | **`FloatingControls`** | 내 위치, 피드백 — **드로어보다 아래** |
| **30** | **Bottom Drawer** | **`BottomDrawer` (Sheet)** | `style={{ zIndex: 30 }}` |
| **35** | **바텀 내비게이션** | **`BottomNavigation`** | 항상 최하단 고정, Sheet보다 위 |
| **38** | **검색 오버레이** | **`SearchOverlay`** | Header 아래 전체화면, BottomNav보다 위 |
| 40 | 헤더 | `Header` | 최상단 고정 |
| 50 | 모달/다이얼로그 | shadcn/ui `Dialog`, `AlertDialog`, `Sheet`, `Tooltip` | 기본값 유지 |

### 규칙

- **플로팅 버튼(25)은 드로어(30)보다 반드시 낮게** — 드로어가 올라오면 FAB 버튼을 자연스럽게 덮음
- shadcn/ui 컴포넌트(Dialog 등)의 `z-50`은 수정하지 않음
- 새 레이어 추가 시 위 표에 기록하고, 기존 값 사이에 배치

## 디자인 토큰 시스템

- **상세 문서**: `docs/reference/design-system.md` (3-Tier 구조, 전체 토큰 레퍼런스, Do/Don't)
- **토큰 정의**: `src/styles/globals.css` → `@theme inline {}` 블록
- **카테고리 배지 설정**: `src/lib/category-config.ts` (`getCategoryBadgeStyle()`)
- **마커 아이콘**: `src/lib/marker-config.ts` (PNG 기반) — 아래 "마커 아이콘 컨벤션" 섹션 참조

### 색상 사용 Do/Don't (요약)

| Do | Don't |
|----|-------|
| `bg-surface-dim` | `bg-gray-50`, `bg-gray-100` |
| `text-text` / `text-text-secondary` / `text-text-muted` | `text-gray-900` / `text-gray-600` / `text-gray-400` |
| `border-border` / `border-border-strong` | `border-gray-200` / `border-gray-300` |
| `bg-naver hover:bg-naver-hover` | `bg-[#03C75A]` |
| `text-course` | `text-emerald-600` |
| `bg-highlight-muted text-highlight-foreground` | `bg-amber-500/10 text-amber-700` |
| `getCategoryBadgeStyle(cat)` | 컴포넌트 내 인라인 `CATEGORY_BADGE_COLORS` |

> Admin 내부 상태 배지(green/red/yellow)는 Tailwind 팔레트 직접 사용 허용.

## 마커 아이콘 컨벤션

### 아키텍처

마커 아이콘은 **PNG 이미지 기반**으로 `naver.maps.HtmlIcon`의 `<img>` 태그로 렌더링.
CSS 기반 마커 스타일은 사용하지 않음 (검색 핀만 예외).

- **설정 파일**: `src/lib/marker-config.ts`
- **이미지 경로**: `public/markers/`

### 파일 구조

```
public/markers/
├── runner-default.png    # 러너스팟 기본 (원형, 82x82)
├── runner-selected.png   # 러너스팟 선택 (핀형, 99x143)
├── shower-default.png    # 샤워 기본 (원형, 78x78)
├── shower-selected.png   # 샤워 선택 (핀형, 99x143)
├── locker-default.png    # 짐보관 기본 (원형, 78x78)
├── locker-selected.png   # 짐보관 선택 (핀형, 99x143)
├── course-default.png    # 코스 기본 (원형, 97x97)
└── course-selected.png   # 코스 선택 (핀형, 99x143)
```

### 사이즈 체계

**공통 기본 사이즈 (`BASE_SIZES`):**

| 상태 | 표시 크기 | 앵커 위치 | 설명 |
|------|----------|----------|------|
| **default** | **20x20** | 중앙 (10, 10) | 원형 마커, 미선택 |
| **selected** | **25x36** | 중앙 하단 (13, 36) | 핀형 마커, 선택됨 |

- 샤워, 짐보관, 코스는 `BASE_SIZES` 그대로 사용
- **카테고리별 오버라이드 (`CATEGORY_SIZES`)**: 특정 카테고리만 다른 사이즈가 필요할 때 등록

| 카테고리 | default | selected | 비고 |
|---------|---------|----------|------|
| 러너스팟 | 24x24 | 30x43 | 기본의 120% |

- **검색 핀**: CSS 기반 (12x12 dot), `MARKER_SIZES`에 포함하지 않음
- **앵커 규칙**: 원형 = 중앙, 핀형 = 중앙 하단

### 공개 API

| 함수 | 용도 | 캡션 지원 |
|------|------|----------|
| `getSpotMarkerIcon(category, isSelected, name?)` | 스팟 마커 | O |
| `getCoursePinIcon(isSelected?, name?)` | 코스 핀 | O |
| `getSearchPinIcon(name?)` | 검색 결과 핀 | O |

- `name`을 넘기면 `buildCaptionedIcon`으로 아이콘 아래 캡션 표시
- 내부적으로 `buildPngIcon` 헬퍼가 bare/captioned 분기를 처리

### 새 카테고리 마커 추가 시

1. Figma에서 Export → `public/markers/{name}-default.png`, `{name}-selected.png`
2. `marker-config.ts`의 `SPOT_IMAGES`에 경로 추가
3. `CATEGORIES` 배열 (`src/types/index.ts`)에 카테고리 추가
4. `category-config.ts`에 뱃지 스타일 추가
5. (선택) 기본 사이즈와 다르면 `CATEGORY_SIZES`에 오버라이드 등록

### ❌ 하지 말 것

- `globals.css`에 `.marker-*` CSS 클래스를 만들지 않음 → PNG `<img>` 사용
- 마커 사이즈를 컴포넌트에서 하드코딩하지 않음 → `BASE_SIZES` / `CATEGORY_SIZES`에서 관리
- SVG 내부에 base64 PNG가 포함된 파일을 사용하지 않음 → 순수 PNG 사용
- 코스/스팟 구분 없이 `{ default, selected }` 이미지 쌍 구조를 유지

## NaverMap 마커 useEffect 패턴

`NaverMap.tsx`에서 스팟 마커의 **데이터 동기화 + 선택 상태 반영**은 **단일 useEffect**에서 처리한다.

### 구조

```
useEffect — 마커 동기화
  deps: [isReady, map, spots, createMarkerIcon, onMarkerClick, selection]
  역할: 마커 생성/제거 + 위치·아이콘·zIndex 업데이트 (선택 상태 포함)
```

- `spots` 변경 → 마커 추가/제거 + 전체 아이콘 갱신
- `selection` 변경 → 전체 마커의 선택 상태(아이콘/zIndex) 갱신
- 스팟 수십~수백 개에서 `setIcon()` 전체 순회 비용은 < 1ms로 무시 가능

### 규칙

1. **마커 아이콘/zIndex 결정 로직은 이 effect 한 곳에만 존재** — 중복 없음
2. `selection`에서 `selectedSpotId`를 파생하여 각 마커의 `isSelected` 판단
3. 새로운 마커 상태(예: hover)를 추가할 때도 이 effect 내에서 처리

### ❌ 하지 말 것

- 선택 상태 전환을 별도 useEffect로 분리하지 않음 → ref 기반 교차 결합 발생, 복잡도만 증가
- `prevSelectedSpotIdRef` 같은 mutable ref로 effect 간 상태를 공유하지 않음 → deps에서 직접 파생

## 이미지 최적화 가이드

### 태그 선택 기준 (`<Image>` vs `<img>`)

`next/image`(`<Image>`)는 `/_next/image?url=...` 경로로 요청하므로, `public/` 원본 URL과 **브라우저 캐시를 공유하지 않는다.** 따라서 이미지 성격에 따라 태그를 구분해야 한다.

| 이미지 성격 | 태그 | 이유 |
|------------|------|------|
| **유저 콘텐츠** (스팟/코스 사진, Supabase Storage URL) | `<Image>` | 큰 파일(수백 KB~), WebP 변환 + 리사이즈 + Edge 캐싱 효과 큼 |
| **정적 UI 에셋** (로고, 마커 PNG, 토글 아이콘 등 `public/` 파일) | `<img>` | 작은 파일(수 KB), 최적화 실익 없음, `preloadMarkerImages()` 등 프리로드 캐시와 URL 공유 |
| **Admin 전용** (DataURL 프리뷰, 폼 내부 이미지) | `<img>` | 관리자만 사용, 최적화 불필요 |
| **SDK 직접 fetch** (Naver Maps `GroundOverlay`, `HtmlIcon` 마커) | `<img>` / raw URL | `next/image` 경유 불가 → 업로드 시점에 `sharp`로 최적화 |

### 캐싱 구조

```
유저 콘텐츠 (Supabase URL)
  └─ <Image> → /_next/image?url=...  → Vercel Edge CDN 캐싱 + WebP/AVIF 변환

정적 UI 에셋 (public/ 파일)
  └─ <img>  → /logo/logo.png         → Vercel Static CDN 캐싱 (Cache-Control: immutable)
  └─ <img>  → /markers/*.png          → 동일 URL이므로 preloadMarkerImages() 캐시와 공유
```

- `public/` 파일은 Vercel이 정적 자산으로 CDN 캐싱 (별도 변환 없이도 빠름)
- `preloadMarkerImages()`는 `new Image().src`로 raw URL을 브라우저 캐시에 적재 → 같은 URL의 `<img>`는 즉시 표시
- `<Image>`는 `/_next/image` 경유 URL이므로 프리로드 캐시와 **별개** — 정적 에셋에 쓰면 이중 로드 발생

### 규칙

- **유저 콘텐츠 이미지는 반드시 `<Image>` 사용**
  - `next.config.ts`에 Supabase Storage `remotePatterns` 설정 완료
  - `fill` + `sizes` 패턴 권장 (전체 폭: `sizes="100vw"`, 고정 폭: `sizes="288px"` 등)
- **정적 UI 에셋은 `<img>` 사용** — `<Image>` 금지
  - 로고 (`/logo/logo.png`), 마커 PNG (`/markers/*.png`), 토글 아이콘 (`/logo/course_*.png`), 필터 칩 아이콘 등
  - ESLint `@next/next/no-img-element` 경고는 주석으로 suppress하거나 무시
- **서버 사이드 업로드 시 `sharp`로 WebP 변환** — 원본 포맷(png, jpg 등) 그대로 저장하지 않음
  - Naver Maps SDK가 직접 fetch하는 이미지는 `next/image` 경유 불가 → 업로드 시점에 최적화 필수

### ❌ 하지 말 것

- 정적 UI 에셋(`public/`)에 `<Image>`를 사용하지 않음 → `/_next/image` 변환 오버헤드 + 프리로드 캐시 미공유
- 유저 콘텐츠(Supabase URL)에 `<img>`를 사용하지 않음 → WebP 변환 + 리사이즈 이점 상실
- 마커 PNG를 `<Image>`로 표시하지 않음 → `preloadMarkerImages()` 캐시와 URL 불일치

## Analytics (Mixpanel)

- **상세 문서**: `docs/reference/analytics.md` (이벤트 카탈로그, API, 새 이벤트 추가 가이드)
- **타입 정의**: `src/types/analytics.ts` (`AnalyticsEventMap`)
- **분석 모듈**: `src/lib/analytics.ts` (`track()`, `initAnalytics()`)
- **환경 판별**: `src/lib/env.ts` (`isProduction`)
- **초기화**: `src/components/AnalyticsProvider.tsx` → `layout.tsx`에 마운트

### 이벤트 추가 시

1. `src/types/analytics.ts`의 `AnalyticsEventMap`에 타입 추가
2. 컴포넌트에서 `track('event_name', { ...props })` 호출
3. `docs/reference/analytics.md` 이벤트 카탈로그 업데이트

### ❌ 하지 말 것

- `mixpanel.track()`을 직접 호출하지 않음 → `track()` 래퍼 사용
- 서버 컴포넌트/API Route에서 `track()` import하지 않음 → 클라이언트 전용
- `AnalyticsEventMap`에 없는 이벤트를 보내지 않음 → 타입 정의 먼저

## Known Limitations

| 항목 | 설명 | 영향 범위 |
|------|------|----------|
| **iOS Safe Area 미처리** | `env(safe-area-inset-bottom)` 미적용 — iPhone X 이후 홈 인디케이터 영역(~34px)에 UI가 가려질 수 있음. `BottomNavigation`, `BottomDrawer`, `FloatingControls` 등 하단 고정 요소 전체에 해당. `viewport-fit=cover` 메타 태그 + safe area padding 적용 필요. | 하단 고정 UI 전체 |
| **GPX 업로드 검증 최소화** | Admin 전용이므로 MIME 타입 검증, difficulty 범위(1~10) 검증 등을 생략. 확장자(`.gpx`) + 크기(5MB) + 기본 콘텐츠(`<gpx>` 태그) 검증만 수행. 공개 업로드 API로 전환 시 강화 필요. | `src/lib/gpx-upload.ts`, `src/app/api/admin/courses/route.ts` |
| **클라이언트 fetch 비-JSON 응답 미처리** | 클라이언트 fetch 후 `res.ok` 체크 없이 바로 `res.json()` 호출하는 패턴이 프로젝트 전반에 사용됨. 502/503 등 비-JSON 응답 시 파싱 에러가 catch로 빠져 "네트워크 오류"로 표시됨. 서버 오류와 네트워크 오류 구분 불가. | 클라이언트 fetch 전체 (`FeedbackDialog`, `SpotForm`, `admin/courses`, `useGeocode` 등) |
