# 내 위치 실시간 추적 + 방향 표시 구현 스펙

## 개요

현재 앱은 `getCurrentPosition()`으로 한 번만 위치를 가져와 지도를 이동시킬 뿐, 내 위치 마커나 실시간 추적이 없음.
구글맵처럼 **파란 점 + 바라보는 방향 화살표 + 실시간 위치 갱신**을 추가하여 러너가 자신의 위치를 직관적으로 파악할 수 있게 함.

## 현재 상태 분석

### 구현되어 있는 것

- `FloatingControls.tsx`: `getCurrentPosition()`으로 한 번만 위치 조회 → `map.panTo()` + zoom 15
- `page.tsx`: 앱 최초 로드 시 `getCurrentPosition()`으로 초기 센터 설정
- 내 위치를 나타내는 마커 없음
- 실시간 추적 없음, 방향(heading) 표시 없음

### 활용 가능한 기존 패턴

| 패턴 | 위치 | 설명 |
|------|------|------|
| HtmlIcon 마커 | `marker-config.ts` | CSS 기반 마커 아이콘 (회전 가능) |
| 명령형 마커 관리 | `NaverMap.tsx` | `Map<string, Marker>` ref로 생명주기 관리 |
| map 인스턴스 전달 | `page.tsx` → props | `onMapReady` 콜백 → 부모 state → 자식 props |

---

## 아키텍처

### 데이터 흐름

```
useMyLocation hook (GPS watchPosition + DeviceOrientation)
    ↓ state: { position, heading, accuracy, isTracking }
page.tsx (상태 중계)
    ├→ NaverMap (myLocation prop → MyLocationMarker 렌더링)
    └→ FloatingControls (토글 버튼 + 팔로우 모드)
```

### 파일 변경 목록

| 파일 | 작업 | 설명 |
|------|------|------|
| `src/types/naver-maps.d.ts` | **수정** | `Circle`, `CircleOptions` 타입 추가 |
| `src/styles/globals.css` | **수정** | 파란 점, 방향 콘, 펄스 애니메이션 CSS |
| `src/hooks/useMyLocation.ts` | **신규** | GPS 추적 + 나침반 방향 훅 |
| `src/components/Map/MyLocationMarker.ts` | **신규** | 파란 점 + 방향 콘 + 정확도 원 마커 클래스 |
| `src/components/Map/NaverMap.tsx` | **수정** | `myLocation` prop 추가, MyLocationMarker 연결 |
| `src/components/FloatingControls.tsx` | **수정** | 3단계 토글 (OFF → 팔로우 → 추적) |
| `src/app/page.tsx` | **수정** | `useMyLocation` 통합, 자식에 상태 전달 |

---

## 상세 구현 스펙

### 1. 타입 정의 (`naver-maps.d.ts`)

정확도 원 표시를 위해 `Circle` 타입 추가:

```typescript
interface CircleOptions {
  map?: Map;
  center?: LatLng;
  radius?: number;          // 미터 단위
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWeight?: number;
  strokeOpacity?: number;
  clickable?: boolean;
  visible?: boolean;
  zIndex?: number;
}

class Circle {
  constructor(options?: CircleOptions);
  setMap(map: Map | null): void;
  getMap(): Map | null;
  setCenter(center: LatLng): void;
  getCenter(): LatLng;
  setRadius(radius: number): void;
  getRadius(): number;
  setOptions(options: Partial<CircleOptions>): void;
  setVisible(visible: boolean): void;
}
```

---

### 2. CSS 스타일 (`globals.css`)

```css
/* ===== My Location Blue Dot ===== */

.my-location-marker {
  position: relative;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 파란 점 (구글맵 스타일) */
.my-location-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #4285F4;
  border: 3px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  z-index: 2;
  position: relative;
}

/* 방향 콘 (삼각형, 부채꼴) */
.my-location-heading-cone {
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 14px solid transparent;
  border-right: 14px solid transparent;
  border-bottom: 22px solid rgba(66, 133, 244, 0.3);
  z-index: 1;
}

/* heading 데이터 없을 때 숨김 */
.my-location-heading-cone.hidden {
  display: none;
}

/* 펄스 링 애니메이션 */
.my-location-pulse {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: rgba(66, 133, 244, 0.25);
  animation: my-location-pulse-ring 2s ease-out infinite;
  z-index: 1;
}

@keyframes my-location-pulse-ring {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(3.5); opacity: 0; }
}
```

