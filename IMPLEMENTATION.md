# Runner's Spot - 구현 문서

## 1. 프로젝트 개요

**Runner's Spot**은 러너를 위한 장소(짐보관, 샤워실, 탈의실 등)를 네이버 지도 위에 표시하는 모바일 전용 웹앱.

- **Tech Stack**: Next.js 15 (App Router) + Supabase + Vercel
- **지도**: Naver Map JavaScript API v3 (직접 스크립트 로딩)
- **대상**: 모바일 전용 (반응형이 아닌 모바일 퍼스트 고정)

---

## 2. 핵심 기능 요약

| 기능 | 설명 |
|------|------|
| 지도 뷰 | 서울 고정 시작, 네이버 지도 전체 화면 |
| 장소 마커 | 카테고리별 마커 표시, 하이라이트 장소는 다른 색상/크기 |
| 필터 칩 | 헤더 아래 카테고리 필터 칩 (짐보관, 샤워실, 탈의실 등) 토글 |
| 통합 검색 | 장소명 + 주소 + 카테고리 전체에서 검색 |
| Bottom Sheet | 마커 클릭 시 간략 정보 표시 |
| 상세 페이지 | Bottom Sheet에서 더보기 클릭 시 전체 페이지 전환 |
| FAB 메뉴 | 오른쪽 하단 플로팅 버튼 → dropup (feedback, 제휴문의) |
| Admin | /admin 경로, Supabase Auth 로그인, 장소 CRUD + 하이라이트 지정 |
| 하이라이트 | Admin이 수동 지정, 필터와 무관하게 항상 지도에 표시 |

---

## 3. UI 구조 (모바일)

```
┌─────────────────────────┐
│  Runner's Spot   [🔍]   │  ← 헤더 (앱 이름 + 검색 토글)
├─────────────────────────┤
│ [짐보관] [샤워실] [탈의실]│  ← 필터 칩 (스크롤 가능)
├─────────────────────────┤
│                         │
│                         │
│     네이버 지도          │  ← 전체 화면 지도
│       (마커들)          │
│                         │
│                    [≡]  │  ← FAB 메뉴 버튼 (오른쪽 하단)
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ 장소명              │ │  ← Bottom Sheet (마커 클릭 시)
│ │ 주소 / 카테고리     │ │
│ │ [더보기]            │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### FAB 메뉴 (dropup)
```
           [제휴문의]
           [피드백]
              [≡]  ← 클릭하면 위로 메뉴 펼침
```

---

## 4. 데이터베이스 스키마 (Supabase)

### spots 테이블

```sql
CREATE TABLE spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  categories TEXT[] NOT NULL DEFAULT '{}',
  is_highlighted BOOLEAN DEFAULT FALSE,
  operating_hours JSONB,
  description TEXT,
  phone TEXT,
  photos TEXT[] DEFAULT '{}',
  extra_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**필드 설명**:
- `categories`: 태그 배열 (예: `['짐보관', '샤워실', '탈의실']`) - 한 장소가 여러 카테고리 가능
- `is_highlighted`: Admin이 수동 지정, true면 필터와 무관하게 항상 표시
- `operating_hours`: 유연한 JSON 구조 (예: `{"mon": "09:00-22:00", "tue": "09:00-22:00", ...}`)
- `extra_data`: 향후 확장을 위한 JSONB 필드 (가격, 추가 시설 정보 등 자유롭게 추가 가능)
- `photos`: 이미지 URL 배열 (Supabase Storage에 업로드 후 URL 저장)

### admin_users (Supabase Auth 활용)

별도 테이블 없이 Supabase Auth + RLS(Row Level Security) 활용:
- Supabase Auth로 이메일/비밀번호 로그인
- `auth.users` 메타데이터에 `role: 'admin'` 설정
- RLS 정책으로 admin만 CRUD 가능하도록 제한

### RLS 정책

