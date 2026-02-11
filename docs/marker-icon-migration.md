# 마커 아이콘 시스템 마이그레이션

## 개요

현재 CSS 기반 마커(물방울 + 색상 차이)를 **Figma SVG 기반 마커**로 교체한다.
선택된 마커는 다른 SVG 아이콘을 사용하여 시각적으로 구분한다.

## 현재 구조 (AS-IS)

### 마커 종류

| 마커 | 방식 | 클래스 | 크기 | 비고 |
|------|------|--------|------|------|
| 일반 스팟 | CSS HtmlIcon | `.marker-default` | 32x32 | 카테고리별 색상만 다름 |
| 하이라이트 스팟 | CSS HtmlIcon | `.marker-highlight` | 44x44 | amber + pulse 애니메이션 |
| 코스 핀 | CSS HtmlIcon | `.marker-course-pin` | 36x36 | green 고정 |
| 검색 핀 | 인라인 스타일 | - | 28x38 | red 고정 |

### 문제점

- 모든 마커가 동일한 물방울 형태 (카테고리 구분이 색상만으로 약함)
- **선택 상태 시각적 피드백 없음** (클릭해도 마커 외형 변화 없음)
- 카테고리별 아이콘 없음

### 관련 파일

| 파일 | 역할 |
|------|------|
| `src/lib/marker-config.ts` | 마커 설정 함수 (getMarkerIcon, getMarkerConfig 등) |
| `src/styles/globals.css` (L71-157) | 마커 CSS 스타일 (.marker-default, .marker-highlight 등) |
| `src/components/Map/NaverMap.tsx` | 마커 생성/업데이트/이벤트 처리 |
| `src/app/page.tsx` | selection 상태 관리 |

---

## 변경 후 구조 (TO-BE)

### 마커 종류

| 마커 | 방식 | 상태 | 크기 | SVG |
|------|------|------|------|-----|
| 스팟 (러너스팟) | Inline SVG HtmlIcon | 기본 | 디자인에 따름 | `runner-default.svg` |
| 스팟 (러너스팟) | Inline SVG HtmlIcon | 선택 | 디자인에 따름 | `runner-selected.svg` |
| 스팟 (샤워) | Inline SVG HtmlIcon | 기본 | 디자인에 따름 | `shower-default.svg` |
| 스팟 (샤워) | Inline SVG HtmlIcon | 선택 | 디자인에 따름 | `shower-selected.svg` |
| 스팟 (짐보관) | Inline SVG HtmlIcon | 기본 | 디자인에 따름 | `locker-default.svg` |
| 스팟 (짐보관) | Inline SVG HtmlIcon | 선택 | 디자인에 따름 | `locker-selected.svg` |
| 하이라이트 스팟 | Inline SVG HtmlIcon | 기본/선택 | 더 큰 사이즈 | 별도 디자인 or 기본+강조 |
| 코스 핀 | Inline SVG HtmlIcon | 기본 | 디자인에 따름 | `course-pin.svg` |
| 검색 핀 | Inline SVG HtmlIcon | - | 디자인에 따름 | `search-pin.svg` |

### 핵심 변경 사항

1. **CSS 마커 → Inline SVG 문자열 마커**
2. **카테고리별 고유 아이콘** (러너스팟/샤워/짐보관 각각 다른 SVG)
3. **선택 상태 아이콘 분리** (기본 vs 선택)
4. **`is_highlighted`는 유지** (하이라이트 마커도 SVG로 교체)

---

## 구현 상세

### Step 1: Figma SVG 준비

디자이너에게 받아야 할 SVG 목록:

```
카테고리 × 상태 = 최소 6개
├── 러너스팟-default.svg
├── 러너스팟-selected.svg
├── 샤워-default.svg
├── 샤워-selected.svg
├── 짐보관-default.svg
├── 짐보관-selected.svg
│
├── (옵션) highlight-default.svg     ← 하이라이트 스팟용
├── (옵션) highlight-selected.svg
├── (옵션) course-pin.svg            ← 코스 핀용
└── (옵션) search-pin.svg            ← 검색 결과 핀용
```

