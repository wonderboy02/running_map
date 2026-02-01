"use client";

import { useEffect, useRef, useState } from "react";

interface UseNaverMapOptions {
  center?: { lat: number; lng: number };
  zoom?: number;
}

export function useNaverMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseNaverMapOptions = {},
) {
  const mapRef = useRef<naver.maps.Map | null>(null);
  const [isReady, setIsReady] = useState(false);

  const { center = { lat: 37.5665, lng: 126.978 }, zoom = 13 } = options;

  useEffect(() => {
    if (!containerRef.current) return;

    function initMap() {
      if (!containerRef.current || !window.naver?.maps) return;

      const map = new naver.maps.Map(containerRef.current, {
        center: new naver.maps.LatLng(center.lat, center.lng),
        zoom,
        minZoom: 10,
        maxZoom: 18,
        pinchZoom: true,
        scrollWheel: true,
        disableKineticPan: false,
        zoomControl: true,
        zoomControlOptions: {
          position: naver.maps.Position.RIGHT_CENTER,
        },
      });

      mapRef.current = map;
      setIsReady(true);
    }

    // naver.maps가 이미 로드되었으면 바로 초기화
    if (window.naver?.maps) {
      initMap();
      return;
    }

    // 아직 로드 안 됐으면 폴링으로 대기
    const interval = setInterval(() => {
      if (window.naver?.maps) {
        clearInterval(interval);
        initMap();
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  return { map: mapRef.current, isReady };
}
