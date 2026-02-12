'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { haversineDistance } from '@/lib/naver-map-utils';

export interface MyLocationPosition {
  lat: number;
  lng: number;
  heading: number | null;
  accuracy: number;
}

const MIN_MOVE_METERS = 3;
const THROTTLE_MS = 500;
const SMOOTHING_FACTOR = 0.3;

/** GeolocationPositionError → 문자열 에러 코드 */
function mapGeolocationError(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED) return 'permission_denied';
  if (err.code === err.POSITION_UNAVAILABLE) return 'position_unavailable';
  if (err.code === err.TIMEOUT) return 'timeout';
  return 'unknown';
}

/**
 * 항상-활성 GPS + 나침반 훅.
 * 마운트 시 watchPosition 시작, 언마운트 시 자동 정리.
 * 위치 권한 거부 시 position = null (에러 토스트 없음).
 *
 * iOS 13+에서는 DeviceOrientationEvent.requestPermission()이 사용자 제스처에서
 * 호출되어야 하므로, requestCompassPermission()을 반환하여 클릭 핸들러에서 호출할 수 있도록 함.
 * Non-iOS에서는 나침반이 자동으로 활성화됨.
 */
export function useMyLocation() {
  const [position, setPosition] = useState<MyLocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasOrientationSensor, setHasOrientationSensor] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastUpdateRef = useRef(0);
  const smoothedHeadingRef = useRef<number | null>(null);
  const gpsSpeedRef = useRef(0);
  const gpsHeadingRef = useRef<number | null>(null);
  const compassHeadingRef = useRef<number | null>(null);
  const compassCleanupRef = useRef<(() => void) | null>(null);
  const orientationDetectedRef = useRef(false);

  // 나침반(DeviceOrientation) 리스너 부착 — 한 번만 호출됨
  const attachCompass = useCallback(() => {
    if (compassCleanupRef.current) return; // 이미 부착됨

    function handleOrientation(e: DeviceOrientationEvent) {
      // 최초 수신 시 방향 센서 존재 확인 (PC에는 센서가 없어 이벤트가 안 들어옴)
      if (!orientationDetectedRef.current) {
        orientationDetectedRef.current = true;
        setHasOrientationSensor(true);
      }

      const wkHeading = (
        e as DeviceOrientationEvent & { webkitCompassHeading?: number }
      ).webkitCompassHeading;
      if (wkHeading != null && !isNaN(wkHeading)) {
        compassHeadingRef.current = wkHeading;
      } else if (e.alpha != null && !isNaN(e.alpha)) {
        compassHeadingRef.current = (360 - e.alpha) % 360;
      }

      // 나침반 heading이 갱신되면, GPS 속도가 낮을 때 position도 갱신
      if (
        compassHeadingRef.current != null &&
        gpsSpeedRef.current <= 1 &&
        lastPosRef.current
      ) {
        const now = Date.now();
        if (now - lastUpdateRef.current < THROTTLE_MS) return;
        lastUpdateRef.current = now;

        const raw = compassHeadingRef.current;
        let smoothed = raw;
        if (smoothedHeadingRef.current != null) {
          let delta = raw - smoothedHeadingRef.current;
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;
          smoothed =
            (smoothedHeadingRef.current + SMOOTHING_FACTOR * delta + 360) % 360;
        }
        smoothedHeadingRef.current = smoothed;

        setPosition((prev) =>
          prev ? { ...prev, heading: Math.round(smoothed) } : null,
        );
      }
    }

    window.addEventListener('deviceorientation', handleOrientation, true);
    compassCleanupRef.current = () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  // iOS 13+: 사용자 제스처(클릭/탭) 안에서 호출해야 동작
  const requestCompassPermission = useCallback(async () => {
    if (compassCleanupRef.current) return; // 이미 활성화됨
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof DOE.requestPermission === 'function') {
      try {
        const state = await DOE.requestPermission();
        if (state === 'granted') attachCompass();
        // 'denied'는 정상 흐름 — 나침반 없이 위치만 사용
      } catch (e) {
        console.error('[useMyLocation] 나침반 권한 요청 중 예외:', e);
      }
    }
  }, [attachCompass]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('geolocation_unsupported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;

        gpsSpeedRef.current = speed ?? 0;
        gpsHeadingRef.current =
          heading != null && !isNaN(heading) ? heading : null;

        // jitter 방지: 3m 미만 이동 무시 (첫 위치는 통과)
        if (lastPosRef.current) {
          const dist = haversineDistance(
            lastPosRef.current.lat,
            lastPosRef.current.lng,
            latitude,
            longitude,
          );
          if (dist < MIN_MOVE_METERS) return;
        }

        // 쓰로틀
        const now = Date.now();
        if (now - lastUpdateRef.current < THROTTLE_MS) return;
        lastUpdateRef.current = now;

        lastPosRef.current = { lat: latitude, lng: longitude };

        // heading 결정: speed > 1 m/s → GPS heading, 아니면 나침반
        const rawHeading =
          gpsSpeedRef.current > 1 && gpsHeadingRef.current != null
            ? gpsHeadingRef.current
            : compassHeadingRef.current;

        // 지수 평활화
        let smoothed: number | null = null;
        if (rawHeading != null) {
          if (smoothedHeadingRef.current == null) {
            smoothed = rawHeading;
          } else {
            let delta = rawHeading - smoothedHeadingRef.current;
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            smoothed =
              (smoothedHeadingRef.current + SMOOTHING_FACTOR * delta + 360) %
              360;
          }
          smoothedHeadingRef.current = smoothed;
        }

        setPosition({
          lat: latitude,
          lng: longitude,
          heading: smoothed != null ? Math.round(smoothed) : null,
          accuracy,
        });
      },
      (err) => setError(mapGeolocationError(err)),
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      },
    );

    // 나침반: non-iOS는 자동 시작, iOS는 requestCompassPermission() 대기
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof DOE.requestPermission !== 'function') {
      attachCompass();
    }

    return () => {
      navigator.geolocation.clearWatch(watchId);
      compassCleanupRef.current?.();
    };
  }, [attachCompass]);

  // 위치 재시도 — 버튼 클릭 시 한 번 더 getCurrentPosition 호출
  const retryLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('geolocation_unsupported');
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        lastPosRef.current = { lat: latitude, lng: longitude };
        lastUpdateRef.current = Date.now();
        setPosition({
          lat: latitude,
          lng: longitude,
          heading: compassHeadingRef.current,
          accuracy,
        });
      },
      (err) => setError(mapGeolocationError(err)),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );
  }, []);

  return { position, error, hasOrientationSensor, requestCompassPermission, retryLocation };
}
