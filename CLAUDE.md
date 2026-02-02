# Runner's Spot - 프로젝트 컨텍스트

## 프로젝트 개요

러너를 위한 장소(짐보관, 샤워실, 탈의실 등)를 네이버 지도 위에 표시하는 모바일 전용 웹앱.

- **Tech Stack**: Next.js 15 (App Router) + Supabase + Tailwind CSS v4 + TypeScript
- **지도**: Naver Map JavaScript API v3
- **배포**: Vercel
- **상세 기획**: `IMPLEMENTATION.md` 참조

## 디렉토리 구조

```
src/
├── app/                    # Next.js App Router 페이지
│   ├── spot/[id]/          # 장소 상세 페이지
│   └── admin/              # Admin 영역
│       ├── login/          # 로그인
│       ├── spots/new/      # 장소 추가
│       ├── spots/[id]/edit/# 장소 수정
│       └── components/     # Admin 전용 컴포넌트
├── components/             # 공용 컴포넌트
│   ├── Map/                # 네이버 지도 관련 (NaverMap, MapMarker, MapControls)
│   └── ui/                 # 공통 UI
├── lib/supabase/           # Supabase 클라이언트 (client, server, middleware)
├── hooks/                  # 커스텀 훅 (useSpots, useSearch, useNaverMap)
├── types/                  # TypeScript 타입 정의
└── styles/                 # 글로벌 스타일 (globals.css)

public/markers/             # 커스텀 마커 이미지
supabase/migrations/        # DB 마이그레이션 SQL
```

## 경로 별칭

- `@/*` → `./src/*` (tsconfig.json paths)

## 주요 설정

- **Tailwind CSS v4**: `@tailwindcss/postcss` 사용 (tailwind.config.ts 없음, CSS 기반 설정)
- **Prettier**: tailwindcss 플러그인 포함, `endOfLine: lf`
- **Git**: `.gitattributes`로 CRLF → LF 자동 정규화

## Naver Maps API 설정

### ⚠️ 중요: 올바른 스크립트 URL 사용

**반드시 Naver Cloud Platform (NCP) Maps API를 사용해야 합니다:**

```html
<!-- ✅ 올바른 URL (NCP Maps API) -->
<script src="https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=YOUR_CLIENT_ID"></script>

<!-- ❌ 잘못된 URL (기존 Open API - 신규 신청 중단) -->
<script src="https://oapi.map.naver.com/openapi/v3/maps.js?clientId=YOUR_CLIENT_ID"></script>
```

**URL 차이점:**
- NCP Maps: `https://openapi.map.naver.com` + `ncpClientId` 파라미터
- 기존 Open API: `https://oapi.map.naver.com` + `clientId` 파라미터

### Client ID vs Client Secret

| 항목 | Client ID | Client Secret |
|------|-----------|---------------|
| **JavaScript Maps API** | ✅ 필요 (`ncpClientId`) | ❌ 불필요 |
| **REST APIs** (Geocoding 등) | ✅ 필요 (`X-NCP-APIGW-API-KEY-ID`) | ✅ 필요 (`X-NCP-APIGW-API-KEY`) |
| **프론트엔드 노출** | ✅ 가능 (`.env.local`의 `NEXT_PUBLIC_` 변수) | ❌ 절대 금지 |
| **서버 사이드** | - | ✅ 반드시 서버에서만 사용 |

**현재 프로젝트:**
- JavaScript Maps만 사용 → **Client ID만 필요**
- 나중에 Geocoding 추가 시 → **Client Secret도 필요** (Server Action/API Route에서만 사용)

### Naver Cloud Platform 콘솔 설정

1. **콘솔 접속**: [https://console.ncloud.com](https://console.ncloud.com)
2. **애플리케이션 등록**: Services > Application Services > Maps > Application
3. **필수 설정**:
   - **서비스 선택**: "Web Dynamic Map" 체크 (필수! 체크 안 하면 429 에러)
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

# Naver Maps REST API (서버 사이드 전용 - 나중에 필요시)
# NAVER_MAP_CLIENT_SECRET=your_client_secret_here
```

### 공식 문서

- **NCP Maps 개요**: [https://api.ncloud-docs.com/docs/application-maps-overview](https://api.ncloud-docs.com/docs/application-maps-overview)
- **JavaScript API v3 가이드**: [https://navermaps.github.io/maps.js.ncp/docs/](https://navermaps.github.io/maps.js.ncp/docs/)
- **Client ID 발급**: [https://navermaps.github.io/maps.js.ncp/docs/tutorial-1-Getting-Client-ID.html](https://navermaps.github.io/maps.js.ncp/docs/tutorial-1-Getting-Client-ID.html)

### 트러블슈팅

**"Authentication Failed" 에러 발생 시:**
1. 콘솔에서 현재 배포 URL이 "Web 서비스 URL"에 등록되어 있는지 확인
2. "Web Dynamic Map"이 활성화되어 있는지 확인
3. Client ID가 정확한지 확인 (`ncpClientId` 파라미터)
4. 스크립트 URL이 `https://openapi.map.naver.com`인지 확인 (`oapi` 아님!)
5. 설정 변경 후 5-10분 대기
6. 브라우저 캐시 삭제 후 재시도

## Supabase 타입 생성

DB 스키마가 변경될 때마다 TypeScript 타입을 자동 생성합니다:

```bash
npm run gen:types
```

- **생성 위치**: `src/lib/supabase/database.ts`
- **사용 예시**:
  ```typescript
  import { Database } from '@/lib/supabase/database'

  type Spot = Database['public']['Tables']['spots']['Row']
  type SpotInsert = Database['public']['Tables']['spots']['Insert']
  type SpotUpdate = Database['public']['Tables']['spots']['Update']
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
- [ ] Supabase DB에 마이그레이션 적용 (SQL 실행)
- [ ] Naver Map API 키 발급 및 .env.local 설정

### Phase 2: 핵심 지도 기능
- [x] NaverMap 컴포넌트 (`src/components/Map/NaverMap.tsx`)
- [x] useNaverMap 훅 (`src/hooks/useNaverMap.ts`)
- [x] useSpots 훅 (`src/hooks/useSpots.ts`)
- [x] 마커 표시 (일반 + 하이라이트 구분)
- [x] 마커 클릭 → Bottom Sheet (`src/components/BottomSheet.tsx`)
- [x] Bottom Sheet → 상세 페이지 전환 (`src/app/spot/[id]/page.tsx`)

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
- [ ] Supabase Auth admin 유저 생성

### Phase 6: 배포 및 마무리
- [ ] Vercel 배포
- [ ] Naver Map 도메인 설정
- [ ] 테스트 및 버그 수정

## 개발 가이드
- 당신은 **매우 유능한 시니어 개발자**입니다. 작은 스타트업에서 뛰어난 코딩 에이전트로써 매우 권장되는 방식과 깔끔한 형태로 코딩을 진행
- 모호하거나 이상한 부분이 있으면 user 에게 반드시 물어보고 확실하게 처리
- **깔끔하고 권장된 구조**로 코딩할 것, 계획이 그렇지 않다면 계획에 대해 좀 더 명확히 논의 
- 이 컴퓨터는 window 기반 powershell 을 사용하니까 명령어를 그에 맞춰 사용