```sql
-- 누구나 spots 조회 가능 (비로그인 포함)
CREATE POLICY "spots_select" ON spots
  FOR SELECT USING (true);

-- admin만 spots 생성/수정/삭제 가능
CREATE POLICY "spots_insert" ON spots
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "spots_update" ON spots
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "spots_delete" ON spots
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
```

---

## 5. 프로젝트 구조

```
running_map/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 루트 레이아웃 (Naver Map 스크립트 로딩)
│   │   ├── page.tsx                # 메인 지도 페이지
│   │   ├── spot/
│   │   │   └── [id]/
│   │   │       └── page.tsx        # 장소 상세 페이지
│   │   └── admin/
│   │       ├── layout.tsx          # Admin 레이아웃 (Auth guard)
│   │       ├── page.tsx            # Admin 대시보드 (장소 목록)
│   │       ├── login/
│   │       │   └── page.tsx        # Admin 로그인
│   │       ├── spots/
│   │       │   ├── new/
│   │       │   │   └── page.tsx    # 장소 추가
│   │       │   └── [id]/
│   │       │       └── edit/
│   │       │           └── page.tsx # 장소 수정
│   │       └── components/
│   │           └── SpotForm.tsx    # 장소 추가/수정 공통 폼
│   ├── components/
│   │   ├── Map/
│   │   │   ├── NaverMap.tsx        # 네이버 지도 컴포넌트 (use client)
│   │   │   ├── MapMarker.tsx       # 마커 컴포넌트
│   │   │   └── MapControls.tsx     # 지도 컨트롤 (현위치 등)
│   │   ├── Header.tsx              # 헤더 (앱 이름 + 검색)
│   │   ├── SearchBar.tsx           # 검색창
│   │   ├── FilterChips.tsx         # 카테고리 필터 칩
│   │   ├── BottomSheet.tsx         # Bottom Sheet 컴포넌트
│   │   ├── SpotCard.tsx            # Bottom Sheet 내 장소 카드
│   │   ├── FABMenu.tsx             # 플로팅 액션 버튼 + dropup 메뉴
│   │   └── ui/                     # 공통 UI 컴포넌트
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # Supabase 브라우저 클라이언트
│   │   │   ├── server.ts           # Supabase 서버 클라이언트
│   │   │   └── middleware.ts       # Auth 미들웨어
│   │   └── naver-maps.ts           # Naver Map 유틸리티/타입 정의
│   ├── hooks/
│   │   ├── useSpots.ts             # 장소 데이터 fetch/filter 훅
│   │   ├── useSearch.ts            # 검색 훅
│   │   └── useNaverMap.ts          # 네이버 맵 인스턴스 관리 훅
│   ├── types/
│   │   └── index.ts                # TypeScript 타입 정의
│   └── styles/
│       └── globals.css             # 글로벌 스타일 (Tailwind CSS)
├── public/
│   └── markers/                    # 커스텀 마커 이미지
├── supabase/
│   └── migrations/                 # DB 마이그레이션 파일
├── .env.local                      # 환경변수 (API 키 등)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 6. Naver Map 연동 방식

### 스크립트 로딩 (layout.tsx)

```tsx
// src/app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Script
          strategy="afterInteractive"
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`}
        />
      </body>
    </html>
  );
}
```

### 지도 컴포넌트 (NaverMap.tsx)

```tsx
"use client";

// dynamic import로 SSR 비활성화
// useEffect에서 naver.maps.Map 인스턴스 생성
// 마커는 naver.maps.Marker로 생성
// 하이라이트 마커는 크기/색상 다르게 설정
// 마커 클릭 이벤트 → Bottom Sheet 열기
```

### 마커 전략

- **일반 마커**: 기본 크기, 카테고리별 색상 구분 (선택사항)
- **하이라이트 마커**: 더 큰 크기 + 강조 색상 (예: 골드/오렌지)
- **필터 적용 시**: 선택된 카테고리에 해당하는 마커만 표시, 단 `is_highlighted=true`인 마커는 항상 표시
- **성능**: 초기에는 마커 수가 적을 것으로 예상되어 클러스터링 불필요, 추후 필요 시 추가

---

