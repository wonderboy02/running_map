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
export const GPX_STROKE_COLOR = '#4A90D9';
export const GPX_STROKE_OPACITY = 1.0;

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