**시각적 구성:**
- 전체 마커 컨테이너(60×60)가 heading에 따라 `transform: rotate(Xdeg)` 회전
- 중앙에 파란 점(16px) + 위쪽에 반투명 방향 콘
- 펄스 애니메이션으로 위치 활성 상태 표시

---

### 3. `useMyLocation` 훅 (`src/hooks/useMyLocation.ts`)

#### API 설계

```typescript
export interface MyLocationState {
  position: { lat: number; lng: number } | null;  // 현재 좌표
  accuracy: number | null;                         // GPS 정확도 (미터)
  heading: number | null;                          // 방향 (0=북, 90=동)
  speed: number | null;                            // 속도 (m/s)
  isTracking: boolean;                             // 추적 활성 여부
  error: string | null;                            // 에러 메시지
}

export function useMyLocation(): {
  state: MyLocationState;
  startTracking: () => void;
  stopTracking: () => void;
  toggleTracking: () => void;
}
```

#### GPS 추적 (`watchPosition`)

```typescript
navigator.geolocation.watchPosition(
  onSuccess,
  onError,
  {
    enableHighAccuracy: true,
    maximumAge: 3000,     // 3초 이내 캐시 허용
    timeout: 10000,       // 10초 타임아웃
  }
);
```

- 이전 위치와 3m 미만 차이는 무시 (GPS jitter 방지, 불필요한 re-render 방지)
- `watchId`를 ref로 저장, cleanup 시 `clearWatch()` 호출

#### 나침반 방향 (DeviceOrientation)

**방향 소스 우선순위:**

| 조건 | 소스 | 비고 |
|------|------|------|
| `speed > 1 m/s` (이동 중) | `coords.heading` (GPS) | GPS heading이 더 정확 |
| `speed <= 1 m/s` (정지) | `DeviceOrientationEvent` | 나침반(자이로) 사용 |
| 둘 다 불가 | `null` | 방향 콘 숨김 |

**DeviceOrientation 처리:**

```typescript
// iOS 13+ 권한 요청
if (typeof DeviceOrientationEvent !== 'undefined' &&
    'requestPermission' in DeviceOrientationEvent) {
  const permission = await DeviceOrientationEvent.requestPermission();
  if (permission !== 'granted') return; // 권한 거부 시 나침반 포기 (에러 아님)
}

// Android: deviceorientationabsolute 우선
window.addEventListener('deviceorientationabsolute', handler);
// fallback: deviceorientation
window.addEventListener('deviceorientation', handler);
```

**Heading 값 추출:**

```typescript
function extractHeading(event: DeviceOrientationEvent): number | null {
  // iOS: webkitCompassHeading (이미 절대값)
  if ('webkitCompassHeading' in event) {
    return (event as any).webkitCompassHeading;
  }
  // Android: alpha (360 - alpha = compass heading)
  if (event.alpha !== null) {
    return (360 - event.alpha) % 360;
  }
  return null;
}
```

**스무딩 & 쓰로틀:**
- 100ms 쓰로틀 (초당 최대 10회)
- 지수 평활화 (alpha=0.3): `smoothed = prev + 0.3 * shortestAngleDiff(prev, raw)`
- 360°/0° 경계 처리: `Math.atan2(Math.sin(delta), Math.cos(delta))`로 최단 각도 계산

#### 에러 처리

| 시나리오 | 처리 |
|----------|------|
| 위치 권한 거부 | toast.error, 추적 중지, OFF 상태로 전환 |
| Geolocation 미지원 | toast.error, 버튼 비활성화 |
| iOS 나침반 권한 거부 | 방향 콘만 안 보임, 에러 토스트 없음 |
| DeviceOrientation 미지원 (데스크톱) | 이동 중 GPS heading만 사용, 정지 시 방향 없음 |
| GPS timeout | watchPosition이 자동 재시도 |
| 컴포넌트 unmount | useEffect cleanup으로 clearWatch + removeEventListener |

