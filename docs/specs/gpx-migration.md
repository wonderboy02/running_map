# GPX 기반 코스 렌더링 마이그레이션

> **Status**: Draft
> **목표**: GroundOverlay(PNG/WebP 비트맵) → Data Layer `addGpx()`(GPX 벡터) 전환

## 1. 배경 및 동기

### 현재 방식 (GroundOverlay)

코스를 PNG/WebP 이미지로 만들어 `naver.maps.GroundOverlay`로 지도에 깔아서 렌더링한다.

**문제점:**

- 줌 확대 시 비트맵이 뭉개짐 (래스터 한계)
- 선 두께 조절 불가 — 줌 레벨에 관계없이 고정된 이미지
- 코스 등록 워크플로우가 복잡 — 이미지 제작 + NW/SE 좌표 수동 입력 + highlight 이미지 별도 제작
- Storage 용량 소모 (코스당 이미지 2장: default + highlight)

### 목표 방식 (GPX + Data Layer)

GPX 파일을 업로드하여 Storage에 저장하고, `naver.maps.Data`의 `addGpx()` 메서드로 벡터 렌더링한다.

**`addGpx()`가 하는 일:**
- GPX XML을 내부적으로 GeoJSON으로 변환
- 트랙/루트를 `Data.Feature` 객체로 자동 생성
- 지도 위에 벡터 렌더링 (별도 파싱 모듈 불필요)

**장점:**

- 선명한 벡터 렌더링 (어떤 줌에서든 깨끗)
- 줌 레벨에 따른 동적 선 두께 조절 가능 (`setStyle` + `StylingFunction`)
- Admin 워크플로우 간소화 — GPX 업로드만으로 코스 등록
- 선택/하이라이트를 이미지 교체 대신 `overrideStyle()` / `revertStyle()`로 처리
- GPX 파싱 라이브러리 불필요 — 네이버 지도 SDK가 내장 처리

---

## 2. `naver.maps.Data` API 요약

### 핵심 메서드

| 메서드 | 설명 |
|--------|------|
| `map.data.addGpx(xmlDoc, autoStyle?)` | GPX XML → GeoJSON 변환 → Feature 배열 반환 |
| `map.data.setStyle(styleOrFn)` | 전체 Feature 스타일 지정 (객체 or `StylingFunction`) |
| `map.data.overrideStyle(feature, style)` | 특정 Feature만 스타일 오버라이드 (선택/하이라이트) |
| `map.data.revertStyle(feature?)` | 오버라이드 해제, 원래 스타일로 복원 |
| `map.data.forEach(callback)` | 모든 Feature 순회 |
| `map.data.getFeatureById(id)` | ID로 Feature 조회 |
| `map.data.removeFeature(feature)` | Feature 제거 |

### StyleOptions 속성

| 속성 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `strokeColor` | string | `'#000'` | 선 색상 (CSS) |
| `strokeWeight` | number | `3` | 선 두께 |
| `strokeOpacity` | number | `0.8` | 선 투명도 (0~1) |
| `fillColor` | string | `'#000'` | 채우기 색상 |
| `fillOpacity` | number | `0.3` | 채우기 투명도 |
| `clickable` | boolean | `true` | 클릭 이벤트 활성화 |
| `visible` | boolean | `true` | 표시 여부 |
| `zIndex` | number | — | 쌓임 순서 |

### StylingFunction

```typescript
// Feature별 동적 스타일 — zoom 레벨이나 선택 상태에 따라 분기 가능
map.data.setStyle((feature: naver.maps.Data.Feature) => {
  const color = feature.getProperty('color') || '#4A90D9';
  return {
    strokeColor: color,
    strokeWeight: 4,
    strokeOpacity: 0.8,
  };
});
```

### 이벤트

`click`, `mouseover`, `mouseout`, `addfeature`, `removefeature` 등 지원.

---

## 3. 영향받는 파일 (현재 시스템)

### 타입

| 파일 | 영향 |
|------|------|
| `src/types/index.ts` | `Course` 인터페이스 변경 |
| `src/types/naver-maps.d.ts` | `Data`, `Data.Feature`, `Data.StyleOptions` 타입 추가 |

### 프론트엔드 렌더링

| 파일 | 영향 |
|------|------|
| `src/components/Map/NaverMap.tsx` | GroundOverlay → Data Layer 렌더링 전환 |
| `src/components/BottomDrawer/DrawerCourseDetail.tsx` | (미미) 코스 상세 표시 |

### Admin

| 파일 | 영향 |
|------|------|
| `src/app/admin/courses/page.tsx` | 이미지 업로드 → GPX 업로드 UI 전환 |
| `src/app/admin/components/PinpointPicker.tsx` | GroundOverlay 미리보기 → Data Layer GPX 미리보기 |

### API / 서버

| 파일 | 영향 |
|------|------|
| `src/app/api/admin/courses/route.ts` | 이미지 처리 → GPX Storage 저장 |
| `src/app/api/admin/courses/bulk/route.ts` | 일괄 업로드 로직 변경 |

