'use client';

import { memo, useCallback, useEffect, useRef } from 'react';
import { useNaverMap } from '@/hooks/useNaverMap';
import { getSpotMarkerIcon, getCoursePinIcon, getSearchPinIcon, preloadMarkerImages, CAPTION_HEIGHT } from '@/lib/marker-config';
import { computeVisibleCaptions, type MarkerPixelInfo } from '@/lib/caption-collision';
import { rewriteStorageUrl } from '@/lib/utils';
import { computeDataLayerBounds, extractGpxEndpoints, wrapStyleHidingPoints, GPX_STROKE_COLOR, GPX_STROKE_OPACITY, GPX_HIGHLIGHT_COLOR } from '@/lib/naver-map-utils';
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
  onMapClick?: () => void;
  onMapReady?: (map: naver.maps.Map) => void;
}

/** 줌 레벨에 따른 GPX 선 두께 계산 (기본 +2 보정) */
function getStrokeWeight(zoom: number, isSelected: boolean = false): number {
  const base = Math.max(1, Math.round(Math.pow(2, (zoom - 13) / 2 + 1))) + 2;
  return isSelected ? base + 2 : base;
}

/** GPX Data Layer 스타일 생성 — Point feature(waypoint)는 숨기고 LineString만 표시 */
function buildGpxStyle(
  zoom: number,
  isSelected: boolean,
): naver.maps.Data.StylingFunction {
  return wrapStyleHidingPoints({
    strokeColor: isSelected ? GPX_HIGHLIGHT_COLOR : GPX_STROKE_COLOR,
    strokeWeight: getStrokeWeight(zoom, isSelected),
    strokeOpacity: isSelected ? 1.0 : GPX_STROKE_OPACITY,
    clickable: false,
    zIndex: isSelected ? 100 : 1,
  });
}

/** 캡션 충돌 감지 수직 임계값 (아이콘 높이 + 캡션 높이 고려) */
const CAPTION_COLLISION_THRESHOLD_Y = CAPTION_HEIGHT + 14;

