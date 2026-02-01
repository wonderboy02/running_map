"use client";

import { useCallback, useEffect, useRef } from "react";
import { useNaverMap } from "@/hooks/useNaverMap";
import type { Spot } from "@/types";

interface NaverMapProps {
  spots: Spot[];
  onMarkerClick: (spot: Spot) => void;
  selectedSpot: Spot | null;
}

export default function NaverMap({
  spots,
  onMarkerClick,
  selectedSpot,
}: NaverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { map, isReady } = useNaverMap(containerRef);
  const markersRef = useRef<Map<string, naver.maps.Marker>>(new Map());

  const createMarkerIcon = useCallback((spot: Spot) => {
    const isHighlight = spot.is_highlighted;
    return {
      content: `<div class="${isHighlight ? "marker-highlight" : "marker-default"}"></div>`,
      size: isHighlight
        ? new naver.maps.Size(44, 44)
        : new naver.maps.Size(32, 32),
      anchor: isHighlight
        ? new naver.maps.Point(22, 44)
        : new naver.maps.Point(16, 32),
    };
  }, []);

  // 마커 생성 및 업데이트
  useEffect(() => {
    if (!isReady || !map) return;

    const currentIds = new Set(spots.map((s) => s.id));
    const existingMarkers = markersRef.current;

    // 더 이상 없는 마커 제거
    existingMarkers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        existingMarkers.delete(id);
      }
    });

    // 새로운 마커 추가 또는 기존 마커 업데이트
    spots.forEach((spot) => {
      const existing = existingMarkers.get(spot.id);

      if (existing) {
        // 이미 있으면 위치/아이콘만 업데이트
        existing.setPosition(
          new naver.maps.LatLng(spot.latitude, spot.longitude),
        );
        existing.setIcon(createMarkerIcon(spot));
        existing.setMap(map);
      } else {
        // 새 마커 생성
        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(spot.latitude, spot.longitude),
          map,
          icon: createMarkerIcon(spot),
          zIndex: spot.is_highlighted ? 100 : 1,
        });

        naver.maps.Event.addListener(marker, "click", () => {
          onMarkerClick(spot);
        });

        existingMarkers.set(spot.id, marker);
      }
    });
  }, [isReady, map, spots, createMarkerIcon, onMarkerClick]);

  // 선택된 마커로 지도 이동
  useEffect(() => {
    if (!map || !selectedSpot) return;
    map.panTo(
      new naver.maps.LatLng(selectedSpot.latitude, selectedSpot.longitude),
    );
  }, [map, selectedSpot]);

  return (
    <div ref={containerRef} className="h-full w-full">
      {!isReady && (
        <div className="flex h-full items-center justify-center bg-surface-dim">
          <p className="text-text-secondary text-sm">지도를 불러오는 중...</p>
        </div>
      )}
    </div>
  );
}
