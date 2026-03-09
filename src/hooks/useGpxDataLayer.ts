'use client';

import { useEffect, useRef } from 'react';
import { rewriteStorageUrl } from '@/lib/utils';
import {
  computeDataLayerBounds,
  wrapStyleHidingPoints,
  GPX_STROKE_COLOR,
  GPX_STROKE_OPACITY,
  GPX_PREVIEW_STROKE_WEIGHT,
} from '@/lib/naver-map-utils';

interface UseGpxDataLayerOptions {
  map: naver.maps.Map | null;
  isReady: boolean;
  gpxSource: File | string | null;
  fitPadding?: number;
}

/**
 * GPX Data Layer를 네이버 지도에 렌더링하는 공통 훅.
 * gpxSource가 File이면 .text(), string이면 fetch로 GPX 텍스트를 가져온다.
 * DOMParser → naver.maps.Data.addGpx() → setStyle() → setMap() → fitBounds()
 */
export function useGpxDataLayer({
  map,
  isReady,
  gpxSource,
  fitPadding = 40,
}: UseGpxDataLayerOptions): void {
  const dataLayerRef = useRef<naver.maps.Data | null>(null);

  useEffect(() => {
    if (!isReady || !map || !gpxSource) return;
    const currentMap = map;
    let cancelled = false;

    if (dataLayerRef.current) {
      dataLayerRef.current.setMap(null);
      dataLayerRef.current = null;
    }

    async function loadGpx() {
      let gpxText: string;
      if (gpxSource instanceof File) {
        gpxText = await gpxSource.text();
      } else {
        const res = await fetch(rewriteStorageUrl(gpxSource as string));
        if (!res.ok) throw new Error(`GPX fetch failed: ${res.status}`);
        gpxText = await res.text();
      }

      if (cancelled) return;

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(gpxText, 'text/xml');
      const dataLayer = new naver.maps.Data();
      const features = dataLayer.addGpx(xmlDoc);

      dataLayer.setStyle(wrapStyleHidingPoints({
        strokeColor: GPX_STROKE_COLOR,
        strokeWeight: GPX_PREVIEW_STROKE_WEIGHT,
        strokeOpacity: GPX_STROKE_OPACITY,
        clickable: false,
      }));

      dataLayer.setMap(currentMap);
      dataLayerRef.current = dataLayer;

      if (features.length > 0) {
        const gpxBounds = computeDataLayerBounds(dataLayer);
        if (gpxBounds) currentMap.fitBounds(gpxBounds, { padding: fitPadding });
      }
    }

    loadGpx().catch(console.error);

    return () => {
      cancelled = true;
      if (dataLayerRef.current) {
        dataLayerRef.current.setMap(null);
        dataLayerRef.current = null;
      }
    };
  }, [isReady, map, gpxSource, fitPadding]);
}
