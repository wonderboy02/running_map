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

## 구현 진행 상태

### Phase 1: 기본 셋업
- [x] 프로젝트 디렉토리 구조 생성
- [x] 루트 설정 파일 (gitignore, gitattributes, prettierrc, tsconfig, postcss, next.config, package.json)
- [x] 환경변수 템플릿 (.env.example)
- [x] `npm install` (패키지 설치)
- [x] TypeScript 타입 정의 (`src/types/index.ts`, `src/types/naver-maps.d.ts`)
- [x] Tailwind CSS v4 글로벌 스타일 (`src/styles/globals.css`)
- [x] Supabase 클라이언트 (`src/lib/supabase/client.ts`, `server.ts`)
- [x] DB 마이그레이션 SQL (`supabase/migrations/001_create_spots.sql`)
- [x] 루트 레이아웃 + Naver Map 스크립트 로딩 (`src/app/layout.tsx`)
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