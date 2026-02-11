'use client';

import { useCallback, useEffect, useState } from 'react';
import NaverMap from '@/components/Map/NaverMap';
import Header from '@/components/Header';
import FilterChips from '@/components/FilterChips';
import BottomDrawer from '@/components/BottomDrawer';
import FloatingControls from '@/components/FloatingControls';
import SearchOverlay from '@/components/Search/SearchOverlay';
import { useSpots } from '@/hooks/useSpots';
import { useCourses } from '@/hooks/useCourses';
import type { Spot, Course, DrawerSelection } from '@/types';

export default function HomePage() {
  const [activeFilters, setActiveFilters] = useState<string[]>(['러너스팟']);
  const [selection, setSelection] = useState<DrawerSelection | null>(null);
  const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [initialCenter, setInitialCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [naverMap, setNaverMap] = useState<naver.maps.Map | null>(null);
  const [showCourses, setShowCourses] = useState(true);

  // 검색 상태
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isSearchClosing, setIsSearchClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { spots } = useSpots();
  const { courses } = useCourses();

  const handleMapReady = useCallback((map: naver.maps.Map) => {
    setNaverMap(map);
  }, []);

  // 초기 진입 시 현재 위치로 이동 (핀 없이)
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setInitialCenter({ lat: latitude, lng: longitude });
      },
      () => {
        console.log('위치 권한이 거부되었습니다. 기본 위치를 표시합니다.');
      },
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }, []);

  const filteredSpots = spots.filter((spot) => {
    if (activeFilters.length === 0) return true;
    return spot.categories.some((cat) => activeFilters.includes(cat));
  });

  const handleFilterToggle = (category: string) => {
    setActiveFilters((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
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
    const lat = (course.nw_lat + course.se_lat) / 2;
    const lng = (course.nw_lng + course.se_lng) / 2;
    setTargetLocation({ lat, lng });
    setSelection({ type: 'course', data: course });
  }

  function handleSearchSpotSelect(spot: Spot) {
    setSelection({ type: 'spot', data: spot });
    setTargetLocation({ lat: spot.latitude, lng: spot.longitude });
  }

  function handleSearchLocationSelect(lat: number, lng: number) {
    setTargetLocation({ lat, lng });
  }

  const handleMarkerClick = useCallback((spot: Spot) => {
    setSelection({ type: 'spot', data: spot });
  }, []);

  const handleCoursePinClick = useCallback((course: Course) => {
    setSelection({ type: 'course', data: course });
  }, []);

  const handleDeselect = useCallback(() => {
    setSelection(null);
  }, []);

  return (
    <div className="relative flex h-dvh flex-col">
      <Header
        isSearchActive={isSearchActive}
        onSearchActivate={() => setIsSearchActive(true)}
        onSearchClose={requestCloseSearch}
        query={searchQuery}
        onQueryChange={setSearchQuery}
      />
      <FilterChips activeFilters={activeFilters} onToggle={handleFilterToggle} />
      <div className="relative flex-1">
        <NaverMap
          spots={filteredSpots}
          courses={showCourses ? courses : []}
          onMarkerClick={handleMarkerClick}
          onCoursePinClick={handleCoursePinClick}
          selection={selection}
          targetLocation={targetLocation}
          initialCenter={initialCenter}
          onMapReady={handleMapReady}
        />
      </div>

      <FloatingControls
        map={naverMap}
        showCourses={showCourses}
        onToggleCourses={setShowCourses}
      />

      <BottomDrawer
        spots={filteredSpots}
        selection={selection}
        onSpotClick={handleMarkerClick}
        onDeselect={handleDeselect}
      />

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
