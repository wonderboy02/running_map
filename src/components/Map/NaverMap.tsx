'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useNaverMap } from '@/hooks/useNaverMap';
import { getSpotMarkerIcon, getCoursePinIcon, getSearchPinIcon, preloadMarkerImages } from '@/lib/marker-config';
import type { Spot, Course, DrawerSelection } from '@/types';

interface NaverMapProps {
  spots: Spot[];
  courses?: Course[];
  onMarkerClick: (spot: Spot) => void;
  onCoursePinClick: (course: Course) => void;
  selection: DrawerSelection | null;
  targetLocation: { lat: number; lng: number; name?: string } | null;
  initialCenter: { lat: number; lng: number } | null;
  onMapReady?: (map: naver.maps.Map) => void;
}

export default function NaverMap({ spots, courses = [], onMarkerClick, onCoursePinClick, selection, targetLocation, initialCenter, onMapReady }: NaverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { map, isReady } = useNaverMap(containerRef);
  const markersRef = useRef<Map<string, naver.maps.Marker>>(new Map());
  const groundOverlaysRef = useRef<Map<string, naver.maps.GroundOverlay>>(new Map());
  const coursePinsRef = useRef<Map<string, naver.maps.Marker>>(new Map());
  const searchPinRef = useRef<naver.maps.Marker | null>(null);
  const hasMovedToInitialCenter = useRef(false);

  const createMarkerIcon = useCallback((spot: Spot, isSelected: boolean) => {
    return getSpotMarkerIcon(spot.categories, spot.is_highlighted, isSelected, spot.name);
  }, []);

  // map 준비 시 마커 이미지 프리로드 + 부모에게 전달
  useEffect(() => {
    if (isReady && map) {
      preloadMarkerImages();
      onMapReady?.(map);
    }
  }, [isReady, map, onMapReady]);

  // 마커 동기화 — spots 데이터 변경 또는 선택 변경 시 마커 생성/제거/아이콘 업데이트
  // selection이 deps에 포함되어 단일 effect에서 선택 상태까지 처리.
  // 스팟 수십~수백 개 규모에서 전체 순회 setIcon() 비용은 < 1ms로 무시 가능.
  useEffect(() => {
    if (!isReady || !map) return;

    const currentIds = new Set(spots.map((s) => s.id));
    const existingMarkers = markersRef.current;
    const selectedSpotId =
      selection?.type === 'spot' ? selection.data.id : null;

    // 더 이상 없는 마커 제거
    existingMarkers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        existingMarkers.delete(id);
      }
    });

    // 새로운 마커 추가 또는 기존 마커 업데이트
    spots.forEach((spot) => {
      const isSelected = spot.id === selectedSpotId;
      const existing = existingMarkers.get(spot.id);

      if (existing) {
        existing.setPosition(new naver.maps.LatLng(spot.latitude, spot.longitude));
        existing.setIcon(createMarkerIcon(spot, isSelected));
        existing.setZIndex(isSelected ? 200 : spot.is_highlighted ? 100 : 1);
        existing.setMap(map);
      } else {
        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(spot.latitude, spot.longitude),
          map,
          icon: createMarkerIcon(spot, isSelected),
          zIndex: isSelected ? 200 : spot.is_highlighted ? 100 : 1,
        });

        naver.maps.Event.addListener(marker, 'click', () => {
          onMarkerClick(spot);
        });

        existingMarkers.set(spot.id, marker);
      }
    });
  }, [isReady, map, spots, createMarkerIcon, onMarkerClick, selection]);

  // 선택된 마커/핀으로 지도 이동
  useEffect(() => {
    if (!map || !selection) return;
    if (selection.type === 'spot') {
      map.panTo(new naver.maps.LatLng(selection.data.latitude, selection.data.longitude));
    } else if (selection.type === 'course') {
      // 코스 전체를 보여주는 fitBounds
      const course = selection.data;
      const bounds = new naver.maps.LatLngBounds(
        new naver.maps.LatLng(course.se_lat, course.nw_lng),
        new naver.maps.LatLng(course.nw_lat, course.se_lng),
      );
      map.fitBounds(bounds, { padding: 60 });
    }
  }, [map, selection]);

  // 초기 위치로 이동 (핀 없이, 한 번만)
  useEffect(() => {
    if (!map || !initialCenter || hasMovedToInitialCenter.current) return;

    const position = new naver.maps.LatLng(initialCenter.lat, initialCenter.lng);
    map.panTo(position);
    hasMovedToInitialCenter.current = true;
  }, [map, initialCenter]);

  // 검색 핀 표시/제거 — 외부 검색 결과 전용
  useEffect(() => {
    if (!map) return;

    // 기존 검색 핀 항상 제거
    if (searchPinRef.current) {
      searchPinRef.current.setMap(null);
      searchPinRef.current = null;
    }

    // targetLocation이 없으면 핀 제거만 하고 종료
    if (!targetLocation) return;

    const position = new naver.maps.LatLng(targetLocation.lat, targetLocation.lng);

    // 검색 위치에 핀 마커 표시
    searchPinRef.current = new naver.maps.Marker({
      position,
      map,
      icon: getSearchPinIcon(targetLocation.name),
      zIndex: 200,
    });

    // 외부 검색 결과: 현재 줌 유지, 너무 멀면 최소 14
    if (map.getZoom() < 14) map.setZoom(14);
    map.panTo(position);
  }, [map, targetLocation]);

  // GroundOverlay 렌더링
  useEffect(() => {
    if (!isReady || !map) return;

    const currentIds = new Set(courses.map((o) => o.id));
    const existingOverlays = groundOverlaysRef.current;

    // 더 이상 없는 GroundOverlay 제거
    existingOverlays.forEach((groundOverlay, id) => {
      if (!currentIds.has(id)) {
        groundOverlay.setMap(null);
        existingOverlays.delete(id);
      }
    });

    // 새로운 코스 오버레이 추가
    courses.forEach((course) => {
      if (existingOverlays.has(course.id)) return;

      // NW/SE → SW/NE 변환 (LatLngBounds 용)
      const sw = new naver.maps.LatLng(course.se_lat, course.nw_lng);
      const ne = new naver.maps.LatLng(course.nw_lat, course.se_lng);
      const bounds = new naver.maps.LatLngBounds(sw, ne);

      // Vercel Edge 캐싱을 위해 같은 도메인 경로로 변환
      const imageUrl = course.image_url.replace(
        /https:\/\/[^/]+\/storage\/v1\/object\/public/,
        '/storage',
      );

      const groundOverlay = new naver.maps.GroundOverlay(
        imageUrl,
        bounds,
        { opacity: course.opacity, clickable: false },
      );

      groundOverlay.setMap(map);
      existingOverlays.set(course.id, groundOverlay);
    });
  }, [isReady, map, courses]);

  // 코스 핀 마커 렌더링 (선택 상태 반영)
  // 스팟 마커와 별도 effect — 데이터 소스(courses)와 라이프사이클이 다르기 때문
  useEffect(() => {
    if (!isReady || !map) return;

    const coursesWithPin = courses.filter((o) => o.pin_lat != null && o.pin_lng != null);
    const currentIds = new Set(coursesWithPin.map((o) => o.id));
    const existingPins = coursePinsRef.current;
    const selectedCourseId =
      selection?.type === 'course' ? selection.data.id : null;

    // 더 이상 없는 핀 제거
    existingPins.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        existingPins.delete(id);
      }
    });

    // 새로운 핀 추가 또는 기존 핀 아이콘 업데이트
    coursesWithPin.forEach((course) => {
      const isSelected = course.id === selectedCourseId;
      const existing = existingPins.get(course.id);

      if (existing) {
        existing.setIcon(getCoursePinIcon(isSelected, course.name));
        existing.setZIndex(isSelected ? 200 : 50);
      } else {
        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(course.pin_lat!, course.pin_lng!),
          map,
          icon: getCoursePinIcon(isSelected, course.name),
          zIndex: isSelected ? 200 : 50,
        });

        naver.maps.Event.addListener(marker, 'click', () => {
          onCoursePinClick(course);
        });

        existingPins.set(course.id, marker);
      }
    });
  }, [isReady, map, courses, onCoursePinClick, selection]);

  return (
    <div ref={containerRef} className="relative z-0 h-full w-full">
      {!isReady && (
        <div className="flex h-full items-center justify-center bg-surface-dim">
          <p className="text-text-secondary text-sm">지도를 불러오는 중...</p>
        </div>
      )}
    </div>
  );
}
