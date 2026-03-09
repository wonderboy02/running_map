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

    let interval: ReturnType<typeof setInterval> | null = null;
    let rafId: number | null = null;

    if (window.naver?.maps) {
      // 다음 프레임까지 지연 — createPortal 컨테이너 레이아웃 완료 보장
      rafId = requestAnimationFrame(() => {
        rafId = null;
        initMap();
      });
    } else {
      interval = setInterval(() => {
        if (window.naver?.maps) {
          clearInterval(interval!);
          interval = null;
          initMap();
        }
      }, 100);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (interval) clearInterval(interval);
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  return { map: mapRef.current, isReady };
}
