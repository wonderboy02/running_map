# Runner's Spot - 프로젝트 컨텍스트

## 프로젝트 개요

러너를 위한 장소(짐보관, 샤워실, 탈의실 등)를 네이버 지도 위에 표시하는 모바일 전용 웹앱.

- **Tech Stack**: Next.js 15 (App Router) + Supabase + Tailwind CSS v4 + TypeScript
- **UI 라이브러리**: shadcn/ui (new-york 스타일) + lucide-react 아이콘
- **지도**: Naver Map JavaScript API v3
- **배포**: Vercel
- **상세 기획**: `IMPLEMENTATION.md` 참조
- **변경 이력**: `docs/changelog/` 참조

## 디렉토리 구조

```
src/
├── app/                    # Next.js App Router 페이지
│   ├── api/geocode/        # Geocoding API Route (서버 사이드)
│   ├── spot/[id]/          # 장소 상세 페이지
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
│   │   └── DrawerSpotList.tsx   # 스팟 목록 콘텐츠
│   └── ui/                 # shadcn/ui 컴포넌트 (button, input, badge 등)
├── lib/                    # 유틸리티
│   ├── supabase/           # Supabase 클라이언트 (client, server, middleware)
│   ├── auth/               # withAuth HOF (Admin API 인증)
│   ├── image-upload.ts     # 이미지 검증 + WebP 변환 + Storage 업로드/삭제
│   ├── utils.ts            # cn() 유틸리티 (shadcn/ui)
│   └── marker-config.ts    # 마커 아이콘 설정 (PNG 기반, 카테고리별 default/selected)
├── hooks/                  # 커스텀 훅 (useSpots, useSearch, useNaverMap, useGeocode)
├── types/                  # TypeScript 타입 정의
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

### Naver Cloud Platform 콘솔 설정

1. **콘솔 접속**: [https://console.ncloud.com](https://console.ncloud.com)
2. **애플리케이션 등록**: Services > Application Services > Maps > Application
3. **필수 설정**:
   - **서비스 선택**: "Web Dynamic Map" + "Geocoding" 체크 (필수! 체크 안 하면 429/401 에러)
   - **Web 서비스 URL**: 다음 URL들을 **모두** 등록
     ```
     http://localhost:3000
     https://localhost:3000
     https://*.vercel.app
     https://running-map-sand.vercel.app
     ```
     ⚠️ Vercel은 배포마다 URL이 바뀔 수 있으므로 와일드카드(`*.vercel.app`) 추가 필수
4. **인증 정보 확인**: Client ID와 Client Secret 복사
5. **설정 반영 시간**: 저장 후 최대 5-10분 소요

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

### 트러블슈팅

**지도 "Authentication Failed" 에러 발생 시:**

1. 콘솔에서 현재 배포 URL이 "Web 서비스 URL"에 등록되어 있는지 확인
2. "Dynamic Map" 서비스가 활성화되어 있는지 확인
3. Client ID가 정확한지 확인
4. 스크립트 URL이 `https://oapi.map.naver.com`인지 확인 (`openapi` 아님!)
5. 파라미터가 `ncpKeyId`인지 확인 (`ncpClientId` 아님!)
6. 설정 변경 후 5-10분 대기
7. 브라우저 캐시 삭제 후 재시도

**Geocoding API 401 에러 발생 시:**

1. NCP 콘솔에서 "Geocoding" 서비스가 활성화되어 있는지 확인 ("Web Dynamic Map"과 별도로 체크 필요)
2. `.env.local`에 `NAVER_MAP_CLIENT_SECRET` 설정 확인
3. Client Secret이 해당 애플리케이션의 것인지 확인 (다른 앱의 키 혼동 주의)
4. 브라우저에서 `/api/geocode?query=강남` 직접 호출하여 `detail` 필드의 에러 메시지 확인
5. 설정 변경 후 5-10분 대기 (NCP 콘솔 설정 반영 시간)
6. Client Secret이 재발급되었거나 비활성화되지 않았는지 확인

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

## 구현 진행 상태

### Phase 1: 기본 셋업

- [x] 프로젝트 디렉토리 구조 생성
- [x] 루트 설정 파일 (gitignore, gitattributes, prettierrc, tsconfig, postcss, next.config, package.json)
- [x] 환경변수 템플릿 (.env.example)
- [x] `npm install` (패키지 설치)
- [x] TypeScript 타입 정의 (`src/types/index.ts`, `src/types/naver-maps.d.ts`)
- [x] Tailwind CSS v4 글로벌 스타일 (`src/styles/globals.css`)
- [x] Supabase 클라이언트 (`src/lib/supabase/client.ts`, `server.ts`)
- [x] DB 마이그레이션 SQL (`supabase/migrations/001_create_spots.sql` - admins 테이블 포함, 트랜잭션 처리)
- [x] 루트 레이아웃 + Naver Map 스크립트 로딩 (`src/app/layout.tsx`)
- [x] Supabase 타입 생성 스크립트 (`npm run gen:types`)
- [x] Supabase DB에 마이그레이션 적용 (SQL 실행)
- [ ] Naver Map API 키 발급 및 .env.local 설정

