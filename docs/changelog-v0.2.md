# Changelog v0.2 — shadcn/ui 통합 & 기능 추가

## 변경 일자: 2026-02-02

---

## 1. shadcn/ui 통합

### 새 의존성
- `class-variance-authority`, `clsx`, `tailwind-merge` — 유틸리티
- `lucide-react` — 아이콘
- `tw-animate-css` — 애니메이션
- `@radix-ui/*` — shadcn 컴포넌트 하위 의존성 (자동 설치)

### 새 파일
- `src/lib/utils.ts` — `cn()` 유틸리티 함수
- `src/components/ui/*.tsx` — shadcn 컴포넌트 14개
  - button, input, label, textarea, badge, card, sheet, dialog, sonner, select, checkbox, toggle, alert-dialog, separator

### 수정된 파일
| 파일 | 변경 내용 |
|------|----------|
| `components.json` | CSS 경로를 `src/styles/globals.css`로 수정 |
| `src/styles/globals.css` | `tw-animate-css` import, shadcn 호환 CSS 변수(background, foreground, card, popover, muted, accent, destructive, input, ring, radius 등) 추가, 카테고리별 마커 CSS 추가 |
| `src/app/layout.tsx` | `<Toaster position="top-center" richColors />` 추가 |
| `src/components/BottomSheet.tsx` | 커스텀 구현 → shadcn `Sheet` (side="bottom") |
| `src/components/Header.tsx` | SVG → lucide `Search` + shadcn `Button` |
| `src/components/FilterChips.tsx` | 커스텀 버튼 → shadcn `Badge` |
| `src/components/FABMenu.tsx` | SVG → lucide 아이콘 + shadcn `Button` |
| `src/components/SpotCard.tsx` | 카테고리/추천 → `Badge`, 링크 → `Button` |
| `src/app/spot/[id]/page.tsx` | SVG → lucide 아이콘, `Badge` + `Button` 사용 |
| `src/app/admin/login/page.tsx` | 커스텀 input → shadcn `Input` + `Label` + `Button` |
| `src/app/admin/page.tsx` | `Card` + `Badge` + `Button` + `AlertDialog` (삭제 확인) |
| `src/app/admin/components/SpotForm.tsx` | shadcn `Input`/`Label`/`Textarea`/`Checkbox`/`Badge`/`Button` + `toast()` |

---

## 2. Geocoding (Admin 주소 → 좌표 변환)

### 새 파일
- `src/app/api/geocode/route.ts` — 서버 사이드 Geocoding API Route
  - Naver Geocoding REST API 프록시 (Client Secret 보안 유지)
  - `GET /api/geocode?query=주소` → `{ addresses: [...] }` 응답
- `src/hooks/useGeocode.ts` — 디바운스(500ms) 주소 검색 훅

### 수정된 파일
| 파일 | 변경 내용 |
|------|----------|
| `.env.example` | `NAVER_MAP_CLIENT_SECRET` 주석 해제 |
| `src/app/admin/components/SpotForm.tsx` | 주소 검색 UI 통합 (자동완성 드롭다운, 좌표 자동 입력, "좌표 직접 입력" 토글) |

### 환경변수 추가 필요
```bash
# .env.local에 추가
NAVER_MAP_CLIENT_SECRET=your_naver_map_client_secret
```

### NCP 콘솔 필수 설정
- **Geocoding** 서비스 활성화 필요 (Web Dynamic Map 외 추가)

---

## 3. 지도 옵션 & 유형

### 새 파일
- `src/components/Map/MapControls.tsx` — 지도 유형 전환 (일반/위성/혼합/지형) + 현재 위치 버튼

### 수정된 파일
| 파일 | 변경 내용 |
|------|----------|
| `src/types/naver-maps.d.ts` | `MapTypeId`, `Animation`, `ZoomControlStyle`, `SymbolIcon`, `CustomControl` 타입 추가 |
| `src/hooks/useNaverMap.ts` | `mapTypeId`, `tileTransition`(기본 true), `scaleControl` 옵션 추가 |
| `src/components/Map/NaverMap.tsx` | MapControls 통합, marker-config 사용 |

---

## 4. 마커 커스터마이징

### 새 파일
- `src/lib/marker-config.ts` — 마커 설정 시스템
  - 카테고리별 색상 매핑 (짐보관: blue, 샤워실: cyan, 탈의실: violet, 락커: emerald, 카페: amber)
  - `getMarkerIcon()` — HTML 마커 아이콘 생성
  - `createImageMarkerIcon()` — PNG 이미지 마커 지원

### 수정된 파일
| 파일 | 변경 내용 |
|------|----------|
| `src/styles/globals.css` | `.marker-category-*` CSS 클래스 추가 |
| `src/components/Map/NaverMap.tsx` | 인라인 `createMarkerIcon` → `marker-config.ts`의 `getMarkerIcon()` 사용 |

---

## 5. 문서

### 새 파일
- `docs/naver-maps-reference.md` — Naver Maps JavaScript API v3 레퍼런스 (Setup, Map/Marker/Event/Controls, Coordinates, Overlays, Geocoding REST API, Layers)
- `docs/bulk-upload-spec.md` — 벌크 업로드 스펙 문서 (CSV/JSON 포맷, 필드 정의, 유효성 규칙, 에러 처리)
- `docs/changelog-v0.2.md` — 본 문서

---

## 파일 변경 요약

### 새로 생성 (8개 + shadcn UI 14개)
| 파일 | 설명 |
|------|------|
| `src/lib/utils.ts` | cn() 유틸리티 |
| `src/lib/marker-config.ts` | 마커 설정 시스템 |
| `src/app/api/geocode/route.ts` | Geocoding API Route |
| `src/hooks/useGeocode.ts` | 주소 검색 훅 |
| `src/components/Map/MapControls.tsx` | 지도 컨트롤 |
| `src/components/ui/*.tsx` (14개) | shadcn 컴포넌트 |
| `docs/naver-maps-reference.md` | API 레퍼런스 |
| `docs/bulk-upload-spec.md` | 벌크 업로드 스펙 |
| `docs/changelog-v0.2.md` | 변경 이력 |

### 수정 (12개)
| 파일 | 설명 |
|------|------|
| `components.json` | CSS 경로 수정 |
| `src/styles/globals.css` | shadcn 변수 + 마커 CSS |
| `src/app/layout.tsx` | Toaster 추가 |
| `src/types/naver-maps.d.ts` | 타입 확장 |
| `src/hooks/useNaverMap.ts` | 옵션 확장 |
| `src/components/Map/NaverMap.tsx` | MapControls + marker-config |
| `src/components/BottomSheet.tsx` | Sheet 교체 |
| `src/components/Header.tsx` | lucide 아이콘 |
| `src/components/FilterChips.tsx` | Badge 사용 |
| `src/components/FABMenu.tsx` | lucide + Button |
| `src/components/SpotCard.tsx` | Badge + Button |
| `src/app/spot/[id]/page.tsx` | lucide + Badge + Button |
| `src/app/admin/login/page.tsx` | shadcn Input/Label/Button |
| `src/app/admin/page.tsx` | Card/Badge/Button/AlertDialog |
| `src/app/admin/components/SpotForm.tsx` | shadcn 폼 + Geocoding UI |
| `.env.example` | Client Secret 활성화 |