---

### 4. `MyLocationMarker` 클래스 (`src/components/Map/MyLocationMarker.ts`)

기존 NaverMap.tsx의 명령형 마커 관리 패턴을 따름 (React 컴포넌트가 아닌 순수 클래스).

#### 구성

```typescript
export class MyLocationMarker {
  private map: naver.maps.Map;
  private dotMarker: naver.maps.Marker | null = null;
  private accuracyCircle: naver.maps.Circle | null = null;
  private lastRenderedHeading: number = 0;
  private lastRenderedRadius: number = 0;

  constructor(map: naver.maps.Map);

  /** 위치, 방향, 정확도 업데이트 */
  update(
    position: { lat: number; lng: number },
    heading: number | null,
    accuracy: number | null
  ): void;

  /** 마커 표시/숨김 */
  setVisible(visible: boolean): void;

  /** 정리 (지도에서 제거) */
  destroy(): void;
}
```

#### 마커 HTML 구조

```html
<div class="my-location-marker" style="transform: rotate({heading}deg)">
  <div class="my-location-heading-cone {hidden?}"></div>
  <div class="my-location-dot"></div>
  <div class="my-location-pulse"></div>
</div>
```

- `heading`이 변경될 때 `marker.setIcon()`으로 HTML 갱신
- HtmlIcon의 size: `60×60`, anchor: `30, 30` (중앙 정렬)

#### 정확도 원

```typescript
this.accuracyCircle = new naver.maps.Circle({
  map: this.map,
  center: latlng,
  radius: accuracy,          // 미터 단위
  fillColor: '#4285F4',
  fillOpacity: 0.08,
  strokeColor: '#4285F4',
  strokeWeight: 1,
  strokeOpacity: 0.3,
  clickable: false,
  zIndex: 0,
});
```

- accuracy > 20m일 때만 표시 (GPS가 정확하면 점만으로 충분)
- 최대 반경 200m 제한 (시각적 과다 방지)

#### 성능 최적화

| 업데이트 | 조건 | API 호출 |
|----------|------|----------|
| 위치 | 항상 | `marker.setPosition()`, `circle.setCenter()` |
| 방향 | 이전 대비 5° 이상 변화 | `marker.setIcon()` (DOM 조작, 비용 높음) |
| 정확도 | 이전 대비 5m 이상 변화 | `circle.setRadius()` |

---

### 5. `NaverMap.tsx` 수정

#### 새 prop

```typescript
interface NaverMapProps {
  // ...기존 props
  myLocation?: {
    position: { lat: number; lng: number } | null;
    heading: number | null;
    accuracy: number | null;
    isTracking: boolean;
  };
}
```

#### 마커 관리

```typescript
const myLocationMarkerRef = useRef<MyLocationMarker | null>(null);

useEffect(() => {
  if (!isReady || !map || !myLocation) return;

  if (myLocation.isTracking && myLocation.position) {
    // 마커가 없으면 생성
    if (!myLocationMarkerRef.current) {
      myLocationMarkerRef.current = new MyLocationMarker(map);
    }
    myLocationMarkerRef.current.update(
      myLocation.position,
      myLocation.heading,
      myLocation.accuracy
    );
  } else {
    // 추적 종료 시 마커 제거
    myLocationMarkerRef.current?.destroy();
    myLocationMarkerRef.current = null;
  }
}, [isReady, map, myLocation]);

// cleanup
useEffect(() => {
  return () => {
    myLocationMarkerRef.current?.destroy();
  };
}, []);
```

---

### 6. `FloatingControls.tsx` 수정

#### 3단계 위치 토글

```
[탭] OFF → 팔로우 → 추적 → OFF → ...
[드래그] 팔로우 → 추적 (지도 수동 이동 시 자동 전환)
```

| 상태 | 아이콘 | 스타일 | 동작 |
|------|--------|--------|------|
| **OFF** | `LocateFixed` (회색) | 흰 배경 | 추적 비활성, 파란 점 없음 |
| **팔로우** | `Navigation` (흰색) | 파란 배경 (primary) | 추적 + 지도가 내 위치 자동 따라감 |
| **추적** | `LocateFixed` (파란색) | 흰 배경 + 파란 테두리 | 추적 중이나 지도 자유 이동 가능 |