**SVG 가이드라인 (디자이너에게 전달):**
- viewBox 통일 (예: `0 0 36 44`)
- 기본/선택 SVG는 **같은 viewBox 크기** 유지 (anchor 계산 일관성)
- 불필요한 그룹(`<g>`) 최소화 — 단순할수록 마커 렌더링 성능 좋음
- `fill` 색상이 하드코딩되어 있으면 OK (동적 변경이 필요하면 알려줄 것)

### Step 2: marker-config.ts 리팩터링

```ts
// src/lib/marker-config.ts

import type { Category } from '@/types';

// ─── Figma SVG 문자열 ───────────────────────────────
// Figma에서 Copy as SVG → 여기에 붙여넣기
// 동적으로 바꿀 부분(색상 등)이 있으면 함수 파라미터로 처리

const MARKER_SVGS: Record<Category, { default: string; selected: string }> = {
  러너스팟: {
    default: `<svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="...">
      <!-- Figma에서 복사한 SVG 내용 -->
    </svg>`,
    selected: `<svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="...">
      <!-- Figma에서 복사한 선택 상태 SVG 내용 -->
    </svg>`,
  },
  샤워: {
    default: `<svg>...</svg>`,
    selected: `<svg>...</svg>`,
  },
  짐보관: {
    default: `<svg>...</svg>`,
    selected: `<svg>...</svg>`,
  },
};

// 하이라이트 마커 (is_highlighted=true인 스팟)
const HIGHLIGHT_SVG = {
  default: `<svg>...</svg>`,
  selected: `<svg>...</svg>`,
};

// 코스 핀
const COURSE_PIN_SVG = `<svg>...</svg>`;

// 검색 핀
const SEARCH_PIN_SVG = `<svg>...</svg>`;

// ─── 마커 크기/앵커 설정 ────────────────────────────
// SVG viewBox에 맞춰 설정 (Figma 디자인 확인 후 조정)

interface MarkerSize {
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

const MARKER_SIZES: Record<'default' | 'selected' | 'highlight' | 'course' | 'search', MarkerSize> = {
  default:   { width: 36, height: 44, anchorX: 18, anchorY: 44 },
  selected:  { width: 44, height: 52, anchorX: 22, anchorY: 52 },
  highlight: { width: 44, height: 52, anchorX: 22, anchorY: 52 },
  course:    { width: 36, height: 36, anchorX: 18, anchorY: 36 },
  search:    { width: 28, height: 38, anchorX: 14, anchorY: 34 },
};

// ─── 공개 API ────────────────────────────────────────

/**
 * 스팟 마커 아이콘 반환
 * @param categories - 스팟의 카테고리 배열 (첫 번째 카테고리 사용)
 * @param isHighlighted - 하이라이트 여부
 * @param isSelected - 현재 선택된 마커인지
 */
export function getSpotMarkerIcon(
  categories: string[],
  isHighlighted: boolean,
  isSelected: boolean,
): naver.maps.HtmlIcon {
  // 하이라이트 마커 우선
  if (isHighlighted) {
    const state = isSelected ? 'selected' : 'default';
    const size = MARKER_SIZES.highlight;
    return {
      content: HIGHLIGHT_SVG[state],
      size: new naver.maps.Size(size.width, size.height),
      anchor: new naver.maps.Point(size.anchorX, size.anchorY),
    };
  }

  // 카테고리별 마커
  const category = (categories[0] ?? '러너스팟') as Category;
  const state = isSelected ? 'selected' : 'default';
  const svgSet = MARKER_SVGS[category] ?? MARKER_SVGS['러너스팟'];
  const sizeKey = isSelected ? 'selected' : 'default';
  const size = MARKER_SIZES[sizeKey];

  return {
    content: svgSet[state],
    size: new naver.maps.Size(size.width, size.height),
    anchor: new naver.maps.Point(size.anchorX, size.anchorY),
  };
}

/** 코스 핀 아이콘 */
export function getCoursePinIcon(): naver.maps.HtmlIcon {
  const size = MARKER_SIZES.course;
  return {
    content: COURSE_PIN_SVG,
    size: new naver.maps.Size(size.width, size.height),
    anchor: new naver.maps.Point(size.anchorX, size.anchorY),
  };
}

/** 검색 결과 핀 아이콘 */
export function getSearchPinIcon(): naver.maps.HtmlIcon {
  const size = MARKER_SIZES.search;
  return {
    content: SEARCH_PIN_SVG,
    size: new naver.maps.Size(size.width, size.height),
    anchor: new naver.maps.Point(size.anchorX, size.anchorY),
  };
}
```

