"use client";

import { useState } from "react";
import NaverMap from "@/components/Map/NaverMap";
import Header from "@/components/Header";
import FilterChips from "@/components/FilterChips";
import BottomSheet from "@/components/BottomSheet";
import FABMenu from "@/components/FABMenu";
import { useSpots } from "@/hooks/useSpots";
import type { Spot } from "@/types";

export default function HomePage() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);

  const { spots, loading } = useSpots();

  const filteredSpots = spots.filter((spot) => {
    // 하이라이트는 항상 표시
    if (spot.is_highlighted) return true;
    // 필터가 없으면 전부 표시
    if (activeFilters.length === 0) return true;
    // 선택된 카테고리에 해당하면 표시
    return spot.categories.some((cat) => activeFilters.includes(cat));
  });

  const searchedSpots = searchQuery
    ? filteredSpots.filter(
        (spot) =>
          spot.name.includes(searchQuery) ||
          spot.address.includes(searchQuery) ||
          spot.categories.some((cat) => cat.includes(searchQuery)),
      )
    : filteredSpots;

  const handleFilterToggle = (category: string) => {
    setActiveFilters((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  return (
    <div className="relative flex h-dvh flex-col">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <FilterChips
        activeFilters={activeFilters}
        onToggle={handleFilterToggle}
      />
      <div className="relative flex-1">
        <NaverMap
          spots={searchedSpots}
          onMarkerClick={setSelectedSpot}
          selectedSpot={selectedSpot}
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
