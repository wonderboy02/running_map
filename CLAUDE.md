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
- [ ] `npm install` (패키지 설치)
- [ ] Supabase 프로젝트 연결 및 DB 스키마 생성
- [ ] Naver Map API 키 발급 및 기본 지도 표시

### Phase 2: 핵심 지도 기능
- [ ] 마커 표시 (Supabase spots → 마커 렌더링)
- [ ] 하이라이트 마커 구분 (크기/색상)
- [ ] 마커 클릭 → Bottom Sheet
- [ ] Bottom Sheet → 상세 페이지 전환

### Phase 3: 검색 & 필터
- [ ] 헤더 + 검색창
- [ ] 필터 칩 (카테고리 토글)
- [ ] 통합 검색 (장소명 + 주소 + 카테고리)

### Phase 4: FAB 메뉴
- [ ] FAB 버튼 + dropup 메뉴
- [ ] 피드백 / 제휴문의 링크

### Phase 5: Admin
- [ ] Admin 로그인 페이지
- [ ] Admin 장소 CRUD
- [ ] 장소 추가/수정 폼 (좌표 선택 포함)
- [ ] 하이라이트 토글
- [ ] RLS 정책 적용

### Phase 6: 배포 및 마무리
- [ ] Vercel 배포
- [ ] Naver Map 도메인 설정
- [ ] 테스트 및 버그 수정

## 개발 가이드
- 당신은 **매우 유능한 시니어 개발자**입니다. 작은 스타트업에서 뛰어난 코딩 에이전트로써 매우 권장되는 방식과 깔끔한 형태로 코딩을 진행
- 모호하거나 이상한 부분이 있으면 user 에게 반드시 물어보고 확실하게 처리
- **깔끔하고 권장된 구조**로 코딩할 것, 계획이 그렇지 않다면 계획에 대해 좀 더 명확히 논의 
- 이 컴퓨터는 window 기반 powershell 을 사용하니까 명령어를 그에 맞춰 사용