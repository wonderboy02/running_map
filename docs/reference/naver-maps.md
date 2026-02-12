# Naver Maps JavaScript API v3 (NCP) Reference

## Setup

### Script Loading

```html
<script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=YOUR_CLIENT_ID"></script>
```

- **Base URL**: `https://oapi.map.naver.com` (NCP Maps)
- **Parameter**: `ncpKeyId` (NOT `clientId`)
- **Submodules**: `?ncpKeyId=ID&submodules=geocoder,drawing` 로 추가 모듈 로드 가능

### NCP Console 설정

1. [console.ncloud.com](https://console.ncloud.com) > Application Services > Maps
2. "Web Dynamic Map" 서비스 활성화
3. Web 서비스 URL에 허용 도메인 등록
4. Client ID 복사 → `.env.local`의 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`에 설정

---

## Core API

### Map (지도)

```typescript
const map = new naver.maps.Map('mapElement', {
  center: new naver.maps.LatLng(37.5665, 126.978),
  zoom: 13,
  minZoom: 10,
  maxZoom: 18,
  mapTypeId: naver.maps.MapTypeId.NORMAL,
  zoomControl: true,
  zoomControlOptions: {
    position: naver.maps.Position.RIGHT_CENTER,
    style: naver.maps.ZoomControlStyle.SMALL,
  },
  scaleControl: true,
  mapTypeControl: false,
  tileTransition: true,
  pinchZoom: true,
  scrollWheel: true,
  disableKineticPan: false,
});
```

**주요 메서드:**

| 메서드                       | 설명                     |
| ---------------------------- | ------------------------ |
| `getCenter()`                | 현재 중심 좌표 반환      |
| `setCenter(latlng)`          | 중심 좌표 설정           |
| `getZoom()`                  | 현재 줌 레벨 반환        |
| `setZoom(level)`             | 줌 레벨 설정             |
| `getBounds()`                | 현재 지도 영역 반환      |
| `panTo(latlng, options?)`    | 부드럽게 이동            |
| `setMapTypeId(mapTypeId)`    | 지도 유형 변경           |
| `setOptions(options)`        | 옵션 일괄 설정           |
| `addControl(control, position)` | 커스텀 컨트롤 추가    |
| `destroy()`                  | 지도 인스턴스 해제       |

### MapTypeId (지도 유형)

| 상수                              | 설명          |
| --------------------------------- | ------------- |
| `naver.maps.MapTypeId.NORMAL`     | 일반 지도     |
| `naver.maps.MapTypeId.SATELLITE`  | 위성 지도     |
| `naver.maps.MapTypeId.HYBRID`     | 혼합 (위성+라벨) |
| `naver.maps.MapTypeId.TERRAIN`    | 지형도        |

### Marker (마커)

```typescript
const marker = new naver.maps.Marker({
  position: new naver.maps.LatLng(37.5665, 126.978),
  map: map,
  icon: {
    content: '<div class="marker-default"></div>',
    size: new naver.maps.Size(32, 32),
    anchor: new naver.maps.Point(16, 32),
  },
  zIndex: 1,
  title: '마커 제목',
  clickable: true,
  visible: true,
  animation: naver.maps.Animation.DROP,
});
```

**아이콘 유형:**

1. **HTML 아이콘**: `{ content: '<div>...</div>', size, anchor }`
2. **이미지 아이콘**: `{ url: '/markers/pin.png', size, scaledSize, anchor }`
3. **심볼 아이콘**: `{ path, fillColor, fillOpacity, strokeColor, strokeWeight, scale, rotation }`

**주요 메서드:**

| 메서드                    | 설명                |
| ------------------------- | ------------------- |
| `setMap(map \| null)`     | 지도에 표시/제거    |
| `setPosition(latlng)`     | 위치 변경           |
| `setIcon(icon)`           | 아이콘 변경         |
| `setVisible(visible)`     | 표시/숨김           |
| `setZIndex(zIndex)`       | z-index 변경        |
| `getPosition()`           | 현재 위치 반환      |

### Animation (마커 애니메이션)

| 상수                           | 설명            |
| ------------------------------ | --------------- |
| `naver.maps.Animation.BOUNCE`  | 바운스 효과     |
| `naver.maps.Animation.DROP`    | 드롭 효과       |

### Event (이벤트)

```typescript
// 이벤트 리스너 등록
const listener = naver.maps.Event.addListener(marker, 'click', (e) => {
  console.log('Marker clicked!', e);
});

// 이벤트 리스너 제거
naver.maps.Event.removeListener(listener);

// 특정 타입의 모든 리스너 제거
naver.maps.Event.clearListeners(marker, 'click');

// 이벤트 트리거
naver.maps.Event.trigger(marker, 'click');
```

**주요 지도 이벤트:**

| 이벤트         | 설명                      |
| -------------- | ------------------------- |
| `click`        | 클릭                      |
| `dblclick`     | 더블 클릭                 |
| `rightclick`   | 우클릭                    |
| `dragstart`    | 드래그 시작               |
| `drag`         | 드래그 중                 |
| `dragend`      | 드래그 종료               |
| `zoom_changed` | 줌 레벨 변경              |
| `bounds_changed` | 지도 영역 변경          |
| `center_changed` | 중심 좌표 변경          |
| `idle`         | 지도 이동/줌 완료 후 대기 |

### Controls (컨트롤)

```typescript
// 커스텀 HTML 컨트롤
const customControl = new naver.maps.CustomControl(htmlString, {
  position: naver.maps.Position.TOP_RIGHT,
});

customControl.setMap(map);

// DOM 요소 접근
const controlElement = customControl.getElement();
controlElement.addEventListener('click', handleClick);
```

---

## Coordinates (좌표)

### LatLng

```typescript
const latlng = new naver.maps.LatLng(37.5665, 126.978);
const lat = latlng.lat(); // 37.5665
const lng = latlng.lng(); // 126.978
```

### LatLngBounds

```typescript
const sw = new naver.maps.LatLng(37.42, 126.76);
const ne = new naver.maps.LatLng(37.70, 127.18);
const bounds = new naver.maps.LatLngBounds(sw, ne);

bounds.hasLatLng(latlng); // 좌표 포함 여부
bounds.extend(newLatLng); // 범위 확장
```

### Point & Size

```typescript
const point = new naver.maps.Point(x, y); // 픽셀 좌표
const size = new naver.maps.Size(width, height); // 크기
```

---

## Overlays (오버레이)

### InfoWindow (정보창)

```typescript
const infoWindow = new naver.maps.InfoWindow({
  content: '<div class="info-window">내용</div>',
  borderWidth: 0,
  backgroundColor: 'transparent',
  anchorSize: new naver.maps.Size(0, 0),
  pixelOffset: new naver.maps.Point(0, -10),
});

infoWindow.open(map, marker.getPosition());
infoWindow.close();
```

### Polyline (폴리라인)

```typescript
const polyline = new naver.maps.Polyline({
  map: map,
  path: [latlng1, latlng2, latlng3],
  strokeColor: '#FF0000',
  strokeWeight: 3,
  strokeOpacity: 0.8,
});
```

### Polygon (폴리곤)

```typescript
const polygon = new naver.maps.Polygon({
  map: map,
  paths: [[latlng1, latlng2, latlng3, latlng4]],
  fillColor: '#FF0000',
  fillOpacity: 0.3,
  strokeColor: '#FF0000',
  strokeWeight: 2,
});
```

### Circle (원)

```typescript
const circle = new naver.maps.Circle({
  map: map,
  center: latlng,
  radius: 500, // 미터
  fillColor: '#0000FF',
  fillOpacity: 0.1,
  strokeColor: '#0000FF',
  strokeWeight: 1,
});
```

### GroundOverlay (이미지 오버레이)

**개요**: 지도의 특정 좌표 범위에 이미지를 배치하는 오버레이. 지도 확대/축소 시 이미지도 함께 크기가 조정됩니다.

**용도**: 러닝 코스 하이라이트, 구역 표시, 히트맵, 반투명 이미지 레이어 등

#### 기본 사용법

```typescript
// 1. 이미지를 표시할 좌표 범위 설정
const bounds = new naver.maps.LatLngBounds(
  new naver.maps.LatLng(37.5, 127.0),   // 남서쪽 모서리 (SW)
  new naver.maps.LatLng(37.6, 127.1)    // 북동쪽 모서리 (NE)
);

// 2. GroundOverlay 생성
const groundOverlay = new naver.maps.GroundOverlay(
  '/images/course-overlay.png',  // 이미지 URL (PNG 투명도 지원)
  bounds,                         // 좌표 범위
  {
    opacity: 0.8,                 // 투명도 (0~1, 1이 불투명)
    clickable: true,              // 클릭 이벤트 허용
    map: map                      // 지도 객체 (옵션)
  }
);

// 3. 지도에 추가 (옵션에서 map을 설정하지 않은 경우)
groundOverlay.setMap(map);
```

#### 주요 메서드

| 메서드 | 설명 |
|--------|------|
| `setMap(map \| null)` | 지도에 표시/제거 |
| `getMap()` | 현재 지도 반환 |
| `setOpacity(opacity)` | 투명도 설정 (0~1) |
| `getOpacity()` | 현재 투명도 반환 |
| `setUrl(url)` | 이미지 URL 변경 |
| `setBounds(bounds)` | 좌표 범위 변경 |
| `getBounds()` | 현재 좌표 범위 반환 |
| `setClickable(clickable)` | 클릭 가능 여부 설정 |
| `getClickable()` | 클릭 가능 여부 반환 |

#### 이벤트

```typescript
// 클릭 이벤트 (clickable: true인 경우)
naver.maps.Event.addListener(groundOverlay, 'click', (e) => {
  console.log('이미지 오버레이 클릭!', e.coord);
});
```

#### TypeScript 타입 정의

`src/types/naver-maps.d.ts`에 추가:

```typescript
declare namespace naver.maps {
  class GroundOverlay {
    constructor(
      url: string,
      bounds: LatLngBounds,
      options?: GroundOverlayOptions
    );

    setMap(map: Map | null): void;
    getMap(): Map | null;
    setOpacity(opacity: number): void;
    getOpacity(): number;
    setUrl(url: string): void;
    setBounds(bounds: LatLngBounds): void;
    getBounds(): LatLngBounds;
    setClickable(clickable: boolean): void;
    getClickable(): boolean;
  }

  interface GroundOverlayOptions {
    opacity?: number;       // 0~1 (기본값: 1)
    clickable?: boolean;    // 기본값: true
    map?: Map;
    crossOrigin?: string;   // CORS 설정 (필요 시)
  }
}
```

#### 실제 사용 예시

```typescript
// 예제 1: 러닝 코스 하이라이트 (반투명 PNG)
const courseBounds = new naver.maps.LatLngBounds(
  new naver.maps.LatLng(37.5665, 126.978),
  new naver.maps.LatLng(37.5765, 126.988)
);

const courseOverlay = new naver.maps.GroundOverlay(
  '/images/course-highlight.png',
  courseBounds,
  {
    opacity: 0.6,
    clickable: true
  }
);
courseOverlay.setMap(map);

// 예제 2: 동적 투명도 조절
let currentOpacity = 0.8;
document.getElementById('opacitySlider')?.addEventListener('input', (e) => {
  currentOpacity = parseFloat((e.target as HTMLInputElement).value);
  courseOverlay.setOpacity(currentOpacity);
});

// 예제 3: 이미지 전환
const toggleImage = () => {
  const currentUrl = courseOverlay.getUrl();
  const newUrl = currentUrl.includes('day')
    ? '/images/night-overlay.png'
    : '/images/day-overlay.png';
  courseOverlay.setUrl(newUrl);
};

// 예제 4: 오버레이 제거
const removeOverlay = () => {
  courseOverlay.setMap(null);
};
```

#### 주의사항

- **이미지 포맷**: PNG (투명도 지원), JPG, GIF 모두 사용 가능
- **CORS**: 외부 도메인 이미지 사용 시 `crossOrigin` 옵션 필요
- **성능**: 대용량 이미지는 로딩 시간이 길 수 있으므로 적절한 크기로 최적화 권장
- **좌표 범위**: `LatLngBounds`의 남서쪽(SW), 북동쪽(NE) 순서 주의

#### 공식 문서

- [GroundOverlay API Reference](https://navermaps.github.io/maps.js.ncp/docs/naver.maps.GroundOverlay.html)
- [GroundOverlay Tutorial](https://navermaps.github.io/maps.js.en/docs/tutorial-5-GroundOverlay.html)

---

## Position 상수

| 상수               | 위치        |
| -------------------- | ----------- |
| `TOP_LEFT`           | 좌상단      |
| `TOP_CENTER`         | 상단 중앙   |
| `TOP_RIGHT`          | 우상단      |
| `LEFT_CENTER`        | 좌측 중앙   |
| `CENTER`             | 중앙        |
| `RIGHT_CENTER`       | 우측 중앙   |
| `BOTTOM_LEFT`        | 좌하단      |
| `BOTTOM_CENTER`      | 하단 중앙   |
| `BOTTOM_RIGHT`       | 우하단      |

---

## Geocoding REST API

> 서버 사이드에서만 사용. Client Secret 필요.

### Endpoint

```
GET https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode
```

### Headers

| Header                     | 값               |
| -------------------------- | ---------------- |
| `X-NCP-APIGW-API-KEY-ID`  | Client ID        |
| `X-NCP-APIGW-API-KEY`     | Client Secret    |

### Parameters

| 파라미터   | 설명                  | 필수 |
| ---------- | --------------------- | ---- |
| `query`    | 검색할 주소           | O    |
| `coordinate` | 검색 중심 좌표 (경도,위도) | X    |

### Response

```json
{
  "status": "OK",
  "meta": { "totalCount": 1, "page": 1, "count": 1 },
  "addresses": [
    {
      "roadAddress": "서울특별시 강남구 테헤란로 123",
      "jibunAddress": "서울특별시 강남구 역삼동 123-45",
      "x": "127.0276368",
      "y": "37.4979462",
      "distance": 0.0
    }
  ]
}
```

### Reverse Geocoding

```
GET https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc
```

| 파라미터    | 설명                      | 필수 |
| ----------- | ------------------------- | ---- |
| `coords`    | 좌표 (경도,위도)          | O    |
| `output`    | 응답 형식 (json/xml)      | X    |
| `orders`    | 변환 항목 (roadaddr 등)   | X    |

---

## Layers (레이어)

```typescript
// 교통 정보 레이어
map.setOptions({ mapTypeId: naver.maps.MapTypeId.NORMAL });
map.addPane('traffic', naver.maps.MapPaneId.OVERLAY);

// 자전거 도로 레이어
const bicycleLayer = new naver.maps.BicycleLayer();
bicycleLayer.setMap(map);
```

---

## 공식 문서 링크

### 개요 & 시작하기

- [NCP Maps 개요](https://api.ncloud-docs.com/docs/application-maps-overview)
- [Client ID 발급](https://navermaps.github.io/maps.js.ncp/docs/tutorial-1-Getting-Client-ID.html)
- [시작하기 (Getting Started)](https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html)

### API Reference

- [Map 클래스](https://navermaps.github.io/maps.js.ncp/docs/naver.maps.Map.html)
- [Marker 클래스](https://navermaps.github.io/maps.js.ncp/docs/naver.maps.Marker.html)
- [InfoWindow 클래스](https://navermaps.github.io/maps.js.ncp/docs/naver.maps.InfoWindow.html)
- [Event 클래스](https://navermaps.github.io/maps.js.ncp/docs/naver.maps.Event.html)
- [LatLng 클래스](https://navermaps.github.io/maps.js.ncp/docs/naver.maps.LatLng.html)

### Tutorials & Examples

- [마커 생성](https://navermaps.github.io/maps.js.ncp/docs/tutorial-marker.html)
- [이벤트 처리](https://navermaps.github.io/maps.js.ncp/docs/tutorial-event.html)
- [커스텀 컨트롤](https://navermaps.github.io/maps.js.ncp/docs/tutorial-custom-control.html)
- [오버레이](https://navermaps.github.io/maps.js.ncp/docs/tutorial-overlay.html)
- [GitHub 예제 코드](https://github.com/navermaps/maps.js.ncp)

### REST API

- [Geocoding API](https://api.ncloud-docs.com/docs/application-maps-geocoding)
- [Reverse Geocoding API](https://api.ncloud-docs.com/docs/application-maps-reversegc)
- [Static Map API](https://api.ncloud-docs.com/docs/application-maps-staticmap)
- [Directions API](https://api.ncloud-docs.com/docs/application-maps-direction5)
