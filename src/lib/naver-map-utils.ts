import type { Spot } from '@/types';

/**
 * 모바일 OS 감지 (iOS / Android / 기타)
 */
export function getMobileOS(): 'ios' | 'android' | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/iPhone|iPad/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return null;
}

/**
 * 네이버 지도 앱/웹으로 연결하는 유틸리티
 * 모바일: 딥링크 시도 → 웹 fallback
 * 데스크톱: 웹으로 직접 연결
 */
export function openNaverMap(spot: Spot): void {
  const { latitude, longitude, name } = spot;
  const encodedName = encodeURIComponent(name);

  const isMobile = getMobileOS() !== null;

  if (isMobile) {
    // 모바일: 딥링크 시도
    const appUrl = `nmap://place?lat=${latitude}&lng=${longitude}&name=${encodedName}`;
    const webUrl = `https://map.naver.com/v5/search/${encodedName}?c=${longitude},${latitude},15,0,0,0,dh`;

    let appOpened = false;

    // visibilitychange로 앱이 열렸는지 감지
    const handleVisibilityChange = () => {
      if (document.hidden) {
        appOpened = true;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 딥링크 시도
    window.location.href = appUrl;

    // 2초 후 앱이 열리지 않았으면 웹으로 fallback
    setTimeout(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (!appOpened) {
        window.open(webUrl, '_blank');
      }
    }, 2000);
  } else {
    // 데스크톱: 웹으로 직접 연결
    window.open(
      `https://map.naver.com/v5/search/${encodedName}?c=${longitude},${latitude},15,0,0,0,dh`,
      '_blank'
    );
  }
}

/**
 * 두 좌표 간 거리 (미터 단위, Haversine 공식)
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371e3; // 지구 반지름 (미터)
  function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** GPX 폴리라인 공통 스타일 상수 */
export const GPX_STROKE_COLOR = '#08266F';
export const GPX_STROKE_OPACITY = 1.0;
export const GPX_HIGHLIGHT_COLOR = '#FF6B35';

/** Admin 프리뷰 고정 선 두께 (줌 연동 없음, getStrokeWeight base와 동일 수준) */
export const GPX_PREVIEW_STROKE_WEIGHT = 6;

/**
 * Data.StyleOptions를 감싸 Point feature(waypoint)는 숨기고
 * LineString 등 나머지에만 원본 스타일을 적용하는 StylingFunction을 반환한다.
 */
export function wrapStyleHidingPoints(
  style: naver.maps.Data.StyleOptions,
): naver.maps.Data.StylingFunction {
  return (feature: naver.maps.Data.Feature) => {
    const geomType = feature.getRaw()?.geometry?.type;
    // GPX waypoint(Point)만 숨김 — 이전 코드의 === 0 비교는
    // 공식 API에 없는 getGeometry().getType() 기반이었으므로 제거
    if (geomType === 'Point') {
      return { visible: false, clickable: false };
    }
    if (!geomType) {
      console.warn('[wrapStyleHidingPoints] geometry type을 판별할 수 없음:', feature.getId());
    }
    return style;
  };
}

/** GPX Data Layer에서 트랙의 시작/끝 좌표를 추출한다. (GeoJSON [lng,lat] → {lat,lng}) */
export function extractGpxEndpoints(
  dataLayer: naver.maps.Data,
): { start: { lat: number; lng: number }; end: { lat: number; lng: number } } | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geoJson = dataLayer.toGeoJson() as any;
  let firstCoord: [number, number] | null = null;
  let lastCoord: [number, number] | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const f of geoJson.features ?? []) {
    const geom = f.geometry;
    if (!geom?.coordinates) continue;

    if (geom.type === 'LineString' && geom.coordinates.length > 0) {
      if (!firstCoord) firstCoord = geom.coordinates[0];
      lastCoord = geom.coordinates[geom.coordinates.length - 1];
    } else if (geom.type === 'MultiLineString') {
      for (const line of geom.coordinates) {
        if (line.length > 0) {
          if (!firstCoord) firstCoord = line[0];
          lastCoord = line[line.length - 1];
        }
      }
    }
  }

  if (!firstCoord || !lastCoord) return null;
  // GeoJSON: [lng, lat] → { lat, lng }
  return {
    start: { lat: firstCoord[1], lng: firstCoord[0] },
    end: { lat: lastCoord[1], lng: lastCoord[0] },
  };
}

/** Data Layer의 모든 Feature 좌표에서 LatLngBounds를 계산한다. */
export function computeDataLayerBounds(
  dataLayer: naver.maps.Data,
): naver.maps.LatLngBounds | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geoJson = dataLayer.toGeoJson() as any;
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractCoords(coords: any) {
    if (typeof coords[0] === 'number') {
      // GeoJSON: [lng, lat]
      minLng = Math.min(minLng, coords[0]);
      maxLng = Math.max(maxLng, coords[0]);
      minLat = Math.min(minLat, coords[1]);
      maxLat = Math.max(maxLat, coords[1]);
    } else {
      coords.forEach(extractCoords);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geoJson.features?.forEach((f: any) => {
    if (f.geometry?.coordinates) extractCoords(f.geometry.coordinates);
  });

  if (minLat === Infinity) return null;

  return new naver.maps.LatLngBounds(
    new naver.maps.LatLng(minLat, minLng),
    new naver.maps.LatLng(maxLat, maxLng),
  );
}