### 데이터 / 훅

| 파일 | 영향 |
|------|------|
| `src/hooks/useCourses.ts` | (미미) 타입만 변경 |
| `supabase/migrations/` | 새 마이그레이션 SQL 추가 |

---

## 4. DB 스키마 마이그레이션

### 새 컬럼 추가

```sql
-- supabase/migrations/015_course_gpx_migration.sql
BEGIN;

-- 폴리라인 스타일
ALTER TABLE courses ADD COLUMN stroke_color TEXT NOT NULL DEFAULT '#4A90D9';
ALTER TABLE courses ADD COLUMN stroke_opacity DOUBLE PRECISION NOT NULL DEFAULT 0.8;

-- GPX 원본 파일 URL (Storage) — 클라이언트에서 fetch하여 addGpx()에 전달
ALTER TABLE courses ADD COLUMN gpx_file_url TEXT;

COMMIT;
```

> **`route_path` JSONB 컬럼이 불필요한 이유:**
> `addGpx()`가 GPX XML을 직접 파싱하므로, 서버에서 좌표를 추출하여 DB에 저장할 필요가 없다.
> 클라이언트가 `gpx_file_url`에서 GPX 파일을 fetch → `addGpx()`에 전달하면 끝.

### 데이터 마이그레이션 전략

1. **Phase 1 (이 마이그레이션)**: 새 컬럼 추가, `gpx_file_url`은 nullable
2. **Phase 2 (운영 중)**: 기존 코스를 GPX로 전환 (아래 상세 절차)
3. **Phase 3 (전환 완료 후)**: 아래 "정리/클린업" 단계에서 구 컬럼 제거

### 렌더링 분기 (전환 기간)

```
gpx_file_url 있음 → Data Layer (addGpx) 렌더링
gpx_file_url 없음 → GroundOverlay 렌더링 (기존 방식 유지)
```

이 분기를 통해 기존 코스와 신규 코스가 공존할 수 있다.

### Phase 2: 기존 PNG 코스 → GPX 전환 절차

기존 코스는 이미지 기반이므로 GPX 파일을 별도로 준비해야 한다.

#### GPX 파일 확보 방법