#### 팔로우 모드 로직

```typescript
// 팔로우 모드: 위치 변경 시 자동 센터
useEffect(() => {
  if (locationMode === 'following' && map && locationState.position) {
    const { lat, lng } = locationState.position;
    map.panTo(new naver.maps.LatLng(lat, lng));
  }
}, [locationMode, map, locationState.position]);

// 지도 드래그 시 팔로우 해제
useEffect(() => {
  if (!map) return;
  const listener = naver.maps.Event.addListener(map, 'dragstart', () => {
    if (locationMode === 'following') {
      setLocationMode('tracking');
    }
  });
  return () => naver.maps.Event.removeListener(listener);
}, [map, locationMode]);
```

#### Props 변경

```typescript
interface FloatingControlsProps {
  map: naver.maps.Map | null;
  showCourses: boolean;
  onToggleCourses: (checked: boolean) => void;
  // 추가:
  locationState: MyLocationState;
  onToggleTracking: () => void;
}
```

기존 `locating` state와 `handleLocate` 콜백은 제거.

---

### 7. `page.tsx` 통합

```typescript
import { useMyLocation } from '@/hooks/useMyLocation';

export default function HomePage() {
  const { state: myLocation, toggleTracking } = useMyLocation();

  // 기존 initialCenter getCurrentPosition은 유지 (추적과 별개)

  return (
    <>
      <NaverMap
        // ...기존 props
        myLocation={{
          position: myLocation.position,
          heading: myLocation.heading,
          accuracy: myLocation.accuracy,
          isTracking: myLocation.isTracking,
        }}
      />
      <FloatingControls
        map={naverMap}
        showCourses={showCourses}
        onToggleCourses={setShowCourses}
        locationState={myLocation}
        onToggleTracking={toggleTracking}
      />
    </>
  );
}
```

---

## 엣지 케이스 & 주의사항

| 시나리오 | 처리 방안 |
|----------|-----------|
| 위치 권한 거부 | toast.error 표시, 추적 즉시 중지 |
| 브라우저 미지원 | 버튼 자체를 비활성화 |
| iOS 나침반 권한 거부 | 방향 콘만 숨김 (에러 표시 안 함) |
| 데스크톱 (나침반 없음) | 이동 시 GPS heading만, 정지 시 방향 없음 |
| 매우 낮은 정확도 (>100m) | 정확도 원 표시, 최대 200m 제한 |
| 360°/0° 경계 | 최단 각도 계산 알고리즘 적용 |
| 앱 내 페이지 이동 | `page.tsx`는 유지되므로 추적 계속 |

---

## 성능 고려사항

| 항목 | 전략 |
|------|------|
| watchPosition 빈도 | 3m 거리 필터로 jitter 무시 |
| DeviceOrientation 빈도 | 100ms 쓰로틀 (초당 10회) |
| setIcon() 호출 | 5° 이상 변화 시에만 (DOM 조작 비용) |
| setRadius() 호출 | 5m 이상 변화 시에만 |
| React re-render | MyLocationMarker는 명령형 클래스 (render 사이클 밖) |
| 배터리 | `enableHighAccuracy: true` 사용 (러닝앱 특성상 정확도 우선) |

---

## 검증 체크리스트

- [ ] Chrome DevTools Sensors 탭에서 GPS 시뮬레이션으로 파란 점 표시 확인
- [ ] 위치 변경 시 파란 점 이동 확인
- [ ] 팔로우 모드에서 지도 자동 센터 확인
- [ ] 지도 드래그 시 팔로우 → 추적 전환 확인
- [ ] 버튼 3단계 토글 (OFF → 팔로우 → 추적 → OFF) 확인
- [ ] 위치 권한 거부 시 에러 토스트 확인
- [ ] `npm run build` 성공 확인
- [ ] 모바일(iOS Safari, Android Chrome)에서 실제 GPS + 나침반 테스트
