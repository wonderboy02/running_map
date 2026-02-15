'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useNaverMap } from '@/hooks/useNaverMap';
import { getSpotMarkerIcon, getCoursePinIcon, getSearchPinIcon, preloadMarkerImages, CAPTION_HEIGHT } from '@/lib/marker-config';
import { computeVisibleCaptions, type MarkerPixelInfo } from '@/lib/caption-collision';
import { rewriteStorageUrl } from '@/lib/utils';
import {
  MyLocationMarker,
  type MyLocationState,
} from '@/components/Map/MyLocationMarker';
import type { MyLocationPosition } from '@/hooks/useMyLocation';
import type { Spot, Course, DrawerSelection } from '@/types';

interface NaverMapProps {
  spots: Spot[];
  courses?: Course[];
  showCourses?: boolean;
  onMarkerClick: (spot: Spot) => void;
  onCoursePinClick: (course: Course) => void;
  selection: DrawerSelection | null;
  targetLocation: { lat: number; lng: number; name?: string } | null;
  myLocation?: MyLocationPosition | null;
  onMapDrag?: () => void;
  onMapReady?: (map: naver.maps.Map) => void;
}

/** 캡션 충돌 감지 수직 임계값 (아이콘 높이 + 캡션 높이 고려) */
const CAPTION_COLLISION_THRESHOLD_Y = CAPTION_HEIGHT + 14;

