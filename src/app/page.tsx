'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import NaverMap from '@/components/Map/NaverMap';
import Header from '@/components/Header';
import FilterChips from '@/components/FilterChips';
import BottomDrawer from '@/components/BottomDrawer';
import FloatingControls from '@/components/FloatingControls';
import SearchOverlay from '@/components/Search/SearchOverlay';
import { useSpots } from '@/hooks/useSpots';
import { useCourses } from '@/hooks/useCourses';
import { useMyLocation } from '@/hooks/useMyLocation';
import type { Spot, Course, DrawerSelection } from '@/types';
import { haversineDistance } from '@/lib/naver-map-utils';

export default function HomePage() {
  const [activeFilters, setActiveFilters] = useState<string[]>(['러너스팟']);
  const [selection, setSelection] = useState<DrawerSelection | null>(null);
  const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [naverMap, setNaverMap] = useState<naver.maps.Map | null>(null);
  const [showCourses, setShowCourses] = useState(true);
  const [selectionViewOverride, setSelectionViewOverride] = useState<{
    swLat: number;
    swLng: number;
    neLat: number;
    neLng: number;
    padding?: number;
  } | null>(null);
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

  // 팔로잉 ON인데 위치를 못 받으면 자동 롤백 (에러 즉시 or 8초 타임아웃)
  useEffect(() => {
    if (!isFollowing || myLocation) return;

    /** 팔로잉 해제 + 원인에 맞는 토스트 표시 */
    function rollbackWithToast(reason: 'permission' | 'pc' | 'generic') {
      setIsFollowing(false);
      if (reason === 'permission') {
        toast.error('위치 정보 접근을 허용해야 사용할 수 있어요.', {
          description: '브라우저 설정에서 위치 권한을 확인해주세요.',
        });
      } else if (reason === 'pc') {
        toast.error('PC에서는 위치 정보를 사용할 수 없어요.', {
          description: '모바일 기기에서 이용해주세요.',
        });
      } else {
        toast.error('위치 정보를 가져올 수 없어요.', {
          description: '위치 권한과 GPS가 켜져 있는지 확인해주세요.',
        });
      }
    }

    if (locationError) {
      if (locationError === 'permission_denied') {
        rollbackWithToast('permission');
      } else if (locationError === 'geolocation_unsupported' || !hasOrientationSensor) {
        rollbackWithToast('pc');
      } else if (locationError === 'timeout') {
        setIsFollowing(false);
        toast.error('위치를 가져오는 데 시간이 오래 걸려요.', {
          description: 'GPS 신호가 약할 수 있어요. 잠시 후 다시 시도해주세요.',
        });
      } else {
        rollbackWithToast('generic');
      }
      return;
    }

    const timer = setTimeout(() => {
      rollbackWithToast(hasOrientationSensor ? 'generic' : 'pc');
    }, 8000);

    return () => clearTimeout(timer);
  }, [isFollowing, myLocation, locationError, hasOrientationSensor]);

  const filteredSpots = spots.filter((spot) => {
    if (activeFilters.length === 0) return true;
    return spot.categories.some((cat) => activeFilters.includes(cat));
  });

  const handleSelectionViewApplied = useCallback(() => setSelectionViewOverride(null), []);

  const handleFilterToggle = (category: string) => {
    const isTogglingOn = !activeFilters.includes(category);

    setActiveFilters((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );

    // OFF→ON 토글 시: 가까운 마커 자동 선택 + 지도 범위 조정
    if (!isTogglingOn || !naverMap || spots.length === 0) return;

    const center = naverMap.getCenter() as naver.maps.LatLng;
    const centerLat = center.lat();
    const centerLng = center.lng();

    // 해당 카테고리의 모든 스팟을 거리순 정렬
    const categorySpots = spots
      .filter((s) => s.categories.includes(category))
      .map((s) => ({
        ...s,
        _distance: haversineDistance(centerLat, centerLng, s.latitude, s.longitude),
      }))
      .sort((a, b) => a._distance - b._distance);

    if (categorySpots.length === 0) return;

    const nearest = categorySpots.slice(0, 3);

    // 기준점(지도 중심) + 가까운 3개 마커의 bounds 계산
    const lats = [centerLat, ...nearest.map((s) => s.latitude)];
    const lngs = [centerLng, ...nearest.map((s) => s.longitude)];

    setSelectionViewOverride({
      swLat: Math.min(...lats),
      swLng: Math.min(...lngs),
      neLat: Math.max(...lats),
      neLng: Math.max(...lngs),
      padding: 80,
    });
    const { _distance: _, ...nearestSpot } = categorySpots[0];
    setSelection({ type: 'spot', data: nearestSpot });
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
    setTargetLocation(null);
    setSelection({ type: 'course', data: course });
    // 코스 토글이 꺼져 있으면 켜기
    setShowCourses(true);
  }

  function handleSearchSpotSelect(spot: Spot) {
    setTargetLocation(null);
    setSelection({ type: 'spot', data: spot });
    // 해당 스팟의 카테고리가 필터에 없으면 추가 (마커가 보이도록)
    setActiveFilters((prev) => {
      const missing = spot.categories.filter((cat) => !prev.includes(cat));
      return missing.length > 0 ? [...prev, ...missing] : prev;
    });
  }

  function handleSearchLocationSelect(lat: number, lng: number, name?: string) {
    setSelection(null); // 드로어 닫기 (외부 결과엔 상세가 없음)
    setTargetLocation({ lat, lng, name });
  }

  const handleMarkerClick = useCallback((spot: Spot) => {
    setTargetLocation(null);
    setSelection({ type: 'spot', data: spot });
  }, []);

  const handleCoursePinClick = useCallback((course: Course) => {
    setTargetLocation(null);
    setSelection({ type: 'course', data: course });
  }, []);

  const handleDeselect = useCallback(() => {
    setTargetLocation(null);
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
          courses={courses}
          showCourses={showCourses}
          onMarkerClick={handleMarkerClick}
          onCoursePinClick={handleCoursePinClick}
          selection={selection}
          selectionViewOverride={selectionViewOverride}
          onSelectionViewApplied={handleSelectionViewApplied}
          targetLocation={targetLocation}
          myLocation={myLocation}
          onMapDrag={handleMapDrag}
          onMapReady={handleMapReady}
        />
      </div>

      <FloatingControls
        showCourses={showCourses}
        onToggleCourses={setShowCourses}
        isFollowing={isFollowing}
        isLocating={isFollowing && myLocation === null}
        onToggleFollow={handleToggleFollow}
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
