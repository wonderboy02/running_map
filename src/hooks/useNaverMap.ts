'use client';

import { useEffect, useRef, useState } from 'react';

interface UseNaverMapOptions {
  center?: { lat: number; lng: number };
  zoom?: number;
  mapTypeId?: string;
  tileTransition?: boolean;
  scaleControl?: boolean;
}

export function useNaverMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseNaverMapOptions = {}
) {
  const mapRef = useRef<naver.maps.Map | null>(null);
  const [isReady, setIsReady] = useState(false);

  const {
    center = { lat: 37.5247, lng: 126.9244 },
    zoom = 13,
    tileTransition = true,
    scaleControl = false,
  } = options;

  useEffect(() => {
    if (!containerRef.current) return;

    function initMap() {
      if (!containerRef.current || !window.naver?.maps) return;

      const mapOptions: naver.maps.MapOptions = {
        center: new naver.maps.LatLng(center.lat, center.lng),
        zoom,
        minZoom: 10,
        maxZoom: 18,
        pinchZoom: true,
        scrollWheel: true,
        disableKineticPan: false,
        zoomControl: false,
        tileTransition,
        scaleControl,
        mapDataControl: false,
        gl: true,
        customStyleId: process.env.NEXT_PUBLIC_NAVER_MAP_STYLE_ID,
      };

      if (options.mapTypeId && naver.maps.MapTypeId) {
        mapOptions.mapTypeId =
          naver.maps.MapTypeId[options.mapTypeId as keyof typeof naver.maps.MapTypeId] ||
          options.mapTypeId;
      }

      const map = new naver.maps.Map(containerRef.current, mapOptions);

      mapRef.current = map;
      setIsReady(true);
    }

    let initialized = false;
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    function tryInit() {
      if (cancelled || initialized || !containerRef.current || !window.naver?.maps) return;
      const { offsetWidth, offsetHeight } = containerRef.current;
      if (offsetWidth === 0 || offsetHeight === 0) return;

      initialized = true;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      initMap();
    }

    // 컨테이너 레이아웃 감지 (createPortal 대응)
    observer = new ResizeObserver(tryInit);
    observer.observe(containerRef.current);

    // naver.maps 스크립트 로딩 폴링 (아직 미로드 시)
    if (!window.naver?.maps) {
      interval = setInterval(() => {
        if (cancelled) return;
        if (window.naver?.maps) {
          clearInterval(interval!);
          interval = null;
          tryInit();
        }
      }, 100);
    }

    // 이미 조건이 충족된 경우 즉시 초기화 시도
    tryInit();

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (interval) clearInterval(interval);
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  return { map: mapRef.current, isReady };
}
