'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface MyLocationPosition {
  lat: number;
  lng: number;
  heading: number | null;
  accuracy: number;
}

const MIN_MOVE_METERS = 3;
const THROTTLE_MS = 500;
const SMOOTHING_FACTOR = 0.3;

/** 두 좌표 간 대략적 거리 (미터), Haversine 근사 */
function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastUpdateRef = useRef(0);
  const smoothedHeadingRef = useRef<number | null>(null);
  const gpsSpeedRef = useRef(0);
  const gpsHeadingRef = useRef<number | null>(null);
  const compassHeadingRef = useRef<number | null>(null);
  const compassCleanupRef = useRef<(() => void) | null>(null);

  // 나침반(DeviceOrientation) 리스너 부착 — 한 번만 호출됨
  const attachCompass = useCallback(() => {
    if (compassCleanupRef.current) return; // 이미 부착됨

    function handleOrientation(e: DeviceOrientationEvent) {
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
      } catch {
        // 권한 거부 — 나침반 없이 진행
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
          const dist = distanceMeters(
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
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError('permission_denied');
        }
      },
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

  return { position, error, requestCompassPermission };
}
