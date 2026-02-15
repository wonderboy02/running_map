'use client';

import { useMemo, useEffect, useRef } from 'react';
import { useGeocode } from '@/hooks/useGeocode';
import type { Spot, Course } from '@/types';
import type { GeocodeResult } from '@/hooks/useGeocode';
import { track } from '@/lib/analytics';

interface UnifiedSearchResults {
  courseResults: Course[];
  spotResults: Spot[];
  externalResults: GeocodeResult[];
  isLoading: boolean;
}

export function useUnifiedSearch(
  query: string,
  spots: Spot[],
  courses: Course[],
): UnifiedSearchResults {
  const { results: externalResults, loading: isLoading, search, clear } = useGeocode();

  // 1. Local course 검색 (동기, 즉시)
  const courseResults = useMemo(() => {
    if (!query || query.trim().length < 1) return [];
    const q = query.toLowerCase().trim();
    return courses.filter((o) => o.name.toLowerCase().includes(q));
  }, [query, courses]);

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

  // 4. search_query 이벤트: 외부 검색 로딩 완료(true→false) 시 전송
  const wasLoadingRef = useRef(false);
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && query.trim().length >= 2) {
      track('search_query', {
        query: query.trim(),
        query_length: query.trim().length,
        result_count_spots: spotResults.length,
        result_count_courses: courseResults.length,
        result_count_external: externalResults.length,
      });
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, query, spotResults.length, courseResults.length, externalResults.length]);

  return { courseResults, spotResults, externalResults, isLoading };
}
