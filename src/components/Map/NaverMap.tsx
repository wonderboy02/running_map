'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useNaverMap } from '@/hooks/useNaverMap';
import { getMarkerIcon } from '@/lib/marker-config';
import type { Spot } from '@/types';

interface NaverMapProps {
  spots: Spot[];
  onMarkerClick: (spot: Spot) => void;
  selectedSpot: Spot | null;
  targetLocation: { lat: number; lng: number } | null;
  initialCenter: { lat: number; lng: number } | null;
}

export default function NaverMap({ spots, onMarkerClick, selectedSpot, targetLocation, initialCenter }: NaverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { map, isReady } = useNaverMap(containerRef);
  const markersRef = useRef<Map<string, naver.maps.Marker>>(new Map());
  const searchPinRef = useRef<naver.maps.Marker | null>(null);
  const hasMovedToInitialCenter = useRef(false);

  const createMarkerIcon = useCallback((spot: Spot) => {
    return getMarkerIcon(spot.is_highlighted, spot.categories);
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
        existing.setPosition(new naver.maps.LatLng(spot.latitude, spot.longitude));
        existing.setIcon(createMarkerIcon(spot));
        existing.setMap(map);
      } else {
        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(spot.latitude, spot.longitude),
          map,
          icon: createMarkerIcon(spot),
          zIndex: spot.is_highlighted ? 100 : 1,
        });

        naver.maps.Event.addListener(marker, 'click', () => {
          onMarkerClick(spot);
        });

        existingMarkers.set(spot.id, marker);
      }
    });
  }, [isReady, map, spots, createMarkerIcon, onMarkerClick]);

  // 선택된 마커로 지도 이동
  useEffect(() => {
    if (!map || !selectedSpot) return;
    map.panTo(new naver.maps.LatLng(selectedSpot.latitude, selectedSpot.longitude));
  }, [map, selectedSpot]);

  // 초기 위치로 이동 (핀 없이, 한 번만)
  useEffect(() => {
    if (!map || !initialCenter || hasMovedToInitialCenter.current) return;

    const position = new naver.maps.LatLng(initialCenter.lat, initialCenter.lng);
    map.panTo(position);
    hasMovedToInitialCenter.current = true;
  }, [map, initialCenter]);

  // 검색 결과 위치로 지도 이동 + 핀 표시
  useEffect(() => {
    if (!map || !targetLocation) return;

    // 기존 검색 핀 제거
    if (searchPinRef.current) {
      searchPinRef.current.setMap(null);
      searchPinRef.current = null;
    }

    const position = new naver.maps.LatLng(targetLocation.lat, targetLocation.lng);

    // 검색 위치에 핀 마커 표시
    searchPinRef.current = new naver.maps.Marker({
      position,
      map,
      icon: {
        content: `<div style="display:flex;flex-direction:column;align-items:center;">
          <div style="width:28px;height:28px;background:#E53E3E;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
          <div style="width:6px;height:6px;background:rgba(0,0,0,0.2);border-radius:50%;margin-top:2px;"></div>
        </div>`,
        size: new naver.maps.Size(28, 38),
        anchor: new naver.maps.Point(14, 34),
      },
      zIndex: 200,
    });

    map.setZoom(15);
    map.panTo(position);
  }, [map, targetLocation]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {!isReady && (
        <div className="flex h-full items-center justify-center bg-surface-dim">
          <p className="text-text-secondary text-sm">지도를 불러오는 중...</p>
        </div>
      )}
    </div>
  );
}