| 방법 | 설명 |
|------|------|
| **러닝 앱에서 추출** | Strava, Nike Run Club, Garmin Connect 등에서 해당 코스를 달린 기록을 GPX로 내보내기 |
| **GPX 편집 도구** | [gpx.studio](https://gpx.studio) 같은 웹 툴에서 기존 코스 이미지를 참고하여 경로를 직접 그리기 |
| **수동 변환** | 기존 이미지의 경로를 따라 지도 위에 포인트를 찍어 GPX 생성 |

#### 코스별 전환 절차 (Admin 작업)

```
1. Admin 코스 목록에서 전환할 코스의 "수정" 클릭
2. 기존 정보(이름, 설명, 난이도 등)는 유지된 상태로 열림
3. "GPX 파일" 입력란에 준비한 .gpx 파일 업로드
4. 미리보기에서 경로가 기존 이미지와 일치하는지 확인
5. 선 색상, 투명도 조절
6. 저장 → gpx_file_url이 DB에 기록됨
7. 프론트엔드에서 자동으로 GroundOverlay 대신 Data Layer로 렌더링
```

- 기존 이미지(`image_url`, `highlight_image_url`)는 **즉시 삭제하지 않음** — Phase 3까지 보관
- GPX 업로드 후에도 롤백 가능: Admin에서 `gpx_file_url`을 제거하면 다시 GroundOverlay로 렌더링
- 모든 코스가 전환 완료되면 Phase 3 진행

---

## 5. 타입 변경

### Course 인터페이스

```typescript
// src/types/index.ts
export interface Course {
  id: string;
  name: string;

  // === 기존 (GroundOverlay용, Phase 3에서 제거) ===
  image_url: string;
  highlight_image_url: string | null;
  nw_lat: number;
  nw_lng: number;
  se_lat: number;
  se_lng: number;
  opacity: number;

  // === 신규 (Data Layer용) ===
  stroke_color: string;                   // 예: '#4A90D9'
  stroke_opacity: number;                 // 0.0 ~ 1.0
  gpx_file_url: string | null;           // Storage에 저장된 GPX 원본 URL

  // === 유지 ===
  is_active: boolean;
  description: string | null;
  difficulty: number | null;
  distance_km: number | null;
  pinpoints: CoursePinpoint[];
  search_tags: string[];
  created_at: string;
  updated_at: string;
}
```

### naver-maps.d.ts — Data Layer 타입 추가

```typescript
// src/types/naver-maps.d.ts — naver.maps namespace 내부에 추가

namespace Data {
  interface StyleOptions {
    strokeColor?: string;
    strokeWeight?: number;
    strokeOpacity?: number;
    fillColor?: string;
    fillOpacity?: number;
    clickable?: boolean;
    visible?: boolean;
    zIndex?: number;
    icon?: string | ImageIcon | HtmlIcon;
    title?: string | null;
    shape?: MarkerShape;
  }

  type StylingFunction = (feature: Feature) => StyleOptions;

  class Feature {
    getId(): string | number;
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
    getGeometry(): unknown;
  }
}

class Data {
  addGpx(xmlDoc: Document, autoStyle?: boolean): Data.Feature[];
  addGeoJson(geojson: object, autoStyle?: boolean): Data.Feature[];
  addKml(xmlDoc: Document, autoStyle?: boolean): Data.Feature[];
  addFeature(feature: Data.Feature, autoStyle?: boolean): Data.Feature;
  removeFeature(feature: Data.Feature): void;
  getAllFeature(): Data.Feature[];
  getFeatureById(id: string | number): Data.Feature | null;
  forEach(callback: (info: { feature: Data.Feature; index: number }) => void): void;

  setStyle(style: Data.StyleOptions | Data.StylingFunction): void;
  getStyle(): Data.StyleOptions | Data.StylingFunction;
  overrideStyle(feature: Data.Feature, style: Data.StyleOptions): void;
  revertStyle(feature?: Data.Feature): void;

  setMap(map: Map | null): void;
  getMap(): Map | null;
  toGeoJson(): object;
}

// Map 클래스에 data 프로퍼티 추가 필요
// (기존 Map 인터페이스에 `data: Data;` 추가)
```

---

## 6. GPX 파일 흐름

### 서버사이드 (API Route)

```
Admin이 GPX 파일 업로드
  → API Route에서 파일 검증 (확장자 .gpx, Content-Type)
  → Supabase Storage에 원본 GPX 그대로 업로드 (courses 버킷)
  → gpx_file_url을 DB에 저장
```

**서버에서 GPX 파싱이 필요 없다** — `addGpx()`가 클라이언트에서 처리.

단, **NW/SE bounding box 자동 계산이 필요한 경우** (fitBounds용):
- 옵션 A: 서버에서 간단히 파싱하여 `nw/se` 좌표 계산 후 DB 저장
- 옵션 B: 클라이언트에서 `addGpx()` 후 Feature의 bounds를 읽어 사용 (DB 저장 불필요)
- **권장: 옵션 B** — DB에 bounds를 저장하지 않고, `addGpx()` 결과에서 동적으로 계산

### 클라이언트사이드 (NaverMap.tsx)

```
useCourses()로 코스 목록 로드 (gpx_file_url 포함)
  → gpx_file_url이 있는 코스:
    fetch(gpx_file_url) → XMLDocument로 파싱
    → map.data.addGpx(xmlDoc) → Feature[] 반환
    → Feature에 courseId property 저장 (선택/스타일링용)
    → setStyle(StylingFunction)으로 stroke_color, stroke_opacity 적용
  → gpx_file_url이 없는 코스:
    기존 GroundOverlay 방식 유지
```

---

## 7. Admin UI 변경

### 신규 코스 등록 워크플로우

```
Admin이 "코스 추가" 클릭
  ┌─────────────────────────────────────────────────┐
  │  코스 추가                                       │
  │                                                  │
  │  코스명: [___________________]                    │
  │  설명:   [___________________]                    │
  │  거리:   [__] km    난이도: [__] /10              │
  │                                                  │
  │  ── GPX 파일 ──────────────────────────────────  │
  │  [📂 .gpx 파일 선택]  seorak-trail.gpx ✓        │
  │                                                  │
  │  ── 미리보기 (지도) ───────────────────────────  │
  │  ┌──────────────────────────────────────┐        │
  │  │  🗺️ GPX 경로가 지도 위에 표시됨       │        │
  │  │  (addGpx 기반, fitBounds 자동 적용)   │        │
  │  │  📍 핀포인트 클릭하여 배치 가능        │        │
  │  └──────────────────────────────────────┘        │
  │                                                  │
  │  ── 스타일 ────────────────────────────────────  │
  │  선 색상:  [🔵][🔴][🟢][🟠][🟣][🩵] ← 팔레트   │
  │  투명도:   ═══════●══ 80%                        │
  │                                                  │
  │  검색 태그: [___________________]                 │
  │  ☑ 활성화                                        │
  │                                                  │
  │  [취소]                          [저장]           │
  └─────────────────────────────────────────────────┘
```

1. 코스명, 설명, 거리, 난이도 입력
2. **GPX 파일 선택** (`.gpx` 확장자만 허용, required)
3. 파일 선택 즉시 → 클라이언트에서 `FileReader` → `DOMParser` → 미리보기 지도에 `addGpx()` 렌더링
4. 미리보기 지도에서 핀포인트 배치 (PinpointPicker)
5. 선 색상 팔레트에서 선택 (기본값: `#4A90D9`)
6. 투명도 슬라이더 조절 (기본값: 0.8)
7. 저장 → API에 FormData 전송 (GPX 파일 + 메타데이터)

### 기존 코스 수정 워크플로우 (전환 기간)

기존 PNG 코스를 수정할 때, 폼은 **코스의 상태에 따라 다른 필드를 표시**한다.

#### Case A: 아직 PNG 상태인 코스 (`gpx_file_url` 없음)

```
┌─────────────────────────────────────────────────┐
│  코스 수정 — "여의도 한강 코스"                   │
│                                                  │
│  코스명: [여의도 한강 코스_________]               │
│  설명:   [한강 따라 달리는 코스____]               │
│  ...                                             │
│                                                  │
│  ── 현재: 이미지 기반 (레거시) ──────────────────  │
│  🖼️ 기존 오버레이 이미지 미리보기                  │
│  ⚠️ GPX로 전환하려면 아래에서 GPX 파일을 업로드    │
│                                                  │
│  ── GPX 파일 (선택) ─────────────────────────────  │
│  [📂 .gpx 파일 선택]  ← 업로드 시 GPX로 전환됨    │
│                                                  │
│  ── 레거시 필드 (GPX 전환 시 자동 비활성화) ─────  │
│  NW 좌표: [37.5xxx] [126.9xxx]  (읽기 전용)       │
│  SE 좌표: [37.5xxx] [126.9xxx]  (읽기 전용)       │
│  투명도: ═══════●══ (읽기 전용)                    │
│                                                  │
│  [취소]                          [저장]           │
└─────────────────────────────────────────────────┘
```

- 기존 이미지/좌표/투명도 필드는 **읽기 전용으로 표시** (수정 불가)
- GPX 파일을 업로드하면 → 스타일 필드(색상, 투명도)가 활성화되고, 레거시 필드는 숨김 처리
- 이미지 업로드 필드는 제거 (신규 이미지 추가 불가)

#### Case B: 이미 GPX 전환된 코스 (`gpx_file_url` 있음)

```
┌─────────────────────────────────────────────────┐
│  코스 수정 — "북악산 둘레길"                      │
│                                                  │
│  코스명: [북악산 둘레길___________]                │
│  ...                                             │
│                                                  │
│  ── GPX 파일 ──────────────────────────────────  │
│  현재: bukak-trail.gpx                            │
│  [📂 새 GPX로 교체]  ← 선택 시 기존 파일 대체     │
│                                                  │
│  ── 미리보기 + 핀포인트 ─────────────────────────  │
│  ┌──────────────────────────────────────┐        │
│  │  🗺️ 기존 GPX 경로 표시               │        │
│  └──────────────────────────────────────┘        │
│                                                  │
│  ── 스타일 ────────────────────────────────────  │
│  선 색상:  [🔵][🔴][🟢][🟠][🟣][🩵]             │
│  투명도:   ═══════●══ 80%                        │
│                                                  │
│  [취소]                          [저장]           │
└─────────────────────────────────────────────────┘
```

- 기존 GPX 경로를 미리보기에 표시 (기존 `gpx_file_url`에서 fetch)
- GPX 파일 미첨부 시 기존 파일 유지
- 새 GPX 첨부 시 기존 파일 교체
- 레거시 필드(이미지, NW/SE, opacity)는 표시하지 않음

### 코스 목록 카드 변경

현재 코스 목록 카드는 이미지 썸네일, NW/SE 좌표, 투명도, ImageMeta 등을 표시한다.
GPX 코스에서는 이 정보들이 달라지므로 **카드 UI를 분기**해야 한다.

#### 현재 카드 레이아웃

```
[🖼️ 썸네일] | 코스명   [활성] | [끄기] [✏️] [🗑️]
              | 5km · 난이도 7/10
              | NW(37.5xxx, 126.9xxx) → SE(37.5xxx, 126.9xxx) · 투명도 100%
              | 📐 1200x800 WebP 245KB
```

#### GPX 코스 카드 레이아웃

```
[🗺️ GPX]    | 코스명   [활성] | [끄기] [✏️] [🗑️]
              | 5km · 난이도 7/10
              | 🎨 #4A90D9 · 투명도 80%
```

| 항목 | PNG 코스 (레거시) | GPX 코스 |
|------|-------------------|----------|
| **썸네일** | `image_url` 이미지 | GPX 아이콘 또는 `stroke_color` 색상 칩 |
| **좌표 정보** | NW/SE 좌표 표시 | 표시 안 함 (bounds가 DB에 없음) |
| **투명도** | `opacity` 백분율 | `stroke_opacity` 백분율 |
| **ImageMeta** | 이미지 크기/포맷 | 표시 안 함 |
| **색상** | 없음 | `stroke_color` 칩 표시 |

#### 수정 다이얼로그 상태 관리

현재 `openEditDialog`에서 설정하는 상태들의 변경:

| 상태 | PNG 코스 | GPX 코스 |
|------|---------|----------|
| `imagePreview` | `course.image_url` | `null` (표시 안 함) |
| `highlightPreview` | `course.highlight_image_url` | `null` (표시 안 함) |
| `removeHighlight` | 체크박스 표시 | 표시 안 함 |
| `gpxPreviewUrl` (신규) | `null` | `course.gpx_file_url` |

전환 기간 중 `openEditDialog`는 `course.gpx_file_url` 유무로 분기한다:

```typescript
function openEditDialog(course: Course) {
  const isGpx = !!course.gpx_file_url;

  setForm({
    name: course.name,
    description: course.description || '',
    difficulty: course.difficulty ?? '',
    distance_km: course.distance_km ?? '',
    pinpoints: course.pinpoints ?? [],
    search_tags: course.search_tags ?? [],
    is_active: course.is_active,

    // GPX 코스: 스타일 필드 활성화
    gpx_file: null,  // 새 파일 없음 (기존 유지)
    stroke_color: course.stroke_color,
    stroke_opacity: course.stroke_opacity,
  });

  // PNG 코스: 레거시 프리뷰
  setImagePreview(isGpx ? null : course.image_url);
  setHighlightPreview(isGpx ? null : course.highlight_image_url);
  setRemoveHighlight(false);

  // GPX 코스: GPX 프리뷰
  setGpxPreviewUrl(isGpx ? course.gpx_file_url : null);

  setDialogOpen(true);
}
```

### 코스 등록/수정 폼 — 필드 변경 요약

| 항목 | 현재 | 변경 후 |
|------|------|---------|
| **코스 이미지** | 이미지 파일 업로드 (required) | GPX 파일 업로드 (required for 신규) |
| **하이라이트 이미지** | 이미지 파일 업로드 (optional) | 제거 |
| **NW/SE 좌표** | 수동 입력 (geocode 검색) | 제거 (addGpx가 bounds 자동 처리) |
| **투명도(opacity)** | 슬라이더 | 선 투명도(`stroke_opacity`) 슬라이더로 대체 |
| **선 색상** | 없음 | 색상 선택기 추가 (`stroke_color`) |
| **미리보기** | PinpointPicker 내 GroundOverlay | `addGpx()` 기반 GPX 미리보기 |

#### CourseForm 인터페이스 변경

```typescript
interface CourseForm {
  name: string;
  description: string;
  difficulty: number | '';
  distance_km: number | '';
  pinpoints: CoursePinpoint[];
  search_tags: string[];
  is_active: boolean;

  // === 제거 ===
  // image: File | null;
  // highlight_image: File | null;
  // nw_lat: number; nw_lng: number;
  // se_lat: number; se_lng: number;
  // opacity: number;

  // === 추가 ===
  gpx_file: File | null;
  stroke_color: string;
  stroke_opacity: number;
}
```

#### 색상 선택기

미리 정의된 팔레트(6~8색)에서 선택하는 방식. 커스텀 입력도 허용.

```
추천 팔레트: #4A90D9 (파랑), #E74C3C (빨강), #2ECC71 (초록),
            #F39C12 (주황), #9B59B6 (보라), #1ABC9C (청록)
```

### PinpointPicker 변경

- GroundOverlay 대신 `addGpx()`로 코스 경로를 미리보기
- props에서 `overlayImageUrl`, `bounds`, `opacity` → `gpxFile: File | string` (File = 새 업로드, string = 기존 URL)
- 내부에서 별도 `naver.maps.Data` 인스턴스를 생성하여 미리보기 지도에 GPX 렌더링
- GPX 로드 후 Feature bounds로 자동 fitBounds
- 기존 핀포인트 배치 기능은 유지

### 일괄 업로드 (BulkUploadDialog)

- 파일명 파싱 규칙 변경: `{이름}.gpx` (NW/SE 좌표 자동 계산이므로 파일명에서 좌표 파싱 불필요)
- 하이라이트 이미지 매칭 로직 제거

---

## 8. API Route 변경

### POST (코스 생성) — `route.ts`

```
현재 흐름:
  FormData에서 image + highlight_image 추출
  → convertAndUpload()로 WebP 변환 + Storage 업로드
  → NW/SE 좌표와 함께 DB insert

변경 후 흐름:
  FormData에서 gpx_file 추출
  → 파일 검증 (확장자 .gpx, 크기 제한)
  → GPX 원본을 Storage에 업로드 (courses 버킷, courses/{uuid}.gpx)
  → gpx_file_url + stroke_color + stroke_opacity DB insert
  → (NW/SE 좌표는 저장하지 않음 — 클라이언트에서 addGpx 후 동적 계산)
```

### PATCH (코스 수정) — `route.ts`

전환 기간에는 PNG 코스와 GPX 코스 **모두** PATCH가 동작해야 한다.

| 시나리오 | 동작 |
|---------|------|
| **GPX 파일 새로 첨부** | 기존 GPX Storage 파일 삭제 → 새 파일 업로드 → `gpx_file_url` 갱신 |
| **GPX 없이 스타일만 변경** | `stroke_color`, `stroke_opacity` 업데이트 |
| **PNG 코스에 GPX 첨부 (전환)** | GPX 업로드 → `gpx_file_url` 저장 → 프론트에서 자동으로 Data Layer 렌더링 전환 |
| **PNG 코스의 기존 필드 수정** (전환 전) | `name`, `description`, `difficulty`, `distance_km`, `pinpoints`, `search_tags`, `is_active`, `toggle_active` 등은 **GPX 여부와 무관하게 동작 유지** |
| **레거시 이미지/좌표 수정** | 전환 기간에는 **불허** — 이미지 업로드 필드가 Admin UI에서 제거되므로 요청 자체가 오지 않음 |

기존 PATCH 핸들러의 `name`, `description`, `difficulty`, `distance_km`, `pinpoints`, `search_tags`, `is_active`, `toggle_active` 처리 로직은 **변경 없이 유지**하고, GPX 관련 필드(`gpx_file`, `stroke_color`, `stroke_opacity`)만 추가한다.

### DELETE (코스 삭제) — `route.ts`

- 기존: `image_url`, `highlight_image_url` Storage 삭제
- 변경: `image_url`, `highlight_image_url`, `gpx_file_url` 중 존재하는 것 모두 Storage 삭제

### Storage 버킷

- 기존 `courses` 버킷을 그대로 사용
- GPX 파일은 `.gpx` 확장자로 저장 (WebP 변환 불필요)
- 경로 패턴: `courses/{uuid}.gpx`

---

## 9. NaverMap 렌더링 변경

### 아키텍처: 코스별 독립 Data 인스턴스

`map.data`는 맵당 하나의 글로벌 Data Layer이므로, 코스별 독립 제어(표시/숨김, 개별 제거)가 어렵다.
**코스마다 별도의 `naver.maps.Data` 인스턴스를 생성**하여 관리한다.

```typescript
// 새로운 ref
const courseDataLayersRef = useRef<Map<string, {
  data: naver.maps.Data;
  features: naver.maps.Data.Feature[];
}>>(new Map());
```

### GPX 로딩 + 렌더링 흐름

```typescript
// 1. GPX 파일 fetch → XML 파싱
const response = await fetch(rewriteStorageUrl(course.gpx_file_url));
const text = await response.text();
const parser = new DOMParser();
const xmlDoc = parser.parseFromString(text, 'text/xml');

// 2. 코스 전용 Data 인스턴스 생성 + GPX 추가
const dataLayer = new naver.maps.Data();
const features = dataLayer.addGpx(xmlDoc);

// 3. 스타일 설정
dataLayer.setStyle({
  strokeColor: course.stroke_color,
  strokeWeight: getStrokeWeight(map.getZoom()),
  strokeOpacity: course.stroke_opacity,
  clickable: false,
});

// 4. 지도에 연결
dataLayer.setMap(showCourses ? map : null);
```

### 렌더링 분기 (전환 기간)

```typescript
courses.forEach((course) => {
  if (course.gpx_file_url) {
    // === Data Layer (addGpx) 렌더링 ===
    loadAndRenderGpx(course);
    // 기존 GroundOverlay가 있으면 제거
    removeGroundOverlay(course.id);
  } else {
    // === GroundOverlay 렌더링 (기존 방식) ===
    renderGroundOverlay(course, isSelected, showCourses);
  }
});
```

### 줌 연동 선 두께

줌 레벨에 따라 선 두께를 동적 조절한다.

```typescript
function getStrokeWeight(zoom: number, isSelected: boolean = false): number {
  const base = Math.max(1, Math.round(Math.pow(2, (zoom - 13) / 2 + 1)));
  return isSelected ? base + 2 : base;
}
```

줌 변경 시 모든 Data Layer의 `setStyle()`을 재호출한다.
기존 `idle` 이벤트 리스너(캡션 충돌 재계산)에 함께 묶는다.

```typescript
naver.maps.Event.addListener(map, 'idle', () => {
  recalcCaptions();
  updateGpxStrokeWeights(); // 줌에 따른 선 두께 갱신
});
```

### 선택/하이라이트

| 항목 | 기존 (GroundOverlay) | 변경 (Data Layer) |
|------|---------------------|-------------------|
| 기본 상태 | `image_url` 이미지 | `setStyle()` — `stroke_color`, `stroke_opacity` |
| 선택 상태 | `highlight_image_url`로 이미지 교체 | `overrideStyle()` — 하이라이트 색상 + 두께 증가 |
| 선택 해제 | `setUrl(image_url)` | `revertStyle()` — 원래 스타일로 즉시 복원 |
| 최상위 표시 | `setMap(null)` → `setMap(map)` 재추가 | `zIndex`로 직접 제어 |

```typescript
// 선택 시
function highlightCourse(courseId: string) {
  const layer = courseDataLayersRef.current.get(courseId);
  if (!layer) return;

  layer.features.forEach((feature) => {
    layer.data.overrideStyle(feature, {
      strokeColor: HIGHLIGHT_COLOR,
      strokeWeight: getStrokeWeight(map.getZoom(), true),
      strokeOpacity: 1.0,
      zIndex: 100,
    });
  });
}

// 선택 해제
function unhighlightCourse(courseId: string) {
  const layer = courseDataLayersRef.current.get(courseId);
  if (!layer) return;

  layer.features.forEach((feature) => {
    layer.data.revertStyle(feature);
  });
}
```

### 가시성 토글 (showCourses)

```typescript
// Data Layer: setMap으로 일괄 토글
courseDataLayersRef.current.forEach(({ data }) => {
  data.setMap(showCourses ? map : null);
});
```

### 코스 선택 시 fitBounds

`gpx_file_url`이 있는 코스는 `nw/se` DB 값 대신, Data Feature에서 bounds를 계산한다.

```typescript
// Data Layer의 Feature에서 bounds 계산
const layer = courseDataLayersRef.current.get(course.id);
if (layer) {
  // toGeoJson() → coordinates에서 min/max 계산
  // 또는 모든 feature의 geometry에서 bounds 추출
}
```

기존 `nw/se` 기반 fitBounds는 GroundOverlay 코스에 대해 유지.

---

## 10. 코스 핀 마커 (pinpoints) — 변경 없음

코스 핀포인트(`pinpoints`)는 코스 경로 위의 **대표 위치 마커**로, GroundOverlay/Data Layer와는 독립적으로 동작한다.
GPX 마이그레이션 후에도 기존 핀포인트 시스템은 그대로 유지한다.

- PinpointPicker에서 핀 배치 UI만 GroundOverlay → Data Layer GPX 미리보기로 변경
- 핀포인트 데이터 구조 및 렌더링 로직은 변경 없음

---

## 11. 정리/클린업 (Phase 3)

모든 코스가 GPX로 전환된 후 실행한다.

### DB 컬럼 제거

```sql
-- supabase/migrations/XXX_remove_overlay_columns.sql
BEGIN;

ALTER TABLE courses DROP COLUMN image_url;
ALTER TABLE courses DROP COLUMN highlight_image_url;
ALTER TABLE courses DROP COLUMN opacity;
ALTER TABLE courses DROP COLUMN nw_lat;
ALTER TABLE courses DROP COLUMN nw_lng;
ALTER TABLE courses DROP COLUMN se_lat;
ALTER TABLE courses DROP COLUMN se_lng;

-- gpx_file_url을 NOT NULL로 변경
ALTER TABLE courses ALTER COLUMN gpx_file_url SET NOT NULL;

COMMIT;
```

### Storage 정리

- `courses` 버킷에서 구 이미지 파일(`.webp`) 삭제
- GPX 파일(`.gpx`)만 남김

### 코드 정리

| 대상 | 작업 |
|------|------|
| `NaverMap.tsx` | GroundOverlay 분기 제거, `groundOverlaysRef` / `overlayUrlsRef` 제거 |
| `Course` 인터페이스 | `image_url`, `highlight_image_url`, `opacity`, `nw/se` 제거, `gpx_file_url` non-null로 변경 |
| `naver-maps.d.ts` | `GroundOverlay`, `GroundOverlayOptions` 타입 제거 |
| `PinpointPicker.tsx` | GroundOverlay 관련 props/로직 제거 |
| `courses/page.tsx` | 이미지 업로드 UI, NW/SE 좌표 입력 제거 |
| API Route | `convertAndUpload` 이미지 처리 제거 |
| `docs/reference/naver-maps.md` | GroundOverlay 섹션 제거, Data Layer 섹션 추가 |
| `CLAUDE.md` | GroundOverlay 관련 설명 갱신 |

---

## 12. 구현 단계 (권장 순서)

### Step 1: 기반 작업

1. DB 마이그레이션 실행 (새 컬럼 추가)
2. `src/types/index.ts` — `Course` 인터페이스에 새 필드 추가
3. `src/types/naver-maps.d.ts` — `Data`, `Data.Feature`, `Data.StyleOptions` 타입 추가

### Step 2: API Route

1. `src/app/api/admin/courses/route.ts` — POST/PATCH에 GPX Storage 업로드 로직 추가
2. DELETE에 `gpx_file_url` Storage 삭제 추가

### Step 3: Admin UI

1. `courses/page.tsx` — GPX 업로드 + 색상 선택기 + 투명도 슬라이더
2. `PinpointPicker.tsx` — Data Layer GPX 미리보기

### Step 4: 프론트엔드 렌더링

1. `NaverMap.tsx` — 코스별 Data 인스턴스 + `addGpx()` 렌더링 + GroundOverlay 분기
2. 줌 연동 선 두께 (`idle` 이벤트)
3. 선택/하이라이트 (`overrideStyle` / `revertStyle`)
4. 가시성 토글 (`setMap`)

### Step 5: 정리 (Phase 3)

- 모든 코스 GPX 전환 확인 후 구 코드/컬럼 제거

---

## 13. 테스트 체크리스트

### GPX 로딩

- [ ] 정상적인 GPX 파일 → `addGpx()`로 Feature 생성 확인
- [ ] 여러 `<trkseg>`가 있는 GPX 처리
- [ ] `<trk>`가 여러 개인 GPX 처리
- [ ] 잘못된 XML / GPX가 아닌 파일 → 에러 처리
- [ ] GPX fetch 실패 (네트워크 에러) → 에러 처리, 다른 코스에 영향 없음

### Admin UI

- [ ] GPX 업로드 시 미리보기에 경로 표시
- [ ] 색상 선택기로 `stroke_color` 변경 → 미리보기 반영
- [ ] 투명도 슬라이더로 `stroke_opacity` 변경 → 미리보기 반영
- [ ] 코스 수정 시 기존 GPX 유지 가능 (파일 미첨부)
- [ ] 코스 수정 시 새 GPX 업로드 → 기존 GPX Storage 삭제 + 새 파일 저장
- [ ] 핀포인트 배치가 GPX 경로 위에서 정상 동작

### 렌더링

- [ ] `gpx_file_url`이 있는 코스 → Data Layer 렌더링
- [ ] `gpx_file_url`이 없는 코스 → GroundOverlay 렌더링 (전환 기간)
- [ ] 줌인/줌아웃 시 선 두께 동적 변화
- [ ] 코스 선택 시 `overrideStyle()`로 하이라이트 적용
- [ ] 코스 해제 시 `revertStyle()`로 원래 스타일 복원
- [ ] `showCourses` 토글 시 Data Layer 가시성 반영
- [ ] 선택된 코스가 다른 코스보다 위에 표시 (zIndex)
- [ ] 코스 핀 마커(pinpoints)가 기존대로 동작

### 데이터 흐름

- [ ] 코스 생성 API → GPX Storage 저장 → DB 저장 → 프론트에서 fetch + addGpx 렌더링
- [ ] 코스 삭제 API → DB 삭제 + GPX Storage 삭제
- [ ] `useCourses` 훅이 새 필드(`gpx_file_url` 등) 정상 반환

### 레거시 호환 (전환 기간)

- [ ] PNG 코스(`gpx_file_url` 없음)의 목록 카드에 기존 정보(썸네일, NW/SE, 투명도) 정상 표시
- [ ] GPX 코스(`gpx_file_url` 있음)의 목록 카드에 색상 칩 + stroke_opacity 표시
- [ ] PNG 코스 수정 시 기존 필드(이름, 설명, 난이도 등) 정상 수정 가능
- [ ] PNG 코스 수정 시 GPX 업로드 → GPX로 전환됨, 기존 이미지는 보존
- [ ] GPX 전환 후 `image_url`, `highlight_image_url` DB에 남아있어도 문제 없음
- [ ] `handleToggleActive`가 PNG/GPX 코스 모두에서 정상 동작
- [ ] `handleDelete`가 PNG 코스 삭제 시 이미지 Storage 정리, GPX 코스 삭제 시 GPX Storage 정리

### 엣지 케이스

- [ ] 매우 큰 GPX (1만+ 포인트) — addGpx 렌더링 성능 확인
- [ ] 빈 `pinpoints` + 유효한 `gpx_file_url` — 정상 동작
- [ ] 하이브리드 상태 (일부 코스 GroundOverlay, 일부 Data Layer) — 동시 렌더링
- [ ] 여러 코스의 GPX를 동시에 fetch → 병렬 로딩 + 개별 에러 처리

---

## 14. 주요 설계 결정 요약

| 결정 | 근거 |
|------|------|
| `addGpx()` 사용, 서버 파싱 불필요 | 네이버 지도 SDK 내장 기능으로 GPX → GeoJSON 변환 + 렌더링 일체 처리 |
| `route_path` JSONB 컬럼 미사용 | DB에 좌표 배열 저장 대신 GPX 원본 URL만 저장 — 단순하고 중복 없음 |
| 코스별 독립 Data 인스턴스 | `map.data`(글로벌)로는 코스별 표시/숨김 제어 불가 — 독립 인스턴스로 해결 |
| `overrideStyle` / `revertStyle` | 이미지 교체 대신 스타일 오버라이드로 선택/하이라이트 — 즉시 반영, 깜빡임 없음 |
| NW/SE 좌표 DB 미저장 (신규) | `addGpx()` 결과 Feature에서 bounds 동적 계산 — DB 스키마 단순화 |
| `fast-xml-parser` 미사용 | 클라이언트의 `DOMParser` + `addGpx()`로 충분 — 추가 의존성 없음 |