## 7. 주요 사용자 플로우

### 7-1. 일반 사용자 (러너)

```
앱 접속 → 서울 중심 지도 표시 + 모든 마커 표시
    ├── 필터 칩 선택 → 해당 카테고리 마커만 표시 (하이라이트는 유지)
    ├── 검색 → 결과에 해당하는 마커 강조/이동
    ├── 마커 클릭 → Bottom Sheet (장소명, 주소, 카테고리 태그)
    │   └── 더보기 → 상세 페이지 (전체 정보, 사진, 지도 미니맵 등)
    └── FAB 클릭 → dropup 메뉴
        ├── 피드백 (구글폼 등 외부 링크)
        └── 제휴문의 (외부 링크 또는 이메일)
```

### 7-2. Admin

```
/admin/login → 이메일/비밀번호 로그인
    └── /admin → 장소 목록 (테이블)
        ├── 장소 추가 → /admin/spots/new (폼)
        ├── 장소 수정 → /admin/spots/[id]/edit (폼)
        ├── 장소 삭제 → 확인 후 삭제
        └── 하이라이트 토글 → 목록에서 바로 토글 가능
```

---

## 8. API 라우트 (Next.js Route Handlers)

Supabase 클라이언트를 직접 사용하므로 별도 API 라우트는 최소화.
필요한 경우:

| 라우트 | 메서드 | 설명 |
|--------|--------|------|
| Supabase 직접 호출 | GET | spots 조회 (RLS로 공개) |
| Supabase 직접 호출 | POST/PUT/DELETE | spots CRUD (RLS로 admin만) |
| `/api/search` | GET | 통합 검색 (Supabase full-text search 또는 ILIKE) |

---

## 9. 환경변수