**삭제 대상 (더 이상 불필요):**
- `CATEGORY_COLORS`, `CATEGORY_CSS_CLASSES`, `DEFAULT_COLOR`, `HIGHLIGHT_COLOR`
- `getCategoryColor()`, `getCategoryCssClass()`
- `getMarkerConfig()`, `MarkerConfig` 인터페이스
- `createImageMarkerIcon()` (미사용 함수)

### Step 3: NaverMap.tsx 수정

주요 변경점: `selection` 상태에 따라 마커 아이콘을 동적으로 교체

```tsx
// src/components/Map/NaverMap.tsx

import { getSpotMarkerIcon, getCoursePinIcon, getSearchPinIcon } from '@/lib/marker-config';

// ─── 변경 1: createMarkerIcon에 isSelected 파라미터 추가 ───

const createMarkerIcon = useCallback(
  (spot: Spot, isSelected: boolean) => {
    return getSpotMarkerIcon(spot.categories, spot.is_highlighted, isSelected);
  },
  [],
);

// ─── 변경 2: 마커 생성/업데이트 시 선택 상태 반영 ───

// 기존: spots만 dependency
// 변경: spots + selection 모두 dependency
useEffect(() => {
  if (!isReady || !map) return;

  const selectedSpotId =
    selection?.type === 'spot' ? selection.data.id : null;

  // ... (마커 제거 로직 동일)

  spots.forEach((spot) => {
    const isSelected = spot.id === selectedSpotId;
    const existing = existingMarkers.get(spot.id);

    if (existing) {
      existing.setPosition(new naver.maps.LatLng(spot.latitude, spot.longitude));
      existing.setIcon(createMarkerIcon(spot, isSelected));
      existing.setZIndex(isSelected ? 200 : spot.is_highlighted ? 100 : 1);
    } else {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(spot.latitude, spot.longitude),
        map,
        icon: createMarkerIcon(spot, isSelected),
        zIndex: isSelected ? 200 : spot.is_highlighted ? 100 : 1,
      });

      naver.maps.Event.addListener(marker, 'click', () => {
        onMarkerClick(spot);
      });

      existingMarkers.set(spot.id, marker);
    }
  });
}, [isReady, map, spots, selection, createMarkerIcon, onMarkerClick]);
//                        ^^^^^^^^^ 추가

// ─── 변경 3: 검색 핀도 SVG로 교체 ───

searchPinRef.current = new naver.maps.Marker({
  position,
  map,
  icon: getSearchPinIcon(),  // 인라인 스타일 → 함수 호출
  zIndex: 200,
});
```

**성능 고려사항:**

`selection`이 dependency에 추가되면 선택할 때마다 모든 마커의 아이콘이 재설정된다.
이를 최적화하려면 **선택 변경 시 이전/현재 마커만 업데이트**하는 별도 effect를 분리:

```tsx
// 최적화: 선택 상태 변경 시 해당 마커만 아이콘 교체
const prevSelectionRef = useRef<string | null>(null);

useEffect(() => {
  if (!isReady || !map) return;

  const selectedSpotId =
    selection?.type === 'spot' ? selection.data.id : null;
  const prevId = prevSelectionRef.current;

  // 이전 선택 마커 → 기본 아이콘으로 복원
  if (prevId && prevId !== selectedSpotId) {
    const prevMarker = markersRef.current.get(prevId);
    const prevSpot = spots.find((s) => s.id === prevId);
    if (prevMarker && prevSpot) {
      prevMarker.setIcon(createMarkerIcon(prevSpot, false));
      prevMarker.setZIndex(prevSpot.is_highlighted ? 100 : 1);
    }
  }

  // 현재 선택 마커 → 선택 아이콘으로 변경
  if (selectedSpotId) {
    const currentMarker = markersRef.current.get(selectedSpotId);
    const currentSpot = spots.find((s) => s.id === selectedSpotId);
    if (currentMarker && currentSpot) {
      currentMarker.setIcon(createMarkerIcon(currentSpot, true));
      currentMarker.setZIndex(200);
    }
  }

  prevSelectionRef.current = selectedSpotId;
}, [isReady, map, selection, spots, createMarkerIcon]);
```

이렇게 하면 선택 변경 시 **최대 2개 마커만 아이콘 교체** (이전 + 현재).

### Step 4: globals.css 정리

**삭제할 CSS (L71-157):**
- `.marker-default`, `.marker-default::after`
- `.marker-highlight`, `.marker-highlight::after`
- `.marker-category-runner`, `.marker-category-shower`, `.marker-category-locker`
- `.marker-course-pin`, `.marker-course-pin::after`
- `@keyframes marker-pulse`

SVG 마커로 전환하면 이 CSS들은 전부 불필요해진다.

### Step 5: Spot 상세 페이지 카테고리 색상

`spot/[id]/page.tsx`와 `DrawerSpotDetail.tsx`에 있는 카테고리별 Tailwind 클래스 매핑은 **마커와 무관**하므로 그대로 유지:

```ts
// 이건 Badge 스타일이라 변경 불필요
const categoryStyles: Record<string, string> = {
  러너스팟: 'bg-blue-50 text-blue-700 border-blue-200',
  샤워: 'bg-slate-50 text-slate-700 border-slate-200',
  짐보관: 'bg-gray-50 text-gray-700 border-gray-200',
};
```

---

## 수정 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/marker-config.ts` | **전면 리팩터링** — SVG 문자열 기반으로 교체 |
| `src/components/Map/NaverMap.tsx` | selection 기반 아이콘 교체 로직 추가 |
| `src/styles/globals.css` | 마커 관련 CSS 전부 삭제 (L71-157) |

## 변경하지 않는 파일

| 파일 | 이유 |
|------|------|
| `src/types/index.ts` | Category 타입, Spot 인터페이스 변경 없음 |
| `src/app/page.tsx` | selection 상태 관리 로직 변경 없음 |
| `src/app/spot/[id]/page.tsx` | 카테고리 Badge 스타일은 마커와 무관 |
| `src/components/BottomDrawer/*` | Drawer 로직 변경 없음 |

---

## Figma → 코드 작업 흐름

```
1. 디자이너: Figma에서 마커 SVG 완성
2. 개발자: 마커 선택 → Copy as SVG
3. 개발자: marker-config.ts의 MARKER_SVGS에 문자열로 붙여넣기
4. 개발자: viewBox 크기 확인 → MARKER_SIZES 조정
5. 테스트: 지도에서 마커 표시 + 클릭 시 선택 아이콘 전환 확인
```

**디자이너가 SVG를 수정할 경우:**
해당 카테고리/상태의 SVG 문자열만 교체하면 됨. 다른 파일 수정 불필요.

---

## 디자이너에게 요청할 체크리스트

- [ ] 카테고리별 기본 마커 SVG (러너스팟, 샤워, 짐보관) × 3
- [ ] 카테고리별 선택 마커 SVG (러너스팟, 샤워, 짐보관) × 3
- [ ] 하이라이트 마커 SVG (기본 + 선택) × 2 (옵션 — 기본 마커에 강조 효과로 대체 가능)
- [ ] 코스 핀 SVG × 1 (옵션)
- [ ] 검색 핀 SVG × 1 (옵션)
- [ ] 모든 SVG의 viewBox 크기 통일
- [ ] 기본/선택 쌍은 같은 viewBox 유지
