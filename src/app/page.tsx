'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import NaverMap from '@/components/Map/NaverMap';
import Header from '@/components/Header';
import FilterChips from '@/components/FilterChips';
import BottomDrawer from '@/components/BottomDrawer';
import FloatingControls from '@/components/FloatingControls';
import SearchOverlay from '@/components/Search/SearchOverlay';
import BottomNavigation from '@/components/BottomNavigation';
import CourseExplorer from '@/components/CourseExplorer';
import ComingSoon from '@/components/ComingSoon';
import { useSpots } from '@/hooks/useSpots';
import { useCourses } from '@/hooks/useCourses';
import { useMyLocation } from '@/hooks/useMyLocation';
import type { Spot, Course, DrawerSelection, AppMode } from '@/types';
import { haversineDistance } from '@/lib/naver-map-utils';
import { track } from '@/lib/analytics';

export default function HomePage() {
  const [appMode, setAppMode] = useState<AppMode>('home');
  const [activeFilters, setActiveFilters] = useState<string[]>(['러너스팟', '샤워', '짐보관']);
  const [selection, setSelection] = useState<DrawerSelection | null>(null);
  const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [naverMap, setNaverMap] = useState<naver.maps.Map | null>(null);
  const [showCourses, setShowCourses] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  // 검색 상태
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isSearchClosing, setIsSearchClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { spots } = useSpots();
  const { courses } = useCourses();
  const {
    position: myLocation,
    error: locationError,
    hasOrientationSensor,
    requestCompassPermission,
    retryLocation,
  } = useMyLocation();

  // 팔로우 중이고 위치가 갱신되면 지도 이동
  const prevLocationRef = useRef(myLocation);
  useEffect(() => {
    if (!naverMap || !myLocation || !isFollowing) return;
    // 위치가 실제로 변경됐을 때만 panTo
    const prev = prevLocationRef.current;
    if (!prev || prev.lat !== myLocation.lat || prev.lng !== myLocation.lng) {
      naverMap.panTo(new naver.maps.LatLng(myLocation.lat, myLocation.lng));
    }
    prevLocationRef.current = myLocation;
  }, [naverMap, myLocation, isFollowing]);

  const handleMapReady = useCallback((map: naver.maps.Map) => {
    setNaverMap(map);
  }, []);

  const handleMapDrag = useCallback(() => {
    setIsFollowing(false);
  }, []);

  const handleToggleFollow = useCallback(() => {
    track('my_location_click', { has_location: myLocation !== null });

    if (!isFollowing) {
      // OFF → ON
      if (!myLocation) {
        // 위치가 아직 없으면 재시도 요청 후 팔로잉 시작 (스피너 표시)
        retryLocation();
      }

      requestCompassPermission();
      if (naverMap && myLocation) {
        const targetZoom = Math.max(15, naverMap.getZoom());
        naverMap.morph(
          new naver.maps.LatLng(myLocation.lat, myLocation.lng),
          targetZoom,
          { duration: 500, easing: 'easeOutCubic' },
        );
      }
    }
    setIsFollowing((prev) => !prev);
  }, [isFollowing, naverMap, myLocation, requestCompassPermission, retryLocation]);

  // 팔로잉 ON인데 위치 에러가 발생하면 자동 롤백
  // GPS 신호가 약한 경우 스피너가 유지되며, 사용자가 버튼으로 직접 취소 가능
  useEffect(() => {
    if (!isFollowing || myLocation || !locationError) return;

    setIsFollowing(false);

    if (locationError === 'geolocation_unsupported' || !hasOrientationSensor) {
      toast.error('PC에서는 위치 정보를 사용할 수 없어요.', {
        description: '모바일 기기에서 이용해주세요.',
      });
    } else if (locationError === 'permission_denied') {
      toast.error('위치 정보 접근을 허용해야 사용할 수 있어요.', {
        description: '브라우저 설정에서 위치 권한을 확인해주세요.',
      });
    } else {
      toast.error('위치 정보를 가져올 수 없어요.', {
        description: '위치 권한과 GPS가 켜져 있는지 확인해주세요.',
      });
    }
  }, [isFollowing, myLocation, locationError, hasOrientationSensor]);

  const filteredSpots = useMemo(
    () => activeFilters.length === 0
      ? []
      : spots.filter((spot) => activeFilters.includes(spot.category)),
    [spots, activeFilters],
  );

  const handleCourseToggle = useCallback(() => {
    setShowCourses((prev) => {
      track('course_toggle', { show_courses: !prev });
      return !prev;
    });
  }, []);

  const handleFilterToggle = (category: string) => {
    const isTogglingOn = !activeFilters.includes(category);
    const newFilters = isTogglingOn
      ? [...activeFilters, category]
      : activeFilters.filter((c) => c !== category);

    track('filter_toggle', {
      category,
      is_active: isTogglingOn,
      active_filters: newFilters,
    });

    setActiveFilters(newFilters);

    // OFF→ON 토글 시: 현재 화면 중심에서 가장 가까운 마커를 선택 (줌 유지, panTo)
    if (!isTogglingOn || !naverMap || spots.length === 0) return;

    const center = naverMap.getCenter() as naver.maps.LatLng;
    // NOTE: 같은 원소의 haversineDistance가 비교마다 재계산됨.
    // 스팟 수가 많아지면 Schwartzian transform(.map으로 거리 미리 계산 → .sort → 추출)으로 최적화 가능.
    // 현재 수십~수백 개 규모에서는 무시 가능한 수준.
    const nearest = spots
      .filter((s) => s.category === category)
      .sort(
        (a, b) =>
          haversineDistance(center.lat(), center.lng(), a.latitude, a.longitude) -
          haversineDistance(center.lat(), center.lng(), b.latitude, b.longitude),
      )[0];

    if (nearest) setSelection({ type: 'spot', data: nearest });
  };

  // 검색 닫기 (exit 애니메이션 트리거)
  const requestCloseSearch = useCallback(() => {
    setIsSearchClosing(true);
  }, []);

  // exit 애니메이션 완료 후 상태 초기화
  const onSearchCloseComplete = useCallback(() => {
    setIsSearchClosing(false);
    setIsSearchActive(false);
    setSearchQuery('');
  }, []);

  function handleSearchCourseSelect(course: Course) {
    track('course_select', {
      course_id: course.id,
      course_name: course.name,
      source: 'search',
      query: searchQuery,
    });
    setAppMode('home');
    setTargetLocation(null);
    setSelection({ type: 'course', data: course });
    setShowCourses(true);
  }

  function handleSearchSpotSelect(spot: Spot) {
    track('spot_select', {
      spot_id: spot.id,
      spot_name: spot.name,
      category: spot.category,
      source: 'search',
      query: searchQuery,
    });
    setAppMode('home');
    setTargetLocation(null);
    setSelection({ type: 'spot', data: spot });
    // 해당 스팟의 카테고리가 필터에 없으면 추가 (마커가 보이도록)
    setActiveFilters((prev) => {
      if (prev.includes(spot.category)) return prev;
      return [...prev, spot.category];
    });
  }

  function handleSearchLocationSelect(lat: number, lng: number, name?: string) {
    setSelection(null); // 드로어 닫기 (외부 결과엔 상세가 없음)
    setTargetLocation({ lat, lng, name });
  }

  const handleSpotSelect = useCallback((spot: Spot, source: 'map' | 'drawer_list') => {
    track('spot_select', {
      spot_id: spot.id,
      spot_name: spot.name,
      category: spot.category,
      source,
    });
    setTargetLocation(null);
    setSelection({ type: 'spot', data: spot });
  }, []);

  const handleMarkerClick = useCallback((spot: Spot) => {
    handleSpotSelect(spot, 'map');
  }, [handleSpotSelect]);

  const handleDrawerSpotClick = useCallback((spot: Spot) => {
    handleSpotSelect(spot, 'drawer_list');
  }, [handleSpotSelect]);

  const handleDrawerCourseClick = useCallback((course: Course) => {
    track('course_select', {
      course_id: course.id,
      course_name: course.name,
      source: 'drawer_list',
    });
    setTargetLocation(null);
    setSelection({ type: 'course', data: course });
    setShowCourses(true);
  }, []);

  const handleCourseExplorerClick = useCallback((course: Course) => {
    track('course_select', {
      course_id: course.id,
      course_name: course.name,
      source: 'course_explorer',
    });
    setAppMode('home');
    setTargetLocation(null);
    setShowCourses(true);
    setSelection({ type: 'course', data: course });
  }, []);

  const handleCoursePinClick = useCallback((course: Course) => {
    track('course_select', {
      course_id: course.id,
      course_name: course.name,
      source: 'map',
    });
    setTargetLocation(null);
    setSelection({ type: 'course', data: course });
  }, []);

  const handleDeselect = useCallback(() => {
    setTargetLocation(null);
    setSelection(null);
  }, []);

  const handleModeChange = useCallback((mode: AppMode) => {
    setAppMode(mode);
    setSelection(null);
    if (mode === 'course') setShowCourses(true);
    // 비홈 모드 전환 시 검색/위치추적 정리
    if (mode !== 'home') {
      if (isSearchActive) requestCloseSearch();
      setIsFollowing(false);
    }
  }, [isSearchActive, requestCloseSearch]);

  return (
    <div className="relative flex h-dvh flex-col">
      <Header
        isSearchActive={isSearchActive}
        onSearchActivate={() => setIsSearchActive(true)}
        onSearchClose={requestCloseSearch}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        opaque={appMode !== 'home'}
      />
      {appMode === 'home' && (
        <FilterChips
          activeFilters={activeFilters}
          onToggle={handleFilterToggle}
          showCourses={showCourses}
          onToggleCourses={handleCourseToggle}
        />
      )}
      <div className={`relative flex-1 ${appMode !== 'home' ? 'hidden' : ''}`}>
        <NaverMap
          spots={filteredSpots}
          courses={courses}
          showCourses={showCourses}
          onMarkerClick={handleMarkerClick}
          onCoursePinClick={handleCoursePinClick}
          selection={selection}
          targetLocation={targetLocation}
          myLocation={myLocation}
          onMapDrag={handleMapDrag}
          onMapClick={handleDeselect}
          onMapReady={handleMapReady}
        />
      </div>
      {appMode === 'course' && (
        <CourseExplorer courses={courses} onCourseClick={handleCourseExplorerClick} />
      )}
      {appMode === 'navigation' && <ComingSoon />}

      {appMode === 'home' && (
        <>
          <FloatingControls
            isFollowing={isFollowing}
            isLocating={isFollowing && myLocation === null}
            onToggleFollow={handleToggleFollow}
          />

          <BottomDrawer
            spots={filteredSpots}
            courses={courses}
            selection={selection}
            onSpotClick={handleDrawerSpotClick}
            onCourseClick={handleDrawerCourseClick}
            onDeselect={handleDeselect}
          />
        </>
      )}

      <BottomNavigation appMode={appMode} onModeChange={handleModeChange} />

      {/* 검색 콘텐츠 패널 (헤더 아래) */}
      <SearchOverlay
        isOpen={isSearchActive}
        isClosing={isSearchClosing}
        onCloseComplete={onSearchCloseComplete}
        onRequestClose={requestCloseSearch}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        spots={spots}
        courses={courses}
        onCourseSelect={handleSearchCourseSelect}
        onSpotSelect={handleSearchSpotSelect}
        onLocationSelect={handleSearchLocationSelect}
      />
    </div>
  );
}