```env
# Naver Map
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_naver_map_client_id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 10. 배포 (Vercel)

1. GitHub repo 연결
2. 환경변수 설정 (위 .env.local 항목들)
3. Naver Map API 설정에서 Vercel 도메인을 허용 도메인으로 등록
4. Supabase 프로젝트 URL/Key 설정

---

## 11. 구현 순서 (권장)

### Phase 1: 기본 셋업
- [ ] Next.js 프로젝트 생성 (App Router, TypeScript, Tailwind CSS)
- [ ] Supabase 프로젝트 연결 및 DB 스키마 생성
- [ ] Naver Map API 키 발급 및 기본 지도 표시

### Phase 2: 핵심 지도 기능
- [ ] 마커 표시 (Supabase에서 spots 데이터 fetch → 마커 렌더링)
- [ ] 하이라이트 마커 구분 (크기/색상)
- [ ] 마커 클릭 → Bottom Sheet
- [ ] Bottom Sheet → 상세 페이지 전환

### Phase 3: 검색 & 필터
- [ ] 헤더 + 검색창 구현
- [ ] 필터 칩 구현 (카테고리 토글)
- [ ] 통합 검색 구현 (장소명 + 주소 + 카테고리)

### Phase 4: FAB 메뉴
- [ ] FAB 버튼 + dropup 메뉴 구현
- [ ] 피드백 / 제휴문의 링크 연결

### Phase 5: Admin
- [ ] Admin 로그인 페이지
- [ ] Admin 장소 목록 (CRUD)
- [ ] 장소 추가/수정 폼 (지도에서 좌표 선택 포함)
- [ ] 하이라이트 토글
- [ ] RLS 정책 적용

### Phase 6: 배포 및 마무리
- [ ] Vercel 배포
- [ ] Naver Map 도메인 설정
- [ ] 테스트 및 버그 수정

---

## 12. Naver Map API 참고 문서 링크

### 공식 문서 & 콘솔

| 문서 | URL | 상태 |
|------|-----|------|
| NCP 콘솔 (API 키 발급) | https://www.ncloud.com/product/applicationService/maps | OK |
| Maps 개요 (NCP API 문서) | https://api.ncloud-docs.com/docs/application-maps-overview | OK (JS 렌더링) |
| JavaScript API v3 메인 레퍼런스 | https://navermaps.github.io/maps.js.ncp/docs/ | OK |

### API 클래스 레퍼런스 (검증 완료)

| 클래스 | URL |
|--------|-----|
| Map (지도 객체) | https://navermaps.github.io/maps.js.ncp/docs/naver.maps.Map.html |
| Marker (마커) | https://navermaps.github.io/maps.js.ncp/docs/naver.maps.Marker.html |
| Event (이벤트 시스템) | https://navermaps.github.io/maps.js.ncp/docs/naver.maps.Event.html |
| InfoWindow (정보 창) | https://navermaps.github.io/maps.js.ncp/docs/naver.maps.InfoWindow.html |
| OverlayView (커스텀 오버레이 베이스) | https://navermaps.github.io/maps.js.ncp/docs/naver.maps.OverlayView.html |
| LatLng (좌표) | https://navermaps.github.io/maps.js.ncp/docs/naver.maps.LatLng.html |

### 튜토리얼 (검증 완료)

| 튜토리얼 | URL |
|-----------|-----|
| 시작하기 | https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html |
| 마커 기본 | https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Marker.html |
| 정보 창 (InfoWindow) | https://navermaps.github.io/maps.js.ncp/docs/tutorial-3-InfoWindow.html |
| 커스텀 오버레이 | https://navermaps.github.io/maps.js.ncp/docs/tutorial-6-CustomOverlay.html |

### 예제 코드 (검증 완료)

| 예제 | URL |
|------|-----|
| 마커 표시하기 (기본) | https://navermaps.github.io/maps.js.ncp/docs/tutorial-1-marker-simple.example.html |
| 이미지 아이콘 마커 | https://navermaps.github.io/maps.js.ncp/docs/tutorial-3-marker-image-icon.example.html |
| HTML 아이콘 마커 | https://navermaps.github.io/maps.js.ncp/docs/tutorial-5-marker-html-icon.example.html |
| 뷰포트 내 마커만 표시 | https://navermaps.github.io/maps.js.ncp/docs/tutorial-marker-viewport.example.html |
| 다수 마커 이벤트 핸들러 | https://navermaps.github.io/maps.js.ncp/docs/tutorial-marker-viewportevents.example.html |
| 겹침 마커 처리 | https://navermaps.github.io/maps.js.ncp/docs/tutorial-marker-intersect.example.html |
| 마커 클러스터링 | https://navermaps.github.io/maps.js.ncp/docs/tutorial-marker-cluster.example.html |

### 커뮤니티 / 참고 자료

| 자료 | URL |
|------|-----|
| GitHub navermaps (공식) | https://github.com/navermaps |
| Next.js + Naver Map 예제 | https://github.com/PerlPark/Study-nextjs-naver-map |
| react-naver-maps npm (참고용) | https://www.npmjs.com/package/react-naver-maps |
| Next.js + TS로 Naver Map 연결 블로그 | https://tech.codedream.co.kr/20 |

### 접근 불가 / 주의 링크

| 문서 | URL | 비고 |
|------|-----|------|
| Web Dynamic Map SDK 가이드 | https://guide.ncloud-docs.com/docs/maps-web-sdk | 403 Forbidden (직접 접근 불가, NCP 콘솔에서 이동 필요) |

---

## 13. Naver Map SDK 핵심 활용 가이드

이 프로젝트에서 사용할 핵심 SDK 패턴을 정리.

### 13-1. 스크립트 로딩 (Next.js App Router)

```tsx
// src/app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Script
          strategy="afterInteractive"
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`}
        />
      </body>
    </html>
  );
}
```

**참고**: 쿼리 파라미터는 `ncpClientId` (NCP 플랫폼 기준). 구버전 문서에는 `ncpKeyId`로 되어있을 수 있음.

### 13-2. 지도 초기화 (클라이언트 컴포넌트)

