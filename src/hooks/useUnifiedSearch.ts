'use client';

import { useMemo, useEffect } from 'react';
import { useGeocode } from '@/hooks/useGeocode';
import type { Spot, Overlay } from '@/types';
import type { GeocodeResult } from '@/hooks/useGeocode';

interface UnifiedSearchResults {
  overlayResults: Overlay[];
  spotResults: Spot[];
  externalResults: GeocodeResult[];
  isLoading: boolean;
}

export function useUnifiedSearch(
  query: string,
  spots: Spot[],
  overlays: Overlay[],
): UnifiedSearchResults {
  const { results: externalResults, loading: isLoading, search, clear } = useGeocode();

  // 1. Local overlay 검색 (동기, 즉시)
  const overlayResults = useMemo(() => {
    if (!query || query.trim().length < 1) return [];
    const q = query.toLowerCase().trim();
    return overlays.filter((o) => o.name.toLowerCase().includes(q));
  }, [query, overlays]);

  // 2. Local spot 검색 (동기, 즉시)
  const spotResults = useMemo(() => {
    if (!query || query.trim().length < 1) return [];
    const q = query.toLowerCase().trim();
    return spots.filter(
      (spot) =>
        spot.name.toLowerCase().includes(q) ||
        spot.address.toLowerCase().includes(q) ||
        spot.categories.some((cat) => cat.toLowerCase().includes(q)),
    );
  }, [query, spots]);

  // 3. 네이버 API 검색 (useGeocode에 위임, 500ms debounce + AbortController)
  useEffect(() => {
    if (query.trim().length >= 2) {
      search(query);
    } else {
      clear();
    }
  }, [query, search, clear]);

  return { overlayResults, spotResults, externalResults, isLoading };
}