### Phase 2: 핵심 지도 기능

- [x] NaverMap 컴포넌트 (`src/components/Map/NaverMap.tsx`)
- [x] useNaverMap 훅 (`src/hooks/useNaverMap.ts`)
- [x] useSpots 훅 (`src/hooks/useSpots.ts`)
- [x] 마커 표시 (일반 + 하이라이트 + 카테고리별 색상 구분)
- [x] 마커 설정 시스템 (`src/lib/marker-config.ts`)
- [x] 마커 클릭 → Bottom Drawer (`src/components/BottomDrawer/` — 통합 snap point 기반)
- [x] Bottom Drawer → 상세 페이지 전환 (`src/app/spot/[id]/page.tsx`)
- [x] 지도 유형 전환 (일반/위성/혼합/지형) (`src/components/Map/MapControls.tsx`)
- [x] 현재 위치 버튼 (브라우저 Geolocation API)

### Phase 3: 검색 & 필터

- [x] 헤더 + 검색창 (`src/components/Header.tsx`, `SearchBar.tsx`)
- [x] 필터 칩 (카테고리 토글) (`src/components/FilterChips.tsx`)
- [x] 통합 검색 (장소명 + 주소 + 카테고리) (`src/hooks/useSearch.ts`)

### Phase 4: FAB 메뉴

- [x] FAB 버튼 + dropup 메뉴 (`src/components/FABMenu.tsx`)
- [x] 피드백 / 제휴문의 링크

### Phase 5: Admin

- [x] Admin 레이아웃 + Auth guard (`src/app/admin/layout.tsx`)
- [x] Admin 로그인 페이지 (`src/app/admin/login/page.tsx`)
- [x] Admin 장소 목록 + CRUD (`src/app/admin/page.tsx`)
- [x] 장소 추가/수정 공통 폼 (`src/app/admin/components/SpotForm.tsx`)
- [x] 하이라이트 토글 (목록에서 바로 토글)
- [x] RLS 정책 SQL 작성 (`supabase/migrations/001_create_spots.sql`)
- [x] Geocoding API Route (`src/app/api/geocode/route.ts`)
- [x] 주소 검색 UI (SpotForm 자동완성 드롭다운 + 좌표 자동 입력)
- [ ] Supabase Auth admin 유저 생성

### Phase 5.5: UI 라이브러리 (shadcn/ui)

- [x] shadcn/ui 통합 (components.json, utils.ts, globals.css)
- [x] 컴포넌트 12개 설치 (button, input, label, textarea, badge, card, sheet, dialog, sonner, select, checkbox, alert-dialog, separator)
- [x] Toaster 추가 (layout.tsx)
- [x] 기존 컴포넌트 리팩터링 (BottomDrawer, Header, FilterChips, FABMenu, SpotCard, admin 페이지 등)
- [x] lucide-react 아이콘 통합

### Phase 5.6: 문서

- [x] Naver Maps API 레퍼런스 (`docs/reference/naver-maps.md`)
- [x] 변경 이력 (`docs/changelog/`)

### Phase 6: 배포 및 마무리

- [ ] Vercel 배포
- [ ] Naver Map 도메인 설정
- [ ] 테스트 및 버그 수정

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
| `src/lib/image-upload.ts` | 이미지 검증(`validateImageFile`), WebP 변환+업로드(`convertAndUpload`), Storage 삭제(`removeFromStorage`) |
| `src/lib/utils.ts` | `cn()` (Tailwind 클래스 병합) |
| `src/lib/marker-config.ts` | 마커 아이콘 (PNG 기반, `getSpotMarkerIcon()`, `getCoursePinIcon(isSelected?, name?)`, `getSearchPinIcon()`) |
| `src/lib/category-config.ts` | 카테고리 배지 스타일 (`getCategoryBadgeStyle()`) |
| `src/lib/naver-map-utils.ts` | 네이버 지도 유틸 |
| `src/lib/auth/withAuth.ts` | Admin API 인증 HOF |

## BottomDrawer 컨벤션

### 아키텍처

`src/components/BottomDrawer/`는 **하나의 Sheet 인스턴스**를 유지하며 콘텐츠만 교체하는 구조:

```
BottomDrawer (index.tsx)     ← Sheet 인스턴스 (항상 isOpen={true})
├── DrawerSpotDetail.tsx     ← selectedSpot이 있을 때
└── DrawerSpotList.tsx       ← selectedSpot이 null일 때
```