const NaverMap = memo(function NaverMap({ spots, courses = [], showCourses = true, onMarkerClick, onCoursePinClick, selection, targetLocation, myLocation, onMapDrag, onMapClick, onMapReady }: NaverMapProps) {
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
  const courseDataLayersRef = useRef<Map<string, {
    data: naver.maps.Data;
    features: naver.maps.Data.Feature[];
  }>>(new Map());
  const gpxEndpointMarkersRef = useRef<Map<string, { start: naver.maps.Marker; end: naver.maps.Marker }>>(new Map());

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
          marker.setIcon(getSpotMarkerIcon(spot.category, isSelected, nowVisible ? spot.name : undefined));
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

  // GPX 줌 연동 — 줌 또는 선택 코스가 변경된 경우에만 setStyle 호출
  const lastGpxStateRef = useRef<{ zoom: number; selectedId: string | null } | null>(null);

  const updateGpxStrokeWeights = useCallback(() => {
    if (!map) return;
    const zoom = map.getZoom();
    const selectedCourseId =
      selection?.type === 'course' ? selection.data.id : null;

    const prev = lastGpxStateRef.current;
    if (prev && prev.zoom === zoom && prev.selectedId === selectedCourseId) return;
    lastGpxStateRef.current = { zoom, selectedId: selectedCourseId };

    courseDataLayersRef.current.forEach(({ data }, courseId) => {
      const isSelected = courseId === selectedCourseId;
      data.setStyle(buildGpxStyle(zoom, isSelected));
    });
  }, [map, selection]);

  // ref 패턴으로 idle listener lifecycle을 callback identity와 분리
  const recalcCaptionsRef = useRef(recalcCaptions);
  const updateGpxStrokeWeightsRef = useRef(updateGpxStrokeWeights);
  recalcCaptionsRef.current = recalcCaptions;
  updateGpxStrokeWeightsRef.current = updateGpxStrokeWeights;

  // microtask 디바운스 — 동일 React commit 내 recalcCaptions 1회만 실행
  const captionRecalcScheduledRef = useRef(false);

  const scheduleRecalcCaptions = useCallback(() => {
    if (captionRecalcScheduledRef.current) return;
    captionRecalcScheduledRef.current = true;
    queueMicrotask(() => {
      captionRecalcScheduledRef.current = false;
      recalcCaptionsRef.current();
    });
  }, []);

  // idle 이벤트로 캡션 충돌 재계산 (줌/팬 완료 시)
  useEffect(() => {
    if (!isReady || !map) return;

    const listener = naver.maps.Event.addListener(map, 'idle', () => {
      recalcCaptionsRef.current();
      updateGpxStrokeWeightsRef.current();
    });

    // 초기 계산
    recalcCaptionsRef.current();

    return () => {
      naver.maps.Event.removeListener(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, map]);

  // diff 기반 마커 업데이트 — selection만 변경 시 fast path (최대 2개만 업데이트)
  const prevSyncStateRef = useRef<{
    spots: Spot[];
    selectedSpotId: string | null;
  } | null>(null);

  // 마커 동기화 — spots 데이터 변경 또는 선택 변경 시 마커 생성/제거/아이콘 업데이트
  // selection이 deps에 포함되어 단일 effect에서 선택 상태까지 처리.
  useEffect(() => {
    if (!isReady || !map) return;

    const existingMarkers = markersRef.current;
    const selectedSpotId =
      selection?.type === 'spot' ? selection.data.id : null;

    const prev = prevSyncStateRef.current;
    const isSelectionOnlyChange = prev
      && prev.spots === spots          // useMemo로 안정된 참조
      && prev.selectedSpotId !== selectedSpotId;

    if (isSelectionOnlyChange) {
      // Fast path: 이전 선택 + 새 선택 마커만 업데이트 (최대 2개)
      const idsToUpdate = new Set<string>();
      if (prev.selectedSpotId) idsToUpdate.add(prev.selectedSpotId);
      if (selectedSpotId) idsToUpdate.add(selectedSpotId);

      idsToUpdate.forEach((id) => {
        const marker = existingMarkers.get(id);
        const spot = spots.find((s) => s.id === id);
        if (!marker || !spot) return;
        const isSelected = id === selectedSpotId;
        const showCaption = isSelected || captionVisibleIdsRef.current.has(id);
        marker.setIcon(getSpotMarkerIcon(spot.category, isSelected, showCaption ? spot.name : undefined));
        marker.setZIndex(isSelected ? 200 : spot.category === '러너스팟' ? 10 : 1);
      });
    } else {
      // Full sync: 마커 생성/제거/전체 업데이트
      const currentIds = new Set(spots.map((s) => s.id));

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
        const icon = getSpotMarkerIcon(spot.category, isSelected, showCaption ? spot.name : undefined);
        const existing = existingMarkers.get(spot.id);

        if (existing) {
          existing.setPosition(new naver.maps.LatLng(spot.latitude, spot.longitude));
          existing.setIcon(icon);
          existing.setZIndex(isSelected ? 200 : spot.category === '러너스팟' ? 10 : 1);
          existing.setMap(map);
        } else {
          const marker = new naver.maps.Marker({
            position: new naver.maps.LatLng(spot.latitude, spot.longitude),
            map,
            icon,
            zIndex: isSelected ? 200 : spot.category === '러너스팟' ? 10 : 1,
          });

          naver.maps.Event.addListener(marker, 'click', () => {
            onMarkerClick(spot);
          });

          existingMarkers.set(spot.id, marker);
        }
      });
    }

    prevSyncStateRef.current = { spots, selectedSpotId };

    // 마커 동기화 후 캡션 충돌 재계산 (microtask 디바운스)
    scheduleRecalcCaptions();
  }, [isReady, map, spots, onMarkerClick, selection, scheduleRecalcCaptions]);

  // 선택된 마커/핀으로 지도 이동 (줌 유지)
  useEffect(() => {
    if (!map || !selection) return;

    // 컨테이너가 hidden→visible 전환된 경우 크기 복원 (fitBounds 전에 실행)
    if (typeof (map as any).autoResize === 'function') {
      (map as any).autoResize();
    }

    if (selection.type === 'spot') {
      const pos = new naver.maps.LatLng(selection.data.latitude, selection.data.longitude);
      // 이미 뷰포트 안에 있으면 패닝 생략
      const bounds = map.getBounds() as naver.maps.LatLngBounds;
      if (!bounds.hasLatLng(pos)) {
        map.panTo(pos);
      }
    } else if (selection.type === 'course') {
      const course = selection.data;

      if (course.gpx_file_url) {
        // GPX 코스: Data Layer bounds
        const layer = courseDataLayersRef.current.get(course.id);
        if (layer) {
          const gpxBounds = computeDataLayerBounds(layer.data);
          if (gpxBounds) {
            const isMobile = window.innerWidth <= 768;
            map.fitBounds(gpxBounds, { padding: isMobile ? 60 : 40 });
          }
        }
      } else {
        // PNG 코스: NW/SE 기반 (기존 로직 유지)
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
          const bounds = new naver.maps.LatLngBounds(
            new naver.maps.LatLng(course.se_lat, course.nw_lng),
            new naver.maps.LatLng(course.nw_lat, course.se_lng),
          );
          map.fitBounds(bounds, { padding: 60 });
        } else {
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
      }
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

  // 지도 빈 영역 클릭 → 선택 해제
  useEffect(() => {
    if (!isReady || !map || !onMapClick) return;

    const listener = naver.maps.Event.addListener(map, 'click', () => {
      onMapClick();
    });

    return () => {
      naver.maps.Event.removeListener(listener);
    };
  }, [isReady, map, onMapClick]);

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

    const overlayCourses = courses.filter((c) => !c.gpx_file_url);
    const currentIds = new Set(overlayCourses.map((o) => o.id));
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
    overlayCourses.forEach((course) => {
      if (!course.image_url) return;

      const existing = existingOverlays.get(course.id);
      const isSelected = course.id === selectedCourseId;

      // 하이라이팅 이미지가 있고 선택된 경우 → 하이라이팅 URL 사용
      const targetUrl = (isSelected && course.highlight_image_url)
        ? course.highlight_image_url
        : course.image_url;

      if (!targetUrl) {
        console.warn(`Course "${course.name}" has no image URL, skipping overlay`);
        return;
      }

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

  // GPX Data Layer 렌더링 + 시작/끝 엔드포인트 마커
  useEffect(() => {
    if (!isReady || !map) return;
    let cancelled = false;

    const selectedCourseId =
      selection?.type === 'course' ? selection.data.id : null;

    const gpxCourses = courses.filter((c) => !!c.gpx_file_url);
    const gpxCourseIds = new Set(gpxCourses.map((c) => c.id));

    // 삭제된 코스의 Data Layer + 엔드포인트 마커 제거
    courseDataLayersRef.current.forEach(({ data }, id) => {
      if (!gpxCourseIds.has(id)) {
        data.setMap(null);
        courseDataLayersRef.current.delete(id);
        const ep = gpxEndpointMarkersRef.current.get(id);
        if (ep) {
          ep.start.setMap(null);
          ep.end.setMap(null);
          gpxEndpointMarkersRef.current.delete(id);
        }
      }
    });

    // 각 GPX 코스 처리
    gpxCourses.forEach((course) => {
      const existing = courseDataLayersRef.current.get(course.id);
      const isSelected = course.id === selectedCourseId;

      if (existing) {
        // 이미 로드됨 → 스타일 + 가시성만 업데이트
        existing.data.setStyle(buildGpxStyle(map.getZoom(), isSelected));
        existing.data.setMap(showCourses ? map : null);

        // 엔드포인트 마커 아이콘 + 가시성 업데이트
        const ep = gpxEndpointMarkersRef.current.get(course.id);
        if (ep) {
          const icon = getCoursePinIcon(isSelected);
          ep.start.setIcon(icon);
          ep.end.setIcon(icon);
          ep.start.setZIndex(isSelected ? 200 : 5);
          ep.end.setZIndex(isSelected ? 200 : 5);
          ep.start.setMap(showCourses ? map : null);
          ep.end.setMap(showCourses ? map : null);
        }
      } else {
        // 새로 로드
        loadGpxCourse(course, map, showCourses, isSelected);
      }
    });

    async function loadGpxCourse(
      course: Course,
      mapInstance: naver.maps.Map,
      visible: boolean,
      isSelected: boolean,
    ) {
      if (!course.gpx_file_url) return;
      try {
        const res = await fetch(rewriteStorageUrl(course.gpx_file_url));
        const text = await res.text();

        if (cancelled) return;

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');

        const dataLayer = new naver.maps.Data();
        const features = dataLayer.addGpx(xmlDoc);

        dataLayer.setStyle(buildGpxStyle(mapInstance.getZoom(), isSelected));
        dataLayer.setMap(visible ? mapInstance : null);
        courseDataLayersRef.current.set(course.id, { data: dataLayer, features });

        // 시작/끝 엔드포인트 마커 생성
        const endpoints = extractGpxEndpoints(dataLayer);
        if (endpoints) {
          const icon = getCoursePinIcon(isSelected);
          const startMarker = new naver.maps.Marker({
            position: new naver.maps.LatLng(endpoints.start.lat, endpoints.start.lng),
            map: visible ? mapInstance : null,
            icon,
            zIndex: isSelected ? 200 : 5,
          });
          const endMarker = new naver.maps.Marker({
            position: new naver.maps.LatLng(endpoints.end.lat, endpoints.end.lng),
            map: visible ? mapInstance : null,
            icon,
            zIndex: isSelected ? 200 : 5,
          });

          // 클릭 시 코스 선택
          naver.maps.Event.addListener(startMarker, 'click', () => onCoursePinClick(course));
          naver.maps.Event.addListener(endMarker, 'click', () => onCoursePinClick(course));

          gpxEndpointMarkersRef.current.set(course.id, { start: startMarker, end: endMarker });
        }
      } catch (err) {
        console.error(`[NaverMap] GPX 로드 실패 (${course.name}):`, err);
      }
    }

    return () => { cancelled = true; };
  }, [isReady, map, courses, showCourses, selection, onCoursePinClick]);

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
          existing.setZIndex(isSelected ? 200 : 5);
          existing.setMap(pinVisible ? map : null);
        } else {
          const marker = new naver.maps.Marker({
            position: new naver.maps.LatLng(pin.lat, pin.lng),
            map: pinVisible ? map : null,
            icon,
            zIndex: isSelected ? 200 : 5,
          });

          naver.maps.Event.addListener(marker, 'click', () => {
            onCoursePinClick(course);
          });

          existingPins.set(key, marker);
        }
      }
    }

    // 핀 동기화 후 캡션 충돌 재계산 (microtask 디바운스)
    scheduleRecalcCaptions();
  }, [isReady, map, courses, onCoursePinClick, selection, showCourses, scheduleRecalcCaptions]);

  // GPX Data Layer + 엔드포인트 마커 cleanup
  useEffect(() => {
    return () => {
      courseDataLayersRef.current.forEach(({ data }) => data.setMap(null));
      courseDataLayersRef.current.clear();
      gpxEndpointMarkersRef.current.forEach(({ start, end }) => {
        start.setMap(null);
        end.setMap(null);
      });
      gpxEndpointMarkersRef.current.clear();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative z-0 h-full w-full">
      {!isReady && (
        <div className="flex h-full items-center justify-center bg-surface-dim">
          <p className="text-text-secondary text-sm">지도를 불러오는 중...</p>
        </div>
      )}
    </div>
  );
});

export default NaverMap;
