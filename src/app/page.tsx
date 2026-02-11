'use client';

import { useEffect, useState } from 'react';
import NaverMap from '@/components/Map/NaverMap';
import Header from '@/components/Header';
import FilterChips from '@/components/FilterChips';
import BottomSheet from '@/components/BottomSheet';
import DefaultDrawer from '@/components/DefaultDrawer';
import FABMenu from '@/components/FABMenu';
import SearchOverlay from '@/components/Search/SearchOverlay';
import { useSpots } from '@/hooks/useSpots';
import { useOverlays } from '@/hooks/useOverlays';
import type { Spot, Overlay } from '@/types';

export default function HomePage() {
  const [activeFilters, setActiveFilters] = useState<string[]>(['러너스팟']);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [initialCenter, setInitialCenter] = useState<{ lat: number; lng: number } | null>(null);

  // 검색 상태
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { spots } = useSpots();
  const { overlays } = useOverlays();

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

  // 검색 dismiss 헬퍼
  function dismissSearch() {
    setIsSearchActive(false);
    setSearchQuery('');
  }

  function handleOverlaySelect(overlay: Overlay) {
    const lat = (overlay.nw_lat + overlay.se_lat) / 2;
    const lng = (overlay.nw_lng + overlay.se_lng) / 2;
    setTargetLocation({ lat, lng });
  }

  function handleSearchSpotSelect(spot: Spot) {
    setSelectedSpot(spot);
    setTargetLocation({ lat: spot.latitude, lng: spot.longitude });
  }

  function handleSearchLocationSelect(lat: number, lng: number) {
    setTargetLocation({ lat, lng });
  }

  return (
    <div className="relative flex h-dvh flex-col">
      <Header
        isSearchActive={isSearchActive}
        onSearchActivate={() => setIsSearchActive(true)}
      />
      <FilterChips activeFilters={activeFilters} onToggle={handleFilterToggle} />
      <div className="relative flex-1">
        <NaverMap
          spots={filteredSpots}
          overlays={overlays}
          onMarkerClick={setSelectedSpot}
          selectedSpot={selectedSpot}
          targetLocation={targetLocation}
          initialCenter={initialCenter}
        />
        <FABMenu />
      </div>

      {/* 장소 선택 시: BottomSheet, 기본 상태: DefaultDrawer */}
      {selectedSpot ? (
        <BottomSheet spot={selectedSpot} onClose={() => setSelectedSpot(null)} />
      ) : (
        <DefaultDrawer spots={filteredSpots} onSpotClick={setSelectedSpot} />
      )}

      {/* 풀스크린 검색 오버레이 (자체 visibility 관리) */}
      <SearchOverlay
        isOpen={isSearchActive}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onClose={dismissSearch}
        spots={spots}
        overlays={overlays}
        onOverlaySelect={handleOverlaySelect}
        onSpotSelect={handleSearchSpotSelect}
        onLocationSelect={handleSearchLocationSelect}
      />
    </div>
  );
}