- Sheet는 **절대 언마운트되지 않음** → 전환 애니메이션이 부드러움
- `disableDismiss={true}` → 사용자가 완전히 닫을 수 없음 (최소 title snap 유지)

### Snap Point 체계 (4단계)

```
snapPoints = [0, peekPx, titlePx, contentPx, maxHeight]
              │    │       │         │          └─ index 4: full (75vh, 스크롤 가능)
              │    │       │         └─ index 3: content (주요 콘텐츠)
              │    │       └─ index 2: title (사진+이름+주소 / 요약바)
              │    └─ index 1: peek (drag handle bar만)
              └─ index 0: (내부용, disableDismiss로 도달 불가)
```

| 단계 | Index | 보이는 것 | 진입 시점 |
|------|-------|----------|----------|
| **Peek** | 1 | drag handle bar만 | 기본 상태, X 버튼 (스팟 해제) |
| **Title** | 2 | + 사진 + 스팟명 + 주소 (detail) / 요약바 (list) | 핀 클릭 |
| **Content** | 3 | + 카테고리 + 설명 + 버튼 | 위로 드래그 |
| **Full** | 4 | 75vh 전체, 스크롤 가능 | 위로 더 드래그 |

- `useSnapPoints` 훅이 `titleRef`, `contentRef`의 DOM 높이를 측정하여 픽셀 값 계산
- `peekPx` = `HEADER_HEIGHT` (40px, drag handle만)
- 윈도우 리사이즈 시 자동 재계산
- 측정 불가 시 fallback: `[0, 40, 0.15, 0.45, 0.75]`

### 새 Drawer 콘텐츠 추가 시 규칙

1. **`titleRef` / `contentRef` 필수**: 모든 콘텐츠 컴포넌트는 props로 `titleRef`와 `contentRef`를 받아 snap 경계를 지정
2. **titleRef**: snap 1에서 보이는 영역 (drag handle + 이 div까지)
3. **contentRef**: snap 2에서 추가로 보이는 영역 (titleRef 아래)
4. **나머지 콘텐츠**: snap 3(full)에서만 노출

```tsx
interface DrawerNewContentProps {
  titleRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  // ... 기타 props
}

export default function DrawerNewContent({ titleRef, contentRef, ... }: DrawerNewContentProps) {
  return (
    <>
      <div ref={titleRef}>  {/* snap 1 경계 */}
        {/* 제목, 요약 등 최소 정보 */}
      </div>
      <div ref={contentRef}>  {/* snap 2 경계 */}
        {/* 주요 콘텐츠 */}
      </div>
      {/* snap 3에서만 보이는 추가 콘텐츠 */}
    </>
  );
}
```

5. **index.tsx 수정**: 새 콘텐츠 모드 추가 시 조건부 렌더링과 snap 전환 로직 추가
6. **스크롤**: full snap(index 4)에서만 활성화 — `disableScroll={({ currentSnap }) => currentSnap !== 4}`
7. **snap 전환**: 핀 클릭 → `snapTo(2)` (title), 해제 → `snapTo(1)` (peek)

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
| **25** | **플로팅 버튼** | **`FloatingControls`** | 내 위치, 피드백, 오버레이 토글 — **드로어보다 아래** |
| **30** | **Bottom Drawer** | **`BottomDrawer` (Sheet)** | `style={{ zIndex: 30 }}` |
| 40 | 헤더 | `Header` | 최상단 고정 |
| 50 | 모달/다이얼로그 | shadcn/ui `Dialog`, `AlertDialog`, `Sheet`, `Tooltip` | 기본값 유지 |
| 60 | 검색 오버레이 | `SearchOverlay` | 전체화면 오버레이 |

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
| `getSpotMarkerIcon(categories, isHighlighted, isSelected, name?)` | 스팟 마커 | O |
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

- **유저 대면 이미지는 반드시 `next/image` (`<Image>`) 사용** — `<img>` 태그 금지
  - Vercel이 자동으로 WebP/AVIF 변환 + 리사이즈 + Edge 캐싱 + lazy loading 처리
  - `next.config.ts`에 Supabase Storage `remotePatterns` 설정 완료
- **Admin 전용 이미지** (미리보기, 폼 내부)는 `<img>` 허용 (DataURL 프리뷰 등)
- **서버 사이드 업로드 시 `sharp`로 WebP 변환** — 원본 포맷(png, jpg 등) 그대로 저장하지 않음
  - Naver Maps SDK `GroundOverlay` 등 SDK가 직접 fetch하는 이미지는 `next/image` 경유 불가 → 업로드 시점에 최적화 필수
- **`fill` + `sizes` 패턴 사용** — 반응형 레이아웃에서 이미지 크기를 효율적으로 지정
  - 전체 폭: `sizes="100vw"`, 고정 폭: `sizes="288px"` 등
