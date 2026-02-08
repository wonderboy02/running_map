'use client';

import { useEffect, useState } from 'react';
import NaverMap from '@/components/Map/NaverMap';
import Header from '@/components/Header';
import FilterChips from '@/components/FilterChips';
import BottomSheet from '@/components/BottomSheet';
import FABMenu from '@/components/FABMenu';
import { useSpots } from '@/hooks/useSpots';
import type { Spot } from '@/types';

export default function HomePage() {
  const [activeFilters, setActiveFilters] = useState<string[]>(['러너스팟']); // 기본 선택
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [initialCenter, setInitialCenter] = useState<{ lat: number; lng: number } | null>(null);

  const { spots } = useSpots();

  // 초기 진입 시 현재 위치로 이동 (핀 없이)
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setInitialCenter({ lat: latitude, lng: longitude });
      },
      () => {
        // 위치 권한 거부 시 기본 위치(서울) 유지
        console.log('위치 권한이 거부되었습니다. 기본 위치를 표시합니다.');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  const filteredSpots = spots.filter((spot) => {
    if (activeFilters.length === 0) return true;
    return spot.categories.some((cat) => activeFilters.includes(cat));
  });

  const handleFilterToggle = (category: string) => {
    setActiveFilters((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  function handleLocationSelect(lat: number, lng: number) {
    setTargetLocation({ lat, lng });
  }

  return (
    <div className="relative flex h-dvh flex-col">
      <Header onLocationSelect={handleLocationSelect} />
      <FilterChips
        activeFilters={activeFilters}
        onToggle={handleFilterToggle}
      />
      <div className="relative flex-1">
        <NaverMap
          spots={filteredSpots}
          onMarkerClick={setSelectedSpot}
          selectedSpot={selectedSpot}
          targetLocation={targetLocation}
          initialCenter={initialCenter}
        />
        <FABMenu />
      </div>
      <BottomSheet
        spot={selectedSpot}
        onClose={() => setSelectedSpot(null)}
      />
    </div>
  );
}