```tsx
"use client";
import { useEffect, useRef } from "react";

export default function NaverMap() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || !window.naver) return;

    const map = new naver.maps.Map(mapRef.current, {
      center: new naver.maps.LatLng(37.5665, 126.978),  // 서울시청
      zoom: 13,
      minZoom: 10,
      maxZoom: 18,
      // 모바일 최적화
      pinchZoom: true,
      scrollWheel: true,
      disableKineticPan: false,  // 관성 스크롤 활성화
    });
  }, []);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}
```

### 13-3. 마커 생성 패턴 (일반 vs 하이라이트)

```typescript
// 일반 마커
function createMarker(spot: Spot, map: naver.maps.Map) {
  return new naver.maps.Marker({
    position: new naver.maps.LatLng(spot.latitude, spot.longitude),
    map: map,
    icon: {
      content: `<div class="marker-default">${spot.name}</div>`,
      size: new naver.maps.Size(24, 24),
      anchor: new naver.maps.Point(12, 24),
    },
  });
}

// 하이라이트 마커 (더 크고 강조 색상)
function createHighlightMarker(spot: Spot, map: naver.maps.Map) {
  return new naver.maps.Marker({
    position: new naver.maps.LatLng(spot.latitude, spot.longitude),
    map: map,
    icon: {
      content: `<div class="marker-highlight">${spot.name}</div>`,
      size: new naver.maps.Size(36, 36),
      anchor: new naver.maps.Point(18, 36),
    },
    zIndex: 100,  // 하이라이트는 항상 위에
  });
}
```

### 13-4. 마커 클릭 이벤트 → Bottom Sheet 연동

```typescript
// 클로저 패턴으로 마커별 이벤트 바인딩
function bindMarkerClick(
  marker: naver.maps.Marker,
  spot: Spot,
  onSelect: (spot: Spot) => void
) {
  naver.maps.Event.addListener(marker, "click", () => {
    onSelect(spot);  // React state로 Bottom Sheet 열기
  });
}

// 사용 예시
spots.forEach((spot) => {
  const marker = createMarker(spot, map);
  bindMarkerClick(marker, spot, setSelectedSpot);
});
```

### 13-5. 필터링 시 마커 표시/숨김

```typescript
function updateMarkers(
  markers: Map<string, naver.maps.Marker>,
  spots: Spot[],
  activeFilters: string[]
) {
  spots.forEach((spot) => {
    const marker = markers.get(spot.id);
    if (!marker) return;

    // 하이라이트는 항상 표시
    if (spot.is_highlighted) {
      marker.setMap(map);
      return;
    }

    // 필터가 없으면 전부 표시
    if (activeFilters.length === 0) {
      marker.setMap(map);
      return;
    }

    // 선택된 카테고리에 해당하면 표시, 아니면 숨김
    const hasCategory = spot.categories.some((cat) =>
      activeFilters.includes(cat)
    );
    marker.setMap(hasCategory ? map : null);
  });
}
```

### 13-6. TypeScript 타입 선언

Naver Map SDK는 전역 `naver` 객체를 사용하므로, 타입 선언이 필요:

```typescript
// src/types/naver-maps.d.ts
declare namespace naver.maps {
  class Map {
    constructor(element: HTMLElement | string, options?: MapOptions);
    getCenter(): LatLng;
    setCenter(center: LatLng): void;
    getZoom(): number;
    setZoom(zoom: number): void;
    getBounds(): LatLngBounds;
    panTo(coord: LatLng, options?: any): void;
    destroy(): void;
  }

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    getPosition(): LatLng;
    setPosition(position: LatLng): void;
    setIcon(icon: string | ImageIcon | HtmlIcon): void;
    setVisible(visible: boolean): void;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  // ... 필요한 만큼 추가
}
```

**또는** `@types/navermaps` 패키지가 있다면 설치:
```bash
npm install --save-dev @types/navermaps
```

### 13-7. 인증 실패 처리

```typescript
// layout.tsx 또는 전역에 선언
if (typeof window !== "undefined") {
  (window as any).navermap_authFailure = function () {
    console.error("Naver Map 인증 실패: Client ID를 확인하세요.");
  };
}
```