export default function NaverMap({ spots, courses = [], showCourses = true, onMarkerClick, onCoursePinClick, selection, targetLocation, myLocation, onMapDrag, onMapReady }: NaverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { map, isReady } = useNaverMap(containerRef);
  const markersRef = useRef<Map<string, naver.maps.Marker>>(new Map());
  const groundOverlaysRef = useRef<Map<string, naver.maps.GroundOverlay>>(new Map());
  const overlayUrlsRef = useRef<Map<string, string>>(new Map());
  const coursePinsRef = useRef<Map<string, naver.maps.Marker>>(new Map());
  const searchPinRef = useRef<naver.maps.Marker | null>(null);
  const myLocationMarkerRef = useRef<MyLocationMarker | null>(null);
  const hasMovedToInitialPos = useRef(false);
  const captionVisibleIdsRef = useRef<Set<string>>(new Set());

  // map 준비 시 마커 이미지 프리로드 + 부모에게 전달
  useEffect(() => {
    if (isReady && map) {
      preloadMarkerImages();
      onMapReady?.(map);
    }
  }, [isReady, map, onMapReady]);

  // 캡션 충돌 감지: 모든 마커의 픽셀 좌표를 비교하여 겹치는 캡션을 숨긴다
  const recalcCaptions = useCallback(() => {
    if (!map) return;

    const projection = map.getProjection();
    const selectedSpotId = selection?.type === 'spot' ? selection.data.id : null;
    const selectedCourseId = selection?.type === 'course' ? selection.data.id : null;

    const allMarkerInfos: MarkerPixelInfo[] = [];

    // 스팟 마커 수집
    markersRef.current.forEach((marker, id) => {
      if (!marker.getMap()) return;
      const pos = marker.getPosition();
      const offset = projection.fromCoordToOffset(pos);
      allMarkerInfos.push({ id, px: offset.x, py: offset.y, isSelected: id === selectedSpotId });
    });

    // 코스 핀 마커 수집
    coursePinsRef.current.forEach((marker, key) => {
      if (!marker.getMap()) return;
      const pos = marker.getPosition();
      const offset = projection.fromCoordToOffset(pos);
      const courseId = key.split('_')[0];
      allMarkerInfos.push({ id: key, px: offset.x, py: offset.y, isSelected: courseId === selectedCourseId });
    });

    const newVisible = computeVisibleCaptions(allMarkerInfos, 80, CAPTION_COLLISION_THRESHOLD_Y);
    const prevVisible = captionVisibleIdsRef.current;

    // 변경된 스팟 마커만 아이콘 업데이트
    markersRef.current.forEach((marker, id) => {
      const wasVisible = prevVisible.has(id);
      const nowVisible = newVisible.has(id);
      if (wasVisible !== nowVisible) {
        const spot = spots.find((s) => s.id === id);
        if (spot) {
          const isSelected = id === selectedSpotId;
          marker.setIcon(getSpotMarkerIcon(spot.categories, isSelected, nowVisible ? spot.name : undefined));
        }
      }
    });

    // 변경된 코스 핀만 아이콘 업데이트
    coursePinsRef.current.forEach((marker, key) => {
      const wasVisible = prevVisible.has(key);
      const nowVisible = newVisible.has(key);
      if (wasVisible !== nowVisible) {
        const courseId = key.split('_')[0];
        const course = courses.find((c) => c.id === courseId);
        if (course) {
          const isSelected = courseId === selectedCourseId;
          marker.setIcon(getCoursePinIcon(isSelected, nowVisible ? course.name : undefined));
        }
      }
    });

    captionVisibleIdsRef.current = newVisible;
  }, [map, spots, courses, selection]);

  // idle 이벤트로 캡션 충돌 재계산 (줌/팬 완료 시)
  useEffect(() => {
    if (!isReady || !map) return;

    const listener = naver.maps.Event.addListener(map, 'idle', () => {
      recalcCaptions();
    });

    // 초기 계산
    recalcCaptions();

    return () => {
      naver.maps.Event.removeListener(listener);
    };
  }, [isReady, map, recalcCaptions]);

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
      const showCaption = isSelected || captionVisibleIdsRef.current.has(spot.id);
      const icon = getSpotMarkerIcon(spot.categories, isSelected, showCaption ? spot.name : undefined);
      const existing = existingMarkers.get(spot.id);

      if (existing) {
        existing.setPosition(new naver.maps.LatLng(spot.latitude, spot.longitude));
        existing.setIcon(icon);
        existing.setZIndex(isSelected ? 200 : 1);
        existing.setMap(map);
      } else {
        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(spot.latitude, spot.longitude),
          map,
          icon,
          zIndex: isSelected ? 200 : 1,
        });

        naver.maps.Event.addListener(marker, 'click', () => {
          onMarkerClick(spot);
        });

        existingMarkers.set(spot.id, marker);
      }
    });

    // 마커 동기화 후 캡션 충돌 재계산
    recalcCaptions();
  }, [isReady, map, spots, onMarkerClick, selection, recalcCaptions]);

  // 선택된 마커/핀으로 지도 이동 (줌 유지)
  useEffect(() => {
    if (!map || !selection) return;

    if (selection.type === 'spot') {
      const pos = new naver.maps.LatLng(selection.data.latitude, selection.data.longitude);
      // 이미 뷰포트 안에 있으면 패닝 생략
      const bounds = map.getBounds() as naver.maps.LatLngBounds;
      if (!bounds.hasLatLng(pos)) {
        map.panTo(pos);
      }
    } else if (selection.type === 'course') {
      const course = selection.data;
      // bounds를 20% 확장하여 코스 주변 여유 공간 확보
      const latSpan = course.nw_lat - course.se_lat;
      const lngSpan = course.se_lng - course.nw_lng;
      const latPad = latSpan * 0.15;
      const lngPad = lngSpan * 0.15;
      const bounds = new naver.maps.LatLngBounds(
        new naver.maps.LatLng(course.se_lat - latPad, course.nw_lng - lngPad),
        new naver.maps.LatLng(course.nw_lat + latPad, course.se_lng + lngPad),
      );
      map.fitBounds(bounds);
    }
  }, [map, selection]);

  // 내 위치 파란 점 마커 표시/업데이트
  useEffect(() => {
    if (!isReady || !map) return;

    if (!myLocation) {
      // 위치 없음 → 마커 제거
      if (myLocationMarkerRef.current) {
        myLocationMarkerRef.current.destroy();
        myLocationMarkerRef.current = null;
      }
      return;
    }

    const state: MyLocationState = {
      lat: myLocation.lat,
      lng: myLocation.lng,
      heading: myLocation.heading,
      accuracy: myLocation.accuracy,
    };

    if (!myLocationMarkerRef.current) {
      myLocationMarkerRef.current = new MyLocationMarker(map, state);

      // 첫 위치 수신 시 한 번만 지도 이동
      if (!hasMovedToInitialPos.current) {
        map.panTo(new naver.maps.LatLng(state.lat, state.lng));
        hasMovedToInitialPos.current = true;
      }
    } else {
      myLocationMarkerRef.current.update(state);
    }
  }, [isReady, map, myLocation]);

  // 지도 드래그 감지 → 부모에게 알림
  useEffect(() => {
    if (!isReady || !map || !onMapDrag) return;

    const listener = naver.maps.Event.addListener(map, 'dragstart', () => {
      onMapDrag();
    });

    return () => {
      naver.maps.Event.removeListener(listener);
    };
  }, [isReady, map, onMapDrag]);

  // MyLocationMarker 언마운트 시 cleanup
  useEffect(() => {
    return () => {
      myLocationMarkerRef.current?.destroy();
      myLocationMarkerRef.current = null;
    };
  }, []);

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

  // GroundOverlay 렌더링 — 인스턴스는 유지하고 showCourses로 가시성만 토글
  // selection deps 포함: 코스 선택 시 highlight_image_url로 이미지 교체
  useEffect(() => {
    if (!isReady || !map) return;

    const selectedCourseId =
      selection?.type === 'course' ? selection.data.id : null;

    const currentIds = new Set(courses.map((o) => o.id));
    const existingOverlays = groundOverlaysRef.current;

    // 더 이상 없는 GroundOverlay 제거
    existingOverlays.forEach((groundOverlay, id) => {
      if (!currentIds.has(id)) {
        groundOverlay.setMap(null);
        existingOverlays.delete(id);
        overlayUrlsRef.current.delete(id);
      }
    });

    // 새로운 코스 오버레이 추가 또는 기존 이미지 교체 + 가시성 토글
    courses.forEach((course) => {
      const existing = existingOverlays.get(course.id);
      const isSelected = course.id === selectedCourseId;

      // 하이라이팅 이미지가 있고 선택된 경우 → 하이라이팅 URL 사용
      const targetUrl = (isSelected && course.highlight_image_url)
        ? course.highlight_image_url
        : course.image_url;

      // Vercel Edge 캐싱을 위해 같은 도메인 경로로 변환
      const imageUrl = rewriteStorageUrl(targetUrl);

      if (existing) {
        // URL이 실제로 변경된 경우에만 setUrl() 호출 — 불필요한 이미지 리로드/깜빡임 방지
        const prevUrl = overlayUrlsRef.current.get(course.id);
        if (prevUrl !== imageUrl) {
          existing.setUrl(imageUrl);
          overlayUrlsRef.current.set(course.id, imageUrl);
        }
        existing.setMap(showCourses ? map : null);
      } else {
        // NW/SE → SW/NE 변환 (LatLngBounds 용)
        const sw = new naver.maps.LatLng(course.se_lat, course.nw_lng);
        const ne = new naver.maps.LatLng(course.nw_lat, course.se_lng);
        const bounds = new naver.maps.LatLngBounds(sw, ne);

        const groundOverlay = new naver.maps.GroundOverlay(
          imageUrl,
          bounds,
          { opacity: course.opacity, clickable: false },
        );

        groundOverlay.setMap(showCourses ? map : null);
        existingOverlays.set(course.id, groundOverlay);
        overlayUrlsRef.current.set(course.id, imageUrl);
      }
    });

    // 선택된 오버레이를 최상위로 — GroundOverlay는 zIndex를 지원하지 않으므로
    // setMap(null) → setMap(map) 재추가하여 가장 나중에 그려지게 함
    if (showCourses && selectedCourseId) {
      const selectedOverlay = existingOverlays.get(selectedCourseId);
      if (selectedOverlay) {
        selectedOverlay.setMap(null);
        selectedOverlay.setMap(map);
      }
    }
  }, [isReady, map, courses, showCourses, selection]);

  // 코스 핀 마커 렌더링 (멀티 핀포인트, 선택 상태 + 가시성 반영)
  // 스팟 마커와 별도 effect — 데이터 소스(courses)와 라이프사이클이 다르기 때문
  useEffect(() => {
    if (!isReady || !map) return;

    const existingPins = coursePinsRef.current;
    const selectedCourseId =
      selection?.type === 'course' ? selection.data.id : null;

    // 유효한 키 수집 (courseId_index)
    const expectedKeys = new Set<string>();
    for (const course of courses) {
      for (let i = 0; i < course.pinpoints.length; i++) {
        expectedKeys.add(`${course.id}_${i}`);
      }
    }

    // 더 이상 없는 핀 제거
    existingPins.forEach((marker, key) => {
      if (!expectedKeys.has(key)) {
        marker.setMap(null);
        existingPins.delete(key);
      }
    });

    // 새로운 핀 추가 또는 기존 핀 아이콘/가시성 업데이트
    for (const course of courses) {
      const isSelected = course.id === selectedCourseId;
      const pinVisible = showCourses;

      for (let i = 0; i < course.pinpoints.length; i++) {
        const pin = course.pinpoints[i];
        const key = `${course.id}_${i}`;
        const showCaption = isSelected || captionVisibleIdsRef.current.has(key);
        const icon = getCoursePinIcon(isSelected, showCaption ? course.name : undefined);
        const existing = existingPins.get(key);

        if (existing) {
          existing.setPosition(new naver.maps.LatLng(pin.lat, pin.lng));
          existing.setIcon(icon);
          existing.setZIndex(isSelected ? 200 : 50);
          existing.setMap(pinVisible ? map : null);
        } else {
          const marker = new naver.maps.Marker({
            position: new naver.maps.LatLng(pin.lat, pin.lng),
            map: pinVisible ? map : null,
            icon,
            zIndex: isSelected ? 200 : 50,
          });

          naver.maps.Event.addListener(marker, 'click', () => {
            onCoursePinClick(course);
          });

          existingPins.set(key, marker);
        }
      }
    }

    // 핀 동기화 후 캡션 충돌 재계산
    recalcCaptions();
  }, [isReady, map, courses, onCoursePinClick, selection, showCourses, recalcCaptions]);

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
