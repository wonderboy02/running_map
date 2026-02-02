'use client';

import { useState } from 'react';
import NaverMap from '@/components/Map/NaverMap';
import Header from '@/components/Header';
import FilterChips from '@/components/FilterChips';
import BottomSheet from '@/components/BottomSheet';
import FABMenu from '@/components/FABMenu';
import { useSpots } from '@/hooks/useSpots';
import type { Spot } from '@/types';

export default function HomePage() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { spots } = useSpots();

  const filteredSpots = spots.filter((spot) => {
    if (spot.is_highlighted) return true;
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
